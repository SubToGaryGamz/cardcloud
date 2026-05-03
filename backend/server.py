from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Query, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import csv
import logging
import uuid
import jwt
import bcrypt
import requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
APP_NAME = os.environ.get('APP_NAME', 'cardcloud')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Beta program: redeem code → instant Pro access. Env-overridable; defaults to "beta".
# When more than one code is needed, use a comma-separated list e.g. BETA_INVITE_CODES="beta,founder,vip".
BETA_INVITE_CODES = {
    c.strip().lower()
    for c in os.environ.get('BETA_INVITE_CODES', 'bet@').split(',')
    if c.strip()
}
BETA_DAYS = int(os.environ.get('BETA_DAYS', '90'))

# Server-side fixed packages (NEVER take amount from frontend)
PACKAGES = {
    "pro_monthly": {"amount": 6.00, "currency": "usd", "label": "CardCloud Pro · Monthly", "interval": "monthly"},
    "pro_yearly": {"amount": 65.00, "currency": "usd", "label": "CardCloud Pro · Yearly", "interval": "yearly"},
}

# 7-day free trial (in days) for first-time subscribers
TRIAL_DAYS = 7

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Storage key (session-scoped)
storage_key: Optional[str] = None


def init_storage() -> Optional[str]:
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    if resp.status_code == 403:
        # refresh key once
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ============ Models ============
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    avatar_path: Optional[str] = None
    public_vault_token: Optional[str] = None
    auth_provider: str  # "email" | "google"
    is_pro: bool = False
    pro_expires_at: Optional[str] = None
    is_admin: bool = False
    created_at: str


class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: str
    referral_code: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class SessionReq(BaseModel):
    session_id: str


class AuthResp(BaseModel):
    token: str
    user: User


class Card(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    year: int
    name: str
    where_bought: Optional[str] = ""
    price_paid: float = 0.0
    price_sold: Optional[float] = None
    expenses: float = 0.0
    status: str = "in_collection"  # in_collection | sold
    image_path: Optional[str] = None
    images: List[str] = []
    purchased_date: Optional[str] = None
    sold_date: Optional[str] = None
    sport: Optional[str] = None
    tags: List[str] = []
    condition: Optional[str] = None  # Raw | PSA | BGS | SGC | CGC | Other
    grade: Optional[float] = None  # 1.0 - 10.0 (only when condition is a grader)
    share_token: Optional[str] = None
    created_at: str
    updated_at: str


class CardCreate(BaseModel):
    year: int
    name: str
    where_bought: Optional[str] = ""
    price_paid: float = 0.0
    price_sold: Optional[float] = None
    expenses: float = 0.0
    status: str = "in_collection"
    purchased_date: Optional[str] = None
    sold_date: Optional[str] = None
    sport: Optional[str] = None
    tags: List[str] = []
    condition: Optional[str] = None
    grade: Optional[float] = None


class CardUpdate(BaseModel):
    year: Optional[int] = None
    name: Optional[str] = None
    where_bought: Optional[str] = None
    price_paid: Optional[float] = None
    price_sold: Optional[float] = None
    expenses: Optional[float] = None
    status: Optional[str] = None
    purchased_date: Optional[str] = None
    sold_date: Optional[str] = None
    sport: Optional[str] = None
    tags: Optional[List[str]] = None
    condition: Optional[str] = None
    grade: Optional[float] = None


class QuickSellReq(BaseModel):
    price_sold: float
    extra_expenses: float = 0.0
    sold_date: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None


class WatchItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    year: int
    name: str
    sport: Optional[str] = None
    tags: List[str] = []
    target_price: Optional[float] = None
    notes: Optional[str] = ""
    ai_estimate: Optional[dict] = None
    created_at: str
    updated_at: str


class WatchItemCreate(BaseModel):
    year: int
    name: str
    sport: Optional[str] = None
    tags: List[str] = []
    target_price: Optional[float] = None
    notes: Optional[str] = ""


class WatchItemUpdate(BaseModel):
    year: Optional[int] = None
    name: Optional[str] = None
    sport: Optional[str] = None
    tags: Optional[List[str]] = None
    target_price: Optional[float] = None
    notes: Optional[str] = None


class AcquireReq(BaseModel):
    price_paid: float
    where_bought: Optional[str] = ""
    expenses: float = 0.0
    purchased_date: Optional[str] = None


# ============ App ============
app = FastAPI()
api_router = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup():
    init_storage()
    logger.info("Server started, storage initialized.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ============ Auth helpers ============
def make_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "jwt",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1].strip()

    user_id = None
    # Try JWT
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        # Try Emergent session token
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if not sess:
            raise HTTPException(status_code=401, detail="Invalid token")
        expires_at = sess.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at and expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user_id = sess.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    user_doc["is_admin"] = _is_admin_email(user_doc.get("email"))
    return User(**user_doc)


def _is_admin_email(email: Optional[str]) -> bool:
    """Returns True if the given email is in the comma-separated ADMIN_EMAILS env var."""
    if not email:
        return False
    raw = os.environ.get("ADMIN_EMAILS", "")
    allowed = {e.strip().lower() for e in raw.split(",") if e.strip()}
    return email.lower() in allowed


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ============ Auth routes ============
@api_router.post("/auth/register", response_model=AuthResp)
async def register(req: RegisterReq):
    existing = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    pwd_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    referred_by = None
    if req.referral_code:
        rc = req.referral_code.strip().upper()
        ref_owner = await db.users.find_one({"referral_code": rc}, {"_id": 0, "user_id": 1})
        if ref_owner and ref_owner.get("user_id") != user_id:
            referred_by = rc
    doc = {
        "user_id": user_id,
        "email": req.email.lower(),
        "name": req.name,
        "picture": None,
        "auth_provider": "email",
        "password_hash": pwd_hash,
        "referral_code": _ensure_referral_code({}),
        "referred_by": referred_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    user = User(**{k: v for k, v in doc.items() if k != "password_hash"})
    return AuthResp(token=make_jwt(user_id), user=user)


@api_router.post("/auth/login", response_model=AuthResp)
async def login(req: LoginReq):
    u = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if not u or not u.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not bcrypt.checkpw(req.password.encode("utf-8"), u["password_hash"].encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = User(**{k: v for k, v in u.items() if k != "password_hash"})
    return AuthResp(token=make_jwt(user.user_id), user=user)


@api_router.post("/auth/session", response_model=AuthResp)
async def session_exchange(req: SessionReq):
    """Exchange Emergent session_id for our session_token."""
    try:
        resp = requests.get(
            EMERGENT_AUTH_SESSION_URL,
            headers={"X-Session-ID": req.session_id},
            timeout=15,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = resp.json()
    except requests.RequestException as e:
        logger.error(f"Emergent auth error: {e}")
        raise HTTPException(status_code=502, detail="Auth service unavailable")

    email = data["email"].lower()
    name = data.get("name", email.split("@")[0])
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return AuthResp(token=session_token, user=User(**user_doc))


@api_router.get("/auth/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


# ============ Card routes ============
def _norm_tags(tags) -> List[str]:
    if not tags:
        return []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",")]
    seen = set()
    out = []
    for t in tags:
        if not t:
            continue
        t = str(t).strip().lower()
        if not t or t in seen:
            continue
        seen.add(t)
        out.append(t)
    return out


def _card_doc(payload: dict, user_id: str, existing: Optional[dict] = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        merged = {**existing, **{k: v for k, v in payload.items() if v is not None}}
        merged["updated_at"] = now
        return merged
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "year": payload.get("year"),
        "name": payload.get("name"),
        "where_bought": payload.get("where_bought") or "",
        "price_paid": float(payload.get("price_paid") or 0),
        "price_sold": payload.get("price_sold"),
        "expenses": float(payload.get("expenses") or 0),
        "status": payload.get("status") or "in_collection",
        "image_path": None,
        "images": [],
        "purchased_date": payload.get("purchased_date") or None,
        "sold_date": payload.get("sold_date") or None,
        "sport": (payload.get("sport") or None),
        "tags": _norm_tags(payload.get("tags")),
        "condition": payload.get("condition") or None,
        "grade": (float(payload["grade"]) if payload.get("grade") not in (None, "", 0, 0.0) else None),
        "created_at": now,
        "updated_at": now,
    }


@api_router.post("/cards", response_model=Card)
async def create_card(payload: CardCreate, user: User = Depends(get_current_user)):
    data = payload.model_dump()
    if data.get("tags"):
        data["tags"] = await _enforce_tag_limit(user, data.get("tags"))
    doc = _card_doc(data, user.user_id)
    await db.cards.insert_one(doc)
    return Card(**{k: v for k, v in doc.items() if k != "_id"})


@api_router.get("/cards", response_model=List[Card])
async def list_cards(
    q: Optional[str] = None,
    status: Optional[str] = None,
    year: Optional[int] = None,
    tag: Optional[str] = None,
    sport: Optional[str] = None,
    condition: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    filt: dict = {"user_id": user.user_id}
    if status and status in ("in_collection", "sold"):
        filt["status"] = status
    if year:
        filt["year"] = year
    if sport:
        filt["sport"] = sport
    if condition:
        filt["condition"] = condition
    if tag:
        filt["tags"] = tag.strip().lower()
    if q:
        qr = {"$regex": q, "$options": "i"}
        filt["$or"] = [{"name": qr}, {"tags": qr}, {"sport": qr}]
    docs = await db.cards.find(filt, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [Card(**d) for d in docs]


@api_router.get("/cards/best-flip")
async def best_flip(since: Optional[str] = None, user: User = Depends(get_current_user)):
    """Highest-profit sold card in the given window (defaults: last 30 days)."""
    cutoff = _since_cutoff(since) if since else (datetime.now(timezone.utc) - timedelta(days=30))
    docs = await db.cards.find({"user_id": user.user_id, "status": "sold"}, {"_id": 0}).to_list(5000)
    best = None
    best_profit = None
    for d in docs:
        sold_dt = _card_date(d, "sold")
        if cutoff is not None and (not sold_dt or sold_dt < cutoff):
            continue
        profit = float(d.get("price_sold") or 0) - float(d.get("price_paid") or 0) - float(d.get("expenses") or 0)
        if best_profit is None or profit > best_profit:
            best_profit = profit
            best = d
    if not best:
        return {"card": None, "profit": 0.0, "since": since or "30d"}
    return {
        "card": Card(**best).model_dump(),
        "profit": round(best_profit or 0, 2),
        "since": since or "30d",
    }


@api_router.get("/cards/tags")
async def list_tags(user: User = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user.user_id}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 100},
    ]
    out = []
    async for row in db.cards.aggregate(pipeline):
        out.append({"tag": row["_id"], "count": row["count"]})
    return out


def _since_cutoff(since):
    if not since or since == "all":
        return None
    mapping = {"30d": 30, "90d": 90, "1y": 365}
    days = mapping.get(since)
    if not days:
        return None
    return datetime.now(timezone.utc) - timedelta(days=days)


def _card_date(d: dict, kind: str):
    if kind == "paid":
        raw = d.get("purchased_date") or d.get("created_at")
    else:
        raw = d.get("sold_date") or d.get("updated_at")
    if not raw:
        return None
    try:
        if len(raw) == 10:
            return datetime.fromisoformat(raw).replace(tzinfo=timezone.utc)
        dt = datetime.fromisoformat(raw)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


@api_router.get("/cards/stats")
async def cards_stats(since: Optional[str] = None, user: User = Depends(get_current_user)):
    docs = await db.cards.find({"user_id": user.user_id}, {"_id": 0}).to_list(5000)
    cutoff = _since_cutoff(since)
    total_paid = 0.0
    total_sales = 0.0
    total_expenses = 0.0
    sold_paid = 0.0
    sold_expenses = 0.0
    sold_count = 0
    in_collection_count = 0
    for d in docs:
        paid_dt = _card_date(d, "paid")
        sold_dt = _card_date(d, "sold")
        if cutoff is None or (paid_dt and paid_dt >= cutoff):
            total_paid += float(d.get("price_paid") or 0)
            total_expenses += float(d.get("expenses") or 0)
            if d.get("status") != "sold":
                in_collection_count += 1
        if d.get("status") == "sold":
            if cutoff is None or (sold_dt and sold_dt >= cutoff):
                total_sales += float(d.get("price_sold") or 0)
                sold_paid += float(d.get("price_paid") or 0)
                sold_expenses += float(d.get("expenses") or 0)
                sold_count += 1
    profit = total_sales - sold_paid - sold_expenses
    return {
        "total_cards": len(docs),
        "in_collection_count": in_collection_count,
        "sold_count": sold_count,
        "total_paid": round(total_paid, 2),
        "total_sales": round(total_sales, 2),
        "total_expenses": round(total_expenses, 2),
        "profit": round(profit, 2),
    }


@api_router.get("/cards/timeseries")
async def cards_timeseries(months: int = 12, user: User = Depends(get_current_user)):
    docs = await db.cards.find({"user_id": user.user_id}, {"_id": 0}).to_list(5000)
    months = max(1, min(months, 36))
    now = datetime.now(timezone.utc)
    buckets = []
    y, m = now.year, now.month
    for _ in range(months):
        buckets.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    buckets.reverse()
    agg = {k: {"month": k, "paid": 0.0, "sales": 0.0, "profit": 0.0, "count_bought": 0, "count_sold": 0} for k in buckets}

    for d in docs:
        paid_dt = _card_date(d, "paid")
        if paid_dt:
            key = f"{paid_dt.year:04d}-{paid_dt.month:02d}"
            if key in agg:
                agg[key]["paid"] += float(d.get("price_paid") or 0)
                agg[key]["count_bought"] += 1
        if d.get("status") == "sold":
            sold_dt = _card_date(d, "sold")
            if sold_dt:
                key = f"{sold_dt.year:04d}-{sold_dt.month:02d}"
                if key in agg:
                    sale = float(d.get("price_sold") or 0)
                    cost = float(d.get("price_paid") or 0) + float(d.get("expenses") or 0)
                    agg[key]["sales"] += sale
                    agg[key]["profit"] += (sale - cost)
                    agg[key]["count_sold"] += 1

    series = []
    for k in buckets:
        v = agg[k]
        series.append({
            "month": k,
            "paid": round(v["paid"], 2),
            "sales": round(v["sales"], 2),
            "profit": round(v["profit"], 2),
            "count_bought": v["count_bought"],
            "count_sold": v["count_sold"],
        })

    by_year: dict = {}
    for d in docs:
        yy = d.get("year")
        if yy is None:
            continue
        b = by_year.setdefault(int(yy), {"year": int(yy), "count": 0, "paid": 0.0, "sales": 0.0})
        b["count"] += 1
        b["paid"] += float(d.get("price_paid") or 0)
        if d.get("status") == "sold":
            b["sales"] += float(d.get("price_sold") or 0)
    by_year_list = sorted(
        [{"year": v["year"], "count": v["count"], "paid": round(v["paid"], 2), "sales": round(v["sales"], 2)}
         for v in by_year.values()],
        key=lambda x: x["year"],
    )
    return {"monthly": series, "by_year": by_year_list}


@api_router.get("/cards/export.csv")
async def export_cards_csv(user: User = Depends(get_current_user)):
    await _require_pro(user)
    docs = await db.cards.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Year", "Name", "Sport", "Condition", "Grade", "Tags", "Where Bought", "Price Paid", "Price Sold", "Expenses", "Status", "Purchased Date", "Sold Date", "Profit", "Created"])
    for d in docs:
        sold = float(d.get("price_sold") or 0) if d.get("status") == "sold" else 0
        profit = sold - float(d.get("price_paid") or 0) - float(d.get("expenses") or 0) if d.get("status") == "sold" else 0
        writer.writerow([
            d.get("year"), d.get("name"),
            d.get("sport") or "",
            d.get("condition") or "",
            d.get("grade") if d.get("grade") is not None else "",
            ",".join(d.get("tags") or []),
            d.get("where_bought") or "",
            d.get("price_paid") or 0, d.get("price_sold") or "",
            d.get("expenses") or 0, d.get("status"),
            d.get("purchased_date") or "",
            d.get("sold_date") or "",
            round(profit, 2) if d.get("status") == "sold" else "",
            d.get("created_at"),
        ])
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cards.csv"},
    )


@api_router.get("/cards/{card_id}", response_model=Card)
async def get_card(card_id: str, user: User = Depends(get_current_user)):
    d = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Card not found")
    return Card(**d)


@api_router.put("/cards/{card_id}", response_model=Card)
async def update_card(card_id: str, payload: CardUpdate, user: User = Depends(get_current_user)):
    existing = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "tags" in updates:
        updates["tags"] = await _enforce_tag_limit(user, updates["tags"])
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.cards.update_one({"id": card_id, "user_id": user.user_id}, {"$set": updates})
    new_doc = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    return Card(**new_doc)


@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str, user: User = Depends(get_current_user)):
    existing = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")
    if existing.get("image_path"):
        await db.files.update_one(
            {"storage_path": existing["image_path"]},
            {"$set": {"is_deleted": True}}
        )
    await db.cards.delete_one({"id": card_id, "user_id": user.user_id})
    return {"ok": True}


class BulkDeleteReq(BaseModel):
    card_ids: List[str]


@api_router.post("/cards/bulk-delete")
async def bulk_delete_cards(req: BulkDeleteReq, user: User = Depends(get_current_user)):
    """Delete multiple cards at once. Only deletes cards owned by the caller.
    Returns the count of cards actually deleted (silently ignores missing/non-owned ids).
    """
    ids = [str(c) for c in (req.card_ids or []) if c]
    if not ids:
        raise HTTPException(status_code=400, detail="No card IDs provided")
    if len(ids) > 500:
        raise HTTPException(status_code=400, detail="Too many cards in one request (max 500)")
    # Soft-delete attached image files for owned cards
    owned = await db.cards.find(
        {"id": {"$in": ids}, "user_id": user.user_id, "image_path": {"$exists": True, "$ne": None}},
        {"_id": 0, "image_path": 1},
    ).to_list(length=len(ids))
    paths = [c["image_path"] for c in owned if c.get("image_path")]
    if paths:
        await db.files.update_many({"storage_path": {"$in": paths}}, {"$set": {"is_deleted": True}})
    res = await db.cards.delete_many({"id": {"$in": ids}, "user_id": user.user_id})
    return {"deleted": res.deleted_count}


@api_router.post("/cards/scan-image")
async def scan_card_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Vision-LLM card-photo intake.

    Accepts a JPEG/PNG/WEBP image of a sports card, asks Claude Sonnet 4.5
    (vision) to extract structured fields, and returns them as JSON for the
    Add Card form to pre-fill. Does not save anything to the user's vault.
    """
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "").lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        raise HTTPException(status_code=400, detail="Use JPEG, PNG, or WEBP")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image")
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 8 MB)")

    import base64 as _b64
    img_b64 = _b64.b64encode(raw).decode("ascii")

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision LLM unavailable: {e}")

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    prompt = (
        "You are a sports-trading-card cataloguer. Look at this card image and "
        "extract structured fields. Respond with ONLY a single compact JSON object "
        "with these keys (no commentary, no markdown fences):\n"
        '{ "year": int|null, "name": "Player Name", '
        '"sport": one of ["Basketball","Baseball","Football","Hockey","Soccer","Pokemon","Other"]|null, '
        '"set": "Set / brand if printed (e.g. Topps Chrome, Panini Prizm) — else null", '
        '"tags": [up to 5 short lowercase tags such as team, brand, parallel, rookie/auto/relic flags], '
        '"condition_suggestion": "Raw — Near Mint" or null, '
        '"confidence": 0.0–1.0 }\n\n'
        "Rules:\n"
        "- Read text PRINTED ON THE CARD ITSELF; ignore watermarks, sleeves, holders.\n"
        '- For modern Topps/Panini/Upper Deck cards, infer "set" from the logo on the card.\n'
        "- Year: prefer the printed copyright year on the card; if a year range is shown (e.g. 2003-2004), use the first.\n"
        '- Always include "rookie" in tags if the card says "Rookie", "RC", or "Draft Pick #1".\n'
        "- Always include the team in tags (lowercase, e.g. \"cavaliers\").\n"
        "- If the image is not a sports trading card, return all fields null and confidence 0."
    )

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"scan-{user.user_id}-{uuid.uuid4().hex[:8]}",
            system_message="You output only valid JSON — no markdown, no commentary."
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        reply = await chat.send_message(UserMessage(
            text=prompt,
            file_contents=[ImageContent(image_base64=img_b64)],
        ))
    except Exception as e:
        logger.error(f"Scan error: {e}")
        raise HTTPException(status_code=502, detail="Card scan failed")

    import json as _json
    text = (reply or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise HTTPException(status_code=502, detail="Unexpected AI response")
    try:
        parsed = _json.loads(text[start:end + 1])
    except Exception:
        raise HTTPException(status_code=502, detail="Could not parse AI response")

    # Normalize sport against known list (else null)
    valid_sports = {"Basketball", "Baseball", "Football", "Hockey", "Soccer", "Pokemon", "Other"}
    sport = parsed.get("sport")
    if sport and sport not in valid_sports:
        sport = "Other"
    tags = parsed.get("tags") or []
    if not isinstance(tags, list):
        tags = []
    tags = [str(t).strip().lower() for t in tags if str(t).strip()][:5]

    year = parsed.get("year")
    if isinstance(year, str):
        try:
            year = int("".join(c for c in year if c.isdigit())[:4])
        except Exception:
            year = None

    confidence = float(parsed.get("confidence") or 0.0)

    # Track AI scan usage for admin analytics (lightweight event log)
    try:
        await db.ai_scan_events.insert_one({
            "user_id": user.user_id,
            "email": user.email,
            "confidence": confidence,
            "ts": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass  # don't fail the user-facing scan over a metrics write

    return {
        "year": year,
        "name": (parsed.get("name") or "").strip()[:120] or None,
        "sport": sport,
        "set": (parsed.get("set") or "").strip()[:80] or None,
        "tags": tags,
        "condition_suggestion": (parsed.get("condition_suggestion") or "").strip()[:60] or None,
        "confidence": confidence,
    }


@api_router.post("/cards/{card_id}/image", response_model=Card)
async def upload_card_image(card_id: str, file: UploadFile = File(...), replace: bool = True, user: User = Depends(get_current_user)):
    existing = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")

    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin").lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Unsupported image format")
    path = f"{APP_NAME}/uploads/{user.user_id}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 8MB)")
    result = put_object(path, data, file.content_type or f"image/{ext}")

    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size"),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    update_ops: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if replace or not existing.get("image_path"):
        update_ops["image_path"] = result["path"]
        await db.cards.update_one({"id": card_id, "user_id": user.user_id}, {"$set": update_ops})
    else:
        await db.cards.update_one(
            {"id": card_id, "user_id": user.user_id},
            {"$set": update_ops, "$push": {"images": result["path"]}}
        )
    new_doc = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    return Card(**new_doc)


@api_router.put("/cards/{card_id}/primary-image", response_model=Card)
async def set_primary_image(card_id: str, path: str = Query(...), user: User = Depends(get_current_user)):
    existing = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")
    all_paths = ([existing.get("image_path")] if existing.get("image_path") else []) + (existing.get("images") or [])
    if path not in all_paths:
        raise HTTPException(status_code=400, detail="Path not attached to this card")
    # New primary, move old primary into images[]
    old_primary = existing.get("image_path")
    new_images = [p for p in (existing.get("images") or []) if p != path]
    if old_primary and old_primary != path:
        new_images.append(old_primary)
    await db.cards.update_one(
        {"id": card_id, "user_id": user.user_id},
        {"$set": {"image_path": path, "images": new_images, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    new_doc = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    return Card(**new_doc)


@api_router.delete("/cards/{card_id}/image")
async def delete_card_image(card_id: str, path: Optional[str] = None, user: User = Depends(get_current_user)):
    existing = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")
    target = path or existing.get("image_path")
    if not target:
        return {"ok": True}
    await db.files.update_one({"storage_path": target}, {"$set": {"is_deleted": True}})
    update_ops: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    set_ops: dict = {}
    pull_ops: dict = {}
    if existing.get("image_path") == target:
        set_ops["image_path"] = None
    if target in (existing.get("images") or []):
        pull_ops["images"] = target
    payload: dict = {"$set": {**update_ops, **set_ops}}
    if pull_ops:
        payload["$pull"] = pull_ops
    await db.cards.update_one({"id": card_id, "user_id": user.user_id}, payload)
    return {"ok": True}


@api_router.post("/cards/{card_id}/quick-sell", response_model=Card)
async def quick_sell(card_id: str, req: QuickSellReq, user: User = Depends(get_current_user)):
    existing = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")
    total_expenses = float(existing.get("expenses") or 0) + float(req.extra_expenses or 0)
    updates = {
        "price_sold": float(req.price_sold),
        "expenses": round(total_expenses, 2),
        "status": "sold",
        "sold_date": req.sold_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.cards.update_one({"id": card_id, "user_id": user.user_id}, {"$set": updates})
    new_doc = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    return Card(**new_doc)


@api_router.post("/cards/import")
async def import_cards(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    await _require_pro(user)
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    imported = 0
    skipped = 0
    errors: list = []
    now_iso = datetime.now(timezone.utc).isoformat()

    def _num(v, default=0.0):
        try:
            if v is None or v == "":
                return default
            return float(v)
        except Exception:
            return default

    for idx, row in enumerate(reader, start=2):
        # Normalize keys (lower, strip)
        r = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        name = r.get("name") or r.get("card name") or ""
        year_raw = r.get("year") or ""
        if not name or not year_raw:
            skipped += 1
            errors.append(f"Row {idx}: missing year or name")
            continue
        try:
            year = int(float(year_raw))
        except Exception:
            skipped += 1
            errors.append(f"Row {idx}: invalid year '{year_raw}'")
            continue
        status = (r.get("status") or "in_collection").lower().replace(" ", "_")
        if status not in ("in_collection", "sold"):
            status = "in_collection"
        price_sold_raw = r.get("price sold") or r.get("price_sold") or ""
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "year": year,
            "name": name,
            "where_bought": r.get("where bought") or r.get("where_bought") or "",
            "price_paid": _num(r.get("price paid") or r.get("price_paid")),
            "price_sold": _num(price_sold_raw, None) if price_sold_raw else None,
            "expenses": _num(r.get("expenses")),
            "status": status,
            "image_path": None,
            "images": [],
            "purchased_date": (r.get("purchased date") or r.get("purchased_date") or "") or None,
            "sold_date": (r.get("sold date") or r.get("sold_date") or "") or None,
            "sport": (r.get("sport") or "") or None,
            "tags": _norm_tags(r.get("tags") or ""),
            "condition": (r.get("condition") or "") or None,
            "grade": _num(r.get("grade") or "", None),
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.cards.insert_one(doc)
        imported += 1
    return {"imported": imported, "skipped": skipped, "errors": errors[:20]}


# ============ User Profile ============
@api_router.get("/users/me")
async def get_me(user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    # Surface prefs the frontend needs (referral, leaderboard, public vault, etc.)
    return doc


@api_router.patch("/users/me", response_model=User)
async def update_profile(payload: ProfileUpdate, user: User = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None and v != ""}
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"user_id": user.user_id}, {"$set": updates})
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    return User(**doc)


@api_router.post("/users/me/avatar", response_model=User)
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    ext = (file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin").lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Unsupported image format")
    path = f"{APP_NAME}/avatars/{user.user_id}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    if len(data) > 4 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Avatar too large (max 4MB)")
    result = put_object(path, data, file.content_type or f"image/{ext}")
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size"),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"avatar_path": result["path"]}}
    )
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "password_hash": 0})
    return User(**doc)


# ============ Watchlist ============
def _watch_doc(payload: dict, user_id: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "year": payload.get("year"),
        "name": payload.get("name"),
        "sport": payload.get("sport") or None,
        "tags": _norm_tags(payload.get("tags")),
        "target_price": payload.get("target_price"),
        "notes": payload.get("notes") or "",
        "created_at": now,
        "updated_at": now,
    }


@api_router.get("/watchlist", response_model=List[WatchItem])
async def list_watchlist(user: User = Depends(get_current_user)):
    await _require_pro(user)
    docs = await db.watchlist.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [WatchItem(**d) for d in docs]


@api_router.post("/watchlist", response_model=WatchItem)
async def create_watch(payload: WatchItemCreate, user: User = Depends(get_current_user)):
    await _require_pro(user)
    doc = _watch_doc(payload.model_dump(), user.user_id)
    await db.watchlist.insert_one(doc)
    return WatchItem(**{k: v for k, v in doc.items() if k != "_id"})


@api_router.put("/watchlist/{item_id}", response_model=WatchItem)
async def update_watch(item_id: str, payload: WatchItemUpdate, user: User = Depends(get_current_user)):
    await _require_pro(user)
    existing = await db.watchlist.find_one({"id": item_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "tags" in updates:
        updates["tags"] = _norm_tags(updates["tags"])
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.watchlist.update_one({"id": item_id, "user_id": user.user_id}, {"$set": updates})
    new_doc = await db.watchlist.find_one({"id": item_id, "user_id": user.user_id}, {"_id": 0})
    return WatchItem(**new_doc)


@api_router.delete("/watchlist/{item_id}")
async def delete_watch(item_id: str, user: User = Depends(get_current_user)):
    await _require_pro(user)
    r = await db.watchlist.delete_one({"id": item_id, "user_id": user.user_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"ok": True}


@api_router.post("/watchlist/{item_id}/acquire", response_model=Card)
async def acquire_watch(item_id: str, req: AcquireReq, user: User = Depends(get_current_user)):
    await _require_pro(user)
    existing = await db.watchlist.find_one({"id": item_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    payload = {
        "year": existing["year"],
        "name": existing["name"],
        "sport": existing.get("sport"),
        "tags": existing.get("tags") or [],
        "where_bought": req.where_bought or "",
        "price_paid": float(req.price_paid),
        "expenses": float(req.expenses or 0),
        "status": "in_collection",
        "purchased_date": req.purchased_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
    doc = _card_doc(payload, user.user_id)
    await db.cards.insert_one(doc)
    await db.watchlist.delete_one({"id": item_id, "user_id": user.user_id})
    return Card(**{k: v for k, v in doc.items() if k != "_id"})



# ============ Public Showcase ============
def _sanitize_card_public(d: dict) -> dict:
    """Strip cost/sale info for public view."""
    return {
        "id": d.get("id"),
        "year": d.get("year"),
        "name": d.get("name"),
        "sport": d.get("sport"),
        "tags": d.get("tags") or [],
        "status": d.get("status"),
        "image_path": d.get("image_path"),
        "images": d.get("images") or [],
        "share_token": d.get("share_token"),
    }


@api_router.post("/cards/{card_id}/share")
async def create_card_share(card_id: str, user: User = Depends(get_current_user)):
    existing = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Card not found")
    token = existing.get("share_token") or f"c_{uuid.uuid4().hex[:16]}"
    await db.cards.update_one(
        {"id": card_id, "user_id": user.user_id},
        {"$set": {"share_token": token, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"share_token": token}


@api_router.delete("/cards/{card_id}/share")
async def revoke_card_share(card_id: str, user: User = Depends(get_current_user)):
    r = await db.cards.update_one(
        {"id": card_id, "user_id": user.user_id},
        {"$set": {"share_token": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Card not found")
    return {"ok": True}


@api_router.post("/users/me/public-vault")
async def toggle_public_vault(enabled: bool = True, user: User = Depends(get_current_user)):
    if enabled:
        existing = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
        token = existing.get("public_vault_token") or f"v_{uuid.uuid4().hex[:16]}"
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"public_vault_token": token}})
        return {"public_vault_token": token, "enabled": True}
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"public_vault_token": None}})
    return {"enabled": False}


@api_router.get("/public/card/{token}")
async def public_card(token: str):
    d = await db.cards.find_one({"share_token": token}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    owner = await db.users.find_one({"user_id": d["user_id"]}, {"_id": 0, "password_hash": 0, "email": 0})
    return {
        "card": _sanitize_card_public(d),
        "owner": {"name": owner.get("name"), "avatar_path": owner.get("avatar_path")} if owner else None,
    }


@api_router.get("/public/vault/{token}")
async def public_vault(token: str):
    owner = await db.users.find_one({"public_vault_token": token}, {"_id": 0, "password_hash": 0, "email": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Not found")
    docs = await db.cards.find({"user_id": owner["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return {
        "owner": {"name": owner.get("name"), "avatar_path": owner.get("avatar_path"), "public_vault_token": token},
        "cards": [_sanitize_card_public(d) for d in docs],
    }


@api_router.get("/public/image/{token}/{path:path}")
async def public_image(token: str, path: str):
    # Allowed if the token is a card share_token AND the path matches that card's image(s)
    card = await db.cards.find_one({"share_token": token}, {"_id": 0})
    owner_id = None
    allowed_paths: set = set()
    if card:
        owner_id = card["user_id"]
        if card.get("image_path"):
            allowed_paths.add(card["image_path"])
        for p in (card.get("images") or []):
            allowed_paths.add(p)
    else:
        # Try vault token: any image referenced by any card of that user + user avatar
        user = await db.users.find_one({"public_vault_token": token}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="Not found")
        owner_id = user["user_id"]
        cards = await db.cards.find({"user_id": owner_id}, {"_id": 0, "image_path": 1, "images": 1}).to_list(5000)
        for c in cards:
            if c.get("image_path"):
                allowed_paths.add(c["image_path"])
            for p in (c.get("images") or []):
                allowed_paths.add(p)
        if user.get("avatar_path"):
            allowed_paths.add(user["avatar_path"])

    if path not in allowed_paths:
        raise HTTPException(status_code=404, detail="Not found")
    record = await db.files.find_one({"storage_path": path, "is_deleted": False, "user_id": owner_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type") or content_type)


# ============ Leaderboard / Goals / Referrals ============
import secrets as _secrets


def _ensure_referral_code(user_doc: dict) -> str:
    """Lazily generate a short 6-char referral code for the user (uppercase
    alphanumeric, no I/O/0/1 to avoid confusion). Idempotent."""
    if user_doc and user_doc.get("referral_code"):
        return user_doc["referral_code"]
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(_secrets.choice(alphabet) for _ in range(6))


def _leaderboard_handle(user_doc: dict) -> str:
    """Public-facing identifier on the leaderboard.
    If the user opted to reveal their real name, show it; otherwise show a stable anonymous handle.
    """
    if user_doc.get("leaderboard_show_name") and user_doc.get("name"):
        return user_doc["name"]
    h = user_doc.get("leaderboard_handle")
    if h:
        return h
    # Stable fallback derived from user_id so anonymous handles don't shuffle each load
    digits = "".join(c for c in str(user_doc.get("user_id") or "") if c.isdigit())
    suffix = digits[-3:] if digits else (user_doc.get("user_id") or "?")[-3:]
    return f"Flipper #{suffix}"


def _profit_for_card(card: dict) -> float:
    if card.get("status") != "sold":
        return 0.0
    try:
        return float(card.get("price_sold") or 0) - float(card.get("price_paid") or 0) - float(card.get("expenses") or 0)
    except Exception:
        return 0.0


@api_router.get("/leaderboard")
async def leaderboard(metric: str = "profit", limit: int = 20):
    """Public, no-auth leaderboard. metric ∈ {profit, cards}.
    Returns relative ranks (1..N) and a normalized 0..1 bar value vs the leader,
    so the frontend can display a progress bar without ever exposing dollar amounts.
    """
    if metric not in ("profit", "cards"):
        raise HTTPException(status_code=400, detail="metric must be 'profit' or 'cards'")
    if limit < 1 or limit > 100:
        limit = 20

    # Collect users who haven't opted out
    users = await db.users.find(
        {"$or": [{"leaderboard_opt_out": {"$ne": True}}, {"leaderboard_opt_out": {"$exists": False}}]},
        {"_id": 0, "user_id": 1, "name": 1, "avatar_path": 1, "leaderboard_handle": 1, "leaderboard_show_name": 1, "is_pro": 1, "pro_expires_at": 1, "annual_pro": 1}
    ).to_list(2000)

    rows = []
    for u in users:
        uid = u.get("user_id")
        if not uid:
            continue
        if metric == "cards":
            n = await db.cards.count_documents({"user_id": uid})
            score = float(n)
        else:  # profit
            cards = await db.cards.find(
                {"user_id": uid, "status": "sold"},
                {"_id": 0, "price_paid": 1, "price_sold": 1, "expenses": 1, "status": 1}
            ).to_list(5000)
            score = sum(_profit_for_card(c) for c in cards)
        if score <= 0:
            continue
        is_pro_now = _user_is_pro(u)
        rows.append({
            "user_id": uid,
            "handle": _leaderboard_handle(u),
            "avatar_path": u.get("avatar_path"),
            "is_pro": is_pro_now,
            "is_annual_pro": bool(u.get("annual_pro")) and is_pro_now,
            "score": score,
        })

    rows.sort(key=lambda r: r["score"], reverse=True)
    rows = rows[:limit]
    leader = rows[0]["score"] if rows else 0.0
    out = []
    for i, r in enumerate(rows):
        bar = (r["score"] / leader) if leader > 0 else 0.0
        out.append({
            "rank": i + 1,
            "handle": r["handle"],
            "avatar_path": r["avatar_path"],
            "is_pro": r["is_pro"],
            "is_annual_pro": r["is_annual_pro"],
            "bar": round(bar, 4),  # 0..1 for progress bar; never reveals raw $
            "card_count": int(r["score"]) if metric == "cards" else None,
        })
    return {"metric": metric, "rows": out}


class LeaderboardPrefsReq(BaseModel):
    leaderboard_opt_out: Optional[bool] = None
    leaderboard_show_name: Optional[bool] = None
    leaderboard_handle: Optional[str] = None  # allow user to set their own anon handle


@api_router.put("/me/leaderboard-prefs")
async def update_leaderboard_prefs(req: LeaderboardPrefsReq, user: User = Depends(get_current_user)):
    updates = {}
    if req.leaderboard_opt_out is not None:
        updates["leaderboard_opt_out"] = bool(req.leaderboard_opt_out)
    if req.leaderboard_show_name is not None:
        updates["leaderboard_show_name"] = bool(req.leaderboard_show_name)
    if req.leaderboard_handle is not None:
        h = req.leaderboard_handle.strip()[:24]
        if h and not all(c.isalnum() or c in " _-" for c in h):
            raise HTTPException(status_code=400, detail="Handle: letters, numbers, space, _ or - only")
        updates["leaderboard_handle"] = h or None
    if not updates:
        raise HTTPException(status_code=400, detail="No changes")
    await db.users.update_one({"user_id": user.user_id}, {"$set": updates})
    return {"ok": True, **updates}


class GoalReq(BaseModel):
    monthly_profit_goal: Optional[float] = None  # null disables


@api_router.put("/me/goal")
async def set_monthly_goal(req: GoalReq, user: User = Depends(get_current_user)):
    val = req.monthly_profit_goal
    if val is not None and (val < 0 or val > 1_000_000):
        raise HTTPException(status_code=400, detail="Goal must be between 0 and 1,000,000")
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"monthly_profit_goal": val}})
    return {"ok": True, "monthly_profit_goal": val}


@api_router.get("/me/monthly-progress")
async def monthly_progress(user: User = Depends(get_current_user)):
    """Returns this calendar month's profit + the user's target, so the
    Dashboard can render a progress bar."""
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "monthly_profit_goal": 1})
    goal = doc.get("monthly_profit_goal") if doc else None
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cards = await db.cards.find(
        {"user_id": user.user_id, "status": "sold"},
        {"_id": 0, "price_paid": 1, "price_sold": 1, "expenses": 1, "sold_date": 1, "status": 1}
    ).to_list(5000)
    profit = 0.0
    flips = 0
    for c in cards:
        d = c.get("sold_date") or ""
        try:
            dt = datetime.fromisoformat(d.replace("Z", "+00:00")) if d else None
            if dt and dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            dt = None
        if dt and dt >= month_start:
            profit += _profit_for_card(c)
            flips += 1
    return {
        "month": month_start.strftime("%B %Y"),
        "month_iso": month_start.date().isoformat(),
        "profit": round(profit, 2),
        "flips": flips,
        "goal": goal,
        "pct": round((profit / goal) if (goal and goal > 0) else 0.0, 4),
    }


@api_router.get("/me/year-recap")
async def year_recap(year: Optional[int] = None, user: User = Depends(get_current_user)):
    """All the numbers needed for the shareable Year-in-Review card."""
    if not year:
        year = datetime.now(timezone.utc).year
    if year < 2000 or year > 2100:
        raise HTTPException(status_code=400, detail="invalid year")
    cards = await db.cards.find(
        {"user_id": user.user_id},
        {"_id": 0, "name": 1, "year": 1, "sport": 1, "price_paid": 1, "price_sold": 1,
         "expenses": 1, "sold_date": 1, "purchased_date": 1, "status": 1, "image_path": 1}
    ).to_list(5000)

    def _in_year(s):
        try:
            return s and int(s[:4]) == year
        except Exception:
            return False

    sold_this_year = [c for c in cards if c.get("status") == "sold" and _in_year(c.get("sold_date") or "")]
    bought_this_year = [c for c in cards if _in_year(c.get("purchased_date") or "")]
    total_profit = sum(_profit_for_card(c) for c in sold_this_year)
    flips = len(sold_this_year)
    spend = sum(float(c.get("price_paid") or 0) for c in bought_this_year)
    cards_added = len(bought_this_year)

    best = None
    for c in sold_this_year:
        p = _profit_for_card(c)
        if best is None or p > _profit_for_card(best):
            best = c

    sport_counts = {}
    for c in cards:
        s = c.get("sport") or "Other"
        sport_counts[s] = sport_counts.get(s, 0) + 1
    top_sport = max(sport_counts.items(), key=lambda x: x[1])[0] if sport_counts else None

    return {
        "year": year,
        "total_profit": round(total_profit, 2),
        "flips": flips,
        "cards_added": cards_added,
        "spend": round(spend, 2),
        "best_flip": ({
            "name": best.get("name"),
            "year": best.get("year"),
            "profit": round(_profit_for_card(best), 2),
            "image_path": best.get("image_path"),
        } if best else None),
        "top_sport": top_sport,
    }


@api_router.get("/me/referral")
async def get_referral(user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    code = _ensure_referral_code(doc)
    if not (doc and doc.get("referral_code")):
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"referral_code": code}})
    referred_count = await db.users.count_documents({"referred_by": code})
    return {
        "code": code,
        "referred_count": referred_count,
        "share_url": f"/?ref={code}",
        "rewards_given_months": (doc.get("referral_rewards_given") if doc else 0) or 0,
    }


# ============ End leaderboard/goals/referrals ============


# ============ Admin analytics ============
@api_router.get("/admin/overview")
async def admin_overview(user: User = Depends(require_admin)):
    """Operator-level analytics. Aggregates across all users.
    Gated to ADMIN_EMAILS env var. Returns growth, monetization, engagement, beta, referrals.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    iso_today = today_start.isoformat()
    iso_7d = (today_start - timedelta(days=7)).isoformat()
    iso_30d = (today_start - timedelta(days=30)).isoformat()
    now_iso = now.isoformat()

    # ---- Users / Growth ----
    total_users = await db.users.count_documents({})
    new_today = await db.users.count_documents({"created_at": {"$gte": iso_today}})
    new_7d = await db.users.count_documents({"created_at": {"$gte": iso_7d}})
    new_30d = await db.users.count_documents({"created_at": {"$gte": iso_30d}})

    # 30-day signup chart: day → count
    signup_chart = []
    for i in range(29, -1, -1):
        day = today_start - timedelta(days=i)
        nxt = day + timedelta(days=1)
        c = await db.users.count_documents({"created_at": {"$gte": day.isoformat(), "$lt": nxt.isoformat()}})
        signup_chart.append({"date": day.strftime("%Y-%m-%d"), "count": c})

    # ---- Monetization ----
    active_pro = await db.users.count_documents({"is_pro": True, "pro_expires_at": {"$gte": now_iso}})
    active_annual = await db.users.count_documents({"annual_pro": True, "pro_expires_at": {"$gte": now_iso}})
    active_monthly = max(0, active_pro - active_annual)
    ever_pro = await db.users.count_documents({"ever_pro": True})
    expired_pro = max(0, ever_pro - active_pro)

    # Revenue: sum from completed payment_transactions
    rev_30d = 0.0
    rev_lifetime = 0.0
    try:
        agg_life = await db.payment_transactions.aggregate([
            {"$match": {"payment_status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]).to_list(length=1)
        if agg_life:
            rev_lifetime = float(agg_life[0].get("total") or 0)
        agg_30 = await db.payment_transactions.aggregate([
            {"$match": {"payment_status": "paid", "updated_at": {"$gte": iso_30d}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]).to_list(length=1)
        if agg_30:
            rev_30d = float(agg_30[0].get("total") or 0)
    except Exception:
        pass

    # Estimated MRR: monthly subs × $6 + annual subs × $65/12
    est_mrr = round(active_monthly * 6 + active_annual * (65 / 12), 2)

    # ---- Engagement ----
    total_cards = await db.cards.count_documents({})
    total_sold = await db.cards.count_documents({"status": "sold"})
    cards_added_30d = await db.cards.count_documents({"created_at": {"$gte": iso_30d}})
    ai_scans_total = await db.ai_scan_events.count_documents({})
    ai_scans_30d = await db.ai_scan_events.count_documents({"ts": {"$gte": iso_30d}})

    # Total profit logged across the platform
    total_profit = 0.0
    try:
        agg = await db.cards.aggregate([
            {"$match": {"status": "sold"}},
            {"$group": {
                "_id": None,
                "sales": {"$sum": {"$ifNull": ["$price_sold", 0]}},
                "paid": {"$sum": {"$ifNull": ["$price_paid", 0]}},
                "fees": {"$sum": {"$ifNull": ["$expenses", 0]}},
            }},
        ]).to_list(length=1)
        if agg:
            row = agg[0]
            total_profit = float((row.get("sales") or 0) - (row.get("paid") or 0) - (row.get("fees") or 0))
    except Exception:
        pass

    # Top sports
    top_sports = []
    try:
        sport_agg = await db.cards.aggregate([
            {"$match": {"sport": {"$exists": True, "$nin": [None, ""]}}},
            {"$group": {"_id": "$sport", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 6},
        ]).to_list(length=6)
        top_sports = [{"sport": r["_id"], "count": r["count"]} for r in sport_agg]
    except Exception:
        pass

    # ---- Beta program ----
    beta_redeemed = await db.users.count_documents({"beta_redeemed_code": {"$exists": True, "$ne": None}})
    beta_redeemed_30d = await db.users.count_documents({"beta_redeemed_at": {"$gte": iso_30d}})

    # ---- Referrals ----
    total_signups_with_ref = await db.users.count_documents({"referred_by": {"$exists": True, "$ne": None}})
    total_rewards_given = 0
    try:
        agg = await db.users.aggregate([
            {"$match": {"referral_rewards_given": {"$gt": 0}}},
            {"$group": {"_id": None, "total": {"$sum": "$referral_rewards_given"}}},
        ]).to_list(length=1)
        if agg:
            total_rewards_given = int(agg[0].get("total") or 0)
    except Exception:
        pass

    # Top 5 referrers
    top_referrers = []
    try:
        rows = await db.users.find(
            {"referral_rewards_given": {"$gt": 0}},
            {"_id": 0, "name": 1, "email": 1, "referral_code": 1, "referral_rewards_given": 1},
        ).sort("referral_rewards_given", -1).limit(5).to_list(length=5)
        top_referrers = rows
    except Exception:
        pass

    return {
        "generated_at": now_iso,
        "users": {
            "total": total_users,
            "new_today": new_today,
            "new_7d": new_7d,
            "new_30d": new_30d,
            "signup_chart_30d": signup_chart,
        },
        "monetization": {
            "active_pro": active_pro,
            "active_monthly": active_monthly,
            "active_annual": active_annual,
            "ever_pro": ever_pro,
            "expired_pro": expired_pro,
            "est_mrr": est_mrr,
            "revenue_30d": round(rev_30d, 2),
            "revenue_lifetime": round(rev_lifetime, 2),
        },
        "engagement": {
            "total_cards": total_cards,
            "total_sold": total_sold,
            "cards_added_30d": cards_added_30d,
            "total_profit_logged": round(total_profit, 2),
            "ai_scans_total": ai_scans_total,
            "ai_scans_30d": ai_scans_30d,
            "top_sports": top_sports,
        },
        "beta": {
            "redeemed_total": beta_redeemed,
            "redeemed_30d": beta_redeemed_30d,
        },
        "referrals": {
            "signups_via_referral": total_signups_with_ref,
            "rewards_granted": total_rewards_given,
            "top_referrers": top_referrers,
        },
    }


# ============ End admin analytics ============


# ============ AI Price Estimation (REMOVED) ============
# The /watchlist/{item_id}/estimate endpoint was removed in favor of pure
# eBay sold-comp links. No external LLM calls are made for price guesses.


# ============ Social-share OG meta (server-rendered for crawlers) ============
def _html_escape(s: str) -> str:
    return (str(s or "")
            .replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;").replace("'", "&#39;"))


def _public_base_url(request: Request) -> str:
    """Build the externally-reachable base URL from K8s ingress headers, falling
    back to the raw request base_url if proxy headers aren't present.
    """
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if host:
        return f"{proto}://{host}".rstrip("/")
    return str(request.base_url).rstrip("/")


def _og_html(title: str, description: str, image_url: str, redirect_url: str, canonical: str) -> str:
    """Render a tiny OG-rich HTML page that previews well in iMessage / Twitter
    / Discord / Slack, then redirects real-browser visitors to the SPA route.
    """
    t = _html_escape(title)
    d = _html_escape(description)
    img = _html_escape(image_url) if image_url else ""
    r = _html_escape(redirect_url)
    c = _html_escape(canonical)
    image_meta = (
        f'<meta property="og:image" content="{img}" />\n'
        f'<meta name="twitter:image" content="{img}" />'
    ) if image_url else ""
    body_img = f'<img src="{img}" alt="" />' if image_url else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>{t}</title>
<meta name="description" content="{d}" />
<link rel="canonical" href="{c}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="{t}" />
<meta property="og:description" content="{d}" />
{image_meta}
<meta property="og:url" content="{c}" />
<meta property="og:site_name" content="CardCloud" />
<meta name="twitter:card" content="{'summary_large_image' if image_url else 'summary'}" />
<meta name="twitter:title" content="{t}" />
<meta name="twitter:description" content="{d}" />
<meta http-equiv="refresh" content="0; url={r}" />
<script>window.location.replace({r!r});</script>
<style>html,body{{margin:0;background:#0A0A0A;color:#fff;font-family:-apple-system,system-ui,sans-serif}}.wrap{{min-height:100vh;display:grid;place-items:center;text-align:center;padding:32px}}img{{max-width:380px;width:100%;border-radius:12px}}a{{color:#FF8079}}</style>
</head>
<body>
<div class="wrap">
<div>
{body_img}
<h1 style="font-weight:900;letter-spacing:-0.02em;text-transform:uppercase;margin-top:24px">{t}</h1>
<p style="opacity:.7">{d}</p>
<p><a href="{r}">Open on CardCloud →</a></p>
</div>
</div>
</body>
</html>
"""


@api_router.get("/share/c/{token}")
async def share_card_meta(request: Request, token: str):
    card = await db.cards.find_one({"share_token": token}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Not found")
    base = _public_base_url(request)
    img_path = card.get("image_path") or (card.get("images") or [None])[0]
    image_url = f"{base}/api/public/image/{token}/{img_path}" if img_path else ""
    title = f"{card.get('year') or ''} {card.get('name') or 'Card'}".strip()
    sport = card.get("sport") or ""
    tags = ", ".join((card.get("tags") or [])[:3])
    desc_bits = [b for b in [sport, tags, "Tracked on CardCloud"] if b]
    description = " · ".join(desc_bits)
    redirect_url = f"/s/c/{token}"
    canonical = f"{base}/api/share/c/{token}"
    return Response(content=_og_html(title, description, image_url, redirect_url, canonical), media_type="text/html")


@api_router.get("/share/v/{token}")
async def share_vault_meta(request: Request, token: str):
    owner = await db.users.find_one({"public_vault_token": token}, {"_id": 0, "password_hash": 0, "email": 0})
    if not owner:
        raise HTTPException(status_code=404, detail="Not found")
    cards = await db.cards.find({"user_id": owner["user_id"]}, {"_id": 0, "image_path": 1, "images": 1, "name": 1}).to_list(20)
    base = _public_base_url(request)
    cover_path = None
    for c in cards:
        cover_path = c.get("image_path") or (c.get("images") or [None])[0]
        if cover_path:
            break
    image_url = f"{base}/api/public/image/{token}/{cover_path}" if cover_path else ""
    title = f"{owner.get('name') or 'Collector'}'s Vault"
    description = f"{len(cards)} card{'s' if len(cards) != 1 else ''} · Tracked on CardCloud"
    redirect_url = f"/s/v/{token}"
    canonical = f"{base}/api/share/v/{token}"
    return Response(content=_og_html(title, description, image_url, redirect_url, canonical), media_type="text/html")


# ============ Billing (Stripe) ============
def _user_is_pro(user_doc: dict) -> bool:
    if not user_doc:
        return False
    if user_doc.get("is_pro") is True:
        # Check expiry
        exp = user_doc.get("pro_expires_at")
        if exp:
            try:
                dt = datetime.fromisoformat(exp)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                if dt > datetime.now(timezone.utc):
                    return True
                return False
            except Exception:
                return False
        return True
    return False


async def _require_pro(user: User):
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if not _user_is_pro(doc):
        raise HTTPException(status_code=402, detail="Pro subscription required")


FREE_TAG_LIMIT = 1


async def _enforce_tag_limit(user: User, tags) -> list:
    """Free users may have at most FREE_TAG_LIMIT tags per card.
    Pro users may have unlimited tags. Returns the (already normalized) tag list.
    Raises 402 with a descriptive detail if free user exceeds the limit.
    """
    norm = _norm_tags(tags)
    if not norm:
        return norm
    if len(norm) <= FREE_TAG_LIMIT:
        return norm
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    if _user_is_pro(doc):
        return norm
    raise HTTPException(
        status_code=402,
        detail=f"Free plan allows {FREE_TAG_LIMIT} tag per card. Upgrade to Pro for unlimited tags.",
    )


class CheckoutReq(BaseModel):
    package_id: str
    origin_url: str


@api_router.post("/billing/checkout")
async def create_checkout(req: CheckoutReq, http_request: Request, user: User = Depends(get_current_user)):
    if req.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    pkg = PACKAGES[req.package_id]
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Billing unavailable: {e}")

    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    origin = req.origin_url.rstrip("/")
    success_url = f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/profile"
    metadata = {
        "user_id": user.user_id,
        "email": user.email,
        "package_id": req.package_id,
        "source": "cardcloud_pro",
    }
    session = await sc.create_checkout_session(
        CheckoutSessionRequest(
            amount=float(pkg["amount"]),
            currency=pkg["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
    )

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "session_id": session.session_id,
        "amount": float(pkg["amount"]),
        "currency": pkg["currency"],
        "package_id": req.package_id,
        "metadata": metadata,
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/billing/status/{session_id}")
async def billing_status(session_id: str, http_request: Request, user: User = Depends(get_current_user)):
    txn = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user.user_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    # Already finalized — idempotent return
    if txn.get("payment_status") == "paid":
        return {"payment_status": "paid", "status": "complete", "is_pro": True}

    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Billing unavailable: {e}")

    host_url = str(http_request.base_url).rstrip("/")
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url}/api/webhook/stripe")
    status = await sc.get_checkout_status(session_id)

    new_status = status.payment_status  # 'paid' | 'unpaid' | etc.
    await db.payment_transactions.update_one(
        {"session_id": session_id, "user_id": user.user_id},
        {"$set": {
            "payment_status": new_status,
            "stripe_status": status.status,
            "amount_total": status.amount_total,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    if new_status == "paid":
        # Activate Pro: 31 days for monthly, 365 days for yearly. First-time
        # subscribers get TRIAL_DAYS extra (the "1-month free" yearly upsell
        # is already baked into the price, so we don't double-stack on yearly).
        existing = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
        base = datetime.now(timezone.utc)
        if existing and existing.get("pro_expires_at"):
            try:
                cur = datetime.fromisoformat(existing["pro_expires_at"])
                if cur.tzinfo is None:
                    cur = cur.replace(tzinfo=timezone.utc)
                if cur > base:
                    base = cur
            except Exception:
                pass
        pkg = PACKAGES.get(txn.get("package_id") or "pro_monthly", PACKAGES["pro_monthly"])
        days = 365 if pkg.get("interval") == "yearly" else 31
        first_time = not (existing and existing.get("ever_pro"))
        if first_time and pkg.get("interval") == "monthly":
            days += TRIAL_DAYS
        new_exp = base + timedelta(days=days)
        is_annual = pkg.get("interval") == "yearly"
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "is_pro": True,
                "pro_expires_at": new_exp.isoformat(),
                "ever_pro": True,
                "annual_pro": is_annual or bool(existing and existing.get("annual_pro")),
            }}
        )
        # Referral reward: when a referred user converts to Pro for the first
        # time, grant the referrer +30 days. Only fires once per referee.
        if first_time and existing and existing.get("referred_by") and not existing.get("referral_reward_given"):
            ref_code = existing["referred_by"]
            ref_owner = await db.users.find_one({"referral_code": ref_code}, {"_id": 0})
            if ref_owner:
                ref_base = datetime.now(timezone.utc)
                if ref_owner.get("pro_expires_at"):
                    try:
                        cur = datetime.fromisoformat(ref_owner["pro_expires_at"])
                        if cur.tzinfo is None:
                            cur = cur.replace(tzinfo=timezone.utc)
                        if cur > ref_base:
                            ref_base = cur
                    except Exception:
                        pass
                await db.users.update_one(
                    {"user_id": ref_owner["user_id"]},
                    {"$set": {
                        "is_pro": True,
                        "pro_expires_at": (ref_base + timedelta(days=30)).isoformat(),
                        "ever_pro": True,
                    },
                     "$inc": {"referral_rewards_given": 1}},
                )
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$set": {"referral_reward_given": True}},
            )
    return {"payment_status": new_status, "status": status.status, "is_pro": new_status == "paid"}


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
    except Exception as e:
        logger.error(f"Stripe webhook lib error: {e}")
        return {"ok": False}
    host_url = str(request.base_url).rstrip("/")
    sc = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host_url}/api/webhook/stripe")
    try:
        ev = await sc.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Stripe webhook decode error: {e}")
        return {"ok": False}
    # Note: status polling on success page handles activation; webhook is additional safety
    if ev and ev.payment_status == "paid" and ev.metadata and ev.metadata.get("user_id"):
        user_id = ev.metadata["user_id"]
        package_id = ev.metadata.get("package_id") or "pro_monthly"
        await db.payment_transactions.update_one(
            {"session_id": ev.session_id},
            {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        existing = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        base = datetime.now(timezone.utc)
        if existing and existing.get("pro_expires_at"):
            try:
                cur = datetime.fromisoformat(existing["pro_expires_at"])
                if cur.tzinfo is None:
                    cur = cur.replace(tzinfo=timezone.utc)
                if cur > base:
                    base = cur
            except Exception:
                pass
        pkg = PACKAGES.get(package_id, PACKAGES["pro_monthly"])
        days = 365 if pkg.get("interval") == "yearly" else 31
        first_time = not (existing and existing.get("ever_pro"))
        if first_time and pkg.get("interval") == "monthly":
            days += TRIAL_DAYS
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"is_pro": True, "pro_expires_at": (base + timedelta(days=days)).isoformat(), "ever_pro": True}}
        )
    return {"ok": True}


@api_router.get("/billing/me")
async def billing_me(user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    is_pro = _user_is_pro(doc)
    return {
        "is_pro": is_pro,
        "is_annual_pro": bool(doc and doc.get("annual_pro")) and is_pro,
        "pro_expires_at": doc.get("pro_expires_at") if doc else None,
        "packages": PACKAGES,
        "limits": {
            "tags_per_card": (None if is_pro else FREE_TAG_LIMIT),
        },
        "is_beta": bool(doc and doc.get("beta_redeemed_code")),
    }


class RedeemReq(BaseModel):
    code: str


@api_router.post("/billing/redeem-code")
async def redeem_code(req: RedeemReq, user: User = Depends(get_current_user)):
    """Beta-tester redemption: enter a valid invite code → instant Pro access
    for BETA_DAYS (default 90). Idempotent — re-redeeming the same code by the
    same user just refreshes the expiry from "now" without resetting other
    pro state. Does not interact with Stripe."""
    code = (req.code or "").strip().lower()
    if not code:
        raise HTTPException(status_code=400, detail="Please enter a code")
    if code not in BETA_INVITE_CODES:
        raise HTTPException(status_code=400, detail="That code isn't valid")

    existing = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    base = datetime.now(timezone.utc)
    if existing and existing.get("pro_expires_at"):
        try:
            cur = datetime.fromisoformat(existing["pro_expires_at"])
            if cur.tzinfo is None:
                cur = cur.replace(tzinfo=timezone.utc)
            if cur > base:
                base = cur
        except Exception:
            pass
    new_exp = base + timedelta(days=BETA_DAYS)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "is_pro": True,
            "pro_expires_at": new_exp.isoformat(),
            "ever_pro": True,
            "beta_redeemed_code": code,
            "beta_redeemed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {
        "ok": True,
        "is_pro": True,
        "pro_expires_at": new_exp.isoformat(),
        "days_granted": BETA_DAYS,
    }


# ============ Tax Export (Pro-only, IRS Form 8949 format) ============
@api_router.get("/cards/tax/export.csv")
async def tax_export(year: Optional[int] = None, user: User = Depends(get_current_user)):
    await _require_pro(user)
    docs = await db.cards.find({"user_id": user.user_id, "status": "sold"}, {"_id": 0}).to_list(5000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    # Form 8949 columns: (a) Description, (b) Date acquired, (c) Date sold, (d) Proceeds, (e) Cost basis, (f) Code, (g) Adjustment, (h) Gain/(Loss), Term
    writer.writerow([
        "(a) Description of property",
        "(b) Date acquired",
        "(c) Date sold or disposed",
        "(d) Proceeds (sales price)",
        "(e) Cost or other basis",
        "(f) Code, if any",
        "(g) Amount of adjustment",
        "(h) Gain or (loss)",
        "Term",
    ])
    total_gain = 0.0
    rows = 0
    for d in docs:
        sold_dt = _card_date(d, "sold")
        if not sold_dt:
            continue
        if year and sold_dt.year != year:
            continue
        acquired_dt = _card_date(d, "paid")
        proceeds = float(d.get("price_sold") or 0)
        basis = float(d.get("price_paid") or 0)
        adj = float(d.get("expenses") or 0)  # Treat fees as basis adjustment via column (g)
        # Form 8949: gain = proceeds - basis - adjustment
        gain = round(proceeds - basis - adj, 2)
        total_gain += gain
        term = "Short-term"
        if acquired_dt and sold_dt:
            held_days = (sold_dt - acquired_dt).days
            if held_days > 365:
                term = "Long-term"
        desc_parts = [str(d.get("year") or ""), d.get("name") or ""]
        if d.get("condition"):
            desc_parts.append(d["condition"] + (f" {d['grade']}" if d.get("grade") else ""))
        description = " ".join([p for p in desc_parts if p]).strip()
        writer.writerow([
            description,
            (acquired_dt.strftime("%m/%d/%Y") if acquired_dt else ""),
            sold_dt.strftime("%m/%d/%Y"),
            f"{proceeds:.2f}",
            f"{basis:.2f}",
            "",
            f"{adj:.2f}" if adj else "",
            f"{gain:.2f}",
            term,
        ])
        rows += 1
    # Totals row
    writer.writerow([])
    writer.writerow(["", "", "TOTAL", "", "", "", "", f"{round(total_gain, 2):.2f}", f"{rows} transactions"])

    filename = f"cardcloud_tax_8949_{year or 'all'}.csv"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@api_router.get("/files/{path:path}")
async def serve_file(path: str, authorization: Optional[str] = Header(None), auth: Optional[str] = Query(None)):
    auth_header = authorization or (f"Bearer {auth}" if auth else None)
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(auth_header)
    record = await db.files.find_one({"storage_path": path, "is_deleted": False, "user_id": user.user_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type") or content_type)


@api_router.get("/")
async def root():
    return {"app": "CardCloud", "ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

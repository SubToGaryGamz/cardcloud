from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Query, Response
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
    auth_provider: str  # "email" | "google"
    created_at: str


class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: str


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
    images: List[str] = []  # multi-image support (additional images)
    purchased_date: Optional[str] = None
    sold_date: Optional[str] = None
    sport: Optional[str] = None
    tags: List[str] = []
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
    return User(**user_doc)


# ============ Auth routes ============
@api_router.post("/auth/register", response_model=AuthResp)
async def register(req: RegisterReq):
    existing = await db.users.find_one({"email": req.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    pwd_hash = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    doc = {
        "user_id": user_id,
        "email": req.email.lower(),
        "name": req.name,
        "picture": None,
        "auth_provider": "email",
        "password_hash": pwd_hash,
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
        "created_at": now,
        "updated_at": now,
    }


@api_router.post("/cards", response_model=Card)
async def create_card(payload: CardCreate, user: User = Depends(get_current_user)):
    doc = _card_doc(payload.model_dump(), user.user_id)
    await db.cards.insert_one(doc)
    return Card(**{k: v for k, v in doc.items() if k != "_id"})


@api_router.get("/cards", response_model=List[Card])
async def list_cards(
    q: Optional[str] = None,
    status: Optional[str] = None,
    year: Optional[int] = None,
    tag: Optional[str] = None,
    sport: Optional[str] = None,
    user: User = Depends(get_current_user),
):
    filt: dict = {"user_id": user.user_id}
    if status and status in ("in_collection", "sold"):
        filt["status"] = status
    if year:
        filt["year"] = year
    if sport:
        filt["sport"] = sport
    if tag:
        filt["tags"] = tag.strip().lower()
    if q:
        qr = {"$regex": q, "$options": "i"}
        filt["$or"] = [{"name": qr}, {"tags": qr}, {"sport": qr}]
    docs = await db.cards.find(filt, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [Card(**d) for d in docs]


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
    docs = await db.cards.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Year", "Name", "Sport", "Tags", "Where Bought", "Price Paid", "Price Sold", "Expenses", "Status", "Purchased Date", "Sold Date", "Profit", "Created"])
    for d in docs:
        sold = float(d.get("price_sold") or 0) if d.get("status") == "sold" else 0
        profit = sold - float(d.get("price_paid") or 0) - float(d.get("expenses") or 0) if d.get("status") == "sold" else 0
        writer.writerow([
            d.get("year"), d.get("name"),
            d.get("sport") or "",
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
        updates["tags"] = _norm_tags(updates["tags"])
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
            "created_at": now_iso,
            "updated_at": now_iso,
        }
        await db.cards.insert_one(doc)
        imported += 1
    return {"imported": imported, "skipped": skipped, "errors": errors[:20]}


# ============ User Profile ============
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
    docs = await db.watchlist.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [WatchItem(**d) for d in docs]


@api_router.post("/watchlist", response_model=WatchItem)
async def create_watch(payload: WatchItemCreate, user: User = Depends(get_current_user)):
    doc = _watch_doc(payload.model_dump(), user.user_id)
    await db.watchlist.insert_one(doc)
    return WatchItem(**{k: v for k, v in doc.items() if k != "_id"})


@api_router.put("/watchlist/{item_id}", response_model=WatchItem)
async def update_watch(item_id: str, payload: WatchItemUpdate, user: User = Depends(get_current_user)):
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
    r = await db.watchlist.delete_one({"id": item_id, "user_id": user.user_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"ok": True}


@api_router.post("/watchlist/{item_id}/acquire", response_model=Card)
async def acquire_watch(item_id: str, req: AcquireReq, user: User = Depends(get_current_user)):
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

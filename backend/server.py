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
APP_NAME = os.environ.get('APP_NAME', 'cardvault')

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


class CardUpdate(BaseModel):
    year: Optional[int] = None
    name: Optional[str] = None
    where_bought: Optional[str] = None
    price_paid: Optional[float] = None
    price_sold: Optional[float] = None
    expenses: Optional[float] = None
    status: Optional[str] = None


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
    user: User = Depends(get_current_user),
):
    filt = {"user_id": user.user_id}
    if status and status in ("in_collection", "sold"):
        filt["status"] = status
    if year:
        filt["year"] = year
    if q:
        filt["name"] = {"$regex": q, "$options": "i"}
    docs = await db.cards.find(filt, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [Card(**d) for d in docs]


@api_router.get("/cards/stats")
async def cards_stats(user: User = Depends(get_current_user)):
    docs = await db.cards.find({"user_id": user.user_id}, {"_id": 0}).to_list(5000)
    total_paid = 0.0
    total_sales = 0.0
    total_expenses = 0.0
    sold_paid = 0.0
    sold_expenses = 0.0
    sold_count = 0
    for d in docs:
        total_paid += float(d.get("price_paid") or 0)
        total_expenses += float(d.get("expenses") or 0)
        if d.get("status") == "sold":
            total_sales += float(d.get("price_sold") or 0)
            sold_paid += float(d.get("price_paid") or 0)
            sold_expenses += float(d.get("expenses") or 0)
            sold_count += 1
    profit = total_sales - sold_paid - sold_expenses
    return {
        "total_cards": len(docs),
        "in_collection_count": len(docs) - sold_count,
        "sold_count": sold_count,
        "total_paid": round(total_paid, 2),
        "total_sales": round(total_sales, 2),
        "total_expenses": round(total_expenses, 2),
        "profit": round(profit, 2),
    }


@api_router.get("/cards/export.csv")
async def export_cards_csv(user: User = Depends(get_current_user)):
    docs = await db.cards.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Year", "Name", "Where Bought", "Price Paid", "Price Sold", "Expenses", "Status", "Profit", "Created"])
    for d in docs:
        sold = float(d.get("price_sold") or 0) if d.get("status") == "sold" else 0
        profit = sold - float(d.get("price_paid") or 0) - float(d.get("expenses") or 0) if d.get("status") == "sold" else 0
        writer.writerow([
            d.get("year"), d.get("name"), d.get("where_bought") or "",
            d.get("price_paid") or 0, d.get("price_sold") or "",
            d.get("expenses") or 0, d.get("status"),
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
async def upload_card_image(card_id: str, file: UploadFile = File(...), user: User = Depends(get_current_user)):
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
    await db.cards.update_one(
        {"id": card_id, "user_id": user.user_id},
        {"$set": {"image_path": result["path"], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    new_doc = await db.cards.find_one({"id": card_id, "user_id": user.user_id}, {"_id": 0})
    return Card(**new_doc)


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
    return {"app": "CardVault", "ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

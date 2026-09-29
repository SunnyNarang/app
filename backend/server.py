import io
import os
import jwt
import uuid
import bcrypt
import secrets
import string
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Annotated

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response, File, UploadFile
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
import requests

from bson import ObjectId

from PIL import Image, ImageOps

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rotary-api")


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def gen_password(length: int = 8) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def sync_member_user(name: str, email: str, password: str):
    """Keep the login account of a member in sync with the member record."""
    if not email or not password:
        return
    hashed = hash_password(password)
    existing = await db.users.find_one({"email": email})
    if existing:
        if existing.get("role") == "admin":
            return
        await db.users.update_one({"_id": existing["_id"]},
                                  {"$set": {"password_hash": hashed, "name": name, "role": "member"}})
    else:
        await db.users.insert_one({"email": email, "username": "", "password_hash": hashed,
                                   "name": name, "role": "member", "created_at": iso_now()})


# ---- Object storage (member photos) ----

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "rotary-gwalior"
storage_key = None


def init_storage(force: bool = False) -> str:
    """Mint a session-scoped storage key once; force=True recovers a dead key."""
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code in (400, 404):
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> bytes:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code in (400, 404):
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content


def process_photo(data: bytes) -> bytes:
    """EXIF-orient, centre-crop to a square and resize to 500x500 JPEG."""
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((500, 500), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def maybe_release_photo(old_url: str, new_url: str):
    """Soft-delete the previous uploaded photo when it is replaced."""
    if old_url and old_url.startswith("/api/media/") and old_url != new_url:
        old_path = old_url.split("/api/media/", 1)[1]
        await db.files.update_one({"storage_path": old_path}, {"$set": {"is_deleted": True}})


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie(key="access_token", value=access, httponly=True,
                        secure=True, samesite="none", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True,
                        secure=True, samesite="none", max_age=604800, path="/")


# ---- Mongo document adapters ----

def oid_str(v):
    return str(v) if isinstance(v, ObjectId) else v


PyObjectId = Annotated[Optional[str], BeforeValidator(oid_str)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)
    id: PyObjectId = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls(**doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True)
        data.pop("_id", None)
        return data


# ---- Models ----

class Member(BaseDocument):
    name: str
    role: str = ""
    classification: str = ""
    business: str = ""
    bio: str = ""
    photo_url: str = ""
    joined_year: int = 2025
    paul_harris: bool = False
    past_president: bool = False
    board_member: bool = False
    phone: str = ""
    email: str = ""
    login_password: str = ""
    address: str = ""
    birthday: str = ""
    anniversary: str = ""
    spouse: str = ""
    created_at: str = Field(default_factory=iso_now)


class Meeting(BaseDocument):
    title: str
    date: str
    time: str = ""
    venue: str = ""
    speaker: str = ""
    topic: str = ""
    description: str = ""
    kind: str = "fellowship"


class Project(BaseDocument):
    title: str
    description: str = ""
    caption: str = ""
    category: str = ""
    image_url: str = ""
    status: str = "active"
    volunteers: int = 0
    hours: int = 0
    lives_impacted: int = 0
    date: str = ""


class LoginIn(BaseModel):
    identifier: str
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


# ---- Auth dependencies ----

def get_token_from_request(request: Request) -> Optional[str]:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    return token


def user_public(user: dict) -> dict:
    return {"id": str(user["_id"]), "email": user.get("email", ""),
            "name": user.get("name", ""), "role": user.get("role", "member")}


async def get_current_user(request: Request) -> dict:
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def to_oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")


# ---- Member serialization (privacy gate) ----

PUBLIC_MEMBER_FIELDS = ["name", "role", "classification", "business", "bio",
                        "photo_url", "joined_year", "paul_harris",
                        "past_president", "board_member"]
PRIVATE_MEMBER_FIELDS = ["phone", "email", "address", "birthday",
                         "anniversary", "spouse"]


def member_out(doc: dict, unlocked: bool) -> dict:
    out = {"id": str(doc["_id"]), "locked": not unlocked}
    for f in PUBLIC_MEMBER_FIELDS:
        out[f] = doc.get(f)
    if unlocked:
        for f in PRIVATE_MEMBER_FIELDS:
            out[f] = doc.get(f)
    return out


def doc_out(doc: dict) -> dict:
    return {**{k: v for k, v in doc.items() if k != "_id"}, "id": str(doc["_id"])}


app = FastAPI(title="Rotary Club of Gwalior Innovators")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Rotary Club of Gwalior Innovators API"}


# ---- Auth routes ----

@api_router.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    ident = body.identifier.strip().lower()
    password = body.password
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    client_ip = forwarded or (request.client.host if request.client else "unknown")
    lock_key = f"{client_ip}:{ident}"

    rec = await db.login_attempts.find_one({"identifier": lock_key})
    if rec and rec.get("count", 0) >= 5 and datetime.now(timezone.utc) < rec.get("locked_until", datetime.now(timezone.utc)):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in a few minutes.")

    user = None
    if "@" in ident:
        user = await db.users.find_one({"email": ident})
        if not (user and verify_password(password, user.get("password_hash", ""))):
            user = None
        if not user:
            member = await db.members.find_one({"email": ident})
            if member and member.get("login_password") and password == member["login_password"]:
                await sync_member_user(member.get("name", ""), ident, password)
                user = await db.users.find_one({"email": ident})
    else:
        user = await db.users.find_one({"username": ident})
        if not (user and verify_password(password, user.get("password_hash", ""))):
            user = None

    if not user:
        await db.login_attempts.update_one(
            {"identifier": lock_key},
            {"$inc": {"count": 1},
             "$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True)
        raise HTTPException(status_code=401, detail="Invalid username or password")

    await db.login_attempts.delete_many({"identifier": lock_key})
    uid = str(user["_id"])
    set_auth_cookies(response, create_access_token(uid, user["email"]), create_refresh_token(uid))
    return user_public(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        set_auth_cookies(response, create_access_token(str(user["_id"]), user["email"]),
                         create_refresh_token(str(user["_id"])))
        return {"ok": True}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.post("/auth/change-password")
async def change_password(body: ChangePasswordIn, user: dict = Depends(get_current_user)):
    if len(body.new_password) < 4:
        raise HTTPException(status_code=422, detail="New password must be at least 4 characters")
    if not verify_password(body.current_password, user.get("password_hash", "")):
        ok = False
        if user.get("role") != "admin":
            member = await db.members.find_one({"email": user.get("email", "")})
            if member and member.get("login_password") == body.current_password:
                ok = True
        if not ok:
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"_id": user["_id"]},
                              {"$set": {"password_hash": hash_password(body.new_password)}})
    await db.members.update_one({"email": user.get("email", "")},
                                {"$set": {"login_password": body.new_password}})
    return {"ok": True}


# ---- Member self-service profile ----

MEMBER_SELF_FIELDS = ["name", "photo_url", "classification", "business", "bio",
                      "phone", "address", "birthday", "anniversary", "spouse"]


class MemberSelfIn(BaseModel):
    name: str
    photo_url: str = ""
    classification: str = ""
    business: str = ""
    bio: str = ""
    phone: str = ""
    address: str = ""
    birthday: str = ""
    anniversary: str = ""
    spouse: str = ""


@api_router.get("/profile")
async def get_my_profile(user: dict = Depends(get_current_user)):
    member = await db.members.find_one({"email": user.get("email", "")})
    if not member:
        raise HTTPException(status_code=404, detail="No member profile is linked to this login")
    return member_out(member, True)


@api_router.put("/profile")
async def update_my_profile(body: MemberSelfIn, user: dict = Depends(get_current_user)):
    member = await db.members.find_one({"email": user.get("email", "")})
    if not member:
        raise HTTPException(status_code=404, detail="No member profile is linked to this login")
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="Name is required")
    updates = {f: getattr(body, f).strip() for f in MEMBER_SELF_FIELDS}
    await maybe_release_photo(member.get("photo_url"), updates["photo_url"])
    await db.members.update_one({"_id": member["_id"]}, {"$set": updates})
    if updates["name"] != user.get("name"):
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"name": updates["name"]}})
    doc = await db.members.find_one({"_id": member["_id"]})
    return member_out(doc, True)


# ---- Photo upload & serving ----

@api_router.post("/upload")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if (file.content_type or "") not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=422, detail="Only JPG, PNG or WebP images are allowed")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Image must be under 8 MB")
    try:
        processed = await run_in_threadpool(process_photo, data)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=422, detail="That file could not be read as an image")
    path = f"{APP_NAME}/photos/{str(user['_id'])}/{uuid.uuid4()}.jpg"
    try:
        result = await run_in_threadpool(put_object, path, processed, "image/jpeg")
    except Exception as e:
        logger.error("Storage upload failed: %s", e)
        raise HTTPException(status_code=502, detail="Photo storage is temporarily unavailable, try again shortly")
    await db.files.insert_one({
        "storage_path": result["path"], "uploaded_by": str(user["_id"]),
        "original_filename": file.filename, "content_type": "image/jpeg",
        "size": len(processed), "is_deleted": False, "created_at": iso_now(),
    })
    return {"path": result["path"], "url": f"/api/media/{result['path']}", "size": len(processed)}


@api_router.get("/media/{path:path}")
async def serve_media(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data = await run_in_threadpool(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type="image/jpeg",
                    headers={"Cache-Control": "public, max-age=86400"})


# ---- Members (biodata with privacy gate) ----

@api_router.get("/members")
async def list_members(user: Optional[dict] = Depends(get_optional_user)):
    docs = await db.members.find().sort([("board_member", -1), ("name", 1)]).to_list(500)
    unlocked = user is not None
    return [member_out(d, unlocked) for d in docs]


@api_router.get("/members/{member_id}")
async def get_member(member_id: str, user: Optional[dict] = Depends(get_optional_user)):
    doc = await db.members.find_one({"_id": to_oid(member_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Member not found")
    return member_out(doc, user is not None)


def require_valid_member_email(email: str):
    if not email or "@" not in email or len(email) < 5:
        raise HTTPException(status_code=422,
                            detail="A valid email id is required — it acts as the member's login username")


@api_router.post("/members", dependencies=[Depends(require_admin)])
async def create_member(member: Member):
    require_valid_member_email(member.email)
    if not member.login_password:
        member.login_password = gen_password()
    doc = member.to_mongo()
    res = await db.members.insert_one(doc)
    doc["_id"] = res.inserted_id
    await sync_member_user(member.name, member.email, member.login_password)
    return {**member_out(doc, True), "login_password": member.login_password}


@api_router.put("/members/{member_id}", dependencies=[Depends(require_admin)])
async def update_member(member_id: str, member: Member):
    require_valid_member_email(member.email)
    if not member.login_password:
        member.login_password = gen_password()
    old = await db.members.find_one({"_id": to_oid(member_id)})
    if not old:
        raise HTTPException(status_code=404, detail="Member not found")
    if old.get("email") and old["email"] != member.email:
        await db.users.delete_many({"email": old["email"], "role": {"$ne": "admin"}})
    await maybe_release_photo(old.get("photo_url"), member.photo_url)
    update = member.to_mongo()
    update.pop("created_at", None)
    res = await db.members.find_one_and_update({"_id": to_oid(member_id)},
                                               {"$set": update}, return_document=True)
    await sync_member_user(member.name, member.email, member.login_password)
    return member_out(res, True)


@api_router.get("/members/{member_id}/credentials", dependencies=[Depends(require_admin)])
async def member_credentials(member_id: str):
    doc = await db.members.find_one({"_id": to_oid(member_id)}, {"email": 1, "login_password": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"email": doc.get("email", ""), "login_password": doc.get("login_password", "")}


@api_router.delete("/members/{member_id}", dependencies=[Depends(require_admin)])
async def delete_member(member_id: str):
    doc = await db.members.find_one({"_id": to_oid(member_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Member not found")
    if doc.get("email"):
        await db.users.delete_many({"email": doc["email"], "role": {"$ne": "admin"}})
    await db.members.delete_one({"_id": to_oid(member_id)})
    return {"ok": True}


# ---- Meetings (schedule) ----

@api_router.get("/meetings")
async def list_meetings():
    docs = await db.meetings.find().sort("date", 1).to_list(500)
    return [doc_out(d) for d in docs]


@api_router.post("/meetings", dependencies=[Depends(require_admin)])
async def create_meeting(meeting: Meeting):
    doc = meeting.to_mongo()
    res = await db.meetings.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc_out(doc)


@api_router.put("/meetings/{meeting_id}", dependencies=[Depends(require_admin)])
async def update_meeting(meeting_id: str, meeting: Meeting):
    res = await db.meetings.find_one_and_update({"_id": to_oid(meeting_id)},
                                                {"$set": meeting.to_mongo()}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return doc_out(res)


@api_router.delete("/meetings/{meeting_id}", dependencies=[Depends(require_admin)])
async def delete_meeting(meeting_id: str):
    res = await db.meetings.delete_one({"_id": to_oid(meeting_id)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"ok": True}


# ---- Projects (service work) ----

@api_router.get("/projects")
async def list_projects():
    docs = await db.projects.find().sort("date", -1).to_list(500)
    return [doc_out(d) for d in docs]


@api_router.post("/projects", dependencies=[Depends(require_admin)])
async def create_project(project: Project):
    doc = project.to_mongo()
    res = await db.projects.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc_out(doc)


@api_router.put("/projects/{project_id}", dependencies=[Depends(require_admin)])
async def update_project(project_id: str, project: Project):
    res = await db.projects.find_one_and_update({"_id": to_oid(project_id)},
                                                {"$set": project.to_mongo()}, return_document=True)
    if not res:
        raise HTTPException(status_code=404, detail="Project not found")
    return doc_out(res)


@api_router.delete("/projects/{project_id}", dependencies=[Depends(require_admin)])
async def delete_project(project_id: str):
    res = await db.projects.delete_one({"_id": to_oid(project_id)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


# ---- Gallery (Moments — separate from projects) ----

class GalleryItem(BaseDocument):
    caption: str = ""
    image_url: str = ""
    created_at: str = Field(default_factory=iso_now)


@api_router.get("/gallery")
async def list_gallery():
    docs = await db.gallery.find().sort("created_at", -1).to_list(200)
    return [doc_out(d) for d in docs]


@api_router.post("/gallery", dependencies=[Depends(require_admin)])
async def create_gallery_item(item: GalleryItem):
    if not item.image_url:
        raise HTTPException(status_code=422, detail="Please upload a photo for the gallery item")
    doc = item.to_mongo()
    res = await db.gallery.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc_out(doc)


@api_router.put("/gallery/{item_id}", dependencies=[Depends(require_admin)])
async def update_gallery_item(item_id: str, item: GalleryItem):
    old = await db.gallery.find_one({"_id": to_oid(item_id)})
    if not old:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    await maybe_release_photo(old.get("image_url"), item.image_url)
    update = item.to_mongo()
    update.pop("created_at", None)
    res = await db.gallery.find_one_and_update({"_id": to_oid(item_id)}, {"$set": update}, return_document=True)
    return doc_out(res)


@api_router.delete("/gallery/{item_id}", dependencies=[Depends(require_admin)])
async def delete_gallery_item(item_id: str):
    old = await db.gallery.find_one({"_id": to_oid(item_id)})
    if not old:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    await maybe_release_photo(old.get("image_url"), "")
    await db.gallery.delete_one({"_id": to_oid(item_id)})
    return {"ok": True}


# ---- Admin stats ----

@api_router.get("/admin/stats", dependencies=[Depends(require_admin)])
async def admin_stats():
    return {
        "members": await db.members.count_documents({}),
        "meetings": await db.meetings.count_documents({}),
        "projects": await db.projects.count_documents({}),
        "users": await db.users.count_documents({}),
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Seed data ----

SEED_MEMBERS = [
    {
        "name": "Rtn. Er. Alok Sharma", "role": "Club President (2025-26)",
        "classification": "Civil Engineering", "business": "Sharma Constructions Pvt. Ltd.",
        "photo_url": "https://images.unsplash.com/photo-1771244670407-42e9585ab333?crop=entropy&cs=srgb&fm=jpg&q=85",
        "joined_year": 2015, "paul_harris": True, "past_president": False, "board_member": True,
        "bio": "Chartered civil engineer and third-generation builder, Alok has led the club's flagship 'Schools of Dignity' initiative, retrofitting sanitation blocks in 14 government schools across Gwalior. He believes service works best when it is engineered, measured and finished on time.",
        "phone": "+91 98273 04512", "email": "alok.sharma@rotarygwalior.org",
        "address": "18, Deendayal Nagar, Gwalior 474011", "birthday": "12 March",
        "anniversary": "24 November", "spouse": "R'Ann Priya Sharma",
    },
    {
        "name": "Rtn. Dr. Sunita Raj", "role": "Club Secretary & Medical Lead",
        "classification": "Cardiology", "business": "Gwalior Heart Institute",
        "photo_url": "https://images.unsplash.com/photo-1770627000564-3feb36aecbcd?crop=entropy&cs=srgb&fm=jpg&q=85",
        "joined_year": 2017, "paul_harris": True, "past_president": False, "board_member": True,
        "bio": "Interventional cardiologist and the clinical backbone of our health camps. Dr. Sunita has screened over 9,000 patients through club-run camps and trains our youth volunteers in basic life support every Rotaract season.",
        "phone": "+91 94251 33879", "email": "sunita.raj@rotarygwalior.org",
        "address": "B-24, City Centre, Gwalior 474011", "birthday": "3 July",
        "anniversary": "9 February", "spouse": "Rtn. Dr. Arun Raj",
    },
    {
        "name": "Rtn. Vikrant Agarwal", "role": "Treasurer & Youth Director",
        "classification": "Jewellery Manufacturing", "business": "Agarwal Jewels House",
        "photo_url": "https://images.unsplash.com/photo-1771244678811-50c22f17c791?crop=entropy&cs=srgb&fm=jpg&q=85",
        "joined_year": 2018, "paul_harris": False, "past_president": False, "board_member": True,
        "bio": "Fourth-generation jeweller who keeps the club's books as meticulously polished as his showpieces. Vikrant mentors the Rotaract Club of Gwalior Innovators and runs the annual vocational scholarship drive.",
        "phone": "+91 93021 76640", "email": "vikrant.agarwal@rotarygwalior.org",
        "address": "401, Silver Estate, Thatipur, Gwalior 474011", "birthday": "28 August",
        "anniversary": "15 May", "spouse": "R'Ann Ritika Agarwal",
    },
    {
        "name": "Rtn. Rajesh Soni", "role": "Community Service Chair",
        "classification": "Photography & Media", "business": "Soni Studio & Films",
        "photo_url": "https://images.unsplash.com/photo-1771244688590-1e481dba1b5a?crop=entropy&cs=srgb&fm=jpg&q=85",
        "joined_year": 2019, "paul_harris": False, "past_president": False, "board_member": True,
        "bio": "Award-winning documentary photographer who has documented every club project since 2019. Rajesh's 'Clean Gwalior' photo exhibition raised funds for 300 public dustbins across ward 7.",
        "phone": "+91 98930 21154", "email": "rajesh.soni@rotarygwalior.org",
        "address": "7, Naya Bazaar, Lashkar, Gwalior 474001", "birthday": "17 January",
        "anniversary": "2 December", "spouse": "R'Annette Kavita Soni",
    },
    {
        "name": "Rtn. Adv. Meera Saxena", "role": "Past President (2023-24) & Legal Advisor",
        "classification": "Legal Practice", "business": "Saxena Law Chambers",
        "photo_url": "",
        "joined_year": 2012, "paul_harris": True, "past_president": True, "board_member": True,
        "bio": "Senior advocate at the Gwalior Bench of the High Court. During her presidency the club adopted its first village, Rampur, delivering water, solar streetlights and a legal-aid clinic that still runs every second Saturday.",
        "phone": "+91 94065 88213", "email": "meera.saxena@rotarygwalior.org",
        "address": "22, Malhar Ashram, Ravi Nagar, Gwalior 474002", "birthday": "9 October",
        "anniversary": "30 April", "spouse": "Rtn. Adv. Jatin Saxena",
    },
    {
        "name": "Rtn. Dr. Anil Gupta", "role": "Past President (2021-22) & Youth Exchange Officer",
        "classification": "Orthopaedics", "business": "Gupta Ortho Centre",
        "photo_url": "https://images.unsplash.com/photo-1656221010175-bcfeadcb6017?crop=entropy&cs=srgb&fm=jpg&q=85",
        "joined_year": 2010, "paul_harris": True, "past_president": True, "board_member": False,
        "bio": "Orthopaedic surgeon with a passion for adaptive sports. Dr. Gupta organised the district's first para-athletics meet and performs free joint camps for porters and rickshaw pullers every monsoon.",
        "phone": "+91 94253 00678", "email": "anil.gupta@rotarygwalior.org",
        "address": "Snehlata Centre, Phoolbagh, Gwalior 474001", "birthday": "21 June",
        "anniversary": "11 November", "spouse": "R'Ann Dr. Rekha Gupta",
    },
    {
        "name": "Rtn. Priya Jain", "role": "Youth Service Director",
        "classification": "Software Engineering", "business": "TechNova Solutions",
        "photo_url": "",
        "joined_year": 2021, "paul_harris": False, "past_president": False, "board_member": True,
        "bio": "Engineering lead who digitised the club's member directory and RSVP system. Priya runs 'Code for Gwalior', a weekend bootcamp that has taught 400+ schoolgirls their first line of code.",
        "phone": "+91 96177 45230", "email": "priya.jain@rotarygwalior.org",
        "address": "9, Anand Vihar, Morar, Gwalior 474006", "birthday": "5 February",
        "anniversary": "", "spouse": "",
    },
    {
        "name": "Rtn. Rohit Tomar", "role": "Sergeant-at-Arms",
        "classification": "Hospitality", "business": "Hotel Landmark, Gwalior",
        "photo_url": "https://images.unsplash.com/photo-1656221009909-4f202547cd94?crop=entropy&cs=srgb&fm=jpg&q=85",
        "joined_year": 2020, "paul_harris": False, "past_president": False, "board_member": True,
        "bio": "Hotelier and the warmest bell in town — Rohit hosts our weekly fellowship at Hotel Landmark and personally guarantees no member leaves hungry. He co-chairs the 'Meals of Joy' winter feeding drive.",
        "phone": "+91 97550 98421", "email": "rohit.tomar@rotarygwalior.org",
        "address": "Hotel Landmark, Link Road, Gwalior 474001", "birthday": "14 November",
        "anniversary": "18 June", "spouse": "R'Ann Shalini Tomar",
    },
    {
        "name": "Rtn. Kavita Bhadauria", "role": "Public Image Chair",
        "classification": "Journalism", "business": "Gwalior Samachar (Daily)",
        "photo_url": "",
        "joined_year": 2022, "paul_harris": False, "past_president": False, "board_member": True,
        "bio": "Senior editor who took the club's stories to every doorstep in the district. Kavita's 'Rotary Radio Hour' spotlights a beneficiary each month and doubled our project volunteer sign-ups.",
        "phone": "+91 90090 33512", "email": "kavita.bhadauria@rotarygwalior.org",
        "address": "12, Press Colony, Thatipur, Gwalior 474011", "birthday": "30 September",
        "anniversary": "7 March", "spouse": "Mr. Devendra Bhadauria",
    },
    {
        "name": "Rtn. Sanjay Agnihotri", "role": "Rotary Foundation Chair",
        "classification": "Banking", "business": "Agnihotri Investment Services",
        "photo_url": "https://images.unsplash.com/photo-1656221008183-da235113ca1a?crop=entropy&cs=srgb&fm=jpg&q=85",
        "joined_year": 2013, "paul_harris": True, "past_president": True, "board_member": True,
        "bio": "Financial planner and the club's Foundation evangelist — under his stewardship, 30 members became Paul Harris Fellows and our Global Grant for rural water ATMs cleared district review.",
        "phone": "+91 98260 51473", "email": "sanjay.agnihotri@rotarygwalior.org",
        "address": "503, Ajay Tower, Gandhi Road, Gwalior 474001", "birthday": "1 December",
        "anniversary": "26 January", "spouse": "R'Ann Sunita Agnihotri",
    },
    {
        "name": "Rtn. Neha Kirar", "role": "New Generations Director",
        "classification": "Fashion Design", "business": "Label Neha Kirar",
        "photo_url": "",
        "joined_year": 2023, "paul_harris": False, "past_president": False, "board_member": False,
        "bio": "Designer whose loom-to-livelihood project trains 60 women weavers in Bhitarwar. Neha stages the annual 'Threads of Service' fundraiser show for the club.",
        "phone": "+91 88390 22674", "email": "neha.kirar@rotarygwalior.org",
        "address": "14, Talandi Mohalla, Lashkar, Gwalior 474001", "birthday": "19 May",
        "anniversary": "", "spouse": "",
    },
    {
        "name": "Rtn. Mohd. Arif", "role": "International Service Director",
        "classification": "Export Trading", "business": "Arif Exports LLP",
        "photo_url": "",
        "joined_year": 2016, "paul_harris": False, "past_president": False, "board_member": False,
        "bio": "Trader with friends in fifteen Rotary districts worldwide. Arif brokers our international glove-and-gown donations and hosted the district's first friendship exchange with ROTA clubs.",
        "phone": "+91 93035 64109", "email": "arif@rotarygwalior.org",
        "address": "3, Shahid Nagar, Bada Gaon, Gwalior 474012", "birthday": "23 April",
        "anniversary": "12 October", "spouse": "R'Annette Zoya Arif",
    },
]

SEED_PROJECTS = [
    {
        "title": "Schools of Dignity", "category": "Education & Sanitation", "status": "completed",
        "description": "Retrofitting sanitation blocks and safe drinking-water stations across 14 government schools in Gwalior district, reaching 6,200 students with dignity-first infrastructure and WASH training.",
        "image_url": "https://images.unsplash.com/photo-1569173675610-42c361a86e37?crop=entropy&cs=srgb&fm=jpg&q=85",
        "volunteers": 45, "hours": 640, "lives_impacted": 6200, "date": "2025-08-15",
    },
    {
        "title": "Anaemia-Free Gwalior", "category": "Healthcare", "status": "active",
        "description": "Monthly haemoglobin screening camps for adolescent girls and mothers in Lashkar and Morar, with iron supplementation, nutrition counselling and specialist follow-up led by our medical team.",
        "image_url": "https://images.unsplash.com/photo-1560220604-1985ebfe28b1?crop=entropy&cs=srgb&fm=jpg&q=85",
        "volunteers": 30, "hours": 410, "lives_impacted": 9400, "date": "2025-06-01",
    },
    {
        "title": "Nano Udaan — Girl Child Education", "category": "Literacy", "status": "active",
        "description": "Sponsorships, learning kits and mentoring circles that keep 300 first-generation girls in school. Named for the small steps that lift an entire household.",
        "image_url": "https://images.unsplash.com/photo-1524069290683-0457abfe42c3?crop=entropy&cs=srgb&fm=jpg&q=85",
        "volunteers": 22, "hours": 300, "lives_impacted": 300, "date": "2025-04-10",
    },
    {
        "title": "Heritage City Clean-Up Drive", "category": "Environment", "status": "completed",
        "description": "A ward-by-ward sanitation sprint around Gwalior Fort's approach roads — 12 tonnes of waste cleared, 300 segregating dustbins installed and a citizen wardens' club formed.",
        "image_url": "https://images.unsplash.com/photo-1773846012618-0d05a562d792?crop=entropy&cs=srgb&fm=jpg&q=85",
        "volunteers": 60, "hours": 220, "lives_impacted": 15000, "date": "2025-10-02",
    },
]


def next_dow(weekday: int, weeks: int = 0) -> str:
    today = datetime.now(timezone.utc).date()
    days_ahead = (weekday - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return (today + timedelta(days=days_ahead + weeks * 7)).isoformat()


def seed_meetings():
    return [
        {"title": "Weekly Fellowship Meeting", "date": next_dow(3), "time": "7:00 PM",
         "venue": "Hotel Landmark, Link Road, Gwalior", "kind": "fellowship",
         "speaker": "Rtn. CA Dinesh Mittal", "topic": "GST & the Small Businessman",
         "description": "Regular fellowship, dinner and a talk on what the new tax changes mean for traders and professionals of Gwalior."},
        {"title": "Club Board Meeting", "date": next_dow(0, 1), "time": "6:30 PM",
         "venue": "President's Office, City Centre", "kind": "board",
         "speaker": "Rtn. Er. Alok Sharma", "topic": "Project Reviews & Budget",
         "description": "Review of Anaemia-Free Gwalior camps, Foundation giving and the District Grant pipeline."},
        {"title": "Free Health Screening Camp", "date": next_dow(6), "time": "9:00 AM",
         "venue": "Community Hall, Lashkar", "kind": "project",
         "speaker": "Rtn. Dr. Sunita Raj", "topic": "Anaemia & Cardiac Screening",
         "description": "Full haemoglobin, ECG and physician consultation camp. Volunteers to report at 8:00 AM."},
        {"title": "Club Assembly & Vision Session", "date": next_dow(3, 2), "time": "7:00 PM",
         "venue": "Hotel Landmark, Link Road, Gwalior", "kind": "fellowship",
         "speaker": "Rtn. Adv. Meera Saxena", "topic": "Roadmap 2026-27",
         "description": "Members vote on next year's flagship project and district goals. Attendance counts for 100% Club recognition."},
        {"title": "Festival Fellowship & Family Night", "date": next_dow(5, 2), "time": "7:30 PM",
         "venue": "Taj Usha Kiran Palace Lawns", "kind": "event",
         "speaker": "All Members", "topic": "Anniversary & Birthday Felicitation",
         "description": "Family evening with music, dinner and felicitation of members' anniversaries and birthdays."},
    ]


@app.on_event("startup")
async def seed():
    try:
        if EMERGENT_KEY:
            init_storage()
            logger.info("Object storage initialised")
        else:
            logger.error("EMERGENT_LLM_KEY missing — photo uploads disabled")
    except Exception as e:
        logger.error("Storage init failed: %s", e)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@rotarygwalior.org")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin")
    existing = await db.users.find_one({"$or": [{"email": admin_email}, {"username": "admin"}]})
    if existing is None:
        await db.users.insert_one({"email": admin_email, "username": "admin",
                                   "password_hash": hash_password(admin_password),
                                   "name": "Admin", "role": "admin", "created_at": iso_now()})
        logger.info("Seeded admin user %s", admin_email)

    # one-time cleanup: the old standalone demo user is replaced by Alok's real member login
    await db.users.delete_one({"email": "member@rotarygwalior.org", "role": {"$ne": "admin"},
                               "name": "Rtn. Er. Alok Sharma"})

    if await db.members.count_documents({}) == 0:
        await db.members.insert_many([dict(m, created_at=iso_now()) for m in SEED_MEMBERS])
        logger.info("Seeded %d members", len(SEED_MEMBERS))

    if await db.meetings.count_documents({}) == 0:
        await db.meetings.insert_many(seed_meetings())
        logger.info("Seeded meetings")

    if await db.projects.count_documents({}) == 0:
        await db.projects.insert_many(SEED_PROJECTS)
        logger.info("Seeded projects")

    # one-time migration: admin signs in with username 'admin' / password 'admin'
    admin = await db.users.find_one({"$or": [{"email": admin_email}, {"username": "admin"}]})
    if admin:
        updates = {}
        if not admin.get("username"):
            updates["username"] = "admin"
        if verify_password("admin123", admin.get("password_hash", "")):
            updates["password_hash"] = hash_password("admin")
        if updates:
            await db.users.update_one({"_id": admin["_id"]}, {"$set": updates})
            logger.info("Migrated admin login to username 'admin'")

    # every member with an email gets a login account whose password the admin can view
    # (blank login_passwords get generated once; admin/member-changed passwords are never touched)
    async for m in db.members.find({"email": {"$exists": True, "$ne": ""}}):
        pwd = m.get("login_password") or gen_password()
        if not m.get("login_password"):
            await db.members.update_one({"_id": m["_id"]}, {"$set": {"login_password": pwd}})
        await sync_member_user(m.get("name", ""), m["email"], pwd)

    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

from fastapi import FastAPI, APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import io
import re
import pandas as pd
from pypdf import PdfReader


ROOT_DIR = Path(__file__).parent
STATIC_DIR = ROOT_DIR / "static"
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Rex-Doom Tracker")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() == "true"


class LoginInput(BaseModel):
    username: str
    password: str


class CallerCreate(BaseModel):
    username: str
    password: str
    name: str


class CallerUpdate(BaseModel):
    name: str


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    interest: Optional[str] = None
    interest_type: Optional[str] = None
    comment: Optional[str] = None


def now():
    return datetime.now(timezone.utc).isoformat()


def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode(), hashed.encode())


def token_for(user):
    return jwt.encode(
        {
            "sub": user["id"],
            "role": user["role"],
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
        },
        os.environ["JWT_SECRET"],
        algorithm=JWT_ALGORITHM,
    )


async def current_user(request: Request):
    token = request.cookies.get("access_token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except (jwt.InvalidTokenError, KeyError):
        raise HTTPException(401, "Invalid or expired session")


async def admin_only(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
    return user


def public_user(user):
    return {"id": user["id"], "username": user["username"], "name": user["name"], "role": user["role"]}


@api_router.get("/")
async def root():
    return {"message": "Rex-Doom Tracker API"}


@api_router.post("/auth/login")
async def login(data: LoginInput, response: Response):
    user = await db.users.find_one({"username": data.username.lower()}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect username or password")
    response.set_cookie(
        "access_token",
        token_for(user),
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="none" if COOKIE_SECURE else "lax",
        max_age=86400,
    )
    return public_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user=Depends(current_user)):
    return public_user(user)


@api_router.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    query = {} if user["role"] == "admin" else {"assigned_to": user["id"]}
    leads = await db.leads.find(query, {"_id": 0}).to_list(5000)
    statuses = {s: sum(1 for l in leads if l.get("status") == s) for s in ["not_dialed", "dialed", "hot", "cold", "did_not_pick", "invalid"]}
    callers = await db.users.find({"role": "caller"}, {"_id": 0, "password_hash": 0}).to_list(500)
    performance = []
    for caller in callers:
        mine = await db.leads.find({"assigned_to": caller["id"]}, {"_id": 0}).to_list(5000)
        performance.append(
            {
                "id": caller["id"],
                "name": caller["name"],
                "username": caller["username"],
                "total": len(mine),
                "dialed": sum(l.get("status") != "not_dialed" for l in mine),
                "hot": sum(l.get("status") == "hot" for l in mine),
                "cold": sum(l.get("status") == "cold" for l in mine),
                "did_not_pick": sum(l.get("status") == "did_not_pick" for l in mine),
            }
        )
    return {
        "total": len(leads),
        "dialed": sum(l.get("status") != "not_dialed" for l in leads),
        "statuses": statuses,
        "performance": performance,
        "leads": leads if user["role"] == "admin" else [],
    }


@api_router.get("/leads")
async def get_leads(user=Depends(current_user)):
    query = {} if user["role"] == "admin" else {"assigned_to": user["id"]}
    leads = await db.leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(5000)
    if user["role"] == "caller":
        for lead in leads:
            lead.pop("phone", None)
    return leads


@api_router.post("/leads/{lead_id}/reveal")
async def reveal_phone(lead_id: str, user=Depends(current_user)):
    query = {"id": lead_id} if user["role"] == "admin" else {"id": lead_id, "assigned_to": user["id"]}
    lead = await db.leads.find_one(query, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")
    await db.leads.update_one({"id": lead_id}, {"$set": {"revealed_at": now(), "updated_at": now()}})
    return {"phone": lead.get("phone", "")}


@api_router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, data: LeadUpdate, user=Depends(current_user)):
    query = {"id": lead_id} if user["role"] == "admin" else {"id": lead_id, "assigned_to": user["id"]}
    lead = await db.leads.find_one(query, {"_id": 0})
    if not lead:
        raise HTTPException(404, "Lead not found")
    changes = {k: v for k, v in data.model_dump().items() if v is not None}
    changes.update({"updated_at": now(), "last_action_by": user["id"]})
    if data.status and data.status != "not_dialed":
        changes["dialed_at"] = lead.get("dialed_at") or now()
    await db.leads.update_one({"id": lead_id}, {"$set": changes})
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if user["role"] == "caller":
        updated.pop("phone", None)
    return updated


@api_router.get("/callers")
async def get_callers(user=Depends(admin_only)):
    return await db.users.find({"role": "caller"}, {"_id": 0, "password_hash": 0}).sort("name", 1).to_list(500)


@api_router.post("/callers")
async def create_caller(data: CallerCreate, user=Depends(admin_only)):
    username = data.username.lower().strip()
    if await db.users.find_one({"username": username}):
        raise HTTPException(409, "Username already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "name": data.name.strip(),
        "password_hash": hash_password(data.password),
        "role": "caller",
        "created_at": now(),
    }
    await db.users.insert_one(doc)
    return public_user(doc)


@api_router.patch("/callers/{caller_id}")
async def edit_caller(caller_id: str, data: CallerUpdate, user=Depends(admin_only)):
    await db.users.update_one({"id": caller_id, "role": "caller"}, {"$set": {"name": data.name.strip()}})
    return await db.users.find_one({"id": caller_id}, {"_id": 0, "password_hash": 0})


@api_router.post("/callers/assign-all")
async def assign_all(user=Depends(admin_only)):
    callers = await db.users.find({"role": "caller"}, {"_id": 0, "id": 1}).to_list(500)
    leads = await db.leads.find({"assigned_to": None}, {"_id": 0, "id": 1}).to_list(5000)
    for index, lead in enumerate(leads):
        if callers:
            await db.leads.update_one(
                {"id": lead["id"]},
                {"$set": {"assigned_to": callers[index % len(callers)]["id"], "updated_at": now()}},
            )
    return {"assigned": len(leads)}


@api_router.post("/imports")
async def import_leads(file: UploadFile = File(...), user=Depends(admin_only)):
    content = await file.read()
    filename = (file.filename or "").lower()
    rows = []
    if filename.endswith((".xlsx", ".xls")):
        frame = pd.read_excel(io.BytesIO(content)).fillna("")
        for _, row in frame.iterrows():
            values = {str(k).lower().strip(): str(v).strip() for k, v in row.to_dict().items()}
            client = values.get("client_name") or values.get("name") or values.get("client")
            phone = values.get("phone") or values.get("phone_number") or values.get("mobile")
            if client or phone:
                rows.append((client or "Unnamed client", phone or ""))
    elif filename.endswith(".pdf"):
        try:
            text = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(content)).pages)
        except Exception as exc:
            logger.warning("PDF import rejected: %s", exc)
            raise HTTPException(400, "This PDF could not be read. Upload a valid text-based PDF.")
        for line in text.splitlines():
            match = re.search(r"(.*?)(\+?\d[\d\s().-]{7,}\d)", line)
            if match:
                rows.append((match.group(1).strip(" ,-:") or "Unnamed client", re.sub(r"\D", "", match.group(2))))
    else:
        raise HTTPException(400, "Upload an Excel or PDF file")
    if not rows:
        raise HTTPException(400, "No client names and phone numbers could be read")
    existing = {l.get("phone") for l in await db.leads.find({}, {"_id": 0, "phone": 1}).to_list(10000)}
    inserted = 0
    for client, phone in rows:
        if phone in existing:
            continue
        await db.leads.insert_one(
            {
                "id": str(uuid.uuid4()),
                "client_name": client,
                "phone": phone,
                "status": "not_dialed",
                "interest": "unmarked",
                "interest_type": "unmarked",
                "comment": "",
                "assigned_to": None,
                "created_at": now(),
                "updated_at": now(),
            }
        )
        inserted += 1
    return {"inserted": inserted, "skipped": len(rows) - inserted}


@api_router.get("/exports/leads")
async def export_leads(user=Depends(admin_only)):
    leads = await db.leads.find({}, {"_id": 0}).to_list(10000)
    frame = pd.DataFrame(leads)
    output = io.BytesIO()
    frame.to_excel(output, index=False)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=rex-doom-leads.xlsx"},
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(404)
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


@app.on_event("startup")
async def startup():
    await db.users.create_index("username", unique=True)
    await db.leads.create_index("assigned_to")
    username, password = os.environ["ADMIN_USERNAME"].lower(), os.environ["ADMIN_PASSWORD"]
    if not await db.users.find_one({"username": username}):
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "username": username,
                "name": "Rex-Doom Admin",
                "password_hash": hash_password(password),
                "role": "admin",
                "created_at": now(),
            }
        )

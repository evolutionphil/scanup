from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from passlib.context import CryptContext
from jose import jwt, JWTError
import base64
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ.get("JWT_SECRET", "your-super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    subscription_type: str = "free"  # free, premium
    subscription_expires_at: Optional[datetime] = None
    ocr_usage_today: int = 0
    ocr_usage_date: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    subscription_type: str
    is_premium: bool
    ocr_remaining_today: int

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

# Document Models
class PageData(BaseModel):
    page_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_base64: str
    thumbnail_base64: Optional[str] = None
    ocr_text: Optional[str] = None
    filter_applied: str = "original"  # original, grayscale, bw, enhanced
    rotation: int = 0
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DocumentCreate(BaseModel):
    name: str
    folder_id: Optional[str] = None
    tags: List[str] = []
    pages: List[PageData] = []

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[str] = None
    tags: Optional[List[str]] = None
    pages: Optional[List[PageData]] = None
    is_password_protected: Optional[bool] = None
    password_hash: Optional[str] = None

class Document(BaseModel):
    document_id: str
    user_id: str
    name: str
    folder_id: Optional[str] = None
    tags: List[str] = []
    pages: List[PageData] = []
    ocr_full_text: Optional[str] = None
    is_password_protected: bool = False
    created_at: datetime
    updated_at: datetime

# Folder Models
class FolderCreate(BaseModel):
    name: str
    color: str = "#3B82F6"
    parent_id: Optional[str] = None

class Folder(BaseModel):
    folder_id: str
    user_id: str
    name: str
    color: str
    parent_id: Optional[str] = None
    created_at: datetime

# OCR Models
class OCRRequest(BaseModel):
    image_base64: str
    language: str = "en"

class OCRResponse(BaseModel):
    text: str
    confidence: Optional[float] = None

# Image Processing Models
class ImageProcessRequest(BaseModel):
    image_base64: str
    operation: str  # crop, rotate, filter
    params: Dict[str, Any] = {}

class ImageProcessResponse(BaseModel):
    processed_image_base64: str

# Subscription Models
class SubscriptionUpdate(BaseModel):
    subscription_type: str  # free, premium
    duration_days: Optional[int] = 30

# Session Models for OAuth
class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        "sub": user_id,
        "exp": expiration,
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

async def get_current_user(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> User:
    token = None
    
    # Check Authorization header first
    if credentials:
        token = credentials.credentials
    
    # Check cookies as fallback
    if not token:
        token = request.cookies.get("session_token")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # First try JWT token
    user_id = decode_jwt_token(token)
    
    if user_id:
        user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if user_doc:
            return User(**user_doc)
    
    # Then try session token (OAuth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user_doc:
                    return User(**user_doc)
    
    raise HTTPException(status_code=401, detail="Invalid or expired token")

def user_to_response(user: User) -> UserResponse:
    is_premium = user.subscription_type == "premium"
    if user.subscription_expires_at:
        expires_at = user.subscription_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        is_premium = is_premium and expires_at > datetime.now(timezone.utc)
    
    # Calculate OCR remaining
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    ocr_remaining = 5  # Free users get 5 OCR per day
    if is_premium:
        ocr_remaining = 9999  # Unlimited for premium
    elif user.ocr_usage_date == today:
        ocr_remaining = max(0, 5 - user.ocr_usage_today)
    
    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        subscription_type=user.subscription_type,
        is_premium=is_premium,
        ocr_remaining_today=ocr_remaining
    )

def create_thumbnail(image_base64: str, max_size: int = 200) -> str:
    """Create a thumbnail from base64 image"""
    try:
        # Decode base64
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data))
        
        # Create thumbnail
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert back to base64
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=70)
        return base64.b64encode(buffer.getvalue()).decode()
    except Exception as e:
        logger.error(f"Error creating thumbnail: {e}")
        return image_base64

def apply_image_filter(image_base64: str, filter_type: str) -> str:
    """Apply filter to image"""
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data))
        
        if filter_type == "grayscale":
            image = image.convert("L").convert("RGB")
        elif filter_type == "bw":
            image = image.convert("L")
            image = image.point(lambda x: 0 if x < 128 else 255, '1')
            image = image.convert("RGB")
        elif filter_type == "enhanced":
            # Enhance contrast and sharpness
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.3)
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.5)
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.1)
        elif filter_type == "document":
            # Document mode - high contrast, sharpen
            image = image.convert("L")  # Grayscale
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            image = image.filter(ImageFilter.SHARPEN)
            image = image.convert("RGB")
        
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        return base64.b64encode(buffer.getvalue()).decode()
    except Exception as e:
        logger.error(f"Error applying filter: {e}")
        return image_base64

def rotate_image(image_base64: str, degrees: int) -> str:
    """Rotate image by degrees"""
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data))
        
        # Rotate image (negative because PIL rotates counter-clockwise)
        image = image.rotate(-degrees, expand=True, fillcolor='white')
        
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        return base64.b64encode(buffer.getvalue()).decode()
    except Exception as e:
        logger.error(f"Error rotating image: {e}")
        return image_base64

def crop_image(image_base64: str, x: int, y: int, width: int, height: int) -> str:
    """Crop image"""
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data))
        
        # Crop image
        image = image.crop((x, y, x + width, y + height))
        
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        return base64.b64encode(buffer.getvalue()).decode()
    except Exception as e:
        logger.error(f"Error cropping image: {e}")
        return image_base64

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate, response: Response):
    """Register a new user with email/password"""
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "picture": None,
        "subscription_type": "free",
        "subscription_expires_at": None,
        "ocr_usage_today": 0,
        "ocr_usage_date": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    return AuthResponse(user=user_to_response(user), token=token)

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin, response: Response):
    """Login with email/password"""
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(credentials.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_jwt_token(user_doc["user_id"])
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    return AuthResponse(user=user_to_response(user), token=token)

@api_router.post("/auth/google/callback")
async def google_oauth_callback(request: Request, response: Response):
    """Process Google OAuth session_id from Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id for user data
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            user_data = resp.json()
        except Exception as e:
            logger.error(f"OAuth error: {e}")
            raise HTTPException(status_code=500, detail="OAuth service error")
    
    # Check if user exists
    existing = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing:
        user_id = existing["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "subscription_type": "free",
            "subscription_expires_at": None,
            "ocr_usage_today": 0,
            "ocr_usage_date": None,
            "created_at": now,
            "updated_at": now
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = user_data.get("session_token", str(uuid.uuid4()))
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    
    return {"user": user_to_response(user), "token": session_token}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return user_to_response(current_user)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== USER ENDPOINTS ====================

@api_router.put("/users/subscription", response_model=UserResponse)
async def update_subscription(
    subscription: SubscriptionUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user subscription (mock implementation)"""
    expires_at = None
    if subscription.subscription_type == "premium":
        expires_at = datetime.now(timezone.utc) + timedelta(days=subscription.duration_days or 30)
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {
            "subscription_type": subscription.subscription_type,
            "subscription_expires_at": expires_at,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    return user_to_response(user)

@api_router.put("/users/profile", response_model=UserResponse)
async def update_profile(
    name: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    update_data = {"updated_at": datetime.now(timezone.utc)}
    if name:
        update_data["name"] = name
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": update_data}
    )
    
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    return user_to_response(user)

# ==================== DOCUMENT ENDPOINTS ====================

@api_router.post("/documents", response_model=Document)
async def create_document(
    doc_data: DocumentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new document"""
    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    # Process pages - create thumbnails
    processed_pages = []
    for i, page in enumerate(doc_data.pages):
        page_dict = page.dict()
        page_dict["order"] = i
        page_dict["thumbnail_base64"] = create_thumbnail(page.image_base64)
        processed_pages.append(page_dict)
    
    document = {
        "document_id": document_id,
        "user_id": current_user.user_id,
        "name": doc_data.name,
        "folder_id": doc_data.folder_id,
        "tags": doc_data.tags,
        "pages": processed_pages,
        "ocr_full_text": None,
        "is_password_protected": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.documents.insert_one(document)
    
    # Remove _id before returning
    document.pop("_id", None)
    return Document(**document)

@api_router.get("/documents", response_model=List[Document])
async def get_documents(
    folder_id: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all documents for current user"""
    query = {"user_id": current_user.user_id}
    
    if folder_id:
        query["folder_id"] = folder_id
    
    if tag:
        query["tags"] = tag
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"ocr_full_text": {"$regex": search, "$options": "i"}}
        ]
    
    documents = await db.documents.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return [Document(**doc) for doc in documents]

@api_router.get("/documents/{document_id}", response_model=Document)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific document"""
    document = await db.documents.find_one(
        {"document_id": document_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return Document(**document)

@api_router.put("/documents/{document_id}", response_model=Document)
async def update_document(
    document_id: str,
    doc_update: DocumentUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a document"""
    document = await db.documents.find_one(
        {"document_id": document_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    
    if doc_update.name is not None:
        update_data["name"] = doc_update.name
    if doc_update.folder_id is not None:
        update_data["folder_id"] = doc_update.folder_id
    if doc_update.tags is not None:
        update_data["tags"] = doc_update.tags
    if doc_update.pages is not None:
        processed_pages = []
        for i, page in enumerate(doc_update.pages):
            page_dict = page.dict()
            page_dict["order"] = i
            if not page_dict.get("thumbnail_base64"):
                page_dict["thumbnail_base64"] = create_thumbnail(page.image_base64)
            processed_pages.append(page_dict)
        update_data["pages"] = processed_pages
    if doc_update.is_password_protected is not None:
        update_data["is_password_protected"] = doc_update.is_password_protected
    if doc_update.password_hash is not None:
        update_data["password_hash"] = hash_password(doc_update.password_hash)
    
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": update_data}
    )
    
    updated_doc = await db.documents.find_one({"document_id": document_id}, {"_id": 0})
    return Document(**updated_doc)

@api_router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a document"""
    result = await db.documents.delete_one(
        {"document_id": document_id, "user_id": current_user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}

@api_router.post("/documents/{document_id}/pages", response_model=Document)
async def add_page_to_document(
    document_id: str,
    page: PageData,
    current_user: User = Depends(get_current_user)
):
    """Add a page to an existing document"""
    document = await db.documents.find_one(
        {"document_id": document_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    page_dict = page.dict()
    page_dict["order"] = len(document.get("pages", []))
    page_dict["thumbnail_base64"] = create_thumbnail(page.image_base64)
    
    await db.documents.update_one(
        {"document_id": document_id},
        {
            "$push": {"pages": page_dict},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    updated_doc = await db.documents.find_one({"document_id": document_id}, {"_id": 0})
    return Document(**updated_doc)

# ==================== FOLDER ENDPOINTS ====================

@api_router.post("/folders", response_model=Folder)
async def create_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new folder"""
    folder_id = f"folder_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    folder = {
        "folder_id": folder_id,
        "user_id": current_user.user_id,
        "name": folder_data.name,
        "color": folder_data.color,
        "parent_id": folder_data.parent_id,
        "created_at": now
    }
    
    await db.folders.insert_one(folder)
    folder.pop("_id", None)
    return Folder(**folder)

@api_router.get("/folders", response_model=List[Folder])
async def get_folders(current_user: User = Depends(get_current_user)):
    """Get all folders for current user"""
    folders = await db.folders.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).to_list(1000)
    return [Folder(**f) for f in folders]

@api_router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a folder"""
    result = await db.folders.delete_one(
        {"folder_id": folder_id, "user_id": current_user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Move documents to root
    await db.documents.update_many(
        {"folder_id": folder_id, "user_id": current_user.user_id},
        {"$set": {"folder_id": None}}
    )
    
    return {"message": "Folder deleted successfully"}

# ==================== IMAGE PROCESSING ENDPOINTS ====================

@api_router.post("/images/process", response_model=ImageProcessResponse)
async def process_image(
    request: ImageProcessRequest,
    current_user: User = Depends(get_current_user)
):
    """Process an image (crop, rotate, filter)"""
    result = request.image_base64
    
    if request.operation == "filter":
        filter_type = request.params.get("type", "original")
        result = apply_image_filter(result, filter_type)
    elif request.operation == "rotate":
        degrees = request.params.get("degrees", 90)
        result = rotate_image(result, degrees)
    elif request.operation == "crop":
        x = request.params.get("x", 0)
        y = request.params.get("y", 0)
        width = request.params.get("width", 100)
        height = request.params.get("height", 100)
        result = crop_image(result, x, y, width, height)
    
    return ImageProcessResponse(processed_image_base64=result)

# ==================== OCR ENDPOINTS ====================

@api_router.post("/ocr/extract", response_model=OCRResponse)
async def extract_text(
    ocr_request: OCRRequest,
    current_user: User = Depends(get_current_user)
):
    """Extract text from image using OCR (mock implementation - real OCR on device)"""
    # Check OCR usage limits for free users
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    is_premium = current_user.subscription_type == "premium"
    
    if not is_premium:
        if current_user.ocr_usage_date == today and current_user.ocr_usage_today >= 5:
            raise HTTPException(
                status_code=429,
                detail="Daily OCR limit reached. Upgrade to Premium for unlimited OCR."
            )
    
    # Update OCR usage
    if current_user.ocr_usage_date == today:
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$inc": {"ocr_usage_today": 1}}
        )
    else:
        await db.users.update_one(
            {"user_id": current_user.user_id},
            {"$set": {"ocr_usage_today": 1, "ocr_usage_date": today}}
        )
    
    # Note: Actual OCR happens on device using ML Kit
    # This endpoint just tracks usage and validates permissions
    # Return a placeholder - actual text extraction happens client-side
    return OCRResponse(
        text="OCR performed on device",
        confidence=0.95
    )

@api_router.post("/documents/{document_id}/ocr")
async def run_document_ocr(
    document_id: str,
    ocr_text: str,
    page_index: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Save OCR text for a document page (text extracted on device)"""
    document = await db.documents.find_one(
        {"document_id": document_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    pages = document.get("pages", [])
    if page_index >= len(pages):
        raise HTTPException(status_code=400, detail="Invalid page index")
    
    # Update page OCR text
    pages[page_index]["ocr_text"] = ocr_text
    
    # Update full document OCR text
    full_text = " ".join([p.get("ocr_text", "") for p in pages if p.get("ocr_text")])
    
    await db.documents.update_one(
        {"document_id": document_id},
        {"$set": {
            "pages": pages,
            "ocr_full_text": full_text,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "OCR text saved successfully", "full_text": full_text}

# ==================== BASIC ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Document Scanner API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

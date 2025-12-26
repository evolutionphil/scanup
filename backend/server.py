from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Tuple
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from passlib.context import CryptContext
from jose import jwt, JWTError
import base64
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
import re
import cv2
import numpy as np
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import boto3
from botocore.exceptions import ClientError
import certifi

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with SSL certificate for Atlas
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where() if 'mongodb+srv' in mongo_url else None)
db = client[os.environ['DB_NAME']]

# Emergent LLM key for OCR
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_S3_BUCKET_NAME = os.environ.get("AWS_S3_BUCKET_NAME", "scanup-documents")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# S3 client will be initialized after logger
s3_client = None

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

# Initialize S3 client after logger is configured
if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )
    logger.info(f"✅ AWS S3 initialized: bucket={AWS_S3_BUCKET_NAME}, region={AWS_REGION}")
else:
    logger.warning("⚠️ AWS S3 not configured - images will be stored in MongoDB")

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
    subscription_type: str = "free"  # free, premium, trial
    subscription_expires_at: Optional[datetime] = None
    ocr_usage_today: int = 0
    ocr_usage_date: Optional[str] = None
    # Scan limits
    scans_today: int = 0
    scans_this_month: int = 0
    last_scan_date: Optional[str] = None
    scan_month: Optional[str] = None  # Format: "2025-01"
    # Trial period
    trial_start_date: Optional[datetime] = None
    trial_used: bool = False
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None

# Free tier limits
FREE_SCANS_PER_DAY = 10
FREE_SCANS_PER_MONTH = 100
FREE_OCR_PER_DAY = 3
TRIAL_DURATION_DAYS = 7

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    subscription_type: str
    is_premium: bool
    is_trial: bool = False
    trial_days_remaining: int = 0
    ocr_remaining_today: int
    scans_remaining_today: int
    scans_remaining_month: int

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

# Document Models
class PageData(BaseModel):
    page_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    image_base64: Optional[str] = None  # Base64 image (MongoDB storage)
    image_url: Optional[str] = None      # S3 URL (cloud storage)
    thumbnail_base64: Optional[str] = None
    thumbnail_url: Optional[str] = None  # S3 thumbnail URL
    original_image_base64: Optional[str] = None  # For non-destructive editing
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
    storage_type: Optional[str] = None  # 's3' or 'mongodb'
    has_watermark: Optional[bool] = None
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
    is_protected: bool = False
    password_hash: Optional[str] = None
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
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Check if user is in trial period
    is_trial = False
    trial_days_remaining = 0
    if user.subscription_type == "trial" and user.trial_start_date:
        trial_end = user.trial_start_date + timedelta(days=TRIAL_DURATION_DAYS)
        if trial_end.tzinfo is None:
            trial_end = trial_end.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < trial_end:
            is_trial = True
            trial_days_remaining = (trial_end - datetime.now(timezone.utc)).days
    
    # Check premium status
    is_premium = user.subscription_type == "premium" or is_trial
    if user.subscription_expires_at and user.subscription_type == "premium":
        expires_at = user.subscription_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        is_premium = expires_at > datetime.now(timezone.utc)
    
    # Calculate OCR remaining
    ocr_remaining = FREE_OCR_PER_DAY
    if is_premium:
        ocr_remaining = 9999  # Unlimited for premium
    elif user.ocr_usage_date == today:
        ocr_remaining = max(0, FREE_OCR_PER_DAY - user.ocr_usage_today)
    
    # Calculate scans remaining today
    scans_today = 0
    if user.last_scan_date == today:
        scans_today = user.scans_today
    scans_remaining_today = FREE_SCANS_PER_DAY - scans_today if not is_premium else 9999
    
    # Calculate scans remaining this month
    scans_month = 0
    if user.scan_month == current_month:
        scans_month = user.scans_this_month
    scans_remaining_month = FREE_SCANS_PER_MONTH - scans_month if not is_premium else 9999
    
    return UserResponse(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        subscription_type=user.subscription_type,
        is_premium=is_premium,
        is_trial=is_trial,
        trial_days_remaining=trial_days_remaining,
        ocr_remaining_today=ocr_remaining,
        scans_remaining_today=max(0, scans_remaining_today),
        scans_remaining_month=max(0, scans_remaining_month)
    )

def add_watermark(image_base64: str, watermark_text: str = "ScanUp") -> str:
    """Add watermark to image for free users"""
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data)).convert('RGBA')
        
        # Create watermark layer
        watermark = Image.new('RGBA', image.size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(watermark)
        
        # Calculate font size based on image size (larger for visibility)
        font_size = max(30, min(image.width, image.height) // 15)
        
        # Try to use a built-in font, fallback to default
        try:
            from PIL import ImageFont
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        # Get text size
        text = watermark_text
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Position: bottom right with padding
        padding = 30
        x = image.width - text_width - padding
        y = image.height - text_height - padding
        
        # Draw shadow/outline first for visibility on any background
        shadow_offset = 2
        draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=(0, 0, 0, 120))
        
        # Draw main watermark text (more visible: opacity 180/255 ≈ 70%)
        draw.text((x, y), text, font=font, fill=(100, 100, 100, 180))
        
        # Composite
        watermarked = Image.alpha_composite(image, watermark)
        
        # Convert to RGB for JPEG
        if watermarked.mode == 'RGBA':
            background = Image.new('RGB', watermarked.size, (255, 255, 255))
            background.paste(watermarked, mask=watermarked.split()[3])
            watermarked = background
        
        # Encode
        buffer = BytesIO()
        watermarked.save(buffer, format='JPEG', quality=95)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        logger.error(f"Watermark error: {str(e)}")
        return image_base64  # Return original if watermarking fails

# ==================== AWS S3 FUNCTIONS ====================

def upload_to_s3(image_base64: str, user_id: str, document_id: str, page_id: str, image_type: str = "page") -> Optional[str]:
    """
    Upload image to S3 and return the URL.
    
    Args:
        image_base64: Base64 encoded image
        user_id: User ID
        document_id: Document ID
        page_id: Page ID
        image_type: "page" or "thumbnail"
    
    Returns:
        S3 URL or None if upload fails
    """
    if not s3_client:
        logger.warning("S3 not configured, returning None")
        return None
    
    try:
        # Clean base64 string
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        # Decode image
        image_data = base64.b64decode(image_base64)
        
        # Generate S3 key
        s3_key = f"users/{user_id}/documents/{document_id}/{image_type}_{page_id}.jpg"
        
        # Upload to S3
        s3_client.put_object(
            Bucket=AWS_S3_BUCKET_NAME,
            Key=s3_key,
            Body=image_data,
            ContentType='image/jpeg'
        )
        
        # Generate URL
        s3_url = f"https://{AWS_S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        logger.info(f"✅ Uploaded to S3: {s3_key}")
        
        return s3_url
    except ClientError as e:
        logger.error(f"❌ S3 upload error: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ S3 upload error: {e}")
        return None


def delete_from_s3(user_id: str, document_id: str, page_id: Optional[str] = None) -> bool:
    """
    Delete image(s) from S3.
    
    Args:
        user_id: User ID
        document_id: Document ID
        page_id: Page ID (if None, deletes all pages for document)
    
    Returns:
        True if successful
    """
    if not s3_client:
        return False
    
    try:
        if page_id:
            # Delete specific page
            s3_key = f"users/{user_id}/documents/{document_id}/page_{page_id}.jpg"
            s3_client.delete_object(Bucket=AWS_S3_BUCKET_NAME, Key=s3_key)
            # Also delete thumbnail
            thumb_key = f"users/{user_id}/documents/{document_id}/thumbnail_{page_id}.jpg"
            s3_client.delete_object(Bucket=AWS_S3_BUCKET_NAME, Key=thumb_key)
        else:
            # Delete all objects for document
            prefix = f"users/{user_id}/documents/{document_id}/"
            response = s3_client.list_objects_v2(Bucket=AWS_S3_BUCKET_NAME, Prefix=prefix)
            
            if 'Contents' in response:
                for obj in response['Contents']:
                    s3_client.delete_object(Bucket=AWS_S3_BUCKET_NAME, Key=obj['Key'])
        
        logger.info(f"✅ Deleted from S3: {user_id}/{document_id}/{page_id or 'all'}")
        return True
    except Exception as e:
        logger.error(f"❌ S3 delete error: {e}")
        return False


def create_thumbnail(image_base64: str, max_size: int = 300) -> str:
    """Create a thumbnail from image base64"""
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        img = Image.open(BytesIO(image_data))
        
        # Calculate thumbnail size maintaining aspect ratio
        ratio = min(max_size / img.width, max_size / img.height)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        
        img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to RGB if necessary
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=70)
        return base64.b64encode(buffer.getvalue()).decode()
    except Exception as e:
        logger.error(f"Thumbnail creation error: {e}")
        return image_base64[:1000]  # Return truncated original as fallback


async def check_scan_limits(user: User) -> Tuple[bool, str]:
    """Check if user can scan. Returns (can_scan, message)"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Premium users have no limits
    is_premium = user.subscription_type in ["premium", "trial"]
    if is_premium:
        if user.subscription_type == "trial" and user.trial_start_date:
            trial_end = user.trial_start_date + timedelta(days=TRIAL_DURATION_DAYS)
            if datetime.now(timezone.utc) >= trial_end.replace(tzinfo=timezone.utc):
                is_premium = False
    
    if is_premium:
        return True, ""
    
    # Check daily limit
    scans_today = user.scans_today if user.last_scan_date == today else 0
    if scans_today >= FREE_SCANS_PER_DAY:
        return False, f"Daily scan limit reached ({FREE_SCANS_PER_DAY} scans/day). Upgrade to Premium for unlimited scans."
    
    # Check monthly limit
    scans_month = user.scans_this_month if user.scan_month == current_month else 0
    if scans_month >= FREE_SCANS_PER_MONTH:
        return False, f"Monthly scan limit reached ({FREE_SCANS_PER_MONTH} scans/month). Upgrade to Premium for unlimited scans."
    
    return True, ""

async def increment_scan_count(user_id: str):
    """Increment user's scan count"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return
    
    # Reset daily count if new day
    scans_today = user.get("scans_today", 0)
    if user.get("last_scan_date") != today:
        scans_today = 0
    
    # Reset monthly count if new month
    scans_month = user.get("scans_this_month", 0)
    if user.get("scan_month") != current_month:
        scans_month = 0
    
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "scans_today": scans_today + 1,
                "last_scan_date": today,
                "scans_this_month": scans_month + 1,
                "scan_month": current_month,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

def create_thumbnail(image_base64: str, max_size: int = 200) -> str:
    """Create a thumbnail from base64 image"""
    try:
        # Decode base64
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data))
        
        # Convert RGBA to RGB if needed
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3])
            image = background
        
        # Create thumbnail
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Convert back to base64
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=70)
        return base64.b64encode(buffer.getvalue()).decode()
    except Exception as e:
        logger.error(f"Error creating thumbnail: {e}")
        return image_base64

def convert_to_rgb(image: Image.Image) -> Image.Image:
    """Convert image to RGB mode"""
    if image.mode == 'RGBA':
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[3])
        return background
    elif image.mode != 'RGB':
        return image.convert('RGB')
    return image

def apply_image_filter(
    image_base64: str, 
    filter_type: str, 
    brightness: int = 0, 
    contrast: int = 0, 
    saturation: int = 0
) -> str:
    """Apply filter and adjustments to image
    
    Args:
        image_base64: Base64 encoded image
        filter_type: Filter preset ('original', 'grayscale', 'bw', 'enhanced', 'document')
        brightness: Adjustment from -50 to +50
        contrast: Adjustment from -50 to +50
        saturation: Adjustment from -50 to +50
    """
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data))
        image = convert_to_rgb(image)
        
        # Apply filter preset first
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
        
        # Apply manual adjustments (brightness, contrast, saturation)
        # Convert adjustment values (-50 to +50) to enhancement factors (0.5 to 1.5)
        
        if brightness != 0:
            # Brightness: -50 -> 0.5, 0 -> 1.0, +50 -> 1.5
            brightness_factor = 1.0 + (brightness / 100.0)
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(brightness_factor)
        
        if contrast != 0:
            # Contrast: -50 -> 0.5, 0 -> 1.0, +50 -> 1.5
            contrast_factor = 1.0 + (contrast / 100.0)
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(contrast_factor)
        
        if saturation != 0:
            # Saturation: -50 -> 0.5, 0 -> 1.0, +50 -> 1.5
            saturation_factor = 1.0 + (saturation / 100.0)
            enhancer = ImageEnhance.Color(image)
            image = enhancer.enhance(saturation_factor)
        
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
        image = convert_to_rgb(image)
        
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
        image = convert_to_rgb(image)
        
        # Crop image
        image = image.crop((x, y, x + width, y + height))
        
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        return base64.b64encode(buffer.getvalue()).decode()
    except Exception as e:
        logger.error(f"Error cropping image: {e}")
        return image_base64

def detect_document_edges(image_base64: str, document_type: str = "document") -> Dict[str, Any]:
    """Detect document edges using OpenCV with improved multi-approach detection
    
    This function tries multiple detection strategies to find document edges:
    1. Canny edge detection with various thresholds
    2. Adaptive thresholding
    3. Color-based detection (for white documents on darker backgrounds)
    4. Morphological operations
    """
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"detected": False, "corners": None, "message": "Could not decode image"}
        
        height, width = img.shape[:2]
        
        # Resize for faster processing
        max_dim = 1000  # Increased for better accuracy
        scale = min(1.0, max_dim / max(width, height))
        if scale < 1.0:
            img_small = cv2.resize(img, None, fx=scale, fy=scale)
        else:
            img_small = img.copy()
            scale = 1.0
        
        small_h, small_w = img_small.shape[:2]
        
        # Minimum area threshold - lowered to 3% for better detection
        min_area = small_h * small_w * 0.03
        # Maximum area - no more than 99% of image
        max_area = small_h * small_w * 0.99
        
        best_contour = None
        best_score = 0
        
        def score_contour(contour, approx):
            """Score a contour based on multiple criteria"""
            area = cv2.contourArea(contour)
            if area < min_area or area > max_area:
                return 0
            
            # Must be quadrilateral
            if len(approx) != 4:
                return 0
            
            # Check if it's convex
            if not cv2.isContourConvex(approx):
                return 0
            
            # Score based on area (larger is better, but not too large)
            area_score = area / (small_h * small_w)
            
            # Score based on how rectangular it is (aspect ratio)
            rect = cv2.minAreaRect(approx)
            rect_area = rect[1][0] * rect[1][1]
            if rect_area > 0:
                rectangularity = area / rect_area
            else:
                rectangularity = 0
            
            # Combined score
            return area_score * 0.6 + rectangularity * 0.4
        
        # Convert to different color spaces
        gray = cv2.cvtColor(img_small, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(img_small, cv2.COLOR_BGR2HSV)
        
        # APPROACH 1: Multiple Canny edge detection with different preprocessing
        preprocessed_images = [
            cv2.GaussianBlur(gray, (5, 5), 0),
            cv2.bilateralFilter(gray, 9, 75, 75),
            cv2.medianBlur(gray, 5),
        ]
        
        canny_params = [(20, 80), (30, 100), (50, 150), (75, 200), (100, 250)]
        
        for prep_img in preprocessed_images:
            for low_thresh, high_thresh in canny_params:
                edges = cv2.Canny(prep_img, low_thresh, high_thresh)
                
                # Dilate to connect broken lines
                kernel = np.ones((3, 3), np.uint8)
                edges = cv2.dilate(edges, kernel, iterations=2)
                edges = cv2.erode(edges, kernel, iterations=1)
                
                contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for contour in contours:
                    for epsilon_factor in [0.01, 0.02, 0.03, 0.04]:
                        epsilon = epsilon_factor * cv2.arcLength(contour, True)
                        approx = cv2.approxPolyDP(contour, epsilon, True)
                        
                        score = score_contour(contour, approx)
                        if score > best_score:
                            best_score = score
                            best_contour = approx
        
        # APPROACH 2: Adaptive thresholding
        if best_score < 0.3:
            for block_size in [11, 15, 21]:
                for c in [2, 5, 10]:
                    thresh = cv2.adaptiveThreshold(
                        cv2.GaussianBlur(gray, (5, 5), 0), 
                        255, 
                        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                        cv2.THRESH_BINARY, 
                        block_size, 
                        c
                    )
                    
                    # Morphological operations
                    kernel = np.ones((5, 5), np.uint8)
                    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
                    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
                    
                    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    
                    for contour in contours:
                        for epsilon_factor in [0.01, 0.02, 0.03]:
                            epsilon = epsilon_factor * cv2.arcLength(contour, True)
                            approx = cv2.approxPolyDP(contour, epsilon, True)
                            
                            score = score_contour(contour, approx)
                            if score > best_score:
                                best_score = score
                                best_contour = approx
        
        # APPROACH 3: Color-based detection for white/light documents
        if best_score < 0.3:
            # Detect bright regions (documents are usually white/light)
            _, bright_mask = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
            
            # Also try detecting by saturation (documents have low saturation)
            s_channel = hsv[:, :, 1]
            _, low_sat_mask = cv2.threshold(s_channel, 50, 255, cv2.THRESH_BINARY_INV)
            
            for mask in [bright_mask, low_sat_mask]:
                kernel = np.ones((7, 7), np.uint8)
                mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
                mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
                
                contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for contour in contours:
                    for epsilon_factor in [0.01, 0.02, 0.03]:
                        epsilon = epsilon_factor * cv2.arcLength(contour, True)
                        approx = cv2.approxPolyDP(contour, epsilon, True)
                        
                        score = score_contour(contour, approx)
                        if score > best_score:
                            best_score = score
                            best_contour = approx
        
        if best_contour is not None and best_score > 0.05:
            # Scale corners back to original size
            corners = []
            for point in best_contour:
                x, y = point[0]
                corners.append({
                    "x": int(x / scale),
                    "y": int(y / scale)
                })
            
            # Order corners: top-left, top-right, bottom-right, bottom-left
            corners = order_corners(corners)
            
            return {
                "detected": True,
                "corners": corners,
                "width": width,
                "height": height,
                "confidence": round(best_score, 2)
            }
        
        # Return default corners if no detection - full frame with slight padding
        padding = 0.05
        default_corners = [
            {"x": int(width * padding), "y": int(height * padding)},
            {"x": int(width * (1 - padding)), "y": int(height * padding)},
            {"x": int(width * (1 - padding)), "y": int(height * (1 - padding))},
            {"x": int(width * padding), "y": int(height * (1 - padding))}
        ]
        
        return {
            "detected": False, 
            "corners": default_corners,
            "width": width,
            "height": height,
            "message": "Could not detect document edges. Default crop area provided."
        }
    except Exception as e:
        logger.error(f"Error detecting edges: {e}")
        return {"detected": False, "corners": None, "message": str(e)}

def fix_image_orientation_pil(image_bytes):
    """
    Fix image orientation based on EXIF data using PIL.
    Returns corrected image bytes with proper orientation.
    
    Args:
        image_bytes: Original image bytes
    Returns:
        Tuple of (corrected_bytes, was_rotated, original_orientation)
    """
    try:
        from PIL import Image as PILImage
        from PIL import ExifTags
        from io import BytesIO
        
        pil_img = PILImage.open(BytesIO(image_bytes))
        original_size = pil_img.size
        orientation = 1  # Default: normal
        
        # Try to get EXIF orientation
        try:
            exif = pil_img._getexif()
            if exif:
                for tag, value in exif.items():
                    if ExifTags.TAGS.get(tag) == 'Orientation':
                        orientation = value
                        logger.info(f"EXIF Orientation found: {value} (size before: {original_size})")
                        
                        if value == 3:
                            pil_img = pil_img.rotate(180, expand=True)
                            logger.info("Applied 180 degree rotation")
                        elif value == 6:
                            pil_img = pil_img.rotate(-90, expand=True)  # 90 CW = -90 in PIL
                            logger.info("Applied 90 degree clockwise rotation")
                        elif value == 8:
                            pil_img = pil_img.rotate(90, expand=True)  # 90 CCW = 90 in PIL
                            logger.info("Applied 90 degree counter-clockwise rotation")
                        
                        logger.info(f"Size after rotation: {pil_img.size}")
                        break
        except (AttributeError, KeyError, IndexError) as e:
            logger.debug(f"No EXIF orientation found: {e}")
        
        # Convert back to bytes
        buffer = BytesIO()
        # Save as JPEG without EXIF to avoid re-rotation
        if pil_img.mode == 'RGBA':
            pil_img = pil_img.convert('RGB')
        pil_img.save(buffer, format='JPEG', quality=95)
        corrected_bytes = buffer.getvalue()
        
        was_rotated = orientation in [3, 6, 8]
        return corrected_bytes, was_rotated, orientation
        
    except Exception as e:
        logger.error(f"Error fixing orientation: {e}")
        return image_bytes, False, 1


def fix_image_orientation(img, original_bytes=None):
    """
    Fix image orientation based on EXIF data.
    OpenCV doesn't handle EXIF orientation automatically, so we need to do it manually.
    
    Args:
        img: OpenCV image (numpy array)
        original_bytes: Original image bytes (to read EXIF from)
    """
    try:
        from PIL import Image as PILImage
        from PIL import ExifTags
        from io import BytesIO
        
        # Try to get EXIF from original bytes first (more reliable)
        pil_img = None
        if original_bytes is not None:
            try:
                pil_img = PILImage.open(BytesIO(original_bytes))
            except:
                pass
        
        # Fallback: Convert OpenCV image to PIL (may lose EXIF)
        if pil_img is None:
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            pil_img = PILImage.fromarray(img_rgb)
        
        # Try to get EXIF orientation
        try:
            exif = pil_img._getexif()
            if exif:
                for tag, value in exif.items():
                    if ExifTags.TAGS.get(tag) == 'Orientation':
                        logger.info(f"EXIF Orientation tag found: {value}")
                        if value == 3:
                            img = cv2.rotate(img, cv2.ROTATE_180)
                            logger.info("Applied 180 degree rotation")
                        elif value == 6:
                            img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
                            logger.info("Applied 90 degree clockwise rotation")
                        elif value == 8:
                            img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
                            logger.info("Applied 90 degree counter-clockwise rotation")
                        break
        except (AttributeError, KeyError, IndexError) as e:
            logger.debug(f"No EXIF orientation found: {e}")
    except Exception as e:
        logger.debug(f"Could not process EXIF: {e}")
    
    return img

def order_corners(corners: List[Dict]) -> List[Dict]:
    """
    Order corners in consistent order: TL, TR, BR, BL
    This ensures perspective transform works correctly regardless of input order.
    """
    if len(corners) != 4:
        return corners
    
    # Convert to numpy for easier manipulation
    pts = np.array([[c['x'], c['y']] for c in corners], dtype=np.float32)
    
    # Sort by y-coordinate to get top and bottom pairs
    sorted_by_y = pts[np.argsort(pts[:, 1])]
    top_pts = sorted_by_y[:2]
    bottom_pts = sorted_by_y[2:]
    
    # Sort top points by x to get TL, TR
    top_sorted = top_pts[np.argsort(top_pts[:, 0])]
    tl, tr = top_sorted[0], top_sorted[1]
    
    # Sort bottom points by x to get BL, BR
    bottom_sorted = bottom_pts[np.argsort(bottom_pts[:, 0])]
    bl, br = bottom_sorted[0], bottom_sorted[1]
    
    return [
        {'x': float(tl[0]), 'y': float(tl[1])},  # Top-Left
        {'x': float(tr[0]), 'y': float(tr[1])},  # Top-Right
        {'x': float(br[0]), 'y': float(br[1])},  # Bottom-Right
        {'x': float(bl[0]), 'y': float(bl[1])}   # Bottom-Left
    ]

def perspective_crop(image_base64: str, corners: List[Dict]) -> str:
    """
    Apply perspective transform to crop document and make it front-facing.
    
    This function:
    1. Takes the 4 corner points of a document in the image
    2. Applies a perspective warp to make the document rectangular
    3. The output looks like it was photographed from directly above (front-facing)
    
    Args:
        image_base64: Base64 encoded image
        corners: List of 4 corner points in order [TL, TR, BR, BL]
                 Can be in pixel coordinates or will be auto-ordered
    
    Returns:
        Base64 encoded cropped and perspective-corrected image
    """
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        image_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None or len(corners) != 4:
            return image_base64
        
        # Fix EXIF orientation BEFORE processing
        img = fix_image_orientation(img)
        
        # Ensure corners are in correct order: TL, TR, BR, BL
        ordered_corners = order_corners(corners)
        
        # Source points - use float32 for precision
        src_pts = np.float32([
            [ordered_corners[0]["x"], ordered_corners[0]["y"]],  # top-left
            [ordered_corners[1]["x"], ordered_corners[1]["y"]],  # top-right
            [ordered_corners[2]["x"], ordered_corners[2]["y"]],  # bottom-right
            [ordered_corners[3]["x"], ordered_corners[3]["y"]]   # bottom-left
        ])
        
        # Calculate the actual document dimensions from the corners
        # Top edge width
        width_top = np.sqrt(
            (ordered_corners[1]["x"] - ordered_corners[0]["x"])**2 + 
            (ordered_corners[1]["y"] - ordered_corners[0]["y"])**2
        )
        # Bottom edge width
        width_bottom = np.sqrt(
            (ordered_corners[2]["x"] - ordered_corners[3]["x"])**2 + 
            (ordered_corners[2]["y"] - ordered_corners[3]["y"])**2
        )
        # Left edge height
        height_left = np.sqrt(
            (ordered_corners[3]["x"] - ordered_corners[0]["x"])**2 + 
            (ordered_corners[3]["y"] - ordered_corners[0]["y"])**2
        )
        # Right edge height
        height_right = np.sqrt(
            (ordered_corners[2]["x"] - ordered_corners[1]["x"])**2 + 
            (ordered_corners[2]["y"] - ordered_corners[1]["y"])**2
        )
        
        # Use the maximum dimensions to preserve content
        output_width = max(int(round(width_top)), int(round(width_bottom)))
        output_height = max(int(round(height_left)), int(round(height_right)))
        
        # Ensure minimum dimensions
        output_width = max(output_width, 100)
        output_height = max(output_height, 100)
        
        # For proper document aspect ratio, adjust dimensions
        # Standard A4 is ~1:1.414, ID cards are ~1.586:1
        # We use the natural aspect ratio from the selection
        
        # Destination points - perfect rectangle (front-facing view)
        dst_pts = np.float32([
            [0, 0],                          # top-left
            [output_width - 1, 0],           # top-right  
            [output_width - 1, output_height - 1],  # bottom-right
            [0, output_height - 1]           # bottom-left
        ])
        
        # Get perspective transform matrix
        matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
        
        # Apply perspective transform with high-quality interpolation
        # This makes the document appear as if photographed from directly above
        warped = cv2.warpPerspective(
            img, 
            matrix, 
            (output_width, output_height),
            flags=cv2.INTER_CUBIC,  # High quality interpolation
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255)  # White border for any empty areas
        )
        
        # Optional: Apply slight sharpening to improve text clarity after transform
        # kernel = np.array([[-0.5, -0.5, -0.5], [-0.5, 5, -0.5], [-0.5, -0.5, -0.5]])
        # warped = cv2.filter2D(warped, -1, kernel)
        
        logger.info(f"Perspective crop: {img.shape[:2]} -> {warped.shape[:2]}, output={output_width}x{output_height}")
        
        # Encode back to base64 with maximum quality
        _, buffer = cv2.imencode('.jpg', warped, [cv2.IMWRITE_JPEG_QUALITY, 95])
        return base64.b64encode(buffer).decode()
        
    except Exception as e:
        logger.error(f"Error in perspective crop: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return image_base64

async def perform_ocr_with_openai(image_base64: str) -> str:
    """Perform OCR using Emergent LLM with image analysis"""
    if not EMERGENT_LLM_KEY:
        return "OCR service not configured. Please add EMERGENT_LLM_KEY to backend/.env"
    
    try:
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        
        # Create a new chat session for OCR
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"ocr_{uuid.uuid4().hex[:8]}",
            system_message="You are an OCR assistant. Extract all text from images accurately."
        ).with_model("openai", "gpt-4o")
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Create message with image
        user_message = UserMessage(
            text="Extract all text from this document image. Return only the extracted text exactly as it appears, preserving line breaks and formatting. If no text is found, return 'No text detected'.",
            file_contents=[image_content]
        )
        
        # Send message and get response
        response = await chat.send_message(user_message)
        
        return response or "No text detected"
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return f"OCR error: {str(e)}"

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

@api_router.post("/users/start-trial", response_model=UserResponse)
async def start_trial(
    current_user: User = Depends(get_current_user)
):
    """Start 7-day free trial"""
    # Check if trial already used
    if current_user.trial_used:
        raise HTTPException(status_code=400, detail="Trial already used. Subscribe to premium for full access.")
    
    # Check if already premium
    if current_user.subscription_type == "premium":
        raise HTTPException(status_code=400, detail="Already a premium subscriber.")
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": {
            "subscription_type": "trial",
            "trial_start_date": datetime.now(timezone.utc),
            "trial_used": True,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    user_doc = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    return user_to_response(user)

@api_router.get("/users/usage-stats")
async def get_usage_stats(
    current_user: User = Depends(get_current_user)
):
    """Get user's current usage statistics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    
    scans_today = current_user.scans_today if current_user.last_scan_date == today else 0
    scans_month = current_user.scans_this_month if current_user.scan_month == current_month else 0
    ocr_today = current_user.ocr_usage_today if current_user.ocr_usage_date == today else 0
    
    is_premium = current_user.subscription_type in ["premium", "trial"]
    
    return {
        "scans_today": scans_today,
        "scans_this_month": scans_month,
        "ocr_today": ocr_today,
        "limits": {
            "scans_per_day": FREE_SCANS_PER_DAY if not is_premium else None,
            "scans_per_month": FREE_SCANS_PER_MONTH if not is_premium else None,
            "ocr_per_day": FREE_OCR_PER_DAY if not is_premium else None,
        },
        "is_premium": is_premium
    }

# ==================== DOCUMENT ENDPOINTS ====================

@api_router.post("/documents", response_model=Document)
async def create_document(
    doc_data: DocumentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new document"""
    # Check scan limits for free users
    can_scan, limit_message = await check_scan_limits(current_user)
    if not can_scan:
        raise HTTPException(status_code=403, detail=limit_message)
    
    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    # Check if user needs watermark (free users)
    is_premium = current_user.subscription_type in ["premium", "trial"]
    if current_user.subscription_type == "trial" and current_user.trial_start_date:
        trial_end = current_user.trial_start_date + timedelta(days=TRIAL_DURATION_DAYS)
        if datetime.now(timezone.utc) >= trial_end.replace(tzinfo=timezone.utc):
            is_premium = False
    
    # Process pages - create thumbnails, add watermark for free users, upload to S3
    processed_pages = []
    for i, page in enumerate(doc_data.pages):
        page_dict = page.dict()
        page_id = f"page_{uuid.uuid4().hex[:8]}"
        page_dict["page_id"] = page_id
        page_dict["order"] = i
        
        # Add watermark for free users
        image_base64 = page.image_base64
        if not is_premium:
            image_base64 = add_watermark(image_base64, "ScanUp")
        
        # Create thumbnail
        thumbnail_base64 = create_thumbnail(image_base64)
        
        # Upload to S3 if configured
        if s3_client:
            # Upload main image
            image_url = upload_to_s3(image_base64, current_user.user_id, document_id, page_id, "page")
            thumbnail_url = upload_to_s3(thumbnail_base64, current_user.user_id, document_id, page_id, "thumbnail")
            
            if image_url and thumbnail_url:
                # Store URLs instead of base64
                page_dict["image_url"] = image_url
                page_dict["thumbnail_url"] = thumbnail_url
                page_dict.pop("image_base64", None)
                page_dict.pop("thumbnail_base64", None)
                logger.info(f"✅ Page {page_id} uploaded to S3")
            else:
                # Fallback to base64 if S3 upload fails
                page_dict["image_base64"] = image_base64
                page_dict["thumbnail_base64"] = thumbnail_base64
                logger.warning(f"⚠️ S3 upload failed, storing base64 for page {page_id}")
        else:
            # No S3, store base64 in MongoDB
            page_dict["image_base64"] = image_base64
            page_dict["thumbnail_base64"] = thumbnail_base64
        
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
        "has_watermark": not is_premium,
        "storage_type": "s3" if s3_client else "mongodb",  # Track storage type
        "created_at": now,
        "updated_at": now
    }
    
    await db.documents.insert_one(document)
    
    # Increment scan count for this user
    await increment_scan_count(current_user.user_id)
    
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
            # Always regenerate thumbnail to ensure it matches the current image
            page_dict["thumbnail_base64"] = create_thumbnail(page.image_base64)
            processed_pages.append(page_dict)
        update_data["pages"] = processed_pages
        
        # Update document thumbnail to first page's thumbnail
        if processed_pages:
            update_data["thumbnail_base64"] = processed_pages[0].get("thumbnail_base64")
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
        "is_protected": False,
        "password_hash": None,
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

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    is_protected: Optional[bool] = None
    password_hash: Optional[str] = None

@api_router.put("/folders/{folder_id}", response_model=Folder)
async def update_folder(
    folder_id: str,
    folder_data: FolderUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a folder"""
    update_data = {}
    
    if folder_data.name is not None:
        update_data["name"] = folder_data.name
    if folder_data.color is not None:
        update_data["color"] = folder_data.color
    if folder_data.is_protected is not None:
        update_data["is_protected"] = folder_data.is_protected
    if folder_data.password_hash is not None:
        # Hash the password before storing
        update_data["password_hash"] = hash_password(folder_data.password_hash)
    elif not folder_data.is_protected:
        # If removing protection, also clear the password
        update_data["password_hash"] = None
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.folders.update_one(
        {"folder_id": folder_id, "user_id": current_user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    folder = await db.folders.find_one(
        {"folder_id": folder_id},
        {"_id": 0}
    )
    return Folder(**folder)

class FolderPasswordVerify(BaseModel):
    password: str

@api_router.post("/folders/{folder_id}/verify-password")
async def verify_folder_password(
    folder_id: str,
    password_data: FolderPasswordVerify,
    current_user: User = Depends(get_current_user)
):
    """Verify folder password"""
    folder = await db.folders.find_one(
        {"folder_id": folder_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if not folder.get("is_protected"):
        return {"success": True, "message": "Folder is not protected"}
    
    stored_hash = folder.get("password_hash")
    if not stored_hash:
        return {"success": True, "message": "No password set"}
    
    # Verify password against stored hash
    if verify_password(password_data.password, stored_hash):
        return {"success": True, "message": "Password verified"}
    else:
        raise HTTPException(status_code=401, detail="Incorrect password")

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
    """Process an image (crop, rotate, filter, perspective)"""
    result = request.image_base64
    
    if request.operation == "filter":
        filter_type = request.params.get("type", "original")
        brightness = request.params.get("brightness", 0)
        contrast = request.params.get("contrast", 0)
        saturation = request.params.get("saturation", 0)
        result = apply_image_filter(result, filter_type, brightness, contrast, saturation)
    elif request.operation == "rotate":
        degrees = request.params.get("degrees", 90)
        result = rotate_image(result, degrees)
    elif request.operation == "crop":
        x = request.params.get("x", 0)
        y = request.params.get("y", 0)
        width = request.params.get("width", 100)
        height = request.params.get("height", 100)
        result = crop_image(result, x, y, width, height)
    elif request.operation == "perspective_crop":
        corners = request.params.get("corners", [])
        if corners:
            result = perspective_crop(result, corners)
    
    return ImageProcessResponse(processed_image_base64=result)


@api_router.post("/images/process-public", response_model=ImageProcessResponse)
async def process_image_public(request: ImageProcessRequest):
    """Public endpoint to process an image (no auth required) - for guest users"""
    result = request.image_base64
    
    if request.operation == "filter":
        filter_type = request.params.get("type", "original")
        brightness = request.params.get("brightness", 0)
        contrast = request.params.get("contrast", 0)
        saturation = request.params.get("saturation", 0)
        result = apply_image_filter(result, filter_type, brightness, contrast, saturation)
    elif request.operation == "rotate":
        degrees = request.params.get("degrees", 90)
        result = rotate_image(result, degrees)
    elif request.operation == "crop":
        x = request.params.get("x", 0)
        y = request.params.get("y", 0)
        width = request.params.get("width", 100)
        height = request.params.get("height", 100)
        result = crop_image(result, x, y, width, height)
    elif request.operation == "perspective_crop":
        corners = request.params.get("corners", [])
        if corners:
            result = perspective_crop(result, corners)
    
    return ImageProcessResponse(processed_image_base64=result)

@api_router.post("/images/detect-edges")
async def detect_edges(
    request: ImageProcessRequest,
    current_user: User = Depends(get_current_user)
):
    """Detect document edges in an image"""
    result = detect_document_edges(request.image_base64)
    return result

@api_router.post("/images/auto-crop")
async def auto_crop_image(
    request: ImageProcessRequest,
    current_user: User = Depends(get_current_user)
):
    """Automatically detect and crop document from image"""
    document_type = request.params.get("document_type", "document")
    
    # First detect edges with improved algorithm
    edge_result = detect_document_edges(request.image_base64, document_type)
    
    if edge_result.get("detected") and edge_result.get("corners"):
        # Apply perspective transform
        cropped = perspective_crop(request.image_base64, edge_result["corners"])
        return {
            "success": True,
            "cropped_image_base64": cropped,
            "corners": edge_result["corners"],
            "confidence": edge_result.get("confidence", 0)
        }
    
    # Even if not detected, return default corners for manual adjustment
    return {
        "success": False,
        "cropped_image_base64": request.image_base64,
        "corners": edge_result.get("corners"),  # Default corners provided
        "message": edge_result.get("message", "Could not detect document edges automatically")
    }


@api_router.post("/images/auto-crop-public")
async def auto_crop_image_public(request: ImageProcessRequest):
    """Public endpoint to auto-crop image (no auth required) - for guest users"""
    document_type = request.params.get("document_type", "document")
    
    edge_result = detect_document_edges(request.image_base64, document_type)
    
    if edge_result.get("detected") and edge_result.get("corners"):
        cropped = perspective_crop(request.image_base64, edge_result["corners"])
        return {
            "success": True,
            "cropped_image_base64": cropped,
            "corners": edge_result["corners"],
            "confidence": edge_result.get("confidence", 0)
        }
    
    return {
        "success": False,
        "cropped_image_base64": request.image_base64,
        "corners": edge_result.get("corners"),
        "message": edge_result.get("message", "Could not detect document edges automatically")
    }

class ManualCropRequest(BaseModel):
    image_base64: str
    corners: List[Dict[str, float]]  # [{x: 0-1, y: 0-1}, ...]
    force_portrait: Optional[bool] = False  # Force rotation to portrait if image is landscape

@api_router.post("/images/perspective-crop")
async def manual_perspective_crop(
    request: ManualCropRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Apply manual perspective crop with user-defined corners.
    
    The corners should be normalized (0-1 range) and will be converted to pixel coordinates.
    The function handles EXIF orientation and ensures corners are in correct order.
    """
    try:
        # Decode image to get dimensions
        if "," in request.image_base64:
            img_data = request.image_base64.split(",")[1]
        else:
            img_data = request.image_base64
            
        image_bytes = base64.b64decode(img_data)
        
        # Fix EXIF orientation FIRST using PIL (more reliable)
        corrected_bytes, was_rotated, orientation = fix_image_orientation_pil(image_bytes)
        logger.info(f"EXIF orientation: {orientation}, was_rotated: {was_rotated}")
        
        # Now decode the corrected image with OpenCV
        nparr = np.frombuffer(corrected_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"success": False, "cropped_image_base64": request.image_base64, "message": "Could not decode image"}
        
        height, width = img.shape[:2]
        
        logger.info(f"Image dimensions after EXIF fix: {width}x{height}")
        logger.info(f"Input corners (normalized): {request.corners}")
        
        # Convert normalized corners to pixel coordinates using FLOAT
        # Do NOT convert to int yet - let perspective_crop handle precision
        pixel_corners = []
        for corner in request.corners:
            # Use float multiplication for precision
            px = float(corner.get('x', 0)) * width
            py = float(corner.get('y', 0)) * height
            pixel_corners.append({'x': px, 'y': py})
        
        logger.info(f"Pixel corners: {pixel_corners}")
        
        # Re-encode the EXIF-corrected image for perspective_crop
        corrected_base64 = base64.b64encode(corrected_bytes).decode()
        
        # Apply perspective transform on the EXIF-corrected image
        cropped = perspective_crop(corrected_base64, pixel_corners)
        
        return {
            "success": True,
            "cropped_image_base64": cropped
        }
    except Exception as e:
        logger.error(f"Manual crop error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "cropped_image_base64": request.image_base64,
            "message": str(e)
        }


# ==================== BOOK SCAN PAGE SPLITTING ====================

class BookSplitRequest(BaseModel):
    """Request model for book page splitting"""
    image_base64: str
    corners: Optional[List[Dict]] = None  # Optional outer corners for the entire book
    gutter_position: Optional[float] = None  # Optional manual gutter position (0-1), default is 0.5


def detect_book_gutter(img: np.ndarray) -> float:
    """
    Automatically detect the book gutter (center fold) position.
    Uses vertical line detection and intensity analysis.
    Returns normalized position (0-1) from left edge.
    """
    try:
        height, width = img.shape[:2]
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Focus on the middle portion where the gutter is most likely
        center_region = gray[:, int(width * 0.3):int(width * 0.7)]
        
        # Apply edge detection
        edges = cv2.Canny(center_region, 50, 150)
        
        # Look for vertical lines using Hough transform
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, minLineLength=height * 0.3, maxLineGap=20)
        
        vertical_lines = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                # Check if line is mostly vertical (angle < 10 degrees)
                angle = abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)
                if angle > 80 or angle < 10:
                    avg_x = (x1 + x2) / 2 + int(width * 0.3)  # Adjust for region offset
                    vertical_lines.append(avg_x)
        
        if vertical_lines:
            # Use the median of detected vertical lines near center
            center_lines = [x for x in vertical_lines if abs(x - width/2) < width * 0.15]
            if center_lines:
                gutter_x = np.median(center_lines)
                return gutter_x / width
        
        # Fallback: analyze brightness pattern (gutter often has shadow)
        # Calculate column-wise mean intensity in center region
        col_intensity = np.mean(gray[:, int(width*0.35):int(width*0.65)], axis=0)
        
        # Find minimum intensity (shadow in gutter)
        min_idx = np.argmin(col_intensity)
        gutter_x = min_idx + int(width * 0.35)
        
        return gutter_x / width
        
    except Exception as e:
        logger.warning(f"Gutter detection failed: {e}, using center")
        return 0.5


def split_book_pages(img: np.ndarray, gutter_pos: float = 0.5) -> Tuple[np.ndarray, np.ndarray]:
    """
    Split a book image into left and right pages at the gutter position.
    
    Args:
        img: OpenCV image (BGR)
        gutter_pos: Normalized position (0-1) of the gutter from left edge
        
    Returns:
        Tuple of (left_page, right_page) as numpy arrays
    """
    height, width = img.shape[:2]
    gutter_x = int(width * gutter_pos)
    
    # Add small overlap at gutter to ensure no content is lost
    overlap = int(width * 0.01)  # 1% overlap
    
    left_page = img[:, :min(gutter_x + overlap, width)]
    right_page = img[:, max(gutter_x - overlap, 0):]
    
    return left_page, right_page


def perspective_correct_page(img: np.ndarray) -> np.ndarray:
    """
    Apply automatic perspective correction to a single page.
    Detects document edges and corrects keystoning.
    """
    try:
        height, width = img.shape[:2]
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Edge detection
        edges = cv2.Canny(blurred, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return img
        
        # Find the largest contour
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Get the minimum area rectangle
        rect = cv2.minAreaRect(largest_contour)
        box = cv2.boxPoints(rect)
        box = np.int32(box)
        
        # Order points: top-left, top-right, bottom-right, bottom-left
        def order_points(pts):
            rect = np.zeros((4, 2), dtype="float32")
            s = pts.sum(axis=1)
            rect[0] = pts[np.argmin(s)]  # top-left
            rect[2] = pts[np.argmax(s)]  # bottom-right
            diff = np.diff(pts, axis=1)
            rect[1] = pts[np.argmin(diff)]  # top-right
            rect[3] = pts[np.argmax(diff)]  # bottom-left
            return rect
        
        ordered = order_points(box.astype("float32"))
        
        # Check if the detected area is reasonable (at least 30% of image)
        contour_area = cv2.contourArea(largest_contour)
        if contour_area < (height * width * 0.3):
            # Not enough content detected, return original
            return img
        
        # Calculate output dimensions
        width_top = np.linalg.norm(ordered[0] - ordered[1])
        width_bottom = np.linalg.norm(ordered[2] - ordered[3])
        output_width = max(int(width_top), int(width_bottom))
        
        height_left = np.linalg.norm(ordered[0] - ordered[3])
        height_right = np.linalg.norm(ordered[1] - ordered[2])
        output_height = max(int(height_left), int(height_right))
        
        # Ensure minimum dimensions
        output_width = max(output_width, 100)
        output_height = max(output_height, 100)
        
        # Destination points
        dst = np.array([
            [0, 0],
            [output_width - 1, 0],
            [output_width - 1, output_height - 1],
            [0, output_height - 1]
        ], dtype="float32")
        
        # Apply perspective transform
        matrix = cv2.getPerspectiveTransform(ordered, dst)
        corrected = cv2.warpPerspective(img, matrix, (output_width, output_height), 
                                         flags=cv2.INTER_LINEAR, 
                                         borderMode=cv2.BORDER_REPLICATE)
        
        return corrected
        
    except Exception as e:
        logger.warning(f"Perspective correction failed: {e}")
        return img


@api_router.post("/images/split-book-pages")
async def split_book_pages_endpoint(request: BookSplitRequest):
    """
    Split a book scan into two separate pages with automatic perspective correction.
    
    This endpoint:
    1. Optionally applies perspective correction to the whole book image first
    2. Detects or uses the provided gutter position
    3. Splits the image into left and right pages
    4. Applies independent perspective correction to each page
    5. Returns both pages as separate base64 images
    
    Returns:
        {
            "success": bool,
            "left_page_base64": str,  # Page 1
            "right_page_base64": str,  # Page 2
            "gutter_position": float,  # Detected or provided gutter position
            "message": str
        }
    """
    try:
        # Decode image
        img_data = request.image_base64
        if "," in img_data:
            img_data = img_data.split(",")[1]
        
        image_bytes = base64.b64decode(img_data)
        
        # Fix EXIF orientation
        corrected_bytes, was_rotated, orientation = fix_image_orientation_pil(image_bytes)
        logger.info(f"[BookSplit] EXIF orientation: {orientation}, was_rotated: {was_rotated}")
        
        # Decode with OpenCV
        nparr = np.frombuffer(corrected_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {
                "success": False,
                "message": "Could not decode image"
            }
        
        height, width = img.shape[:2]
        logger.info(f"[BookSplit] Image dimensions: {width}x{height}")
        
        # Apply perspective correction to whole book if corners provided
        if request.corners and len(request.corners) == 4:
            logger.info("[BookSplit] Applying perspective correction with provided corners")
            # Convert normalized corners to pixels
            pixel_corners = []
            for corner in request.corners:
                px = float(corner.get('x', 0)) * width
                py = float(corner.get('y', 0)) * height
                pixel_corners.append({'x': px, 'y': py})
            
            # Apply perspective transform
            corrected_base64 = base64.b64encode(corrected_bytes).decode()
            cropped_base64 = perspective_crop(corrected_base64, pixel_corners)
            
            # Decode the cropped result
            cropped_bytes = base64.b64decode(cropped_base64)
            nparr = np.frombuffer(cropped_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            height, width = img.shape[:2]
        
        # Detect or use provided gutter position
        if request.gutter_position is not None:
            gutter_pos = request.gutter_position
            logger.info(f"[BookSplit] Using provided gutter position: {gutter_pos}")
        else:
            gutter_pos = detect_book_gutter(img)
            logger.info(f"[BookSplit] Detected gutter position: {gutter_pos}")
        
        # Split into two pages
        left_page, right_page = split_book_pages(img, gutter_pos)
        logger.info(f"[BookSplit] Left page: {left_page.shape}, Right page: {right_page.shape}")
        
        # Apply perspective correction to each page independently
        left_corrected = perspective_correct_page(left_page)
        right_corrected = perspective_correct_page(right_page)
        logger.info(f"[BookSplit] After correction - Left: {left_corrected.shape}, Right: {right_corrected.shape}")
        
        # Encode both pages to base64
        _, left_buffer = cv2.imencode('.jpg', left_corrected, [cv2.IMWRITE_JPEG_QUALITY, 95])
        _, right_buffer = cv2.imencode('.jpg', right_corrected, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        left_base64 = base64.b64encode(left_buffer.tobytes()).decode()
        right_base64 = base64.b64encode(right_buffer.tobytes()).decode()
        
        return {
            "success": True,
            "left_page_base64": left_base64,
            "right_page_base64": right_base64,
            "gutter_position": gutter_pos,
            "message": "Book pages split successfully"
        }
        
    except Exception as e:
        logger.error(f"[BookSplit] Error: {e}")
        return {
            "success": False,
            "message": str(e)
        }


# ==================== 6-POINT BOOK PERSPECTIVE CORRECTION ====================

class BookSixPointRequest(BaseModel):
    """Request model for 6-point book perspective correction"""
    image_base64: str
    points: List[Dict]  # 6 points: [TL, GT, TR, BR, GB, BL] - all normalized 0-1
    # TL = Top Left, GT = Gutter Top, TR = Top Right
    # BR = Bottom Right, GB = Gutter Bottom, BL = Bottom Left


def perspective_transform_page(img: np.ndarray, src_points: List[List[float]], is_portrait: bool = True) -> np.ndarray:
    """
    Apply perspective transform to a single page using 4 source points.
    
    Args:
        img: OpenCV image (BGR)
        src_points: List of 4 [x, y] points in order: TL, TR, BR, BL (pixel coordinates)
        is_portrait: Whether the output should be portrait orientation
        
    Returns:
        Perspective-corrected image
    """
    src_pts = np.float32(src_points)
    
    # Calculate output dimensions from source points
    width_top = np.linalg.norm(src_pts[0] - src_pts[1])
    width_bottom = np.linalg.norm(src_pts[3] - src_pts[2])
    height_left = np.linalg.norm(src_pts[0] - src_pts[3])
    height_right = np.linalg.norm(src_pts[1] - src_pts[2])
    
    output_width = int(max(width_top, width_bottom))
    output_height = int(max(height_left, height_right))
    
    # Ensure minimum dimensions
    output_width = max(output_width, 100)
    output_height = max(output_height, 100)
    
    # For book pages, we want portrait output (height > width typically)
    # If needed, we can adjust aspect ratio
    
    # Destination points - perfect rectangle
    dst_pts = np.float32([
        [0, 0],                                # TL
        [output_width - 1, 0],                 # TR
        [output_width - 1, output_height - 1], # BR
        [0, output_height - 1]                 # BL
    ])
    
    # Get perspective transform matrix
    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    
    # Apply transform with high-quality interpolation
    warped = cv2.warpPerspective(
        img, 
        matrix, 
        (output_width, output_height),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(255, 255, 255)
    )
    
    return warped


@api_router.post("/images/book-6point-crop")
async def book_six_point_crop(request: BookSixPointRequest):
    """
    Apply 6-point perspective correction for book scanning.
    
    This provides precise control over each page's perspective by using:
    - 4 outer corners (TL, TR, BR, BL)
    - 2 gutter points (GT, GB) that define the book spine
    
    Each page gets its own 4-point perspective transform:
    - Left page: TL, GT, GB, BL
    - Right page: GT, TR, BR, GB
    
    Point order expected: [TL, GT, TR, BR, GB, BL]
    All coordinates should be normalized (0-1).
    
    Returns:
        {
            "success": bool,
            "left_page_base64": str,   # Page 1 (left side of book)
            "right_page_base64": str,  # Page 2 (right side of book)
            "message": str
        }
    """
    try:
        # Validate we have exactly 6 points
        if not request.points or len(request.points) != 6:
            return {
                "success": False,
                "message": f"Expected 6 points, got {len(request.points) if request.points else 0}"
            }
        
        # Decode image
        img_data = request.image_base64
        if "," in img_data:
            img_data = img_data.split(",")[1]
        
        image_bytes = base64.b64decode(img_data)
        
        # Fix EXIF orientation
        corrected_bytes, was_rotated, orientation = fix_image_orientation_pil(image_bytes)
        logger.info(f"[Book6Point] EXIF orientation: {orientation}, was_rotated: {was_rotated}")
        
        # Decode with OpenCV
        nparr = np.frombuffer(corrected_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {
                "success": False,
                "message": "Could not decode image"
            }
        
        height, width = img.shape[:2]
        logger.info(f"[Book6Point] Image dimensions: {width}x{height}")
        
        # Extract and convert normalized points to pixel coordinates
        # Expected order: [TL, GT, TR, BR, GB, BL]
        points = request.points
        
        TL = [float(points[0].get('x', 0)) * width, float(points[0].get('y', 0)) * height]
        GT = [float(points[1].get('x', 0.5)) * width, float(points[1].get('y', 0)) * height]  # Gutter Top
        TR = [float(points[2].get('x', 1)) * width, float(points[2].get('y', 0)) * height]
        BR = [float(points[3].get('x', 1)) * width, float(points[3].get('y', 1)) * height]
        GB = [float(points[4].get('x', 0.5)) * width, float(points[4].get('y', 1)) * height]  # Gutter Bottom
        BL = [float(points[5].get('x', 0)) * width, float(points[5].get('y', 1)) * height]
        
        logger.info(f"[Book6Point] Points - TL:{TL}, GT:{GT}, TR:{TR}, BR:{BR}, GB:{GB}, BL:{BL}")
        
        # Left page: TL -> GT -> GB -> BL (clockwise from top-left)
        left_src = [TL, GT, GB, BL]
        left_page = perspective_transform_page(img, left_src)
        logger.info(f"[Book6Point] Left page shape: {left_page.shape}")
        
        # Right page: GT -> TR -> BR -> GB (clockwise from top-left of right page)
        right_src = [GT, TR, BR, GB]
        right_page = perspective_transform_page(img, right_src)
        logger.info(f"[Book6Point] Right page shape: {right_page.shape}")
        
        # Encode both pages to base64
        _, left_buffer = cv2.imencode('.jpg', left_page, [cv2.IMWRITE_JPEG_QUALITY, 95])
        _, right_buffer = cv2.imencode('.jpg', right_page, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        left_base64 = base64.b64encode(left_buffer.tobytes()).decode()
        right_base64 = base64.b64encode(right_buffer.tobytes()).decode()
        
        return {
            "success": True,
            "left_page_base64": left_base64,
            "right_page_base64": right_base64,
            "message": "Book pages perspective-corrected successfully"
        }
        
    except Exception as e:
        logger.error(f"[Book6Point] Error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": str(e)
        }


# ==================== REAL-TIME EDGE DETECTION ====================

class EdgeDetectionRequest(BaseModel):
    """Request for real-time edge detection"""
    image_base64: str
    mode: str = "document"  # document, book, id_card


def detect_document_edges_cv(img: np.ndarray) -> Optional[List[Dict]]:
    """
    Detect document edges using contour detection (OpenCV based).
    Returns 4 corner points normalized to 0-1 range, or None if not found.
    """
    height, width = img.shape[:2]
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Edge detection using Canny
    edges = cv2.Canny(blurred, 50, 150)
    
    # Dilate edges to close gaps
    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    
    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return None
    
    # Sort by area and get largest contours
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    
    for contour in contours:
        # Approximate contour
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        
        # If we found a quadrilateral
        if len(approx) == 4:
            # Check if area is significant (at least 10% of image)
            area = cv2.contourArea(approx)
            if area < (height * width * 0.1):
                continue
            
            # Extract points and order them
            points = approx.reshape(4, 2)
            
            # Order points: TL, TR, BR, BL
            # Sort by y first to get top and bottom pairs
            sorted_by_y = points[np.argsort(points[:, 1])]
            top_points = sorted_by_y[:2]
            bottom_points = sorted_by_y[2:]
            
            # Sort top points by x (left to right)
            top_points = top_points[np.argsort(top_points[:, 0])]
            # Sort bottom points by x (left to right)  
            bottom_points = bottom_points[np.argsort(bottom_points[:, 0])]
            
            # TL, TR, BR, BL
            ordered = [
                {'x': float(top_points[0][0]) / width, 'y': float(top_points[0][1]) / height},
                {'x': float(top_points[1][0]) / width, 'y': float(top_points[1][1]) / height},
                {'x': float(bottom_points[1][0]) / width, 'y': float(bottom_points[1][1]) / height},
                {'x': float(bottom_points[0][0]) / width, 'y': float(bottom_points[0][1]) / height},
            ]
            
            return ordered
    
    return None


def detect_book_edges_cv(img: np.ndarray) -> Optional[List[Dict]]:
    """
    Detect book edges - returns 6 points for two-page layout.
    Points: [TL, GT, TR, BR, GB, BL]
    """
    height, width = img.shape[:2]
    
    # First detect outer edges
    outer_corners = detect_document_edges_cv(img)
    
    if not outer_corners:
        return None
    
    # Now detect the gutter (center line)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Focus on the center region for gutter detection
    center_start = int(width * 0.35)
    center_end = int(width * 0.65)
    center_region = gray[:, center_start:center_end]
    
    # Apply edge detection to find vertical lines
    edges = cv2.Canny(center_region, 50, 150)
    
    # Use Hough transform to find vertical lines
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, minLineLength=height * 0.3, maxLineGap=20)
    
    gutter_x = width * 0.5  # Default to center
    
    if lines is not None:
        vertical_lines = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            # Check if line is mostly vertical
            angle = abs(np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi)
            if angle > 80 or angle < 10:
                avg_x = (x1 + x2) / 2 + center_start
                vertical_lines.append(avg_x)
        
        if vertical_lines:
            gutter_x = np.median(vertical_lines)
    else:
        # Fallback: use brightness analysis
        col_intensity = np.mean(gray[:, center_start:center_end], axis=0)
        min_idx = np.argmin(col_intensity)
        gutter_x = min_idx + center_start
    
    # Calculate gutter top and bottom y positions
    # Use the detected outer corners y values
    tl_y = outer_corners[0]['y']
    bl_y = outer_corners[3]['y']
    tr_y = outer_corners[1]['y']
    br_y = outer_corners[2]['y']
    
    # Gutter top is average of top corners y, gutter bottom is average of bottom corners y
    gt_y = (tl_y + tr_y) / 2
    gb_y = (bl_y + br_y) / 2
    
    # Normalize gutter_x
    gutter_x_norm = gutter_x / width
    
    # Return 6 points: [TL, GT, TR, BR, GB, BL]
    return [
        outer_corners[0],  # TL
        {'x': gutter_x_norm, 'y': gt_y},  # GT (Gutter Top)
        outer_corners[1],  # TR
        outer_corners[2],  # BR  
        {'x': gutter_x_norm, 'y': gb_y},  # GB (Gutter Bottom)
        outer_corners[3],  # BL
    ]


@api_router.post("/images/detect-edges")
async def detect_edges_endpoint(request: EdgeDetectionRequest):
    """
    Real-time edge detection for document scanning.
    
    Returns detected corner points for:
    - document mode: 4 points [TL, TR, BR, BL]
    - book mode: 6 points [TL, GT, TR, BR, GB, BL]
    - id_card mode: 4 points [TL, TR, BR, BL]
    
    All points are normalized to 0-1 range.
    """
    try:
        # Decode image
        img_data = request.image_base64
        if "," in img_data:
            img_data = img_data.split(",")[1]
        
        image_bytes = base64.b64decode(img_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"success": False, "message": "Could not decode image"}
        
        height, width = img.shape[:2]
        
        if request.mode == "book":
            points = detect_book_edges(img)
            point_count = 6
        else:
            points = detect_document_edges(img)
            point_count = 4
        
        if points and len(points) == point_count:
            return {
                "success": True,
                "points": points,
                "image_size": {"width": width, "height": height}
            }
        else:
            return {
                "success": False,
                "message": "Document edges not clearly detected"
            }
            
    except Exception as e:
        logger.error(f"[EdgeDetect] Error: {e}")
        return {
            "success": False,
            "message": str(e)
        }


@api_router.post("/images/perspective-crop-public")
async def public_perspective_crop(request: ManualCropRequest):
    """
    Public endpoint for perspective crop - no authentication required.
    Used for guest mode scanning.
    Handles EXIF orientation and applies perspective transform.
    """
    try:
        # Decode image
        if "," in request.image_base64:
            img_data = request.image_base64.split(",")[1]
        else:
            img_data = request.image_base64
            
        image_bytes = base64.b64decode(img_data)
        
        # Fix EXIF orientation FIRST using PIL
        corrected_bytes, was_rotated, orientation = fix_image_orientation_pil(image_bytes)
        logger.info(f"[Public] EXIF orientation: {orientation}, was_rotated: {was_rotated}")
        
        # Decode the corrected image with OpenCV
        nparr = np.frombuffer(corrected_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"success": False, "cropped_image_base64": request.image_base64, "message": "Could not decode image"}
        
        height, width = img.shape[:2]
        logger.info(f"[Public] Image dimensions after EXIF fix: {width}x{height}")
        
        # Handle Android cameras that don't set EXIF properly
        # If image is landscape (width > height) and force_portrait is True, rotate it
        if request.force_portrait and width > height:
            logger.info(f"[Public] Force portrait: rotating landscape image 90° CCW")
            img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
            height, width = img.shape[:2]
            # Re-encode the rotated image
            _, corrected_buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 95])
            corrected_bytes = corrected_buffer.tobytes()
            logger.info(f"[Public] New dimensions after forced portrait: {width}x{height}")
        
        # Convert normalized corners to pixel coordinates
        pixel_corners = []
        for corner in request.corners:
            px = float(corner.get('x', 0)) * width
            py = float(corner.get('y', 0)) * height
            pixel_corners.append({'x': px, 'y': py})
        
        # Re-encode and apply perspective crop
        corrected_base64 = base64.b64encode(corrected_bytes).decode()
        cropped = perspective_crop(corrected_base64, pixel_corners)
        
        return {
            "success": True,
            "cropped_image_base64": cropped
        }
    except Exception as e:
        logger.error(f"[Public] Manual crop error: {e}")
        return {
            "success": False,
            "cropped_image_base64": request.image_base64,
            "message": str(e)
        }

# ==================== OCR ENDPOINTS ====================

@api_router.post("/ocr/extract", response_model=OCRResponse)
async def extract_text(
    ocr_request: OCRRequest,
    current_user: User = Depends(get_current_user)
):
    """Extract text from image using OpenAI Vision OCR"""
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
    
    # Perform actual OCR using Emergent LLM
    extracted_text = await perform_ocr_with_openai(ocr_request.image_base64)
    
    return OCRResponse(
        text=extracted_text,
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

# ==================== SIGNATURE ENDPOINTS ====================

class SignatureOverlayRequest(BaseModel):
    image_base64: str
    signature_base64: str
    position_x: float  # Normalized 0-1 position from left
    position_y: float  # Normalized 0-1 position from top
    scale: float = 0.3  # Signature scale relative to image width

@api_router.post("/images/add-signature")
async def add_signature_to_image(
    request: SignatureOverlayRequest,
    current_user: User = Depends(get_current_user)
):
    """Overlay a signature on an image at the specified position"""
    try:
        from PIL import Image
        import io
        
        # Decode base image
        img_data = request.image_base64
        if ',' in img_data:
            img_data = img_data.split(',')[1]
        
        image_bytes = base64.b64decode(img_data)
        base_image = Image.open(io.BytesIO(image_bytes)).convert('RGBA')
        
        # Decode signature image
        sig_data = request.signature_base64
        if ',' in sig_data:
            sig_data = sig_data.split(',')[1]
        
        sig_bytes = base64.b64decode(sig_data)
        signature = Image.open(io.BytesIO(sig_bytes)).convert('RGBA')
        
        # Calculate signature size
        sig_width = int(base_image.width * request.scale)
        sig_height = int(signature.height * (sig_width / signature.width))
        signature = signature.resize((sig_width, sig_height), Image.Resampling.LANCZOS)
        
        # Calculate position
        pos_x = int(request.position_x * base_image.width - sig_width / 2)
        pos_y = int(request.position_y * base_image.height - sig_height / 2)
        
        # Clamp to bounds
        pos_x = max(0, min(base_image.width - sig_width, pos_x))
        pos_y = max(0, min(base_image.height - sig_height, pos_y))
        
        # Create composite
        composite = base_image.copy()
        composite.paste(signature, (pos_x, pos_y), signature)
        
        # Convert back to RGB for JPEG
        if composite.mode == 'RGBA':
            background = Image.new('RGB', composite.size, (255, 255, 255))
            background.paste(composite, mask=composite.split()[3])
            composite = background
        
        # Encode result
        buffer = io.BytesIO()
        composite.save(buffer, format='JPEG', quality=95)
        result_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        logger.info(f"Signature added at ({pos_x}, {pos_y}) with scale {request.scale}")
        
        return {
            "success": True,
            "signed_image_base64": result_base64,
            "message": "Signature added successfully"
        }
        
    except Exception as e:
        logger.error(f"Signature overlay error: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to add signature: {str(e)}"
        }

# ==================== EXPORT ENDPOINTS ====================

class ExportRequest(BaseModel):
    format: str  # pdf, jpeg, docx, xlsx
    page_indices: Optional[List[int]] = None  # None means all pages
    include_ocr: bool = False

class ExportResponse(BaseModel):
    file_base64: str
    filename: str
    mime_type: str

def create_pdf_from_images(images_base64: List[str], include_text: List[str] = None) -> bytes:
    """Create a PDF from base64 images"""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    for i, img_base64 in enumerate(images_base64):
        if "," in img_base64:
            img_base64 = img_base64.split(",")[1]
        
        img_data = base64.b64decode(img_base64)
        img = Image.open(BytesIO(img_data))
        
        # Calculate scaling to fit A4
        img_width, img_height = img.size
        scale = min(width / img_width, height / img_height) * 0.9  # 90% of page
        new_width = img_width * scale
        new_height = img_height * scale
        
        # Center image on page
        x = (width - new_width) / 2
        y = (height - new_height) / 2
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        img_buffer = BytesIO()
        img.save(img_buffer, format='JPEG', quality=90)
        img_buffer.seek(0)
        
        c.drawImage(ImageReader(img_buffer), x, y, new_width, new_height)
        
        # Add OCR text if available
        if include_text and i < len(include_text) and include_text[i]:
            c.setFont("Helvetica", 8)
            text_y = 30
            for line in include_text[i].split('\n')[:5]:  # First 5 lines as footer
                c.drawString(40, text_y, line[:80])  # Truncate long lines
                text_y -= 10
        
        if i < len(images_base64) - 1:
            c.showPage()
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

def create_docx_from_text(texts: List[str], title: str) -> bytes:
    """Create a Word document from OCR text"""
    from docx import Document as DocxDocument
    from docx.shared import Pt, Inches
    
    doc = DocxDocument()
    doc.add_heading(title, 0)
    
    for i, text in enumerate(texts):
        if i > 0:
            doc.add_page_break()
        
        doc.add_heading(f'Page {i + 1}', level=1)
        
        if text:
            paragraphs = text.split('\n\n')
            for para in paragraphs:
                if para.strip():
                    p = doc.add_paragraph(para.strip())
                    p.style.font.size = Pt(11)
        else:
            doc.add_paragraph('(No text extracted for this page)')
    
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()

def create_xlsx_from_text(texts: List[str], title: str) -> bytes:
    """Create an Excel document from OCR text"""
    from openpyxl import Workbook
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Extracted Text"
    
    # Header
    ws['A1'] = 'Page'
    ws['B1'] = 'Extracted Text'
    ws.column_dimensions['A'].width = 10
    ws.column_dimensions['B'].width = 100
    
    row = 2
    for i, text in enumerate(texts):
        ws.cell(row=row, column=1, value=f'Page {i + 1}')
        ws.cell(row=row, column=2, value=text or '(No text)')
        row += 1
    
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()

@api_router.post("/documents/{document_id}/export", response_model=ExportResponse)
async def export_document(
    document_id: str,
    export_request: ExportRequest,
    current_user: User = Depends(get_current_user)
):
    """Export document in various formats"""
    document = await db.documents.find_one(
        {"document_id": document_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    pages = document.get("pages", [])
    page_indices = export_request.page_indices or list(range(len(pages)))
    
    # Filter pages
    selected_pages = [pages[i] for i in page_indices if i < len(pages)]
    
    if not selected_pages:
        raise HTTPException(status_code=400, detail="No pages to export")
    
    doc_name = document.get("name", "document").replace(" ", "_")
    format_type = export_request.format.lower()
    
    try:
        if format_type == "pdf":
            images = [p.get("image_base64", "") for p in selected_pages]
            texts = [p.get("ocr_text", "") for p in selected_pages] if export_request.include_ocr else None
            
            pdf_bytes = create_pdf_from_images(images, texts)
            
            return ExportResponse(
                file_base64=base64.b64encode(pdf_bytes).decode(),
                filename=f"{doc_name}.pdf",
                mime_type="application/pdf"
            )
        
        elif format_type == "jpeg":
            # Export single page or first page as JPEG
            page = selected_pages[0]
            img_base64 = page.get("image_base64", "")
            if "," in img_base64:
                img_base64 = img_base64.split(",")[1]
            
            return ExportResponse(
                file_base64=img_base64,
                filename=f"{doc_name}_page1.jpg",
                mime_type="image/jpeg"
            )
        
        elif format_type == "docx":
            if not export_request.include_ocr:
                raise HTTPException(status_code=400, detail="DOCX export requires OCR text. Set include_ocr=true")
            
            texts = [p.get("ocr_text", "") for p in selected_pages]
            docx_bytes = create_docx_from_text(texts, document.get("name", "Document"))
            
            return ExportResponse(
                file_base64=base64.b64encode(docx_bytes).decode(),
                filename=f"{doc_name}.docx",
                mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
        
        elif format_type == "xlsx":
            if not export_request.include_ocr:
                raise HTTPException(status_code=400, detail="XLSX export requires OCR text. Set include_ocr=true")
            
            texts = [p.get("ocr_text", "") for p in selected_pages]
            xlsx_bytes = create_xlsx_from_text(texts, document.get("name", "Document"))
            
            return ExportResponse(
                file_base64=base64.b64encode(xlsx_bytes).decode(),
                filename=f"{doc_name}.xlsx",
                mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format_type}")
            
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

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

@app.on_event("startup")
async def startup_db_client():
    """Initialize MongoDB collections on startup"""
    try:
        # Test connection with shorter timeout
        await client.admin.command('ping')
        logger.info(f"✅ Connected to MongoDB Atlas: {os.environ.get('DB_NAME', 'scanup')}")
        
        # Get list of existing collections
        existing_collections = await db.list_collection_names()
        logger.info(f"📋 Existing collections: {existing_collections}")
        
        # Define required collections with their indexes
        required_collections = {
            'users': [
                ('user_id', True),  # (field, unique)
                ('email', True),
            ],
            'documents': [
                ('document_id', True),
                ('user_id', False),
            ],
            'folders': [
                ('folder_id', True),
                ('user_id', False),
            ],
            'signatures': [
                ('signature_id', True),
                ('user_id', False),
            ],
        }
        
        for collection_name, indexes in required_collections.items():
            if collection_name not in existing_collections:
                # Create collection
                await db.create_collection(collection_name)
                logger.info(f"✅ Created collection: {collection_name}")
            
            # Create indexes
            collection = db[collection_name]
            for field, unique in indexes:
                try:
                    await collection.create_index(field, unique=unique)
                    logger.info(f"  📌 Index on {collection_name}.{field} (unique={unique})")
                except Exception as idx_err:
                    logger.warning(f"  ⚠️ Index {field} might already exist: {idx_err}")
        
        logger.info("✅ MongoDB collections initialized successfully")
        
    except Exception as e:
        logger.warning(f"⚠️ MongoDB Atlas connection issue (will retry on demand): {e}")
        # Don't raise - let app start and handle DB errors at request time

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM key for OCR
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

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
    Apply perspective transform to crop document.
    
    Args:
        image_base64: Base64 encoded image
        corners: List of 4 corner points in order [TL, TR, BR, BL]
                 Can be in pixel coordinates or will be auto-ordered
    
    Returns:
        Base64 encoded cropped image
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
        
        # Calculate output dimensions using float for precision
        width_top = np.sqrt(
            (ordered_corners[1]["x"] - ordered_corners[0]["x"])**2 + 
            (ordered_corners[1]["y"] - ordered_corners[0]["y"])**2
        )
        width_bottom = np.sqrt(
            (ordered_corners[2]["x"] - ordered_corners[3]["x"])**2 + 
            (ordered_corners[2]["y"] - ordered_corners[3]["y"])**2
        )
        output_width = max(width_top, width_bottom)
        
        height_left = np.sqrt(
            (ordered_corners[3]["x"] - ordered_corners[0]["x"])**2 + 
            (ordered_corners[3]["y"] - ordered_corners[0]["y"])**2
        )
        height_right = np.sqrt(
            (ordered_corners[2]["x"] - ordered_corners[1]["x"])**2 + 
            (ordered_corners[2]["y"] - ordered_corners[1]["y"])**2
        )
        output_height = max(height_left, height_right)
        
        # Ensure minimum dimensions and convert to int only at the end
        output_width = max(int(round(output_width)), 100)
        output_height = max(int(round(output_height)), 100)
        
        # Destination points - standard rectangle
        dst_pts = np.float32([
            [0, 0],
            [output_width - 1, 0],
            [output_width - 1, output_height - 1],
            [0, output_height - 1]
        ])
        
        # Get perspective transform matrix
        matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
        
        # Apply perspective transform with high-quality interpolation
        warped = cv2.warpPerspective(
            img, 
            matrix, 
            (output_width, output_height),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255)
        )
        
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
    
    # Process pages - create thumbnails, add watermark for free users
    processed_pages = []
    for i, page in enumerate(doc_data.pages):
        page_dict = page.dict()
        page_dict["order"] = i
        
        # Add watermark for free users
        image_base64 = page.image_base64
        if not is_premium:
            image_base64 = add_watermark(image_base64, "ScanUp")
            page_dict["image_base64"] = image_base64
        
        page_dict["thumbnail_base64"] = create_thumbnail(image_base64)
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
        "has_watermark": not is_premium,  # Track watermark status
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

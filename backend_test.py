#!/usr/bin/env python3
"""
Backend API Testing for ScanUp Document Scanner App
Focus: Document Export API and Perspective Crop functionality
"""

import requests
import json
import base64
import uuid
from datetime import datetime
import sys
import os

# Test configuration
BASE_URL = "https://scanappsaver.preview.emergentagent.com/api"
TEST_USER_EMAIL = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "TestPassword123!"
TEST_USER_NAME = "Test User"

# Sample base64 image for testing (small 100x100 white square)
SAMPLE_IMAGE_BASE64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=="

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def add_pass(self, test_name):
        self.passed += 1
        print(f"✅ {test_name}")
        
    def add_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ {test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n=== TEST SUMMARY ===")
        print(f"Total tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        if self.errors:
            print(f"\nErrors:")
            for error in self.errors:
                print(f"  - {error}")
        return self.failed == 0

def create_realistic_document_image():
    """Create a more realistic document image for testing"""
    from PIL import Image, ImageDraw, ImageFont
    import io
    
    # Create a white document-like image
    width, height = 800, 600
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)
    
    # Add some text-like content
    try:
        # Try to use default font
        font = ImageFont.load_default()
    except:
        font = None
    
    # Draw some lines to simulate text
    for i in range(10):
        y = 50 + i * 40
        draw.rectangle([50, y, 700, y + 20], fill='black')
        draw.rectangle([50, y + 25, 500, y + 35], fill='black')
    
    # Add a border
    draw.rectangle([40, 40, width-40, height-40], outline='black', width=2)
    
    # Convert to base64
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=90)
    return base64.b64encode(buffer.getvalue()).decode()

def test_user_registration(results):
    """Test user registration"""
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                results.add_pass("User Registration")
                return data["token"]
            else:
                results.add_fail("User Registration", "Missing token or user in response")
                return None
        else:
            results.add_fail("User Registration", f"Status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.add_fail("User Registration", str(e))
        return None

def test_create_document(token, results):
    """Create a test document with sample pages"""
    try:
        # Create a realistic document image
        document_image = create_realistic_document_image()
        
        headers = {"Authorization": f"Bearer {token}"}
        document_data = {
            "name": "Test Document for Export",
            "tags": ["test", "export"],
            "pages": [
                {
                    "image_base64": document_image,
                    "ocr_text": "This is sample OCR text from page 1. It contains important information for testing export functionality.",
                    "filter_applied": "original",
                    "rotation": 0,
                    "order": 0
                },
                {
                    "image_base64": document_image,
                    "ocr_text": "This is sample OCR text from page 2. Second page content for multi-page export testing.",
                    "filter_applied": "enhanced",
                    "rotation": 0,
                    "order": 1
                }
            ]
        }
        
        response = requests.post(f"{BASE_URL}/documents", json=document_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "document_id" in data:
                results.add_pass("Document Creation")
                return data["document_id"]
            else:
                results.add_fail("Document Creation", "Missing document_id in response")
                return None
        else:
            results.add_fail("Document Creation", f"Status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.add_fail("Document Creation", str(e))
        return None

def test_export_pdf(token, document_id, results):
    """Test PDF export functionality"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        export_data = {
            "document_id": document_id,
            "format": "pdf",
            "include_ocr": True
        }
        
        response = requests.post(f"{BASE_URL}/documents/{document_id}/export", json=export_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "file_base64" in data and "mime_type" in data:
                if data["mime_type"] == "application/pdf":
                    # Verify the base64 data is valid
                    try:
                        pdf_data = base64.b64decode(data["file_base64"])
                        if pdf_data.startswith(b'%PDF'):
                            results.add_pass("Export PDF")
                            return True
                        else:
                            results.add_fail("Export PDF", "Invalid PDF data - missing PDF header")
                            return False
                    except Exception as decode_error:
                        results.add_fail("Export PDF", f"Invalid base64 data: {decode_error}")
                        return False
                else:
                    results.add_fail("Export PDF", f"Wrong mime type: {data['mime_type']}")
                    return False
            else:
                results.add_fail("Export PDF", "Missing file_base64 or mime_type in response")
                return False
        else:
            results.add_fail("Export PDF", f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        results.add_fail("Export PDF", str(e))
        return False

def test_export_jpeg(token, document_id, results):
    """Test JPEG export functionality"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        export_data = {
            "document_id": document_id,
            "format": "jpeg"
        }
        
        response = requests.post(f"{BASE_URL}/documents/{document_id}/export", json=export_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "file_base64" in data and "mime_type" in data:
                if data["mime_type"] == "image/jpeg":
                    # Verify the base64 data is valid JPEG
                    try:
                        jpeg_data = base64.b64decode(data["file_base64"])
                        if jpeg_data.startswith(b'\xff\xd8\xff'):
                            results.add_pass("Export JPEG")
                            return True
                        else:
                            results.add_fail("Export JPEG", "Invalid JPEG data - missing JPEG header")
                            return False
                    except Exception as decode_error:
                        results.add_fail("Export JPEG", f"Invalid base64 data: {decode_error}")
                        return False
                else:
                    results.add_fail("Export JPEG", f"Wrong mime type: {data['mime_type']}")
                    return False
            else:
                results.add_fail("Export JPEG", "Missing file_base64 or mime_type in response")
                return False
        else:
            results.add_fail("Export JPEG", f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        results.add_fail("Export JPEG", str(e))
        return False

def test_perspective_crop(token, results):
    """Test perspective crop with normalized coordinates"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create test image
        test_image = create_realistic_document_image()
        
        # Test with normalized corners (0-1 range)
        crop_data = {
            "image_base64": test_image,
            "corners": [
                {"x": 0.1, "y": 0.1},  # top-left
                {"x": 0.9, "y": 0.1},  # top-right
                {"x": 0.9, "y": 0.9},  # bottom-right
                {"x": 0.1, "y": 0.9}   # bottom-left
            ]
        }
        
        response = requests.post(f"{BASE_URL}/images/perspective-crop", json=crop_data, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "success" in data and data["success"]:
                if "cropped_image_base64" in data:
                    # Verify the returned image is valid
                    try:
                        cropped_data = base64.b64decode(data["cropped_image_base64"])
                        if cropped_data.startswith(b'\xff\xd8\xff'):
                            results.add_pass("Perspective Crop with Normalized Coordinates")
                            return True
                        else:
                            results.add_fail("Perspective Crop", "Invalid cropped image data")
                            return False
                    except Exception as decode_error:
                        results.add_fail("Perspective Crop", f"Invalid base64 data: {decode_error}")
                        return False
                else:
                    results.add_fail("Perspective Crop", "Missing cropped_image_base64 in response")
                    return False
            else:
                results.add_fail("Perspective Crop", f"Crop failed: {data.get('message', 'Unknown error')}")
                return False
        else:
            results.add_fail("Perspective Crop", f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        results.add_fail("Perspective Crop", str(e))
        return False

def test_edge_cases(token, document_id, results):
    """Test edge cases and error handling"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test invalid document ID for export
    try:
        response = requests.post(f"{BASE_URL}/documents/invalid_doc_id/export", 
                               json={"document_id": "invalid", "format": "pdf"}, 
                               headers=headers)
        if response.status_code == 404:
            results.add_pass("Export with Invalid Document ID (404 Error)")
        else:
            results.add_fail("Export with Invalid Document ID", f"Expected 404, got {response.status_code}")
    except Exception as e:
        results.add_fail("Export with Invalid Document ID", str(e))
    
    # Test invalid format
    try:
        response = requests.post(f"{BASE_URL}/documents/{document_id}/export", 
                               json={"document_id": document_id, "format": "invalid_format"}, 
                               headers=headers)
        if response.status_code == 400:
            results.add_pass("Export with Invalid Format (400 Error)")
        else:
            results.add_fail("Export with Invalid Format", f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.add_fail("Export with Invalid Format", str(e))
    
    # Test perspective crop with invalid corners
    try:
        response = requests.post(f"{BASE_URL}/images/perspective-crop", 
                               json={"image_base64": "invalid_base64", "corners": []}, 
                               headers=headers)
        # Should handle gracefully
        if response.status_code in [200, 400]:
            results.add_pass("Perspective Crop with Invalid Data (Graceful Handling)")
        else:
            results.add_fail("Perspective Crop with Invalid Data", f"Unexpected status {response.status_code}")
    except Exception as e:
        results.add_fail("Perspective Crop with Invalid Data", str(e))

def main():
    """Main test execution"""
    print("🚀 Starting ScanUp Document Export API Tests")
    print(f"Testing against: {BASE_URL}")
    print("=" * 60)
    
    results = TestResults()
    
    # Step 1: Register user
    print("\n📝 Step 1: User Registration")
    token = test_user_registration(results)
    if not token:
        print("❌ Cannot proceed without authentication token")
        return False
    
    # Step 2: Create document
    print("\n📄 Step 2: Document Creation")
    document_id = test_create_document(token, results)
    if not document_id:
        print("❌ Cannot proceed without document")
        return False
    
    print(f"✅ Created document with ID: {document_id}")
    
    # Step 3: Test Export PDF
    print("\n📋 Step 3: Testing PDF Export")
    test_export_pdf(token, document_id, results)
    
    # Step 4: Test Export JPEG
    print("\n🖼️ Step 4: Testing JPEG Export")
    test_export_jpeg(token, document_id, results)
    
    # Step 5: Test Perspective Crop
    print("\n✂️ Step 5: Testing Perspective Crop")
    test_perspective_crop(token, results)
    
    # Step 6: Test Edge Cases
    print("\n⚠️ Step 6: Testing Edge Cases")
    test_edge_cases(token, document_id, results)
    
    # Final Results
    print("\n" + "=" * 60)
    success = results.summary()
    
    if success:
        print("🎉 All tests passed!")
    else:
        print("⚠️ Some tests failed. Check the details above.")
    
    return success

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {e}")
        sys.exit(1)
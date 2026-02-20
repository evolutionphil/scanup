#!/usr/bin/env python3
"""
Comprehensive test suite for the /api/images/perspective-crop endpoint
Testing document scanner app perspective transformation functionality
"""

import requests
import base64
import json
import os
import sys
from io import BytesIO
from PIL import Image, ImageDraw
import numpy as np
import uuid

# Test configuration
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://scanup-fixes-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class PerspectiveCropTester:
    def __init__(self):
        self.auth_token = None
        self.test_results = []
        
    def setup(self):
        """Setup test environment - register user and get auth token"""
        print("🔧 Setting up test environment...")
        
        # Register a test user
        register_data = {
            "email": f"perspective.test.{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass123!",
            "name": "Perspective Test User"
        }
        
        try:
            response = requests.post(f"{API_BASE}/auth/register", json=register_data, timeout=30)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token")
                print(f"✅ User registered successfully")
            elif response.status_code == 400 and "already registered" in response.text:
                # Try login instead
                login_data = {"email": register_data["email"], "password": register_data["password"]}
                response = requests.post(f"{API_BASE}/auth/login", json=login_data, timeout=30)
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data.get("token")
                    print(f"✅ User logged in successfully")
                else:
                    print(f"❌ Login failed: {response.status_code} - {response.text}")
                    return False
            else:
                print(f"❌ Registration failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Setup error: {e}")
            return False
            
        return self.auth_token is not None
    
    def create_test_image(self, width=800, height=600, add_document=True):
        """Create a test image with optional document-like content"""
        # Create a white background
        img = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(img)
        
        if add_document:
            # Add a document-like rectangle with some content
            doc_margin = 50
            draw.rectangle([doc_margin, doc_margin, width-doc_margin, height-doc_margin], 
                         outline='black', width=2)
            
            # Add some text-like lines
            for i in range(5):
                y = doc_margin + 30 + (i * 40)
                draw.rectangle([doc_margin + 20, y, width - doc_margin - 20, y + 15], 
                             fill='lightgray')
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=95)
        return base64.b64encode(buffer.getvalue()).decode()
    
    def create_rotated_test_image(self, rotation_angle=15):
        """Create a rotated document image for testing perspective correction"""
        # Create base image
        img = Image.new('RGB', (800, 600), 'lightblue')
        draw = ImageDraw.Draw(img)
        
        # Create a white document in the center
        doc_width, doc_height = 400, 300
        center_x, center_y = 400, 300
        
        # Calculate rotated corners
        corners = [
            (-doc_width//2, -doc_height//2),
            (doc_width//2, -doc_height//2),
            (doc_width//2, doc_height//2),
            (-doc_width//2, doc_height//2)
        ]
        
        # Rotate corners
        angle_rad = np.radians(rotation_angle)
        cos_a, sin_a = np.cos(angle_rad), np.sin(angle_rad)
        
        rotated_corners = []
        for x, y in corners:
            new_x = x * cos_a - y * sin_a + center_x
            new_y = x * sin_a + y * cos_a + center_y
            rotated_corners.append((new_x, new_y))
        
        # Draw the rotated document
        draw.polygon(rotated_corners, fill='white', outline='black', width=3)
        
        # Add some content lines
        for i in range(3):
            line_y = center_y - 50 + (i * 30)
            line_start = (center_x - 150, line_y)
            line_end = (center_x + 150, line_y)
            draw.line([line_start, line_end], fill='gray', width=2)
        
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=95)
        return base64.b64encode(buffer.getvalue()).decode(), rotated_corners
    
    def test_basic_functionality(self):
        """Test basic perspective crop functionality"""
        print("\n📋 Testing Basic Functionality...")
        
        # Test 1: Valid image with properly ordered corners
        test_image = self.create_test_image()
        corners = [
            {"x": 0.1, "y": 0.1},  # TL
            {"x": 0.9, "y": 0.1},  # TR
            {"x": 0.9, "y": 0.9},  # BR
            {"x": 0.1, "y": 0.9}   # BL
        ]
        
        self.call_perspective_crop(test_image, corners, "Basic crop with proper corners")
        
        # Test 2: Full image corners (0,0 to 1,1)
        full_corners = [
            {"x": 0.0, "y": 0.0},
            {"x": 1.0, "y": 0.0},
            {"x": 1.0, "y": 1.0},
            {"x": 0.0, "y": 1.0}
        ]
        
        self.call_perspective_crop(test_image, full_corners, "Full image crop (0,0 to 1,1)")
        
        # Test 3: Center portion crop
        center_corners = [
            {"x": 0.2, "y": 0.2},
            {"x": 0.8, "y": 0.2},
            {"x": 0.8, "y": 0.8},
            {"x": 0.2, "y": 0.8}
        ]
        
        self.call_perspective_crop(test_image, center_corners, "Center portion crop (0.2,0.2 to 0.8,0.8)")
    
    def test_edge_cases(self):
        """Test edge case scenarios"""
        print("\n🔍 Testing Edge Cases...")
        
        test_image = self.create_test_image()
        
        # Test 1: Corners very close to edges
        edge_corners = [
            {"x": 0.01, "y": 0.01},
            {"x": 0.99, "y": 0.01},
            {"x": 0.99, "y": 0.99},
            {"x": 0.01, "y": 0.99}
        ]
        
        self.call_perspective_crop(test_image, edge_corners, "Corners close to edges (0.01, 0.99)")
        
        # Test 2: Non-rectangular quadrilateral (trapezoid)
        trapezoid_corners = [
            {"x": 0.2, "y": 0.1},   # TL
            {"x": 0.8, "y": 0.1},   # TR
            {"x": 0.9, "y": 0.9},   # BR (wider bottom)
            {"x": 0.1, "y": 0.9}    # BL (wider bottom)
        ]
        
        self.call_perspective_crop(test_image, trapezoid_corners, "Trapezoid shape (non-rectangular)")
        
        # Test 3: Rotated/skewed corners
        skewed_corners = [
            {"x": 0.15, "y": 0.05},  # TL slightly right
            {"x": 0.85, "y": 0.15},  # TR slightly down
            {"x": 0.95, "y": 0.85},  # BR slightly right
            {"x": 0.05, "y": 0.95}   # BL slightly down
        ]
        
        self.call_perspective_crop(test_image, skewed_corners, "Skewed/rotated corners")
    
    def test_corner_order_validation(self):
        """Test corner order handling"""
        print("\n🔄 Testing Corner Order Validation...")
        
        test_image = self.create_test_image()
        
        # Test 1: Correct order (TL, TR, BR, BL)
        correct_order = [
            {"x": 0.1, "y": 0.1},  # TL
            {"x": 0.9, "y": 0.1},  # TR
            {"x": 0.9, "y": 0.9},  # BR
            {"x": 0.1, "y": 0.9}   # BL
        ]
        
        result1 = self.call_perspective_crop(test_image, correct_order, "Correct order (TL, TR, BR, BL)")
        
        # Test 2: Wrong order (BR, TL, BL, TR)
        wrong_order = [
            {"x": 0.9, "y": 0.9},  # BR
            {"x": 0.1, "y": 0.1},  # TL
            {"x": 0.1, "y": 0.9},  # BL
            {"x": 0.9, "y": 0.1}   # TR
        ]
        
        result2 = self.call_perspective_crop(test_image, wrong_order, "Wrong order (BR, TL, BL, TR)")
        
        # Test 3: Random order
        random_order = [
            {"x": 0.9, "y": 0.1},  # TR
            {"x": 0.1, "y": 0.9},  # BL
            {"x": 0.1, "y": 0.1},  # TL
            {"x": 0.9, "y": 0.9}   # BR
        ]
        
        result3 = self.call_perspective_crop(test_image, random_order, "Random order (TR, BL, TL, BR)")
        
        # Compare results - they should be similar regardless of input order
        if result1 and result2 and result3:
            print("✅ Corner reordering appears to work - all orders produced results")
        else:
            print("❌ Corner reordering may have issues")
    
    def test_quality_validation(self):
        """Test output quality and format validation"""
        print("\n🎯 Testing Quality Validation...")
        
        test_image = self.create_test_image()
        corners = [
            {"x": 0.1, "y": 0.1},
            {"x": 0.9, "y": 0.1},
            {"x": 0.9, "y": 0.9},
            {"x": 0.1, "y": 0.9}
        ]
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        request_data = {
            "image_base64": test_image,
            "corners": corners
        }
        
        try:
            response = requests.post(
                f"{API_BASE}/images/perspective-crop",
                json=request_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                has_success = "success" in data
                has_cropped_image = "cropped_image_base64" in data
                success_value = data.get("success")
                
                print(f"✅ Response structure check:")
                print(f"   - Has 'success' field: {has_success}")
                print(f"   - Success value: {success_value}")
                print(f"   - Has 'cropped_image_base64' field: {has_cropped_image}")
                
                if has_cropped_image and data.get("cropped_image_base64"):
                    # Validate base64 image
                    try:
                        cropped_b64 = data["cropped_image_base64"]
                        if "," in cropped_b64:
                            cropped_b64 = cropped_b64.split(",")[1]
                        
                        image_data = base64.b64decode(cropped_b64)
                        img = Image.open(BytesIO(image_data))
                        
                        print(f"✅ Image validation:")
                        print(f"   - Valid base64: Yes")
                        print(f"   - Image format: {img.format}")
                        print(f"   - Image size: {img.size}")
                        print(f"   - Image mode: {img.mode}")
                        
                        # Check if it's JPEG at good quality (file size should be reasonable)
                        file_size = len(image_data)
                        print(f"   - File size: {file_size} bytes")
                        
                        if img.format == 'JPEG':
                            print("✅ Output is JPEG format as expected")
                        else:
                            print(f"⚠️ Output is {img.format}, expected JPEG")
                            
                        self.test_results.append({
                            "test": "Quality validation",
                            "status": "PASS",
                            "details": f"Valid {img.format} image {img.size}, {file_size} bytes"
                        })
                        
                    except Exception as e:
                        print(f"❌ Image validation failed: {e}")
                        self.test_results.append({
                            "test": "Quality validation",
                            "status": "FAIL",
                            "details": f"Invalid base64 image: {e}"
                        })
                else:
                    print("❌ No cropped image in response")
                    self.test_results.append({
                        "test": "Quality validation",
                        "status": "FAIL",
                        "details": "No cropped_image_base64 in response"
                    })
            else:
                print(f"❌ Quality test failed: {response.status_code} - {response.text}")
                self.test_results.append({
                    "test": "Quality validation",
                    "status": "FAIL",
                    "details": f"HTTP {response.status_code}: {response.text}"
                })
                
        except Exception as e:
            print(f"❌ Quality test error: {e}")
            self.test_results.append({
                "test": "Quality validation",
                "status": "FAIL",
                "details": f"Exception: {e}"
            })
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n🚨 Testing Error Handling...")
        
        # Test 1: Missing corners
        test_image = self.create_test_image()
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        request_data = {
            "image_base64": test_image
            # Missing corners field
        }
        
        try:
            response = requests.post(
                f"{API_BASE}/images/perspective-crop",
                json=request_data,
                headers=headers,
                timeout=30
            )
            print(f"Missing corners test: {response.status_code} - {response.text[:200]}")
            
            if response.status_code == 422:  # Validation error expected
                print("✅ Missing corners properly rejected with validation error")
            else:
                print(f"⚠️ Unexpected response for missing corners: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Missing corners test error: {e}")
        
        # Test 2: Invalid corner values (negative)
        invalid_corners_negative = [
            {"x": -0.1, "y": 0.1},  # Negative x
            {"x": 0.9, "y": 0.1},
            {"x": 0.9, "y": 0.9},
            {"x": 0.1, "y": 0.9}
        ]
        
        self.call_perspective_crop(test_image, invalid_corners_negative, "Invalid corners (negative values)")
        
        # Test 3: Invalid corner values (>1)
        invalid_corners_large = [
            {"x": 0.1, "y": 0.1},
            {"x": 1.5, "y": 0.1},  # > 1
            {"x": 0.9, "y": 0.9},
            {"x": 0.1, "y": 0.9}
        ]
        
        self.call_perspective_crop(test_image, invalid_corners_large, "Invalid corners (values > 1)")
        
        # Test 4: Invalid base64 image
        invalid_corners = [
            {"x": 0.1, "y": 0.1},
            {"x": 0.9, "y": 0.1},
            {"x": 0.9, "y": 0.9},
            {"x": 0.1, "y": 0.9}
        ]
        
        self.call_perspective_crop("invalid_base64_data", invalid_corners, "Invalid base64 image")
        
        # Test 5: No authentication
        try:
            request_data = {
                "image_base64": test_image,
                "corners": invalid_corners
            }
            
            response = requests.post(
                f"{API_BASE}/images/perspective-crop",
                json=request_data,
                timeout=30
                # No headers (no auth)
            )
            
            print(f"No auth test: {response.status_code} - {response.text[:200]}")
            
            if response.status_code == 401:
                print("✅ No authentication properly rejected with 401")
            else:
                print(f"⚠️ Unexpected response for no auth: {response.status_code}")
                
        except Exception as e:
            print(f"❌ No auth test error: {e}")
    
    def test_exif_orientation(self):
        """Test EXIF orientation handling"""
        print("\n📐 Testing EXIF Orientation Handling...")
        
        # Create a test image and add some EXIF data
        # Note: This is a basic test - real EXIF testing would require actual camera images
        test_image = self.create_test_image(600, 800)  # Portrait orientation
        corners = [
            {"x": 0.1, "y": 0.1},
            {"x": 0.9, "y": 0.1},
            {"x": 0.9, "y": 0.9},
            {"x": 0.1, "y": 0.9}
        ]
        
        result = self.call_perspective_crop(test_image, corners, "Portrait image (EXIF orientation test)")
        
        if result:
            print("✅ Portrait image processed successfully")
            print("ℹ️ Note: Full EXIF testing requires real camera images with orientation metadata")
    
    def test_various_aspect_ratios(self):
        """Test various aspect ratio inputs"""
        print("\n📏 Testing Various Aspect Ratios...")
        
        # Test different aspect ratios
        test_cases = [
            (400, 600, "Portrait 2:3"),
            (600, 400, "Landscape 3:2"),
            (800, 800, "Square 1:1"),
            (1200, 400, "Wide 3:1"),
            (400, 1200, "Tall 1:3")
        ]
        
        corners = [
            {"x": 0.1, "y": 0.1},
            {"x": 0.9, "y": 0.1},
            {"x": 0.9, "y": 0.9},
            {"x": 0.1, "y": 0.9}
        ]
        
        for width, height, description in test_cases:
            test_image = self.create_test_image(width, height)
            self.call_perspective_crop(test_image, corners, f"Aspect ratio test: {description} ({width}x{height})")
    
    def call_perspective_crop(self, image_base64, corners, test_name):
        """Helper method to call the perspective crop endpoint"""
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        request_data = {
            "image_base64": image_base64,
            "corners": corners
        }
        
        try:
            response = requests.post(
                f"{API_BASE}/images/perspective-crop",
                json=request_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                has_image = bool(data.get("cropped_image_base64"))
                
                status = "✅ PASS" if success and has_image else "⚠️ PARTIAL"
                print(f"{status} {test_name}")
                if not success:
                    print(f"   Warning: success={success}")
                if not has_image:
                    print(f"   Warning: no cropped image returned")
                
                self.test_results.append({
                    "test": test_name,
                    "status": "PASS" if success and has_image else "PARTIAL",
                    "details": f"HTTP 200, success={success}, has_image={has_image}"
                })
                
                return data
            else:
                print(f"❌ FAIL {test_name}")
                print(f"   HTTP {response.status_code}: {response.text[:200]}")
                
                self.test_results.append({
                    "test": test_name,
                    "status": "FAIL",
                    "details": f"HTTP {response.status_code}: {response.text[:200]}"
                })
                
                return None
                
        except Exception as e:
            print(f"❌ ERROR {test_name}")
            print(f"   Exception: {e}")
            
            self.test_results.append({
                "test": test_name,
                "status": "ERROR",
                "details": f"Exception: {e}"
            })
            
            return None
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Comprehensive Perspective Crop API Tests")
        print(f"🌐 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Setup
        if not self.setup():
            print("❌ Setup failed, aborting tests")
            return
        
        # Run test suites
        self.test_basic_functionality()
        self.test_edge_cases()
        self.test_corner_order_validation()
        self.test_quality_validation()
        self.test_error_handling()
        self.test_exif_orientation()
        self.test_various_aspect_ratios()
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed = len([t for t in self.test_results if t["status"] == "PASS"])
        partial = len([t for t in self.test_results if t["status"] == "PARTIAL"])
        failed = len([t for t in self.test_results if t["status"] == "FAIL"])
        errors = len([t for t in self.test_results if t["status"] == "ERROR"])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed}")
        print(f"⚠️ Partial: {partial}")
        print(f"❌ Failed: {failed}")
        print(f"🚨 Errors: {errors}")
        
        success_rate = (passed / total_tests * 100) if total_tests > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        if failed > 0 or errors > 0:
            print("\n🔍 FAILED/ERROR TESTS:")
            for test in self.test_results:
                if test["status"] in ["FAIL", "ERROR"]:
                    print(f"   {test['status']}: {test['test']}")
                    print(f"      {test['details']}")
        
        print("\n" + "=" * 60)

def main():
    """Main test runner"""
    tester = PerspectiveCropTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()
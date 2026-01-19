#!/usr/bin/env python3
"""
Backend API Testing for ScanUp Document Scanner App
Tests the specific APIs mentioned in the review request:
1. Rename Document API
2. Rename Folder API  
3. Set Folder Password API
4. Signature/Annotation API
5. PDF Password Protection API
"""

import requests
import base64
import json
import sys
import os
from io import BytesIO
from PIL import Image
import time

# Configuration
BACKEND_URL = "https://secure-scan-app-1.preview.emergentagent.com/api"
TEST_EMAIL = "testuser@scanup.com"
TEST_PASSWORD = "testpass123"
TEST_NAME = "Test User"

class ScanUpAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def create_test_image(self, width=800, height=600, text="Test Document"):
        """Create a test image as base64"""
        img = Image.new('RGB', (width, height), color='white')
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        
        try:
            # Try to use a system font
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
        except:
            font = ImageFont.load_default()
        
        # Draw text
        draw.text((50, 50), text, fill='black', font=font)
        draw.rectangle([100, 150, 700, 500], outline='black', width=3)
        draw.text((150, 300), "Sample document content", fill='black', font=font)
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=90)
        return base64.b64encode(buffer.getvalue()).decode()
    
    def create_signature_image(self):
        """Create a test signature as base64"""
        img = Image.new('RGBA', (300, 150), color=(255, 255, 255, 0))
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
        except:
            font = ImageFont.load_default()
        
        # Draw signature
        draw.text((20, 50), "John Doe", fill=(0, 0, 0, 255), font=font)
        draw.line([(20, 100), (280, 100)], fill=(0, 0, 0, 255), width=2)
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode()
    
    def register_and_login(self):
        """Register and login to get authentication token"""
        print("🔐 Setting up authentication...")
        
        # Try to register (might fail if user exists)
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=register_data)
            if response.status_code == 200:
                data = response.json()
                self.token = data["token"]
                self.user_id = data["user"]["user_id"]
                print(f"✅ Registered new user: {TEST_EMAIL}")
            elif response.status_code == 400 and "already registered" in response.text:
                print(f"ℹ️ User already exists, attempting login...")
                # User exists, try login
                login_data = {
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                }
                response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
                if response.status_code == 200:
                    data = response.json()
                    self.token = data["token"]
                    self.user_id = data["user"]["user_id"]
                    print(f"✅ Logged in existing user: {TEST_EMAIL}")
                else:
                    raise Exception(f"Login failed: {response.status_code} - {response.text}")
            else:
                raise Exception(f"Registration failed: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_result("Authentication Setup", False, str(e))
            return False
        
        # Set authorization header
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        self.log_result("Authentication Setup", True, f"Successfully authenticated as {TEST_EMAIL}")
        return True
    
    def test_document_rename_api(self):
        """Test PUT /api/documents/{document_id} with name change"""
        print("\n📄 Testing Document Rename API...")
        
        try:
            # First create a document
            test_image = self.create_test_image(text="Document to Rename")
            doc_data = {
                "name": "Original Document Name",
                "pages": [{
                    "image_base64": test_image,
                    "order": 0
                }]
            }
            
            response = self.session.post(f"{BACKEND_URL}/documents", json=doc_data)
            if response.status_code != 200:
                self.log_result("Document Rename API - Create Document", False, 
                              f"Failed to create test document: {response.status_code} - {response.text}")
                return
            
            document = response.json()
            document_id = document["document_id"]
            self.log_result("Document Rename API - Create Document", True, 
                          f"Created test document: {document_id}")
            
            # Now test renaming the document
            rename_data = {"name": "New Renamed Document"}
            response = self.session.put(f"{BACKEND_URL}/documents/{document_id}", json=rename_data)
            
            if response.status_code == 200:
                updated_doc = response.json()
                if updated_doc["name"] == "New Renamed Document":
                    self.log_result("Document Rename API", True, 
                                  "Document renamed successfully", 
                                  f"Name changed from 'Original Document Name' to '{updated_doc['name']}'")
                else:
                    self.log_result("Document Rename API", False, 
                                  "Name change not persisted", 
                                  f"Expected 'New Renamed Document', got '{updated_doc['name']}'")
            else:
                self.log_result("Document Rename API", False, 
                              f"Rename request failed: {response.status_code}", 
                              response.text)
            
            # Cleanup
            self.session.delete(f"{BACKEND_URL}/documents/{document_id}")
            
        except Exception as e:
            self.log_result("Document Rename API", False, f"Exception occurred: {str(e)}")
    
    def test_folder_rename_api(self):
        """Test PUT /api/folders/{folder_id} with name change"""
        print("\n📁 Testing Folder Rename API...")
        
        try:
            # First create a folder
            folder_data = {
                "name": "Original Folder Name",
                "color": "#3B82F6"
            }
            
            response = self.session.post(f"{BACKEND_URL}/folders", json=folder_data)
            if response.status_code != 200:
                self.log_result("Folder Rename API - Create Folder", False, 
                              f"Failed to create test folder: {response.status_code} - {response.text}")
                return
            
            folder = response.json()
            folder_id = folder["folder_id"]
            self.log_result("Folder Rename API - Create Folder", True, 
                          f"Created test folder: {folder_id}")
            
            # Now test renaming the folder
            rename_data = {"name": "New Renamed Folder"}
            response = self.session.put(f"{BACKEND_URL}/folders/{folder_id}", json=rename_data)
            
            if response.status_code == 200:
                updated_folder = response.json()
                if updated_folder["name"] == "New Renamed Folder":
                    self.log_result("Folder Rename API", True, 
                                  "Folder renamed successfully", 
                                  f"Name changed from 'Original Folder Name' to '{updated_folder['name']}'")
                else:
                    self.log_result("Folder Rename API", False, 
                                  "Name change not persisted", 
                                  f"Expected 'New Renamed Folder', got '{updated_folder['name']}'")
            else:
                self.log_result("Folder Rename API", False, 
                              f"Rename request failed: {response.status_code}", 
                              response.text)
            
            # Cleanup
            self.session.delete(f"{BACKEND_URL}/folders/{folder_id}")
            
        except Exception as e:
            self.log_result("Folder Rename API", False, f"Exception occurred: {str(e)}")
    
    def test_folder_password_api(self):
        """Test PUT /api/folders/{folder_id} with password protection"""
        print("\n🔒 Testing Folder Password API...")
        
        try:
            # First create a folder
            folder_data = {
                "name": "Test Password Folder",
                "color": "#FF6B6B"
            }
            
            response = self.session.post(f"{BACKEND_URL}/folders", json=folder_data)
            if response.status_code != 200:
                self.log_result("Folder Password API - Create Folder", False, 
                              f"Failed to create test folder: {response.status_code} - {response.text}")
                return
            
            folder = response.json()
            folder_id = folder["folder_id"]
            self.log_result("Folder Password API - Create Folder", True, 
                          f"Created test folder: {folder_id}")
            
            # Test setting password (using correct field names from backend code)
            password_data = {
                "password_hash": "test123",
                "is_protected": True
            }
            response = self.session.put(f"{BACKEND_URL}/folders/{folder_id}", json=password_data)
            
            if response.status_code == 200:
                updated_folder = response.json()
                if updated_folder.get("is_protected"):
                    self.log_result("Folder Password API - Set Password", True, 
                                  "Password protection enabled successfully")
                    
                    # Test password verification endpoint
                    verify_data = {"password": "test123"}
                    verify_response = self.session.post(f"{BACKEND_URL}/folders/{folder_id}/verify-password", 
                                                      json=verify_data)
                    
                    if verify_response.status_code == 200:
                        self.log_result("Folder Password API - Verify Correct Password", True, 
                                      "Correct password verification successful")
                    else:
                        self.log_result("Folder Password API - Verify Correct Password", False, 
                                      f"Correct password verification failed: {verify_response.status_code}")
                    
                    # Test wrong password
                    wrong_verify_data = {"password": "wrongpassword"}
                    wrong_verify_response = self.session.post(f"{BACKEND_URL}/folders/{folder_id}/verify-password", 
                                                            json=wrong_verify_data)
                    
                    if wrong_verify_response.status_code == 401:
                        self.log_result("Folder Password API - Verify Wrong Password", True, 
                                      "Wrong password correctly rejected with 401")
                    else:
                        self.log_result("Folder Password API - Verify Wrong Password", False, 
                                      f"Wrong password should return 401, got: {wrong_verify_response.status_code}")
                    
                else:
                    self.log_result("Folder Password API - Set Password", False, 
                                  "Password protection not enabled", 
                                  f"is_protected: {updated_folder.get('is_protected')}")
            else:
                self.log_result("Folder Password API - Set Password", False, 
                              f"Password set request failed: {response.status_code}", 
                              response.text)
            
            # Cleanup
            self.session.delete(f"{BACKEND_URL}/folders/{folder_id}")
            
        except Exception as e:
            self.log_result("Folder Password API", False, f"Exception occurred: {str(e)}")
    
    def test_signature_annotation_api(self):
        """Test POST /api/images/apply-signature"""
        print("\n✍️ Testing Signature/Annotation API...")
        
        try:
            # Test apply-signature endpoint
            test_image = self.create_test_image(text="Document for Signature")
            signature_image = self.create_signature_image()
            
            signature_data = {
                "image_base64": test_image,
                "signature_base64": signature_image,
                "position_x": 0.7,  # 70% from left
                "position_y": 0.8,  # 80% from top
                "scale": 0.3
            }
            
            response = self.session.post(f"{BACKEND_URL}/images/apply-signature", json=signature_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("processed_image_base64"):
                    self.log_result("Signature API - Apply Signature", True, 
                                  "Signature applied successfully", 
                                  f"Message: {result.get('message')}")
                else:
                    self.log_result("Signature API - Apply Signature", False, 
                                  "Response missing required fields", 
                                  f"Response: {result}")
            else:
                self.log_result("Signature API - Apply Signature", False, 
                              f"Apply signature failed: {response.status_code}", 
                              response.text)
            
            # Test missing parameters
            incomplete_data = {
                "image_base64": test_image,
                # Missing signature_base64
                "position_x": 0.5,
                "position_y": 0.5
            }
            
            response = self.session.post(f"{BACKEND_URL}/images/apply-signature", json=incomplete_data)
            if response.status_code == 422:
                self.log_result("Signature API - Validation", True, 
                              "Properly validates missing parameters with 422")
            else:
                self.log_result("Signature API - Validation", False, 
                              f"Should return 422 for missing params, got: {response.status_code}")
            
            # Test apply-annotations endpoint (if it exists)
            annotation_data = {
                "image_base64": test_image,
                "annotations": [
                    {
                        "type": "text",
                        "text": "Test Annotation",
                        "x": 100,
                        "y": 100,
                        "color": "#FF0000",
                        "fontSize": 20
                    }
                ]
            }
            
            response = self.session.post(f"{BACKEND_URL}/images/apply-annotations", json=annotation_data)
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    self.log_result("Annotation API - Apply Annotations", True, 
                                  "Annotations applied successfully")
                else:
                    self.log_result("Annotation API - Apply Annotations", False, 
                                  "Annotation response indicates failure", 
                                  f"Response: {result}")
            elif response.status_code == 404:
                self.log_result("Annotation API - Apply Annotations", False, 
                              "Apply annotations endpoint not found (404)")
            else:
                self.log_result("Annotation API - Apply Annotations", False, 
                              f"Apply annotations failed: {response.status_code}", 
                              response.text)
            
        except Exception as e:
            self.log_result("Signature/Annotation API", False, f"Exception occurred: {str(e)}")
    
    def test_pdf_password_protection(self):
        """Test PDF password protection endpoint"""
        print("\n🔐 Testing PDF Password Protection...")
        
        try:
            # Create a simple PDF content (base64 encoded)
            # For testing, we'll create a minimal PDF
            pdf_content = """%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF"""
            
            pdf_base64 = base64.b64encode(pdf_content.encode()).decode()
            
            password_data = {
                "pdf_base64": pdf_base64,
                "password": "testpdf123"
            }
            
            response = self.session.post(f"{BACKEND_URL}/pdf/protect-with-password", json=password_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("protected_pdf_base64"):
                    self.log_result("PDF Password Protection", True, 
                                  "PDF password protection successful", 
                                  f"Message: {result.get('message')}")
                else:
                    self.log_result("PDF Password Protection", False, 
                                  "Response missing required fields", 
                                  f"Response: {result}")
            elif response.status_code == 404:
                self.log_result("PDF Password Protection", False, 
                              "PDF password protection endpoint not found (404)")
            else:
                self.log_result("PDF Password Protection", False, 
                              f"PDF password protection failed: {response.status_code}", 
                              response.text)
            
        except Exception as e:
            self.log_result("PDF Password Protection", False, f"Exception occurred: {str(e)}")
    
    def test_authentication_requirements(self):
        """Test that endpoints require authentication"""
        print("\n🔒 Testing Authentication Requirements...")
        
        # Remove auth header temporarily
        original_headers = self.session.headers.copy()
        if "Authorization" in self.session.headers:
            del self.session.headers["Authorization"]
        
        try:
            # Test document rename without auth
            response = self.session.put(f"{BACKEND_URL}/documents/test123", json={"name": "test"})
            if response.status_code == 401:
                self.log_result("Authentication - Document Rename", True, 
                              "Properly requires authentication (401)")
            else:
                self.log_result("Authentication - Document Rename", False, 
                              f"Should require auth, got: {response.status_code}")
            
            # Test folder operations without auth
            response = self.session.post(f"{BACKEND_URL}/folders", json={"name": "test"})
            if response.status_code == 401:
                self.log_result("Authentication - Folder Operations", True, 
                              "Properly requires authentication (401)")
            else:
                self.log_result("Authentication - Folder Operations", False, 
                              f"Should require auth, got: {response.status_code}")
            
        finally:
            # Restore auth headers
            self.session.headers.update(original_headers)
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting ScanUp Backend API Tests")
        print("=" * 60)
        
        # Setup authentication
        if not self.register_and_login():
            print("❌ Authentication failed, cannot proceed with tests")
            return
        
        # Run all tests
        self.test_document_rename_api()
        self.test_folder_rename_api()
        self.test_folder_password_api()
        self.test_signature_annotation_api()
        self.test_pdf_password_protection()
        self.test_authentication_requirements()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"     Details: {result['details']}")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = ScanUpAPITester()
    passed, failed = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    sys.exit(1 if failed > 0 else 0)
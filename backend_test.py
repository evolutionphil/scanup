#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Document Scanner App
Tests all backend endpoints with proper authentication flow
"""

import requests
import json
import base64
import uuid
from datetime import datetime
import sys
import os

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=')[1].strip()
    except:
        pass
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

# Test data
TEST_USER = {
    "email": "testuser@docscanner.com",
    "password": "SecurePass123!",
    "name": "Test User"
}

# Sample base64 image (1x1 pixel PNG)
SAMPLE_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_document_id = None
        self.test_folder_id = None
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log_result(self, test_name, success, message="", response=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code} - {response.text[:200]}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
        print()

    def test_health_check(self):
        """Test basic health endpoint"""
        try:
            response = self.session.get(f"{API_URL}/health")
            success = response.status_code == 200
            self.log_result("Health Check", success, 
                          f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            return False

    def test_register(self):
        """Test user registration"""
        try:
            response = self.session.post(f"{API_URL}/auth/register", 
                                       json=TEST_USER)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token")
                self.user_id = data.get("user", {}).get("user_id")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_result("User Registration", True, 
                              f"User ID: {self.user_id}")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try login instead
                return self.test_login()
            else:
                self.log_result("User Registration", False, 
                              f"Unexpected status: {response.status_code}", response)
                return False
        except Exception as e:
            self.log_result("User Registration", False, f"Exception: {str(e)}")
            return False

    def test_login(self):
        """Test user login"""
        try:
            login_data = {
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
            response = self.session.post(f"{API_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token")
                self.user_id = data.get("user", {}).get("user_id")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                self.log_result("User Login", True, 
                              f"User ID: {self.user_id}")
                return True
            else:
                self.log_result("User Login", False, 
                              f"Status: {response.status_code}", response)
                return False
        except Exception as e:
            self.log_result("User Login", False, f"Exception: {str(e)}")
            return False

    def test_get_me(self):
        """Test get current user profile"""
        try:
            response = self.session.get(f"{API_URL}/auth/me")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.log_result("Get User Profile", True, 
                              f"Email: {data.get('email')}, Premium: {data.get('is_premium')}")
            else:
                self.log_result("Get User Profile", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Get User Profile", False, f"Exception: {str(e)}")
            return False

    def test_create_folder(self):
        """Test folder creation"""
        try:
            folder_data = {
                "name": "Test Folder",
                "color": "#FF5722"
            }
            response = self.session.post(f"{API_URL}/folders", json=folder_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_folder_id = data.get("folder_id")
                self.log_result("Create Folder", True, 
                              f"Folder ID: {self.test_folder_id}")
                return True
            else:
                self.log_result("Create Folder", False, 
                              f"Status: {response.status_code}", response)
                return False
        except Exception as e:
            self.log_result("Create Folder", False, f"Exception: {str(e)}")
            return False

    def test_get_folders(self):
        """Test get folders"""
        try:
            response = self.session.get(f"{API_URL}/folders")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                folder_count = len(data)
                self.log_result("Get Folders", True, 
                              f"Found {folder_count} folders")
            else:
                self.log_result("Get Folders", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Get Folders", False, f"Exception: {str(e)}")
            return False

    def test_create_document(self):
        """Test document creation"""
        try:
            doc_data = {
                "name": "Test Document",
                "folder_id": self.test_folder_id,
                "tags": ["test", "sample"],
                "pages": [
                    {
                        "image_base64": SAMPLE_IMAGE_B64,
                        "filter_applied": "original",
                        "rotation": 0,
                        "order": 0
                    }
                ]
            }
            response = self.session.post(f"{API_URL}/documents", json=doc_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_document_id = data.get("document_id")
                page_count = len(data.get("pages", []))
                self.log_result("Create Document", True, 
                              f"Document ID: {self.test_document_id}, Pages: {page_count}")
                return True
            else:
                self.log_result("Create Document", False, 
                              f"Status: {response.status_code}", response)
                return False
        except Exception as e:
            self.log_result("Create Document", False, f"Exception: {str(e)}")
            return False

    def test_get_documents(self):
        """Test get documents"""
        try:
            response = self.session.get(f"{API_URL}/documents")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                doc_count = len(data)
                self.log_result("Get Documents", True, 
                              f"Found {doc_count} documents")
            else:
                self.log_result("Get Documents", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Get Documents", False, f"Exception: {str(e)}")
            return False

    def test_get_single_document(self):
        """Test get single document"""
        if not self.test_document_id:
            self.log_result("Get Single Document", False, "No test document ID available")
            return False
            
        try:
            response = self.session.get(f"{API_URL}/documents/{self.test_document_id}")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.log_result("Get Single Document", True, 
                              f"Document: {data.get('name')}")
            else:
                self.log_result("Get Single Document", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Get Single Document", False, f"Exception: {str(e)}")
            return False

    def test_update_document(self):
        """Test document update"""
        if not self.test_document_id:
            self.log_result("Update Document", False, "No test document ID available")
            return False
            
        try:
            update_data = {
                "name": "Updated Test Document",
                "tags": ["updated", "test"]
            }
            response = self.session.put(f"{API_URL}/documents/{self.test_document_id}", 
                                      json=update_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.log_result("Update Document", True, 
                              f"Updated name: {data.get('name')}")
            else:
                self.log_result("Update Document", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Update Document", False, f"Exception: {str(e)}")
            return False

    def test_add_page_to_document(self):
        """Test adding page to document"""
        if not self.test_document_id:
            self.log_result("Add Page to Document", False, "No test document ID available")
            return False
            
        try:
            page_data = {
                "image_base64": SAMPLE_IMAGE_B64,
                "filter_applied": "grayscale",
                "rotation": 90,
                "order": 1
            }
            response = self.session.post(f"{API_URL}/documents/{self.test_document_id}/pages", 
                                       json=page_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                page_count = len(data.get("pages", []))
                self.log_result("Add Page to Document", True, 
                              f"Total pages: {page_count}")
            else:
                self.log_result("Add Page to Document", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Add Page to Document", False, f"Exception: {str(e)}")
            return False

    def test_image_processing(self):
        """Test image processing operations"""
        operations = [
            {"operation": "filter", "params": {"type": "grayscale"}},
            {"operation": "rotate", "params": {"degrees": 90}},
            {"operation": "crop", "params": {"x": 0, "y": 0, "width": 50, "height": 50}}
        ]
        
        all_passed = True
        for op in operations:
            try:
                process_data = {
                    "image_base64": SAMPLE_IMAGE_B64,
                    "operation": op["operation"],
                    "params": op["params"]
                }
                response = self.session.post(f"{API_URL}/images/process", json=process_data)
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    has_result = bool(data.get("processed_image_base64"))
                    self.log_result(f"Image Processing - {op['operation']}", has_result, 
                                  f"Processed: {has_result}")
                    all_passed = all_passed and has_result
                else:
                    self.log_result(f"Image Processing - {op['operation']}", False, 
                                  f"Status: {response.status_code}", response)
                    all_passed = False
            except Exception as e:
                self.log_result(f"Image Processing - {op['operation']}", False, 
                              f"Exception: {str(e)}")
                all_passed = False
        
        return all_passed

    def test_subscription_management(self):
        """Test subscription update"""
        try:
            subscription_data = {
                "subscription_type": "premium",
                "duration_days": 30
            }
            response = self.session.put(f"{API_URL}/users/subscription", 
                                      json=subscription_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                is_premium = data.get("is_premium")
                self.log_result("Update Subscription", True, 
                              f"Premium status: {is_premium}")
            else:
                self.log_result("Update Subscription", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Update Subscription", False, f"Exception: {str(e)}")
            return False

    def test_ocr_endpoint(self):
        """Test OCR endpoint"""
        try:
            ocr_data = {
                "image_base64": SAMPLE_IMAGE_B64,
                "language": "en"
            }
            response = self.session.post(f"{API_URL}/ocr/extract", json=ocr_data)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                text = data.get("text", "")
                self.log_result("OCR Extract", True, 
                              f"Extracted text: {text[:50]}...")
            else:
                self.log_result("OCR Extract", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("OCR Extract", False, f"Exception: {str(e)}")
            return False

    def test_delete_document(self):
        """Test document deletion"""
        if not self.test_document_id:
            self.log_result("Delete Document", False, "No test document ID available")
            return False
            
        try:
            response = self.session.delete(f"{API_URL}/documents/{self.test_document_id}")
            success = response.status_code == 200
            
            if success:
                self.log_result("Delete Document", True, "Document deleted successfully")
            else:
                self.log_result("Delete Document", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Delete Document", False, f"Exception: {str(e)}")
            return False

    def test_delete_folder(self):
        """Test folder deletion"""
        if not self.test_folder_id:
            self.log_result("Delete Folder", False, "No test folder ID available")
            return False
            
        try:
            response = self.session.delete(f"{API_URL}/folders/{self.test_folder_id}")
            success = response.status_code == 200
            
            if success:
                self.log_result("Delete Folder", True, "Folder deleted successfully")
            else:
                self.log_result("Delete Folder", False, 
                              f"Status: {response.status_code}", response)
            return success
        except Exception as e:
            self.log_result("Delete Folder", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🚀 Starting Document Scanner Backend API Tests")
        print(f"📍 Backend URL: {BASE_URL}")
        print(f"🔗 API URL: {API_URL}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration/Login", self.test_register),
            ("Get User Profile", self.test_get_me),
            ("Create Folder", self.test_create_folder),
            ("Get Folders", self.test_get_folders),
            ("Create Document", self.test_create_document),
            ("Get Documents", self.test_get_documents),
            ("Get Single Document", self.test_get_single_document),
            ("Update Document", self.test_update_document),
            ("Add Page to Document", self.test_add_page_to_document),
            ("Image Processing", self.test_image_processing),
            ("Subscription Management", self.test_subscription_management),
            ("OCR Extract", self.test_ocr_endpoint),
            ("Delete Document", self.test_delete_document),
            ("Delete Folder", self.test_delete_folder),
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                self.log_result(test_name, False, f"Unexpected error: {str(e)}")
        
        # Summary
        print("=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📈 Success Rate: {self.results['passed']/(self.results['passed']+self.results['failed'])*100:.1f}%")
        
        if self.results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
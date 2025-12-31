#!/usr/bin/env python3
"""
Backend API Testing for ScanUp Document Scanner App
Tests the specific endpoints mentioned in the review request:
1. Rename Document API
2. Rename Folder API  
3. Set Folder Password API
"""

import requests
import json
import base64
import uuid
from datetime import datetime
import sys
import os

# Backend URL from frontend environment
BACKEND_URL = "https://localize-scanup.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_email = f"test_{uuid.uuid4().hex[:8]}@scanup.test"
        self.test_user_password = "TestPassword123!"
        self.test_user_name = "Test User"
        
        # Test data storage
        self.test_document_id = None
        self.test_folder_id = None
        
        print(f"🧪 Backend Tester initialized")
        print(f"📡 Backend URL: {BACKEND_URL}")
        print(f"👤 Test user: {self.test_user_email}")
        print("-" * 60)

    def log_test(self, test_name, status, details=""):
        """Log test results with consistent formatting"""
        status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_emoji} {test_name}: {status}")
        if details:
            print(f"   {details}")

    def make_request(self, method, endpoint, data=None, headers=None, expect_status=None):
        """Make HTTP request with proper error handling"""
        url = f"{API_BASE}{endpoint}"
        
        # Add auth header if we have a token
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        print(f"   🌐 Making {method} request to: {url}")
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            print(f"   📊 Response status: {response.status_code}")
            
            # Check expected status if provided
            if expect_status and response.status_code != expect_status:
                print(f"   ⚠️ Expected status {expect_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Request failed: {e}")
            return None

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔐 Testing User Registration...")
        
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "name": self.test_user_name
        }
        
        response = self.make_request("POST", "/auth/register", data)
        
        if response and response.status_code == 200:
            result = response.json()
            self.auth_token = result.get("token")
            self.log_test("User Registration", "PASS", f"Token received: {self.auth_token[:20]}...")
            return True
        else:
            error_msg = response.text if response else "No response"
            self.log_test("User Registration", "FAIL", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_user_login(self):
        """Test user login (fallback if registration fails)"""
        print("\n🔑 Testing User Login...")
        
        data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        response = self.make_request("POST", "/auth/login", data)
        
        if response and response.status_code == 200:
            result = response.json()
            self.auth_token = result.get("token")
            self.log_test("User Login", "PASS", f"Token received: {self.auth_token[:20]}...")
            return True
        else:
            error_msg = response.text if response else "No response"
            self.log_test("User Login", "FAIL", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def create_test_document(self):
        """Create a test document for rename testing"""
        print("\n📄 Creating Test Document...")
        
        # Create a simple base64 image (1x1 pixel white PNG)
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        data = {
            "name": "Test Document for Rename",
            "folder_id": None,
            "tags": ["test"],
            "pages": [
                {
                    "image_base64": test_image_base64,
                    "filter_applied": "original",
                    "rotation": 0
                }
            ]
        }
        
        response = self.make_request("POST", "/documents", data)
        
        if response and response.status_code == 200:
            result = response.json()
            self.test_document_id = result.get("document_id")
            self.log_test("Create Test Document", "PASS", f"Document ID: {self.test_document_id}")
            return True
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Create Test Document", "FAIL", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def create_test_folder(self):
        """Create a test folder for rename and password testing"""
        print("\n📁 Creating Test Folder...")
        
        data = {
            "name": "Test Folder for Operations",
            "color": "#3B82F6"
        }
        
        response = self.make_request("POST", "/folders", data)
        
        if response and response.status_code == 200:
            result = response.json()
            self.test_folder_id = result.get("folder_id")
            self.log_test("Create Test Folder", "PASS", f"Folder ID: {self.test_folder_id}")
            return True
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Create Test Folder", "FAIL", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_rename_document(self):
        """Test renaming a document - MAIN TEST FROM REVIEW REQUEST"""
        print("\n📝 Testing Document Rename API...")
        
        if not self.test_document_id:
            self.log_test("Document Rename", "FAIL", "No test document available")
            return False
        
        new_name = f"Renamed Document {datetime.now().strftime('%H:%M:%S')}"
        data = {"name": new_name}
        
        response = self.make_request("PUT", f"/documents/{self.test_document_id}", data)
        
        if response and response.status_code == 200:
            result = response.json()
            actual_name = result.get("name")
            
            if actual_name == new_name:
                self.log_test("Document Rename", "PASS", f"Name updated to: {actual_name}")
                
                # Verify the change persisted in database
                verify_response = self.make_request("GET", f"/documents/{self.test_document_id}")
                if verify_response and verify_response.status_code == 200:
                    verify_result = verify_response.json()
                    if verify_result.get("name") == new_name:
                        self.log_test("Document Rename Persistence", "PASS", "Name change persisted in database")
                        return True
                    else:
                        self.log_test("Document Rename Persistence", "FAIL", f"Database shows: {verify_result.get('name')}")
                        return False
                else:
                    self.log_test("Document Rename Verification", "FAIL", "Could not verify database persistence")
                    return False
            else:
                self.log_test("Document Rename", "FAIL", f"Expected: {new_name}, Got: {actual_name}")
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Document Rename", "FAIL", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_rename_folder(self):
        """Test renaming a folder - MAIN TEST FROM REVIEW REQUEST"""
        print("\n📂 Testing Folder Rename API...")
        
        if not self.test_folder_id:
            self.log_test("Folder Rename", "FAIL", "No test folder available")
            return False
        
        new_name = f"Renamed Folder {datetime.now().strftime('%H:%M:%S')}"
        data = {"name": new_name}
        
        response = self.make_request("PUT", f"/folders/{self.test_folder_id}", data)
        
        if response and response.status_code == 200:
            result = response.json()
            actual_name = result.get("name")
            
            if actual_name == new_name:
                self.log_test("Folder Rename", "PASS", f"Name updated to: {actual_name}")
                
                # Verify the change persisted in database
                verify_response = self.make_request("GET", "/folders")
                if verify_response and verify_response.status_code == 200:
                    folders = verify_response.json()
                    test_folder = next((f for f in folders if f.get("folder_id") == self.test_folder_id), None)
                    
                    if test_folder and test_folder.get("name") == new_name:
                        self.log_test("Folder Rename Persistence", "PASS", "Name change persisted in database")
                        return True
                    else:
                        self.log_test("Folder Rename Persistence", "FAIL", f"Database shows: {test_folder.get('name') if test_folder else 'Folder not found'}")
                        return False
                else:
                    self.log_test("Folder Rename Verification", "FAIL", "Could not verify database persistence")
                    return False
            else:
                self.log_test("Folder Rename", "FAIL", f"Expected: {new_name}, Got: {actual_name}")
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Folder Rename", "FAIL", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def test_set_folder_password(self):
        """Test setting folder password - MAIN TEST FROM REVIEW REQUEST"""
        print("\n🔒 Testing Folder Password API...")
        
        if not self.test_folder_id:
            self.log_test("Folder Password", "FAIL", "No test folder available")
            return False
        
        test_password = "test123"
        data = {"password": test_password}
        
        response = self.make_request("PUT", f"/folders/{self.test_folder_id}", data)
        
        if response and response.status_code == 200:
            result = response.json()
            is_protected = result.get("is_protected", False)
            
            if is_protected:
                self.log_test("Folder Password Set", "PASS", "Folder marked as protected")
                
                # Test password verification if endpoint exists
                verify_data = {"password": test_password}
                verify_response = self.make_request("POST", f"/folders/{self.test_folder_id}/verify-password", verify_data)
                
                if verify_response and verify_response.status_code == 200:
                    self.log_test("Folder Password Verification", "PASS", "Correct password accepted")
                    
                    # Test wrong password
                    wrong_data = {"password": "wrongpassword"}
                    wrong_response = self.make_request("POST", f"/folders/{self.test_folder_id}/verify-password", wrong_data)
                    
                    if wrong_response and wrong_response.status_code == 401:
                        self.log_test("Folder Password Rejection", "PASS", "Wrong password correctly rejected")
                        return True
                    else:
                        self.log_test("Folder Password Rejection", "FAIL", f"Wrong password not rejected properly: {wrong_response.status_code if wrong_response else 'None'}")
                        return False
                else:
                    self.log_test("Folder Password Verification", "FAIL", f"Password verification failed: {verify_response.status_code if verify_response else 'None'}")
                    return False
            else:
                self.log_test("Folder Password Set", "FAIL", "Folder not marked as protected")
                return False
        else:
            error_msg = response.text if response else "No response"
            self.log_test("Folder Password", "FAIL", f"Status: {response.status_code if response else 'None'}, Error: {error_msg}")
            return False

    def cleanup_test_data(self):
        """Clean up test documents and folders"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete test document
        if self.test_document_id:
            response = self.make_request("DELETE", f"/documents/{self.test_document_id}")
            if response and response.status_code == 200:
                self.log_test("Delete Test Document", "PASS", "Document deleted")
            else:
                self.log_test("Delete Test Document", "FAIL", f"Status: {response.status_code if response else 'None'}")
        
        # Delete test folder
        if self.test_folder_id:
            response = self.make_request("DELETE", f"/folders/{self.test_folder_id}")
            if response and response.status_code == 200:
                self.log_test("Delete Test Folder", "PASS", "Folder deleted")
            else:
                self.log_test("Delete Test Folder", "FAIL", f"Status: {response.status_code if response else 'None'}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Backend API Tests for Review Request")
        print("=" * 60)
        
        test_results = {
            "total": 0,
            "passed": 0,
            "failed": 0
        }
        
        # Authentication tests
        auth_success = self.test_user_registration()
        if not auth_success:
            auth_success = self.test_user_login()
        
        if not auth_success:
            print("\n❌ CRITICAL: Authentication failed. Cannot proceed with API tests.")
            return test_results
        
        # Setup tests
        doc_created = self.create_test_document()
        folder_created = self.create_test_folder()
        
        # Main tests from review request
        tests = [
            ("Document Rename", self.test_rename_document),
            ("Folder Rename", self.test_rename_folder),
            ("Folder Password", self.test_set_folder_password)
        ]
        
        for test_name, test_func in tests:
            test_results["total"] += 1
            try:
                if test_func():
                    test_results["passed"] += 1
                else:
                    test_results["failed"] += 1
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {e}")
                test_results["failed"] += 1
        
        # Cleanup
        self.cleanup_test_data()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {test_results['total']}")
        print(f"✅ Passed: {test_results['passed']}")
        print(f"❌ Failed: {test_results['failed']}")
        print(f"Success Rate: {(test_results['passed']/test_results['total']*100):.1f}%" if test_results['total'] > 0 else "0%")
        
        return test_results

if __name__ == "__main__":
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    sys.exit(0 if results["failed"] == 0 else 1)
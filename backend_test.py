#!/usr/bin/env python3
"""
Backend API Testing for ScanUp Document Scanner App
Testing the i18n (multi-language) functionality on the landing page:

## Test Scenarios:

### 1. Fetch German Landing Page and Check for German Translations
- GET /de
- Verify the HTML is returned (200)
- Check that the i18n.js script is included

### 2. Fetch Turkish Landing Page
- GET /tr
- Verify 200 response

### 3. Check that i18n.js contains all language translations
- GET /js/i18n.js
- Verify it contains:
  - websiteTranslations object
  - German translations (de)
  - Turkish translations (tr)
  - French translations (fr)
  - All 15 language codes

### 4. Verify the JS contains proper translation keys:
- nav_features
- hero_badge
- hero_title
- download_free
- see_how_it_works
- stat_downloads
- stat_rating
- stat_scanned
- phone_documents
- phone_folders

### 5. Test that German translations are correct in i18n.js:
- Check "Anmelden" appears for login_signup in German
- Check "Funktionen" appears for nav_features in German
- Check "Kostenlos herunterladen" appears for download_free in German

Base URL: https://multilang-pages.preview.emergentagent.com
"""

import requests
import base64
import json
import sys
import os
from io import BytesIO
from PIL import Image
import time
import re

# Configuration
BACKEND_BASE_URL = "http://localhost:8001"  # Use localhost for backend static files
BACKEND_URL = "https://multilang-pages.preview.emergentagent.com/api"  # Keep API URL as is
TEST_EMAIL = "testuser@scanup.com"
TEST_PASSWORD = "testpass123"
TEST_NAME = "Test User"

class ScanUpI18nTester:
    def __init__(self):
        self.session = requests.Session()
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
    
    def test_german_landing_page(self):
        """Test GET /de - German landing page"""
        print("\n🇩🇪 Testing German Landing Page...")
        
        try:
            response = self.session.get(f"{BACKEND_BASE_URL}/de")
            
            if response.status_code == 200:
                html_content = response.text
                
                # Check if i18n.js script is included
                if "i18n.js" in html_content:
                    self.log_result("German Landing Page - HTML & i18n.js", True, 
                                  "German landing page loads with i18n.js script included", 
                                  f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                else:
                    self.log_result("German Landing Page - i18n.js Missing", False, 
                                  "German landing page loads but i18n.js script not found in HTML")
                
                # Check for basic HTML structure
                if "<html" in html_content and "</html>" in html_content:
                    self.log_result("German Landing Page - HTML Structure", True, 
                                  "Valid HTML structure returned")
                else:
                    self.log_result("German Landing Page - HTML Structure", False, 
                                  "Response doesn't appear to be valid HTML")
                    
            else:
                self.log_result("German Landing Page", False, 
                              f"Failed to fetch German landing page: {response.status_code}", 
                              response.text[:200])
                
        except Exception as e:
            self.log_result("German Landing Page", False, f"Exception occurred: {str(e)}")
    
    def test_turkish_landing_page(self):
        """Test GET /tr - Turkish landing page"""
        print("\n🇹🇷 Testing Turkish Landing Page...")
        
        try:
            response = self.session.get(f"{BACKEND_BASE_URL}/tr")
            
            if response.status_code == 200:
                html_content = response.text
                
                # Check for basic HTML structure
                if "<html" in html_content and "</html>" in html_content:
                    self.log_result("Turkish Landing Page", True, 
                                  "Turkish landing page loads successfully", 
                                  f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                else:
                    self.log_result("Turkish Landing Page - HTML Structure", False, 
                                  "Response doesn't appear to be valid HTML")
                    
            else:
                self.log_result("Turkish Landing Page", False, 
                              f"Failed to fetch Turkish landing page: {response.status_code}", 
                              response.text[:200])
                
        except Exception as e:
            self.log_result("Turkish Landing Page", False, f"Exception occurred: {str(e)}")
    
    def test_i18n_js_file(self):
        """Test GET /js/i18n.js - Translation JavaScript file"""
        print("\n📜 Testing i18n.js Translation File...")
        
        try:
            response = self.session.get(f"{BACKEND_BASE_URL}/js/i18n.js")
            
            if response.status_code == 200:
                js_content = response.text
                
                # Check for websiteTranslations object
                if "websiteTranslations" in js_content:
                    self.log_result("i18n.js - websiteTranslations Object", True, 
                                  "websiteTranslations object found in i18n.js")
                else:
                    self.log_result("i18n.js - websiteTranslations Object", False, 
                                  "websiteTranslations object not found in i18n.js")
                
                # Check for all 15 language codes
                expected_languages = ['en', 'de', 'fr', 'es', 'tr', 'ru', 'it', 'pt', 'ar', 'zh', 'ja', 'ko', 'nl', 'pl', 'hi']
                found_languages = []
                
                for lang in expected_languages:
                    if f"code: '{lang}'" in js_content or f'code: "{lang}"' in js_content:
                        found_languages.append(lang)
                
                if len(found_languages) >= 15:
                    self.log_result("i18n.js - Language Codes", True, 
                                  f"Found {len(found_languages)} language codes in languages array", 
                                  f"Languages: {', '.join(found_languages)}")
                else:
                    self.log_result("i18n.js - Language Codes", False, 
                                  f"Only found {len(found_languages)}/15 expected language codes", 
                                  f"Found: {', '.join(found_languages)}")
                
                # Check for German translations section
                if "de: {" in js_content:
                    self.log_result("i18n.js - German Translations", True, 
                                  "German translations section found")
                else:
                    self.log_result("i18n.js - German Translations", False, 
                                  "German translations section not found")
                
                # Check for Turkish translations section  
                if "tr: {" in js_content:
                    self.log_result("i18n.js - Turkish Translations", True, 
                                  "Turkish translations section found")
                else:
                    self.log_result("i18n.js - Turkish Translations", False, 
                                  "Turkish translations section not found")
                
                # Check for French translations section
                if "fr: {" in js_content:
                    self.log_result("i18n.js - French Translations", True, 
                                  "French translations section found")
                else:
                    self.log_result("i18n.js - French Translations", False, 
                                  "French translations section not found")
                    
            else:
                self.log_result("i18n.js File", False, 
                              f"Failed to fetch i18n.js: {response.status_code}", 
                              response.text[:200])
                
        except Exception as e:
            self.log_result("i18n.js File", False, f"Exception occurred: {str(e)}")
    
    def test_translation_keys(self):
        """Test that i18n.js contains proper translation keys"""
        print("\n🔑 Testing Translation Keys...")
        
        try:
            response = self.session.get(f"{BACKEND_BASE_URL}/js/i18n.js")
            
            if response.status_code != 200:
                self.log_result("Translation Keys", False, 
                              f"Could not fetch i18n.js: {response.status_code}")
                return
            
            js_content = response.text
            
            # Required translation keys to check
            required_keys = [
                'nav_features',
                'hero_badge', 
                'hero_title',
                'download_free',
                'see_how_it_works',
                'stat_downloads',
                'stat_rating',
                'stat_scanned',
                'phone_documents',
                'phone_folders'
            ]
            
            found_keys = []
            missing_keys = []
            
            for key in required_keys:
                if f"{key}:" in js_content:
                    found_keys.append(key)
                else:
                    missing_keys.append(key)
            
            if len(found_keys) == len(required_keys):
                self.log_result("Translation Keys - Required Keys", True, 
                              f"All {len(required_keys)} required translation keys found", 
                              f"Keys: {', '.join(found_keys)}")
            else:
                self.log_result("Translation Keys - Required Keys", False, 
                              f"Missing {len(missing_keys)} required translation keys", 
                              f"Missing: {', '.join(missing_keys)}")
            
        except Exception as e:
            self.log_result("Translation Keys", False, f"Exception occurred: {str(e)}")
    
    def test_german_translations_content(self):
        """Test specific German translations are correct"""
        print("\n🔍 Testing German Translation Content...")
        
        try:
            response = self.session.get(f"{BACKEND_BASE_URL}/js/i18n.js")
            
            if response.status_code != 200:
                self.log_result("German Translation Content", False, 
                              f"Could not fetch i18n.js: {response.status_code}")
                return
            
            js_content = response.text
            
            # Test specific German translations
            german_tests = [
                ("login_signup", "Anmelden", "Login/signup button in German"),
                ("nav_features", "Funktionen", "Features navigation in German"),
                ("download_free", "Kostenlos herunterladen", "Download free button in German")
            ]
            
            for key, expected_text, description in german_tests:
                # Look for the pattern in German section
                pattern = rf'de:\s*\{{[^}}]*{key}:\s*["\']([^"\']*)["\']'
                match = re.search(pattern, js_content, re.DOTALL)
                
                if match:
                    found_text = match.group(1)
                    if expected_text.lower() in found_text.lower():
                        self.log_result(f"German Translation - {key}", True, 
                                      f"{description}: '{found_text}'")
                    else:
                        self.log_result(f"German Translation - {key}", False, 
                                      f"Expected '{expected_text}', found '{found_text}'")
                else:
                    # Fallback: search more broadly
                    if expected_text in js_content:
                        self.log_result(f"German Translation - {key}", True, 
                                      f"{description}: '{expected_text}' found in file")
                    else:
                        self.log_result(f"German Translation - {key}", False, 
                                      f"German translation '{expected_text}' not found for {key}")
            
        except Exception as e:
            self.log_result("German Translation Content", False, f"Exception occurred: {str(e)}")
    
    def run_all_tests(self):
        """Run all i18n tests"""
        print("🌍 Starting ScanUp i18n (Multi-language) Testing")
        print("=" * 60)
        
        # Run all i18n tests
        self.test_german_landing_page()
        self.test_turkish_landing_page() 
        self.test_i18n_js_file()
        self.test_translation_keys()
        self.test_german_translations_content()
        
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
    tester = ScanUpI18nTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    sys.exit(1 if failed > 0 else 0)
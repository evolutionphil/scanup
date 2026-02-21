#!/usr/bin/env python3
"""
Multi-language (i18n) Implementation Testing for ScanUp Document Scanner App

Tests the specific multi-language implementation mentioned in the review request:

1. Language Routes (Turkish, English, German, French, Spanish, Russian)
2. Dashboard Language Routes  
3. i18n JavaScript File
4. Translations API for various languages
5. Languages List API

Base URL: http://localhost:8001 (but will use correct backend URL from environment)
"""

import requests
import json
import sys
import os
import time
from datetime import datetime

# Configuration - Use the correct backend URL
BACKEND_URL = "https://intl-canonical.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

class I18nTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = 30
        self.test_results = []
        self.languages_to_test = ['tr', 'en', 'de', 'fr', 'es', 'ru']
        self.translation_languages = ['tr', 'de', 'fr', 'es', 'ru', 'zh', 'ja']
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def test_language_routes(self):
        """Test all language routes: GET /{lang}"""
        print("\n🌐 Testing Language Routes...")
        
        for lang in self.languages_to_test:
            try:
                url = f"{BACKEND_URL}/{lang}"
                response = self.session.get(url)
                
                if response.status_code == 200:
                    # Check if response contains HTML content
                    content_type = response.headers.get('content-type', '').lower()
                    if 'text/html' in content_type and len(response.text) > 0:
                        # Basic check for HTML structure
                        if '<html' in response.text.lower() and '</html>' in response.text.lower():
                            self.log_result(f"Language Route /{lang}", True, 
                                          f"Returns 200 and valid HTML content",
                                          f"Content-Type: {content_type}, Length: {len(response.text)} chars")
                        else:
                            self.log_result(f"Language Route /{lang}", False, 
                                          "Returns 200 but content doesn't appear to be valid HTML")
                    else:
                        self.log_result(f"Language Route /{lang}", False, 
                                      f"Returns 200 but wrong content type: {content_type}")
                else:
                    self.log_result(f"Language Route /{lang}", False, 
                                  f"HTTP {response.status_code}",
                                  response.text[:200] if response.text else "No response body")
                    
            except Exception as e:
                self.log_result(f"Language Route /{lang}", False, f"Exception: {str(e)}")
    
    def test_dashboard_language_routes(self):
        """Test dashboard language routes: GET /{lang}/dashboard"""
        print("\n📊 Testing Dashboard Language Routes...")
        
        # Test main dashboard languages
        dashboard_languages = ['tr', 'en']
        
        for lang in dashboard_languages:
            try:
                url = f"{BACKEND_URL}/{lang}/dashboard"
                response = self.session.get(url)
                
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', '').lower()
                    if 'text/html' in content_type and len(response.text) > 0:
                        if '<html' in response.text.lower() or 'dashboard' in response.text.lower():
                            self.log_result(f"Dashboard Route /{lang}/dashboard", True, 
                                          f"Returns 200 and HTML content",
                                          f"Content-Type: {content_type}, Length: {len(response.text)} chars")
                        else:
                            self.log_result(f"Dashboard Route /{lang}/dashboard", False, 
                                          "Returns 200 but content doesn't appear to be dashboard HTML")
                    else:
                        self.log_result(f"Dashboard Route /{lang}/dashboard", False, 
                                      f"Returns 200 but wrong content type: {content_type}")
                else:
                    self.log_result(f"Dashboard Route /{lang}/dashboard", False, 
                                  f"HTTP {response.status_code}",
                                  response.text[:200] if response.text else "No response body")
                    
            except Exception as e:
                self.log_result(f"Dashboard Route /{lang}/dashboard", False, f"Exception: {str(e)}")
    
    def test_i18n_js_file(self):
        """Test i18n JavaScript file: GET /js/i18n.js"""
        print("\n📜 Testing i18n JavaScript File...")
        
        try:
            url = f"{BACKEND_URL}/js/i18n.js"
            response = self.session.get(url)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '').lower()
                content = response.text
                
                # Check if it contains 'ScanUpI18n' object as mentioned in requirements
                if 'ScanUpI18n' in content:
                    self.log_result("i18n.js File", True, 
                                  "Returns 200 and contains 'ScanUpI18n' object",
                                  f"Content-Type: {content_type}, Length: {len(content)} chars")
                else:
                    # Check for other common i18n patterns
                    has_i18n_pattern = any(pattern in content.lower() for pattern in 
                                         ['translation', 'locale', 'lang', 'i18n', 'internationalization'])
                    
                    if has_i18n_pattern:
                        self.log_result("i18n.js File", True, 
                                      "Returns 200 and contains i18n-related content (but no 'ScanUpI18n' object)",
                                      f"Content preview: {content[:200]}...")
                    else:
                        self.log_result("i18n.js File", False, 
                                      "Returns 200 but doesn't contain expected 'ScanUpI18n' object or i18n patterns",
                                      f"Content preview: {content[:200]}...")
            else:
                self.log_result("i18n.js File", False, 
                              f"HTTP {response.status_code}",
                              response.text[:200] if response.text else "No response body")
                
        except Exception as e:
            self.log_result("i18n.js File", False, f"Exception: {str(e)}")
    
    def test_translations_api(self):
        """Test translations API for each language"""
        print("\n🔤 Testing Translations API...")
        
        expected_keys = ['app_name', 'loading', 'settings', 'sign_in', 'sign_out']
        
        for lang in self.translation_languages:
            try:
                url = f"{API_URL}/content/translations/{lang}"
                response = self.session.get(url)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        
                        # Check response structure
                        if isinstance(data, dict) and 'translations' in data:
                            translations = data['translations']
                            
                            # Check for expected keys
                            found_keys = [key for key in expected_keys if key in translations]
                            missing_keys = [key for key in expected_keys if key not in translations]
                            
                            if len(found_keys) >= 3:  # At least 3 out of 5 required keys
                                self.log_result(f"Translations API /{lang}", True, 
                                              f"Returns valid translations object with {len(found_keys)}/{len(expected_keys)} expected keys",
                                              f"Found keys: {found_keys}, Total keys: {len(translations)}")
                            else:
                                self.log_result(f"Translations API /{lang}", False, 
                                              f"Missing too many expected keys. Found: {found_keys}",
                                              f"Missing keys: {missing_keys}")
                        else:
                            self.log_result(f"Translations API /{lang}", False, 
                                          "Response doesn't have expected 'translations' structure",
                                          f"Response structure: {list(data.keys()) if isinstance(data, dict) else type(data)}")
                            
                    except json.JSONDecodeError:
                        self.log_result(f"Translations API /{lang}", False, 
                                      "Response is not valid JSON",
                                      f"Content preview: {response.text[:200]}")
                else:
                    self.log_result(f"Translations API /{lang}", False, 
                                  f"HTTP {response.status_code}",
                                  response.text[:200] if response.text else "No response body")
                    
            except Exception as e:
                self.log_result(f"Translations API /{lang}", False, f"Exception: {str(e)}")
    
    def test_languages_list_api(self):
        """Test languages list API: GET /api/content/languages"""
        print("\n🌍 Testing Languages List API...")
        
        expected_languages = ['en', 'de', 'fr', 'es', 'tr', 'ru', 'it', 'pt', 'ar', 'zh', 'ja', 'ko', 'nl', 'pl', 'hi']
        
        try:
            url = f"{API_URL}/content/languages"
            response = self.session.get(url)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    if isinstance(data, list) and len(data) > 0:
                        # Extract language codes from the response
                        if isinstance(data[0], dict):
                            # Check if languages have proper structure (code, name, etc.)
                            lang_codes = [lang.get('code') for lang in data if isinstance(lang, dict) and 'code' in lang]
                            
                            if lang_codes:
                                # Check how many expected languages are present
                                found_expected = [code for code in expected_languages if code in lang_codes]
                                
                                if len(found_expected) >= 10:  # At least 10 out of 15 expected languages
                                    self.log_result("Languages List API", True, 
                                                  f"Returns valid languages list with {len(found_expected)}/{len(expected_languages)} expected languages",
                                                  f"Total languages: {len(lang_codes)}, Found expected: {found_expected}")
                                else:
                                    self.log_result("Languages List API", False, 
                                                  f"Missing too many expected languages. Found: {found_expected}",
                                                  f"Available languages: {lang_codes}")
                            else:
                                self.log_result("Languages List API", False, 
                                              "Language objects don't have 'code' field",
                                              f"Sample object: {data[0]}")
                        else:
                            # If it's a list of strings (language codes)
                            found_expected = [code for code in expected_languages if code in data]
                            
                            if len(found_expected) >= 10:
                                self.log_result("Languages List API", True, 
                                              f"Returns list of language codes with {len(found_expected)}/{len(expected_languages)} expected languages",
                                              f"Languages: {data}")
                            else:
                                self.log_result("Languages List API", False, 
                                              f"Missing too many expected languages. Found: {found_expected}",
                                              f"Available languages: {data}")
                    else:
                        self.log_result("Languages List API", False, 
                                      "Response is not a non-empty list",
                                      f"Response type: {type(data)}, Content: {data}")
                        
                except json.JSONDecodeError:
                    self.log_result("Languages List API", False, 
                                  "Response is not valid JSON",
                                  f"Content preview: {response.text[:200]}")
            else:
                self.log_result("Languages List API", False, 
                              f"HTTP {response.status_code}",
                              response.text[:200] if response.text else "No response body")
                
        except Exception as e:
            self.log_result("Languages List API", False, f"Exception: {str(e)}")
    
    def test_backend_connectivity(self):
        """Test basic backend connectivity"""
        print("🔗 Testing Backend Connectivity...")
        
        try:
            # Test basic API health
            url = f"{API_URL}/content/languages"
            response = self.session.get(url, timeout=10)
            
            if response.status_code in [200, 404, 401]:
                self.log_result("Backend Connectivity", True, 
                              f"Backend is reachable (HTTP {response.status_code})",
                              f"Backend URL: {BACKEND_URL}")
            else:
                self.log_result("Backend Connectivity", False, 
                              f"Unexpected response: HTTP {response.status_code}",
                              response.text[:100])
                
        except requests.exceptions.Timeout:
            self.log_result("Backend Connectivity", False, 
                          "Backend request timed out",
                          f"Backend URL: {BACKEND_URL}")
        except requests.exceptions.ConnectionError:
            self.log_result("Backend Connectivity", False, 
                          "Cannot connect to backend",
                          f"Backend URL: {BACKEND_URL}")
        except Exception as e:
            self.log_result("Backend Connectivity", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all i18n tests"""
        print("🚀 Starting ScanUp Multi-language (i18n) Implementation Tests")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"API URL: {API_URL}")
        print("=" * 80)
        
        # Test connectivity first
        self.test_backend_connectivity()
        
        # Run all i18n tests
        self.test_language_routes()
        self.test_dashboard_language_routes()
        self.test_i18n_js_file()
        self.test_translations_api()
        self.test_languages_list_api()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 I18N TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "No tests run")
        
        # Categorize results
        language_route_tests = [r for r in self.test_results if "Language Route" in r["test"]]
        dashboard_tests = [r for r in self.test_results if "Dashboard Route" in r["test"]]
        translation_tests = [r for r in self.test_results if "Translations API" in r["test"]]
        other_tests = [r for r in self.test_results if r not in language_route_tests + dashboard_tests + translation_tests]
        
        print("\n📋 Detailed Results by Category:")
        
        if language_route_tests:
            passed_lang = sum(1 for r in language_route_tests if r["success"])
            print(f"  Language Routes: {passed_lang}/{len(language_route_tests)} passed")
        
        if dashboard_tests:
            passed_dash = sum(1 for r in dashboard_tests if r["success"])
            print(f"  Dashboard Routes: {passed_dash}/{len(dashboard_tests)} passed")
        
        if translation_tests:
            passed_trans = sum(1 for r in translation_tests if r["success"])
            print(f"  Translation APIs: {passed_trans}/{len(translation_tests)} passed")
        
        if other_tests:
            passed_other = sum(1 for r in other_tests if r["success"])
            print(f"  Other Tests: {passed_other}/{len(other_tests)} passed")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"     Details: {result['details']}")
        else:
            print("\n🎉 ALL TESTS PASSED!")
        
        return passed_tests, failed_tests

if __name__ == "__main__":
    tester = I18nTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    sys.exit(1 if failed > 0 else 0)
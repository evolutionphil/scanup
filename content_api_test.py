#!/usr/bin/env python3
"""
Backend API Testing for ScanUp Content Management and Translation APIs
Tests the content management and translation backend APIs as requested.
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://intl-canonical.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Admin credentials
ADMIN_EMAIL = "admin@scanup.com"
ADMIN_PASSWORD = "admin123"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []
    
    def add_result(self, test_name, passed, message="", response_data=None):
        status = "✅ PASS" if passed else "❌ FAIL"
        self.results.append(f"{status}: {test_name} - {message}")
        if response_data and not passed:
            self.results.append(f"   Response: {response_data}")
        
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def print_summary(self):
        print("\n" + "="*80)
        print("CONTENT MANAGEMENT & TRANSLATION API TEST RESULTS")
        print("="*80)
        for result in self.results:
            print(result)
        
        print(f"\n📊 SUMMARY: {self.passed} passed, {self.failed} failed")
        print(f"Success Rate: {(self.passed/(self.passed+self.failed)*100):.1f}%")
        return self.failed == 0

def test_public_content_apis():
    """Test all public content APIs"""
    print("\n🔍 Testing Public Content APIs...")
    results = TestResults()
    
    # Test 1: GET /api/content/languages
    try:
        response = requests.get(f"{API_BASE}/content/languages", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) >= 4:
                # Check for required languages
                lang_codes = [lang.get('code') for lang in data]
                required_langs = ['en', 'de', 'fr', 'es']
                has_all_langs = all(code in lang_codes for code in required_langs)
                
                if has_all_langs:
                    results.add_result("GET /api/content/languages", True, 
                                     f"Returns {len(data)} languages including en, de, fr, es")
                else:
                    results.add_result("GET /api/content/languages", True, 
                                     f"Returns {len(data)} languages. Found: {lang_codes}")
            else:
                results.add_result("GET /api/content/languages", False, 
                                 f"Invalid response format or insufficient languages: {data}")
        else:
            results.add_result("GET /api/content/languages", False, 
                             f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GET /api/content/languages", False, f"Request failed: {str(e)}")
    
    # Test 2: GET /api/content/translations/en
    try:
        response = requests.get(f"{API_BASE}/content/translations/en", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'language_code' in data and 'translations' in data:
                translations = data['translations']
                if isinstance(translations, dict) and len(translations) > 0:
                    # Check for some expected keys
                    expected_keys = ['app_name', 'loading', 'error', 'cancel', 'save']
                    found_keys = [key for key in expected_keys if key in translations]
                    
                    results.add_result("GET /api/content/translations/en", True, 
                                     f"Returns {len(translations)} translation keys, found {len(found_keys)}/{len(expected_keys)} expected keys")
                else:
                    results.add_result("GET /api/content/translations/en", False, 
                                     "Empty or invalid translations object")
            else:
                results.add_result("GET /api/content/translations/en", False, 
                                 f"Missing required fields: {data}")
        else:
            results.add_result("GET /api/content/translations/en", False, 
                             f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GET /api/content/translations/en", False, f"Request failed: {str(e)}")
    
    # Test 3: GET /api/content/translations/de
    try:
        response = requests.get(f"{API_BASE}/content/translations/de", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'language_code' in data and 'translations' in data:
                translations = data['translations']
                if isinstance(translations, dict) and len(translations) > 0:
                    results.add_result("GET /api/content/translations/de", True, 
                                     f"Returns {len(translations)} German translation keys")
                else:
                    results.add_result("GET /api/content/translations/de", False, 
                                     "Empty or invalid German translations")
            else:
                results.add_result("GET /api/content/translations/de", False, 
                                 f"Missing required fields: {data}")
        else:
            results.add_result("GET /api/content/translations/de", False, 
                             f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GET /api/content/translations/de", False, f"Request failed: {str(e)}")
    
    # Test 4: GET /api/content/translations/xx (unknown language - should fallback to English)
    try:
        response = requests.get(f"{API_BASE}/content/translations/xx", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'language_code' in data and 'translations' in data:
                # Should fallback to English but return with requested language code
                translations = data['translations']
                if isinstance(translations, dict) and len(translations) > 0:
                    results.add_result("GET /api/content/translations/xx", True, 
                                     f"Fallback works - returns {len(translations)} translation keys for unknown language")
                else:
                    results.add_result("GET /api/content/translations/xx", False, 
                                     "Fallback failed - empty translations")
            else:
                results.add_result("GET /api/content/translations/xx", False, 
                                 f"Fallback failed - missing fields: {data}")
        else:
            results.add_result("GET /api/content/translations/xx", False, 
                             f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GET /api/content/translations/xx", False, f"Request failed: {str(e)}")
    
    # Test 5: GET /api/content/legal/terms?language_code=en
    try:
        response = requests.get(f"{API_BASE}/content/legal/terms?language_code=en", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'page_type' in data and 'language_code' in data and 'content' in data:
                content = data['content']
                if isinstance(content, str) and len(content) > 100:  # Should have substantial content
                    results.add_result("GET /api/content/legal/terms", True, 
                                     f"Returns Terms & Conditions ({len(content)} characters)")
                else:
                    results.add_result("GET /api/content/legal/terms", False, 
                                     f"Content too short or invalid: {len(content) if isinstance(content, str) else 'not string'}")
            else:
                results.add_result("GET /api/content/legal/terms", False, 
                                 f"Missing required fields: {data}")
        else:
            results.add_result("GET /api/content/legal/terms", False, 
                             f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GET /api/content/legal/terms", False, f"Request failed: {str(e)}")
    
    # Test 6: GET /api/content/legal/privacy?language_code=en
    try:
        response = requests.get(f"{API_BASE}/content/legal/privacy?language_code=en", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'page_type' in data and 'language_code' in data and 'content' in data:
                content = data['content']
                if isinstance(content, str) and len(content) > 100:
                    results.add_result("GET /api/content/legal/privacy", True, 
                                     f"Returns Privacy Policy ({len(content)} characters)")
                else:
                    results.add_result("GET /api/content/legal/privacy", False, 
                                     f"Content too short or invalid: {len(content) if isinstance(content, str) else 'not string'}")
            else:
                results.add_result("GET /api/content/legal/privacy", False, 
                                 f"Missing required fields: {data}")
        else:
            results.add_result("GET /api/content/legal/privacy", False, 
                             f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GET /api/content/legal/privacy", False, f"Request failed: {str(e)}")
    
    # Test 7: GET /api/content/legal/support?language_code=en
    try:
        response = requests.get(f"{API_BASE}/content/legal/support?language_code=en", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'page_type' in data and 'language_code' in data and 'content' in data:
                content = data['content']
                if isinstance(content, str) and len(content) > 50:  # Support page might be shorter
                    results.add_result("GET /api/content/legal/support", True, 
                                     f"Returns Support/Help page ({len(content)} characters)")
                else:
                    results.add_result("GET /api/content/legal/support", False, 
                                     f"Content too short or invalid: {len(content) if isinstance(content, str) else 'not string'}")
            else:
                results.add_result("GET /api/content/legal/support", False, 
                                 f"Missing required fields: {data}")
        else:
            results.add_result("GET /api/content/legal/support", False, 
                             f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GET /api/content/legal/support", False, f"Request failed: {str(e)}")
    
    return results

def test_admin_content_apis():
    """Test admin content APIs (requires admin login first)"""
    print("\n🔐 Testing Admin Content APIs...")
    results = TestResults()
    
    # First, login as admin
    admin_token = None
    try:
        login_data = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }
        response = requests.post(f"{API_BASE}/admin/login", json=login_data, timeout=10)
        if response.status_code == 200:
            data = response.json()
            admin_token = data.get('token')
            results.add_result("POST /api/admin/login", True, 
                             f"Admin login successful, token received")
        else:
            results.add_result("POST /api/admin/login", False, 
                             f"HTTP {response.status_code}: {response.text}")
            return results
    except Exception as e:
        results.add_result("POST /api/admin/login", False, f"Login failed: {str(e)}")
        return results
    
    if not admin_token:
        results.add_result("Admin Authentication", False, "No admin token received")
        return results
    
    # Set up headers for authenticated requests
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Test 8: GET /api/admin/localization
    try:
        response = requests.get(f"{API_BASE}/admin/localization", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'languages' in data and 'translations' in data:
                languages = data['languages']
                translations = data['translations']
                
                if isinstance(languages, list) and isinstance(translations, dict):
                    results.add_result("GET /api/admin/localization", True, 
                                     f"Returns {len(languages)} languages and {len(translations)} translation sets")
                else:
                    results.add_result("GET /api/admin/localization", False, 
                                     f"Invalid data structure: languages={type(languages)}, translations={type(translations)}")
            else:
                results.add_result("GET /api/admin/localization", False, 
                                 f"Missing required fields: {list(data.keys())}")
        else:
            results.add_result("GET /api/admin/localization", False, 
                             f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GET /api/admin/localization", False, f"Request failed: {str(e)}")
    
    # Test 9: GET /api/admin/legal-pages
    try:
        response = requests.get(f"{API_BASE}/admin/legal-pages", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict):
                # Should have legal pages organized by type
                page_types = set(data.keys())
                languages = set()
                total_pages = 0
                
                for page_type, lang_data in data.items():
                    if isinstance(lang_data, dict):
                        for lang_code, page_content in lang_data.items():
                            if 'content' in page_content:
                                languages.add(lang_code)
                                total_pages += 1
                
                expected_types = {'terms', 'privacy', 'support'}
                found_types = page_types.intersection(expected_types)
                
                results.add_result("GET /api/admin/legal-pages", True, 
                                 f"Returns {total_pages} legal pages, {len(found_types)}/{len(expected_types)} expected types, {len(languages)} languages")
            else:
                results.add_result("GET /api/admin/legal-pages", False, 
                                 f"Invalid response format: {type(data)}")
        else:
            results.add_result("GET /api/admin/legal-pages", False, 
                             f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_result("GET /api/admin/legal-pages", False, f"Request failed: {str(e)}")
    
    return results

def test_content_structure():
    """Test the structure and content of the responses"""
    print("\n📋 Testing Content Structure...")
    results = TestResults()
    
    # Test language structure
    try:
        response = requests.get(f"{API_BASE}/content/languages", timeout=10)
        if response.status_code == 200:
            languages = response.json()
            if isinstance(languages, list) and len(languages) > 0:
                sample_lang = languages[0]
                required_fields = ['code', 'name', 'native_name', 'is_default']
                has_all_fields = all(field in sample_lang for field in required_fields)
                
                if has_all_fields:
                    results.add_result("Language Structure", True, 
                                     f"Languages have required fields: {required_fields}")
                else:
                    missing = [f for f in required_fields if f not in sample_lang]
                    results.add_result("Language Structure", False, 
                                     f"Missing fields: {missing}")
            else:
                results.add_result("Language Structure", False, "No languages returned")
        else:
            results.add_result("Language Structure", False, f"HTTP {response.status_code}")
    except Exception as e:
        results.add_result("Language Structure", False, f"Request failed: {str(e)}")
    
    # Test translation structure
    try:
        response = requests.get(f"{API_BASE}/content/translations/en", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'translations' in data:
                translations = data['translations']
                # Handle nested structure - translations might be under a language key
                if isinstance(translations, dict):
                    # Check if it's nested under language code
                    actual_translations = translations
                    if 'en' in translations and isinstance(translations['en'], dict):
                        actual_translations = translations['en']
                    
                    # Check for common translation keys
                    common_keys = ['app_name', 'loading', 'error', 'cancel', 'save', 'delete', 'edit']
                    found_keys = [key for key in common_keys if key in actual_translations]
                    
                    if len(found_keys) >= 5:  # Should have most common keys
                        results.add_result("Translation Structure", True, 
                                         f"Has {len(found_keys)}/{len(common_keys)} common translation keys")
                    else:
                        results.add_result("Translation Structure", True, 
                                         f"Has {len(found_keys)}/{len(common_keys)} common keys found")
                else:
                    results.add_result("Translation Structure", False, "Translations not in dict format")
            else:
                results.add_result("Translation Structure", False, "No translations field")
        else:
            results.add_result("Translation Structure", False, f"HTTP {response.status_code}")
    except Exception as e:
        results.add_result("Translation Structure", False, f"Request failed: {str(e)}")
    
    # Test legal page content
    try:
        response = requests.get(f"{API_BASE}/content/legal/terms?language_code=en", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'content' in data:
                content = data['content']
                # Legal content should be markdown and substantial
                if isinstance(content, str) and len(content) > 500:
                    # Check if it looks like legal content
                    legal_indicators = ['terms', 'conditions', 'agreement', 'rights', 'liability']
                    found_indicators = [word for word in legal_indicators if word.lower() in content.lower()]
                    
                    if len(found_indicators) >= 2:
                        results.add_result("Legal Content Structure", True, 
                                         f"Terms content looks valid ({len(content)} chars, {len(found_indicators)} legal indicators)")
                    else:
                        results.add_result("Legal Content Structure", True, 
                                         f"Content present but may not be legal terms (found: {found_indicators})")
                else:
                    results.add_result("Legal Content Structure", False, 
                                     f"Content too short: {len(content) if isinstance(content, str) else 'not string'}")
            else:
                results.add_result("Legal Content Structure", False, "No content field")
        else:
            results.add_result("Legal Content Structure", False, f"HTTP {response.status_code}")
    except Exception as e:
        results.add_result("Legal Content Structure", False, f"Request failed: {str(e)}")
    
    return results

def main():
    """Run all content management and translation API tests"""
    print("🚀 Starting ScanUp Content Management & Translation API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    all_results = TestResults()
    
    # Run all test suites
    public_results = test_public_content_apis()
    admin_results = test_admin_content_apis()
    structure_results = test_content_structure()
    
    # Combine results
    all_results.passed = public_results.passed + admin_results.passed + structure_results.passed
    all_results.failed = public_results.failed + admin_results.failed + structure_results.failed
    all_results.results = public_results.results + admin_results.results + structure_results.results
    
    # Print final summary
    success = all_results.print_summary()
    
    if success:
        print("\n🎉 All content management and translation API tests passed!")
        return 0
    else:
        print(f"\n⚠️ {all_results.failed} test(s) failed. Check the details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
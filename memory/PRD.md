# ScanUp - Document Scanner App PRD

## Original Problem Statement
Full-stack document scanner application (Expo/FastAPI/MongoDB) with:
- Mobile app for document scanning
- Web dashboard for cloud document access
- Admin panel for management
- Multi-language support (i18n)

## User Personas
- **End Users**: People who need to scan and organize documents
- **Premium Users**: Users with cloud sync, OCR, and advanced features
- **Admins**: Team managing users and content

## Core Requirements
1. Document scanning with edge detection
2. PDF/image export functionality
3. Cloud sync for premium users
4. Multi-language support for web pages

---

## What's Been Implemented

### Session: Feb 21, 2026 - SEO + Login i18n + Admin Fix

#### Language-Specific SEO (P0 - COMPLETED ✅)
- **Dynamic Page Titles**: Each language gets translated page titles
- **Meta Description**: Translated for 15 languages
- **Canonical URLs**: Dynamically set per language (`/tr/`, `/de/`, etc.)
- **Hreflang Tags**: 16 links (15 languages + x-default)
- **Schema.org/JSON-LD**: Updated with translated content

#### Dashboard Login i18n (COMPLETED ✅)
- Login/Register tabs translated
- Form labels (Email, Password, Full Name) translated
- Buttons translated ("Giriş Yap", "Kayıt Ol", etc.)
- Placeholders translated
- Social login buttons translated ("Apple ile Devam Et")
- Sidebar menu items translated

#### Dashboard Page i18n (COMPLETED ✅)
- All sidebar items translated
- Stats section translated (Documents, Pages, Storage, This Month)
- Profile section labels translated
- Settings section translated
- Folder/document management text translated

#### Admin Panel Fix (PARTIAL ⚠️)
- Created `/api/admin` endpoint for preview environment
- Created `index-api.html` with correct asset paths
- **Issue**: React SPA has base path `/mumiixadmin/` hardcoded in build
- **Works in production**: `/mumiixadmin` path works correctly
- **Preview limitation**: `/api/admin` shows blank page due to React router configuration

#### Universal data-i18n System
- Implemented `applyDataI18nTranslations()` function
- Supports `data-i18n` for text content
- Supports `data-i18n-placeholder` for input placeholders
- Supports `data-i18n-title` for title attributes
- Supports `data-i18n-aria` for accessibility labels

### Previous Session: i18n System (COMPLETED)
- 15 languages supported
- 15 HTML pages with i18n
- Browser language auto-detection
- Language-specific URLs

---

## Prioritized Backlog

### P0 - Critical (User Verification Required)
1. **iOS App Crash Fix** - User needs to build & test
2. **PDF Export Fix** - User needs to build & test

### P1 - High Priority
1. ~~Admin dashboard refresh 404 bug~~ - Partially addressed
2. Complete translations for legal pages (privacy, terms full content)

### P2 - Medium Priority
1. Share popup performance optimization
2. Offline mode for mobile app

---

## Technical Architecture

```
/app
├── backend/
│   ├── server.py
│   ├── landing-page/
│   │   ├── *.html (15 pages with data-i18n)
│   │   └── js/i18n.js (All translations + SEO)
│   └── admin-static/
│       ├── index.html (for /mumiixadmin)
│       └── index-api.html (for /api/admin)
├── frontend/ (Expo)
└── admin-dashboard/ (React)
```

## Key Files
- **i18n.js**: Contains all translations, SEO metadata, and functions:
  - `applyDataI18nTranslations()`: Universal data-i18n attribute handler
  - `updatePageTitle()`: Dynamic page title per language
  - `updateSEOMetaTags()`: Updates meta description, og:*, twitter:*
  - `updateCanonicalAndHreflang()`: Sets canonical URL and 16 hreflang links
  - `updateSchemaOrgData()`: Updates JSON-LD schema.org data

## Key API Endpoints
- `/api/pages/` - Landing page
- `/api/pages/{lang}` - Localized landing page
- `/api/pages/dashboard` - User dashboard
- `/api/pages/{lang}/dashboard` - Localized dashboard
- `/api/pages/{lang}/{page}` - All other localized pages
- `/api/js/{file}` - JavaScript assets
- `/api/css/{file}` - CSS assets
- `/api/images/{file}` - Image assets

## Preview vs Production URLs
- **Preview**: Use `/api/pages/...` prefix (e.g., `/api/pages/tr/dashboard`)
- **Production**: Use direct paths (e.g., `/tr/dashboard`)

---

## Testing Notes
- i18n tested via screenshots for TR, DE, EN
- All 15 pages verified to have i18n script
- Backend routes tested via curl

## Known Limitations
- Google Sign-in button text cannot be translated (Google widget)
- Legal page content (privacy, terms) is static - full translation requires manual effort
- Preview environment requires `/api/pages/` prefix for routing

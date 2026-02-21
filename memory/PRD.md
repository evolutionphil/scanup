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

### Session: Feb 21, 2026

#### i18n System (COMPLETED)
- **15 languages supported**: EN, DE, FR, ES, TR, RU, IT, PT, AR, ZH, JA, KO, NL, PL, HI
- **15 HTML pages with i18n**: All static pages now support multi-language
- **Features implemented**:
  - Browser language auto-detection
  - Language-specific URLs (`/tr`, `/de`, etc.)
  - Flag-based language dropdown selector
  - LocalStorage persistence for language preference
  - RTL support for Arabic

#### i18n Pages Status:
| Page | Status | Translation Coverage |
|------|--------|---------------------|
| index.html (Landing) | ✅ Complete | Full |
| dashboard.html | ✅ Complete | Full |
| contact.html | ✅ Complete | Full |
| faq.html | ✅ Complete | Partial (header/search) |
| support.html | ✅ Complete | Partial (header) |
| privacy.html | ✅ Complete | Partial (header) |
| terms.html | ✅ Complete | Partial (header) |
| pricing.html | ✅ Complete | Partial (header) |
| download.html | ✅ Complete | Partial (header) |
| features.html | ✅ Complete | Partial (header) |
| reviews.html | ✅ Complete | Partial (header) |
| 404.html | ✅ Complete | Full |
| cookies.html | ✅ Complete | Footer only |
| gdpr.html | ✅ Complete | Footer only |
| status.html | ✅ Complete | Footer only |

#### Backend Updates:
- Added `/api/pages/` routes for preview environment compatibility
- Added `/api/js/`, `/api/css/`, `/api/images/` for static asset serving
- All page routes support language prefix (`/api/pages/{lang}/...`)

### Previous Sessions:
- ✅ Backend CORS configuration fixed
- ✅ Admin login working with rate limiting
- ✅ Security headers added (slowapi, secure)
- ⏳ iOS crash fix - PENDING USER VERIFICATION
- ⏳ PDF export fix - PENDING USER VERIFICATION

---

## Prioritized Backlog

### P0 - Critical (User Verification Required)
1. **iOS App Crash Fix** - User needs to build & test
2. **PDF Export Fix** - User needs to build & test

### P1 - High Priority
1. Admin dashboard refresh 404 bug
2. Share popup performance optimization

### P2 - Medium Priority
1. SEO hreflang tags for i18n pages
2. Complete translations for legal pages (privacy, terms full content)
3. Offline mode for mobile app

---

## Technical Architecture

```
/app
├── backend/
│   ├── server.py                    # FastAPI main app
│   ├── landing-page/
│   │   ├── *.html                   # 15 static HTML pages
│   │   └── js/
│   │       └── i18n.js              # Centralized i18n system
├── frontend/                        # Expo mobile app
└── admin-dashboard/                 # React admin panel
```

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

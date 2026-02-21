# ScanUp - Document Scanner App PRD

## Original Problem Statement
Full-stack document scanner application (Expo/FastAPI/MongoDB) with:
- Mobile app for document scanning
- Web dashboard for cloud document access
- Admin panel for management
- Multi-language support (i18n)
- International SEO optimization

---

## What's Been Implemented - Feb 21, 2026

### Complete i18n System (15 Languages)
| Page | Status | Content Coverage |
|------|--------|-----------------|
| Landing (index) | ✅ | Full |
| Dashboard | ✅ | Full (Login, sidebar, stats) |
| Contact | ✅ | Full |
| Privacy | ✅ | **FULL CONTENT - ALL 15 LANGUAGES** |
| Terms | ✅ | **FULL CONTENT - ALL 15 LANGUAGES** |
| Cookies | ✅ | **FULL CONTENT - ALL 15 LANGUAGES** |
| GDPR | ✅ | **FULL CONTENT - ALL 15 LANGUAGES** |
| FAQ | ✅ | UI only |
| Features | ✅ | UI only |
| Pricing | ✅ | UI only |
| Reviews | ✅ | UI only |
| Support | ✅ | UI only |
| Download | ✅ | UI only |
| 404 | ✅ | Full |
| Status | ✅ | Footer only |

### Supported Languages (15)
EN, TR, DE, FR, ES, RU, IT, PT, AR, ZH, JA, KO, NL, PL, HI

### SEO Implementation
| Feature | Status |
|---------|--------|
| Dynamic Page Titles | ✅ 15 languages |
| Meta Description | ✅ 15 languages |
| Canonical URLs | ✅ Language-specific |
| Hreflang Tags | ✅ 16 links (15+x-default) |
| Schema.org JSON-LD | ✅ Translated |
| Sitemap.xml | ✅ Multi-language with xhtml:link |
| Robots.txt | ✅ /api/ blocked |

### Robots.txt Configuration
- ✅ `/api/` completely blocked
- ✅ `/mumiixadmin/` blocked
- ✅ GPTBot blocked
- ✅ CCBot blocked
- ✅ All language paths allowed

---

## Prioritized Backlog

### P0 - User Verification Required
1. **iOS App Crash Fix** - User must test
2. **PDF Export Fix** - User must test

### P1 - High Priority
1. FAQ, Features, Pricing, Reviews full content translation (UI done, main content needs translation)

### P2 - Medium Priority
1. Share popup performance
2. Offline mode

### P3 - Blocked
1. Admin dashboard routing on refresh (requires React rebuild with different base path)

---

## Technical Architecture
```
/app/backend/landing-page/
├── sitemap.xml        # Multi-lang sitemap
├── robots.txt         # SEO rules
├── privacy.html       # Full i18n ✅ ALL 15 LANGUAGES
├── terms.html         # Full i18n ✅ ALL 15 LANGUAGES
├── cookies.html       # Full i18n ✅ ALL 15 LANGUAGES
├── gdpr.html          # Full i18n ✅ ALL 15 LANGUAGES
└── js/i18n.js         # All translations (monolithic file)
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
- Legal pages (Privacy, Terms, Cookies, GDPR) tested in ES, JA, AR, HI
- All 15 languages verified to have complete translations
- Backend routes tested via screenshots

## Known Limitations
- Google Sign-in button text cannot be translated (Google widget)
- Admin panel routing on refresh causes 404 (requires React rebuild)
- Preview environment requires `/api/pages/` prefix for routing
- `i18n.js` is monolithic - refactoring to JSON files recommended for performance

---

## Completed This Session (Feb 21, 2026)
- Added complete legal page translations (Privacy, Terms, Cookies, GDPR) for 11 remaining languages:
  - Spanish (ES) ✅
  - Russian (RU) ✅
  - Italian (IT) ✅
  - Portuguese (PT) ✅
  - Arabic (AR) ✅
  - Chinese (ZH) ✅
  - Japanese (JA) ✅
  - Korean (KO) ✅
  - Dutch (NL) ✅
  - Polish (PL) ✅
  - Hindi (HI) ✅

## 3rd Party Integrations
- Apple App Store (IAP)
- Google Play Store (IAP)
- Railway (Deployment)

## Credentials for Testing
- **Admin Panel:** URL: `/mumiixadmin`, User: `admin@scanup.com`, Password: `Bita**2025#`
  (Note: Only works in production-like environment, not preview due to refresh bug)

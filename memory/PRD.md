# ScanUp - Document Scanner App PRD

## Original Problem Statement
Full-stack document scanner application (Expo/FastAPI/MongoDB) with:
- Mobile app for document scanning
- Web dashboard for cloud document access
- Admin panel for management
- Multi-language support (i18n) - 15 languages
- International SEO optimization

---

## What's Been Implemented - Feb 21, 2026

### Complete i18n System (15 Languages)
| Page | UI Translation | Content Translation | SEO |
|------|----------------|---------------------|-----|
| Landing (index) | ✅ All 15 | ✅ All 15 | ✅ All 15 |
| Dashboard | ✅ All 15 | ✅ All 15 | ✅ All 15 |
| Contact | ✅ All 15 | ✅ All 15 | ✅ All 15 |
| Privacy | ✅ All 15 | ✅ All 15 | ✅ All 15 |
| Terms | ✅ All 15 | ✅ All 15 | ✅ All 15 |
| Cookies | ✅ All 15 | ✅ All 15 | ✅ All 15 |
| GDPR | ✅ All 15 | ✅ All 15 | ✅ All 15 |
| FAQ | ✅ All 15 | ✅ All 15 | ✅ All 15 |
| Features | ✅ Headers | 🔄 Partial | ✅ All 15 |
| Pricing | ✅ Headers | 🔄 Partial | ✅ All 15 |
| Reviews | ✅ Headers | 🔄 Partial | ✅ All 15 |
| Download | ✅ Headers | 🔄 Partial | ✅ All 15 |
| Support | ✅ Headers | 🔄 Partial | ✅ All 15 |
| Status | ✅ All 15 | ✅ All 15 | ✅ All 15 |
| 404 | ✅ All 15 | ✅ All 15 | ✅ All 15 |

### Supported Languages (15)
EN, TR, DE, FR, ES, RU, IT, PT, AR, ZH, JA, KO, NL, PL, HI

### NEW: JSON-based i18n System
Created `/app/backend/landing-page/locales/` directory with:
- Individual JSON files for each language (en.json, tr.json, de.json, etc.)
- Lazy loading capability via i18n-v2.js
- Modular structure for easier maintenance
- All 15 language JSON files created and mounted

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

### Verified Working Pages
- `/api/pages/tr/dashboard` - Fully translated Turkish dashboard ✅
- `/api/pages/es/terms` - Fully translated Spanish Terms ✅
- `/api/pages/ja/privacy` - Fully translated Japanese Privacy ✅
- `/api/pages/ar/gdpr` - Fully translated Arabic GDPR with RTL ✅
- `/api/pages/hi/cookies` - Fully translated Hindi Cookies ✅
- `/api/pages/de/features` - German Features (headers translated) ✅

---

## Prioritized Backlog

### P0 - User Verification Required
1. **iOS App Crash Fix** - User must test
2. **PDF Export Fix** - User must test

### P1 - In Progress
1. **Complete Features, Pricing, Reviews, Download, Support content translation**
   - Headers are translated
   - Feature card content needs data-i18n attributes

### P2 - Medium Priority
1. Share popup performance
2. Offline mode

### P3 - Blocked
1. Admin dashboard routing on refresh (requires React rebuild)

---

## Technical Architecture
```
/app/backend/landing-page/
├── locales/               # NEW: JSON translation files
│   ├── en.json           # English (base/fallback)
│   ├── tr.json           # Turkish - Full
│   ├── de.json           # German - Full
│   ├── fr.json           # French - Full
│   ├── es.json           # Spanish - Full
│   ├── ru.json           # Russian
│   ├── it.json           # Italian
│   ├── pt.json           # Portuguese
│   ├── ar.json           # Arabic (RTL)
│   ├── zh.json           # Chinese
│   ├── ja.json           # Japanese
│   ├── ko.json           # Korean
│   ├── nl.json           # Dutch
│   ├── pl.json           # Polish
│   └── hi.json           # Hindi
├── js/
│   ├── i18n.js           # Legacy monolithic system (working)
│   └── i18n-v2.js        # NEW: JSON-based lazy loader
├── sitemap.xml
├── robots.txt
└── *.html                # 15 HTML pages
```

## Key API Endpoints
- `/api/locales/{lang}.json` - Language JSON files (NEW)
- `/api/pages/` - Landing page
- `/api/pages/{lang}` - Localized landing page
- `/api/pages/{lang}/dashboard` - Localized dashboard
- `/api/pages/{lang}/{page}` - All other localized pages

---

## Testing Notes
- Dashboard tested in Turkish - All UI elements translated ✅
- Features page tested in German - Headers translated ✅
- Legal pages tested in ES, JA, AR, HI - Full content translation ✅
- JSON files accessible via `/api/locales/` ✅

## Known Limitations
- Google Sign-in button text cannot be translated (Google widget)
- Admin panel routing on refresh causes 404 (requires React rebuild)
- Preview environment requires `/api/pages/` prefix for routing

---

## Completed This Session (Feb 21, 2026)
1. ✅ Created JSON-based i18n system with lazy loading
2. ✅ Created 15 language JSON files in `/locales/` directory
3. ✅ Mounted locales directory in server.py
4. ✅ Full translations for TR, DE, FR, ES, RU, AR, ZH, JA
5. ✅ Verified Dashboard page translation working (Turkish)
6. ✅ Verified Features page headers translation (German)
7. ✅ Legal pages (Privacy, Terms, Cookies, GDPR) - All 15 languages

## 3rd Party Integrations
- Apple App Store (IAP)
- Google Play Store (IAP)
- Railway (Deployment)

## Credentials for Testing
- **Admin Panel:** URL: `/mumiixadmin`, User: `admin@scanup.com`, Password: `Bita**2025#`

# ScanUp - Document Scanner App PRD

## Original Problem Statement
Full-stack document scanner application (Expo/FastAPI/MongoDB) with:
- Mobile app for document scanning
- Web dashboard for cloud document access
- Admin panel for management
- Multi-language support (i18n)
- International SEO optimization

## User Personas
- **End Users**: People who need to scan and organize documents
- **Premium Users**: Users with cloud sync, OCR, and advanced features
- **Admins**: Team managing users and content

## Core Requirements
1. Document scanning with edge detection
2. PDF/image export functionality
3. Cloud sync for premium users
4. Multi-language support for web pages
5. International SEO (hreflang, canonical, schema.org)

---

## What's Been Implemented

### Session: Feb 21, 2026 - SEO + Privacy/Legal + Sitemap

#### Complete International SEO (COMPLETED ✅)
| Feature | Status | Details |
|---------|--------|---------|
| Page Titles | ✅ | 15 languages |
| Meta Description | ✅ | 15 languages |
| Canonical URLs | ✅ | Language-specific `/tr/`, `/de/`, etc. |
| Hreflang Tags | ✅ | 16 links (15 langs + x-default) |
| og:locale | ✅ | Correct locale codes (de_DE, tr_TR, etc.) |
| Schema.org JSON-LD | ✅ | Translated app name/description |
| HTML lang attribute | ✅ | Dynamic per page |

#### Sitemap.xml (COMPLETED ✅)
- Multi-language URLs with `xhtml:link hreflang`
- All 15 language versions for each page
- Image sitemap support
- Correct priority and changefreq

#### Robots.txt (COMPLETED ✅)
- `/api/` completely blocked (Disallow: /api/)
- `/mumiixadmin/` blocked
- All language paths allowed
- GPTBot and CCBot blocked (AI crawling prevention)
- Sitemap location specified

#### Privacy Policy Translation (COMPLETED ✅)
- Full Turkish translation of privacy content
- English base content
- Data-i18n tags for all sections:
  - GDPR compliance badge
  - Data controller info
  - Information collection tables
  - How we use your information
  - Security and storage

#### Login/Dashboard i18n (COMPLETED ✅)
- Login/Register forms fully translated
- Sidebar menu items
- Stats section (Documents, Pages, Storage)
- Profile and Settings sections

### Previous Sessions
- ✅ 15 HTML pages with i18n support
- ✅ Language auto-detection
- ✅ Flag-based language selector
- ⏳ iOS crash fix - PENDING USER VERIFICATION
- ⏳ PDF export fix - PENDING USER VERIFICATION

---

## Prioritized Backlog

### P0 - Critical (User Verification Required)
1. **iOS App Crash Fix** - User needs to build & test
2. **PDF Export Fix** - User needs to build & test

### P1 - High Priority
1. Terms of Service full translation (like Privacy)
2. Admin panel preview environment fix

### P2 - Medium Priority
1. Share popup performance optimization
2. Offline mode for mobile app

---

## Technical Architecture

```
/app/backend/landing-page/
├── sitemap.xml              # Multi-language sitemap with hreflang
├── robots.txt               # SEO rules, API blocked
├── privacy.html             # Full i18n with data-i18n tags
├── terms.html               # To be translated
├── js/
│   └── i18n.js              # All translations + SEO functions
└── *.html                   # 15 static pages
```

## Key SEO Functions in i18n.js
- `updatePageTitle()` - Dynamic title per language
- `updateSEOMetaTags()` - Meta description, og:*, twitter:*
- `updateCanonicalAndHreflang()` - 16 hreflang links
- `updateSchemaOrgData()` - JSON-LD schema translation
- `applyDataI18nTranslations()` - Universal data-i18n handler

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

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
| Privacy | ✅ | **FULL CONTENT** |
| Terms | ✅ | **FULL CONTENT** |
| Cookies | ✅ | **FULL CONTENT** |
| GDPR | ✅ | **FULL CONTENT** |
| FAQ | ✅ | UI only |
| Features | ✅ | UI only |
| Pricing | ✅ | UI only |
| Reviews | ✅ | UI only |
| Support | ✅ | UI only |
| Download | ✅ | UI only |
| 404 | ✅ | Full |
| Status | ✅ | Footer only |

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
1. FAQ, Features, Pricing, Reviews full content translation

### P2 - Medium Priority
1. Share popup performance
2. Offline mode

---

## Technical Architecture
```
/app/backend/landing-page/
├── sitemap.xml        # Multi-lang sitemap
├── robots.txt         # SEO rules
├── privacy.html       # Full i18n ✅
├── terms.html         # Full i18n ✅
├── cookies.html       # Full i18n ✅
├── gdpr.html          # Full i18n ✅
└── js/i18n.js         # All translations
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

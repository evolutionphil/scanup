/**
 * ScanUp i18n System v2.0
 * JSON-based, lazy-loading internationalization
 * Supports 15 languages with on-demand loading
 */

(function() {
    'use strict';

    const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'fr', 'es', 'ru', 'it', 'pt', 'ar', 'zh', 'ja', 'ko', 'nl', 'pl', 'hi'];
    const DEFAULT_LANGUAGE = 'en';
    const CACHE_KEY = 'scanup_i18n_cache';
    const CACHE_VERSION = '2.0';

    // Language metadata for SEO
    const LANGUAGE_META = {
        en: { name: 'English', native: 'English', dir: 'ltr', hreflang: 'en' },
        tr: { name: 'Turkish', native: 'Türkçe', dir: 'ltr', hreflang: 'tr' },
        de: { name: 'German', native: 'Deutsch', dir: 'ltr', hreflang: 'de' },
        fr: { name: 'French', native: 'Français', dir: 'ltr', hreflang: 'fr' },
        es: { name: 'Spanish', native: 'Español', dir: 'ltr', hreflang: 'es' },
        ru: { name: 'Russian', native: 'Русский', dir: 'ltr', hreflang: 'ru' },
        it: { name: 'Italian', native: 'Italiano', dir: 'ltr', hreflang: 'it' },
        pt: { name: 'Portuguese', native: 'Português', dir: 'ltr', hreflang: 'pt' },
        ar: { name: 'Arabic', native: 'العربية', dir: 'rtl', hreflang: 'ar' },
        zh: { name: 'Chinese', native: '中文', dir: 'ltr', hreflang: 'zh' },
        ja: { name: 'Japanese', native: '日本語', dir: 'ltr', hreflang: 'ja' },
        ko: { name: 'Korean', native: '한국어', dir: 'ltr', hreflang: 'ko' },
        nl: { name: 'Dutch', native: 'Nederlands', dir: 'ltr', hreflang: 'nl' },
        pl: { name: 'Polish', native: 'Polski', dir: 'ltr', hreflang: 'pl' },
        hi: { name: 'Hindi', native: 'हिन्दी', dir: 'ltr', hreflang: 'hi' }
    };

    // Translation cache
    let translationCache = {};
    let currentLanguage = DEFAULT_LANGUAGE;
    let fallbackTranslations = null;

    /**
     * Detect user's preferred language
     */
    function detectLanguage() {
        // 1. Check URL path (e.g., /tr/privacy or /api/pages/tr/privacy)
        const pathMatch = window.location.pathname.match(/\/(?:api\/pages\/)?([a-z]{2})(?:\/|$)/);
        if (pathMatch && SUPPORTED_LANGUAGES.includes(pathMatch[1])) {
            return pathMatch[1];
        }

        // 2. Check URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const langParam = urlParams.get('lang');
        if (langParam && SUPPORTED_LANGUAGES.includes(langParam)) {
            return langParam;
        }

        // 3. Check localStorage
        const storedLang = localStorage.getItem('scanup_language');
        if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
            return storedLang;
        }

        // 4. Check browser language
        const browserLang = navigator.language?.split('-')[0];
        if (browserLang && SUPPORTED_LANGUAGES.includes(browserLang)) {
            return browserLang;
        }

        return DEFAULT_LANGUAGE;
    }

    /**
     * Get base path for assets
     */
    function getBasePath() {
        return window.location.pathname.startsWith('/api/') ? '/api' : '';
    }

    /**
     * Load translations from JSON file
     */
    async function loadTranslations(lang) {
        // Return cached if available
        if (translationCache[lang]) {
            return translationCache[lang];
        }

        const basePath = getBasePath();
        const url = `${basePath}/locales/${lang}.json`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${lang} translations`);
            }
            const data = await response.json();
            translationCache[lang] = data;
            
            // Cache in localStorage
            try {
                const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
                cache[lang] = { version: CACHE_VERSION, data: data, timestamp: Date.now() };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
            } catch (e) {
                // Ignore localStorage errors
            }
            
            return data;
        } catch (error) {
            console.warn(`Failed to load translations for ${lang}:`, error);
            
            // Try loading from cache
            try {
                const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
                if (cache[lang] && cache[lang].version === CACHE_VERSION) {
                    translationCache[lang] = cache[lang].data;
                    return cache[lang].data;
                }
            } catch (e) {
                // Ignore
            }
            
            return null;
        }
    }

    /**
     * Get nested translation value
     */
    function getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Key mapping for legacy underscore-format keys to nested JSON paths
     * Maps old flat keys (e.g., "features_hero_title") to nested keys (e.g., "features.hero_title")
     */
    const KEY_MAPPINGS = {
        // Features page
        'features_hero_title': 'features.hero_title',
        'features_hero_subtitle': 'features.hero_subtitle',
        'feature_ai_title': 'features.ai_detection_title',
        'feature_ai_desc': 'features.ai_detection_desc',
        'feature_ai_1': 'features.ai_detection_1',
        'feature_ai_2': 'features.ai_detection_2',
        'feature_ai_3': 'features.ai_detection_3',
        'feature_filters_title': 'features.filters_title',
        'feature_filters_desc': 'features.filters_desc',
        'feature_filters_1': 'features.filters_1',
        'feature_filters_2': 'features.filters_2',
        'feature_filters_3': 'features.filters_3',
        'feature_signatures_title': 'features.signatures_title',
        'feature_signatures_desc': 'features.signatures_desc',
        'feature_signatures_1': 'features.signatures_1',
        'feature_signatures_2': 'features.signatures_2',
        'feature_signatures_3': 'features.signatures_3',
        'feature_cloud_title': 'features.cloud_title',
        'feature_cloud_desc': 'features.cloud_desc',
        'feature_cloud_1': 'features.cloud_1',
        'feature_cloud_2': 'features.cloud_2',
        'feature_cloud_3': 'features.cloud_3',
        'feature_web_title': 'features.web_title',
        'feature_web_desc': 'features.web_desc',
        'feature_web_1': 'features.web_1',
        'feature_web_2': 'features.web_2',
        'feature_web_3': 'features.web_3',
        'feature_security_title': 'features.security_title',
        'feature_security_desc': 'features.security_desc',
        'feature_security_1': 'features.security_1',
        'feature_security_2': 'features.security_2',
        'feature_security_3': 'features.security_3',
        'features_cta_title': 'features.cta_title',
        'features_cta_subtitle': 'features.cta_subtitle',
        // Common
        'back_to_home': 'common.back_to_home',
        'download_now': 'common.download_now',
        'download_free': 'common.download_free',
        'get_started': 'common.get_started',
        'learn_more': 'common.learn_more',
        'contact_support': 'common.contact_support',
        'contact_us': 'common.contact_us',
        'last_updated': 'common.last_updated',
        // Nav
        'nav_features': 'nav.features',
        'nav_pricing': 'nav.pricing',
        'nav_faq': 'nav.faq',
        'nav_reviews': 'nav.reviews',
        'nav_support': 'nav.support',
        // Footer
        'footer_copyright': 'footer.copyright',
        'footer_terms': 'footer.terms',
        'footer_privacy': 'footer.privacy',
        'footer_cookies': 'footer.cookies',
        'footer_gdpr': 'footer.gdpr',
        // Dashboard / Auth
        'auth_access_docs': 'dashboard.login_subtitle',
        'auth_tab_login': 'dashboard.login_button',
        'auth_tab_register': 'dashboard.register_button',
        'auth_email': 'dashboard.email_placeholder',
        'auth_password': 'dashboard.password_placeholder',
        'auth_login_btn': 'dashboard.login_button',
        'auth_full_name': 'dashboard.register_subtitle',
        'auth_register_btn': 'dashboard.register_button',
        'auth_or_continue': 'dashboard.or_continue_with',
        'auth_continue_google': 'dashboard.google_signin',
        'auth_continue_apple': 'dashboard.google_signin',
        'auth_email_placeholder': 'dashboard.email_placeholder',
        'auth_password_placeholder': 'dashboard.password_placeholder',
        'auth_name_placeholder': 'dashboard.register_subtitle',
        'auth_password_min': 'dashboard.password_placeholder',
        // Dashboard sidebar
        'sidebar_documents': 'dashboard.my_documents',
        'sidebar_profile': 'dashboard.my_documents',
        'sidebar_settings': 'dashboard.my_documents',
        'sidebar_get_app': 'common.download_now',
        'sidebar_help': 'common.contact_support',
        // Dashboard documents
        'docs_search_placeholder': 'common.search',
        'docs_all': 'dashboard.all_documents',
        'docs_recent': 'dashboard.recent',
        'docs_folders': 'dashboard.folders',
        'docs_create_folder': 'dashboard.create_folder',
        'docs_upload': 'dashboard.upload',
        'docs_download_pdf': 'dashboard.download_pdf',
        'docs_delete': 'dashboard.delete',
        'docs_rename': 'dashboard.rename',
        'docs_move_to_folder': 'dashboard.move_to_folder',
        'docs_empty_title': 'dashboard.no_documents',
        'docs_empty_desc': 'dashboard.no_documents_desc',
        'stats_documents': 'dashboard.stats_documents',
        'stats_folders': 'dashboard.stats_folders',
        'stats_storage': 'dashboard.stats_storage'
    };

    /**
     * Translate a key - supports both nested paths and legacy underscore format
     */
    function t(key, fallback = null) {
        const translations = translationCache[currentLanguage];
        if (!translations) return fallback || key;

        // First try direct mapping from legacy keys
        const mappedKey = KEY_MAPPINGS[key];
        if (mappedKey) {
            const value = getNestedValue(translations, mappedKey);
            if (value !== undefined) return value;
        }

        // Try direct nested path (e.g., "features.hero_title")
        let value = getNestedValue(translations, key);
        if (value !== undefined) return value;

        // Try auto-converting underscore to dot notation for first segment
        // e.g., "privacy_title" -> try "privacy.title"
        const underscoreIndex = key.indexOf('_');
        if (underscoreIndex > 0) {
            const section = key.substring(0, underscoreIndex);
            const rest = key.substring(underscoreIndex + 1);
            value = getNestedValue(translations, `${section}.${rest}`);
            if (value !== undefined) return value;
        }

        // Try fallback language
        if (fallbackTranslations) {
            if (mappedKey) {
                const fbValue = getNestedValue(fallbackTranslations, mappedKey);
                if (fbValue !== undefined) return fbValue;
            }
            
            value = getNestedValue(fallbackTranslations, key);
            if (value !== undefined) return value;

            if (underscoreIndex > 0) {
                const section = key.substring(0, underscoreIndex);
                const rest = key.substring(underscoreIndex + 1);
                value = getNestedValue(fallbackTranslations, `${section}.${rest}`);
                if (value !== undefined) return value;
            }
        }
        
        return fallback || key;
    }

    /**
     * Apply translations to DOM
     */
    function applyTranslations() {
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = t(key);
            
            if (translation && translation !== key) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.innerHTML = translation;
                }
            }
        });

        // Translate attributes with data-i18n-* pattern
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation) element.placeholder = translation;
        });

        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = t(key);
            if (translation) element.title = translation;
        });

        document.querySelectorAll('[data-i18n-aria]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            const translation = t(key);
            if (translation) element.setAttribute('aria-label', translation);
        });

        // Apply RTL if needed
        const langMeta = LANGUAGE_META[currentLanguage];
        if (langMeta?.dir === 'rtl') {
            document.documentElement.setAttribute('dir', 'rtl');
            document.body.classList.add('rtl');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
            document.body.classList.remove('rtl');
        }

        // Update lang attribute
        document.documentElement.setAttribute('lang', currentLanguage);
    }

    /**
     * Update SEO meta tags
     */
    function updateSEO() {
        const translations = translationCache[currentLanguage];
        if (!translations) return;

        const page = detectCurrentPage();
        const pageKey = page || 'index';
        const pageTrans = translations[pageKey] || translations.index;

        // Update title
        if (pageTrans?.meta_title) {
            document.title = pageTrans.meta_title;
        }

        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && pageTrans?.meta_description) {
            metaDesc.setAttribute('content', pageTrans.meta_description);
        }

        // Update canonical URL
        const canonical = document.querySelector('link[rel="canonical"]');
        const baseUrl = 'https://scanup.app';
        const pagePath = page ? `/${page}` : '';
        const langPath = currentLanguage === 'en' ? '' : `/${currentLanguage}`;
        
        if (canonical) {
            canonical.setAttribute('href', `${baseUrl}${langPath}${pagePath}`);
        }

        // Update/create hreflang tags
        updateHreflangTags(baseUrl, pagePath);

        // Update Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');

        if (ogTitle && pageTrans?.meta_title) {
            ogTitle.setAttribute('content', pageTrans.meta_title);
        }
        if (ogDesc && pageTrans?.meta_description) {
            ogDesc.setAttribute('content', pageTrans.meta_description);
        }
        if (ogUrl) {
            ogUrl.setAttribute('content', `${baseUrl}${langPath}${pagePath}`);
        }

        // Update Schema.org JSON-LD
        updateSchemaOrg(translations, pageTrans, pageKey);
    }

    /**
     * Detect current page from URL
     */
    function detectCurrentPage() {
        const path = window.location.pathname;
        const pages = ['dashboard', 'features', 'pricing', 'faq', 'reviews', 'contact', 'support', 'download', 'status', 'privacy', 'terms', 'cookies', 'gdpr', '404'];
        
        for (const page of pages) {
            if (path.includes(page)) {
                return page;
            }
        }
        
        // Check if it's the index page
        if (path === '/' || path.endsWith('/index') || path.endsWith('/index.html') || path.match(/\/[a-z]{2}\/?$/)) {
            return 'index';
        }
        
        return null;
    }

    /**
     * Update hreflang tags for SEO
     */
    function updateHreflangTags(baseUrl, pagePath) {
        // Remove existing hreflang tags
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

        const head = document.head;

        // Add hreflang for each language
        SUPPORTED_LANGUAGES.forEach(lang => {
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = LANGUAGE_META[lang].hreflang;
            link.href = lang === 'en' ? `${baseUrl}${pagePath}` : `${baseUrl}/${lang}${pagePath}`;
            head.appendChild(link);
        });

        // Add x-default
        const xDefault = document.createElement('link');
        xDefault.rel = 'alternate';
        xDefault.hreflang = 'x-default';
        xDefault.href = `${baseUrl}${pagePath}`;
        head.appendChild(xDefault);
    }

    /**
     * Update Schema.org JSON-LD
     */
    function updateSchemaOrg(translations, pageTrans, pageKey) {
        // Remove existing schema
        document.querySelectorAll('script[type="application/ld+json"][data-i18n-schema]').forEach(el => el.remove());

        const langMeta = LANGUAGE_META[currentLanguage];
        const baseUrl = 'https://scanup.app';
        const pagePath = pageKey === 'index' ? '' : `/${pageKey}`;
        const langPath = currentLanguage === 'en' ? '' : `/${currentLanguage}`;

        let schema;

        if (pageKey === 'faq') {
            // FAQ Page Schema
            schema = {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "inLanguage": currentLanguage,
                "mainEntity": []
            };

            // Add FAQ items dynamically based on translations
            const faqKeys = ['gs_q1', 'gs_q2', 'gs_q3', 'feat_q1', 'feat_q2', 'feat_q3', 'wd_q1', 'wd_q2', 'wd_q3', 'wd_q4', 'sub_q1', 'sub_q2', 'sub_q3', 'sub_q4', 'sec_q1', 'sec_q2', 'sec_q3'];
            faqKeys.forEach(key => {
                const q = translations.faq?.[key];
                const a = translations.faq?.[key.replace('_q', '_a')];
                if (q && a) {
                    schema.mainEntity.push({
                        "@type": "Question",
                        "name": q,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": a
                        }
                    });
                }
            });
        } else {
            // Generic WebPage Schema
            schema = {
                "@context": "https://schema.org",
                "@type": "WebPage",
                "name": pageTrans?.meta_title || translations.index?.meta_title,
                "description": pageTrans?.meta_description || translations.index?.meta_description,
                "url": `${baseUrl}${langPath}${pagePath}`,
                "inLanguage": currentLanguage,
                "publisher": {
                    "@type": "Organization",
                    "name": "ScanUp",
                    "url": baseUrl,
                    "logo": {
                        "@type": "ImageObject",
                        "url": `${baseUrl}/icon-512x512.png`
                    }
                }
            };

            // Add SoftwareApplication schema for index page
            if (pageKey === 'index') {
                schema = {
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": "ScanUp",
                    "description": pageTrans?.meta_description,
                    "applicationCategory": "BusinessApplication",
                    "operatingSystem": "iOS, Android",
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "USD"
                    },
                    "aggregateRating": {
                        "@type": "AggregateRating",
                        "ratingValue": "4.8",
                        "ratingCount": "15000"
                    }
                };
            }
        }

        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-i18n-schema', 'true');
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
    }

    /**
     * Create language selector (both desktop and mobile)
     */
    function createLanguageSelector() {
        // Desktop selector
        const desktopSelector = document.querySelector('[data-i18n-selector]');
        if (desktopSelector) {
            renderLanguageSelector(desktopSelector, false);
        }
        
        // Mobile selector
        const mobileSelector = document.querySelector('[data-i18n-selector-mobile]');
        if (mobileSelector) {
            renderLanguageSelector(mobileSelector, true);
        }
    }
    
    /**
     * Render language selector into container
     */
    function renderLanguageSelector(selector, isMobile) {
        selector.innerHTML = '';
        
        const currentMeta = LANGUAGE_META[currentLanguage];
        
        // Create dropdown button
        const button = document.createElement('button');
        button.className = 'lang-selector-btn';
        button.innerHTML = `
            <span class="lang-flag">${getLanguageFlag(currentLanguage)}</span>
            <span class="lang-name">${currentMeta.native}</span>
            <i class="fas fa-chevron-${isMobile ? 'up' : 'down'}"></i>
        `;

        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'lang-dropdown';
        dropdown.style.display = 'none';

        SUPPORTED_LANGUAGES.forEach(lang => {
            const meta = LANGUAGE_META[lang];
            const item = document.createElement('a');
            item.className = 'lang-option' + (lang === currentLanguage ? ' active' : '');
            item.href = getLanguageUrl(lang);
            item.innerHTML = `
                <span class="lang-flag">${getLanguageFlag(lang)}</span>
                <span class="lang-name">${meta.native}</span>
            `;
            item.onclick = (e) => {
                e.preventDefault();
                switchLanguage(lang);
                // Close mobile menu after language change
                if (isMobile) {
                    const mobileMenu = document.getElementById('mobileMenu');
                    if (mobileMenu) mobileMenu.classList.remove('active');
                }
            };
            dropdown.appendChild(item);
        });

        button.onclick = (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!selector.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        selector.appendChild(button);
        selector.appendChild(dropdown);
    }

    /**
     * Get language flag emoji
     */
    function getLanguageFlag(lang) {
        const flags = {
            en: '🇺🇸', tr: '🇹🇷', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸',
            ru: '🇷🇺', it: '🇮🇹', pt: '🇧🇷', ar: '🇸🇦', zh: '🇨🇳',
            ja: '🇯🇵', ko: '🇰🇷', nl: '🇳🇱', pl: '🇵🇱', hi: '🇮🇳'
        };
        return flags[lang] || '🌐';
    }

    /**
     * Get URL for a language
     */
    function getLanguageUrl(lang) {
        const currentPath = window.location.pathname;
        const page = detectCurrentPage();
        const isApiRoute = currentPath.startsWith('/api/');
        
        if (isApiRoute) {
            // Preview environment
            if (lang === 'en') {
                return page === 'index' ? '/api/pages/' : `/api/pages/${page}`;
            }
            return page === 'index' ? `/api/pages/${lang}` : `/api/pages/${lang}/${page}`;
        } else {
            // Production environment
            if (lang === 'en') {
                return page === 'index' ? '/' : `/${page}`;
            }
            return page === 'index' ? `/${lang}` : `/${lang}/${page}`;
        }
    }

    /**
     * Switch to a different language
     */
    async function switchLanguage(lang) {
        console.log('switchLanguage called with:', lang);
        if (!SUPPORTED_LANGUAGES.includes(lang)) {
            lang = DEFAULT_LANGUAGE;
        }

        // Build new URL with language prefix
        const isApiRoute = window.location.pathname.startsWith('/api/');
        const currentPath = window.location.pathname;
        let newUrl;
        
        console.log('isApiRoute:', isApiRoute, 'currentPath:', currentPath);
        
        if (isApiRoute) {
            // Preview environment: /api/pages/tr/features -> /api/pages/de/features
            const pathParts = currentPath.split('/').filter(Boolean);
            console.log('pathParts:', pathParts);
            
            // Handle /api/pages/ or /api/pages
            if (pathParts.length >= 2 && pathParts[0] === 'api' && pathParts[1] === 'pages') {
                if (pathParts.length === 2) {
                    // /api/pages/ - add language prefix
                    if (lang !== 'en') {
                        pathParts.push(lang);
                    }
                } else {
                    const currentLangOrPage = pathParts[2];
                    
                    // Check if current path has a language prefix
                    if (SUPPORTED_LANGUAGES.includes(currentLangOrPage)) {
                        // Replace language: /api/pages/tr/features -> /api/pages/de/features
                        if (lang === 'en') {
                            // Remove language prefix for English
                            pathParts.splice(2, 1);
                        } else {
                            pathParts[2] = lang;
                        }
                    } else {
                        // No language prefix, add one: /api/pages/features -> /api/pages/de/features
                        if (lang !== 'en') {
                            pathParts.splice(2, 0, lang);
                        }
                    }
                }
                newUrl = '/' + pathParts.join('/');
            } else {
                newUrl = currentPath;
            }
        } else {
            // Production environment: /tr/features -> /de/features
            const pathParts = currentPath.split('/').filter(Boolean);
            
            if (pathParts.length === 0) {
                // Root path /
                if (lang !== 'en') {
                    newUrl = '/' + lang;
                } else {
                    newUrl = '/';
                }
            } else if (SUPPORTED_LANGUAGES.includes(pathParts[0])) {
                // Replace language: /tr/features -> /de/features
                if (lang === 'en') {
                    pathParts.shift(); // Remove language prefix for English
                } else {
                    pathParts[0] = lang;
                }
                newUrl = '/' + pathParts.join('/') || '/';
            } else {
                // No language prefix, add one: /features -> /de/features
                if (lang !== 'en') {
                    pathParts.unshift(lang);
                }
                newUrl = '/' + pathParts.join('/');
            }
        }
        
        console.log('newUrl:', newUrl);
        // Navigate to new URL
        window.location.href = newUrl + window.location.hash;
    }

    /**
     * Initialize i18n system
     */
    async function init() {
        currentLanguage = detectLanguage();
        
        // Load English as fallback
        fallbackTranslations = await loadTranslations('en');
        
        // Load current language
        if (currentLanguage !== 'en') {
            await loadTranslations(currentLanguage);
        }

        applyTranslations();
        updateSEO();
        createLanguageSelector();

        // Expose global API
        window.ScanUpI18n = {
            t: t,
            switchLanguage: switchLanguage,
            getCurrentLanguage: () => currentLanguage,
            getSupportedLanguages: () => [...SUPPORTED_LANGUAGES],
            getLanguageMeta: (lang) => LANGUAGE_META[lang]
        };

        console.log(`🌍 ScanUp i18n v2.0 initialized - Language: ${currentLanguage}`);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/**
 * ScanUp i18n (Internationalization) Module
 * Handles language detection, translation loading, and UI updates
 */
const ScanUpI18n = {
    currentLang: 'en',
    translations: {},
    languages: [],
    API_BASE: '',
    
    // Website-specific translations (for landing page)
    websiteTranslations: {
        en: {
            // Navigation
            nav_features: "Features",
            nav_pricing: "Pricing",
            nav_faq: "FAQ",
            nav_support: "Support",
            nav_download: "Download Free",
            nav_dashboard: "Dashboard",
            
            // Hero Section
            hero_title: "Best Free Document Scanner App",
            hero_subtitle: "Transform your phone into a powerful document scanner. Scan, sign, OCR, and share documents instantly.",
            hero_cta: "Download Free",
            hero_stats_downloads: "Downloads",
            hero_stats_rating: "Rating",
            hero_stats_reviews: "Reviews",
            
            // Features
            features_title: "Why Choose ScanUp?",
            feature_scan_title: "Smart Scanning",
            feature_scan_desc: "Auto-detect document edges and enhance quality automatically",
            feature_sign_title: "Digital Signatures",
            feature_sign_desc: "Add your signature to any document with a simple tap",
            feature_ocr_title: "OCR Technology",
            feature_ocr_desc: "Extract and search text from scanned documents",
            feature_cloud_title: "Cloud Sync",
            feature_cloud_desc: "Access your documents from any device, anywhere",
            feature_secure_title: "Secure Storage",
            feature_secure_desc: "End-to-end encryption keeps your documents safe",
            feature_share_title: "Easy Sharing",
            feature_share_desc: "Share documents via email, WhatsApp, or any app",
            
            // FAQ
            faq_title: "Frequently Asked Questions",
            faq_q1: "Is ScanUp really free?",
            faq_a1: "Yes! ScanUp is completely free to download and use. Premium features are available for power users.",
            faq_q2: "Can I scan multiple pages?",
            faq_a2: "Absolutely! Scan multiple pages and combine them into a single PDF document.",
            faq_q3: "Does it work offline?",
            faq_a3: "Yes, ScanUp works completely offline. Cloud sync is available when online.",
            faq_q4: "Is my data secure?",
            faq_a4: "Your privacy is our priority. We use end-to-end encryption and never access your documents.",
            
            // Footer
            footer_about: "About",
            footer_privacy: "Privacy Policy",
            footer_terms: "Terms of Service",
            footer_contact: "Contact",
            footer_copyright: "© 2024 ScanUp. All rights reserved.",
            
            // Dashboard
            dashboard_title: "My Documents",
            dashboard_welcome: "Welcome back",
            dashboard_no_docs: "No documents yet",
            dashboard_no_docs_desc: "Your scanned documents will appear here",
            dashboard_upload: "Upload Document",
            dashboard_scan: "Scan with App",
            dashboard_logout: "Logout",
            dashboard_settings: "Settings",
            dashboard_folders: "Folders",
            dashboard_recent: "Recent",
            dashboard_all: "All Documents",
        },
        tr: {
            // Navigation
            nav_features: "Özellikler",
            nav_pricing: "Fiyatlar",
            nav_faq: "SSS",
            nav_support: "Destek",
            nav_download: "Ücretsiz İndir",
            nav_dashboard: "Panel",
            
            // Hero Section
            hero_title: "En İyi Ücretsiz Belge Tarayıcı",
            hero_subtitle: "Telefonunuzu güçlü bir belge tarayıcıya dönüştürün. Anında tarayın, imzalayın ve paylaşın.",
            hero_cta: "Ücretsiz İndir",
            hero_stats_downloads: "İndirme",
            hero_stats_rating: "Puan",
            hero_stats_reviews: "Yorum",
            
            // Features
            features_title: "Neden ScanUp?",
            feature_scan_title: "Akıllı Tarama",
            feature_scan_desc: "Belge kenarlarını otomatik algıla ve kaliteyi artır",
            feature_sign_title: "Dijital İmza",
            feature_sign_desc: "Tek dokunuşla herhangi bir belgeye imzanızı ekleyin",
            feature_ocr_title: "OCR Teknolojisi",
            feature_ocr_desc: "Taranan belgelerden metin çıkarın ve arayın",
            feature_cloud_title: "Bulut Senkronizasyonu",
            feature_cloud_desc: "Belgelerinize her cihazdan erişin",
            feature_secure_title: "Güvenli Depolama",
            feature_secure_desc: "Uçtan uca şifreleme belgelerinizi korur",
            feature_share_title: "Kolay Paylaşım",
            feature_share_desc: "E-posta, WhatsApp veya herhangi bir uygulama ile paylaşın",
            
            // FAQ
            faq_title: "Sıkça Sorulan Sorular",
            faq_q1: "ScanUp gerçekten ücretsiz mi?",
            faq_a1: "Evet! ScanUp tamamen ücretsizdir. Premium özellikler güçlü kullanıcılar içindir.",
            faq_q2: "Birden fazla sayfa tarayabilir miyim?",
            faq_a2: "Elbette! Birden fazla sayfa tarayın ve tek PDF'de birleştirin.",
            faq_q3: "Çevrimdışı çalışıyor mu?",
            faq_a3: "Evet, ScanUp tamamen çevrimdışı çalışır. Çevrimiçiyken bulut senkronizasyonu yapılır.",
            faq_q4: "Verilerim güvende mi?",
            faq_a4: "Gizliliğiniz önceliğimizdir. Uçtan uca şifreleme kullanıyoruz.",
            
            // Footer
            footer_about: "Hakkında",
            footer_privacy: "Gizlilik Politikası",
            footer_terms: "Kullanım Şartları",
            footer_contact: "İletişim",
            footer_copyright: "© 2024 ScanUp. Tüm hakları saklıdır.",
            
            // Dashboard
            dashboard_title: "Belgelerim",
            dashboard_welcome: "Tekrar hoş geldiniz",
            dashboard_no_docs: "Henüz belge yok",
            dashboard_no_docs_desc: "Taranan belgeleriniz burada görünecek",
            dashboard_upload: "Belge Yükle",
            dashboard_scan: "Uygulama ile Tara",
            dashboard_logout: "Çıkış",
            dashboard_settings: "Ayarlar",
            dashboard_folders: "Klasörler",
            dashboard_recent: "Son",
            dashboard_all: "Tüm Belgeler",
        },
        de: {
            nav_features: "Funktionen",
            nav_pricing: "Preise",
            nav_faq: "FAQ",
            nav_support: "Support",
            nav_download: "Kostenlos herunterladen",
            nav_dashboard: "Dashboard",
            hero_title: "Beste kostenlose Dokumenten-Scanner-App",
            hero_subtitle: "Verwandeln Sie Ihr Telefon in einen leistungsstarken Dokumentenscanner.",
            hero_cta: "Kostenlos herunterladen",
            features_title: "Warum ScanUp wählen?",
            dashboard_title: "Meine Dokumente",
            dashboard_welcome: "Willkommen zurück",
            dashboard_no_docs: "Noch keine Dokumente",
            dashboard_logout: "Abmelden",
        },
        fr: {
            nav_features: "Fonctionnalités",
            nav_pricing: "Tarifs",
            nav_faq: "FAQ",
            nav_support: "Support",
            nav_download: "Télécharger gratuitement",
            nav_dashboard: "Tableau de bord",
            hero_title: "Meilleure application de scanner gratuite",
            hero_subtitle: "Transformez votre téléphone en un puissant scanner de documents.",
            hero_cta: "Télécharger gratuitement",
            features_title: "Pourquoi choisir ScanUp?",
            dashboard_title: "Mes Documents",
            dashboard_welcome: "Bon retour",
            dashboard_no_docs: "Pas encore de documents",
            dashboard_logout: "Déconnexion",
        },
        es: {
            nav_features: "Características",
            nav_pricing: "Precios",
            nav_faq: "FAQ",
            nav_support: "Soporte",
            nav_download: "Descargar gratis",
            nav_dashboard: "Panel",
            hero_title: "La mejor app de escáner gratuita",
            hero_subtitle: "Transforma tu teléfono en un potente escáner de documentos.",
            hero_cta: "Descargar gratis",
            features_title: "¿Por qué elegir ScanUp?",
            dashboard_title: "Mis Documentos",
            dashboard_welcome: "Bienvenido de nuevo",
            dashboard_no_docs: "Sin documentos aún",
            dashboard_logout: "Cerrar sesión",
        },
        ru: {
            nav_features: "Функции",
            nav_pricing: "Цены",
            nav_faq: "FAQ",
            nav_support: "Поддержка",
            nav_download: "Скачать бесплатно",
            nav_dashboard: "Панель",
            hero_title: "Лучшее бесплатное приложение для сканирования",
            hero_subtitle: "Превратите телефон в мощный сканер документов.",
            hero_cta: "Скачать бесплатно",
            features_title: "Почему ScanUp?",
            dashboard_title: "Мои документы",
            dashboard_welcome: "С возвращением",
            dashboard_no_docs: "Документов пока нет",
            dashboard_logout: "Выйти",
        },
        it: {
            nav_features: "Funzionalità",
            nav_pricing: "Prezzi",
            nav_faq: "FAQ",
            nav_support: "Supporto",
            nav_download: "Scarica gratis",
            nav_dashboard: "Dashboard",
            hero_title: "Migliore app scanner gratuita",
            hero_subtitle: "Trasforma il tuo telefono in un potente scanner di documenti.",
            hero_cta: "Scarica gratis",
            features_title: "Perché scegliere ScanUp?",
            dashboard_title: "I miei documenti",
            dashboard_welcome: "Bentornato",
            dashboard_no_docs: "Nessun documento",
            dashboard_logout: "Esci",
        },
        pt: {
            nav_features: "Recursos",
            nav_pricing: "Preços",
            nav_faq: "FAQ",
            nav_support: "Suporte",
            nav_download: "Baixar grátis",
            nav_dashboard: "Painel",
            hero_title: "Melhor app de scanner grátis",
            hero_subtitle: "Transforme seu celular em um poderoso scanner de documentos.",
            hero_cta: "Baixar grátis",
            features_title: "Por que escolher ScanUp?",
            dashboard_title: "Meus Documentos",
            dashboard_welcome: "Bem-vindo de volta",
            dashboard_no_docs: "Nenhum documento ainda",
            dashboard_logout: "Sair",
        },
        ar: {
            nav_features: "الميزات",
            nav_pricing: "الأسعار",
            nav_faq: "الأسئلة الشائعة",
            nav_support: "الدعم",
            nav_download: "تحميل مجاني",
            nav_dashboard: "لوحة التحكم",
            hero_title: "أفضل تطبيق ماسح ضوئي مجاني",
            hero_subtitle: "حوّل هاتفك إلى ماسح ضوئي قوي للمستندات.",
            hero_cta: "تحميل مجاني",
            features_title: "لماذا ScanUp؟",
            dashboard_title: "مستنداتي",
            dashboard_welcome: "مرحباً بعودتك",
            dashboard_no_docs: "لا توجد مستندات بعد",
            dashboard_logout: "تسجيل الخروج",
        },
        zh: {
            nav_features: "功能",
            nav_pricing: "价格",
            nav_faq: "常见问题",
            nav_support: "支持",
            nav_download: "免费下载",
            nav_dashboard: "仪表板",
            hero_title: "最佳免费文档扫描应用",
            hero_subtitle: "将您的手机变成强大的文档扫描仪。",
            hero_cta: "免费下载",
            features_title: "为什么选择ScanUp？",
            dashboard_title: "我的文档",
            dashboard_welcome: "欢迎回来",
            dashboard_no_docs: "暂无文档",
            dashboard_logout: "退出",
        },
        ja: {
            nav_features: "機能",
            nav_pricing: "料金",
            nav_faq: "FAQ",
            nav_support: "サポート",
            nav_download: "無料ダウンロード",
            nav_dashboard: "ダッシュボード",
            hero_title: "最高の無料スキャナーアプリ",
            hero_subtitle: "スマホを強力なドキュメントスキャナーに。",
            hero_cta: "無料ダウンロード",
            features_title: "ScanUpを選ぶ理由",
            dashboard_title: "マイドキュメント",
            dashboard_welcome: "おかえりなさい",
            dashboard_no_docs: "ドキュメントがありません",
            dashboard_logout: "ログアウト",
        },
        ko: {
            nav_features: "기능",
            nav_pricing: "가격",
            nav_faq: "FAQ",
            nav_support: "지원",
            nav_download: "무료 다운로드",
            nav_dashboard: "대시보드",
            hero_title: "최고의 무료 스캐너 앱",
            hero_subtitle: "휴대폰을 강력한 문서 스캐너로 변환하세요.",
            hero_cta: "무료 다운로드",
            features_title: "왜 ScanUp인가요?",
            dashboard_title: "내 문서",
            dashboard_welcome: "돌아오신 것을 환영합니다",
            dashboard_no_docs: "아직 문서가 없습니다",
            dashboard_logout: "로그아웃",
        },
        nl: {
            nav_features: "Functies",
            nav_pricing: "Prijzen",
            nav_faq: "FAQ",
            nav_support: "Support",
            nav_download: "Gratis downloaden",
            nav_dashboard: "Dashboard",
            hero_title: "Beste gratis scanner app",
            hero_subtitle: "Verander je telefoon in een krachtige documentscanner.",
            hero_cta: "Gratis downloaden",
            features_title: "Waarom ScanUp kiezen?",
            dashboard_title: "Mijn Documenten",
            dashboard_welcome: "Welkom terug",
            dashboard_no_docs: "Nog geen documenten",
            dashboard_logout: "Uitloggen",
        },
        pl: {
            nav_features: "Funkcje",
            nav_pricing: "Ceny",
            nav_faq: "FAQ",
            nav_support: "Wsparcie",
            nav_download: "Pobierz za darmo",
            nav_dashboard: "Panel",
            hero_title: "Najlepsza darmowa aplikacja skanera",
            hero_subtitle: "Zamień swój telefon w potężny skaner dokumentów.",
            hero_cta: "Pobierz za darmo",
            features_title: "Dlaczego ScanUp?",
            dashboard_title: "Moje Dokumenty",
            dashboard_welcome: "Witaj ponownie",
            dashboard_no_docs: "Brak dokumentów",
            dashboard_logout: "Wyloguj",
        },
        hi: {
            nav_features: "विशेषताएं",
            nav_pricing: "मूल्य",
            nav_faq: "सामान्य प्रश्न",
            nav_support: "सहायता",
            nav_download: "मुफ्त डाउनलोड",
            nav_dashboard: "डैशबोर्ड",
            hero_title: "सर्वश्रेष्ठ मुफ्त स्कैनर ऐप",
            hero_subtitle: "अपने फोन को एक शक्तिशाली दस्तावेज़ स्कैनर में बदलें।",
            hero_cta: "मुफ्त डाउनलोड",
            features_title: "ScanUp क्यों चुनें?",
            dashboard_title: "मेरे दस्तावेज़",
            dashboard_welcome: "वापस स्वागत है",
            dashboard_no_docs: "अभी तक कोई दस्तावेज़ नहीं",
            dashboard_logout: "लॉग आउट",
        },
    },
    
    /**
     * Initialize i18n system
     */
    async init(apiBase = '') {
        this.API_BASE = apiBase;
        
        // Detect language from URL, localStorage, or browser
        this.currentLang = this.detectLanguage();
        
        // Load languages list
        await this.loadLanguages();
        
        // Load translations for current language
        await this.loadTranslations(this.currentLang);
        
        // Apply translations to page
        this.applyTranslations();
        
        // Update URL if needed
        this.updateUrl();
        
        // Setup language selector
        this.setupLanguageSelector();
        
        return this;
    },
    
    /**
     * Detect language from URL path, localStorage, or browser
     */
    detectLanguage() {
        // 1. Check URL path (e.g., /tr, /en, /de)
        const pathLang = this.getLanguageFromPath();
        if (pathLang) return pathLang;
        
        // 2. Check localStorage
        const storedLang = localStorage.getItem('scanup_language');
        if (storedLang && this.isValidLanguage(storedLang)) return storedLang;
        
        // 3. Check browser language
        const browserLang = navigator.language?.split('-')[0] || 'en';
        if (this.isValidLanguage(browserLang)) return browserLang;
        
        // 4. Default to English
        return 'en';
    },
    
    /**
     * Get language code from URL path
     */
    getLanguageFromPath() {
        const path = window.location.pathname;
        const match = path.match(/^\/([a-z]{2})(\/|$)/);
        if (match && this.isValidLanguage(match[1])) {
            return match[1];
        }
        return null;
    },
    
    /**
     * Check if language code is valid
     */
    isValidLanguage(code) {
        const validCodes = ['en', 'de', 'fr', 'es', 'tr', 'ru', 'it', 'pt', 'ar', 'zh', 'ja', 'ko', 'nl', 'pl', 'hi'];
        return validCodes.includes(code);
    },
    
    /**
     * Load available languages from API
     */
    async loadLanguages() {
        try {
            const response = await fetch(`${this.API_BASE}/api/content/languages`);
            if (response.ok) {
                this.languages = await response.json();
            }
        } catch (e) {
            console.warn('Could not load languages from API, using defaults');
            this.languages = [
                { code: 'en', name: 'English', native_name: 'English', flag: '🇺🇸' },
                { code: 'de', name: 'German', native_name: 'Deutsch', flag: '🇩🇪' },
                { code: 'fr', name: 'French', native_name: 'Français', flag: '🇫🇷' },
                { code: 'es', name: 'Spanish', native_name: 'Español', flag: '🇪🇸' },
                { code: 'tr', name: 'Turkish', native_name: 'Türkçe', flag: '🇹🇷' },
            ];
        }
    },
    
    /**
     * Load translations for a specific language
     */
    async loadTranslations(langCode) {
        try {
            const response = await fetch(`${this.API_BASE}/api/content/translations/${langCode}`);
            if (response.ok) {
                const data = await response.json();
                this.translations = data.translations || data;
            }
        } catch (e) {
            console.warn('Could not load translations from API');
            this.translations = {};
        }
        
        // Merge with website-specific translations
        const websiteTrans = this.websiteTranslations[langCode] || this.websiteTranslations['en'];
        this.translations = { ...this.translations, ...websiteTrans };
    },
    
    /**
     * Get translation for a key
     */
    t(key, fallback = '') {
        return this.translations[key] || this.websiteTranslations['en'][key] || fallback || key;
    },
    
    /**
     * Apply translations to all elements with data-i18n attribute
     */
    applyTranslations() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                el.textContent = translation;
            }
        });
        
        // Update elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            if (translation) {
                el.placeholder = translation;
            }
        });
        
        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation) {
                el.title = translation;
            }
        });
        
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;
        
        // Handle RTL languages
        if (['ar', 'he', 'fa'].includes(this.currentLang)) {
            document.documentElement.dir = 'rtl';
        } else {
            document.documentElement.dir = 'ltr';
        }
        
        // Update page title if needed
        const titleKey = document.querySelector('title')?.getAttribute('data-i18n');
        if (titleKey) {
            document.title = this.t(titleKey);
        }
    },
    
    /**
     * Update URL to include language code
     */
    updateUrl() {
        const path = window.location.pathname;
        const currentPathLang = this.getLanguageFromPath();
        
        // If URL already has correct language, do nothing
        if (currentPathLang === this.currentLang) return;
        
        // If default language (en) and no path lang, do nothing
        if (this.currentLang === 'en' && !currentPathLang) return;
        
        // Build new URL
        let newPath;
        if (currentPathLang) {
            // Replace existing language
            newPath = path.replace(/^\/[a-z]{2}(\/|$)/, `/${this.currentLang}$1`);
        } else if (this.currentLang !== 'en') {
            // Add language prefix
            newPath = `/${this.currentLang}${path}`;
        } else {
            return;
        }
        
        // Update URL without reload
        window.history.replaceState({}, '', newPath + window.location.search);
    },
    
    /**
     * Change language
     */
    async setLanguage(langCode) {
        if (!this.isValidLanguage(langCode)) return;
        
        this.currentLang = langCode;
        localStorage.setItem('scanup_language', langCode);
        
        await this.loadTranslations(langCode);
        this.applyTranslations();
        this.updateUrl();
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: langCode } }));
    },
    
    /**
     * Setup language selector dropdown
     */
    setupLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (!selector) return;
        
        // Clear existing options
        selector.innerHTML = '';
        
        // Add language options
        this.languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = `${lang.flag || ''} ${lang.native_name}`.trim();
            option.selected = lang.code === this.currentLang;
            selector.appendChild(option);
        });
        
        // Add change handler
        selector.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });
    },
    
    /**
     * Get all hreflang links for SEO
     */
    getHreflangLinks() {
        const baseUrl = 'https://scanup.app';
        const currentPath = window.location.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');
        
        return this.languages.map(lang => ({
            hreflang: lang.code,
            href: lang.code === 'en' ? `${baseUrl}${currentPath}` : `${baseUrl}/${lang.code}${currentPath}`
        }));
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScanUpI18n;
}

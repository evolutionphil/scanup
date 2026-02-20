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
            nav_web_dashboard: "Web Dashboard",
            nav_how_it_works: "How It Works",
            nav_reviews: "Reviews",
            nav_pricing: "Pricing",
            nav_download: "Download Free",
            nav_dashboard: "Dashboard",
            login_signup: "Login / Sign Up",
            
            // Hero Section
            hero_badge: "#1 Document Scanner App",
            hero_title_line1: "Scan Documents",
            hero_title_highlight: "Instantly",
            hero_title_line2: "with Your Phone",
            hero_description: "Transform your smartphone into a powerful document scanner. Scan, edit, sign, and share documents in seconds with professional quality.",
            download_free: "Download Free",
            see_how_it_works: "See How It Works",
            stat_downloads: "Downloads",
            stat_rating: "App Rating",
            stat_scanned: "Docs Scanned",
            
            // Features
            features_title: "Powerful Features You'll Love",
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
            
            // Web Dashboard
            web_dashboard_title: "Access Documents Anywhere",
            web_dashboard_desc: "View and manage your scanned documents from any browser",
            
            // How it works
            how_it_works_title: "How It Works",
            step_1_title: "Scan",
            step_1_desc: "Point your camera at any document",
            step_2_title: "Edit",
            step_2_desc: "Crop, rotate, and enhance",
            step_3_title: "Share",
            step_3_desc: "Export as PDF or share directly",
            
            // Testimonials
            testimonials_title: "What Our Users Say",
            
            // Pricing
            pricing_title: "Simple Pricing",
            pricing_free: "Free",
            pricing_premium: "Premium",
            pricing_free_desc: "Basic features for personal use",
            pricing_premium_desc: "Full access to all features",
            per_month: "/month",
            per_year: "/year",
            get_started: "Get Started",
            most_popular: "Most Popular",
            
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
            
            // Download
            download_title: "Download ScanUp Now",
            download_ios: "Download on App Store",
            download_android: "Get it on Google Play",
            
            // Footer
            footer_privacy: "Privacy Policy",
            footer_terms: "Terms of Service",
            footer_contact: "Contact",
            footer_support: "Support",
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
            dashboard_search: "Search documents...",
            dashboard_sort: "Sort by",
            dashboard_delete: "Delete",
            dashboard_rename: "Rename",
            dashboard_download: "Download",
            dashboard_share: "Share",
        },
        tr: {
            // Navigation
            nav_features: "Özellikler",
            nav_web_dashboard: "Web Paneli",
            nav_how_it_works: "Nasıl Çalışır",
            nav_reviews: "Yorumlar",
            nav_pricing: "Fiyatlar",
            nav_download: "Ücretsiz İndir",
            nav_dashboard: "Panel",
            login_signup: "Giriş / Kayıt",
            
            // Hero Section
            hero_badge: "#1 Belge Tarayıcı Uygulaması",
            hero_title_line1: "Belgeleri",
            hero_title_highlight: "Anında",
            hero_title_line2: "Telefonunuzla Tarayın",
            hero_description: "Akıllı telefonunuzu güçlü bir belge tarayıcıya dönüştürün. Saniyeler içinde profesyonel kalitede tarayın, düzenleyin, imzalayın ve paylaşın.",
            download_free: "Ücretsiz İndir",
            see_how_it_works: "Nasıl Çalıştığını Gör",
            stat_downloads: "İndirme",
            stat_rating: "Uygulama Puanı",
            stat_scanned: "Taranan Belge",
            
            // Features
            features_title: "Seveceğiniz Güçlü Özellikler",
            feature_scan_title: "Akıllı Tarama",
            feature_scan_desc: "Belge kenarlarını otomatik algıla ve kaliteyi artır",
            feature_sign_title: "Dijital İmza",
            feature_sign_desc: "Tek dokunuşla herhangi bir belgeye imzanızı ekleyin",
            feature_ocr_title: "OCR Teknolojisi",
            feature_ocr_desc: "Taranan belgelerden metin çıkarın ve arayın",
            feature_cloud_title: "Bulut Senkronizasyonu",
            feature_cloud_desc: "Belgelerinize her cihazdan, her yerden erişin",
            feature_secure_title: "Güvenli Depolama",
            feature_secure_desc: "Uçtan uca şifreleme belgelerinizi korur",
            feature_share_title: "Kolay Paylaşım",
            feature_share_desc: "E-posta, WhatsApp veya herhangi bir uygulama ile paylaşın",
            
            // Web Dashboard
            web_dashboard_title: "Belgelerinize Her Yerden Erişin",
            web_dashboard_desc: "Taranan belgelerinizi herhangi bir tarayıcıdan görüntüleyin ve yönetin",
            
            // How it works
            how_it_works_title: "Nasıl Çalışır",
            step_1_title: "Tara",
            step_1_desc: "Kameranızı herhangi bir belgeye doğrultun",
            step_2_title: "Düzenle",
            step_2_desc: "Kırp, döndür ve iyileştir",
            step_3_title: "Paylaş",
            step_3_desc: "PDF olarak dışa aktar veya doğrudan paylaş",
            
            // Testimonials
            testimonials_title: "Kullanıcılarımız Ne Diyor",
            
            // Pricing
            pricing_title: "Basit Fiyatlandırma",
            pricing_free: "Ücretsiz",
            pricing_premium: "Premium",
            pricing_free_desc: "Kişisel kullanım için temel özellikler",
            pricing_premium_desc: "Tüm özelliklere tam erişim",
            per_month: "/ay",
            per_year: "/yıl",
            get_started: "Başla",
            most_popular: "En Popüler",
            
            // FAQ
            faq_title: "Sıkça Sorulan Sorular",
            faq_q1: "ScanUp gerçekten ücretsiz mi?",
            faq_a1: "Evet! ScanUp'ı indirmek ve kullanmak tamamen ücretsizdir. Premium özellikler güçlü kullanıcılar içindir.",
            faq_q2: "Birden fazla sayfa tarayabilir miyim?",
            faq_a2: "Elbette! Birden fazla sayfa tarayın ve tek bir PDF belgesinde birleştirin.",
            faq_q3: "Çevrimdışı çalışıyor mu?",
            faq_a3: "Evet, ScanUp tamamen çevrimdışı çalışır. Çevrimiçiyken bulut senkronizasyonu yapılır.",
            faq_q4: "Verilerim güvende mi?",
            faq_a4: "Gizliliğiniz önceliğimizdir. Uçtan uca şifreleme kullanıyoruz ve belgelerinize asla erişmiyoruz.",
            
            // Download
            download_title: "ScanUp'ı Şimdi İndirin",
            download_ios: "App Store'dan İndir",
            download_android: "Google Play'den Edinin",
            
            // Footer
            footer_privacy: "Gizlilik Politikası",
            footer_terms: "Kullanım Şartları",
            footer_contact: "İletişim",
            footer_support: "Destek",
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
            dashboard_search: "Belge ara...",
            dashboard_sort: "Sırala",
            dashboard_delete: "Sil",
            dashboard_rename: "Yeniden Adlandır",
            dashboard_download: "İndir",
            dashboard_share: "Paylaş",
        },
        de: {
            nav_features: "Funktionen",
            nav_web_dashboard: "Web-Dashboard",
            nav_how_it_works: "So funktioniert's",
            nav_reviews: "Bewertungen",
            nav_pricing: "Preise",
            nav_download: "Kostenlos herunterladen",
            login_signup: "Anmelden / Registrieren",
            hero_badge: "#1 Dokumentenscanner-App",
            hero_title_line1: "Dokumente",
            hero_title_highlight: "Sofort",
            hero_title_line2: "mit Ihrem Handy scannen",
            hero_description: "Verwandeln Sie Ihr Smartphone in einen leistungsstarken Dokumentenscanner.",
            download_free: "Kostenlos herunterladen",
            features_title: "Leistungsstarke Funktionen",
            dashboard_title: "Meine Dokumente",
            dashboard_welcome: "Willkommen zurück",
            dashboard_no_docs: "Noch keine Dokumente",
            dashboard_logout: "Abmelden",
            footer_privacy: "Datenschutz",
            footer_terms: "Nutzungsbedingungen",
        },
        fr: {
            nav_features: "Fonctionnalités",
            nav_web_dashboard: "Tableau de bord",
            nav_how_it_works: "Comment ça marche",
            nav_reviews: "Avis",
            nav_pricing: "Tarifs",
            nav_download: "Télécharger gratuitement",
            login_signup: "Connexion / Inscription",
            hero_badge: "#1 Application de scanner",
            hero_title_line1: "Numérisez des documents",
            hero_title_highlight: "Instantanément",
            hero_title_line2: "avec votre téléphone",
            hero_description: "Transformez votre smartphone en un puissant scanner de documents.",
            download_free: "Télécharger gratuitement",
            features_title: "Fonctionnalités puissantes",
            dashboard_title: "Mes Documents",
            dashboard_welcome: "Bon retour",
            dashboard_no_docs: "Pas encore de documents",
            dashboard_logout: "Déconnexion",
            footer_privacy: "Confidentialité",
            footer_terms: "Conditions d'utilisation",
        },
        es: {
            nav_features: "Características",
            nav_web_dashboard: "Panel Web",
            nav_how_it_works: "Cómo funciona",
            nav_reviews: "Reseñas",
            nav_pricing: "Precios",
            nav_download: "Descargar gratis",
            login_signup: "Iniciar sesión / Registrarse",
            hero_badge: "#1 App de escáner",
            hero_title_line1: "Escanea documentos",
            hero_title_highlight: "Al instante",
            hero_title_line2: "con tu teléfono",
            hero_description: "Transforma tu smartphone en un potente escáner de documentos.",
            download_free: "Descargar gratis",
            features_title: "Características potentes",
            dashboard_title: "Mis Documentos",
            dashboard_welcome: "Bienvenido de nuevo",
            dashboard_no_docs: "Sin documentos aún",
            dashboard_logout: "Cerrar sesión",
            footer_privacy: "Privacidad",
            footer_terms: "Términos de servicio",
        },
        ru: {
            nav_features: "Функции",
            nav_web_dashboard: "Веб-панель",
            nav_how_it_works: "Как это работает",
            nav_reviews: "Отзывы",
            nav_pricing: "Цены",
            nav_download: "Скачать бесплатно",
            login_signup: "Вход / Регистрация",
            hero_badge: "#1 Приложение для сканирования",
            hero_title_line1: "Сканируйте документы",
            hero_title_highlight: "Мгновенно",
            hero_title_line2: "с помощью телефона",
            hero_description: "Превратите свой смартфон в мощный сканер документов.",
            download_free: "Скачать бесплатно",
            features_title: "Мощные функции",
            dashboard_title: "Мои документы",
            dashboard_welcome: "С возвращением",
            dashboard_no_docs: "Документов пока нет",
            dashboard_logout: "Выйти",
            footer_privacy: "Конфиденциальность",
            footer_terms: "Условия использования",
        },
        it: {
            nav_features: "Funzionalità",
            nav_web_dashboard: "Dashboard Web",
            nav_how_it_works: "Come funziona",
            nav_reviews: "Recensioni",
            nav_pricing: "Prezzi",
            nav_download: "Scarica gratis",
            login_signup: "Accedi / Registrati",
            hero_badge: "#1 App scanner",
            hero_title_line1: "Scansiona documenti",
            hero_title_highlight: "Istantaneamente",
            hero_title_line2: "con il tuo telefono",
            hero_description: "Trasforma il tuo smartphone in un potente scanner di documenti.",
            download_free: "Scarica gratis",
            features_title: "Funzionalità potenti",
            dashboard_title: "I miei documenti",
            dashboard_welcome: "Bentornato",
            dashboard_no_docs: "Nessun documento",
            dashboard_logout: "Esci",
            footer_privacy: "Privacy",
            footer_terms: "Termini di servizio",
        },
        pt: {
            nav_features: "Recursos",
            nav_web_dashboard: "Painel Web",
            nav_how_it_works: "Como funciona",
            nav_reviews: "Avaliações",
            nav_pricing: "Preços",
            nav_download: "Baixar grátis",
            login_signup: "Entrar / Cadastrar",
            hero_badge: "#1 App de scanner",
            hero_title_line1: "Digitalize documentos",
            hero_title_highlight: "Instantaneamente",
            hero_title_line2: "com seu celular",
            hero_description: "Transforme seu smartphone em um poderoso scanner de documentos.",
            download_free: "Baixar grátis",
            features_title: "Recursos poderosos",
            dashboard_title: "Meus Documentos",
            dashboard_welcome: "Bem-vindo de volta",
            dashboard_no_docs: "Nenhum documento ainda",
            dashboard_logout: "Sair",
            footer_privacy: "Privacidade",
            footer_terms: "Termos de serviço",
        },
        ar: {
            nav_features: "الميزات",
            nav_web_dashboard: "لوحة التحكم",
            nav_how_it_works: "كيف يعمل",
            nav_reviews: "التقييمات",
            nav_pricing: "الأسعار",
            nav_download: "تحميل مجاني",
            login_signup: "دخول / تسجيل",
            hero_badge: "#1 تطبيق ماسح ضوئي",
            hero_title_line1: "امسح المستندات",
            hero_title_highlight: "فوراً",
            hero_title_line2: "بهاتفك",
            hero_description: "حوّل هاتفك الذكي إلى ماسح ضوئي قوي للمستندات.",
            download_free: "تحميل مجاني",
            features_title: "ميزات قوية",
            dashboard_title: "مستنداتي",
            dashboard_welcome: "مرحباً بعودتك",
            dashboard_no_docs: "لا توجد مستندات بعد",
            dashboard_logout: "تسجيل الخروج",
            footer_privacy: "الخصوصية",
            footer_terms: "شروط الخدمة",
        },
        zh: {
            nav_features: "功能",
            nav_web_dashboard: "网页面板",
            nav_how_it_works: "使用方法",
            nav_reviews: "评价",
            nav_pricing: "价格",
            nav_download: "免费下载",
            login_signup: "登录 / 注册",
            hero_badge: "#1 文档扫描应用",
            hero_title_line1: "扫描文档",
            hero_title_highlight: "即时",
            hero_title_line2: "用您的手机",
            hero_description: "将您的智能手机变成强大的文档扫描仪。",
            download_free: "免费下载",
            features_title: "强大功能",
            dashboard_title: "我的文档",
            dashboard_welcome: "欢迎回来",
            dashboard_no_docs: "暂无文档",
            dashboard_logout: "退出",
            footer_privacy: "隐私政策",
            footer_terms: "服务条款",
        },
        ja: {
            nav_features: "機能",
            nav_web_dashboard: "ウェブダッシュボード",
            nav_how_it_works: "使い方",
            nav_reviews: "レビュー",
            nav_pricing: "料金",
            nav_download: "無料ダウンロード",
            login_signup: "ログイン / 登録",
            hero_badge: "#1 ドキュメントスキャナー",
            hero_title_line1: "ドキュメントを",
            hero_title_highlight: "すぐに",
            hero_title_line2: "スマホでスキャン",
            hero_description: "スマートフォンを強力なドキュメントスキャナーに。",
            download_free: "無料ダウンロード",
            features_title: "パワフルな機能",
            dashboard_title: "マイドキュメント",
            dashboard_welcome: "おかえりなさい",
            dashboard_no_docs: "ドキュメントがありません",
            dashboard_logout: "ログアウト",
            footer_privacy: "プライバシー",
            footer_terms: "利用規約",
        },
        ko: {
            nav_features: "기능",
            nav_web_dashboard: "웹 대시보드",
            nav_how_it_works: "사용 방법",
            nav_reviews: "리뷰",
            nav_pricing: "가격",
            nav_download: "무료 다운로드",
            login_signup: "로그인 / 가입",
            hero_badge: "#1 문서 스캐너 앱",
            hero_title_line1: "문서를",
            hero_title_highlight: "즉시",
            hero_title_line2: "스마트폰으로 스캔",
            hero_description: "스마트폰을 강력한 문서 스캐너로 변환하세요.",
            download_free: "무료 다운로드",
            features_title: "강력한 기능",
            dashboard_title: "내 문서",
            dashboard_welcome: "돌아오신 것을 환영합니다",
            dashboard_no_docs: "아직 문서가 없습니다",
            dashboard_logout: "로그아웃",
            footer_privacy: "개인정보 보호",
            footer_terms: "서비스 약관",
        },
        nl: {
            nav_features: "Functies",
            nav_web_dashboard: "Web Dashboard",
            nav_how_it_works: "Hoe het werkt",
            nav_reviews: "Recensies",
            nav_pricing: "Prijzen",
            nav_download: "Gratis downloaden",
            login_signup: "Inloggen / Registreren",
            hero_badge: "#1 Documentscanner App",
            hero_description: "Verander je smartphone in een krachtige documentscanner.",
            download_free: "Gratis downloaden",
            features_title: "Krachtige functies",
            dashboard_title: "Mijn Documenten",
            dashboard_welcome: "Welkom terug",
            dashboard_no_docs: "Nog geen documenten",
            dashboard_logout: "Uitloggen",
        },
        pl: {
            nav_features: "Funkcje",
            nav_web_dashboard: "Panel webowy",
            nav_how_it_works: "Jak to działa",
            nav_reviews: "Recenzje",
            nav_pricing: "Ceny",
            nav_download: "Pobierz za darmo",
            login_signup: "Zaloguj / Zarejestruj",
            hero_badge: "#1 Aplikacja skanera",
            hero_description: "Zamień swój smartfon w potężny skaner dokumentów.",
            download_free: "Pobierz za darmo",
            features_title: "Potężne funkcje",
            dashboard_title: "Moje Dokumenty",
            dashboard_welcome: "Witaj ponownie",
            dashboard_no_docs: "Brak dokumentów",
            dashboard_logout: "Wyloguj",
        },
        hi: {
            nav_features: "विशेषताएं",
            nav_web_dashboard: "वेब डैशबोर्ड",
            nav_how_it_works: "यह कैसे काम करता है",
            nav_reviews: "समीक्षाएं",
            nav_pricing: "मूल्य",
            nav_download: "मुफ्त डाउनलोड",
            login_signup: "लॉगिन / साइन अप",
            hero_badge: "#1 दस्तावेज़ स्कैनर ऐप",
            hero_description: "अपने स्मार्टफोन को एक शक्तिशाली दस्तावेज़ स्कैनर में बदलें।",
            download_free: "मुफ्त डाउनलोड",
            features_title: "शक्तिशाली विशेषताएं",
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

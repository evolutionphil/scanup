/**
 * ScanUp i18n (Internationalization) Module
 * Complete translation system for website
 */
const ScanUpI18n = {
    currentLang: 'en',
    translations: {},
    languages: [
        { code: 'en', name: 'English', native_name: 'English', flag: '🇺🇸' },
        { code: 'de', name: 'German', native_name: 'Deutsch', flag: '🇩🇪' },
        { code: 'fr', name: 'French', native_name: 'Français', flag: '🇫🇷' },
        { code: 'es', name: 'Spanish', native_name: 'Español', flag: '🇪🇸' },
        { code: 'tr', name: 'Turkish', native_name: 'Türkçe', flag: '🇹🇷' },
        { code: 'ru', name: 'Russian', native_name: 'Русский', flag: '🇷🇺' },
        { code: 'it', name: 'Italian', native_name: 'Italiano', flag: '🇮🇹' },
        { code: 'pt', name: 'Portuguese', native_name: 'Português', flag: '🇵🇹' },
        { code: 'ar', name: 'Arabic', native_name: 'العربية', flag: '🇸🇦', rtl: true },
        { code: 'zh', name: 'Chinese', native_name: '中文', flag: '🇨🇳' },
        { code: 'ja', name: 'Japanese', native_name: '日本語', flag: '🇯🇵' },
        { code: 'ko', name: 'Korean', native_name: '한국어', flag: '🇰🇷' },
        { code: 'nl', name: 'Dutch', native_name: 'Nederlands', flag: '🇳🇱' },
        { code: 'pl', name: 'Polish', native_name: 'Polski', flag: '🇵🇱' },
        { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', flag: '🇮🇳' },
    ],
    API_BASE: '',
    
    // Complete website translations
    websiteTranslations: {
        en: {
            // Navigation
            nav_features: "Features",
            nav_web_dashboard: "Web Dashboard",
            nav_how_it_works: "How It Works",
            nav_reviews: "Reviews",
            nav_pricing: "Pricing",
            login_signup: "Login / Sign Up",
            
            // Hero
            hero_badge: "#1 Document Scanner App",
            hero_title: "Scan Documents <span>Instantly</span> with Your Phone",
            hero_description: "Transform your smartphone into a powerful document scanner. Scan, edit, sign, and share documents in seconds with professional quality.",
            download_free: "Download Free",
            see_how_it_works: "See How It Works",
            stat_downloads: "Downloads",
            stat_rating: "App Rating",
            stat_scanned: "Docs Scanned",
            
            // Phone mockup
            phone_documents: "Documents",
            phone_folders: "Folders",
            phone_scan_complete: "Scan Complete!",
            phone_encrypted: "Encrypted & Secure",
            phone_home: "Home",
            phone_search: "Search",
            phone_settings: "Settings",
            
            // Features section
            features_title: "Powerful Features",
            features_subtitle: "Everything you need to digitize your documents",
            feature_1_title: "Smart Scanning",
            feature_1_desc: "Auto-detect edges and enhance quality",
            feature_2_title: "Digital Signatures",
            feature_2_desc: "Sign documents with your finger",
            feature_3_title: "OCR Technology",
            feature_3_desc: "Extract text from images",
            feature_4_title: "Cloud Sync",
            feature_4_desc: "Access anywhere, anytime",
            feature_5_title: "Password Protection",
            feature_5_desc: "Keep documents secure",
            feature_6_title: "Multiple Formats",
            feature_6_desc: "Export as PDF, JPG, PNG",
            
            // Web Dashboard section
            web_dashboard_title: "Access from Anywhere",
            web_dashboard_subtitle: "Manage your documents from any browser",
            web_dashboard_feature_1: "Cloud synchronization",
            web_dashboard_feature_2: "Share with anyone",
            web_dashboard_feature_3: "Organize with folders",
            try_dashboard: "Try Dashboard",
            
            // How it works
            how_it_works_title: "How It Works",
            how_it_works_subtitle: "Scan documents in 3 easy steps",
            step_1_title: "Point & Scan",
            step_1_desc: "Aim your camera at any document",
            step_2_title: "Auto Enhance",
            step_2_desc: "We automatically improve quality",
            step_3_title: "Save & Share",
            step_3_desc: "Export as PDF or share directly",
            
            // Testimonials
            testimonials_title: "What Users Say",
            testimonials_subtitle: "Join millions of satisfied users",
            
            // Pricing
            pricing_title: "Simple Pricing",
            pricing_subtitle: "Choose the plan that fits you",
            pricing_free: "Free",
            pricing_free_price: "$0",
            pricing_free_period: "forever",
            pricing_premium: "Premium",
            pricing_premium_price: "$4.99",
            pricing_premium_period: "/month",
            pricing_feature_1: "Unlimited scans",
            pricing_feature_2: "No watermarks",
            pricing_feature_3: "Cloud backup",
            pricing_feature_4: "Priority support",
            get_started: "Get Started",
            current_plan: "Current Plan",
            
            // FAQ
            faq_title: "Frequently Asked Questions",
            faq_q1: "Is ScanUp really free?",
            faq_a1: "Yes! ScanUp is free to download and use. Premium features are optional.",
            faq_q2: "Can I scan multiple pages?",
            faq_a2: "Absolutely! Create multi-page documents easily.",
            faq_q3: "Is my data secure?",
            faq_a3: "Yes, we use end-to-end encryption for all documents.",
            faq_q4: "Does it work offline?",
            faq_a4: "Yes, scan and edit offline. Sync when connected.",
            
            // Download section
            download_title: "Download Now",
            download_subtitle: "Available on iOS and Android",
            download_ios: "Download on App Store",
            download_android: "Get it on Google Play",
            
            // Footer
            footer_product: "Product",
            footer_company: "Company",
            footer_support: "Support",
            footer_legal: "Legal",
            footer_about: "About Us",
            footer_careers: "Careers",
            footer_contact: "Contact",
            footer_help: "Help Center",
            footer_faq: "FAQ",
            footer_privacy: "Privacy Policy",
            footer_terms: "Terms of Service",
            footer_copyright: "© 2024 ScanUp. All rights reserved.",
            
            // Mobile menu
            menu_close: "Close",
        },
        de: {
            nav_features: "Funktionen",
            nav_web_dashboard: "Web-Dashboard",
            nav_how_it_works: "So funktioniert's",
            nav_reviews: "Bewertungen",
            nav_pricing: "Preise",
            login_signup: "Anmelden",
            hero_badge: "#1 Dokumentenscanner-App",
            hero_title: "Dokumente <span>Sofort</span> mit Ihrem Handy scannen",
            hero_description: "Verwandeln Sie Ihr Smartphone in einen leistungsstarken Dokumentenscanner. Scannen, bearbeiten, unterschreiben und teilen Sie Dokumente in Sekunden.",
            download_free: "Kostenlos herunterladen",
            see_how_it_works: "So funktioniert's",
            stat_downloads: "Downloads",
            stat_rating: "Bewertung",
            stat_scanned: "Gescannte Dokumente",
            phone_documents: "Dokumente",
            phone_folders: "Ordner",
            phone_scan_complete: "Scan abgeschlossen!",
            phone_encrypted: "Verschlüsselt & Sicher",
            phone_home: "Start",
            phone_search: "Suche",
            phone_settings: "Einstellungen",
            features_title: "Leistungsstarke Funktionen",
            features_subtitle: "Alles was Sie zum Digitalisieren brauchen",
            feature_1_title: "Intelligentes Scannen",
            feature_1_desc: "Automatische Kantenerkennung",
            feature_2_title: "Digitale Unterschriften",
            feature_2_desc: "Dokumente mit dem Finger unterschreiben",
            feature_3_title: "OCR-Technologie",
            feature_3_desc: "Text aus Bildern extrahieren",
            feature_4_title: "Cloud-Sync",
            feature_4_desc: "Überall Zugriff",
            feature_5_title: "Passwortschutz",
            feature_5_desc: "Dokumente sicher aufbewahren",
            feature_6_title: "Mehrere Formate",
            feature_6_desc: "Export als PDF, JPG, PNG",
            web_dashboard_title: "Von überall zugreifen",
            web_dashboard_subtitle: "Verwalten Sie Ihre Dokumente im Browser",
            try_dashboard: "Dashboard testen",
            how_it_works_title: "So funktioniert's",
            how_it_works_subtitle: "In 3 einfachen Schritten scannen",
            step_1_title: "Scannen",
            step_1_desc: "Kamera auf das Dokument richten",
            step_2_title: "Verbessern",
            step_2_desc: "Automatische Qualitätsverbesserung",
            step_3_title: "Teilen",
            step_3_desc: "Als PDF exportieren oder teilen",
            testimonials_title: "Was Nutzer sagen",
            pricing_title: "Einfache Preise",
            pricing_free: "Kostenlos",
            pricing_free_price: "0€",
            pricing_free_period: "für immer",
            pricing_premium: "Premium",
            pricing_premium_price: "4,99€",
            pricing_premium_period: "/Monat",
            get_started: "Loslegen",
            current_plan: "Aktueller Plan",
            faq_title: "Häufige Fragen",
            download_title: "Jetzt herunterladen",
            download_subtitle: "Für iOS und Android verfügbar",
            download_ios: "Im App Store laden",
            download_android: "Bei Google Play laden",
            footer_copyright: "© 2024 ScanUp. Alle Rechte vorbehalten.",
        },
        tr: {
            nav_features: "Özellikler",
            nav_web_dashboard: "Web Paneli",
            nav_how_it_works: "Nasıl Çalışır",
            nav_reviews: "Yorumlar",
            nav_pricing: "Fiyatlar",
            login_signup: "Giriş Yap",
            hero_badge: "#1 Belge Tarayıcı Uygulaması",
            hero_title: "Belgeleri Telefonunuzla <span>Anında</span> Tarayın",
            hero_description: "Akıllı telefonunuzu güçlü bir belge tarayıcıya dönüştürün. Saniyeler içinde tarayın, düzenleyin, imzalayın ve paylaşın.",
            download_free: "Ücretsiz İndir",
            see_how_it_works: "Nasıl Çalışır",
            stat_downloads: "İndirme",
            stat_rating: "Uygulama Puanı",
            stat_scanned: "Taranan Belge",
            phone_documents: "Belgeler",
            phone_folders: "Klasörler",
            phone_scan_complete: "Tarama Tamamlandı!",
            phone_encrypted: "Şifreli ve Güvenli",
            phone_home: "Ana Sayfa",
            phone_search: "Ara",
            phone_settings: "Ayarlar",
            features_title: "Güçlü Özellikler",
            features_subtitle: "Belgelerinizi dijitalleştirmek için her şey",
            feature_1_title: "Akıllı Tarama",
            feature_1_desc: "Otomatik kenar algılama ve kalite iyileştirme",
            feature_2_title: "Dijital İmza",
            feature_2_desc: "Parmağınızla belge imzalayın",
            feature_3_title: "OCR Teknolojisi",
            feature_3_desc: "Resimlerden metin çıkarın",
            feature_4_title: "Bulut Senkronizasyonu",
            feature_4_desc: "Her yerden erişin",
            feature_5_title: "Şifre Koruması",
            feature_5_desc: "Belgelerinizi güvende tutun",
            feature_6_title: "Çoklu Format",
            feature_6_desc: "PDF, JPG, PNG olarak dışa aktar",
            web_dashboard_title: "Her Yerden Erişin",
            web_dashboard_subtitle: "Belgelerinizi herhangi bir tarayıcıdan yönetin",
            try_dashboard: "Paneli Deneyin",
            how_it_works_title: "Nasıl Çalışır",
            how_it_works_subtitle: "3 kolay adımda belge tarayın",
            step_1_title: "Tara",
            step_1_desc: "Kameranızı belgeye doğrultun",
            step_2_title: "İyileştir",
            step_2_desc: "Otomatik kalite iyileştirme",
            step_3_title: "Paylaş",
            step_3_desc: "PDF olarak kaydet veya paylaş",
            testimonials_title: "Kullanıcılar Ne Diyor",
            pricing_title: "Basit Fiyatlandırma",
            pricing_free: "Ücretsiz",
            pricing_free_price: "₺0",
            pricing_free_period: "sonsuza dek",
            pricing_premium: "Premium",
            pricing_premium_price: "₺149",
            pricing_premium_period: "/ay",
            get_started: "Başla",
            current_plan: "Mevcut Plan",
            faq_title: "Sıkça Sorulan Sorular",
            faq_q1: "ScanUp gerçekten ücretsiz mi?",
            faq_a1: "Evet! ScanUp'ı indirmek ve kullanmak tamamen ücretsiz. Premium özellikler isteğe bağlıdır.",
            faq_q2: "Birden fazla sayfa tarayabilir miyim?",
            faq_a2: "Elbette! Çok sayfalı belgeler kolayca oluşturun.",
            faq_q3: "Verilerim güvende mi?",
            faq_a3: "Evet, tüm belgeler için uçtan uca şifreleme kullanıyoruz.",
            faq_q4: "Çevrimdışı çalışıyor mu?",
            faq_a4: "Evet, çevrimdışı tarayın ve düzenleyin. Bağlandığınızda senkronize edin.",
            download_title: "Şimdi İndirin",
            download_subtitle: "iOS ve Android'de mevcut",
            download_ios: "App Store'dan İndir",
            download_android: "Google Play'den Edinin",
            footer_copyright: "© 2024 ScanUp. Tüm hakları saklıdır.",
        },
        fr: {
            nav_features: "Fonctionnalités",
            nav_web_dashboard: "Tableau de bord",
            nav_how_it_works: "Comment ça marche",
            nav_reviews: "Avis",
            nav_pricing: "Tarifs",
            login_signup: "Connexion",
            hero_badge: "#1 Application de scanner",
            hero_title: "Numérisez des documents <span>Instantanément</span> avec votre téléphone",
            hero_description: "Transformez votre smartphone en un puissant scanner de documents. Numérisez, modifiez, signez et partagez en quelques secondes.",
            download_free: "Télécharger gratuitement",
            see_how_it_works: "Comment ça marche",
            stat_downloads: "Téléchargements",
            stat_rating: "Note",
            stat_scanned: "Docs numérisés",
            phone_documents: "Documents",
            phone_folders: "Dossiers",
            phone_scan_complete: "Numérisation terminée!",
            phone_encrypted: "Chiffré et sécurisé",
            phone_home: "Accueil",
            phone_search: "Recherche",
            phone_settings: "Paramètres",
            features_title: "Fonctionnalités puissantes",
            how_it_works_title: "Comment ça marche",
            step_1_title: "Numériser",
            step_2_title: "Améliorer",
            step_3_title: "Partager",
            testimonials_title: "Ce que disent les utilisateurs",
            pricing_title: "Tarifs simples",
            pricing_free: "Gratuit",
            pricing_premium: "Premium",
            get_started: "Commencer",
            faq_title: "Questions fréquentes",
            download_title: "Télécharger maintenant",
            download_ios: "Télécharger sur App Store",
            download_android: "Télécharger sur Google Play",
            footer_copyright: "© 2024 ScanUp. Tous droits réservés.",
        },
        es: {
            nav_features: "Características",
            nav_web_dashboard: "Panel Web",
            nav_how_it_works: "Cómo funciona",
            nav_reviews: "Reseñas",
            nav_pricing: "Precios",
            login_signup: "Iniciar sesión",
            hero_badge: "#1 App de escáner",
            hero_title: "Escanea documentos <span>Al instante</span> con tu teléfono",
            hero_description: "Transforma tu smartphone en un potente escáner de documentos. Escanea, edita, firma y comparte en segundos.",
            download_free: "Descargar gratis",
            see_how_it_works: "Cómo funciona",
            stat_downloads: "Descargas",
            stat_rating: "Calificación",
            stat_scanned: "Docs escaneados",
            phone_documents: "Documentos",
            phone_folders: "Carpetas",
            phone_scan_complete: "¡Escaneo completado!",
            phone_encrypted: "Cifrado y seguro",
            features_title: "Características potentes",
            how_it_works_title: "Cómo funciona",
            testimonials_title: "Lo que dicen los usuarios",
            pricing_title: "Precios simples",
            pricing_free: "Gratis",
            pricing_premium: "Premium",
            get_started: "Empezar",
            faq_title: "Preguntas frecuentes",
            download_title: "Descargar ahora",
            download_ios: "Descargar en App Store",
            download_android: "Obtener en Google Play",
            footer_copyright: "© 2024 ScanUp. Todos los derechos reservados.",
        },
        ru: {
            nav_features: "Функции",
            nav_web_dashboard: "Веб-панель",
            nav_how_it_works: "Как это работает",
            nav_reviews: "Отзывы",
            nav_pricing: "Цены",
            login_signup: "Войти",
            hero_badge: "#1 Приложение-сканер",
            hero_title: "Сканируйте документы <span>Мгновенно</span> с телефона",
            hero_description: "Превратите свой смартфон в мощный сканер документов. Сканируйте, редактируйте, подписывайте и делитесь за секунды.",
            download_free: "Скачать бесплатно",
            see_how_it_works: "Как это работает",
            stat_downloads: "Загрузок",
            stat_rating: "Рейтинг",
            stat_scanned: "Отсканировано",
            phone_documents: "Документы",
            phone_folders: "Папки",
            phone_scan_complete: "Сканирование завершено!",
            phone_encrypted: "Зашифровано и безопасно",
            features_title: "Мощные функции",
            how_it_works_title: "Как это работает",
            testimonials_title: "Отзывы пользователей",
            pricing_title: "Простые цены",
            pricing_free: "Бесплатно",
            pricing_premium: "Премиум",
            get_started: "Начать",
            faq_title: "Частые вопросы",
            download_title: "Скачать сейчас",
            footer_copyright: "© 2024 ScanUp. Все права защищены.",
        },
        it: {
            nav_features: "Funzionalità",
            nav_web_dashboard: "Dashboard Web",
            nav_how_it_works: "Come funziona",
            nav_reviews: "Recensioni",
            nav_pricing: "Prezzi",
            login_signup: "Accedi",
            hero_badge: "#1 App Scanner",
            hero_title: "Scansiona documenti <span>Istantaneamente</span> con il telefono",
            hero_description: "Trasforma il tuo smartphone in un potente scanner di documenti.",
            download_free: "Scarica gratis",
            see_how_it_works: "Come funziona",
            stat_downloads: "Download",
            stat_rating: "Valutazione",
            stat_scanned: "Docs scansionati",
            phone_documents: "Documenti",
            phone_folders: "Cartelle",
            features_title: "Funzionalità potenti",
            pricing_title: "Prezzi semplici",
            pricing_free: "Gratis",
            pricing_premium: "Premium",
            download_title: "Scarica ora",
            footer_copyright: "© 2024 ScanUp. Tutti i diritti riservati.",
        },
        pt: {
            nav_features: "Recursos",
            nav_web_dashboard: "Painel Web",
            nav_how_it_works: "Como funciona",
            nav_reviews: "Avaliações",
            nav_pricing: "Preços",
            login_signup: "Entrar",
            hero_badge: "#1 App de Scanner",
            hero_title: "Digitalize documentos <span>Instantaneamente</span> com seu celular",
            hero_description: "Transforme seu smartphone em um poderoso scanner de documentos.",
            download_free: "Baixar grátis",
            see_how_it_works: "Como funciona",
            stat_downloads: "Downloads",
            stat_rating: "Avaliação",
            stat_scanned: "Docs digitalizados",
            phone_documents: "Documentos",
            phone_folders: "Pastas",
            features_title: "Recursos poderosos",
            pricing_title: "Preços simples",
            pricing_free: "Grátis",
            pricing_premium: "Premium",
            download_title: "Baixar agora",
            footer_copyright: "© 2024 ScanUp. Todos os direitos reservados.",
        },
        ar: {
            nav_features: "الميزات",
            nav_web_dashboard: "لوحة التحكم",
            nav_how_it_works: "كيف يعمل",
            nav_reviews: "التقييمات",
            nav_pricing: "الأسعار",
            login_signup: "تسجيل الدخول",
            hero_badge: "#1 تطبيق ماسح ضوئي",
            hero_title: "امسح المستندات <span>فوراً</span> بهاتفك",
            hero_description: "حوّل هاتفك الذكي إلى ماسح ضوئي قوي للمستندات.",
            download_free: "تحميل مجاني",
            see_how_it_works: "كيف يعمل",
            stat_downloads: "التحميلات",
            stat_rating: "التقييم",
            stat_scanned: "المستندات الممسوحة",
            phone_documents: "المستندات",
            phone_folders: "المجلدات",
            features_title: "ميزات قوية",
            pricing_title: "أسعار بسيطة",
            pricing_free: "مجاني",
            pricing_premium: "مميز",
            download_title: "حمّل الآن",
            footer_copyright: "© 2024 ScanUp. جميع الحقوق محفوظة.",
        },
        zh: {
            nav_features: "功能",
            nav_web_dashboard: "网页面板",
            nav_how_it_works: "使用方法",
            nav_reviews: "评价",
            nav_pricing: "价格",
            login_signup: "登录",
            hero_badge: "#1 文档扫描应用",
            hero_title: "用手机<span>即时</span>扫描文档",
            hero_description: "将您的智能手机变成强大的文档扫描仪。",
            download_free: "免费下载",
            see_how_it_works: "使用方法",
            stat_downloads: "下载量",
            stat_rating: "评分",
            stat_scanned: "已扫描文档",
            phone_documents: "文档",
            phone_folders: "文件夹",
            features_title: "强大功能",
            pricing_title: "简单定价",
            pricing_free: "免费",
            pricing_premium: "高级版",
            download_title: "立即下载",
            footer_copyright: "© 2024 ScanUp. 保留所有权利。",
        },
        ja: {
            nav_features: "機能",
            nav_web_dashboard: "ウェブダッシュボード",
            nav_how_it_works: "使い方",
            nav_reviews: "レビュー",
            nav_pricing: "料金",
            login_signup: "ログイン",
            hero_badge: "#1 ドキュメントスキャナー",
            hero_title: "スマホで<span>すぐに</span>ドキュメントをスキャン",
            hero_description: "スマートフォンを強力なドキュメントスキャナーに変えましょう。",
            download_free: "無料ダウンロード",
            see_how_it_works: "使い方を見る",
            stat_downloads: "ダウンロード",
            stat_rating: "評価",
            stat_scanned: "スキャン済み",
            phone_documents: "ドキュメント",
            phone_folders: "フォルダ",
            features_title: "パワフルな機能",
            pricing_title: "シンプルな料金",
            pricing_free: "無料",
            pricing_premium: "プレミアム",
            download_title: "今すぐダウンロード",
            footer_copyright: "© 2024 ScanUp. All rights reserved.",
        },
        ko: {
            nav_features: "기능",
            nav_web_dashboard: "웹 대시보드",
            nav_how_it_works: "사용 방법",
            nav_reviews: "리뷰",
            nav_pricing: "가격",
            login_signup: "로그인",
            hero_badge: "#1 문서 스캐너 앱",
            hero_title: "스마트폰으로 문서를 <span>즉시</span> 스캔",
            hero_description: "스마트폰을 강력한 문서 스캐너로 변환하세요.",
            download_free: "무료 다운로드",
            see_how_it_works: "사용 방법 보기",
            stat_downloads: "다운로드",
            stat_rating: "평점",
            stat_scanned: "스캔된 문서",
            phone_documents: "문서",
            phone_folders: "폴더",
            features_title: "강력한 기능",
            pricing_title: "간단한 가격",
            pricing_free: "무료",
            pricing_premium: "프리미엄",
            download_title: "지금 다운로드",
            footer_copyright: "© 2024 ScanUp. All rights reserved.",
        },
        nl: {
            nav_features: "Functies",
            nav_web_dashboard: "Web Dashboard",
            nav_how_it_works: "Hoe het werkt",
            nav_reviews: "Recensies",
            nav_pricing: "Prijzen",
            login_signup: "Inloggen",
            hero_badge: "#1 Documentscanner App",
            hero_title: "Scan documenten <span>Direct</span> met je telefoon",
            hero_description: "Verander je smartphone in een krachtige documentscanner.",
            download_free: "Gratis downloaden",
            see_how_it_works: "Hoe het werkt",
            stat_downloads: "Downloads",
            stat_rating: "Beoordeling",
            stat_scanned: "Gescande docs",
            phone_documents: "Documenten",
            phone_folders: "Mappen",
            features_title: "Krachtige functies",
            pricing_title: "Eenvoudige prijzen",
            pricing_free: "Gratis",
            pricing_premium: "Premium",
            download_title: "Nu downloaden",
            footer_copyright: "© 2024 ScanUp. Alle rechten voorbehouden.",
        },
        pl: {
            nav_features: "Funkcje",
            nav_web_dashboard: "Panel webowy",
            nav_how_it_works: "Jak to działa",
            nav_reviews: "Recenzje",
            nav_pricing: "Ceny",
            login_signup: "Zaloguj",
            hero_badge: "#1 Aplikacja skanera",
            hero_title: "Skanuj dokumenty <span>Natychmiast</span> telefonem",
            hero_description: "Zamień swój smartfon w potężny skaner dokumentów.",
            download_free: "Pobierz za darmo",
            see_how_it_works: "Jak to działa",
            stat_downloads: "Pobrań",
            stat_rating: "Ocena",
            stat_scanned: "Zeskanowanych",
            phone_documents: "Dokumenty",
            phone_folders: "Foldery",
            features_title: "Potężne funkcje",
            pricing_title: "Proste ceny",
            pricing_free: "Darmowy",
            pricing_premium: "Premium",
            download_title: "Pobierz teraz",
            footer_copyright: "© 2024 ScanUp. Wszelkie prawa zastrzeżone.",
        },
        hi: {
            nav_features: "विशेषताएं",
            nav_web_dashboard: "वेब डैशबोर्ड",
            nav_how_it_works: "कैसे काम करता है",
            nav_reviews: "समीक्षाएं",
            nav_pricing: "मूल्य",
            login_signup: "लॉगिन",
            hero_badge: "#1 दस्तावेज़ स्कैनर ऐप",
            hero_title: "अपने फोन से दस्तावेज़ <span>तुरंत</span> स्कैन करें",
            hero_description: "अपने स्मार्टफोन को एक शक्तिशाली दस्तावेज़ स्कैनर में बदलें।",
            download_free: "मुफ्त डाउनलोड",
            see_how_it_works: "कैसे काम करता है",
            stat_downloads: "डाउनलोड",
            stat_rating: "रेटिंग",
            stat_scanned: "स्कैन किए गए",
            phone_documents: "दस्तावेज़",
            phone_folders: "फ़ोल्डर",
            features_title: "शक्तिशाली विशेषताएं",
            pricing_title: "सरल मूल्य",
            pricing_free: "मुफ्त",
            pricing_premium: "प्रीमियम",
            download_title: "अभी डाउनलोड करें",
            footer_copyright: "© 2024 ScanUp. सर्वाधिकार सुरक्षित।",
        },
    },
    
    async init(apiBase = '') {
        this.API_BASE = apiBase;
        this.currentLang = this.detectLanguage();
        this.translations = this.websiteTranslations[this.currentLang] || this.websiteTranslations['en'];
        this.applyTranslations();
        this.createLanguageSelector();
        return this;
    },
    
    detectLanguage() {
        // 1. Check URL path
        const path = window.location.pathname;
        const match = path.match(/^\/([a-z]{2})(\/|$)/);
        if (match && this.languages.find(l => l.code === match[1])) {
            return match[1];
        }
        // 2. Check localStorage
        const stored = localStorage.getItem('scanup_language');
        if (stored && this.languages.find(l => l.code === stored)) {
            return stored;
        }
        // 3. Check browser language
        const browserLang = navigator.language?.split('-')[0];
        if (browserLang && this.languages.find(l => l.code === browserLang)) {
            return browserLang;
        }
        return 'en';
    },
    
    t(key) {
        return this.translations[key] || this.websiteTranslations['en'][key] || key;
    },
    
    applyTranslations() {
        const t = this.t.bind(this);
        
        // Navigation links
        const navMappings = [
            { selector: '.nav-links a[href="#features"]', key: 'nav_features' },
            { selector: '.nav-links a[href="#web-dashboard"]', key: 'nav_web_dashboard' },
            { selector: '.nav-links a[href="#how-it-works"]', key: 'nav_how_it_works' },
            { selector: '.nav-links a[href="#testimonials"]', key: 'nav_reviews' },
            { selector: '.nav-links a[href="#pricing"]', key: 'nav_pricing' },
        ];
        
        navMappings.forEach(({selector, key}) => {
            const el = document.querySelector(selector);
            if (el) el.textContent = t(key);
        });
        
        // Login button
        const loginBtn = document.querySelector('.nav-cta');
        if (loginBtn) loginBtn.textContent = t('login_signup');
        
        // Mobile menu
        document.querySelectorAll('.mobile-menu a').forEach((a, i) => {
            const keys = ['nav_features', 'nav_web_dashboard', 'nav_how_it_works', 'nav_reviews', 'nav_pricing', 'login_signup'];
            if (keys[i]) a.textContent = t(keys[i]);
        });
        
        // Hero section
        const heroBadge = document.querySelector('.hero-badge');
        if (heroBadge) heroBadge.innerHTML = `<i class="fas fa-star"></i> ${t('hero_badge')}`;
        
        const heroTitle = document.querySelector('.hero h1');
        if (heroTitle) heroTitle.innerHTML = t('hero_title');
        
        const heroDesc = document.querySelector('.hero-content > p');
        if (heroDesc) heroDesc.textContent = t('hero_description');
        
        // Hero buttons
        const downloadBtn = document.querySelector('.hero-buttons .btn-primary');
        if (downloadBtn) downloadBtn.innerHTML = `<i class="fas fa-download"></i> ${t('download_free')}`;
        
        const howItWorksBtn = document.querySelector('.hero-buttons .btn-secondary');
        if (howItWorksBtn) howItWorksBtn.innerHTML = `<i class="fas fa-play-circle"></i> ${t('see_how_it_works')}`;
        
        // Stats
        const statLabels = document.querySelectorAll('.stat-label');
        const statKeys = ['stat_downloads', 'stat_rating', 'stat_scanned'];
        statLabels.forEach((label, i) => {
            if (statKeys[i]) label.textContent = t(statKeys[i]);
        });
        
        // Phone mockup
        const appTitle = document.querySelector('.app-title');
        if (appTitle) appTitle.textContent = t('phone_documents');
        
        const appTabs = document.querySelectorAll('.app-tab');
        if (appTabs[0]) appTabs[0].textContent = t('phone_documents');
        if (appTabs[1]) appTabs[1].textContent = t('phone_folders');
        
        const scanComplete = document.querySelector('.scan-notification span');
        if (scanComplete) scanComplete.textContent = t('phone_scan_complete');
        
        const encrypted = document.querySelector('.security-badge span');
        if (encrypted) encrypted.textContent = t('phone_encrypted');
        
        const bottomNav = document.querySelectorAll('.nav-item span');
        const navKeys = ['phone_home', 'phone_folders', null, 'phone_search', 'phone_settings'];
        bottomNav.forEach((span, i) => {
            if (navKeys[i]) span.textContent = t(navKeys[i]);
        });
        
        // Section titles
        const sectionMappings = [
            { id: 'features', titleKey: 'features_title', subtitleKey: 'features_subtitle' },
            { id: 'web-dashboard', titleKey: 'web_dashboard_title', subtitleKey: 'web_dashboard_subtitle' },
            { id: 'how-it-works', titleKey: 'how_it_works_title', subtitleKey: 'how_it_works_subtitle' },
            { id: 'testimonials', titleKey: 'testimonials_title', subtitleKey: 'testimonials_subtitle' },
            { id: 'pricing', titleKey: 'pricing_title', subtitleKey: 'pricing_subtitle' },
            { id: 'faq', titleKey: 'faq_title' },
            { id: 'download', titleKey: 'download_title', subtitleKey: 'download_subtitle' },
        ];
        
        sectionMappings.forEach(({id, titleKey, subtitleKey}) => {
            const section = document.getElementById(id);
            if (section) {
                const title = section.querySelector('h2, .section-header h2');
                if (title) title.textContent = t(titleKey);
                const subtitle = section.querySelector('.section-header p, .section-subtitle');
                if (subtitle && subtitleKey) subtitle.textContent = t(subtitleKey);
            }
        });
        
        // Download buttons
        document.querySelectorAll('.app-store-btn').forEach(btn => {
            const span = btn.querySelector('.btn-text span:last-child');
            if (span) {
                if (btn.href?.includes('apple') || btn.querySelector('.fa-apple')) {
                    span.textContent = t('download_ios').replace('Download on ', '').replace('Télécharger sur ', '').replace('Im ', '').replace(' laden', '');
                } else {
                    span.textContent = t('download_android').replace('Get it on ', '').replace('Obtenir sur ', '').replace('Bei ', '').replace(' laden', '');
                }
            }
        });
        
        // Footer
        const footerCopyright = document.querySelector('.footer-bottom p');
        if (footerCopyright) footerCopyright.textContent = t('footer_copyright');
        
        // Update HTML lang and dir
        document.documentElement.lang = this.currentLang;
        document.documentElement.dir = this.languages.find(l => l.code === this.currentLang)?.rtl ? 'rtl' : 'ltr';
    },
    
    createLanguageSelector() {
        // Remove old selector if exists
        const oldSelector = document.querySelector('.language-selector-wrapper');
        if (oldSelector) oldSelector.remove();
        
        // Create new selector with flags
        const wrapper = document.createElement('div');
        wrapper.className = 'language-selector-wrapper';
        wrapper.style.cssText = 'margin-right: 1rem; position: relative;';
        
        const select = document.createElement('select');
        select.id = 'language-selector';
        select.style.cssText = `
            padding: 0.5rem 0.75rem;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: white;
            font-size: 0.9rem;
            cursor: pointer;
            appearance: none;
            padding-right: 2rem;
            min-width: 140px;
        `;
        
        this.languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = `${lang.flag} ${lang.native_name}`;
            option.selected = lang.code === this.currentLang;
            select.appendChild(option);
        });
        
        // Add dropdown arrow
        const arrow = document.createElement('span');
        arrow.innerHTML = '▼';
        arrow.style.cssText = 'position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.7rem; color: #666; pointer-events: none;';
        
        wrapper.appendChild(select);
        wrapper.appendChild(arrow);
        
        // Add to navbar before auth buttons
        const authButtons = document.getElementById('authButtons');
        if (authButtons && authButtons.parentNode) {
            authButtons.parentNode.insertBefore(wrapper, authButtons);
        }
        
        // Add change listener
        select.addEventListener('change', (e) => this.setLanguage(e.target.value));
    },
    
    async setLanguage(langCode) {
        this.currentLang = langCode;
        localStorage.setItem('scanup_language', langCode);
        this.translations = this.websiteTranslations[langCode] || this.websiteTranslations['en'];
        this.applyTranslations();
        
        // Update URL
        const currentPath = window.location.pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');
        const newPath = langCode === 'en' ? currentPath : `/${langCode}${currentPath === '/' ? '' : currentPath}`;
        window.history.pushState({}, '', newPath);
        
        // Update selector
        const select = document.getElementById('language-selector');
        if (select) select.value = langCode;
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => ScanUpI18n.init());

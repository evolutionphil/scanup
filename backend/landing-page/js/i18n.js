/**
 * ScanUp i18n (Internationalization) Module
 * Complete translation system for website and dashboard
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
            features_label: "Features",
            features_title: "Powerful Features",
            features_subtitle: "Everything you need to digitize your documents",
            feature_1_title: "Smart Scanning",
            feature_1_desc: "Auto-detect edges and enhance document quality automatically with AI technology",
            feature_2_title: "Digital Signatures",
            feature_2_desc: "Sign documents directly with your finger or stylus",
            feature_3_title: "OCR Technology",
            feature_3_desc: "Extract text from images and make documents searchable",
            feature_4_title: "Cloud Sync",
            feature_4_desc: "Access your documents anywhere, anytime across all devices",
            feature_5_title: "Password Protection",
            feature_5_desc: "Keep your sensitive documents secure with encryption",
            feature_6_title: "Multiple Formats",
            feature_6_desc: "Export as PDF, JPG, PNG or share directly",
            
            // Web Dashboard section
            web_dashboard_label: "Cloud Access",
            web_dashboard_title: "Access from Anywhere",
            web_dashboard_subtitle: "Manage your documents from any browser on any device",
            web_dashboard_feature_1_title: "Cloud Synchronization",
            web_dashboard_feature_1_desc: "Your documents sync automatically across all your devices",
            web_dashboard_feature_2_title: "Share Easily",
            web_dashboard_feature_2_desc: "Share documents with anyone via link or email",
            web_dashboard_feature_3_title: "Organize with Folders",
            web_dashboard_feature_3_desc: "Keep your documents organized with custom folders",
            web_dashboard_feature_4_title: "Secure Access",
            web_dashboard_feature_4_desc: "Access your documents securely from any browser",
            try_dashboard: "Try Dashboard",
            dashboard_note: "Login required to access dashboard",
            
            // How it works
            how_it_works_label: "Simple Process",
            how_it_works_title: "How It Works",
            how_it_works_subtitle: "Scan documents in 4 easy steps",
            step_1_title: "Download",
            step_1_desc: "Get the free app from App Store or Google Play",
            step_2_title: "Scan",
            step_2_desc: "Point your camera at any document",
            step_3_title: "Enhance",
            step_3_desc: "Auto-improve quality and crop edges",
            step_4_title: "Share",
            step_4_desc: "Export as PDF or share directly",
            
            // Testimonials
            testimonials_label: "Testimonials",
            testimonials_title: "What Users Say",
            testimonials_subtitle: "Join millions of satisfied users worldwide",
            testimonial_1_text: "Best scanner app I've ever used! The quality is amazing and it's so easy to use.",
            testimonial_1_author: "Sarah M.",
            testimonial_1_role: "Business Owner",
            testimonial_2_text: "Finally an app without watermarks. Clean interface and works offline too!",
            testimonial_2_author: "Michael K.",
            testimonial_2_role: "Student",
            testimonial_3_text: "The OCR feature is incredibly accurate. Saves me hours of typing every week.",
            testimonial_3_author: "Jennifer L.",
            testimonial_3_role: "Accountant",
            
            // Pricing
            pricing_label: "Pricing",
            pricing_title: "Simple Pricing",
            pricing_subtitle: "Choose the plan that works for you",
            pricing_free: "Free",
            pricing_free_price: "$0",
            pricing_free_period: "forever",
            pricing_premium: "Premium",
            pricing_premium_price: "$4.99",
            pricing_premium_period: "/month",
            pricing_lifetime: "Lifetime",
            pricing_lifetime_price: "$49.99",
            pricing_lifetime_period: "one time",
            pricing_feature_unlimited_scans: "Unlimited scans",
            pricing_feature_no_watermarks: "No watermarks",
            pricing_feature_cloud_backup: "Cloud backup",
            pricing_feature_ocr: "OCR text recognition",
            pricing_feature_priority_support: "Priority support",
            pricing_feature_all_features: "All premium features",
            pricing_feature_lifetime_updates: "Lifetime updates",
            get_started: "Get Started",
            current_plan: "Current Plan",
            most_popular: "Most Popular",
            best_value: "Best Value",
            
            // FAQ
            faq_label: "FAQ",
            faq_title: "Frequently Asked Questions",
            faq_subtitle: "Find answers to common questions",
            faq_q1: "Is ScanUp really free?",
            faq_a1: "Yes! ScanUp is free to download and use. Premium features are optional.",
            faq_q2: "Can I scan multiple pages?",
            faq_a2: "Absolutely! Create multi-page documents easily.",
            faq_q3: "Is my data secure?",
            faq_a3: "Yes, we use end-to-end encryption for all documents.",
            faq_q4: "Does it work offline?",
            faq_a4: "Yes, scan and edit offline. Sync when connected.",
            faq_q5: "What formats are supported?",
            faq_a5: "Export as PDF, JPG, or PNG. Share directly to any app.",
            faq_q6: "How does cloud sync work?",
            faq_a6: "Your documents automatically sync across all your devices when online.",
            more_questions: "Have more questions?",
            contact_support: "Contact Support",
            
            // Download section
            download_label: "Get the App",
            download_title: "Download Now",
            download_subtitle: "Available free on iOS and Android",
            download_on: "Download on the",
            app_store: "App Store",
            get_it_on: "Get it on",
            google_play: "Google Play",
            
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
            footer_description: "The most powerful document scanner app for iOS and Android.",
            
            // Dashboard - Auth
            auth_access_docs: "Access your documents anywhere",
            auth_tab_login: "Login",
            auth_tab_register: "Register",
            auth_email: "Email",
            auth_password: "Password",
            auth_full_name: "Full Name",
            auth_email_placeholder: "you@example.com",
            auth_password_placeholder: "••••••••",
            auth_name_placeholder: "John Doe",
            auth_password_min: "Min 6 characters",
            auth_login_btn: "Login",
            auth_register_btn: "Create Account",
            auth_or_continue: "or continue with",
            auth_continue_google: "Continue with Google",
            auth_continue_apple: "Continue with Apple",
            
            // Dashboard - Sidebar
            sidebar_menu: "Menu",
            sidebar_my_documents: "My Documents",
            sidebar_profile: "Profile",
            sidebar_settings: "Settings",
            sidebar_quick_actions: "Quick Actions",
            sidebar_get_mobile: "Get Mobile App",
            sidebar_help: "Help & Support",
            sidebar_logout: "Logout",
            sidebar_free_plan: "Free Plan",
            sidebar_premium_plan: "Premium Plan",
            
            // Dashboard - Documents Page
            docs_title: "My Documents",
            docs_subtitle: "View and manage all your scanned documents",
            docs_search_placeholder: "Search documents...",
            docs_stat_documents: "Documents",
            docs_stat_pages: "Pages",
            docs_stat_storage: "Storage",
            docs_stat_this_month: "This Month",
            docs_all_documents: "All Documents",
            docs_folders: "Folders",
            docs_new_folder: "New Folder",
            docs_refresh: "Refresh documents",
            docs_sort_newest: "Newest First",
            docs_sort_oldest: "Oldest First",
            docs_sort_name_asc: "Name A-Z",
            docs_sort_name_desc: "Name Z-A",
            docs_empty_title: "No documents yet",
            docs_empty_desc: "Scan your first document with the mobile app",
            docs_download: "Download",
            docs_view: "View",
            docs_delete: "Delete",
            docs_rename: "Rename",
            docs_page: "Page",
            docs_pages: "pages",
            
            // Dashboard - Profile Page
            profile_title: "My Profile",
            profile_subtitle: "Manage your account settings",
            profile_account_info: "Account Information",
            profile_full_name: "Full Name",
            profile_email: "Email Address",
            profile_member_since: "Member Since",
            profile_premium_plan: "Premium Plan",
            profile_current_plan: "Current Plan",
            profile_features: "Features",
            profile_features_desc: "Unlimited scans, No watermarks, Cloud backup",
            profile_upgrade: "Upgrade to Premium",
            profile_usage_stats: "Usage Statistics",
            profile_docs_created: "Documents Created",
            profile_pages_scanned: "Total Pages Scanned",
            profile_storage_used: "Storage Used",
            profile_security: "Security",
            profile_login_method: "Login Method",
            profile_last_login: "Last Login",
            profile_sign_out: "Sign Out",
            
            // Dashboard - Settings Page
            settings_title: "Settings",
            settings_subtitle: "Customize your experience",
            settings_notifications: "Notifications",
            settings_notifications_desc: "Notification settings are managed in the mobile app.",
            settings_open_mobile: "Open Mobile App",
            settings_danger_zone: "Danger Zone",
            settings_danger_desc: "Delete all your documents. This action cannot be undone.",
            settings_delete_all: "Delete All Documents",
            
            // Dashboard - Modals
            modal_document: "Document",
            modal_close: "Close",
            modal_download_pdf: "Download PDF",
            modal_previous: "Previous",
            modal_next: "Next",
            modal_page_of: "Page {current} of {total}",
            modal_create_folder: "Create New Folder",
            modal_folder_name: "Folder Name",
            modal_folder_placeholder: "My Folder",
            modal_color: "Color",
            modal_cancel: "Cancel",
            modal_create: "Create Folder",
            modal_move_to_folder: "Move to Folder",
            modal_select_folder: "Select Folder",
            modal_no_folder: "No Folder (Root)",
            modal_move: "Move",
            modal_rename_document: "Rename Document",
            modal_new_name: "New Name",
            modal_rename: "Rename",
            
            // Toast messages
            toast_success: "Success!",
            toast_error: "Error!",
            toast_document_deleted: "Document deleted",
            toast_folder_created: "Folder created",
            toast_moved_to_folder: "Moved to folder",
            toast_renamed: "Renamed successfully",
            
            // Web Access Modal
            web_access_title: "Web Access Authorization",
            web_access_desc: "To access your documents from this browser, please authorize from your mobile app.",
            web_access_step_1: "Open ScanUp app on your phone",
            web_access_step_2: "Go to Settings → Web Access",
            web_access_step_3: "Approve this device",
            web_access_waiting: "Waiting for authorization...",
            web_access_expires: "Request expires in",
            web_access_cancel: "Cancel",
        },
        tr: {
            // Navigation
            nav_features: "Özellikler",
            nav_web_dashboard: "Web Paneli",
            nav_how_it_works: "Nasıl Çalışır",
            nav_reviews: "Yorumlar",
            nav_pricing: "Fiyatlar",
            login_signup: "Giriş Yap",
            
            // Hero
            hero_badge: "#1 Belge Tarayıcı Uygulaması",
            hero_title: "Belgeleri Telefonunuzla <span>Anında</span> Tarayın",
            hero_description: "Akıllı telefonunuzu güçlü bir belge tarayıcıya dönüştürün. Saniyeler içinde profesyonel kalitede tarayın, düzenleyin, imzalayın ve paylaşın.",
            download_free: "Ücretsiz İndir",
            see_how_it_works: "Nasıl Çalışır",
            stat_downloads: "İndirme",
            stat_rating: "Uygulama Puanı",
            stat_scanned: "Taranan Belge",
            
            // Phone mockup
            phone_documents: "Belgeler",
            phone_folders: "Klasörler",
            phone_scan_complete: "Tarama Tamamlandı!",
            phone_encrypted: "Şifreli ve Güvenli",
            phone_home: "Ana Sayfa",
            phone_search: "Ara",
            phone_settings: "Ayarlar",
            
            // Features section
            features_label: "Özellikler",
            features_title: "Güçlü Özellikler",
            features_subtitle: "Belgelerinizi dijitalleştirmek için ihtiyacınız olan her şey",
            feature_1_title: "Akıllı Tarama",
            feature_1_desc: "AI teknolojisi ile kenarları otomatik algıla ve belge kalitesini artır",
            feature_2_title: "Dijital İmza",
            feature_2_desc: "Parmağınızla veya kalemle belgeleri doğrudan imzalayın",
            feature_3_title: "OCR Teknolojisi",
            feature_3_desc: "Resimlerden metin çıkarın ve belgeleri aranabilir yapın",
            feature_4_title: "Bulut Senkronizasyonu",
            feature_4_desc: "Belgelerinize her yerden, her zaman, tüm cihazlardan erişin",
            feature_5_title: "Şifre Koruması",
            feature_5_desc: "Hassas belgelerinizi şifreleme ile güvende tutun",
            feature_6_title: "Çoklu Format",
            feature_6_desc: "PDF, JPG, PNG olarak dışa aktarın veya doğrudan paylaşın",
            
            // Web Dashboard section
            web_dashboard_label: "Bulut Erişimi",
            web_dashboard_title: "Her Yerden Erişin",
            web_dashboard_subtitle: "Belgelerinizi herhangi bir cihazdan herhangi bir tarayıcıyla yönetin",
            web_dashboard_feature_1_title: "Bulut Senkronizasyonu",
            web_dashboard_feature_1_desc: "Belgeleriniz tüm cihazlarınızda otomatik olarak senkronize edilir",
            web_dashboard_feature_2_title: "Kolay Paylaşım",
            web_dashboard_feature_2_desc: "Belgeleri link veya e-posta ile herkesle paylaşın",
            web_dashboard_feature_3_title: "Klasörlerle Düzenle",
            web_dashboard_feature_3_desc: "Belgelerinizi özel klasörlerle düzenli tutun",
            web_dashboard_feature_4_title: "Güvenli Erişim",
            web_dashboard_feature_4_desc: "Belgelerinize herhangi bir tarayıcıdan güvenle erişin",
            try_dashboard: "Paneli Deneyin",
            dashboard_note: "Panele erişmek için giriş gereklidir",
            
            // How it works
            how_it_works_label: "Basit İşlem",
            how_it_works_title: "Nasıl Çalışır",
            how_it_works_subtitle: "4 kolay adımda belge tarayın",
            step_1_title: "İndir",
            step_1_desc: "App Store veya Google Play'den ücretsiz uygulamayı alın",
            step_2_title: "Tara",
            step_2_desc: "Kameranızı herhangi bir belgeye doğrultun",
            step_3_title: "İyileştir",
            step_3_desc: "Kaliteyi otomatik iyileştirin ve kenarları kırpın",
            step_4_title: "Paylaş",
            step_4_desc: "PDF olarak dışa aktarın veya doğrudan paylaşın",
            
            // Testimonials
            testimonials_label: "Yorumlar",
            testimonials_title: "Kullanıcılar Ne Diyor",
            testimonials_subtitle: "Dünya çapında milyonlarca memnun kullanıcıya katılın",
            testimonial_1_text: "Kullandığım en iyi tarayıcı uygulaması! Kalitesi harika ve kullanımı çok kolay.",
            testimonial_1_author: "Ayşe M.",
            testimonial_1_role: "İş Sahibi",
            testimonial_2_text: "Sonunda filigransız bir uygulama. Temiz arayüz ve çevrimdışı da çalışıyor!",
            testimonial_2_author: "Mehmet K.",
            testimonial_2_role: "Öğrenci",
            testimonial_3_text: "OCR özelliği inanılmaz doğru. Her hafta saatlerce yazı yazmaktan kurtarıyor.",
            testimonial_3_author: "Zeynep L.",
            testimonial_3_role: "Muhasebeci",
            
            // Pricing
            pricing_label: "Fiyatlandırma",
            pricing_title: "Basit Fiyatlandırma",
            pricing_subtitle: "Size uygun planı seçin",
            pricing_free: "Ücretsiz",
            pricing_free_price: "₺0",
            pricing_free_period: "sonsuza dek",
            pricing_premium: "Premium",
            pricing_premium_price: "₺149",
            pricing_premium_period: "/ay",
            pricing_lifetime: "Ömür Boyu",
            pricing_lifetime_price: "₺1499",
            pricing_lifetime_period: "tek seferlik",
            pricing_feature_unlimited_scans: "Sınırsız tarama",
            pricing_feature_no_watermarks: "Filigran yok",
            pricing_feature_cloud_backup: "Bulut yedekleme",
            pricing_feature_ocr: "OCR metin tanıma",
            pricing_feature_priority_support: "Öncelikli destek",
            pricing_feature_all_features: "Tüm premium özellikler",
            pricing_feature_lifetime_updates: "Ömür boyu güncellemeler",
            get_started: "Başla",
            current_plan: "Mevcut Plan",
            most_popular: "En Popüler",
            best_value: "En İyi Değer",
            
            // FAQ
            faq_label: "SSS",
            faq_title: "Sıkça Sorulan Sorular",
            faq_subtitle: "Yaygın soruların cevaplarını bulun",
            faq_q1: "ScanUp gerçekten ücretsiz mi?",
            faq_a1: "Evet! ScanUp'ı indirmek ve kullanmak tamamen ücretsiz. Premium özellikler isteğe bağlıdır.",
            faq_q2: "Birden fazla sayfa tarayabilir miyim?",
            faq_a2: "Elbette! Çok sayfalı belgeler kolayca oluşturun.",
            faq_q3: "Verilerim güvende mi?",
            faq_a3: "Evet, tüm belgeler için uçtan uca şifreleme kullanıyoruz.",
            faq_q4: "Çevrimdışı çalışıyor mu?",
            faq_a4: "Evet, çevrimdışı tarayın ve düzenleyin. Bağlandığınızda senkronize edin.",
            faq_q5: "Hangi formatlar destekleniyor?",
            faq_a5: "PDF, JPG veya PNG olarak dışa aktarın. Doğrudan herhangi bir uygulamaya paylaşın.",
            faq_q6: "Bulut senkronizasyonu nasıl çalışır?",
            faq_a6: "Belgeleriniz çevrimiçi olduğunuzda tüm cihazlarınızda otomatik olarak senkronize edilir.",
            more_questions: "Başka sorularınız mı var?",
            contact_support: "Destek ile İletişime Geçin",
            
            // Download section
            download_label: "Uygulamayı Alın",
            download_title: "Şimdi İndirin",
            download_subtitle: "iOS ve Android'de ücretsiz",
            download_on: "İndir:",
            app_store: "App Store",
            get_it_on: "Edinin:",
            google_play: "Google Play",
            
            // Footer
            footer_product: "Ürün",
            footer_company: "Şirket",
            footer_support: "Destek",
            footer_legal: "Yasal",
            footer_about: "Hakkımızda",
            footer_careers: "Kariyer",
            footer_contact: "İletişim",
            footer_help: "Yardım Merkezi",
            footer_faq: "SSS",
            footer_privacy: "Gizlilik Politikası",
            footer_terms: "Kullanım Şartları",
            footer_copyright: "© 2024 ScanUp. Tüm hakları saklıdır.",
            footer_description: "iOS ve Android için en güçlü belge tarayıcı uygulaması.",
            
            // Dashboard - Auth
            auth_access_docs: "Belgelerinize her yerden erişin",
            auth_tab_login: "Giriş Yap",
            auth_tab_register: "Kayıt Ol",
            auth_email: "E-posta",
            auth_password: "Şifre",
            auth_full_name: "Ad Soyad",
            auth_email_placeholder: "ornek@email.com",
            auth_password_placeholder: "••••••••",
            auth_name_placeholder: "Adınız Soyadınız",
            auth_password_min: "En az 6 karakter",
            auth_login_btn: "Giriş Yap",
            auth_register_btn: "Hesap Oluştur",
            auth_or_continue: "veya şununla devam edin",
            auth_continue_google: "Google ile Devam Et",
            auth_continue_apple: "Apple ile Devam Et",
            
            // Dashboard - Sidebar
            sidebar_menu: "Menü",
            sidebar_my_documents: "Belgelerim",
            sidebar_profile: "Profil",
            sidebar_settings: "Ayarlar",
            sidebar_quick_actions: "Hızlı İşlemler",
            sidebar_get_mobile: "Mobil Uygulamayı İndir",
            sidebar_help: "Yardım ve Destek",
            sidebar_logout: "Çıkış Yap",
            sidebar_free_plan: "Ücretsiz Plan",
            sidebar_premium_plan: "Premium Plan",
            
            // Dashboard - Documents Page
            docs_title: "Belgelerim",
            docs_subtitle: "Tüm taranmış belgelerinizi görüntüleyin ve yönetin",
            docs_search_placeholder: "Belge ara...",
            docs_stat_documents: "Belgeler",
            docs_stat_pages: "Sayfalar",
            docs_stat_storage: "Depolama",
            docs_stat_this_month: "Bu Ay",
            docs_all_documents: "Tüm Belgeler",
            docs_folders: "Klasörler",
            docs_new_folder: "Yeni Klasör",
            docs_refresh: "Belgeleri yenile",
            docs_sort_newest: "En Yeni Önce",
            docs_sort_oldest: "En Eski Önce",
            docs_sort_name_asc: "İsim A-Z",
            docs_sort_name_desc: "İsim Z-A",
            docs_empty_title: "Henüz belge yok",
            docs_empty_desc: "Mobil uygulamayla ilk belgenizi tarayın",
            docs_download: "İndir",
            docs_view: "Görüntüle",
            docs_delete: "Sil",
            docs_rename: "Yeniden Adlandır",
            docs_page: "Sayfa",
            docs_pages: "sayfa",
            
            // Dashboard - Profile Page
            profile_title: "Profilim",
            profile_subtitle: "Hesap ayarlarınızı yönetin",
            profile_account_info: "Hesap Bilgileri",
            profile_full_name: "Ad Soyad",
            profile_email: "E-posta Adresi",
            profile_member_since: "Üyelik Tarihi",
            profile_premium_plan: "Premium Plan",
            profile_current_plan: "Mevcut Plan",
            profile_features: "Özellikler",
            profile_features_desc: "Sınırsız tarama, Filigran yok, Bulut yedekleme",
            profile_upgrade: "Premium'a Yükselt",
            profile_usage_stats: "Kullanım İstatistikleri",
            profile_docs_created: "Oluşturulan Belgeler",
            profile_pages_scanned: "Taranan Toplam Sayfa",
            profile_storage_used: "Kullanılan Depolama",
            profile_security: "Güvenlik",
            profile_login_method: "Giriş Yöntemi",
            profile_last_login: "Son Giriş",
            profile_sign_out: "Çıkış Yap",
            
            // Dashboard - Settings Page
            settings_title: "Ayarlar",
            settings_subtitle: "Deneyiminizi özelleştirin",
            settings_notifications: "Bildirimler",
            settings_notifications_desc: "Bildirim ayarları mobil uygulamada yönetilir.",
            settings_open_mobile: "Mobil Uygulamayı Aç",
            settings_danger_zone: "Tehlikeli Bölge",
            settings_danger_desc: "Tüm belgelerinizi silin. Bu işlem geri alınamaz.",
            settings_delete_all: "Tüm Belgeleri Sil",
            
            // Dashboard - Modals
            modal_document: "Belge",
            modal_close: "Kapat",
            modal_download_pdf: "PDF İndir",
            modal_previous: "Önceki",
            modal_next: "Sonraki",
            modal_page_of: "Sayfa {current} / {total}",
            modal_create_folder: "Yeni Klasör Oluştur",
            modal_folder_name: "Klasör Adı",
            modal_folder_placeholder: "Klasörüm",
            modal_color: "Renk",
            modal_cancel: "İptal",
            modal_create: "Klasör Oluştur",
            modal_move_to_folder: "Klasöre Taşı",
            modal_select_folder: "Klasör Seç",
            modal_no_folder: "Klasör Yok (Kök)",
            modal_move: "Taşı",
            modal_rename_document: "Belgeyi Yeniden Adlandır",
            modal_new_name: "Yeni Ad",
            modal_rename: "Yeniden Adlandır",
            
            // Toast messages
            toast_success: "Başarılı!",
            toast_error: "Hata!",
            toast_document_deleted: "Belge silindi",
            toast_folder_created: "Klasör oluşturuldu",
            toast_moved_to_folder: "Klasöre taşındı",
            toast_renamed: "Başarıyla yeniden adlandırıldı",
            
            // Web Access Modal
            web_access_title: "Web Erişim Yetkilendirmesi",
            web_access_desc: "Belgelerinize bu tarayıcıdan erişmek için lütfen mobil uygulamanızdan yetkilendirin.",
            web_access_step_1: "Telefonunuzda ScanUp uygulamasını açın",
            web_access_step_2: "Ayarlar → Web Erişimi'ne gidin",
            web_access_step_3: "Bu cihazı onaylayın",
            web_access_waiting: "Yetkilendirme bekleniyor...",
            web_access_expires: "İstek şu sürede sona eriyor:",
            web_access_cancel: "İptal",
        },
        de: {
            // Navigation
            nav_features: "Funktionen",
            nav_web_dashboard: "Web-Dashboard",
            nav_how_it_works: "So funktioniert's",
            nav_reviews: "Bewertungen",
            nav_pricing: "Preise",
            login_signup: "Anmelden",
            
            // Hero
            hero_badge: "#1 Dokumentenscanner-App",
            hero_title: "Dokumente <span>Sofort</span> mit Ihrem Handy scannen",
            hero_description: "Verwandeln Sie Ihr Smartphone in einen leistungsstarken Dokumentenscanner. Scannen, bearbeiten, unterschreiben und teilen Sie Dokumente in Sekunden mit professioneller Qualität.",
            download_free: "Kostenlos herunterladen",
            see_how_it_works: "So funktioniert's",
            stat_downloads: "Downloads",
            stat_rating: "Bewertung",
            stat_scanned: "Gescannte Dokumente",
            
            // Phone mockup
            phone_documents: "Dokumente",
            phone_folders: "Ordner",
            phone_scan_complete: "Scan abgeschlossen!",
            phone_encrypted: "Verschlüsselt & Sicher",
            phone_home: "Start",
            phone_search: "Suche",
            phone_settings: "Einstellungen",
            
            // Features
            features_label: "Funktionen",
            features_title: "Leistungsstarke Funktionen",
            features_subtitle: "Alles was Sie zum Digitalisieren Ihrer Dokumente brauchen",
            feature_1_title: "Intelligentes Scannen",
            feature_1_desc: "Automatische Kantenerkennung und Qualitätsverbesserung mit KI",
            feature_2_title: "Digitale Unterschriften",
            feature_2_desc: "Unterschreiben Sie Dokumente direkt mit Ihrem Finger",
            feature_3_title: "OCR-Technologie",
            feature_3_desc: "Text aus Bildern extrahieren und durchsuchbar machen",
            feature_4_title: "Cloud-Sync",
            feature_4_desc: "Greifen Sie von überall auf Ihre Dokumente zu",
            feature_5_title: "Passwortschutz",
            feature_5_desc: "Halten Sie sensible Dokumente sicher verschlüsselt",
            feature_6_title: "Mehrere Formate",
            feature_6_desc: "Export als PDF, JPG, PNG oder direkt teilen",
            
            // Web Dashboard
            web_dashboard_label: "Cloud-Zugang",
            web_dashboard_title: "Von überall zugreifen",
            web_dashboard_subtitle: "Verwalten Sie Ihre Dokumente von jedem Browser auf jedem Gerät",
            try_dashboard: "Dashboard testen",
            dashboard_note: "Anmeldung erforderlich",
            
            // How it works
            how_it_works_label: "Einfacher Prozess",
            how_it_works_title: "So funktioniert's",
            how_it_works_subtitle: "In 4 einfachen Schritten Dokumente scannen",
            step_1_title: "Herunterladen",
            step_1_desc: "Laden Sie die kostenlose App herunter",
            step_2_title: "Scannen",
            step_2_desc: "Richten Sie die Kamera auf ein Dokument",
            step_3_title: "Verbessern",
            step_3_desc: "Automatische Qualitätsverbesserung",
            step_4_title: "Teilen",
            step_4_desc: "Als PDF exportieren oder teilen",
            
            // Testimonials
            testimonials_label: "Bewertungen",
            testimonials_title: "Was Nutzer sagen",
            testimonials_subtitle: "Schließen Sie sich Millionen zufriedener Nutzer an",
            
            // Pricing
            pricing_label: "Preise",
            pricing_title: "Einfache Preise",
            pricing_subtitle: "Wählen Sie den passenden Plan",
            pricing_free: "Kostenlos",
            pricing_free_price: "0€",
            pricing_free_period: "für immer",
            pricing_premium: "Premium",
            pricing_premium_price: "4,99€",
            pricing_premium_period: "/Monat",
            pricing_lifetime: "Lebenslang",
            pricing_lifetime_price: "49,99€",
            pricing_lifetime_period: "einmalig",
            get_started: "Loslegen",
            current_plan: "Aktueller Plan",
            most_popular: "Beliebteste",
            best_value: "Bester Wert",
            
            // FAQ
            faq_label: "FAQ",
            faq_title: "Häufig gestellte Fragen",
            faq_subtitle: "Antworten auf häufige Fragen",
            more_questions: "Weitere Fragen?",
            contact_support: "Support kontaktieren",
            
            // Download
            download_label: "App holen",
            download_title: "Jetzt herunterladen",
            download_subtitle: "Kostenlos für iOS und Android",
            download_on: "Laden im",
            app_store: "App Store",
            get_it_on: "Jetzt bei",
            google_play: "Google Play",
            
            // Footer
            footer_copyright: "© 2024 ScanUp. Alle Rechte vorbehalten.",
            footer_description: "Die leistungsstärkste Dokumentenscanner-App für iOS und Android.",
            
            // Dashboard Auth
            auth_access_docs: "Greifen Sie überall auf Ihre Dokumente zu",
            auth_tab_login: "Anmelden",
            auth_tab_register: "Registrieren",
            auth_email: "E-Mail",
            auth_password: "Passwort",
            auth_full_name: "Vollständiger Name",
            auth_login_btn: "Anmelden",
            auth_register_btn: "Konto erstellen",
            auth_or_continue: "oder fortfahren mit",
            auth_continue_google: "Mit Google fortfahren",
            auth_continue_apple: "Mit Apple fortfahren",
            
            // Dashboard Sidebar
            sidebar_menu: "Menü",
            sidebar_my_documents: "Meine Dokumente",
            sidebar_profile: "Profil",
            sidebar_settings: "Einstellungen",
            sidebar_quick_actions: "Schnellaktionen",
            sidebar_get_mobile: "Mobile App holen",
            sidebar_help: "Hilfe & Support",
            sidebar_logout: "Abmelden",
            sidebar_free_plan: "Kostenloser Plan",
            sidebar_premium_plan: "Premium-Plan",
            
            // Dashboard Documents
            docs_title: "Meine Dokumente",
            docs_subtitle: "Alle gescannten Dokumente anzeigen und verwalten",
            docs_search_placeholder: "Dokumente suchen...",
            docs_stat_documents: "Dokumente",
            docs_stat_pages: "Seiten",
            docs_stat_storage: "Speicher",
            docs_stat_this_month: "Diesen Monat",
            docs_all_documents: "Alle Dokumente",
            docs_folders: "Ordner",
            docs_new_folder: "Neuer Ordner",
            docs_empty_title: "Noch keine Dokumente",
            docs_empty_desc: "Scannen Sie Ihr erstes Dokument mit der App",
            
            // Dashboard Profile
            profile_title: "Mein Profil",
            profile_subtitle: "Kontoeinstellungen verwalten",
            profile_account_info: "Kontoinformationen",
            profile_sign_out: "Abmelden",
            
            // Dashboard Settings
            settings_title: "Einstellungen",
            settings_subtitle: "Passen Sie Ihr Erlebnis an",
            settings_delete_all: "Alle Dokumente löschen",
            
            // Modals
            modal_close: "Schließen",
            modal_cancel: "Abbrechen",
            modal_create: "Ordner erstellen",
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
            features_title: "Fonctionnalités puissantes",
            how_it_works_title: "Comment ça marche",
            testimonials_title: "Ce que disent les utilisateurs",
            pricing_title: "Tarifs simples",
            pricing_free: "Gratuit",
            pricing_premium: "Premium",
            get_started: "Commencer",
            faq_title: "Questions fréquentes",
            download_title: "Télécharger maintenant",
            footer_copyright: "© 2024 ScanUp. Tous droits réservés.",
            
            // Dashboard
            auth_tab_login: "Connexion",
            auth_tab_register: "S'inscrire",
            auth_email: "E-mail",
            auth_password: "Mot de passe",
            auth_login_btn: "Se connecter",
            auth_register_btn: "Créer un compte",
            auth_or_continue: "ou continuer avec",
            sidebar_my_documents: "Mes documents",
            sidebar_profile: "Profil",
            sidebar_settings: "Paramètres",
            sidebar_logout: "Déconnexion",
            docs_title: "Mes documents",
            docs_search_placeholder: "Rechercher...",
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
            features_title: "Características potentes",
            how_it_works_title: "Cómo funciona",
            testimonials_title: "Lo que dicen los usuarios",
            pricing_title: "Precios simples",
            pricing_free: "Gratis",
            pricing_premium: "Premium",
            get_started: "Empezar",
            faq_title: "Preguntas frecuentes",
            download_title: "Descargar ahora",
            footer_copyright: "© 2024 ScanUp. Todos los derechos reservados.",
            
            // Dashboard
            auth_tab_login: "Iniciar sesión",
            auth_tab_register: "Registrarse",
            auth_email: "Correo electrónico",
            auth_password: "Contraseña",
            auth_login_btn: "Iniciar sesión",
            auth_register_btn: "Crear cuenta",
            sidebar_my_documents: "Mis documentos",
            sidebar_logout: "Cerrar sesión",
            docs_title: "Mis documentos",
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
            hero_description: "Превратите свой смартфон в мощный сканер документов.",
            download_free: "Скачать бесплатно",
            see_how_it_works: "Как это работает",
            phone_documents: "Документы",
            phone_folders: "Папки",
            features_title: "Мощные функции",
            pricing_title: "Простые цены",
            pricing_free: "Бесплатно",
            pricing_premium: "Премиум",
            download_title: "Скачать сейчас",
            footer_copyright: "© 2024 ScanUp. Все права защищены.",
            auth_tab_login: "Вход",
            auth_tab_register: "Регистрация",
            sidebar_my_documents: "Мои документы",
            sidebar_logout: "Выход",
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
            phone_documents: "Documenti",
            phone_folders: "Cartelle",
            features_title: "Funzionalità potenti",
            pricing_title: "Prezzi semplici",
            pricing_free: "Gratis",
            pricing_premium: "Premium",
            download_title: "Scarica ora",
            footer_copyright: "© 2024 ScanUp. Tutti i diritti riservati.",
            auth_tab_login: "Accedi",
            auth_tab_register: "Registrati",
            sidebar_my_documents: "I miei documenti",
            sidebar_logout: "Esci",
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
            phone_documents: "Documentos",
            phone_folders: "Pastas",
            features_title: "Recursos poderosos",
            pricing_title: "Preços simples",
            pricing_free: "Grátis",
            pricing_premium: "Premium",
            download_title: "Baixar agora",
            footer_copyright: "© 2024 ScanUp. Todos os direitos reservados.",
            auth_tab_login: "Entrar",
            auth_tab_register: "Cadastrar",
            sidebar_my_documents: "Meus documentos",
            sidebar_logout: "Sair",
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
            phone_documents: "المستندات",
            phone_folders: "المجلدات",
            features_title: "ميزات قوية",
            pricing_title: "أسعار بسيطة",
            pricing_free: "مجاني",
            pricing_premium: "مميز",
            download_title: "حمّل الآن",
            footer_copyright: "© 2024 ScanUp. جميع الحقوق محفوظة.",
            auth_tab_login: "تسجيل الدخول",
            auth_tab_register: "إنشاء حساب",
            sidebar_my_documents: "مستنداتي",
            sidebar_logout: "تسجيل الخروج",
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
            phone_documents: "文档",
            phone_folders: "文件夹",
            features_title: "强大功能",
            pricing_title: "简单定价",
            pricing_free: "免费",
            pricing_premium: "高级版",
            download_title: "立即下载",
            footer_copyright: "© 2024 ScanUp. 保留所有权利。",
            auth_tab_login: "登录",
            auth_tab_register: "注册",
            sidebar_my_documents: "我的文档",
            sidebar_logout: "退出登录",
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
            phone_documents: "ドキュメント",
            phone_folders: "フォルダ",
            features_title: "パワフルな機能",
            pricing_title: "シンプルな料金",
            pricing_free: "無料",
            pricing_premium: "プレミアム",
            download_title: "今すぐダウンロード",
            footer_copyright: "© 2024 ScanUp. All rights reserved.",
            auth_tab_login: "ログイン",
            auth_tab_register: "登録",
            sidebar_my_documents: "マイドキュメント",
            sidebar_logout: "ログアウト",
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
            phone_documents: "문서",
            phone_folders: "폴더",
            features_title: "강력한 기능",
            pricing_title: "간단한 가격",
            pricing_free: "무료",
            pricing_premium: "프리미엄",
            download_title: "지금 다운로드",
            footer_copyright: "© 2024 ScanUp. All rights reserved.",
            auth_tab_login: "로그인",
            auth_tab_register: "가입",
            sidebar_my_documents: "내 문서",
            sidebar_logout: "로그아웃",
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
            phone_documents: "Documenten",
            phone_folders: "Mappen",
            features_title: "Krachtige functies",
            pricing_title: "Eenvoudige prijzen",
            pricing_free: "Gratis",
            pricing_premium: "Premium",
            download_title: "Nu downloaden",
            footer_copyright: "© 2024 ScanUp. Alle rechten voorbehouden.",
            auth_tab_login: "Inloggen",
            auth_tab_register: "Registreren",
            sidebar_my_documents: "Mijn documenten",
            sidebar_logout: "Uitloggen",
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
            phone_documents: "Dokumenty",
            phone_folders: "Foldery",
            features_title: "Potężne funkcje",
            pricing_title: "Proste ceny",
            pricing_free: "Darmowy",
            pricing_premium: "Premium",
            download_title: "Pobierz teraz",
            footer_copyright: "© 2024 ScanUp. Wszelkie prawa zastrzeżone.",
            auth_tab_login: "Zaloguj",
            auth_tab_register: "Zarejestruj",
            sidebar_my_documents: "Moje dokumenty",
            sidebar_logout: "Wyloguj",
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
            phone_documents: "दस्तावेज़",
            phone_folders: "फ़ोल्डर",
            features_title: "शक्तिशाली विशेषताएं",
            pricing_title: "सरल मूल्य",
            pricing_free: "मुफ्त",
            pricing_premium: "प्रीमियम",
            download_title: "अभी डाउनलोड करें",
            footer_copyright: "© 2024 ScanUp. सर्वाधिकार सुरक्षित।",
            auth_tab_login: "लॉगिन",
            auth_tab_register: "पंजीकरण",
            sidebar_my_documents: "मेरे दस्तावेज़",
            sidebar_logout: "लॉगआउट",
        },
    },
    
    async init(apiBase = '') {
        this.API_BASE = apiBase;
        this.currentLang = this.detectLanguage();
        this.translations = this.websiteTranslations[this.currentLang] || this.websiteTranslations['en'];
        this.applyTranslations();
        this.createLanguageSelector();
        this.updatePageTitle();
        return this;
    },
    
    detectLanguage() {
        // 1. Check URL path first (highest priority)
        const path = window.location.pathname;
        const match = path.match(/^\/([a-z]{2})(\/|$)/);
        if (match && this.languages.find(l => l.code === match[1])) {
            localStorage.setItem('scanup_language', match[1]);
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
    
    updatePageTitle() {
        const isDashboard = window.location.pathname.includes('dashboard');
        if (isDashboard) {
            document.title = `${this.t('docs_title')} - ScanUp`;
        }
    },
    
    applyTranslations() {
        const t = this.t.bind(this);
        const isDashboard = window.location.pathname.includes('dashboard');
        
        // Update HTML lang and dir
        document.documentElement.lang = this.currentLang;
        const isRTL = this.languages.find(l => l.code === this.currentLang)?.rtl;
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        
        if (isDashboard) {
            this.applyDashboardTranslations();
        } else {
            this.applyLandingPageTranslations();
        }
    },
    
    applyLandingPageTranslations() {
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
        
        // Floating cards
        const floatingCards = document.querySelectorAll('.floating-card span');
        if (floatingCards[0]) floatingCards[0].textContent = t('phone_scan_complete');
        if (floatingCards[1]) floatingCards[1].textContent = t('phone_encrypted');
        
        // Bottom nav
        const bottomNav = document.querySelectorAll('.tabbar-item span');
        const navKeys = ['phone_home', 'phone_folders', 'phone_search', 'phone_settings'];
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
        
        // Feature cards
        const featureCards = document.querySelectorAll('.feature-card');
        const featureKeys = [
            ['feature_1_title', 'feature_1_desc'],
            ['feature_2_title', 'feature_2_desc'],
            ['feature_3_title', 'feature_3_desc'],
            ['feature_4_title', 'feature_4_desc'],
            ['feature_5_title', 'feature_5_desc'],
            ['feature_6_title', 'feature_6_desc'],
        ];
        featureCards.forEach((card, i) => {
            if (featureKeys[i]) {
                const title = card.querySelector('h3');
                const desc = card.querySelector('p');
                if (title) title.textContent = t(featureKeys[i][0]);
                if (desc) desc.textContent = t(featureKeys[i][1]);
            }
        });
        
        // Steps
        const steps = document.querySelectorAll('.step');
        const stepKeys = [
            ['step_1_title', 'step_1_desc'],
            ['step_2_title', 'step_2_desc'],
            ['step_3_title', 'step_3_desc'],
            ['step_4_title', 'step_4_desc'],
        ];
        steps.forEach((step, i) => {
            if (stepKeys[i]) {
                const title = step.querySelector('h3');
                const desc = step.querySelector('p');
                if (title) title.textContent = t(stepKeys[i][0]);
                if (desc) desc.textContent = t(stepKeys[i][1]);
            }
        });
        
        // Web Dashboard features
        const dashFeatures = document.querySelectorAll('.dashboard-feature');
        const dashFeatureKeys = [
            ['web_dashboard_feature_1_title', 'web_dashboard_feature_1_desc'],
            ['web_dashboard_feature_2_title', 'web_dashboard_feature_2_desc'],
            ['web_dashboard_feature_3_title', 'web_dashboard_feature_3_desc'],
            ['web_dashboard_feature_4_title', 'web_dashboard_feature_4_desc'],
        ];
        dashFeatures.forEach((feat, i) => {
            if (dashFeatureKeys[i]) {
                const title = feat.querySelector('h4');
                const desc = feat.querySelector('p');
                if (title) title.textContent = t(dashFeatureKeys[i][0]);
                if (desc) desc.textContent = t(dashFeatureKeys[i][1]);
            }
        });
        
        // Try Dashboard button
        const tryDashboardBtn = document.querySelector('.dashboard-cta .btn-primary');
        if (tryDashboardBtn) {
            tryDashboardBtn.innerHTML = `<i class="fas fa-external-link-alt"></i> ${t('try_dashboard')}`;
        }
        
        // Dashboard note
        const dashNote = document.querySelector('.dashboard-cta-note');
        if (dashNote) dashNote.textContent = t('dashboard_note');
        
        // Pricing cards
        const pricingCards = document.querySelectorAll('.pricing-card');
        pricingCards.forEach((card, i) => {
            const title = card.querySelector('h3');
            const priceEl = card.querySelector('.price');
            if (i === 0) {
                if (title) title.textContent = t('pricing_free');
                if (priceEl) priceEl.innerHTML = `${t('pricing_free_price')}<span>/${t('pricing_free_period')}</span>`;
            } else if (i === 1) {
                if (title) title.textContent = t('pricing_premium');
                if (priceEl) priceEl.innerHTML = `${t('pricing_premium_price')}<span>${t('pricing_premium_period')}</span>`;
            } else if (i === 2) {
                if (title) title.textContent = t('pricing_lifetime');
                if (priceEl) priceEl.innerHTML = `${t('pricing_lifetime_price')}<span>/${t('pricing_lifetime_period')}</span>`;
            }
            const btn = card.querySelector('.btn');
            if (btn) btn.textContent = t('get_started');
        });
        
        // FAQ items
        const faqItems = document.querySelectorAll('.faq-item');
        const faqKeys = [
            ['faq_q1', 'faq_a1'],
            ['faq_q2', 'faq_a2'],
            ['faq_q3', 'faq_a3'],
            ['faq_q4', 'faq_a4'],
            ['faq_q5', 'faq_a5'],
            ['faq_q6', 'faq_a6'],
        ];
        faqItems.forEach((item, i) => {
            if (faqKeys[i]) {
                const q = item.querySelector('.faq-question span, .faq-question');
                const a = item.querySelector('.faq-answer');
                if (q) {
                    const icon = q.querySelector('i');
                    if (icon) {
                        q.innerHTML = '';
                        q.appendChild(icon);
                        q.appendChild(document.createTextNode(' ' + t(faqKeys[i][0])));
                    } else {
                        q.textContent = t(faqKeys[i][0]);
                    }
                }
                if (a) a.textContent = t(faqKeys[i][1]);
            }
        });
        
        // Footer
        const footerCopyright = document.querySelector('.footer-bottom p');
        if (footerCopyright) footerCopyright.textContent = t('footer_copyright');
        
        const footerDesc = document.querySelector('.footer-brand p');
        if (footerDesc) footerDesc.textContent = t('footer_description');
    },
    
    applyDashboardTranslations() {
        const t = this.t.bind(this);
        
        // Auth modal
        const authHeader = document.querySelector('.auth-header h2');
        if (authHeader) authHeader.textContent = t('auth_access_docs');
        
        const authTabs = document.querySelectorAll('.auth-tab');
        if (authTabs[0]) authTabs[0].textContent = t('auth_tab_login');
        if (authTabs[1]) authTabs[1].textContent = t('auth_tab_register');
        
        // Login form
        const loginEmailLabel = document.querySelector('#loginForm .form-group:nth-child(1) label');
        if (loginEmailLabel) loginEmailLabel.textContent = t('auth_email');
        const loginEmail = document.querySelector('#loginEmail');
        if (loginEmail) loginEmail.placeholder = t('auth_email_placeholder');
        
        const loginPasswordLabel = document.querySelector('#loginForm .form-group:nth-child(2) label');
        if (loginPasswordLabel) loginPasswordLabel.textContent = t('auth_password');
        const loginPassword = document.querySelector('#loginPassword');
        if (loginPassword) loginPassword.placeholder = t('auth_password_placeholder');
        
        const loginBtn = document.querySelector('#loginBtn span');
        if (loginBtn) loginBtn.textContent = t('auth_login_btn');
        
        // Register form
        const registerNameLabel = document.querySelector('#registerForm .form-group:nth-child(1) label');
        if (registerNameLabel) registerNameLabel.textContent = t('auth_full_name');
        const registerName = document.querySelector('#registerName');
        if (registerName) registerName.placeholder = t('auth_name_placeholder');
        
        const registerEmailLabel = document.querySelector('#registerForm .form-group:nth-child(2) label');
        if (registerEmailLabel) registerEmailLabel.textContent = t('auth_email');
        const registerEmail = document.querySelector('#registerEmail');
        if (registerEmail) registerEmail.placeholder = t('auth_email_placeholder');
        
        const registerPasswordLabel = document.querySelector('#registerForm .form-group:nth-child(3) label');
        if (registerPasswordLabel) registerPasswordLabel.textContent = t('auth_password');
        const registerPassword = document.querySelector('#registerPassword');
        if (registerPassword) registerPassword.placeholder = t('auth_password_min');
        
        const registerBtn = document.querySelector('#registerBtn span');
        if (registerBtn) registerBtn.textContent = t('auth_register_btn');
        
        // Auth divider
        const divider = document.querySelector('.divider');
        if (divider) {
            divider.childNodes.forEach(node => {
                if (node.nodeType === 3) node.textContent = t('auth_or_continue');
            });
        }
        
        // Social buttons
        const appleBtn = document.querySelector('.btn-apple span');
        if (appleBtn) appleBtn.textContent = t('auth_continue_apple');
        
        // Sidebar
        const sidebarNav = document.querySelectorAll('.nav-section-title');
        if (sidebarNav[0]) sidebarNav[0].textContent = t('sidebar_menu');
        if (sidebarNav[1]) sidebarNav[1].textContent = t('sidebar_quick_actions');
        
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item span');
        const navKeys = ['sidebar_my_documents', 'sidebar_profile', 'sidebar_settings', 'sidebar_get_mobile', 'sidebar_help'];
        navItems.forEach((span, i) => {
            if (navKeys[i] && !span.classList.contains('badge')) {
                span.textContent = t(navKeys[i]);
            }
        });
        
        // Logout button
        const logoutBtn = document.querySelector('.sidebar-footer .nav-item span');
        if (logoutBtn) logoutBtn.textContent = t('sidebar_logout');
        
        // Documents page
        const docsTitle = document.querySelector('#documentsPage .page-header h1');
        if (docsTitle) docsTitle.textContent = t('docs_title');
        
        const docsSubtitle = document.querySelector('#documentsPage .page-header p');
        if (docsSubtitle) docsSubtitle.textContent = t('docs_subtitle');
        
        const searchInput = document.querySelector('#searchInput');
        if (searchInput) searchInput.placeholder = t('docs_search_placeholder');
        
        // Stats
        const statLabels = document.querySelectorAll('.stat-card .stat-info p');
        const statKeys = ['docs_stat_documents', 'docs_stat_pages', 'docs_stat_storage', 'docs_stat_this_month'];
        statLabels.forEach((label, i) => {
            if (statKeys[i]) label.textContent = t(statKeys[i]);
        });
        
        // Folders section
        const foldersTitle = document.querySelector('#foldersSection .section-header h2');
        if (foldersTitle) {
            foldersTitle.innerHTML = `<i class="fas fa-folder" style="color: var(--warning); margin-right: 0.5rem;"></i> ${t('docs_folders')}`;
        }
        
        const newFolderBtn = document.querySelector('.btn-create-folder');
        if (newFolderBtn) {
            newFolderBtn.innerHTML = `<i class="fas fa-plus"></i> ${t('docs_new_folder')}`;
        }
        
        // All documents title
        const allDocsTitle = document.querySelector('#documentsSectionTitle');
        if (allDocsTitle) allDocsTitle.textContent = t('docs_all_documents');
        
        // Sort options
        const sortSelect = document.querySelector('#sortSelect');
        if (sortSelect) {
            const options = sortSelect.querySelectorAll('option');
            const sortKeys = ['docs_sort_newest', 'docs_sort_oldest', 'docs_sort_name_asc', 'docs_sort_name_desc'];
            options.forEach((opt, i) => {
                if (sortKeys[i]) opt.textContent = t(sortKeys[i]);
            });
        }
        
        // Empty state
        const emptyTitle = document.querySelector('.empty-state h3');
        if (emptyTitle) emptyTitle.textContent = t('docs_empty_title');
        const emptyDesc = document.querySelector('.empty-state p');
        if (emptyDesc) emptyDesc.textContent = t('docs_empty_desc');
        
        // Profile page
        const profileTitle = document.querySelector('#profilePage .page-header h1');
        if (profileTitle) profileTitle.textContent = t('profile_title');
        const profileSubtitle = document.querySelector('#profilePage .page-header p');
        if (profileSubtitle) profileSubtitle.textContent = t('profile_subtitle');
        
        // Profile cards
        const profileCards = document.querySelectorAll('.profile-card h3');
        const profileCardKeys = ['profile_account_info', 'profile_premium_plan', 'profile_usage_stats', 'profile_security'];
        profileCards.forEach((card, i) => {
            if (profileCardKeys[i]) {
                const icon = card.querySelector('i');
                if (icon) {
                    card.innerHTML = '';
                    card.appendChild(icon);
                    card.appendChild(document.createTextNode(' ' + t(profileCardKeys[i])));
                }
            }
        });
        
        // Profile fields
        document.querySelectorAll('.profile-field label').forEach(label => {
            const text = label.textContent.trim();
            const keyMap = {
                'Full Name': 'profile_full_name',
                'Email Address': 'profile_email',
                'Member Since': 'profile_member_since',
                'Current Plan': 'profile_current_plan',
                'Features': 'profile_features',
                'Documents Created': 'profile_docs_created',
                'Total Pages Scanned': 'profile_pages_scanned',
                'Storage Used': 'profile_storage_used',
                'Login Method': 'profile_login_method',
                'Last Login': 'profile_last_login',
            };
            if (keyMap[text]) label.textContent = t(keyMap[text]);
        });
        
        // Upgrade button
        const upgradeBtn = document.querySelector('#upgradeBtn');
        if (upgradeBtn) {
            upgradeBtn.innerHTML = `<i class="fas fa-arrow-up"></i> ${t('profile_upgrade')}`;
        }
        
        // Sign out button in profile
        const signOutBtn = document.querySelector('#profilePage .btn-secondary');
        if (signOutBtn) {
            signOutBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> ${t('profile_sign_out')}`;
        }
        
        // Settings page
        const settingsTitle = document.querySelector('#settingsPage .page-header h1');
        if (settingsTitle) settingsTitle.textContent = t('settings_title');
        const settingsSubtitle = document.querySelector('#settingsPage .page-header p');
        if (settingsSubtitle) settingsSubtitle.textContent = t('settings_subtitle');
        
        // Delete all button
        const deleteAllBtn = document.querySelector('#settingsPage .btn[style*="danger"]');
        if (deleteAllBtn) {
            deleteAllBtn.innerHTML = `<i class="fas fa-trash"></i> ${t('settings_delete_all')}`;
        }
        
        // Modals
        const createFolderTitle = document.querySelector('#createFolderModal .modal-header h3');
        if (createFolderTitle) {
            createFolderTitle.innerHTML = `<i class="fas fa-folder-plus" style="color: var(--warning); margin-right: 0.5rem;"></i> ${t('modal_create_folder')}`;
        }
        
        const folderNameLabel = document.querySelector('#createFolderModal .form-group:nth-child(1) label');
        if (folderNameLabel) folderNameLabel.textContent = t('modal_folder_name');
        
        const folderNameInput = document.querySelector('#newFolderName');
        if (folderNameInput) folderNameInput.placeholder = t('modal_folder_placeholder');
        
        const colorLabel = document.querySelector('#createFolderModal .form-group:nth-child(2) label');
        if (colorLabel) colorLabel.textContent = t('modal_color');
        
        const cancelBtns = document.querySelectorAll('.modal-footer .btn-secondary');
        cancelBtns.forEach(btn => btn.textContent = t('modal_cancel'));
        
        const createFolderSubmit = document.querySelector('#createFolderModal .modal-footer .btn-primary');
        if (createFolderSubmit) {
            createFolderSubmit.innerHTML = `<i class="fas fa-plus"></i> ${t('modal_create')}`;
        }
        
        // Document modal
        const docModalClose = document.querySelector('#documentModal .modal-footer .btn-secondary');
        if (docModalClose) docModalClose.textContent = t('modal_close');
        
        const docModalDownload = document.querySelector('#documentModal .modal-footer .btn-primary');
        if (docModalDownload) {
            docModalDownload.innerHTML = `<i class="fas fa-download"></i> ${t('modal_download_pdf')}`;
        }
        
        const prevBtn = document.querySelector('#prevPageBtn');
        if (prevBtn) prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i> ${t('modal_previous')}`;
        
        const nextBtn = document.querySelector('#nextPageBtn');
        if (nextBtn) nextBtn.innerHTML = `${t('modal_next')} <i class="fas fa-chevron-right"></i>`;
    },
    
    createLanguageSelector() {
        // Remove old selector if exists
        const oldSelector = document.querySelector('.language-selector-wrapper');
        if (oldSelector) oldSelector.remove();
        
        const isDashboard = window.location.pathname.includes('dashboard');
        
        // Create new selector with flags
        const wrapper = document.createElement('div');
        wrapper.className = 'language-selector-wrapper';
        wrapper.style.cssText = isDashboard 
            ? 'position: fixed; top: 1rem; right: 1rem; z-index: 1000;'
            : 'margin-right: 1rem; position: relative;';
        
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
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
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
        
        if (isDashboard) {
            document.body.appendChild(wrapper);
        } else {
            // Add to navbar before auth buttons
            const authButtons = document.getElementById('authButtons');
            if (authButtons && authButtons.parentNode) {
                authButtons.parentNode.insertBefore(wrapper, authButtons);
            }
        }
        
        // Add change listener
        select.addEventListener('change', (e) => this.setLanguage(e.target.value));
    },
    
    async setLanguage(langCode) {
        this.currentLang = langCode;
        localStorage.setItem('scanup_language', langCode);
        this.translations = this.websiteTranslations[langCode] || this.websiteTranslations['en'];
        
        // Determine base path
        const path = window.location.pathname;
        const isDashboard = path.includes('dashboard');
        
        // Update URL
        let newPath;
        if (isDashboard) {
            newPath = langCode === 'en' ? '/dashboard' : `/${langCode}/dashboard`;
        } else {
            // Remove existing language prefix
            const cleanPath = path.replace(/^\/[a-z]{2}(\/|$)/, '/');
            newPath = langCode === 'en' ? (cleanPath || '/') : `/${langCode}${cleanPath === '/' ? '' : cleanPath}`;
        }
        
        // Navigate to new URL to ensure server routing works
        window.location.href = newPath;
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => ScanUpI18n.init());

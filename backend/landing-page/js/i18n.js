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
    
    // Base URL for SEO (production domain)
    BASE_URL: 'https://scanup.app',
    
    // SEO metadata per language
    seoData: {
        en: {
            page_title: 'ScanUp - Best Free Document Scanner App for iPhone & Android | PDF Scanner',
            meta_description: 'ScanUp is the #1 free document scanner app. Scan documents to PDF, sign digitally, OCR text recognition, and share instantly. Download for iOS & Android. No watermarks, unlimited scans.',
            og_title: 'ScanUp - Best Free Document Scanner App for iPhone & Android',
            og_description: 'Transform your phone into a powerful document scanner. Scan, sign, OCR, and share documents instantly. Free for iOS & Android.',
            schema_app_name: 'ScanUp - Document Scanner',
            schema_app_description: 'ScanUp is the ultimate free document scanner app. Scan documents to PDF, add digital signatures, OCR text recognition, and share instantly. Available on iOS and Android with no watermarks and unlimited scans.',
            schema_org_description: 'ScanUp is a mobile document scanner application for iOS and Android',
            faq_q1: 'Is ScanUp free to use?',
            faq_a1: 'Yes! ScanUp offers a free version with unlimited scans and no watermarks. Premium features like OCR text recognition, cloud sync, and digital signatures are available with a subscription.',
            faq_q2: 'What file formats does ScanUp support?',
            faq_a2: 'ScanUp supports PDF and JPEG formats. You can export your scanned documents as multi-page PDFs or individual JPEG images.',
            faq_q3: 'Can I scan multiple pages into one document?',
            faq_a3: 'Absolutely! ScanUp allows you to scan multiple pages and combine them into a single PDF document. You can reorder, delete, or add pages at any time.',
            faq_q4: 'Does ScanUp work offline?',
            faq_a4: 'Yes, ScanUp works completely offline. You can scan, edit, and organize documents without an internet connection. Cloud sync is available when you\'re online.',
        },
        tr: {
            page_title: 'ScanUp - iPhone ve Android için En İyi Ücretsiz Belge Tarayıcı | PDF Tarayıcı',
            meta_description: 'ScanUp, 1 numaralı ücretsiz belge tarayıcı uygulamasıdır. Belgeleri PDF\'e tarayın, dijital olarak imzalayın, OCR metin tanıma ve anında paylaşın. iOS ve Android için indirin. Filigran yok, sınırsız tarama.',
            og_title: 'ScanUp - iPhone ve Android için En İyi Ücretsiz Belge Tarayıcı',
            og_description: 'Telefonunuzu güçlü bir belge tarayıcıya dönüştürün. Belgeleri anında tarayın, imzalayın ve paylaşın. iOS ve Android için ücretsiz.',
            schema_app_name: 'ScanUp - Belge Tarayıcı',
            schema_app_description: 'ScanUp, en iyi ücretsiz belge tarayıcı uygulamasıdır. Belgeleri PDF\'e tarayın, dijital imza ekleyin, OCR metin tanıma ve anında paylaşın. iOS ve Android\'de filigran olmadan ve sınırsız tarama ile kullanılabilir.',
            schema_org_description: 'ScanUp, iOS ve Android için mobil belge tarayıcı uygulamasıdır',
            faq_q1: 'ScanUp ücretsiz mi?',
            faq_a1: 'Evet! ScanUp sınırsız tarama ve filigran olmadan ücretsiz bir sürüm sunar. OCR metin tanıma, bulut senkronizasyonu ve dijital imzalar gibi premium özellikler abonelik ile kullanılabilir.',
            faq_q2: 'ScanUp hangi dosya formatlarını destekler?',
            faq_a2: 'ScanUp PDF ve JPEG formatlarını destekler. Taranan belgelerinizi çok sayfalı PDF\'ler veya tek tek JPEG görüntüleri olarak dışa aktarabilirsiniz.',
            faq_q3: 'Birden fazla sayfayı tek bir belgede tarayabilir miyim?',
            faq_a3: 'Kesinlikle! ScanUp, birden fazla sayfayı taramanıza ve bunları tek bir PDF belgesinde birleştirmenize olanak tanır. Sayfaları istediğiniz zaman yeniden sıralayabilir, silebilir veya ekleyebilirsiniz.',
            faq_q4: 'ScanUp çevrimdışı çalışır mı?',
            faq_a4: 'Evet, ScanUp tamamen çevrimdışı çalışır. İnternet bağlantısı olmadan belgeleri tarayabilir, düzenleyebilir ve organize edebilirsiniz. Çevrimiçi olduğunuzda bulut senkronizasyonu kullanılabilir.',
        },
        de: {
            page_title: 'ScanUp - Beste kostenlose Dokumentenscanner-App für iPhone & Android | PDF Scanner',
            meta_description: 'ScanUp ist die #1 kostenlose Dokumentenscanner-App. Scannen Sie Dokumente zu PDF, unterschreiben Sie digital, OCR-Texterkennung und teilen Sie sofort. Für iOS & Android herunterladen. Kein Wasserzeichen, unbegrenzte Scans.',
            og_title: 'ScanUp - Beste kostenlose Dokumentenscanner-App für iPhone & Android',
            og_description: 'Verwandeln Sie Ihr Telefon in einen leistungsstarken Dokumentenscanner. Scannen, unterschreiben, OCR und Dokumente sofort teilen. Kostenlos für iOS & Android.',
            schema_app_name: 'ScanUp - Dokumentenscanner',
            schema_app_description: 'ScanUp ist die ultimative kostenlose Dokumentenscanner-App. Scannen Sie Dokumente zu PDF, fügen Sie digitale Unterschriften hinzu, OCR-Texterkennung und teilen Sie sofort. Verfügbar auf iOS und Android ohne Wasserzeichen und unbegrenzte Scans.',
            schema_org_description: 'ScanUp ist eine mobile Dokumentenscanner-Anwendung für iOS und Android',
            faq_q1: 'Ist ScanUp kostenlos?',
            faq_a1: 'Ja! ScanUp bietet eine kostenlose Version mit unbegrenzten Scans und ohne Wasserzeichen. Premium-Funktionen wie OCR-Texterkennung, Cloud-Sync und digitale Unterschriften sind mit einem Abonnement verfügbar.',
            faq_q2: 'Welche Dateiformate unterstützt ScanUp?',
            faq_a2: 'ScanUp unterstützt PDF- und JPEG-Formate. Sie können Ihre gescannten Dokumente als mehrseitige PDFs oder einzelne JPEG-Bilder exportieren.',
            faq_q3: 'Kann ich mehrere Seiten in ein Dokument scannen?',
            faq_a3: 'Absolut! ScanUp ermöglicht es Ihnen, mehrere Seiten zu scannen und in einem einzigen PDF-Dokument zu kombinieren. Sie können Seiten jederzeit neu anordnen, löschen oder hinzufügen.',
            faq_q4: 'Funktioniert ScanUp offline?',
            faq_a4: 'Ja, ScanUp funktioniert komplett offline. Sie können Dokumente ohne Internetverbindung scannen, bearbeiten und organisieren. Cloud-Sync ist verfügbar, wenn Sie online sind.',
        },
        fr: {
            page_title: 'ScanUp - Meilleure application gratuite de scanner de documents pour iPhone & Android | Scanner PDF',
            meta_description: 'ScanUp est l\'application de scanner de documents gratuite n°1. Numérisez des documents en PDF, signez numériquement, reconnaissance OCR et partagez instantanément. Téléchargez pour iOS & Android. Sans filigrane, scans illimités.',
            og_title: 'ScanUp - Meilleure application gratuite de scanner de documents pour iPhone & Android',
            og_description: 'Transformez votre téléphone en un puissant scanner de documents. Numérisez, signez, OCR et partagez des documents instantanément. Gratuit pour iOS & Android.',
            schema_app_name: 'ScanUp - Scanner de Documents',
            schema_app_description: 'ScanUp est l\'application ultime de scanner de documents gratuite. Numérisez des documents en PDF, ajoutez des signatures numériques, reconnaissance OCR et partagez instantanément. Disponible sur iOS et Android sans filigrane et scans illimités.',
            schema_org_description: 'ScanUp est une application mobile de scanner de documents pour iOS et Android',
            faq_q1: 'ScanUp est-il gratuit ?',
            faq_a1: 'Oui ! ScanUp offre une version gratuite avec des scans illimités et sans filigrane. Les fonctionnalités premium comme la reconnaissance OCR, la synchronisation cloud et les signatures numériques sont disponibles avec un abonnement.',
            faq_q2: 'Quels formats de fichiers ScanUp prend-il en charge ?',
            faq_a2: 'ScanUp prend en charge les formats PDF et JPEG. Vous pouvez exporter vos documents numérisés en PDF multi-pages ou en images JPEG individuelles.',
            faq_q3: 'Puis-je numériser plusieurs pages dans un seul document ?',
            faq_a3: 'Absolument ! ScanUp vous permet de numériser plusieurs pages et de les combiner en un seul document PDF. Vous pouvez réorganiser, supprimer ou ajouter des pages à tout moment.',
            faq_q4: 'ScanUp fonctionne-t-il hors ligne ?',
            faq_a4: 'Oui, ScanUp fonctionne entièrement hors ligne. Vous pouvez numériser, modifier et organiser des documents sans connexion Internet. La synchronisation cloud est disponible lorsque vous êtes en ligne.',
        },
        es: {
            page_title: 'ScanUp - La mejor aplicación gratuita de escáner de documentos para iPhone y Android | Escáner PDF',
            meta_description: 'ScanUp es la aplicación de escáner de documentos gratuita n°1. Escanea documentos a PDF, firma digitalmente, reconocimiento OCR y comparte al instante. Descarga para iOS y Android. Sin marcas de agua, escaneos ilimitados.',
            og_title: 'ScanUp - La mejor aplicación gratuita de escáner de documentos para iPhone y Android',
            og_description: 'Transforma tu teléfono en un potente escáner de documentos. Escanea, firma, OCR y comparte documentos al instante. Gratis para iOS y Android.',
            schema_app_name: 'ScanUp - Escáner de Documentos',
            schema_app_description: 'ScanUp es la mejor aplicación gratuita de escáner de documentos. Escanea documentos a PDF, añade firmas digitales, reconocimiento OCR y comparte al instante. Disponible en iOS y Android sin marcas de agua y escaneos ilimitados.',
            schema_org_description: 'ScanUp es una aplicación móvil de escáner de documentos para iOS y Android',
            faq_q1: '¿ScanUp es gratis?',
            faq_a1: '¡Sí! ScanUp ofrece una versión gratuita con escaneos ilimitados y sin marcas de agua. Las funciones premium como el reconocimiento OCR, la sincronización en la nube y las firmas digitales están disponibles con una suscripción.',
            faq_q2: '¿Qué formatos de archivo admite ScanUp?',
            faq_a2: 'ScanUp admite formatos PDF y JPEG. Puedes exportar tus documentos escaneados como PDFs de varias páginas o imágenes JPEG individuales.',
            faq_q3: '¿Puedo escanear varias páginas en un solo documento?',
            faq_a3: '¡Absolutamente! ScanUp te permite escanear varias páginas y combinarlas en un solo documento PDF. Puedes reordenar, eliminar o añadir páginas en cualquier momento.',
            faq_q4: '¿ScanUp funciona sin conexión?',
            faq_a4: 'Sí, ScanUp funciona completamente sin conexión. Puedes escanear, editar y organizar documentos sin conexión a Internet. La sincronización en la nube está disponible cuando estás conectado.',
        },
        ru: {
            page_title: 'ScanUp - Лучшее бесплатное приложение для сканирования документов для iPhone и Android | PDF сканер',
            meta_description: 'ScanUp - это бесплатное приложение для сканирования документов №1. Сканируйте документы в PDF, подписывайте цифровой подписью, распознавание текста OCR и мгновенно делитесь. Скачать для iOS и Android. Без водяных знаков, неограниченное сканирование.',
            og_title: 'ScanUp - Лучшее бесплатное приложение для сканирования документов для iPhone и Android',
            og_description: 'Превратите свой телефон в мощный сканер документов. Сканируйте, подписывайте, OCR и делитесь документами мгновенно. Бесплатно для iOS и Android.',
            schema_app_name: 'ScanUp - Сканер документов',
            schema_app_description: 'ScanUp - лучшее бесплатное приложение для сканирования документов. Сканируйте документы в PDF, добавляйте цифровые подписи, распознавание текста OCR и мгновенно делитесь. Доступно на iOS и Android без водяных знаков и неограниченное сканирование.',
            schema_org_description: 'ScanUp - мобильное приложение для сканирования документов для iOS и Android',
            faq_q1: 'ScanUp бесплатен?',
            faq_a1: 'Да! ScanUp предлагает бесплатную версию с неограниченным сканированием и без водяных знаков. Премиум-функции, такие как распознавание текста OCR, облачная синхронизация и цифровые подписи, доступны по подписке.',
            faq_q2: 'Какие форматы файлов поддерживает ScanUp?',
            faq_a2: 'ScanUp поддерживает форматы PDF и JPEG. Вы можете экспортировать отсканированные документы как многостраничные PDF или отдельные изображения JPEG.',
            faq_q3: 'Могу ли я сканировать несколько страниц в один документ?',
            faq_a3: 'Абсолютно! ScanUp позволяет сканировать несколько страниц и объединять их в один PDF-документ. Вы можете изменять порядок, удалять или добавлять страницы в любое время.',
            faq_q4: 'Работает ли ScanUp офлайн?',
            faq_a4: 'Да, ScanUp работает полностью офлайн. Вы можете сканировать, редактировать и организовывать документы без подключения к Интернету. Облачная синхронизация доступна при подключении к сети.',
        },
        it: {
            page_title: 'ScanUp - La migliore app gratuita per scanner di documenti per iPhone e Android | Scanner PDF',
            meta_description: 'ScanUp è l\'app gratuita per scanner di documenti n°1. Scansiona documenti in PDF, firma digitalmente, riconoscimento OCR e condividi istantaneamente. Scarica per iOS e Android. Senza filigrana, scansioni illimitate.',
            og_title: 'ScanUp - La migliore app gratuita per scanner di documenti per iPhone e Android',
            og_description: 'Trasforma il tuo telefono in un potente scanner di documenti. Scansiona, firma, OCR e condividi documenti istantaneamente. Gratuito per iOS e Android.',
            schema_app_name: 'ScanUp - Scanner di Documenti',
            schema_app_description: 'ScanUp è la migliore app gratuita per scanner di documenti. Scansiona documenti in PDF, aggiungi firme digitali, riconoscimento OCR e condividi istantaneamente. Disponibile su iOS e Android senza filigrana e scansioni illimitate.',
            schema_org_description: 'ScanUp è un\'applicazione mobile per scanner di documenti per iOS e Android',
            faq_q1: 'ScanUp è gratuito?',
            faq_a1: 'Sì! ScanUp offre una versione gratuita con scansioni illimitate e senza filigrana. Le funzionalità premium come il riconoscimento OCR, la sincronizzazione cloud e le firme digitali sono disponibili con un abbonamento.',
            faq_q2: 'Quali formati di file supporta ScanUp?',
            faq_a2: 'ScanUp supporta i formati PDF e JPEG. Puoi esportare i tuoi documenti scansionati come PDF multipagina o immagini JPEG singole.',
            faq_q3: 'Posso scansionare più pagine in un unico documento?',
            faq_a3: 'Assolutamente! ScanUp ti permette di scansionare più pagine e combinarle in un unico documento PDF. Puoi riordinare, eliminare o aggiungere pagine in qualsiasi momento.',
            faq_q4: 'ScanUp funziona offline?',
            faq_a4: 'Sì, ScanUp funziona completamente offline. Puoi scansionare, modificare e organizzare documenti senza connessione Internet. La sincronizzazione cloud è disponibile quando sei online.',
        },
        pt: {
            page_title: 'ScanUp - Melhor aplicativo gratuito de scanner de documentos para iPhone e Android | Scanner PDF',
            meta_description: 'ScanUp é o aplicativo gratuito de scanner de documentos n°1. Digitalize documentos para PDF, assine digitalmente, reconhecimento OCR e compartilhe instantaneamente. Baixe para iOS e Android. Sem marca d\'água, digitalizações ilimitadas.',
            og_title: 'ScanUp - Melhor aplicativo gratuito de scanner de documentos para iPhone e Android',
            og_description: 'Transforme seu telefone em um poderoso scanner de documentos. Digitalize, assine, OCR e compartilhe documentos instantaneamente. Gratuito para iOS e Android.',
            schema_app_name: 'ScanUp - Scanner de Documentos',
            schema_app_description: 'ScanUp é o melhor aplicativo gratuito de scanner de documentos. Digitalize documentos para PDF, adicione assinaturas digitais, reconhecimento OCR e compartilhe instantaneamente. Disponível no iOS e Android sem marca d\'água e digitalizações ilimitadas.',
            schema_org_description: 'ScanUp é um aplicativo móvel de scanner de documentos para iOS e Android',
            faq_q1: 'O ScanUp é gratuito?',
            faq_a1: 'Sim! O ScanUp oferece uma versão gratuita com digitalizações ilimitadas e sem marca d\'água. Recursos premium como reconhecimento OCR, sincronização na nuvem e assinaturas digitais estão disponíveis com uma assinatura.',
            faq_q2: 'Quais formatos de arquivo o ScanUp suporta?',
            faq_a2: 'O ScanUp suporta formatos PDF e JPEG. Você pode exportar seus documentos digitalizados como PDFs de várias páginas ou imagens JPEG individuais.',
            faq_q3: 'Posso digitalizar várias páginas em um único documento?',
            faq_a3: 'Absolutamente! O ScanUp permite digitalizar várias páginas e combiná-las em um único documento PDF. Você pode reordenar, excluir ou adicionar páginas a qualquer momento.',
            faq_q4: 'O ScanUp funciona offline?',
            faq_a4: 'Sim, o ScanUp funciona completamente offline. Você pode digitalizar, editar e organizar documentos sem conexão com a Internet. A sincronização na nuvem está disponível quando você está online.',
        },
        ar: {
            page_title: 'ScanUp - أفضل تطبيق مجاني لمسح المستندات لأجهزة iPhone و Android | ماسح PDF',
            meta_description: 'ScanUp هو تطبيق مسح المستندات المجاني رقم 1. امسح المستندات إلى PDF، وقّع رقميًا، التعرف الضوئي على الحروف OCR وشارك فورًا. حمّل لـ iOS و Android. بدون علامة مائية، مسح غير محدود.',
            og_title: 'ScanUp - أفضل تطبيق مجاني لمسح المستندات لأجهزة iPhone و Android',
            og_description: 'حوّل هاتفك إلى ماسح مستندات قوي. امسح، وقّع، OCR وشارك المستندات فورًا. مجاني لـ iOS و Android.',
            schema_app_name: 'ScanUp - ماسح المستندات',
            schema_app_description: 'ScanUp هو أفضل تطبيق مجاني لمسح المستندات. امسح المستندات إلى PDF، أضف توقيعات رقمية، التعرف الضوئي على الحروف OCR وشارك فورًا. متاح على iOS و Android بدون علامة مائية ومسح غير محدود.',
            schema_org_description: 'ScanUp هو تطبيق محمول لمسح المستندات لـ iOS و Android',
            faq_q1: 'هل ScanUp مجاني؟',
            faq_a1: 'نعم! يقدم ScanUp نسخة مجانية مع مسح غير محدود وبدون علامة مائية. الميزات المميزة مثل التعرف الضوئي على الحروف OCR والمزامنة السحابية والتوقيعات الرقمية متاحة مع الاشتراك.',
            faq_q2: 'ما هي تنسيقات الملفات التي يدعمها ScanUp؟',
            faq_a2: 'يدعم ScanUp تنسيقات PDF و JPEG. يمكنك تصدير مستنداتك الممسوحة كملفات PDF متعددة الصفحات أو صور JPEG فردية.',
            faq_q3: 'هل يمكنني مسح عدة صفحات في مستند واحد؟',
            faq_a3: 'بالتأكيد! يتيح لك ScanUp مسح عدة صفحات ودمجها في مستند PDF واحد. يمكنك إعادة ترتيب الصفحات أو حذفها أو إضافتها في أي وقت.',
            faq_q4: 'هل يعمل ScanUp بدون اتصال بالإنترنت؟',
            faq_a4: 'نعم، يعمل ScanUp بشكل كامل بدون اتصال بالإنترنت. يمكنك مسح المستندات وتحريرها وتنظيمها دون اتصال بالإنترنت. المزامنة السحابية متاحة عندما تكون متصلاً.',
        },
        zh: {
            page_title: 'ScanUp - iPhone和Android最佳免费文档扫描应用 | PDF扫描仪',
            meta_description: 'ScanUp是排名第一的免费文档扫描应用。扫描文档为PDF，数字签名，OCR文字识别，即时分享。下载iOS和Android版。无水印，无限扫描。',
            og_title: 'ScanUp - iPhone和Android最佳免费文档扫描应用',
            og_description: '将您的手机变成强大的文档扫描仪。扫描、签名、OCR和即时分享文档。iOS和Android免费使用。',
            schema_app_name: 'ScanUp - 文档扫描仪',
            schema_app_description: 'ScanUp是终极免费文档扫描应用。扫描文档为PDF，添加数字签名，OCR文字识别，即时分享。在iOS和Android上可用，无水印，无限扫描。',
            schema_org_description: 'ScanUp是一款适用于iOS和Android的移动文档扫描应用',
            faq_q1: 'ScanUp免费吗？',
            faq_a1: '是的！ScanUp提供免费版本，具有无限扫描和无水印功能。OCR文字识别、云同步和数字签名等高级功能可通过订阅获得。',
            faq_q2: 'ScanUp支持哪些文件格式？',
            faq_a2: 'ScanUp支持PDF和JPEG格式。您可以将扫描的文档导出为多页PDF或单独的JPEG图像。',
            faq_q3: '我可以将多页扫描到一个文档中吗？',
            faq_a3: '当然可以！ScanUp允许您扫描多页并将它们合并到一个PDF文档中。您可以随时重新排序、删除或添加页面。',
            faq_q4: 'ScanUp可以离线工作吗？',
            faq_a4: '是的，ScanUp可以完全离线工作。您可以在没有互联网连接的情况下扫描、编辑和整理文档。在线时可以使用云同步。',
        },
        ja: {
            page_title: 'ScanUp - iPhone & Android向け最高の無料ドキュメントスキャナーアプリ | PDFスキャナー',
            meta_description: 'ScanUpは№1の無料ドキュメントスキャナーアプリです。ドキュメントをPDFにスキャン、デジタル署名、OCRテキスト認識、即座に共有。iOS & Android用ダウンロード。透かしなし、無制限スキャン。',
            og_title: 'ScanUp - iPhone & Android向け最高の無料ドキュメントスキャナーアプリ',
            og_description: 'スマートフォンを強力なドキュメントスキャナーに変換。スキャン、署名、OCR、ドキュメントを即座に共有。iOS & Android無料。',
            schema_app_name: 'ScanUp - ドキュメントスキャナー',
            schema_app_description: 'ScanUpは究極の無料ドキュメントスキャナーアプリです。ドキュメントをPDFにスキャン、デジタル署名を追加、OCRテキスト認識、即座に共有。iOS と Androidで透かしなし、無制限スキャンで利用可能。',
            schema_org_description: 'ScanUpはiOS と Android用のモバイルドキュメントスキャナーアプリです',
            faq_q1: 'ScanUpは無料ですか？',
            faq_a1: 'はい！ScanUpは無制限スキャンと透かしなしの無料バージョンを提供しています。OCRテキスト認識、クラウド同期、デジタル署名などのプレミアム機能はサブスクリプションで利用可能です。',
            faq_q2: 'ScanUpはどのファイル形式をサポートしていますか？',
            faq_a2: 'ScanUpはPDFとJPEG形式をサポートしています。スキャンしたドキュメントを複数ページのPDFまたは個別のJPEG画像としてエクスポートできます。',
            faq_q3: '複数のページを1つのドキュメントにスキャンできますか？',
            faq_a3: 'もちろんです！ScanUpでは複数のページをスキャンして1つのPDFドキュメントに結合できます。いつでもページを並べ替え、削除、追加できます。',
            faq_q4: 'ScanUpはオフラインで動作しますか？',
            faq_a4: 'はい、ScanUpは完全にオフラインで動作します。インターネット接続なしでドキュメントをスキャン、編集、整理できます。オンライン時にはクラウド同期が利用可能です。',
        },
        ko: {
            page_title: 'ScanUp - iPhone 및 Android용 최고의 무료 문서 스캐너 앱 | PDF 스캐너',
            meta_description: 'ScanUp은 1위 무료 문서 스캐너 앱입니다. 문서를 PDF로 스캔, 디지털 서명, OCR 텍스트 인식, 즉시 공유. iOS 및 Android용 다운로드. 워터마크 없음, 무제한 스캔.',
            og_title: 'ScanUp - iPhone 및 Android용 최고의 무료 문서 스캐너 앱',
            og_description: '스마트폰을 강력한 문서 스캐너로 변환하세요. 스캔, 서명, OCR, 문서를 즉시 공유. iOS 및 Android 무료.',
            schema_app_name: 'ScanUp - 문서 스캐너',
            schema_app_description: 'ScanUp은 최고의 무료 문서 스캐너 앱입니다. 문서를 PDF로 스캔, 디지털 서명 추가, OCR 텍스트 인식, 즉시 공유. iOS 및 Android에서 워터마크 없이 무제한 스캔으로 사용 가능.',
            schema_org_description: 'ScanUp은 iOS 및 Android용 모바일 문서 스캐너 앱입니다',
            faq_q1: 'ScanUp은 무료인가요?',
            faq_a1: '네! ScanUp은 무제한 스캔과 워터마크 없이 무료 버전을 제공합니다. OCR 텍스트 인식, 클라우드 동기화, 디지털 서명과 같은 프리미엄 기능은 구독으로 이용 가능합니다.',
            faq_q2: 'ScanUp은 어떤 파일 형식을 지원하나요?',
            faq_a2: 'ScanUp은 PDF 및 JPEG 형식을 지원합니다. 스캔한 문서를 여러 페이지 PDF 또는 개별 JPEG 이미지로 내보낼 수 있습니다.',
            faq_q3: '여러 페이지를 하나의 문서로 스캔할 수 있나요?',
            faq_a3: '물론이죠! ScanUp을 사용하면 여러 페이지를 스캔하여 하나의 PDF 문서로 결합할 수 있습니다. 언제든지 페이지를 재정렬, 삭제 또는 추가할 수 있습니다.',
            faq_q4: 'ScanUp은 오프라인으로 작동하나요?',
            faq_a4: '네, ScanUp은 완전히 오프라인으로 작동합니다. 인터넷 연결 없이 문서를 스캔, 편집 및 정리할 수 있습니다. 온라인일 때 클라우드 동기화가 가능합니다.',
        },
        nl: {
            page_title: 'ScanUp - Beste gratis documentscanner-app voor iPhone & Android | PDF-scanner',
            meta_description: 'ScanUp is de #1 gratis documentscanner-app. Scan documenten naar PDF, onderteken digitaal, OCR-tekstherkenning en deel direct. Download voor iOS & Android. Geen watermerk, onbeperkte scans.',
            og_title: 'ScanUp - Beste gratis documentscanner-app voor iPhone & Android',
            og_description: 'Verander je telefoon in een krachtige documentscanner. Scan, onderteken, OCR en deel documenten direct. Gratis voor iOS & Android.',
            schema_app_name: 'ScanUp - Documentscanner',
            schema_app_description: 'ScanUp is de ultieme gratis documentscanner-app. Scan documenten naar PDF, voeg digitale handtekeningen toe, OCR-tekstherkenning en deel direct. Beschikbaar op iOS en Android zonder watermerk en onbeperkte scans.',
            schema_org_description: 'ScanUp is een mobiele documentscanner-applicatie voor iOS en Android',
            faq_q1: 'Is ScanUp gratis?',
            faq_a1: 'Ja! ScanUp biedt een gratis versie met onbeperkte scans en zonder watermerk. Premium-functies zoals OCR-tekstherkenning, cloud-sync en digitale handtekeningen zijn beschikbaar met een abonnement.',
            faq_q2: 'Welke bestandsformaten ondersteunt ScanUp?',
            faq_a2: 'ScanUp ondersteunt PDF- en JPEG-formaten. U kunt uw gescande documenten exporteren als PDF\'s met meerdere pagina\'s of afzonderlijke JPEG-afbeeldingen.',
            faq_q3: 'Kan ik meerdere pagina\'s in één document scannen?',
            faq_a3: 'Absoluut! ScanUp stelt u in staat om meerdere pagina\'s te scannen en te combineren in één PDF-document. U kunt pagina\'s op elk moment herschikken, verwijderen of toevoegen.',
            faq_q4: 'Werkt ScanUp offline?',
            faq_a4: 'Ja, ScanUp werkt volledig offline. U kunt documenten scannen, bewerken en organiseren zonder internetverbinding. Cloud-sync is beschikbaar wanneer u online bent.',
        },
        pl: {
            page_title: 'ScanUp - Najlepsza darmowa aplikacja do skanowania dokumentów na iPhone i Android | Skaner PDF',
            meta_description: 'ScanUp to darmowa aplikacja do skanowania dokumentów nr 1. Skanuj dokumenty do PDF, podpisuj cyfrowo, rozpoznawanie tekstu OCR i udostępniaj natychmiast. Pobierz na iOS i Android. Bez znaku wodnego, nieograniczone skanowanie.',
            og_title: 'ScanUp - Najlepsza darmowa aplikacja do skanowania dokumentów na iPhone i Android',
            og_description: 'Zamień swój telefon w potężny skaner dokumentów. Skanuj, podpisuj, OCR i udostępniaj dokumenty natychmiast. Darmowy dla iOS i Android.',
            schema_app_name: 'ScanUp - Skaner dokumentów',
            schema_app_description: 'ScanUp to najlepsza darmowa aplikacja do skanowania dokumentów. Skanuj dokumenty do PDF, dodawaj podpisy cyfrowe, rozpoznawanie tekstu OCR i udostępniaj natychmiast. Dostępna na iOS i Android bez znaku wodnego i nieograniczone skanowanie.',
            schema_org_description: 'ScanUp to mobilna aplikacja do skanowania dokumentów na iOS i Android',
            faq_q1: 'Czy ScanUp jest darmowy?',
            faq_a1: 'Tak! ScanUp oferuje darmową wersję z nieograniczonym skanowaniem i bez znaku wodnego. Funkcje premium, takie jak rozpoznawanie tekstu OCR, synchronizacja w chmurze i podpisy cyfrowe, są dostępne w ramach subskrypcji.',
            faq_q2: 'Jakie formaty plików obsługuje ScanUp?',
            faq_a2: 'ScanUp obsługuje formaty PDF i JPEG. Możesz eksportować zeskanowane dokumenty jako wielostronicowe pliki PDF lub pojedyncze obrazy JPEG.',
            faq_q3: 'Czy mogę skanować wiele stron do jednego dokumentu?',
            faq_a3: 'Oczywiście! ScanUp pozwala skanować wiele stron i łączyć je w jeden dokument PDF. Możesz zmieniać kolejność, usuwać lub dodawać strony w dowolnym momencie.',
            faq_q4: 'Czy ScanUp działa offline?',
            faq_a4: 'Tak, ScanUp działa całkowicie offline. Możesz skanować, edytować i organizować dokumenty bez połączenia z Internetem. Synchronizacja w chmurze jest dostępna, gdy jesteś online.',
        },
        hi: {
            page_title: 'ScanUp - iPhone और Android के लिए सर्वश्रेष्ठ मुफ्त दस्तावेज़ स्कैनर ऐप | PDF स्कैनर',
            meta_description: 'ScanUp #1 मुफ्त दस्तावेज़ स्कैनर ऐप है। दस्तावेज़ों को PDF में स्कैन करें, डिजिटल रूप से हस्ताक्षर करें, OCR टेक्स्ट पहचान और तुरंत साझा करें। iOS और Android के लिए डाउनलोड करें। कोई वॉटरमार्क नहीं, असीमित स्कैन।',
            og_title: 'ScanUp - iPhone और Android के लिए सर्वश्रेष्ठ मुफ्त दस्तावेज़ स्कैनर ऐप',
            og_description: 'अपने फ़ोन को एक शक्तिशाली दस्तावेज़ स्कैनर में बदलें। स्कैन करें, हस्ताक्षर करें, OCR और दस्तावेज़ों को तुरंत साझा करें। iOS और Android के लिए मुफ्त।',
            schema_app_name: 'ScanUp - दस्तावेज़ स्कैनर',
            schema_app_description: 'ScanUp सबसे अच्छा मुफ्त दस्तावेज़ स्कैनर ऐप है। दस्तावेज़ों को PDF में स्कैन करें, डिजिटल हस्ताक्षर जोड़ें, OCR टेक्स्ट पहचान और तुरंत साझा करें। iOS और Android पर बिना वॉटरमार्क और असीमित स्कैन के साथ उपलब्ध।',
            schema_org_description: 'ScanUp iOS और Android के लिए एक मोबाइल दस्तावेज़ स्कैनर ऐप है',
            faq_q1: 'क्या ScanUp मुफ्त है?',
            faq_a1: 'हाँ! ScanUp असीमित स्कैन और बिना वॉटरमार्क के मुफ्त संस्करण प्रदान करता है। OCR टेक्स्ट पहचान, क्लाउड सिंक और डिजिटल हस्ताक्षर जैसी प्रीमियम सुविधाएँ सब्सक्रिप्शन के साथ उपलब्ध हैं।',
            faq_q2: 'ScanUp किन फ़ाइल फ़ॉर्मैट को सपोर्ट करता है?',
            faq_a2: 'ScanUp PDF और JPEG फ़ॉर्मैट को सपोर्ट करता है। आप अपने स्कैन किए गए दस्तावेज़ों को मल्टी-पेज PDF या अलग-अलग JPEG इमेज के रूप में एक्सपोर्ट कर सकते हैं।',
            faq_q3: 'क्या मैं कई पृष्ठों को एक दस्तावेज़ में स्कैन कर सकता हूँ?',
            faq_a3: 'बिल्कुल! ScanUp आपको कई पृष्ठों को स्कैन करने और उन्हें एक PDF दस्तावेज़ में संयोजित करने की अनुमति देता है। आप किसी भी समय पृष्ठों को पुनर्व्यवस्थित, हटा या जोड़ सकते हैं।',
            faq_q4: 'क्या ScanUp ऑफ़लाइन काम करता है?',
            faq_a4: 'हाँ, ScanUp पूरी तरह से ऑफ़लाइन काम करता है। आप बिना इंटरनेट कनेक्शन के दस्तावेज़ों को स्कैन, संपादित और व्यवस्थित कर सकते हैं। ऑनलाइन होने पर क्लाउड सिंक उपलब्ध है।',
        },
    },
    
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
            
            // Contact Page
            contact_title: "Contact Us",
            contact_subtitle: "We're here to help. Reach out to our support team.",
            contact_get_in_touch: "Get in Touch",
            contact_email_support: "Email Support",
            contact_live_chat: "Live Chat",
            contact_live_chat_hours: "Available Mon-Fri, 9am-6pm EST",
            contact_help_center: "Help Center",
            contact_browse_faq: "Browse FAQ & Guides",
            contact_twitter: "Twitter",
            contact_send_message: "Send us a Message",
            contact_your_name: "Your Name",
            contact_email_address: "Email Address",
            contact_subject: "Subject",
            contact_select_subject: "Select a subject",
            contact_general: "General Inquiry",
            contact_technical: "Technical Support",
            contact_billing: "Billing Question",
            contact_feedback: "Feedback",
            contact_message: "Message",
            contact_message_placeholder: "How can we help you?",
            contact_send: "Send Message",
            back_to_home: "Back to Home",
            
            // FAQ Page
            faq_page_title: "Frequently Asked Questions",
            faq_page_subtitle: "Find answers to common questions about ScanUp",
            faq_search_placeholder: "Search questions...",
            faq_category_all: "All Questions",
            faq_category_general: "General",
            faq_category_features: "Features",
            faq_category_pricing: "Pricing",
            faq_category_security: "Security",
            faq_category_technical: "Technical",
            faq_still_questions: "Still have questions?",
            faq_contact_team: "Contact our support team",
            
            // Privacy Page - Full translations
            privacy_title: "Privacy Policy",
            privacy_subtitle: "ScanUp - Secure Document Scanner",
            privacy_last_updated: "Last Updated",
            privacy_intro: "At Vision Go GmbH ('Company', 'we', 'us', or 'our'), we are committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the ScanUp mobile application and related services.",
            gdpr_compliant: "GDPR Compliant",
            last_updated: "Last Updated: January 21, 2026",
            privacy_matters_title: "Your Privacy Matters:",
            privacy_matters_text: "We believe in transparency and giving you control over your data. ScanUp is designed with privacy-first principles, and we only collect data necessary to provide our services.",
            data_controller: "Data Controller",
            privacy_section_1: "1. Information We Collect",
            privacy_section_1_1: "1.1 Information You Provide",
            privacy_section_1_2: "1.2 Automatically Collected Information",
            privacy_section_1_3: "1.3 Information We Do NOT Collect",
            data_type: "Data Type",
            purpose: "Purpose",
            legal_basis: "Legal Basis",
            data_email: "Email address",
            purpose_email: "Account creation, communication",
            legal_contract: "Contract performance",
            data_name: "Name (optional)",
            purpose_name: "Personalization",
            legal_consent: "Consent",
            data_password: "Password (hashed)",
            purpose_password: "Account security",
            data_documents: "Documents you scan",
            purpose_documents: "Core service functionality",
            data_signatures: "Digital signatures",
            purpose_signatures: "Signature feature",
            data_device: "Device type & OS version",
            purpose_device: "App optimization, support",
            legal_interest: "Legitimate interest",
            data_analytics: "App usage analytics",
            purpose_analytics: "Service improvement",
            data_crash: "Crash reports",
            purpose_crash: "Bug fixing",
            data_push: "Push notification token",
            purpose_push: "Sending notifications",
            not_collect_1: "We do NOT read or analyze the content of your scanned documents",
            not_collect_2: "We do NOT sell your personal data to third parties",
            not_collect_3: "We do NOT track your location",
            not_collect_4: "We do NOT access your contacts, photos (except camera for scanning), or other personal files",
            privacy_section_2: "2. How We Use Your Information",
            privacy_use_intro: "We use the collected information to:",
            use_provide: "Provide Services:",
            use_provide_desc: "Enable document scanning, storage, and synchronization",
            use_accounts: "Manage Accounts:",
            use_accounts_desc: "Create and maintain your user account",
            use_payments: "Process Payments:",
            use_payments_desc: "Handle Premium subscription transactions (via Apple/Google)",
            use_notify: "Send Notifications:",
            use_notify_desc: "Alert you about web access requests and important updates",
            use_improve: "Improve Services:",
            use_improve_desc: "Analyze usage patterns to enhance the app",
            use_support: "Provide Support:",
            use_support_desc: "Respond to your inquiries and resolve issues",
            use_security: "Ensure Security:",
            use_security_desc: "Protect against fraud and unauthorized access",
            privacy_section_3: "3. Data Storage and Security",
            
            // Terms Page
            terms_title: "Terms of Service",
            terms_last_updated: "Last Updated",
            terms_intro: "Please read these terms carefully before using ScanUp.",
            
            // Support Page
            support_title: "Help & Support",
            support_subtitle: "Get help with ScanUp",
            support_search_placeholder: "Search for help...",
            support_popular_topics: "Popular Topics",
            support_contact_us: "Contact Us",
            
            // 404 Page
            page_not_found: "Page Not Found",
            page_not_found_desc: "The page you're looking for doesn't exist or has been moved.",
            go_home: "Go to Homepage",
            
            // Common
            loading: "Loading...",
            error: "Error",
            success: "Success",
            submit: "Submit",
            cancel: "Cancel",
            save: "Save",
            delete: "Delete",
            edit: "Edit",
            close: "Close",
            yes: "Yes",
            no: "No",
            copyright: "© 2024 ScanUp. All rights reserved.",
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
            
            // Contact Page
            contact_title: "Bize Ulaşın",
            contact_subtitle: "Size yardımcı olmak için buradayız. Destek ekibimize ulaşın.",
            contact_get_in_touch: "İletişime Geçin",
            contact_email_support: "E-posta Desteği",
            contact_live_chat: "Canlı Sohbet",
            contact_live_chat_hours: "Pzt-Cuma, 09:00-18:00 arası",
            contact_help_center: "Yardım Merkezi",
            contact_browse_faq: "SSS ve Kılavuzlara Göz Atın",
            contact_twitter: "Twitter",
            contact_send_message: "Bize Mesaj Gönderin",
            contact_your_name: "Adınız",
            contact_email_address: "E-posta Adresi",
            contact_subject: "Konu",
            contact_select_subject: "Bir konu seçin",
            contact_general: "Genel Soru",
            contact_technical: "Teknik Destek",
            contact_billing: "Fatura Sorusu",
            contact_feedback: "Geri Bildirim",
            contact_message: "Mesaj",
            contact_message_placeholder: "Size nasıl yardımcı olabiliriz?",
            contact_send: "Mesaj Gönder",
            back_to_home: "Ana Sayfaya Dön",
            
            // FAQ Page
            faq_page_title: "Sıkça Sorulan Sorular",
            faq_page_subtitle: "ScanUp hakkında yaygın soruların cevaplarını bulun",
            faq_search_placeholder: "Soru ara...",
            faq_category_all: "Tüm Sorular",
            faq_category_general: "Genel",
            faq_category_features: "Özellikler",
            faq_category_pricing: "Fiyatlandırma",
            faq_category_security: "Güvenlik",
            faq_category_technical: "Teknik",
            faq_still_questions: "Hala sorularınız mı var?",
            faq_contact_team: "Destek ekibimizle iletişime geçin",
            
            // Privacy Page - Full translations
            privacy_title: "Gizlilik Politikası",
            privacy_subtitle: "ScanUp - Güvenli Belge Tarayıcı",
            privacy_last_updated: "Son Güncelleme",
            privacy_intro: "Vision Go GmbH ('Şirket', 'biz', 'bizim') olarak, gizliliğinizi ve kişisel verilerinizi korumaya kararlıyız. Bu Gizlilik Politikası, ScanUp mobil uygulamasını ve ilgili hizmetleri kullandığınızda bilgilerinizi nasıl topladığımızı, kullandığımızı, açıkladığımızı ve koruduğumuzu açıklar.",
            gdpr_compliant: "GDPR Uyumlu",
            last_updated: "Son Güncelleme: 21 Ocak 2026",
            privacy_matters_title: "Gizliliğiniz Önemli:",
            privacy_matters_text: "Şeffaflığa ve verileriniz üzerinde kontrol sahibi olmanıza inanıyoruz. ScanUp, gizlilik öncelikli ilkelerle tasarlanmıştır ve yalnızca hizmetlerimizi sağlamak için gerekli verileri topluyoruz.",
            data_controller: "Veri Sorumlusu",
            privacy_section_1: "1. Topladığımız Bilgiler",
            privacy_section_1_1: "1.1 Sağladığınız Bilgiler",
            privacy_section_1_2: "1.2 Otomatik Olarak Toplanan Bilgiler",
            privacy_section_1_3: "1.3 Toplamadığımız Bilgiler",
            data_type: "Veri Türü",
            purpose: "Amaç",
            legal_basis: "Yasal Dayanak",
            data_email: "E-posta adresi",
            purpose_email: "Hesap oluşturma, iletişim",
            legal_contract: "Sözleşme ifası",
            data_name: "İsim (isteğe bağlı)",
            purpose_name: "Kişiselleştirme",
            legal_consent: "Onay",
            data_password: "Şifre (şifrelenmiş)",
            purpose_password: "Hesap güvenliği",
            data_documents: "Taradığınız belgeler",
            purpose_documents: "Temel hizmet işlevselliği",
            data_signatures: "Dijital imzalar",
            purpose_signatures: "İmza özelliği",
            data_device: "Cihaz tipi ve işletim sistemi",
            purpose_device: "Uygulama optimizasyonu, destek",
            legal_interest: "Meşru menfaat",
            data_analytics: "Uygulama kullanım analitiği",
            purpose_analytics: "Hizmet iyileştirme",
            data_crash: "Çökme raporları",
            purpose_crash: "Hata düzeltme",
            data_push: "Push bildirim tokeni",
            purpose_push: "Bildirim gönderme",
            not_collect_1: "Taradığınız belgelerin içeriğini okumuyoruz veya analiz etmiyoruz",
            not_collect_2: "Kişisel verilerinizi üçüncü taraflara satmıyoruz",
            not_collect_3: "Konumunuzu takip etmiyoruz",
            not_collect_4: "Kişilerinize, fotoğraflarınıza (tarama için kamera hariç) veya diğer kişisel dosyalarınıza erişmiyoruz",
            privacy_section_2: "2. Bilgilerinizi Nasıl Kullanıyoruz",
            privacy_use_intro: "Toplanan bilgileri şu amaçlarla kullanıyoruz:",
            use_provide: "Hizmet Sağlama:",
            use_provide_desc: "Belge tarama, depolama ve senkronizasyon sağlama",
            use_accounts: "Hesap Yönetimi:",
            use_accounts_desc: "Kullanıcı hesabınızı oluşturma ve sürdürme",
            use_payments: "Ödemeleri İşleme:",
            use_payments_desc: "Premium abonelik işlemlerini yönetme (Apple/Google aracılığıyla)",
            use_notify: "Bildirim Gönderme:",
            use_notify_desc: "Web erişim istekleri ve önemli güncellemeler hakkında sizi bilgilendirme",
            use_improve: "Hizmetleri İyileştirme:",
            use_improve_desc: "Uygulamayı geliştirmek için kullanım kalıplarını analiz etme",
            use_support: "Destek Sağlama:",
            use_support_desc: "Sorularınıza yanıt verme ve sorunları çözme",
            use_security: "Güvenliği Sağlama:",
            use_security_desc: "Dolandırıcılık ve yetkisiz erişime karşı koruma",
            privacy_section_3: "3. Veri Depolama ve Güvenlik",
            
            // Terms Page - Full translations
            terms_title: "Kullanım Koşulları",
            terms_subtitle: "ScanUp - Güvenli Belge Tarayıcı",
            terms_last_updated: "Son Güncelleme",
            terms_intro: "ScanUp'a hoş geldiniz! Bu Kullanım Koşulları ('Koşullar'), Vision Go GmbH ('Şirket', 'biz', 'bizim') tarafından sağlanan ScanUp mobil uygulamasına ('Uygulama'), web sitesine ve ilgili hizmetlere (topluca 'Hizmet') erişiminizi ve kullanımınızı düzenler.",
            terms_important: "Önemli:",
            terms_important_text: "ScanUp'ı indirerek, yükleyerek veya kullanarak bu Koşullara bağlı olmayı kabul edersiniz. Bu Koşulları kabul etmiyorsanız, lütfen Hizmetimizi kullanmayın.",
            service_provider: "Hizmet Sağlayıcı",
            terms_section_1: "1. Koşulların Kabulü",
            terms_section_1_intro: "ScanUp'a erişerek veya kullanarak şunları onaylarsınız:",
            terms_accept_1: "En az 16 yaşında olduğunuzu (veya yargı bölgenizdeki reşitlik yaşında)",
            terms_accept_2: "Bu Koşulları kabul etmek için yasal ehliyete sahip olduğunuzu",
            terms_accept_3: "Tüm geçerli yasa ve düzenlemelere uyacağınızı",
            terms_accept_4: "Gizlilik Politikamızı okuduğunuzu ve anladığınızı",
            terms_section_2: "2. Hizmet Açıklaması",
            terms_section_2_intro: "ScanUp, aşağıdakileri yapmanızı sağlayan bir mobil belge tarama uygulamasıdır:",
            terms_service_1: "Cihazınızın kamerasını kullanarak fiziksel belgeleri tarama",
            terms_service_2: "Taranan belgeleri PDF formatına dönüştürme",
            terms_service_3: "Belgeleri klasörlere düzenleme",
            terms_service_4: "Belgelere dijital imza uygulama",
            terms_service_5: "Taranan belgelerde OCR (Optik Karakter Tanıma) yapma",
            terms_service_6: "Belgeleri bulutta güvenli şekilde depolama ve senkronize etme",
            terms_service_7: "Web paneli üzerinden belgelere erişme",
            terms_section_3: "3. Kullanıcı Hesapları",
            
            // Cookies Page - Full translations
            cookies_title: "Çerez Politikası",
            cookies_what: "Çerezler Nedir?",
            cookies_what_text: "Çerezler, web sitemizi ziyaret ettiğinizde cihazınıza yerleştirilen küçük metin dosyalarıdır. Tercihlerinizi hatırlayarak ve hizmetlerimizi nasıl kullandığınızı anlayarak size daha iyi bir deneyim sunmamıza yardımcı olurlar.",
            cookies_types: "Kullandığımız Çerez Türleri",
            cookie_type: "Tür",
            cookie_purpose: "Amaç",
            cookie_duration: "Süre",
            cookie_essential: "Zorunlu",
            cookie_essential_desc: "Temel web sitesi işlevselliği, oturum açma",
            cookie_session: "Oturum",
            cookie_auth: "Kimlik Doğrulama",
            cookie_auth_desc: "Güvenli şekilde oturumunuzu açık tutma",
            cookie_7days: "7 gün",
            cookie_prefs: "Tercihler",
            cookie_prefs_desc: "Ayarlarınızı hatırlama (tema, dil)",
            cookie_1year: "1 yıl",
            cookie_analytics: "Analitik",
            cookie_analytics_desc: "Ziyaretçilerin web sitemizi nasıl kullandığını anlama",
            cookie_2years: "2 yıl",
            cookies_essential_title: "Zorunlu Çerezler",
            cookies_essential_text: "Bu çerezler web sitesinin çalışması için gereklidir. Bunlar:",
            cookie_token_desc: "Oturum açmış kullanıcılar için kimlik doğrulama tokeni",
            cookie_session_desc: "Oturum durumunuzu korur",
            cookies_analytics_title: "Analitik Çerezler",
            cookies_analytics_text: "Hizmetlerimizi iyileştirmek için analitik kullanıyoruz. Bu çerezler şunları anlamamıza yardımcı olur:",
            analytics_popular: "Hangi sayfaların en popüler olduğu",
            analytics_navigate: "Kullanıcıların sitemizde nasıl gezindiği",
            analytics_issues: "Kullanıcıların karşılaşabileceği teknik sorunlar",
            analytics_no_track: "Bireysel kullanıcıları takip etmek veya kişisel bilgi toplamak için analitik KULLANMIYORUZ.",
            cookies_manage: "Çerezleri Yönetme",
            cookies_manage_text: "Çerezleri tarayıcı ayarlarınızdan kontrol edebilirsiniz:",
            browser_chrome: "Ayarlar > Gizlilik ve Güvenlik > Çerezler",
            browser_firefox: "Seçenekler > Gizlilik ve Güvenlik > Çerezler",
            browser_safari: "Tercihler > Gizlilik > Çerezler",
            browser_edge: "Ayarlar > Çerezler ve site izinleri",
            cookies_disable_warning: "Not: Zorunlu çerezleri devre dışı bırakmak web sitesi işlevselliğini etkileyebilir.",
            cookies_third_party: "Üçüncü Taraf Çerezleri",
            cookies_third_party_text: "Kendi çerezlerini ayarlayan üçüncü taraf hizmetleri kullanabiliriz:",
            third_party_google: "Kimlik doğrulama için",
            third_party_stripe: "Ödeme işleme için (varsa)",
            cookies_updates: "Bu Politikadaki Güncellemeler",
            cookies_updates_text: "Bu Çerez Politikasını zaman zaman güncelleyebiliriz. Değişiklikler güncellenmiş revizyon tarihi ile bu sayfada yayınlanacaktır.",
            contact_us: "Bize Ulaşın",
            cookies_contact_text: "Çerezler hakkında sorularınız mı var?",
            footer_terms: "Koşullar",
            footer_privacy: "Gizlilik",
            
            // GDPR Page - Full translations
            gdpr_title: "GDPR Uyumluluğu",
            gdpr_subtitle: "Genel Veri Koruma Yönetmeliği kapsamında veri koruma haklarınız",
            gdpr_commitment: "GDPR Taahhüdümüz",
            gdpr_commitment_text: "ScanUp, gizliliğinizi korumaya ve Genel Veri Koruma Yönetmeliği'ne (GDPR) uymaya kararlıdır. Bu sayfa haklarınızı ve kişisel verilerinizi nasıl işlediğimizi açıklar.",
            gdpr_rights: "GDPR Kapsamında Haklarınız",
            gdpr_rights_intro: "AB sakini olarak aşağıdaki haklara sahipsiniz:",
            right_access: "Erişim Hakkı",
            right_access_desc: "Hakkınızda tuttuğumuz tüm kişisel verilerin bir kopyasını talep edin.",
            right_rectification: "Düzeltme Hakkı",
            right_rectification_desc: "Hatalı kişisel verilerin düzeltilmesini talep edin.",
            right_erasure: "Silme Hakkı",
            right_erasure_desc: "Kişisel verilerinizin silinmesini talep edin ('unutulma hakkı').",
            right_restrict: "Kısıtlama Hakkı",
            right_restrict_desc: "Kişisel verilerinizin işlenmesinin kısıtlanmasını talep edin.",
            right_portability: "Taşınabilirlik Hakkı",
            right_portability_desc: "Verilerinizi taşınabilir, makine tarafından okunabilir formatta alın.",
            right_object: "İtiraz Hakkı",
            right_object_desc: "Meşru menfaatlere dayalı işlemeye itiraz edin.",
            gdpr_legal_basis: "İşleme için Yasal Dayanak",
            gdpr_legal_basis_intro: "Kişisel verilerinizi aşağıdaki yasal dayanaklara göre işliyoruz:",
            legal_basis_contract: "Sözleşme:",
            legal_basis_contract_desc: "Size hizmetlerimizi sunmak için",
            legal_basis_consent: "Onay:",
            legal_basis_consent_desc: "Pazarlama e-postaları gibi isteğe bağlı özellikler için",
            legal_basis_interest: "Meşru Menfaat:",
            legal_basis_interest_desc: "Güvenlik ve dolandırıcılık önleme için",
            legal_basis_legal: "Yasal Yükümlülük:",
            legal_basis_legal_desc: "Geçerli yasalara uymak için",
            gdpr_data_collected: "Topladığımız Veriler",
            data_account_info: "Hesap Bilgileri:",
            data_account_info_desc: "E-posta, isim, profil fotoğrafı",
            data_docs: "Belgeler:",
            data_docs_desc: "Taranan belgeler (şifreli olarak saklanır)",
            data_usage: "Kullanım Verileri:",
            data_usage_desc: "Uygulama kullanım istatistikleri (anonimleştirilmiş)",
            data_device_info: "Cihaz Bilgileri:",
            data_device_info_desc: "Cihaz tipi, işletim sistemi sürümü",
            data_protection: "Veri Koruma Önlemleri",
            data_protection_text: "Tüm kişisel veriler durağan halde AES-256 şifreleme ve aktarım sırasında TLS 1.3 kullanılarak şifrelenir. Sıkı erişim kontrolleri ve düzenli güvenlik denetimleri uyguluyoruz.",
            gdpr_retention: "Veri Saklama",
            gdpr_retention_intro: "Hesabınız aktif olduğu sürece verilerinizi saklarız. Hesap silindiğinde:",
            retention_account: "Hesap verileri 30 gün içinde silinir",
            retention_docs: "Belgeler kalıcı olarak silinir",
            retention_backups: "Yedekler 90 gün içinde temizlenir",
            retention_analytics: "Anonimleştirilmiş analitikler saklanabilir",
            gdpr_transfers: "Uluslararası Veri Transferleri",
            gdpr_transfers_intro: "Veriler AB dışındaki ülkelerde işlenebilir. Şu yöntemlerle uygun güvenceleri sağlıyoruz:",
            transfer_scc: "Standart Sözleşme Maddeleri (SCC)",
            transfer_adequacy: "Uygun olduğunda yeterlilik kararları",
            transfer_dpa: "Tüm alt işleyicilerle Veri İşleme Sözleşmeleri",
            gdpr_exercise: "Haklarınızı Kullanma",
            gdpr_exercise_intro: "GDPR haklarınızdan herhangi birini kullanmak için Veri Koruma Görevlimize başvurun:",
            contact_email: "E-posta:",
            response_time: "Yanıt süresi: 30 gün içinde",
            gdpr_complaint: "Ayrıca yerel veri koruma otoritenize şikayette bulunma hakkınız da vardır.",
            gdpr_subprocessors: "Alt İşleyiciler",
            gdpr_subprocessors_intro: "Aşağıdaki alt işleyicileri kullanıyoruz:",
            subprocessor_aws: "Bulut altyapısı (AB bölgesi mevcut)",
            subprocessor_mongodb: "Veritabanı hizmetleri",
            subprocessor_google: "Kimlik doğrulama hizmetleri",
            subprocessor_stripe: "Ödeme işleme",
            
            // Support Page
            support_title: "Yardım ve Destek",
            support_subtitle: "ScanUp ile ilgili yardım alın",
            support_search_placeholder: "Yardım ara...",
            support_popular_topics: "Popüler Konular",
            support_contact_us: "Bize Ulaşın",
            
            // 404 Page
            page_not_found: "Sayfa Bulunamadı",
            page_not_found_desc: "Aradığınız sayfa mevcut değil veya taşınmış.",
            go_home: "Ana Sayfaya Git",
            
            // Common
            loading: "Yükleniyor...",
            error: "Hata",
            success: "Başarılı",
            submit: "Gönder",
            cancel: "İptal",
            save: "Kaydet",
            delete: "Sil",
            edit: "Düzenle",
            close: "Kapat",
            yes: "Evet",
            no: "Hayır",
            copyright: "© 2024 ScanUp. Tüm hakları saklıdır.",
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
            
            // Privacy Page
            privacy_title: "Datenschutzrichtlinie",
            privacy_subtitle: "ScanUp - Sicherer Dokumentenscanner",
            privacy_intro: "Bei Vision Go GmbH ('Unternehmen', 'wir', 'uns') sind wir dem Schutz Ihrer Privatsphäre und persönlichen Daten verpflichtet. Diese Datenschutzrichtlinie erklärt, wie wir Ihre Informationen sammeln, verwenden, offenlegen und schützen, wenn Sie die ScanUp-Mobilanwendung und verwandte Dienste nutzen.",
            gdpr_compliant: "DSGVO-konform",
            last_updated: "Zuletzt aktualisiert: 21. Januar 2026",
            privacy_matters_title: "Ihre Privatsphäre ist wichtig:",
            privacy_matters_text: "Wir glauben an Transparenz und geben Ihnen die Kontrolle über Ihre Daten. ScanUp wurde mit Datenschutz-First-Prinzipien entwickelt und wir sammeln nur die Daten, die zur Bereitstellung unserer Dienste erforderlich sind.",
            data_controller: "Verantwortlicher",
            privacy_section_1: "1. Informationen, die wir sammeln",
            privacy_section_1_1: "1.1 Von Ihnen bereitgestellte Informationen",
            privacy_section_1_2: "1.2 Automatisch gesammelte Informationen",
            privacy_section_1_3: "1.3 Informationen, die wir NICHT sammeln",
            data_type: "Datentyp",
            purpose: "Zweck",
            legal_basis: "Rechtsgrundlage",
            data_email: "E-Mail-Adresse",
            purpose_email: "Kontoerstellung, Kommunikation",
            legal_contract: "Vertragserfüllung",
            data_name: "Name (optional)",
            purpose_name: "Personalisierung",
            legal_consent: "Einwilligung",
            privacy_section_2: "2. Wie wir Ihre Informationen verwenden",
            privacy_section_3: "3. Datenspeicherung und Sicherheit",
            
            // Terms Page
            terms_title: "Nutzungsbedingungen",
            terms_subtitle: "ScanUp - Sicherer Dokumentenscanner",
            terms_intro: "Willkommen bei ScanUp! Diese Nutzungsbedingungen ('Bedingungen') regeln Ihren Zugang zu und die Nutzung der ScanUp-Mobilanwendung ('App'), Website und verwandter Dienste (zusammen der 'Dienst'), bereitgestellt von Vision Go GmbH ('Unternehmen', 'wir', 'uns').",
            terms_important: "Wichtig:",
            terms_important_text: "Durch das Herunterladen, Installieren oder Nutzen von ScanUp stimmen Sie diesen Bedingungen zu. Wenn Sie diesen Bedingungen nicht zustimmen, nutzen Sie unseren Dienst bitte nicht.",
            service_provider: "Dienstanbieter",
            terms_section_1: "1. Annahme der Bedingungen",
            terms_section_2: "2. Dienstbeschreibung",
            terms_section_3: "3. Benutzerkonten",
            
            // Cookies Page
            cookies_title: "Cookie-Richtlinie",
            cookies_what: "Was sind Cookies?",
            cookies_what_text: "Cookies sind kleine Textdateien, die auf Ihrem Gerät platziert werden, wenn Sie unsere Website besuchen. Sie helfen uns, Ihnen ein besseres Erlebnis zu bieten, indem sie Ihre Präferenzen speichern und verstehen, wie Sie unsere Dienste nutzen.",
            cookies_types: "Arten von Cookies, die wir verwenden",
            cookie_type: "Typ",
            cookie_purpose: "Zweck",
            cookie_duration: "Dauer",
            cookie_essential: "Notwendig",
            cookie_essential_desc: "Grundlegende Website-Funktionalität, Anmeldesitzungen",
            cookie_session: "Sitzung",
            cookie_analytics: "Analytik",
            cookies_manage: "Cookies verwalten",
            
            // GDPR Page
            gdpr_title: "DSGVO-Konformität",
            gdpr_subtitle: "Ihre Datenschutzrechte gemäß der Datenschutz-Grundverordnung",
            gdpr_commitment: "Unser Engagement für die DSGVO",
            gdpr_commitment_text: "ScanUp ist dem Schutz Ihrer Privatsphäre und der Einhaltung der Datenschutz-Grundverordnung (DSGVO) verpflichtet. Diese Seite erläutert Ihre Rechte und wie wir Ihre persönlichen Daten verarbeiten.",
            gdpr_rights: "Ihre Rechte nach der DSGVO",
            gdpr_rights_intro: "Als EU-Bürger haben Sie folgende Rechte:",
            right_access: "Auskunftsrecht",
            right_access_desc: "Fordern Sie eine Kopie aller persönlichen Daten an, die wir über Sie haben.",
            right_rectification: "Recht auf Berichtigung",
            right_rectification_desc: "Fordern Sie die Korrektur ungenauer persönlicher Daten.",
            right_erasure: "Recht auf Löschung",
            right_erasure_desc: "Fordern Sie die Löschung Ihrer persönlichen Daten ('Recht auf Vergessenwerden').",
            right_restrict: "Recht auf Einschränkung",
            right_portability: "Recht auf Datenübertragbarkeit",
            right_object: "Widerspruchsrecht",
            
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
            
            // Privacy Page
            privacy_title: "Politique de confidentialité",
            privacy_subtitle: "ScanUp - Scanner de documents sécurisé",
            privacy_intro: "Chez Vision Go GmbH ('Société', 'nous', 'notre'), nous nous engageons à protéger votre vie privée et vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons, divulguons et protégeons vos informations lorsque vous utilisez l'application mobile ScanUp et les services associés.",
            gdpr_compliant: "Conforme RGPD",
            last_updated: "Dernière mise à jour : 21 janvier 2026",
            privacy_matters_title: "Votre vie privée compte :",
            privacy_matters_text: "Nous croyons en la transparence et vous donnons le contrôle de vos données. ScanUp est conçu avec des principes de confidentialité d'abord, et nous ne collectons que les données nécessaires pour fournir nos services.",
            data_controller: "Responsable du traitement",
            privacy_section_1: "1. Informations que nous collectons",
            privacy_section_2: "2. Comment nous utilisons vos informations",
            privacy_section_3: "3. Stockage et sécurité des données",
            
            // Terms Page
            terms_title: "Conditions d'utilisation",
            terms_subtitle: "ScanUp - Scanner de documents sécurisé",
            terms_intro: "Bienvenue sur ScanUp ! Ces conditions d'utilisation ('Conditions') régissent votre accès et utilisation de l'application mobile ScanUp ('Application'), du site web et des services connexes (collectivement, le 'Service') fournis par Vision Go GmbH ('Société', 'nous', 'notre').",
            terms_important: "Important :",
            terms_important_text: "En téléchargeant, installant ou utilisant ScanUp, vous acceptez d'être lié par ces Conditions. Si vous n'acceptez pas ces Conditions, veuillez ne pas utiliser notre Service.",
            service_provider: "Fournisseur de service",
            terms_section_1: "1. Acceptation des conditions",
            terms_section_2: "2. Description du service",
            terms_section_3: "3. Comptes utilisateurs",
            
            // Cookies Page
            cookies_title: "Politique des cookies",
            cookies_what: "Que sont les cookies ?",
            cookies_what_text: "Les cookies sont de petits fichiers texte placés sur votre appareil lorsque vous visitez notre site web. Ils nous aident à vous offrir une meilleure expérience en mémorisant vos préférences et en comprenant comment vous utilisez nos services.",
            cookies_types: "Types de cookies que nous utilisons",
            
            // GDPR Page
            gdpr_title: "Conformité RGPD",
            gdpr_subtitle: "Vos droits de protection des données selon le Règlement général sur la protection des données",
            gdpr_commitment: "Notre engagement envers le RGPD",
            gdpr_rights: "Vos droits selon le RGPD",
            right_access: "Droit d'accès",
            right_rectification: "Droit de rectification",
            right_erasure: "Droit à l'effacement",
            right_restrict: "Droit à la limitation",
            right_portability: "Droit à la portabilité",
            right_object: "Droit d'opposition",
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
            
            // Privacy Page
            privacy_title: "Política de Privacidad",
            privacy_subtitle: "ScanUp - Escáner de documentos seguro",
            privacy_intro: "En Vision Go GmbH ('Empresa', 'nosotros', 'nuestro'), estamos comprometidos a proteger su privacidad y datos personales.",
            gdpr_compliant: "Cumple con RGPD",
            last_updated: "Última actualización: 21 de enero de 2026",
            privacy_matters_title: "Su privacidad importa:",
            privacy_matters_text: "Creemos en la transparencia y le damos control sobre sus datos.",
            data_controller: "Responsable del tratamiento",
            privacy_section_1: "1. Información que recopilamos",
            privacy_section_2: "2. Cómo usamos su información",
            privacy_section_3: "3. Almacenamiento y seguridad de datos",
            
            // Terms Page
            terms_title: "Términos de Uso",
            terms_subtitle: "ScanUp - Escáner de documentos seguro",
            terms_intro: "¡Bienvenido a ScanUp! Estos Términos de Uso rigen su acceso y uso de la aplicación móvil ScanUp.",
            terms_important: "Importante:",
            terms_important_text: "Al descargar, instalar o usar ScanUp, acepta estos Términos.",
            service_provider: "Proveedor de servicios",
            
            // Cookies Page
            cookies_title: "Política de Cookies",
            cookies_what: "¿Qué son las cookies?",
            cookies_what_text: "Las cookies son pequeños archivos de texto colocados en su dispositivo cuando visita nuestro sitio web.",
            
            // GDPR Page
            gdpr_title: "Cumplimiento del RGPD",
            gdpr_subtitle: "Sus derechos de protección de datos según el Reglamento General de Protección de Datos",
            gdpr_rights: "Sus derechos según el RGPD",
            right_access: "Derecho de acceso",
            right_rectification: "Derecho de rectificación",
            right_erasure: "Derecho de supresión",
            right_portability: "Derecho a la portabilidad",
            right_restriction: "Derecho de limitación",
            right_objection: "Derecho de oposición",
            
            // Privacy Page - Full Content
            privacy_section_1_1: "1.1 Información que usted proporciona",
            privacy_section_1_2: "1.2 Información recopilada automáticamente",
            privacy_section_1_3: "1.3 Información que NO recopilamos",
            data_type: "Tipo de datos",
            purpose: "Propósito",
            legal_basis: "Base legal",
            data_email: "Dirección de correo electrónico",
            purpose_email: "Creación de cuenta, comunicación",
            legal_contract: "Ejecución del contrato",
            data_name: "Nombre (opcional)",
            purpose_name: "Personalización",
            legal_consent: "Consentimiento",
            data_password: "Contraseña (cifrada)",
            purpose_password: "Seguridad de la cuenta",
            data_documents: "Documentos que escanea",
            purpose_documents: "Funcionalidad del servicio principal",
            data_signatures: "Firmas digitales",
            purpose_signatures: "Función de firma",
            data_device: "Tipo de dispositivo y versión del SO",
            purpose_device: "Optimización de la app, soporte",
            legal_interest: "Interés legítimo",
            data_analytics: "Análisis de uso de la app",
            purpose_analytics: "Mejora del servicio",
            data_crash: "Informes de errores",
            purpose_crash: "Corrección de errores",
            data_push: "Token de notificaciones push",
            purpose_push: "Envío de notificaciones",
            not_collect_1: "NO leemos ni analizamos el contenido de sus documentos escaneados",
            not_collect_2: "NO vendemos sus datos personales a terceros",
            not_collect_3: "NO rastreamos su ubicación",
            not_collect_4: "NO accedemos a sus contactos, fotos (excepto la cámara para escanear) u otros archivos personales",
            privacy_use_intro: "Utilizamos la información recopilada para:",
            use_provide: "Proporcionar servicios:",
            use_provide_desc: "Permitir el escaneo, almacenamiento y sincronización de documentos",
            use_accounts: "Gestionar cuentas:",
            use_accounts_desc: "Crear y mantener su cuenta de usuario",
            use_payments: "Procesar pagos:",
            use_payments_desc: "Gestionar transacciones de suscripción Premium (a través de Apple/Google)",
            use_notify: "Enviar notificaciones:",
            use_notify_desc: "Alertarle sobre solicitudes de acceso web y actualizaciones importantes",
            use_improve: "Mejorar servicios:",
            use_improve_desc: "Analizar patrones de uso para mejorar la app",
            use_support: "Proporcionar soporte:",
            use_support_desc: "Responder a sus consultas y resolver problemas",
            use_security: "Garantizar seguridad:",
            use_security_desc: "Proteger contra fraude y acceso no autorizado",
            
            // Terms Page - Full Content
            terms_section_1: "1. Aceptación de los términos",
            terms_section_1_intro: "Al acceder o usar ScanUp, usted confirma que:",
            terms_accept_1: "Tiene al menos 16 años de edad",
            terms_accept_2: "Ha leído y acepta estos términos",
            terms_accept_3: "Tiene capacidad legal para celebrar acuerdos vinculantes",
            terms_section_2: "2. Descripción del servicio",
            terms_section_2_intro: "ScanUp es una aplicación móvil de escaneo de documentos que le permite:",
            terms_service_1: "Escanear documentos físicos usando la cámara de su dispositivo",
            terms_service_2: "Convertir escaneos a formato PDF o imagen",
            terms_service_3: "Añadir firmas digitales a documentos",
            terms_service_4: "Almacenar documentos de forma segura en su dispositivo",
            terms_service_5: "Sincronizar documentos en la nube (función Premium)",
            terms_service_6: "Extraer texto usando tecnología OCR (función Premium)",
            terms_section_3: "3. Cuentas de usuario",
            terms_account_1: "Debe proporcionar información precisa y completa",
            terms_account_2: "Es responsable de mantener la seguridad de su cuenta",
            terms_account_3: "Debe notificarnos inmediatamente cualquier uso no autorizado",
            terms_account_4: "No puede compartir su cuenta con otros",
            terms_section_4: "4. Uso aceptable",
            terms_acceptable_intro: "Usted acepta NO:",
            terms_acceptable_1: "Usar el servicio para fines ilegales",
            terms_acceptable_2: "Subir contenido malicioso o virus",
            terms_acceptable_3: "Intentar acceder sin autorización a nuestros sistemas",
            terms_acceptable_4: "Infringir los derechos de propiedad intelectual de otros",
            terms_section_5: "5. Suscripciones Premium",
            terms_premium_intro: "Las suscripciones Premium:",
            terms_premium_1: "Se facturan a través de Apple App Store o Google Play",
            terms_premium_2: "Se renuevan automáticamente a menos que se cancelen",
            terms_premium_3: "Pueden cancelarse en cualquier momento a través de la configuración de su tienda de apps",
            terms_section_6: "6. Propiedad intelectual",
            terms_ip_text: "Todos los derechos, títulos e intereses en ScanUp pertenecen a Vision Go GmbH. Usted retiene todos los derechos sobre el contenido que crea.",
            terms_section_7: "7. Limitación de responsabilidad",
            terms_liability_text: "ScanUp se proporciona 'tal cual'. No somos responsables de ningún daño indirecto, incidental o consecuente.",
            terms_section_8: "8. Cambios en los términos",
            terms_changes_text: "Podemos actualizar estos términos. Le notificaremos los cambios materiales por correo electrónico o notificación en la app.",
            
            // Cookies Page - Full Content
            cookies_types: "Tipos de cookies que utilizamos",
            cookies_essential_title: "Cookies esenciales",
            cookies_essential_text: "Estas cookies son necesarias para que el sitio web funcione. Incluyen:",
            cookies_essential_1: "Cookies de sesión para autenticación",
            cookies_essential_2: "Cookies de preferencias para configuración de idioma",
            cookies_analytics_title: "Cookies analíticas",
            cookies_analytics_text: "Utilizamos análisis para mejorar nuestros servicios. Estas cookies nos ayudan a entender:",
            cookies_analytics_1: "Cómo los visitantes encuentran nuestro sitio web",
            cookies_analytics_2: "Qué páginas son más populares",
            cookies_analytics_3: "Cómo los usuarios navegan por nuestro sitio",
            cookies_manage: "Gestión de cookies",
            cookies_manage_text: "Puede controlar las cookies a través de la configuración de su navegador:",
            cookies_manage_1: "Chrome: Configuración → Privacidad y seguridad → Cookies",
            cookies_manage_2: "Firefox: Opciones → Privacidad y seguridad",
            cookies_manage_3: "Safari: Preferencias → Privacidad",
            cookies_disable_warning: "Nota: Deshabilitar las cookies esenciales puede afectar la funcionalidad del sitio web.",
            cookies_third_party: "Cookies de terceros",
            cookies_third_party_text: "Podemos usar servicios de terceros que establecen sus propias cookies:",
            cookies_third_party_1: "Google Analytics para análisis del sitio web",
            cookies_third_party_2: "Servicios de autenticación de Apple/Google",
            cookies_updates: "Actualizaciones de esta política",
            cookies_updates_text: "Podemos actualizar esta Política de Cookies periódicamente. Los cambios se publicarán en esta página con una fecha de revisión actualizada.",
            cookies_contact: "Contacto",
            cookies_contact_text: "¿Tiene preguntas sobre las cookies?",
            
            // GDPR Page - Full Content
            gdpr_commitment: "Nuestro compromiso con el RGPD",
            gdpr_commitment_text: "ScanUp está comprometido con la protección de su privacidad y el cumplimiento del Reglamento General de Protección de Datos (RGPD). Esta página explica sus derechos y cómo procesamos sus datos personales.",
            gdpr_rights_intro: "Como residente de la UE, tiene los siguientes derechos:",
            right_access_desc: "Solicitar una copia de sus datos personales",
            right_rectification_desc: "Corregir datos inexactos",
            right_erasure_desc: "Solicitar la eliminación de sus datos",
            right_portability_desc: "Recibir sus datos en un formato portátil",
            right_restriction_desc: "Limitar cómo usamos sus datos",
            right_objection_desc: "Oponerse a cierto procesamiento",
            gdpr_legal_basis: "Base legal para el procesamiento",
            gdpr_legal_basis_intro: "Procesamos sus datos personales bajo las siguientes bases legales:",
            legal_basis_1: "Ejecución del contrato: proporcionar nuestros servicios",
            legal_basis_2: "Consentimiento: para comunicaciones de marketing",
            legal_basis_3: "Interés legítimo: para mejora del servicio y seguridad",
            legal_basis_4: "Obligación legal: para cumplir con las leyes aplicables",
            gdpr_data_collected: "Datos que recopilamos",
            gdpr_data_category: "Categoría de datos",
            gdpr_data_examples: "Ejemplos",
            gdpr_data_retention: "Retención",
            gdpr_data_identity: "Identidad",
            gdpr_data_identity_ex: "Nombre, correo electrónico",
            gdpr_data_technical: "Técnicos",
            gdpr_data_technical_ex: "Tipo de dispositivo, versión del SO",
            gdpr_data_usage: "Uso",
            gdpr_data_usage_ex: "Interacciones con la app, preferencias",
            gdpr_retention: "Retención de datos",
            gdpr_retention_intro: "Retenemos sus datos mientras su cuenta esté activa. Al eliminar la cuenta:",
            gdpr_retention_1: "Los datos de la cuenta se eliminan en 30 días",
            gdpr_retention_2: "Las copias de seguridad se purgan en 90 días",
            gdpr_retention_3: "Los registros anonimizados pueden conservarse para análisis",
            gdpr_transfers: "Transferencias internacionales de datos",
            gdpr_transfers_intro: "Los datos pueden procesarse en países fuera de la UE. Garantizamos las salvaguardas apropiadas a través de:",
            gdpr_transfers_1: "Cláusulas contractuales estándar de la UE",
            gdpr_transfers_2: "Evaluaciones de impacto de la protección de datos",
            gdpr_exercise: "Ejercicio de sus derechos",
            gdpr_exercise_intro: "Para ejercer cualquiera de sus derechos RGPD, contacte a nuestro Responsable de Protección de Datos:",
            gdpr_dpo_email: "Correo electrónico del DPO",
            gdpr_complaint: "También tiene derecho a presentar una queja ante su autoridad local de protección de datos.",
            gdpr_subprocessors: "Subprocesadores",
            gdpr_subprocessors_intro: "Utilizamos los siguientes subprocesadores:",
            subprocessor_name: "Nombre",
            subprocessor_purpose: "Propósito",
            subprocessor_location: "Ubicación",
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
            
            // Privacy Page
            privacy_title: "Политика конфиденциальности",
            privacy_subtitle: "ScanUp - Безопасный сканер документов",
            privacy_intro: "В Vision Go GmbH мы стремимся защитить вашу конфиденциальность и личные данные.",
            gdpr_compliant: "Соответствует GDPR",
            last_updated: "Последнее обновление: 21 января 2026",
            data_controller: "Контролер данных",
            privacy_section_1: "1. Информация, которую мы собираем",
            privacy_section_2: "2. Как мы используем вашу информацию",
            
            // Terms Page
            terms_title: "Условия использования",
            terms_intro: "Добро пожаловать в ScanUp! Эти Условия использования регулируют ваш доступ к приложению.",
            
            // Cookies Page
            cookies_title: "Политика cookies",
            cookies_what: "Что такое cookies?",
            
            // Privacy Page - Full Content
            privacy_section_3: "3. Хранение и безопасность данных",
            privacy_section_1_1: "1.1 Информация, которую вы предоставляете",
            privacy_section_1_2: "1.2 Автоматически собираемая информация",
            privacy_section_1_3: "1.3 Информация, которую мы НЕ собираем",
            privacy_matters_title: "Ваша конфиденциальность важна:",
            privacy_matters_text: "Мы верим в прозрачность и даем вам контроль над вашими данными.",
            data_type: "Тип данных",
            purpose: "Назначение",
            legal_basis: "Правовая основа",
            data_email: "Адрес электронной почты",
            purpose_email: "Создание аккаунта, коммуникация",
            legal_contract: "Исполнение договора",
            data_name: "Имя (необязательно)",
            purpose_name: "Персонализация",
            legal_consent: "Согласие",
            data_password: "Пароль (зашифрованный)",
            purpose_password: "Безопасность аккаунта",
            data_documents: "Документы, которые вы сканируете",
            purpose_documents: "Основная функциональность сервиса",
            data_signatures: "Цифровые подписи",
            purpose_signatures: "Функция подписи",
            data_device: "Тип устройства и версия ОС",
            purpose_device: "Оптимизация приложения, поддержка",
            legal_interest: "Законный интерес",
            data_analytics: "Аналитика использования приложения",
            purpose_analytics: "Улучшение сервиса",
            data_crash: "Отчеты о сбоях",
            purpose_crash: "Исправление ошибок",
            data_push: "Токен push-уведомлений",
            purpose_push: "Отправка уведомлений",
            not_collect_1: "Мы НЕ читаем и НЕ анализируем содержимое ваших отсканированных документов",
            not_collect_2: "Мы НЕ продаем ваши личные данные третьим лицам",
            not_collect_3: "Мы НЕ отслеживаем ваше местоположение",
            not_collect_4: "Мы НЕ получаем доступ к вашим контактам, фотографиям (кроме камеры для сканирования) или другим личным файлам",
            privacy_use_intro: "Мы используем собранную информацию для:",
            use_provide: "Предоставления услуг:",
            use_provide_desc: "Обеспечение сканирования, хранения и синхронизации документов",
            use_accounts: "Управления аккаунтами:",
            use_accounts_desc: "Создание и ведение вашей учетной записи",
            use_payments: "Обработки платежей:",
            use_payments_desc: "Обработка транзакций Premium-подписки (через Apple/Google)",
            use_notify: "Отправки уведомлений:",
            use_notify_desc: "Уведомление о запросах веб-доступа и важных обновлениях",
            use_improve: "Улучшения сервисов:",
            use_improve_desc: "Анализ паттернов использования для улучшения приложения",
            use_support: "Предоставления поддержки:",
            use_support_desc: "Ответы на ваши запросы и решение проблем",
            use_security: "Обеспечения безопасности:",
            use_security_desc: "Защита от мошенничества и несанкционированного доступа",
            
            // Terms Page - Full Content
            terms_subtitle: "ScanUp - Безопасный сканер документов",
            terms_important: "Важно:",
            terms_important_text: "Скачивая, устанавливая или используя ScanUp, вы соглашаетесь с этими Условиями.",
            service_provider: "Поставщик услуг",
            terms_section_1: "1. Принятие условий",
            terms_section_1_intro: "Получая доступ к ScanUp или используя его, вы подтверждаете, что:",
            terms_accept_1: "Вам исполнилось не менее 16 лет",
            terms_accept_2: "Вы прочитали и принимаете эти условия",
            terms_accept_3: "Вы обладаете правоспособностью для заключения обязательных соглашений",
            terms_section_2: "2. Описание сервиса",
            terms_section_2_intro: "ScanUp - это мобильное приложение для сканирования документов, которое позволяет:",
            terms_service_1: "Сканировать физические документы с помощью камеры устройства",
            terms_service_2: "Конвертировать сканы в формат PDF или изображения",
            terms_service_3: "Добавлять цифровые подписи к документам",
            terms_service_4: "Безопасно хранить документы на устройстве",
            terms_service_5: "Синхронизировать документы в облаке (Premium функция)",
            terms_service_6: "Извлекать текст с помощью технологии OCR (Premium функция)",
            terms_section_3: "3. Учетные записи пользователей",
            terms_account_1: "Вы должны предоставить точную и полную информацию",
            terms_account_2: "Вы несете ответственность за безопасность своей учетной записи",
            terms_account_3: "Вы должны немедленно уведомить нас о любом несанкционированном использовании",
            terms_account_4: "Вы не можете делиться своей учетной записью с другими",
            terms_section_4: "4. Допустимое использование",
            terms_acceptable_intro: "Вы соглашаетесь НЕ:",
            terms_acceptable_1: "Использовать сервис в незаконных целях",
            terms_acceptable_2: "Загружать вредоносный контент или вирусы",
            terms_acceptable_3: "Пытаться получить несанкционированный доступ к нашим системам",
            terms_acceptable_4: "Нарушать права интеллектуальной собственности других лиц",
            terms_section_5: "5. Premium-подписки",
            terms_premium_intro: "Premium-подписки:",
            terms_premium_1: "Оплачиваются через Apple App Store или Google Play",
            terms_premium_2: "Автоматически продлеваются, если не отменены",
            terms_premium_3: "Могут быть отменены в любое время через настройки магазина приложений",
            terms_section_6: "6. Интеллектуальная собственность",
            terms_ip_text: "Все права, титулы и интересы в ScanUp принадлежат Vision Go GmbH. Вы сохраняете все права на создаваемый вами контент.",
            terms_section_7: "7. Ограничение ответственности",
            terms_liability_text: "ScanUp предоставляется 'как есть'. Мы не несем ответственности за любые косвенные, случайные или последующие убытки.",
            terms_section_8: "8. Изменения условий",
            terms_changes_text: "Мы можем обновлять эти условия. Мы уведомим вас о существенных изменениях по электронной почте или уведомлением в приложении.",
            
            // Cookies Page - Full Content
            cookies_what_text: "Cookies - это небольшие текстовые файлы, размещаемые на вашем устройстве при посещении нашего сайта. Они помогают нам обеспечить лучший опыт, запоминая ваши предпочтения и понимая, как вы используете наши сервисы.",
            cookies_types: "Типы используемых cookies",
            cookies_essential_title: "Необходимые cookies",
            cookies_essential_text: "Эти cookies необходимы для работы сайта. Они включают:",
            cookies_essential_1: "Сессионные cookies для аутентификации",
            cookies_essential_2: "Cookies предпочтений для настроек языка",
            cookies_analytics_title: "Аналитические cookies",
            cookies_analytics_text: "Мы используем аналитику для улучшения наших сервисов. Эти cookies помогают нам понять:",
            cookies_analytics_1: "Как посетители находят наш сайт",
            cookies_analytics_2: "Какие страницы наиболее популярны",
            cookies_analytics_3: "Как пользователи перемещаются по сайту",
            cookies_manage: "Управление cookies",
            cookies_manage_text: "Вы можете управлять cookies через настройки браузера:",
            cookies_manage_1: "Chrome: Настройки → Конфиденциальность и безопасность → Cookies",
            cookies_manage_2: "Firefox: Настройки → Приватность и защита",
            cookies_manage_3: "Safari: Настройки → Конфиденциальность",
            cookies_disable_warning: "Примечание: Отключение необходимых cookies может повлиять на функциональность сайта.",
            cookies_third_party: "Сторонние cookies",
            cookies_third_party_text: "Мы можем использовать сторонние сервисы, которые устанавливают свои cookies:",
            cookies_third_party_1: "Google Analytics для аналитики сайта",
            cookies_third_party_2: "Сервисы аутентификации Apple/Google",
            cookies_updates: "Обновления этой политики",
            cookies_updates_text: "Мы можем периодически обновлять эту Политику cookies. Изменения будут опубликованы на этой странице с обновленной датой.",
            cookies_contact: "Контакты",
            cookies_contact_text: "Есть вопросы о cookies?",
            
            // GDPR Page - Full Content
            gdpr_title: "Соответствие GDPR",
            gdpr_subtitle: "Ваши права на защиту данных согласно Общему регламенту по защите данных",
            gdpr_commitment: "Наше обязательство по GDPR",
            gdpr_commitment_text: "ScanUp стремится защитить вашу конфиденциальность и соблюдать Общий регламент по защите данных (GDPR). Эта страница объясняет ваши права и то, как мы обрабатываем ваши персональные данные.",
            gdpr_rights: "Ваши права по GDPR",
            gdpr_rights_intro: "Как резидент ЕС, вы имеете следующие права:",
            right_access: "Право на доступ",
            right_access_desc: "Запросить копию ваших персональных данных",
            right_rectification: "Право на исправление",
            right_rectification_desc: "Исправить неточные данные",
            right_erasure: "Право на удаление",
            right_erasure_desc: "Запросить удаление ваших данных",
            right_portability: "Право на переносимость",
            right_portability_desc: "Получить ваши данные в переносимом формате",
            right_restriction: "Право на ограничение",
            right_restriction_desc: "Ограничить использование ваших данных",
            right_objection: "Право на возражение",
            right_objection_desc: "Возразить против определенной обработки",
            gdpr_legal_basis: "Правовая основа для обработки",
            gdpr_legal_basis_intro: "Мы обрабатываем ваши персональные данные на следующих правовых основаниях:",
            legal_basis_1: "Исполнение договора: предоставление наших услуг",
            legal_basis_2: "Согласие: для маркетинговых коммуникаций",
            legal_basis_3: "Законный интерес: для улучшения сервиса и безопасности",
            legal_basis_4: "Юридическое обязательство: для соблюдения применимых законов",
            gdpr_data_collected: "Данные, которые мы собираем",
            gdpr_data_category: "Категория данных",
            gdpr_data_examples: "Примеры",
            gdpr_data_retention: "Срок хранения",
            gdpr_data_identity: "Идентификационные",
            gdpr_data_identity_ex: "Имя, email",
            gdpr_data_technical: "Технические",
            gdpr_data_technical_ex: "Тип устройства, версия ОС",
            gdpr_data_usage: "Использование",
            gdpr_data_usage_ex: "Взаимодействия в приложении, предпочтения",
            gdpr_retention: "Хранение данных",
            gdpr_retention_intro: "Мы храним ваши данные, пока ваш аккаунт активен. При удалении аккаунта:",
            gdpr_retention_1: "Данные аккаунта удаляются в течение 30 дней",
            gdpr_retention_2: "Резервные копии очищаются в течение 90 дней",
            gdpr_retention_3: "Анонимизированные логи могут храниться для аналитики",
            gdpr_transfers: "Международная передача данных",
            gdpr_transfers_intro: "Данные могут обрабатываться в странах за пределами ЕС. Мы обеспечиваем надлежащие гарантии через:",
            gdpr_transfers_1: "Стандартные договорные положения ЕС",
            gdpr_transfers_2: "Оценку воздействия на защиту данных",
            gdpr_exercise: "Реализация ваших прав",
            gdpr_exercise_intro: "Чтобы воспользоваться любым из ваших прав по GDPR, свяжитесь с нашим Уполномоченным по защите данных:",
            gdpr_dpo_email: "Email DPO",
            gdpr_complaint: "Вы также имеете право подать жалобу в местный орган по защите данных.",
            gdpr_subprocessors: "Субпроцессоры",
            gdpr_subprocessors_intro: "Мы используем следующих субпроцессоров:",
            subprocessor_name: "Название",
            subprocessor_purpose: "Назначение",
            subprocessor_location: "Местоположение",
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
            
            // Privacy Page - Full Content
            privacy_title: "Informativa sulla Privacy",
            privacy_subtitle: "ScanUp - Scanner di documenti sicuro",
            privacy_intro: "In Vision Go GmbH ('Azienda', 'noi', 'nostro'), ci impegniamo a proteggere la vostra privacy e i dati personali.",
            gdpr_compliant: "Conforme al GDPR",
            last_updated: "Ultimo aggiornamento: 21 gennaio 2026",
            privacy_matters_title: "La vostra privacy è importante:",
            privacy_matters_text: "Crediamo nella trasparenza e vi diamo il controllo sui vostri dati.",
            data_controller: "Titolare del trattamento",
            privacy_section_1: "1. Informazioni che raccogliamo",
            privacy_section_1_1: "1.1 Informazioni che fornite",
            privacy_section_1_2: "1.2 Informazioni raccolte automaticamente",
            privacy_section_1_3: "1.3 Informazioni che NON raccogliamo",
            privacy_section_2: "2. Come utilizziamo le vostre informazioni",
            privacy_section_3: "3. Archiviazione e sicurezza dei dati",
            data_type: "Tipo di dati",
            purpose: "Scopo",
            legal_basis: "Base giuridica",
            data_email: "Indirizzo email",
            purpose_email: "Creazione account, comunicazione",
            legal_contract: "Esecuzione del contratto",
            data_name: "Nome (opzionale)",
            purpose_name: "Personalizzazione",
            legal_consent: "Consenso",
            data_password: "Password (crittografata)",
            purpose_password: "Sicurezza dell'account",
            data_documents: "Documenti che scansionate",
            purpose_documents: "Funzionalità principale del servizio",
            data_signatures: "Firme digitali",
            purpose_signatures: "Funzione firma",
            data_device: "Tipo di dispositivo e versione OS",
            purpose_device: "Ottimizzazione app, supporto",
            legal_interest: "Interesse legittimo",
            data_analytics: "Analisi utilizzo app",
            purpose_analytics: "Miglioramento del servizio",
            data_crash: "Report di crash",
            purpose_crash: "Correzione bug",
            data_push: "Token notifiche push",
            purpose_push: "Invio notifiche",
            not_collect_1: "NON leggiamo né analizziamo il contenuto dei vostri documenti scansionati",
            not_collect_2: "NON vendiamo i vostri dati personali a terzi",
            not_collect_3: "NON tracciamo la vostra posizione",
            not_collect_4: "NON accediamo ai vostri contatti, foto (eccetto la fotocamera per la scansione) o altri file personali",
            privacy_use_intro: "Utilizziamo le informazioni raccolte per:",
            use_provide: "Fornire servizi:",
            use_provide_desc: "Abilitare scansione, archiviazione e sincronizzazione dei documenti",
            use_accounts: "Gestire account:",
            use_accounts_desc: "Creare e mantenere il vostro account utente",
            use_payments: "Elaborare pagamenti:",
            use_payments_desc: "Gestire transazioni abbonamento Premium (tramite Apple/Google)",
            use_notify: "Inviare notifiche:",
            use_notify_desc: "Avvisarvi di richieste di accesso web e aggiornamenti importanti",
            use_improve: "Migliorare i servizi:",
            use_improve_desc: "Analizzare pattern di utilizzo per migliorare l'app",
            use_support: "Fornire supporto:",
            use_support_desc: "Rispondere alle vostre richieste e risolvere problemi",
            use_security: "Garantire sicurezza:",
            use_security_desc: "Proteggere da frodi e accessi non autorizzati",
            
            // Terms Page - Full Content
            terms_title: "Termini di Servizio",
            terms_subtitle: "ScanUp - Scanner di documenti sicuro",
            terms_intro: "Benvenuti in ScanUp! Questi Termini di Servizio regolano l'accesso e l'utilizzo dell'applicazione mobile ScanUp.",
            terms_important: "Importante:",
            terms_important_text: "Scaricando, installando o utilizzando ScanUp, accettate questi Termini.",
            service_provider: "Fornitore del servizio",
            terms_section_1: "1. Accettazione dei termini",
            terms_section_1_intro: "Accedendo o utilizzando ScanUp, confermate che:",
            terms_accept_1: "Avete almeno 16 anni",
            terms_accept_2: "Avete letto e accettate questi termini",
            terms_accept_3: "Avete la capacità legale di stipulare accordi vincolanti",
            terms_section_2: "2. Descrizione del servizio",
            terms_section_2_intro: "ScanUp è un'applicazione mobile per la scansione di documenti che vi permette di:",
            terms_service_1: "Scansionare documenti fisici usando la fotocamera del dispositivo",
            terms_service_2: "Convertire scansioni in formato PDF o immagine",
            terms_service_3: "Aggiungere firme digitali ai documenti",
            terms_service_4: "Archiviare documenti in modo sicuro sul dispositivo",
            terms_service_5: "Sincronizzare documenti nel cloud (funzione Premium)",
            terms_service_6: "Estrarre testo usando tecnologia OCR (funzione Premium)",
            terms_section_3: "3. Account utente",
            terms_account_1: "Dovete fornire informazioni accurate e complete",
            terms_account_2: "Siete responsabili della sicurezza del vostro account",
            terms_account_3: "Dovete notificarci immediatamente qualsiasi uso non autorizzato",
            terms_account_4: "Non potete condividere il vostro account con altri",
            terms_section_4: "4. Uso accettabile",
            terms_acceptable_intro: "Accettate di NON:",
            terms_acceptable_1: "Utilizzare il servizio per scopi illegali",
            terms_acceptable_2: "Caricare contenuti dannosi o virus",
            terms_acceptable_3: "Tentare l'accesso non autorizzato ai nostri sistemi",
            terms_acceptable_4: "Violare i diritti di proprietà intellettuale di altri",
            terms_section_5: "5. Abbonamenti Premium",
            terms_premium_intro: "Gli abbonamenti Premium:",
            terms_premium_1: "Vengono fatturati tramite Apple App Store o Google Play",
            terms_premium_2: "Si rinnovano automaticamente se non cancellati",
            terms_premium_3: "Possono essere cancellati in qualsiasi momento tramite le impostazioni dell'app store",
            terms_section_6: "6. Proprietà intellettuale",
            terms_ip_text: "Tutti i diritti, titoli e interessi in ScanUp appartengono a Vision Go GmbH. Mantenete tutti i diritti sui contenuti che create.",
            terms_section_7: "7. Limitazione di responsabilità",
            terms_liability_text: "ScanUp viene fornito 'così com'è'. Non siamo responsabili per danni indiretti, incidentali o consequenziali.",
            terms_section_8: "8. Modifiche ai termini",
            terms_changes_text: "Possiamo aggiornare questi termini. Vi informeremo di modifiche sostanziali via email o notifica in-app.",
            
            // Cookies Page - Full Content
            cookies_title: "Informativa sui Cookie",
            cookies_what: "Cosa sono i cookie?",
            cookies_what_text: "I cookie sono piccoli file di testo posizionati sul vostro dispositivo quando visitate il nostro sito web. Ci aiutano a fornirvi un'esperienza migliore ricordando le vostre preferenze e comprendendo come utilizzate i nostri servizi.",
            cookies_types: "Tipi di cookie che utilizziamo",
            cookies_essential_title: "Cookie essenziali",
            cookies_essential_text: "Questi cookie sono necessari per il funzionamento del sito web. Includono:",
            cookies_essential_1: "Cookie di sessione per l'autenticazione",
            cookies_essential_2: "Cookie di preferenza per le impostazioni della lingua",
            cookies_analytics_title: "Cookie analitici",
            cookies_analytics_text: "Utilizziamo analytics per migliorare i nostri servizi. Questi cookie ci aiutano a capire:",
            cookies_analytics_1: "Come i visitatori trovano il nostro sito web",
            cookies_analytics_2: "Quali pagine sono più popolari",
            cookies_analytics_3: "Come gli utenti navigano nel nostro sito",
            cookies_manage: "Gestione dei cookie",
            cookies_manage_text: "Potete controllare i cookie tramite le impostazioni del browser:",
            cookies_manage_1: "Chrome: Impostazioni → Privacy e sicurezza → Cookie",
            cookies_manage_2: "Firefox: Opzioni → Privacy e sicurezza",
            cookies_manage_3: "Safari: Preferenze → Privacy",
            cookies_disable_warning: "Nota: Disabilitare i cookie essenziali potrebbe influire sulla funzionalità del sito web.",
            cookies_third_party: "Cookie di terze parti",
            cookies_third_party_text: "Potremmo utilizzare servizi di terze parti che impostano i propri cookie:",
            cookies_third_party_1: "Google Analytics per l'analisi del sito web",
            cookies_third_party_2: "Servizi di autenticazione Apple/Google",
            cookies_updates: "Aggiornamenti a questa politica",
            cookies_updates_text: "Potremmo aggiornare periodicamente questa Informativa sui Cookie. Le modifiche saranno pubblicate su questa pagina con una data di revisione aggiornata.",
            cookies_contact: "Contatti",
            cookies_contact_text: "Avete domande sui cookie?",
            
            // GDPR Page - Full Content
            gdpr_title: "Conformità GDPR",
            gdpr_subtitle: "I vostri diritti di protezione dei dati ai sensi del Regolamento Generale sulla Protezione dei Dati",
            gdpr_commitment: "Il nostro impegno per il GDPR",
            gdpr_commitment_text: "ScanUp si impegna a proteggere la vostra privacy e a rispettare il Regolamento Generale sulla Protezione dei Dati (GDPR). Questa pagina spiega i vostri diritti e come trattiamo i vostri dati personali.",
            gdpr_rights: "I vostri diritti ai sensi del GDPR",
            gdpr_rights_intro: "Come residenti UE, avete i seguenti diritti:",
            right_access: "Diritto di accesso",
            right_access_desc: "Richiedere una copia dei vostri dati personali",
            right_rectification: "Diritto di rettifica",
            right_rectification_desc: "Correggere dati inesatti",
            right_erasure: "Diritto alla cancellazione",
            right_erasure_desc: "Richiedere la cancellazione dei vostri dati",
            right_portability: "Diritto alla portabilità",
            right_portability_desc: "Ricevere i vostri dati in un formato portabile",
            right_restriction: "Diritto di limitazione",
            right_restriction_desc: "Limitare l'utilizzo dei vostri dati",
            right_objection: "Diritto di opposizione",
            right_objection_desc: "Opporvi a determinati trattamenti",
            gdpr_legal_basis: "Base giuridica per il trattamento",
            gdpr_legal_basis_intro: "Trattiamo i vostri dati personali sulla base delle seguenti basi giuridiche:",
            legal_basis_1: "Esecuzione del contratto: per fornire i nostri servizi",
            legal_basis_2: "Consenso: per comunicazioni di marketing",
            legal_basis_3: "Interesse legittimo: per miglioramento del servizio e sicurezza",
            legal_basis_4: "Obbligo legale: per rispettare le leggi applicabili",
            gdpr_data_collected: "Dati che raccogliamo",
            gdpr_data_category: "Categoria di dati",
            gdpr_data_examples: "Esempi",
            gdpr_data_retention: "Conservazione",
            gdpr_data_identity: "Identità",
            gdpr_data_identity_ex: "Nome, email",
            gdpr_data_technical: "Tecnici",
            gdpr_data_technical_ex: "Tipo dispositivo, versione OS",
            gdpr_data_usage: "Utilizzo",
            gdpr_data_usage_ex: "Interazioni app, preferenze",
            gdpr_retention: "Conservazione dei dati",
            gdpr_retention_intro: "Conserviamo i vostri dati finché il vostro account è attivo. Alla cancellazione dell'account:",
            gdpr_retention_1: "I dati dell'account vengono eliminati entro 30 giorni",
            gdpr_retention_2: "I backup vengono eliminati entro 90 giorni",
            gdpr_retention_3: "I log anonimizzati potrebbero essere conservati per analisi",
            gdpr_transfers: "Trasferimenti internazionali di dati",
            gdpr_transfers_intro: "I dati potrebbero essere elaborati in paesi al di fuori dell'UE. Garantiamo adeguate salvaguardie attraverso:",
            gdpr_transfers_1: "Clausole contrattuali standard UE",
            gdpr_transfers_2: "Valutazioni d'impatto sulla protezione dei dati",
            gdpr_exercise: "Esercizio dei vostri diritti",
            gdpr_exercise_intro: "Per esercitare uno qualsiasi dei vostri diritti GDPR, contattate il nostro Responsabile della Protezione dei Dati:",
            gdpr_dpo_email: "Email DPO",
            gdpr_complaint: "Avete anche il diritto di presentare un reclamo alla vostra autorità locale per la protezione dei dati.",
            gdpr_subprocessors: "Sub-responsabili",
            gdpr_subprocessors_intro: "Utilizziamo i seguenti sub-responsabili:",
            subprocessor_name: "Nome",
            subprocessor_purpose: "Scopo",
            subprocessor_location: "Ubicazione",
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
            
            // Privacy Page - Full Content
            privacy_title: "Política de Privacidade",
            privacy_subtitle: "ScanUp - Scanner de documentos seguro",
            privacy_intro: "Na Vision Go GmbH ('Empresa', 'nós', 'nosso'), estamos comprometidos em proteger sua privacidade e dados pessoais.",
            gdpr_compliant: "Conforme LGPD/GDPR",
            last_updated: "Última atualização: 21 de janeiro de 2026",
            privacy_matters_title: "Sua privacidade importa:",
            privacy_matters_text: "Acreditamos na transparência e damos a você controle sobre seus dados.",
            data_controller: "Controlador de dados",
            privacy_section_1: "1. Informações que coletamos",
            privacy_section_1_1: "1.1 Informações que você fornece",
            privacy_section_1_2: "1.2 Informações coletadas automaticamente",
            privacy_section_1_3: "1.3 Informações que NÃO coletamos",
            privacy_section_2: "2. Como usamos suas informações",
            privacy_section_3: "3. Armazenamento e segurança de dados",
            data_type: "Tipo de dados",
            purpose: "Finalidade",
            legal_basis: "Base legal",
            data_email: "Endereço de e-mail",
            purpose_email: "Criação de conta, comunicação",
            legal_contract: "Execução de contrato",
            data_name: "Nome (opcional)",
            purpose_name: "Personalização",
            legal_consent: "Consentimento",
            data_password: "Senha (criptografada)",
            purpose_password: "Segurança da conta",
            data_documents: "Documentos que você digitaliza",
            purpose_documents: "Funcionalidade principal do serviço",
            data_signatures: "Assinaturas digitais",
            purpose_signatures: "Recurso de assinatura",
            data_device: "Tipo de dispositivo e versão do SO",
            purpose_device: "Otimização do app, suporte",
            legal_interest: "Interesse legítimo",
            data_analytics: "Análise de uso do app",
            purpose_analytics: "Melhoria do serviço",
            data_crash: "Relatórios de erro",
            purpose_crash: "Correção de bugs",
            data_push: "Token de notificações push",
            purpose_push: "Envio de notificações",
            not_collect_1: "NÃO lemos nem analisamos o conteúdo dos seus documentos digitalizados",
            not_collect_2: "NÃO vendemos seus dados pessoais a terceiros",
            not_collect_3: "NÃO rastreamos sua localização",
            not_collect_4: "NÃO acessamos seus contatos, fotos (exceto câmera para digitalização) ou outros arquivos pessoais",
            privacy_use_intro: "Usamos as informações coletadas para:",
            use_provide: "Fornecer serviços:",
            use_provide_desc: "Permitir digitalização, armazenamento e sincronização de documentos",
            use_accounts: "Gerenciar contas:",
            use_accounts_desc: "Criar e manter sua conta de usuário",
            use_payments: "Processar pagamentos:",
            use_payments_desc: "Gerenciar transações de assinatura Premium (via Apple/Google)",
            use_notify: "Enviar notificações:",
            use_notify_desc: "Alertá-lo sobre solicitações de acesso web e atualizações importantes",
            use_improve: "Melhorar serviços:",
            use_improve_desc: "Analisar padrões de uso para melhorar o app",
            use_support: "Fornecer suporte:",
            use_support_desc: "Responder às suas consultas e resolver problemas",
            use_security: "Garantir segurança:",
            use_security_desc: "Proteger contra fraudes e acessos não autorizados",
            
            // Terms Page - Full Content
            terms_title: "Termos de Serviço",
            terms_subtitle: "ScanUp - Scanner de documentos seguro",
            terms_intro: "Bem-vindo ao ScanUp! Estes Termos de Serviço regem seu acesso e uso do aplicativo móvel ScanUp.",
            terms_important: "Importante:",
            terms_important_text: "Ao baixar, instalar ou usar o ScanUp, você concorda com estes Termos.",
            service_provider: "Provedor de serviços",
            terms_section_1: "1. Aceitação dos termos",
            terms_section_1_intro: "Ao acessar ou usar o ScanUp, você confirma que:",
            terms_accept_1: "Tem pelo menos 16 anos de idade",
            terms_accept_2: "Leu e aceita estes termos",
            terms_accept_3: "Tem capacidade legal para celebrar acordos vinculativos",
            terms_section_2: "2. Descrição do serviço",
            terms_section_2_intro: "ScanUp é um aplicativo móvel de digitalização de documentos que permite:",
            terms_service_1: "Digitalizar documentos físicos usando a câmera do dispositivo",
            terms_service_2: "Converter digitalizações para formato PDF ou imagem",
            terms_service_3: "Adicionar assinaturas digitais a documentos",
            terms_service_4: "Armazenar documentos com segurança no dispositivo",
            terms_service_5: "Sincronizar documentos na nuvem (recurso Premium)",
            terms_service_6: "Extrair texto usando tecnologia OCR (recurso Premium)",
            terms_section_3: "3. Contas de usuário",
            terms_account_1: "Você deve fornecer informações precisas e completas",
            terms_account_2: "Você é responsável por manter a segurança da sua conta",
            terms_account_3: "Você deve nos notificar imediatamente sobre qualquer uso não autorizado",
            terms_account_4: "Você não pode compartilhar sua conta com outros",
            terms_section_4: "4. Uso aceitável",
            terms_acceptable_intro: "Você concorda em NÃO:",
            terms_acceptable_1: "Usar o serviço para fins ilegais",
            terms_acceptable_2: "Carregar conteúdo malicioso ou vírus",
            terms_acceptable_3: "Tentar acesso não autorizado aos nossos sistemas",
            terms_acceptable_4: "Infringir os direitos de propriedade intelectual de outros",
            terms_section_5: "5. Assinaturas Premium",
            terms_premium_intro: "Assinaturas Premium:",
            terms_premium_1: "São cobradas através da Apple App Store ou Google Play",
            terms_premium_2: "Renovam-se automaticamente a menos que canceladas",
            terms_premium_3: "Podem ser canceladas a qualquer momento através das configurações da loja de apps",
            terms_section_6: "6. Propriedade intelectual",
            terms_ip_text: "Todos os direitos, títulos e interesses no ScanUp pertencem à Vision Go GmbH. Você mantém todos os direitos sobre o conteúdo que cria.",
            terms_section_7: "7. Limitação de responsabilidade",
            terms_liability_text: "O ScanUp é fornecido 'como está'. Não somos responsáveis por quaisquer danos indiretos, incidentais ou consequentes.",
            terms_section_8: "8. Alterações nos termos",
            terms_changes_text: "Podemos atualizar estes termos. Notificaremos você sobre alterações materiais por e-mail ou notificação no app.",
            
            // Cookies Page - Full Content
            cookies_title: "Política de Cookies",
            cookies_what: "O que são cookies?",
            cookies_what_text: "Cookies são pequenos arquivos de texto colocados no seu dispositivo quando você visita nosso site. Eles nos ajudam a fornecer uma experiência melhor, lembrando suas preferências e entendendo como você usa nossos serviços.",
            cookies_types: "Tipos de cookies que usamos",
            cookies_essential_title: "Cookies essenciais",
            cookies_essential_text: "Estes cookies são necessários para o funcionamento do site. Incluem:",
            cookies_essential_1: "Cookies de sessão para autenticação",
            cookies_essential_2: "Cookies de preferências para configurações de idioma",
            cookies_analytics_title: "Cookies analíticos",
            cookies_analytics_text: "Usamos análises para melhorar nossos serviços. Estes cookies nos ajudam a entender:",
            cookies_analytics_1: "Como os visitantes encontram nosso site",
            cookies_analytics_2: "Quais páginas são mais populares",
            cookies_analytics_3: "Como os usuários navegam pelo nosso site",
            cookies_manage: "Gerenciamento de cookies",
            cookies_manage_text: "Você pode controlar os cookies através das configurações do seu navegador:",
            cookies_manage_1: "Chrome: Configurações → Privacidade e segurança → Cookies",
            cookies_manage_2: "Firefox: Opções → Privacidade e segurança",
            cookies_manage_3: "Safari: Preferências → Privacidade",
            cookies_disable_warning: "Nota: Desativar cookies essenciais pode afetar a funcionalidade do site.",
            cookies_third_party: "Cookies de terceiros",
            cookies_third_party_text: "Podemos usar serviços de terceiros que definem seus próprios cookies:",
            cookies_third_party_1: "Google Analytics para análise do site",
            cookies_third_party_2: "Serviços de autenticação Apple/Google",
            cookies_updates: "Atualizações desta política",
            cookies_updates_text: "Podemos atualizar esta Política de Cookies periodicamente. As alterações serão publicadas nesta página com uma data de revisão atualizada.",
            cookies_contact: "Contato",
            cookies_contact_text: "Tem perguntas sobre cookies?",
            
            // GDPR Page - Full Content
            gdpr_title: "Conformidade LGPD/GDPR",
            gdpr_subtitle: "Seus direitos de proteção de dados de acordo com o Regulamento Geral sobre a Proteção de Dados",
            gdpr_commitment: "Nosso compromisso com a LGPD/GDPR",
            gdpr_commitment_text: "ScanUp está comprometido em proteger sua privacidade e cumprir o Regulamento Geral sobre a Proteção de Dados (GDPR). Esta página explica seus direitos e como processamos seus dados pessoais.",
            gdpr_rights: "Seus direitos segundo a LGPD/GDPR",
            gdpr_rights_intro: "Como residente da UE/Brasil, você tem os seguintes direitos:",
            right_access: "Direito de acesso",
            right_access_desc: "Solicitar uma cópia dos seus dados pessoais",
            right_rectification: "Direito de retificação",
            right_rectification_desc: "Corrigir dados imprecisos",
            right_erasure: "Direito de exclusão",
            right_erasure_desc: "Solicitar a exclusão dos seus dados",
            right_portability: "Direito à portabilidade",
            right_portability_desc: "Receber seus dados em formato portátil",
            right_restriction: "Direito de limitação",
            right_restriction_desc: "Limitar como usamos seus dados",
            right_objection: "Direito de oposição",
            right_objection_desc: "Opor-se a certos processamentos",
            gdpr_legal_basis: "Base legal para processamento",
            gdpr_legal_basis_intro: "Processamos seus dados pessoais com base nas seguintes bases legais:",
            legal_basis_1: "Execução de contrato: para fornecer nossos serviços",
            legal_basis_2: "Consentimento: para comunicações de marketing",
            legal_basis_3: "Interesse legítimo: para melhoria do serviço e segurança",
            legal_basis_4: "Obrigação legal: para cumprir as leis aplicáveis",
            gdpr_data_collected: "Dados que coletamos",
            gdpr_data_category: "Categoria de dados",
            gdpr_data_examples: "Exemplos",
            gdpr_data_retention: "Retenção",
            gdpr_data_identity: "Identidade",
            gdpr_data_identity_ex: "Nome, e-mail",
            gdpr_data_technical: "Técnicos",
            gdpr_data_technical_ex: "Tipo de dispositivo, versão do SO",
            gdpr_data_usage: "Uso",
            gdpr_data_usage_ex: "Interações no app, preferências",
            gdpr_retention: "Retenção de dados",
            gdpr_retention_intro: "Retemos seus dados enquanto sua conta estiver ativa. Ao excluir a conta:",
            gdpr_retention_1: "Os dados da conta são excluídos em 30 dias",
            gdpr_retention_2: "Os backups são removidos em 90 dias",
            gdpr_retention_3: "Logs anonimizados podem ser mantidos para análise",
            gdpr_transfers: "Transferências internacionais de dados",
            gdpr_transfers_intro: "Os dados podem ser processados em países fora da UE. Garantimos salvaguardas apropriadas através de:",
            gdpr_transfers_1: "Cláusulas contratuais padrão da UE",
            gdpr_transfers_2: "Avaliações de impacto na proteção de dados",
            gdpr_exercise: "Exercício dos seus direitos",
            gdpr_exercise_intro: "Para exercer qualquer um dos seus direitos LGPD/GDPR, entre em contato com nosso Encarregado de Proteção de Dados:",
            gdpr_dpo_email: "E-mail do DPO",
            gdpr_complaint: "Você também tem o direito de apresentar uma reclamação à sua autoridade local de proteção de dados.",
            gdpr_subprocessors: "Subprocessadores",
            gdpr_subprocessors_intro: "Utilizamos os seguintes subprocessadores:",
            subprocessor_name: "Nome",
            subprocessor_purpose: "Finalidade",
            subprocessor_location: "Localização",
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
            
            // Privacy Page - Full Content
            privacy_title: "سياسة الخصوصية",
            privacy_subtitle: "ScanUp - ماسح مستندات آمن",
            privacy_intro: "في Vision Go GmbH ('الشركة'، 'نحن'، 'لنا')، نلتزم بحماية خصوصيتك وبياناتك الشخصية.",
            gdpr_compliant: "متوافق مع GDPR",
            last_updated: "آخر تحديث: 21 يناير 2026",
            privacy_matters_title: "خصوصيتك مهمة:",
            privacy_matters_text: "نؤمن بالشفافية ونمنحك التحكم في بياناتك.",
            data_controller: "مراقب البيانات",
            privacy_section_1: "1. المعلومات التي نجمعها",
            privacy_section_1_1: "1.1 المعلومات التي تقدمها",
            privacy_section_1_2: "1.2 المعلومات المجمعة تلقائياً",
            privacy_section_1_3: "1.3 المعلومات التي لا نجمعها",
            privacy_section_2: "2. كيف نستخدم معلوماتك",
            privacy_section_3: "3. تخزين البيانات والأمان",
            data_type: "نوع البيانات",
            purpose: "الغرض",
            legal_basis: "الأساس القانوني",
            data_email: "عنوان البريد الإلكتروني",
            purpose_email: "إنشاء الحساب، التواصل",
            legal_contract: "تنفيذ العقد",
            data_name: "الاسم (اختياري)",
            purpose_name: "التخصيص",
            legal_consent: "الموافقة",
            data_password: "كلمة المرور (مشفرة)",
            purpose_password: "أمان الحساب",
            data_documents: "المستندات التي تمسحها",
            purpose_documents: "وظائف الخدمة الأساسية",
            data_signatures: "التوقيعات الرقمية",
            purpose_signatures: "ميزة التوقيع",
            data_device: "نوع الجهاز وإصدار نظام التشغيل",
            purpose_device: "تحسين التطبيق، الدعم",
            legal_interest: "المصلحة المشروعة",
            data_analytics: "تحليلات استخدام التطبيق",
            purpose_analytics: "تحسين الخدمة",
            data_crash: "تقارير الأعطال",
            purpose_crash: "إصلاح الأخطاء",
            data_push: "رمز الإشعارات الفورية",
            purpose_push: "إرسال الإشعارات",
            not_collect_1: "لا نقرأ أو نحلل محتوى مستنداتك الممسوحة",
            not_collect_2: "لا نبيع بياناتك الشخصية لأطراف ثالثة",
            not_collect_3: "لا نتتبع موقعك",
            not_collect_4: "لا نصل إلى جهات اتصالك أو صورك (باستثناء الكاميرا للمسح) أو ملفاتك الشخصية الأخرى",
            privacy_use_intro: "نستخدم المعلومات المجمعة من أجل:",
            use_provide: "تقديم الخدمات:",
            use_provide_desc: "تمكين مسح المستندات وتخزينها ومزامنتها",
            use_accounts: "إدارة الحسابات:",
            use_accounts_desc: "إنشاء وصيانة حساب المستخدم الخاص بك",
            use_payments: "معالجة المدفوعات:",
            use_payments_desc: "التعامل مع معاملات الاشتراك المميز (عبر Apple/Google)",
            use_notify: "إرسال الإشعارات:",
            use_notify_desc: "تنبيهك بشأن طلبات الوصول عبر الويب والتحديثات المهمة",
            use_improve: "تحسين الخدمات:",
            use_improve_desc: "تحليل أنماط الاستخدام لتحسين التطبيق",
            use_support: "تقديم الدعم:",
            use_support_desc: "الرد على استفساراتك وحل المشكلات",
            use_security: "ضمان الأمان:",
            use_security_desc: "الحماية من الاحتيال والوصول غير المصرح به",
            
            // Terms Page - Full Content
            terms_title: "شروط الخدمة",
            terms_subtitle: "ScanUp - ماسح مستندات آمن",
            terms_intro: "مرحباً بك في ScanUp! تحكم شروط الخدمة هذه وصولك واستخدامك لتطبيق ScanUp للجوال.",
            terms_important: "مهم:",
            terms_important_text: "بتنزيل ScanUp أو تثبيته أو استخدامه، فإنك توافق على هذه الشروط.",
            service_provider: "مزود الخدمة",
            terms_section_1: "1. قبول الشروط",
            terms_section_1_intro: "بالوصول إلى ScanUp أو استخدامه، فإنك تؤكد أنك:",
            terms_accept_1: "تبلغ من العمر 16 عاماً على الأقل",
            terms_accept_2: "قرأت وتوافق على هذه الشروط",
            terms_accept_3: "لديك الأهلية القانونية لإبرام اتفاقيات ملزمة",
            terms_section_2: "2. وصف الخدمة",
            terms_section_2_intro: "ScanUp هو تطبيق جوال لمسح المستندات يتيح لك:",
            terms_service_1: "مسح المستندات المادية باستخدام كاميرا جهازك",
            terms_service_2: "تحويل عمليات المسح إلى صيغة PDF أو صورة",
            terms_service_3: "إضافة توقيعات رقمية إلى المستندات",
            terms_service_4: "تخزين المستندات بشكل آمن على جهازك",
            terms_service_5: "مزامنة المستندات في السحابة (ميزة مميزة)",
            terms_service_6: "استخراج النص باستخدام تقنية OCR (ميزة مميزة)",
            terms_section_3: "3. حسابات المستخدمين",
            terms_account_1: "يجب عليك تقديم معلومات دقيقة وكاملة",
            terms_account_2: "أنت مسؤول عن الحفاظ على أمان حسابك",
            terms_account_3: "يجب عليك إخطارنا فوراً بأي استخدام غير مصرح به",
            terms_account_4: "لا يمكنك مشاركة حسابك مع الآخرين",
            terms_section_4: "4. الاستخدام المقبول",
            terms_acceptable_intro: "أنت توافق على عدم:",
            terms_acceptable_1: "استخدام الخدمة لأغراض غير قانونية",
            terms_acceptable_2: "تحميل محتوى ضار أو فيروسات",
            terms_acceptable_3: "محاولة الوصول غير المصرح به إلى أنظمتنا",
            terms_acceptable_4: "انتهاك حقوق الملكية الفكرية للآخرين",
            terms_section_5: "5. الاشتراكات المميزة",
            terms_premium_intro: "الاشتراكات المميزة:",
            terms_premium_1: "يتم فوترتها عبر Apple App Store أو Google Play",
            terms_premium_2: "تتجدد تلقائياً ما لم يتم إلغاؤها",
            terms_premium_3: "يمكن إلغاؤها في أي وقت عبر إعدادات متجر التطبيقات",
            terms_section_6: "6. الملكية الفكرية",
            terms_ip_text: "جميع الحقوق والملكية والمصالح في ScanUp تعود لشركة Vision Go GmbH. تحتفظ بجميع الحقوق في المحتوى الذي تنشئه.",
            terms_section_7: "7. تحديد المسؤولية",
            terms_liability_text: "يتم توفير ScanUp 'كما هو'. لسنا مسؤولين عن أي أضرار غير مباشرة أو عرضية أو تبعية.",
            terms_section_8: "8. التغييرات في الشروط",
            terms_changes_text: "قد نقوم بتحديث هذه الشروط. سنخطرك بالتغييرات الجوهرية عبر البريد الإلكتروني أو إشعار داخل التطبيق.",
            
            // Cookies Page - Full Content
            cookies_title: "سياسة ملفات تعريف الارتباط",
            cookies_what: "ما هي ملفات تعريف الارتباط؟",
            cookies_what_text: "ملفات تعريف الارتباط هي ملفات نصية صغيرة توضع على جهازك عند زيارة موقعنا. تساعدنا في توفير تجربة أفضل من خلال تذكر تفضيلاتك وفهم كيفية استخدامك لخدماتنا.",
            cookies_types: "أنواع ملفات تعريف الارتباط التي نستخدمها",
            cookies_essential_title: "ملفات تعريف الارتباط الأساسية",
            cookies_essential_text: "هذه الملفات ضرورية لعمل الموقع. تشمل:",
            cookies_essential_1: "ملفات تعريف ارتباط الجلسة للمصادقة",
            cookies_essential_2: "ملفات تعريف ارتباط التفضيلات لإعدادات اللغة",
            cookies_analytics_title: "ملفات تعريف الارتباط التحليلية",
            cookies_analytics_text: "نستخدم التحليلات لتحسين خدماتنا. تساعدنا هذه الملفات على فهم:",
            cookies_analytics_1: "كيف يجد الزوار موقعنا",
            cookies_analytics_2: "أي الصفحات أكثر شعبية",
            cookies_analytics_3: "كيف يتنقل المستخدمون في موقعنا",
            cookies_manage: "إدارة ملفات تعريف الارتباط",
            cookies_manage_text: "يمكنك التحكم في ملفات تعريف الارتباط من خلال إعدادات متصفحك:",
            cookies_manage_1: "Chrome: الإعدادات ← الخصوصية والأمان ← ملفات تعريف الارتباط",
            cookies_manage_2: "Firefox: الخيارات ← الخصوصية والأمان",
            cookies_manage_3: "Safari: التفضيلات ← الخصوصية",
            cookies_disable_warning: "ملاحظة: قد يؤثر تعطيل ملفات تعريف الارتباط الأساسية على وظائف الموقع.",
            cookies_third_party: "ملفات تعريف ارتباط الطرف الثالث",
            cookies_third_party_text: "قد نستخدم خدمات طرف ثالث تضع ملفات تعريف ارتباط خاصة بها:",
            cookies_third_party_1: "Google Analytics لتحليل الموقع",
            cookies_third_party_2: "خدمات مصادقة Apple/Google",
            cookies_updates: "تحديثات هذه السياسة",
            cookies_updates_text: "قد نقوم بتحديث سياسة ملفات تعريف الارتباط هذه بشكل دوري. سيتم نشر التغييرات على هذه الصفحة مع تاريخ مراجعة محدث.",
            cookies_contact: "اتصل بنا",
            cookies_contact_text: "هل لديك أسئلة حول ملفات تعريف الارتباط؟",
            
            // GDPR Page - Full Content
            gdpr_title: "الامتثال لـ GDPR",
            gdpr_subtitle: "حقوق حماية البيانات الخاصة بك بموجب اللائحة العامة لحماية البيانات",
            gdpr_commitment: "التزامنا بـ GDPR",
            gdpr_commitment_text: "تلتزم ScanUp بحماية خصوصيتك والامتثال للائحة العامة لحماية البيانات (GDPR). توضح هذه الصفحة حقوقك وكيفية معالجة بياناتك الشخصية.",
            gdpr_rights: "حقوقك بموجب GDPR",
            gdpr_rights_intro: "بصفتك مقيماً في الاتحاد الأوروبي، لديك الحقوق التالية:",
            right_access: "حق الوصول",
            right_access_desc: "طلب نسخة من بياناتك الشخصية",
            right_rectification: "حق التصحيح",
            right_rectification_desc: "تصحيح البيانات غير الدقيقة",
            right_erasure: "حق المحو",
            right_erasure_desc: "طلب حذف بياناتك",
            right_portability: "حق قابلية النقل",
            right_portability_desc: "استلام بياناتك بصيغة قابلة للنقل",
            right_restriction: "حق التقييد",
            right_restriction_desc: "تقييد كيفية استخدام بياناتك",
            right_objection: "حق الاعتراض",
            right_objection_desc: "الاعتراض على معالجة معينة",
            gdpr_legal_basis: "الأساس القانوني للمعالجة",
            gdpr_legal_basis_intro: "نعالج بياناتك الشخصية بناءً على الأسس القانونية التالية:",
            legal_basis_1: "تنفيذ العقد: لتقديم خدماتنا",
            legal_basis_2: "الموافقة: للاتصالات التسويقية",
            legal_basis_3: "المصلحة المشروعة: لتحسين الخدمة والأمان",
            legal_basis_4: "الالتزام القانوني: للامتثال للقوانين المعمول بها",
            gdpr_data_collected: "البيانات التي نجمعها",
            gdpr_data_category: "فئة البيانات",
            gdpr_data_examples: "أمثلة",
            gdpr_data_retention: "الاحتفاظ",
            gdpr_data_identity: "الهوية",
            gdpr_data_identity_ex: "الاسم، البريد الإلكتروني",
            gdpr_data_technical: "تقنية",
            gdpr_data_technical_ex: "نوع الجهاز، إصدار نظام التشغيل",
            gdpr_data_usage: "الاستخدام",
            gdpr_data_usage_ex: "التفاعلات في التطبيق، التفضيلات",
            gdpr_retention: "الاحتفاظ بالبيانات",
            gdpr_retention_intro: "نحتفظ ببياناتك طالما أن حسابك نشط. عند حذف الحساب:",
            gdpr_retention_1: "يتم حذف بيانات الحساب خلال 30 يوماً",
            gdpr_retention_2: "يتم مسح النسخ الاحتياطية خلال 90 يوماً",
            gdpr_retention_3: "قد يتم الاحتفاظ بالسجلات المجهولة للتحليل",
            gdpr_transfers: "نقل البيانات الدولي",
            gdpr_transfers_intro: "قد تتم معالجة البيانات في دول خارج الاتحاد الأوروبي. نضمن الضمانات المناسبة من خلال:",
            gdpr_transfers_1: "البنود التعاقدية القياسية للاتحاد الأوروبي",
            gdpr_transfers_2: "تقييمات أثر حماية البيانات",
            gdpr_exercise: "ممارسة حقوقك",
            gdpr_exercise_intro: "لممارسة أي من حقوقك بموجب GDPR، اتصل بمسؤول حماية البيانات لدينا:",
            gdpr_dpo_email: "بريد DPO الإلكتروني",
            gdpr_complaint: "لديك أيضاً الحق في تقديم شكوى إلى هيئة حماية البيانات المحلية.",
            gdpr_subprocessors: "المعالجون الفرعيون",
            gdpr_subprocessors_intro: "نستخدم المعالجين الفرعيين التاليين:",
            subprocessor_name: "الاسم",
            subprocessor_purpose: "الغرض",
            subprocessor_location: "الموقع",
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
        this.updateSEOMetaTags();
        this.updateCanonicalAndHreflang();
        this.updateSchemaOrgData();
        return this;
    },
    
    detectLanguage() {
        // 1. Check URL path first (highest priority)
        const path = window.location.pathname;
        // Match both /tr/... and /api/pages/tr/... formats
        const match = path.match(/\/([a-z]{2})(\/|$)/) || path.match(/\/pages\/([a-z]{2})(\/|$)/);
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
    
    // Get SEO data for current language
    getSeoData(key) {
        const langData = this.seoData[this.currentLang] || this.seoData['en'];
        return langData[key] || this.seoData['en'][key] || '';
    },
    
    // Get current page name from URL
    getCurrentPageName() {
        const path = window.location.pathname;
        // Extract page name from various URL formats
        const pageMatch = path.match(/\/([a-z0-9-]+)\.html$/i) || 
                         path.match(/\/pages\/[a-z]{2}\/([a-z0-9-]+)\.html$/i) ||
                         path.match(/\/pages\/([a-z0-9-]+)\.html$/i) ||
                         path.match(/\/[a-z]{2}\/([a-z0-9-]+)$/i);
        
        if (pageMatch) {
            return pageMatch[1];
        }
        
        // Check for specific pages
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('contact')) return 'contact';
        if (path.includes('faq')) return 'faq';
        if (path.includes('privacy')) return 'privacy';
        if (path.includes('terms')) return 'terms';
        if (path.includes('support')) return 'support';
        if (path.includes('features')) return 'features';
        if (path.includes('pricing')) return 'pricing';
        if (path.includes('reviews')) return 'reviews';
        if (path.includes('download')) return 'download';
        if (path.includes('cookies')) return 'cookies';
        if (path.includes('gdpr')) return 'gdpr';
        if (path.includes('status')) return 'status';
        if (path.includes('404')) return '404';
        
        return 'index';
    },
    
    updatePageTitle() {
        const pageName = this.getCurrentPageName();
        const seoTitle = this.getSeoData('page_title');
        
        // Set page-specific titles
        if (pageName === 'dashboard') {
            document.title = `${this.t('docs_title')} - ScanUp`;
        } else if (pageName === 'contact') {
            document.title = `${this.t('contact_title')} - ScanUp`;
        } else if (pageName === 'faq') {
            document.title = `${this.t('faq_page_title')} - ScanUp`;
        } else if (pageName === 'privacy') {
            document.title = `${this.t('privacy_title')} - ScanUp`;
        } else if (pageName === 'terms') {
            document.title = `${this.t('terms_title')} - ScanUp`;
        } else if (pageName === 'support') {
            document.title = `${this.t('support_title')} - ScanUp`;
        } else if (pageName === 'features') {
            document.title = `${this.t('features_title')} - ScanUp`;
        } else if (pageName === 'pricing') {
            document.title = `${this.t('pricing_title')} - ScanUp`;
        } else if (pageName === 'reviews') {
            document.title = `${this.t('testimonials_title')} - ScanUp`;
        } else if (pageName === '404') {
            document.title = `${this.t('page_not_found')} - ScanUp`;
        } else {
            // Landing page - use full SEO title
            document.title = seoTitle;
        }
    },
    
    updateSEOMetaTags() {
        const seoDescription = this.getSeoData('meta_description');
        const ogTitle = this.getSeoData('og_title');
        const ogDescription = this.getSeoData('og_description');
        const lang = this.currentLang;
        
        // Update meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', seoDescription);
        } else {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            metaDesc.setAttribute('content', seoDescription);
            document.head.appendChild(metaDesc);
        }
        
        // Update language meta
        let metaLang = document.querySelector('meta[name="language"]');
        if (metaLang) {
            metaLang.setAttribute('content', this.languages.find(l => l.code === lang)?.name || 'English');
        }
        
        let httpLang = document.querySelector('meta[http-equiv="content-language"]');
        if (httpLang) {
            httpLang.setAttribute('content', lang);
        }
        
        // Update Open Graph tags
        let ogTitleMeta = document.querySelector('meta[property="og:title"]');
        if (ogTitleMeta) {
            ogTitleMeta.setAttribute('content', ogTitle);
        }
        
        let ogDescMeta = document.querySelector('meta[property="og:description"]');
        if (ogDescMeta) {
            ogDescMeta.setAttribute('content', ogDescription);
        }
        
        // Update og:locale
        const localeMap = {
            'en': 'en_US', 'de': 'de_DE', 'fr': 'fr_FR', 'es': 'es_ES',
            'tr': 'tr_TR', 'ru': 'ru_RU', 'it': 'it_IT', 'pt': 'pt_BR',
            'ar': 'ar_SA', 'zh': 'zh_CN', 'ja': 'ja_JP', 'ko': 'ko_KR',
            'nl': 'nl_NL', 'pl': 'pl_PL', 'hi': 'hi_IN'
        };
        let ogLocale = document.querySelector('meta[property="og:locale"]');
        if (ogLocale) {
            ogLocale.setAttribute('content', localeMap[lang] || 'en_US');
        }
        
        // Update og:url to include language
        let ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) {
            const pageUrl = this.getCanonicalUrl();
            ogUrl.setAttribute('content', pageUrl);
        }
        
        // Update Twitter card
        let twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) {
            twitterTitle.setAttribute('content', ogTitle);
        }
        
        let twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc) {
            twitterDesc.setAttribute('content', ogDescription);
        }
        
        let twitterUrl = document.querySelector('meta[name="twitter:url"]');
        if (twitterUrl) {
            twitterUrl.setAttribute('content', this.getCanonicalUrl());
        }
    },
    
    getCanonicalUrl() {
        const pageName = this.getCurrentPageName();
        const lang = this.currentLang;
        const baseUrl = this.BASE_URL;
        
        // Build canonical URL
        if (pageName === 'index') {
            return lang === 'en' ? `${baseUrl}/` : `${baseUrl}/${lang}/`;
        } else {
            return lang === 'en' ? `${baseUrl}/${pageName}` : `${baseUrl}/${lang}/${pageName}`;
        }
    },
    
    updateCanonicalAndHreflang() {
        const pageName = this.getCurrentPageName();
        const lang = this.currentLang;
        const baseUrl = this.BASE_URL;
        const canonicalUrl = this.getCanonicalUrl();
        
        // Update or create canonical link
        let canonicalLink = document.querySelector('link[rel="canonical"]');
        if (canonicalLink) {
            canonicalLink.setAttribute('href', canonicalUrl);
        } else {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            canonicalLink.setAttribute('href', canonicalUrl);
            document.head.appendChild(canonicalLink);
        }
        
        // Remove existing hreflang links
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
        
        // Add hreflang links for all supported languages
        this.languages.forEach(langInfo => {
            const hreflangLink = document.createElement('link');
            hreflangLink.setAttribute('rel', 'alternate');
            hreflangLink.setAttribute('hreflang', langInfo.code);
            
            // Build language-specific URL
            let langUrl;
            if (pageName === 'index') {
                langUrl = langInfo.code === 'en' ? `${baseUrl}/` : `${baseUrl}/${langInfo.code}/`;
            } else {
                langUrl = langInfo.code === 'en' ? `${baseUrl}/${pageName}` : `${baseUrl}/${langInfo.code}/${pageName}`;
            }
            
            hreflangLink.setAttribute('href', langUrl);
            document.head.appendChild(hreflangLink);
        });
        
        // Add x-default hreflang (points to English)
        const xDefaultLink = document.createElement('link');
        xDefaultLink.setAttribute('rel', 'alternate');
        xDefaultLink.setAttribute('hreflang', 'x-default');
        xDefaultLink.setAttribute('href', pageName === 'index' ? `${baseUrl}/` : `${baseUrl}/${pageName}`);
        document.head.appendChild(xDefaultLink);
    },
    
    updateSchemaOrgData() {
        const lang = this.currentLang;
        const seoData = this.seoData[lang] || this.seoData['en'];
        const baseUrl = this.BASE_URL;
        const canonicalUrl = this.getCanonicalUrl();
        
        // Update existing schema.org scripts
        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                
                // Update Organization schema
                if (data['@type'] === 'Organization') {
                    data.description = seoData.schema_org_description;
                    data.url = baseUrl;
                    script.textContent = JSON.stringify(data, null, 8);
                }
                
                // Update MobileApplication schema
                if (data['@type'] === 'MobileApplication') {
                    data.name = seoData.schema_app_name;
                    data.description = seoData.schema_app_description;
                    script.textContent = JSON.stringify(data, null, 8);
                }
                
                // Update WebSite schema
                if (data['@type'] === 'WebSite') {
                    data.description = seoData.schema_org_description;
                    data.url = baseUrl;
                    script.textContent = JSON.stringify(data, null, 8);
                }
                
                // Update FAQPage schema
                if (data['@type'] === 'FAQPage' && data.mainEntity) {
                    // Update FAQ questions and answers if we have them
                    if (seoData.faq_q1) {
                        const faqItems = [
                            { q: seoData.faq_q1, a: seoData.faq_a1 },
                            { q: seoData.faq_q2, a: seoData.faq_a2 },
                            { q: seoData.faq_q3, a: seoData.faq_a3 },
                            { q: seoData.faq_q4, a: seoData.faq_a4 },
                        ];
                        
                        // Update existing FAQ items (up to 4)
                        for (let i = 0; i < Math.min(faqItems.length, data.mainEntity.length); i++) {
                            if (faqItems[i].q && faqItems[i].a) {
                                data.mainEntity[i].name = faqItems[i].q;
                                data.mainEntity[i].acceptedAnswer.text = faqItems[i].a;
                            }
                        }
                        script.textContent = JSON.stringify(data, null, 8);
                    }
                }
                
                // Update BreadcrumbList schema with language
                if (data['@type'] === 'BreadcrumbList' && data.itemListElement) {
                    data.itemListElement.forEach(item => {
                        if (item.item && item.item.startsWith(baseUrl)) {
                            // Keep the URL but it's already correct for English
                            // For other languages, we'd need to adjust
                        }
                    });
                }
                
                // Update SoftwareApplication schema
                if (data['@type'] === 'SoftwareApplication') {
                    data.name = 'ScanUp';
                    data.description = seoData.schema_app_description;
                    script.textContent = JSON.stringify(data, null, 8);
                }
                
            } catch (e) {
                console.warn('Error updating schema.org data:', e);
            }
        });
    },
    
    applyTranslations() {
        const t = this.t.bind(this);
        const path = window.location.pathname;
        
        // Update HTML lang and dir
        document.documentElement.lang = this.currentLang;
        const isRTL = this.languages.find(l => l.code === this.currentLang)?.rtl;
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        
        // Apply data-i18n translations to all elements
        this.applyDataI18nTranslations();
        
        // Detect page type and apply specific translations
        if (path.includes('dashboard')) {
            this.applyDashboardTranslations();
        } else if (path.includes('contact')) {
            this.applyContactPageTranslations();
        } else if (path.includes('faq')) {
            this.applyFaqPageTranslations();
        } else if (path.includes('privacy')) {
            this.applyPrivacyPageTranslations();
        } else if (path.includes('terms')) {
            this.applyTermsPageTranslations();
        } else if (path.includes('support')) {
            this.applySupportPageTranslations();
        } else if (path.includes('404')) {
            this.apply404PageTranslations();
        } else if (path.includes('cookies')) {
            this.applyCookiesPageTranslations();
        } else if (path.includes('download')) {
            this.applyDownloadPageTranslations();
        } else if (path.includes('features')) {
            this.applyFeaturesPageTranslations();
        } else if (path.includes('gdpr')) {
            this.applyGdprPageTranslations();
        } else if (path.includes('pricing')) {
            this.applyPricingPageTranslations();
        } else if (path.includes('reviews')) {
            this.applyReviewsPageTranslations();
        } else if (path.includes('status')) {
            this.applyStatusPageTranslations();
        } else {
            this.applyLandingPageTranslations();
        }
        
        // Apply common translations (back link, footer, etc.)
        this.applyCommonTranslations();
    },
    
    // Universal data-i18n translation method
    applyDataI18nTranslations() {
        const t = this.t.bind(this);
        
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = t(key);
            if (translation && translation !== key) {
                el.textContent = translation;
            }
        });
        
        // Translate placeholders with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = t(key);
            if (translation && translation !== key) {
                el.setAttribute('placeholder', translation);
            }
        });
        
        // Translate titles with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = t(key);
            if (translation && translation !== key) {
                el.setAttribute('title', translation);
            }
        });
        
        // Translate aria-labels with data-i18n-aria attribute
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const translation = t(key);
            if (translation && translation !== key) {
                el.setAttribute('aria-label', translation);
            }
        });
    },
    
    applyCommonTranslations() {
        const t = this.t.bind(this);
        
        // Back to home links (various formats)
        document.querySelectorAll('.back-link, .back-btn, a[href="/"]').forEach(link => {
            const text = link.textContent.trim();
            if (text.includes('Back') || text.includes('Home') || text.includes('Ana Sayfa')) {
                const icon = link.querySelector('i');
                link.innerHTML = '';
                if (icon) {
                    link.appendChild(icon);
                    link.appendChild(document.createTextNode(' '));
                }
                link.appendChild(document.createTextNode(t('back_to_home')));
            }
        });
        
        // Footer copyright
        const footerCopyright = document.querySelector('.footer p, .footer-bottom p');
        if (footerCopyright) footerCopyright.textContent = t('copyright');
    },
    
    applyContactPageTranslations() {
        const t = this.t.bind(this);
        
        // Hero
        const heroTitle = document.querySelector('.hero h1');
        if (heroTitle) heroTitle.textContent = t('contact_title');
        const heroSubtitle = document.querySelector('.hero p');
        if (heroSubtitle) heroSubtitle.textContent = t('contact_subtitle');
        
        // Get in touch section
        const getInTouchTitle = document.querySelector('.contact-info h3');
        if (getInTouchTitle) getInTouchTitle.textContent = t('contact_get_in_touch');
        
        // Contact methods
        const methods = document.querySelectorAll('.contact-method h4');
        const methodKeys = ['contact_email_support', 'contact_live_chat', 'contact_help_center', 'contact_twitter'];
        methods.forEach((m, i) => {
            if (methodKeys[i]) m.textContent = t(methodKeys[i]);
        });
        
        // Form
        const formTitle = document.querySelector('.contact-form h3');
        if (formTitle) formTitle.textContent = t('contact_send_message');
        
        const labels = document.querySelectorAll('.form-group label');
        const labelKeys = ['contact_your_name', 'contact_email_address', 'contact_subject', 'contact_message'];
        labels.forEach((l, i) => {
            if (labelKeys[i]) l.textContent = t(labelKeys[i]);
        });
        
        const submitBtn = document.querySelector('.btn[type="submit"], .contact-form .btn');
        if (submitBtn) submitBtn.textContent = t('contact_send');
    },
    
    applyFaqPageTranslations() {
        const t = this.t.bind(this);
        
        const heroTitle = document.querySelector('.hero h1, .header h1');
        if (heroTitle) heroTitle.textContent = t('faq_page_title');
        const heroSubtitle = document.querySelector('.hero p, .header p');
        if (heroSubtitle) heroSubtitle.textContent = t('faq_page_subtitle');
        
        // Search
        const searchInput = document.querySelector('.search-input, input[type="search"]');
        if (searchInput) searchInput.placeholder = t('faq_search_placeholder');
        
        // Still have questions
        const stillQuestions = document.querySelector('.faq-cta h3, .still-questions');
        if (stillQuestions) stillQuestions.textContent = t('faq_still_questions');
    },
    
    applyPrivacyPageTranslations() {
        const t = this.t.bind(this);
        
        const heroTitle = document.querySelector('.header h1, .hero h1');
        if (heroTitle) heroTitle.textContent = t('privacy_title');
    },
    
    applyTermsPageTranslations() {
        const t = this.t.bind(this);
        
        const heroTitle = document.querySelector('.header h1, .hero h1');
        if (heroTitle) heroTitle.textContent = t('terms_title');
    },
    
    applySupportPageTranslations() {
        const t = this.t.bind(this);
        
        // Header
        const heroTitle = document.querySelector('.support-header h1, .hero h1, .header h1');
        if (heroTitle) heroTitle.textContent = t('support_title');
        const heroSubtitle = document.querySelector('.support-header p, .hero p, .header p');
        if (heroSubtitle) heroSubtitle.textContent = t('support_subtitle');
        
        const searchInput = document.querySelector('.search-input, input[type="search"]');
        if (searchInput) searchInput.placeholder = t('support_search_placeholder');
        
        // Back to home link
        const backLink = document.querySelector('.back-link, a[href="/"]');
        if (backLink && backLink.textContent.includes('Back')) {
            backLink.innerHTML = '<i class="fas fa-arrow-left"></i> ' + t('back_to_home');
        }
    },
    
    apply404PageTranslations() {
        const t = this.t.bind(this);
        
        const title = document.querySelector('.error-title, h1');
        if (title) title.textContent = t('page_not_found');
        
        const desc = document.querySelector('.error-desc, .error-message');
        if (desc) desc.textContent = t('page_not_found_desc');
        
        const homeBtn = document.querySelector('.btn-home, .go-home-btn');
        if (homeBtn) homeBtn.textContent = t('go_home');
    },
    
    applyCookiesPageTranslations() {
        const t = this.t.bind(this);
        // Cookies page is mostly static content, translate header/footer
    },
    
    applyDownloadPageTranslations() {
        const t = this.t.bind(this);
        
        const heroTitle = document.querySelector('.hero h1, h1');
        if (heroTitle) heroTitle.textContent = t('download_title');
        const heroSubtitle = document.querySelector('.hero p, .subtitle');
        if (heroSubtitle) heroSubtitle.textContent = t('download_subtitle');
    },
    
    applyFeaturesPageTranslations() {
        const t = this.t.bind(this);
        
        const heroTitle = document.querySelector('.hero h1, h1');
        if (heroTitle) heroTitle.textContent = t('features_title');
        const heroSubtitle = document.querySelector('.hero p, .subtitle');
        if (heroSubtitle) heroSubtitle.textContent = t('features_subtitle');
    },
    
    applyGdprPageTranslations() {
        const t = this.t.bind(this);
        // GDPR page is mostly static legal content
    },
    
    applyPricingPageTranslations() {
        const t = this.t.bind(this);
        
        const heroTitle = document.querySelector('.hero h1, h1');
        if (heroTitle) heroTitle.textContent = t('pricing_title');
        const heroSubtitle = document.querySelector('.hero p, .subtitle');
        if (heroSubtitle) heroSubtitle.textContent = t('pricing_subtitle');
    },
    
    applyReviewsPageTranslations() {
        const t = this.t.bind(this);
        
        const heroTitle = document.querySelector('.hero h1, h1');
        if (heroTitle) heroTitle.textContent = t('testimonials_title');
        const heroSubtitle = document.querySelector('.hero p, .subtitle');
        if (heroSubtitle) heroSubtitle.textContent = t('testimonials_subtitle');
    },
    
    applyStatusPageTranslations() {
        const t = this.t.bind(this);
        // Status page is mostly dynamic content
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

// Auto-initialize - handle both cases (DOMContentLoaded already fired or not)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ScanUpI18n.init());
} else {
    // DOM already loaded
    ScanUpI18n.init();
}

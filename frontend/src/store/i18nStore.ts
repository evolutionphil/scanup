import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';

// Get backend URL - prioritize environment variable, then config, then empty (relative path)
const getBackendUrl = () => {
  // Try process.env first (works in most cases)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL.replace(/\/$/, '');
  }
  
  // Try expo config extra
  const extraUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL;
  if (extraUrl) {
    return extraUrl.replace(/\/$/, '');
  }
  
  // Fallback to empty string (will use relative URLs)
  return '';
};

// Default English translations (fallback if API fails)
const DEFAULT_TRANSLATIONS: Record<string, string> = {
  // General
  app_name: "ScanUp",
  loading: "Loading...",
  please_wait: "Please wait",
  cancel: "Cancel",
  save: "Save",
  done: "Done",
  apply: "Apply",
  delete: "Delete",
  edit: "Edit",
  create: "Create",
  search: "Search",
  close: "Close",
  back: "Back",
  next: "Next",
  skip: "Skip",
  retry: "Retry",
  yes: "Yes",
  no: "No",
  ok: "OK",
  error: "Error",
  success: "Success",
  warning: "Warning",
  
  // Auth
  sign_in: "Sign In",
  sign_up: "Sign Up",
  sign_out: "Sign Out",
  logout: "Logout",
  create_account: "Create Account",
  welcome_back: "Welcome Back",
  sign_in_to_continue: "Sign in to continue",
  sign_up_to_get_started: "Sign up to get started",
  already_have_account: "Already have an account?",
  dont_have_account: "Don't have an account?",
  continue_with_google: "Continue with Google",
  email: "Email",
  password: "Password",
  full_name: "Full Name",
  confirm_password: "Confirm Password",
  enter_email: "Enter your email",
  enter_password: "Enter your password",
  enter_name: "Enter your name",
  create_password: "Create a password",
  confirm_your_password: "Confirm your password",
  forgot_password: "Forgot Password?",
  guest_mode: "Guest Mode",
  continue_as_guest: "Continue as Guest",
  
  // Documents
  documents: "Documents",
  my_documents: "My Documents",
  no_documents: "No Documents",
  no_documents_yet: "No Documents Yet",
  add_documents: "Add Documents",
  search_documents: "Search documents, tags, or text...",
  loading_documents: "Loading documents...",
  
  // Scanner
  scan: "Scan",
  camera: "Camera",
  gallery: "Gallery",
  auto_detect: "Auto Detect",
  capturing: "Capturing...",
  camera_permission_required: "Camera Permission Required",
  grant_permission: "Grant Permission",
  
  // Settings
  settings: "Settings",
  dark_mode: "Dark Mode",
  language: "Language",
  select_language: "Select Language",
  
  // Profile
  profile: "Profile",
  help_support: "Help & Support",
  privacy_policy: "Privacy Policy",
  terms_of_service: "Terms of Service",
};

interface I18nState {
  currentLanguage: string;
  translations: Record<string, string>;
  availableLanguages: string[];
  isLoading: boolean;
  lastFetched: number | null;
  
  // Actions
  setLanguage: (lang: string) => Promise<void>;
  fetchTranslations: (lang?: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  detectDeviceLanguage: () => string;
  initialize: () => Promise<void>;
}

export const useI18n = create<I18nState>()(
  persist(
    (set, get) => ({
      currentLanguage: 'en',
      translations: DEFAULT_TRANSLATIONS,
      availableLanguages: ['en'],
      isLoading: false,
      lastFetched: null,
      
      // Detect device language
      detectDeviceLanguage: () => {
        try {
          // Get device locale (e.g., 'en-US', 'de-DE', 'fr-FR')
          const locales = Localization.getLocales();
          if (locales && locales.length > 0) {
            // Get the language code (first part before '-')
            const langCode = locales[0].languageCode || 'en';
            return langCode.toLowerCase();
          }
        } catch (error) {
          console.log('Error detecting device language:', error);
        }
        return 'en';
      },
      
      // Initialize i18n - detect language and fetch translations
      initialize: async () => {
        const { detectDeviceLanguage, fetchTranslations, currentLanguage, lastFetched } = get();
        
        // Only fetch if not fetched in last hour
        const oneHour = 60 * 60 * 1000;
        const shouldFetch = !lastFetched || (Date.now() - lastFetched) > oneHour;
        
        if (shouldFetch) {
          // Use stored language or detect from device
          const lang = currentLanguage || detectDeviceLanguage();
          await fetchTranslations(lang);
        }
      },
      
      // Fetch translations from backend
      fetchTranslations: async (lang?: string) => {
        const { currentLanguage, detectDeviceLanguage } = get();
        const targetLang = lang || currentLanguage || detectDeviceLanguage();
        
        set({ isLoading: true });
        
        try {
          const backendUrl = getBackendUrl();
          // Updated to use new content API endpoint
          const response = await fetch(`${backendUrl}/api/content/translations/${targetLang}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            set({
              currentLanguage: data.language_code || targetLang,
              translations: { ...DEFAULT_TRANSLATIONS, ...data.translations },
              isLoading: false,
              lastFetched: Date.now(),
            });
            
            // Also fetch available languages from new endpoint
            try {
              const langResponse = await fetch(`${backendUrl}/api/content/languages`);
              if (langResponse.ok) {
                const langData = await langResponse.json();
                // Extract language codes from the language objects
                const langCodes = Array.isArray(langData) 
                  ? langData.map((l: any) => l.code || l) 
                  : ['en'];
                set({ availableLanguages: langCodes });
              }
            } catch (e) {
              // Ignore - not critical
              console.log('Error fetching languages list:', e);
            }
          } else {
            throw new Error('Failed to fetch translations');
          }
        } catch (error) {
          console.log('Error fetching translations, using defaults:', error);
          set({
            currentLanguage: targetLang,
            translations: DEFAULT_TRANSLATIONS,
            isLoading: false,
          });
        }
      },
      
      // Set language and fetch translations
      setLanguage: async (lang: string) => {
        set({ currentLanguage: lang });
        await get().fetchTranslations(lang);
      },
      
      // Translation function
      t: (key: string, fallback?: string) => {
        const { translations } = get();
        return translations[key] || fallback || key;
      },
    }),
    {
      name: 'i18n-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentLanguage: state.currentLanguage,
        translations: state.translations,
        availableLanguages: state.availableLanguages,
        lastFetched: state.lastFetched,
      }),
    }
  )
);

// Export a simple t function for convenience
export const t = (key: string, fallback?: string): string => {
  return useI18n.getState().t(key, fallback);
};

// Hook to initialize i18n on app start
export const useInitializeI18n = () => {
  const initialize = useI18n((state) => state.initialize);
  return initialize;
};

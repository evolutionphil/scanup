/**
 * Translation Store - Manages app translations from backend
 * Uses Zustand for state management and AsyncStorage for caching
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Language {
  code: string;
  name: string;
  native_name: string;
  is_default: boolean;
}

interface TranslationState {
  // Current language code
  currentLanguage: string;
  // Available languages
  languages: Language[];
  // Translations for current language
  translations: Record<string, string>;
  // Loading state
  isLoading: boolean;
  // Last update timestamp
  lastUpdated: string | null;
  // Error state
  error: string | null;
  
  // Actions
  setLanguage: (languageCode: string) => Promise<void>;
  fetchLanguages: () => Promise<void>;
  fetchTranslations: (languageCode: string) => Promise<void>;
  initializeTranslations: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Default translations fallback (for offline/error cases)
const DEFAULT_TRANSLATIONS: Record<string, string> = {
  app_name: "ScanUp",
  loading: "Loading...",
  error: "Error",
  success: "Success",
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  edit: "Edit",
  done: "Done",
  ok: "OK",
  yes: "Yes",
  no: "No",
  confirm: "Confirm",
  close: "Close",
  back: "Back",
  next: "Next",
  skip: "Skip",
  retry: "Retry",
  search: "Search",
  settings: "Settings",
  share: "Share",
  print: "Print",
};

const STORAGE_KEYS = {
  LANGUAGE: '@scanup_language',
  TRANSLATIONS: '@scanup_translations',
  LANGUAGES: '@scanup_languages',
  LAST_UPDATED: '@scanup_translations_updated',
};

export const useTranslationStore = create<TranslationState>((set, get) => ({
  currentLanguage: 'en',
  languages: [],
  translations: DEFAULT_TRANSLATIONS,
  isLoading: false,
  lastUpdated: null,
  error: null,

  // Initialize translations on app start
  initializeTranslations: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Load cached data first for instant display
      const cachedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
      const cachedTranslations = await AsyncStorage.getItem(STORAGE_KEYS.TRANSLATIONS);
      const cachedLanguages = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGES);
      
      if (cachedTranslations) {
        const parsedTranslations = JSON.parse(cachedTranslations);
        set({ 
          translations: { ...DEFAULT_TRANSLATIONS, ...parsedTranslations },
          currentLanguage: cachedLanguage || 'en'
        });
      }
      
      if (cachedLanguages) {
        set({ languages: JSON.parse(cachedLanguages) });
      }
      
      // Fetch fresh data from backend
      await get().fetchLanguages();
      await get().fetchTranslations(cachedLanguage || 'en');
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Error initializing translations:', error);
      set({ isLoading: false, error: 'Failed to load translations' });
    }
  },

  // Fetch available languages
  fetchLanguages: async () => {
    try {
      const response = await fetch(`${API_URL}/api/content/languages`);
      if (response.ok) {
        const languages = await response.json();
        set({ languages });
        await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGES, JSON.stringify(languages));
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
    }
  },

  // Fetch translations for a language
  fetchTranslations: async (languageCode: string) => {
    try {
      const response = await fetch(`${API_URL}/api/content/translations/${languageCode}`);
      if (response.ok) {
        const data = await response.json();
        const translations = data.translations || DEFAULT_TRANSLATIONS;
        
        set({ 
          translations: { ...DEFAULT_TRANSLATIONS, ...translations },
          currentLanguage: languageCode,
          lastUpdated: new Date().toISOString()
        });
        
        // Cache translations
        await AsyncStorage.setItem(STORAGE_KEYS.TRANSLATIONS, JSON.stringify(translations));
        await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, languageCode);
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString());
      }
    } catch (error) {
      console.error('Error fetching translations:', error);
    }
  },

  // Change language
  setLanguage: async (languageCode: string) => {
    try {
      set({ isLoading: true });
      await get().fetchTranslations(languageCode);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error setting language:', error);
      set({ isLoading: false, error: 'Failed to change language' });
    }
  },

  // Translation function with parameter support
  t: (key: string, params?: Record<string, string | number>): string => {
    const { translations } = get();
    let text = translations[key] || key;
    
    // Replace parameters like {count} with actual values
    if (params) {
      Object.keys(params).forEach((param) => {
        text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(params[param]));
      });
    }
    
    return text;
  },
}));

// Hook for easy access to translation function
export const useTranslation = () => {
  const t = useTranslationStore((state) => state.t);
  const currentLanguage = useTranslationStore((state) => state.currentLanguage);
  const languages = useTranslationStore((state) => state.languages);
  const setLanguage = useTranslationStore((state) => state.setLanguage);
  const isLoading = useTranslationStore((state) => state.isLoading);
  
  return { t, currentLanguage, languages, setLanguage, isLoading };
};

// Hook for legal pages content
export const useLegalContent = () => {
  const currentLanguage = useTranslationStore((state) => state.currentLanguage);
  
  const fetchLegalPage = async (pageType: 'terms' | 'privacy' | 'support'): Promise<string> => {
    try {
      // Check cache first
      const cacheKey = `@scanup_legal_${pageType}_${currentLanguage}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      // Fetch from backend
      const response = await fetch(`${API_URL}/api/content/legal/${pageType}?language_code=${currentLanguage}`);
      if (response.ok) {
        const data = await response.json();
        const content = data.content || '';
        
        // Cache the content
        await AsyncStorage.setItem(cacheKey, content);
        
        return content;
      }
      
      // Return cached if fetch fails
      return cached || '';
    } catch (error) {
      console.error(`Error fetching legal page ${pageType}:`, error);
      
      // Return cached on error
      const cacheKey = `@scanup_legal_${pageType}_${currentLanguage}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      return cached || '';
    }
  };
  
  return { fetchLegalPage, currentLanguage };
};

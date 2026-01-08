import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDocumentStore } from './documentStore';
import { usePurchaseStore } from './purchaseStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Storage keys
const TOKEN_KEY = 'scanup_token';
const USER_KEY = 'scanup_user';
const GUEST_KEY = 'scanup_is_guest';
const MIGRATED_KEY = 'scanup_docs_migrated';

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  subscription_type: string;
  is_premium: boolean;
  is_trial?: boolean;
  trial_days_remaining?: number;
  ocr_remaining_today: number;
  scans_remaining_today: number;
  scans_remaining_month: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: (sessionId: string) => Promise<void>;
  googleLoginNative: (idToken: string, googleUser: any) => Promise<void>;
  appleLogin: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  continueAsGuest: () => void;
  startTrial: () => Promise<void>;
  markDocumentsMigrated: () => Promise<void>;
  hasDocumentsMigrated: () => Promise<boolean>;
}

const getStorage = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    console.error('Storage get error:', e);
    return null;
  }
};

const setStorage = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (e) {
    console.error('Storage set error:', e);
  }
};

const removeStorage = async (key: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (e) {
    console.error('Storage remove error:', e);
  }
};

const guestUser: User = {
  user_id: 'guest',
  email: 'guest@local',
  name: 'Guest',
  subscription_type: 'free',
  is_premium: false,
  ocr_remaining_today: 3,
  scans_remaining_today: 10,
  scans_remaining_month: 100,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: false,

  login: async (email: string, password: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    
    // Clear guest mode and save credentials
    await removeStorage(GUEST_KEY);
    await setStorage(TOKEN_KEY, data.token);
    await setStorage(USER_KEY, JSON.stringify(data.user));
    
    set({ user: data.user, token: data.token, isAuthenticated: true, isGuest: false, isLoading: false });
  },

  register: async (email: string, password: string, name: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    
    // Clear guest mode and save credentials
    await removeStorage(GUEST_KEY);
    await setStorage(TOKEN_KEY, data.token);
    await setStorage(USER_KEY, JSON.stringify(data.user));
    
    set({ user: data.user, token: data.token, isAuthenticated: true, isGuest: false, isLoading: false });
  },

  googleLogin: async (sessionId: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Google login failed');
    }

    const data = await response.json();
    
    // Clear guest mode and save credentials
    await removeStorage(GUEST_KEY);
    await setStorage(TOKEN_KEY, data.token);
    await setStorage(USER_KEY, JSON.stringify(data.user));
    
    set({ user: data.user, token: data.token, isAuthenticated: true, isGuest: false, isLoading: false });
  },

  googleLoginNative: async (idToken: string, googleUser: any) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/google/native`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_token: idToken,
        email: googleUser.email,
        name: googleUser.name,
        photo: googleUser.photo,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Google login failed');
    }

    const data = await response.json();
    
    // Clear guest mode and save credentials
    await removeStorage(GUEST_KEY);
    await setStorage(TOKEN_KEY, data.token);
    await setStorage(USER_KEY, JSON.stringify(data.user));
    
    set({ user: data.user, token: data.token, isAuthenticated: true, isGuest: false, isLoading: false });
  },

  appleLogin: async (data: any) => {
    // Clear guest mode and save credentials
    await removeStorage(GUEST_KEY);
    await setStorage(TOKEN_KEY, data.token);
    await setStorage(USER_KEY, JSON.stringify(data.user));
    
    set({ user: data.user, token: data.token, isAuthenticated: true, isGuest: false, isLoading: false });
  },

  logout: async () => {
    const token = get().token;
    const wasGuest = get().isGuest;
    
    // CRITICAL: Set to guest state immediately to prevent null user causing infinite loops
    // Do NOT set user to null - always transition to guest state
    set({ user: guestUser, token: null, isAuthenticated: true, isGuest: true, isLoading: false });
    
    // Then clean up storage
    await removeStorage(TOKEN_KEY);
    await removeStorage(USER_KEY);
    await removeStorage(MIGRATED_KEY);
    await setStorage(GUEST_KEY, 'true');
    
    // ⭐ CRITICAL: Clear premium state on logout
    // This prevents premium status from persisting to next user
    try {
      await removeStorage('@scanup_is_premium');
      await removeStorage('@scanup_remove_watermark');
      await removeStorage('@scanup_active_sub');
      
      // Reset purchase store state
      usePurchaseStore.setState({ isPremium: false, hasRemovedWatermark: false });
      
      // Reset document store state (clears documents & sync flags)
      useDocumentStore.getState().resetForLogout();
      
      // Clear local documents cache for this user
      await AsyncStorage.removeItem('scanup_local_documents');
    } catch (e) {
      console.error('Error clearing state on logout:', e);
    }
    
    // If was logged in user, try to call logout API (non-blocking)
    if (token && !wasGuest) {
      try {
        fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {}); // Ignore errors
      } catch (e) {
        // Ignore logout API errors
      }
    }
  },

  loadStoredAuth: async () => {
    try {
      // Check if guest mode
      const isGuestStored = await getStorage(GUEST_KEY);
      if (isGuestStored === 'true') {
        set({ user: guestUser, isAuthenticated: true, isGuest: true, isLoading: false });
        return;
      }

      // Check for stored token
      const token = await getStorage(TOKEN_KEY);
      const userStr = await getStorage(USER_KEY);

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token, isAuthenticated: true, isGuest: false, isLoading: false });
          
          // Refresh user data in background
          get().refreshUser();
        } catch (parseError) {
          console.error('Failed to parse stored user:', parseError);
          // Clear corrupt data
          await removeStorage(TOKEN_KEY);
          await removeStorage(USER_KEY);
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error('Error loading auth:', e);
      set({ isLoading: false });
    }
  },

  updateUser: (user: User) => {
    set({ user });
    setStorage(USER_KEY, JSON.stringify(user));
  },

  refreshUser: async () => {
    const token = get().token;
    if (!token || get().isGuest) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const user = await response.json();
        set({ user });
        await setStorage(USER_KEY, JSON.stringify(user));
      } else if (response.status === 401) {
        // Token expired, logout
        await get().logout();
      }
    } catch (e) {
      console.error('Error refreshing user:', e);
    }
  },

  continueAsGuest: () => {
    set({ user: guestUser, isAuthenticated: true, isGuest: true, isLoading: false });
    setStorage(GUEST_KEY, 'true');
  },

  startTrial: async () => {
    const token = get().token;
    if (!token || get().isGuest) return;

    const response = await fetch(`${BACKEND_URL}/api/users/start-trial`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start trial');
    }

    const user = await response.json();
    set({ user });
    await setStorage(USER_KEY, JSON.stringify(user));
  },

  // Track if documents have been migrated for this user
  markDocumentsMigrated: async () => {
    const user = get().user;
    if (user && user.user_id !== 'guest') {
      await setStorage(`${MIGRATED_KEY}_${user.user_id}`, 'true');
    }
  },

  hasDocumentsMigrated: async () => {
    const user = get().user;
    if (user && user.user_id !== 'guest') {
      const migrated = await getStorage(`${MIGRATED_KEY}_${user.user_id}`);
      return migrated === 'true';
    }
    return false;
  },
}));

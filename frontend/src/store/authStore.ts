import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  subscription_type: string;
  is_premium: boolean;
  ocr_remaining_today: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const getStorage = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

const setStorage = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const removeStorage = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

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
    await setStorage('token', data.token);
    await setStorage('user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token, isAuthenticated: true });
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
    await setStorage('token', data.token);
    await setStorage('user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token, isAuthenticated: true });
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
    await setStorage('token', data.token);
    await setStorage('user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  logout: async () => {
    const token = get().token;
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.log('Logout API error:', e);
    }
    await removeStorage('token');
    await removeStorage('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await getStorage('token');
      const userStr = await getStorage('user');

      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, isLoading: false });
        // Refresh user data in background
        get().refreshUser();
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.log('Error loading auth:', e);
      set({ isLoading: false });
    }
  },

  updateUser: (user: User) => {
    set({ user });
    setStorage('user', JSON.stringify(user));
  },

  refreshUser: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const user = await response.json();
        set({ user });
        await setStorage('user', JSON.stringify(user));
      } else if (response.status === 401) {
        // Token expired
        await get().logout();
      }
    } catch (e) {
      console.log('Error refreshing user:', e);
    }
  },
}));

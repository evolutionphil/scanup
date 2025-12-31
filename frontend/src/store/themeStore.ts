import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

export const lightTheme = {
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceVariant: '#F1F5F9',
  primary: '#3B82F6',
  primaryVariant: '#2563EB',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  card: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
};

export const darkTheme = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceVariant: '#334155',
  primary: '#3B82F6',
  primaryVariant: '#60A5FA',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  card: '#1E293B',
  overlay: 'rgba(0,0,0,0.7)',
};

export type Theme = typeof darkTheme;

interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  theme: lightTheme,
  isDark: false,

  toggleTheme: () => {
    const newMode = get().mode === 'dark' ? 'light' : 'dark';
    set({
      mode: newMode,
      theme: newMode === 'dark' ? darkTheme : lightTheme,
      isDark: newMode === 'dark',
    });
    AsyncStorage.setItem('theme', newMode);
  },

  setTheme: (mode: ThemeMode) => {
    set({
      mode,
      theme: mode === 'dark' ? darkTheme : lightTheme,
      isDark: mode === 'dark',
    });
    AsyncStorage.setItem('theme', mode);
  },

  loadTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        set({
          mode: savedTheme,
          theme: savedTheme === 'dark' ? darkTheme : lightTheme,
          isDark: savedTheme === 'dark',
        });
      }
    } catch (e) {
      console.log('Error loading theme:', e);
    }
  },
}));

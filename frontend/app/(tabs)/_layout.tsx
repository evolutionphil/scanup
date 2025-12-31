import React, { useEffect } from 'react';
import { Tabs, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useI18n } from '../../src/store/i18nStore';
import OfflineIndicator from '../../src/components/OfflineIndicator';
import { create } from 'zustand';

// Global state for tab switching
interface TabState {
  activeMainTab: 'documents' | 'folders';
  setActiveMainTab: (tab: 'documents' | 'folders') => void;
}

export const useTabStore = create<TabState>((set) => ({
  activeMainTab: 'documents',
  setActiveMainTab: (tab) => set({ activeMainTab: tab }),
}));

// Scan button configuration
const SCAN_BUTTON_SIZE = 56;
const SCAN_BUTTON_OFFSET = 28;

export default function TabsLayout() {
  const { isAuthenticated, isLoading, isGuest } = useAuthStore();
  const { theme } = useThemeStore();
  const { setActiveMainTab } = useTabStore();
  const insets = useSafeAreaInsets();
  const hasRedirected = React.useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isGuest && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, isGuest]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated && !isGuest) {
    return null;
  }

  const bottomPadding = Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <OfflineIndicator />
      
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: '#FFFFFF',
              height: 56 + bottomPadding,
              paddingBottom: bottomPadding,
              borderTopWidth: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 10,
            },
          ],
          tabBarActiveTintColor: '#3E51FB',
          tabBarInactiveTintColor: '#A5A5A5',
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            ),
          }}
          listeners={{
            tabPress: () => {
              setActiveMainTab('documents');
            },
          }}
        />
        <Tabs.Screen
          name="folders"
          options={{
            title: 'Folders',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "folder" : "folder-outline"} size={22} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              // Prevent default navigation
              e.preventDefault();
              // Set the tab to folders
              setActiveMainTab('folders');
              // Navigate to home/index screen
              router.push('/(tabs)');
            },
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: '',
            tabBarIcon: () => (
              <View style={styles.scanButtonContainer}>
                <Image 
                  source={require('../../assets/images/scan-icon.png')} 
                  style={styles.scanButtonImage}
                  resizeMode="contain"
                />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              router.push('/scanner');
            },
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "search" : "search-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "settings" : "settings-outline"} size={22} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  scanButtonContainer: {
    position: 'absolute',
    top: -SCAN_BUTTON_OFFSET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonImage: {
    width: SCAN_BUTTON_SIZE,
    height: SCAN_BUTTON_SIZE,
  },
});

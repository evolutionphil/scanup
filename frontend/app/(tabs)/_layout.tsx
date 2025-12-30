import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import OfflineIndicator from '../../src/components/OfflineIndicator';

// Original tab bar - standard height
const SCAN_BUTTON_SIZE = 56;
const SCAN_BUTTON_OFFSET = 30; // How much scan icon floats above tab bar

export default function TabsLayout() {
  const { isAuthenticated, isLoading, isGuest } = useAuthStore();
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const hasRedirected = React.useRef(false);

  useEffect(() => {
    // Only redirect once if not authenticated and not a guest
    if (!isLoading && !isAuthenticated && !isGuest && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, isGuest]);

  // Allow guests and authenticated users
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated && !isGuest) {
    return null;
  }

  // Standard tab bar height with safe area
  const bottomPadding = Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Offline Mode Indicator */}
      <OfflineIndicator />
      
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: '#FFFFFF',
              height: 60 + bottomPadding, // Standard tab bar height
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
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="folders"
          options={{
            title: 'Folders',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "folder" : "folder-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: '',
            tabBarIcon: () => (
              <View style={styles.scanButtonContainer}>
                <View style={styles.scanButtonWrapper}>
                  <Image 
                    source={require('../../assets/images/scan-icon.png')} 
                    style={styles.scanButtonImage}
                    resizeMode="contain"
                  />
                </View>
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
              <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
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
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  scanButtonContainer: {
    position: 'absolute',
    top: -SCAN_BUTTON_OFFSET - 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButtonWrapper: {
    width: SCAN_BUTTON_SIZE,
    height: SCAN_BUTTON_SIZE,
    borderRadius: 16,
    backgroundColor: '#3E51FB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3E51FB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonImage: {
    width: 28,
    height: 28,
    tintColor: '#FFFFFF',
  },
});

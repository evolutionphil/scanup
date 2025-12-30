import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import OfflineIndicator from '../../src/components/OfflineIndicator';

// Figma design specs
const TAB_BAR_HEIGHT = 91;
const SCAN_BUTTON_SIZE = 56;  // Slightly larger for elevated effect
const SCAN_BUTTON_ELEVATION = 20; // How much button sits above tab bar

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

  // Calculate bottom safe area for proper padding
  const bottomPadding = Platform.OS === 'ios' ? insets.bottom : Math.max(insets.bottom, 8);
  const tabBarHeight = TAB_BAR_HEIGHT + bottomPadding;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Offline Mode Indicator - shows at top when offline */}
      <OfflineIndicator />
      
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: '#FFFFFF',
              height: tabBarHeight,
              paddingBottom: bottomPadding,
              // Figma shadow: 0px -9px 24px rgba(0, 0, 0, 0.07)
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -9 },
              shadowOpacity: 0.07,
              shadowRadius: 24,
              elevation: 10,
            },
          ],
          tabBarActiveTintColor: '#3E51FB',
          tabBarInactiveTintColor: '#A5A5A5',
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIconStyle: styles.tabBarIcon,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Documents',
            tabBarIcon: ({ color }) => (
              <Ionicons name="documents" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="folders"
          options={{
            title: 'Folders',
            tabBarIcon: ({ color }) => (
              <Ionicons name="folder" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: '',
            tabBarIcon: () => (
              <View style={styles.scanButtonContainer}>
                <View style={styles.scanButton}>
                  <Image 
                    source={require('../../assets/images/scan-icon-new.png')} 
                    style={styles.scanIcon}
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
            tabBarIcon: ({ color }) => (
              <Ionicons name="search" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <Ionicons name="person" size={24} color={color} />
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
    borderTopWidth: 0,
    paddingTop: 12,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  tabBarIcon: {
    marginTop: 0,
  },
  scanButtonContainer: {
    // Vertically centered in tab bar - no offset
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: SCAN_BUTTON_SIZE,
    height: SCAN_BUTTON_SIZE,
    borderRadius: 8,
    backgroundColor: '#3E51FB',
    justifyContent: 'center',
    alignItems: 'center',
    // Figma shadow: 0px 4px 4px rgba(62, 81, 251, 0.21)
    shadowColor: '#3E51FB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.21,
    shadowRadius: 4,
    elevation: 6,
  },
  scanIcon: {
    width: SCAN_ICON_SIZE,
    height: SCAN_ICON_SIZE,
    tintColor: '#FFFFFF',
  },
});

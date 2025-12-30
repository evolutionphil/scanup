import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import OfflineIndicator from '../../src/components/OfflineIndicator';

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

  // Calculate proper bottom padding for Android navigation bar
  const bottomPadding = Platform.OS === 'ios' ? 28 : Math.max(insets.bottom, 16);
  const tabBarHeight = Platform.OS === 'ios' ? 88 : 64 + insets.bottom;

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
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              height: tabBarHeight,
              paddingBottom: bottomPadding,
            },
          ],
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Documents',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="documents" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="folders"
          options={{
            title: 'Folders',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="folder" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: '',
            tabBarIcon: ({ focused }) => (
              <View style={styles.scanButtonContainer}>
                <Image 
                  source={require('../../assets/images/scan-icon-new.png')} 
                  style={styles.scanIconExact}
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
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
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
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanIcon: {
    width: 28,
    height: 28,
    tintColor: '#FFFFFF',
  },
  scanButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
  },
  scanIconExact: {
    width: 52,
    height: 52,
  },
});

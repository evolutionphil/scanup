import React, { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useThemeStore } from '../src/store/themeStore';
import { useI18n } from '../src/store/i18nStore';
import { initializeFirebase, setupPushNotifications, setUserContext } from '../src/services/firebase';
import { useAuthStore } from '../src/store/authStore';
import { usePurchaseStore } from '../src/store/purchaseStore';
import { useMonetizationStore } from '../src/store/monetizationStore';
import { useOfflineSync } from '../src/hooks/useOfflineSync';

export default function RootLayout() {
  const { theme, mode, loadTheme } = useThemeStore();
  const initializeI18n = useI18n((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const initializePurchases = usePurchaseStore((state) => state.initialize);
  const initializeMonetization = useMonetizationStore((state) => state.init);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadTheme();
      initializeI18n();
      
      // Initialize monetization store (tracks exports, ads, etc.)
      initializeMonetization();
      
      // Initialize on native platforms
      if (Platform.OS !== 'web') {
        // ⚠️ NO ADS INIT HERE - Ads will be initialized lazily after user action
        // This prevents iOS crash with New Architecture
        
        // 1️⃣ Initialize IAP - DELAYED for stability
        setTimeout(() => {
          initializePurchases()
            .then(() => {
              console.log('[RootLayout] IAP initialized successfully');
            })
            .catch(err => {
              console.log('[RootLayout] IAP init error (non-critical):', err);
            });
        }, 1500);
        
        // 2️⃣ Initialize Firebase services (Android only for now)
        if (Platform.OS === 'android') {
          initializeFirebase().then(() => {
            setupPushNotifications(user?.user_id).catch(err => {
              console.log('[RootLayout] Push notification setup error:', err);
            });
          }).catch(err => {
            console.log('[RootLayout] Firebase init error:', err);
          });
        }
      }
    }
  }, []);

  // Update user context when user changes
  useEffect(() => {
    if (Platform.OS !== 'web' && user && !user.is_guest) {
      setUserContext(user.user_id, user.email, user.is_premium).catch(err => {
        console.log('[RootLayout] Set user context error:', err);
      });
    }
  }, [user?.user_id, user?.is_premium]);

  return (
    <SafeAreaProvider style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="document/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="folder/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="edit-page" options={{ presentation: 'modal' }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

// iOS App Tracking Transparency izni
const requestTrackingPermission = async () => {
  if (Platform.OS !== 'ios') return;
  
  try {
    const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
    const { status } = await requestTrackingPermissionsAsync();
    console.log('[RootLayout] ATT permission status:', status);
  } catch (error) {
    console.log('[RootLayout] ATT not available:', error);
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

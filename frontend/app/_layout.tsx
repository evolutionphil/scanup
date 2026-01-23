import React, { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
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
import * as Notifications from 'expo-notifications';

// iOS App Tracking Transparency - must be called early
const requestTrackingPermission = async () => {
  if (Platform.OS !== 'ios') return;
  
  try {
    const { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } = await import('expo-tracking-transparency');
    
    // Check current status first
    const { status: currentStatus } = await getTrackingPermissionsAsync();
    console.log('[ATT] Current tracking status:', currentStatus);
    
    // Only request if not determined yet
    if (currentStatus === 'undetermined') {
      // Small delay to ensure app is fully loaded
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { status } = await requestTrackingPermissionsAsync();
      console.log('[ATT] Permission requested, new status:', status);
    }
  } catch (error) {
    console.log('[ATT] Error requesting tracking permission:', error);
  }
};

export default function RootLayout() {
  const { theme, mode, loadTheme } = useThemeStore();
  const initializeI18n = useI18n((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const initializePurchases = usePurchaseStore((state) => state.initialize);
  const initializeMonetization = useMonetizationStore((state) => state.init);
  const hasInitialized = useRef(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  
  // ⭐ OFFLINE SYNC - Automatically syncs when network is restored
  useOfflineSync();

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
        
        // 0️⃣ Request ATT permission FIRST (iOS requirement - must be before any tracking)
        if (Platform.OS === 'ios') {
          requestTrackingPermission();
        }
        
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
        
        // 2️⃣ Initialize Push Notifications (iOS and Android)
        if (Platform.OS === 'android') {
          // Android: Initialize Firebase first, then setup push
          initializeFirebase().then(() => {
            setupPushNotifications(user?.user_id).catch(err => {
              console.log('[RootLayout] Push notification setup error:', err);
            });
          }).catch(err => {
            console.log('[RootLayout] Firebase init error:', err);
          });
        } else if (Platform.OS === 'ios') {
          // iOS: Setup push notifications directly (uses APNs)
          setupPushNotifications(user?.user_id).catch(err => {
            console.log('[RootLayout] iOS Push notification setup error:', err);
          });
        }
        
        // 3️⃣ Setup notification listeners for web access requests
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          console.log('[RootLayout] Notification received:', notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('[RootLayout] Notification response:', response);
          const data = response.notification.request.content.data;
          
          // Handle web access request notification tap
          if (data?.type === 'web_access_request' || data?.screen === 'web-access') {
            console.log('[RootLayout] Navigating to web-access screen');
            router.push('/web-access');
          }
        });
        
        // 4️⃣ Check if app was opened from a notification (killed state)
        Notifications.getLastNotificationResponseAsync().then(response => {
          if (response) {
            console.log('[RootLayout] App opened from notification:', response);
            const data = response.notification.request.content.data;
            
            if (data?.type === 'web_access_request' || data?.screen === 'web-access') {
              console.log('[RootLayout] Navigating to web-access (from killed state)');
              // Small delay to ensure navigation is ready
              setTimeout(() => {
                router.push('/web-access');
              }, 500);
            }
          }
        });
      }
    }
    
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Update user context when user changes
  useEffect(() => {
    if (Platform.OS !== 'web' && user && !user.is_guest) {
      setUserContext(user.user_id, user.email, user.is_premium).catch(err => {
        console.log('[RootLayout] Set user context error:', err);
      });
      
      // ⭐ Sync premium status with backend user data
      if (user.is_premium || user.is_trial) {
        usePurchaseStore.getState().syncWithUser(true);
      }
    }
  }, [user?.user_id, user?.is_premium, user?.is_trial]);

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
        <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
        <Stack.Screen name="folder/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="edit-page" options={{ presentation: 'modal' }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
        <Stack.Screen name="web-access" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

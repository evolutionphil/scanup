// Central Firebase initialization service
// Firebase removed due to iOS build issues - all functions are NO-OP
import { Platform } from 'react-native';
import { initAnalytics } from './analytics';
import { initMessaging } from './messaging';
import { initCrashlytics, setUserId as setCrashlyticsUser, setAttributes as setCrashlyticsAttributes } from './crashlytics';

// Initialize all services (Firebase removed)
export const initializeFirebase = async () => {
  if (Platform.OS === 'web') {
    console.log('[Firebase] Skipping initialization on web');
    return;
  }
  
  console.log('[Firebase] Firebase SDK removed - using NO-OP implementations');
  
  try {
    await initAnalytics();
    await initCrashlytics();
    await initMessaging();
  } catch (error) {
    console.error('[Firebase] Init error:', error);
  }
};

// Setup push notifications - NO-OP
export const setupPushNotifications = async (userId?: string) => {
  console.log('[Firebase] Push notifications disabled');
  return null;
};

// Set user context - NO-OP
export const setUserContext = async (userId: string, email?: string, isPremium?: boolean) => {
  console.log(`[Firebase] User context (disabled): ${userId}`);
};

// Export all services
export * from './analytics';
export * from './crashlytics';
export * from './messaging';

// Central Firebase/Notification initialization service
// Using Expo Notifications instead of Firebase
import { Platform } from 'react-native';
import { initAnalytics } from './analytics';
import { initCrashlytics, setUserId as setCrashlyticsUser, setAttributes as setCrashlyticsAttributes } from './crashlytics';
import { initMessaging, getPushToken, setupNotificationHandlers, NotificationTopics, subscribeToTopic } from './messaging';

// Initialize all services
export const initializeFirebase = async () => {
  if (Platform.OS === 'web') {
    console.log('[Services] Skipping initialization on web');
    return;
  }
  
  console.log('[Services] Initializing services...');
  
  try {
    // Initialize Analytics (NO-OP for now)
    await initAnalytics();
    
    // Initialize Crashlytics (NO-OP for now)
    await initCrashlytics();
    
    // Initialize Expo Notifications
    await initMessaging();
    
    console.log('[Services] All services initialized');
  } catch (error) {
    console.error('[Services] Init error:', error);
  }
};

// Setup push notifications - call after user grants permission
export const setupPushNotifications = async (userId?: string) => {
  if (Platform.OS === 'web') {
    return null;
  }
  
  try {
    // Get Expo Push Token
    const pushToken = await getPushToken();
    
    if (pushToken) {
      console.log('[Services] Push token obtained');
      
      // Subscribe to all users topic (handled by backend)
      await subscribeToTopic(NotificationTopics.ALL_USERS);
      
      if (userId) {
        await subscribeToTopic(NotificationTopics.NEW_FEATURES);
      }
    }
    
    return pushToken;
  } catch (error) {
    console.error('[Services] Push notification setup error:', error);
    return null;
  }
};

// Set user context
export const setUserContext = async (userId: string, email?: string, isPremium?: boolean) => {
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    // Set user ID in Crashlytics (NO-OP)
    await setCrashlyticsUser(userId);
    
    // Set additional attributes (NO-OP)
    await setCrashlyticsAttributes({
      email: email || 'unknown',
      is_premium: isPremium ? 'true' : 'false',
    });
    
    // Subscribe to appropriate notification topics based on premium status
    if (isPremium) {
      await subscribeToTopic(NotificationTopics.PREMIUM_USERS);
    } else {
      await subscribeToTopic(NotificationTopics.FREE_USERS);
    }
    
    console.log('[Services] User context set');
  } catch (error) {
    console.error('[Services] Set user context error:', error);
  }
};

// Export all services
export * from './analytics';
export * from './crashlytics';
export * from './messaging';

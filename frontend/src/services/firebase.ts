// Central Firebase initialization service
import { Platform } from 'react-native';
import { initAnalytics } from './analytics';
import { initCrashlytics, setUserId as setCrashlyticsUser, setAttributes as setCrashlyticsAttributes } from './crashlytics';
import { initMessaging, requestNotificationPermission, getFCMToken, setupNotificationHandlers, subscribeToTopic, NotificationTopics } from './messaging';

// Initialize all Firebase services
export const initializeFirebase = async () => {
  if (Platform.OS === 'web') {
    console.log('[Firebase] Skipping initialization on web');
    return;
  }
  
  console.log('[Firebase] Initializing Firebase services...');
  
  try {
    // Initialize Analytics
    await initAnalytics();
    
    // Initialize Crashlytics
    await initCrashlytics();
    
    // Initialize Messaging
    await initMessaging();
    
    console.log('[Firebase] All Firebase services initialized');
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase services:', error);
  }
};

// Setup push notifications - call after user grants permission
export const setupPushNotifications = async (userId?: string) => {
  if (Platform.OS === 'web') {
    return null;
  }
  
  try {
    // Request permission
    const hasPermission = await requestNotificationPermission();
    
    if (!hasPermission) {
      console.log('[Firebase] Push notification permission denied');
      return null;
    }
    
    // Get FCM Token
    const fcmToken = await getFCMToken();
    
    if (fcmToken) {
      console.log('[Firebase] FCM Token obtained');
      
      // Subscribe to all users topic
      await subscribeToTopic(NotificationTopics.ALL_USERS);
      
      // Subscribe to appropriate topic based on user type
      if (userId) {
        await subscribeToTopic(NotificationTopics.NEW_FEATURES);
      }
    }
    
    return fcmToken;
  } catch (error) {
    console.error('[Firebase] Failed to setup push notifications:', error);
    return null;
  }
};

// Set user context for Crashlytics and Analytics
export const setUserContext = async (userId: string, email?: string, isPremium?: boolean) => {
  if (Platform.OS === 'web') {
    return;
  }
  
  try {
    // Set user ID in Crashlytics
    await setCrashlyticsUser(userId);
    
    // Set additional attributes
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
    
    console.log('[Firebase] User context set');
  } catch (error) {
    console.error('[Firebase] Failed to set user context:', error);
  }
};

// Export all services for direct access
export * from './analytics';
export * from './crashlytics';
export * from './messaging';

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase Cloud Messaging Service
let messaging: any = null;
let isInitialized = false;

const FCM_TOKEN_KEY = '@scanup_fcm_token';

// Check if Firebase Messaging is available
const isMessagingAvailable = () => {
  if (Platform.OS === 'web') return false;
  try {
    require.resolve('@react-native-firebase/messaging');
    return true;
  } catch {
    return false;
  }
};

// Initialize Messaging (call this at app startup)
export const initMessaging = async () => {
  if (Platform.OS === 'web') {
    console.log('[Messaging] Skipping on web platform');
    return;
  }
  
  if (isInitialized) {
    console.log('[Messaging] Already initialized');
    return;
  }
  
  if (!isMessagingAvailable()) {
    console.log('[Messaging] Firebase Messaging not available');
    isInitialized = true;
    return;
  }
  
  try {
    const firebaseMessaging = require('@react-native-firebase/messaging').default;
    messaging = firebaseMessaging();
    
    isInitialized = true;
    console.log('[Messaging] Firebase Messaging initialized');
    
  } catch (error) {
    console.error('[Messaging] Failed to initialize:', error);
    isInitialized = true;
  }
};

// Request notification permissions
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!messaging || Platform.OS === 'web') {
    console.log('[Messaging] Cannot request permission - not available');
    return false;
  }
  
  try {
    // iOS: Request permission through Firebase
    if (Platform.OS === 'ios') {
      const firebaseMessaging = require('@react-native-firebase/messaging').default;
      const authStatus = await firebaseMessaging().requestPermission();
      const enabled =
        authStatus === firebaseMessaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === firebaseMessaging.AuthorizationStatus.PROVISIONAL;
      
      console.log('[Messaging] iOS permission status:', authStatus, 'enabled:', enabled);
      return enabled;
    }
    
    // Android: Request POST_NOTIFICATIONS permission (API 33+)
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      const enabled = granted === PermissionsAndroid.RESULTS.GRANTED;
      console.log('[Messaging] Android permission status:', granted, 'enabled:', enabled);
      return enabled;
    }
    
    return false;
  } catch (error) {
    console.error('[Messaging] Failed to request permission:', error);
    return false;
  }
};

// Check current permission status
export const checkNotificationPermission = async (): Promise<boolean> => {
  if (!messaging || Platform.OS === 'web') {
    return false;
  }
  
  try {
    if (Platform.OS === 'ios') {
      const firebaseMessaging = require('@react-native-firebase/messaging').default;
      const authStatus = await firebaseMessaging().hasPermission();
      return authStatus === firebaseMessaging.AuthorizationStatus.AUTHORIZED ||
             authStatus === firebaseMessaging.AuthorizationStatus.PROVISIONAL;
    }
    
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted;
    }
    
    return false;
  } catch (error) {
    console.error('[Messaging] Failed to check permission:', error);
    return false;
  }
};

// Get FCM Token
export const getFCMToken = async (): Promise<string | null> => {
  if (!messaging || Platform.OS === 'web') {
    console.log('[Messaging] Cannot get token - not available');
    return null;
  }
  
  try {
    // Check if we already have a token stored
    const storedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    
    // Get fresh token from Firebase
    const token = await messaging.getToken();
    
    if (token) {
      // Store token if it's new or different
      if (token !== storedToken) {
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
        console.log('[Messaging] New FCM token stored');
      }
      console.log('[Messaging] FCM Token:', token.substring(0, 20) + '...');
      return token;
    }
    
    return storedToken;
  } catch (error) {
    console.error('[Messaging] Failed to get FCM token:', error);
    return null;
  }
};

// Delete FCM Token (useful for logout)
export const deleteFCMToken = async () => {
  if (!messaging || Platform.OS === 'web') {
    return;
  }
  
  try {
    await messaging.deleteToken();
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    console.log('[Messaging] FCM token deleted');
  } catch (error) {
    console.error('[Messaging] Failed to delete FCM token:', error);
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (message: any) => void) => {
  if (!messaging || Platform.OS === 'web') {
    return () => {};
  }
  
  return messaging.onMessage(callback);
};

// Listen for notification opened (when app is in background)
export const onNotificationOpened = (callback: (message: any) => void) => {
  if (!messaging || Platform.OS === 'web') {
    return () => {};
  }
  
  return messaging.onNotificationOpenedApp(callback);
};

// Get initial notification (when app was opened from killed state)
export const getInitialNotification = async () => {
  if (!messaging || Platform.OS === 'web') {
    return null;
  }
  
  try {
    const initialNotification = await messaging.getInitialNotification();
    return initialNotification;
  } catch (error) {
    console.error('[Messaging] Failed to get initial notification:', error);
    return null;
  }
};

// Subscribe to a topic
export const subscribeToTopic = async (topic: string) => {
  if (!messaging || Platform.OS === 'web') {
    console.log('[Messaging] Cannot subscribe - not available');
    return;
  }
  
  try {
    await messaging.subscribeToTopic(topic);
    console.log(`[Messaging] Subscribed to topic: ${topic}`);
  } catch (error) {
    console.error(`[Messaging] Failed to subscribe to topic ${topic}:`, error);
  }
};

// Unsubscribe from a topic
export const unsubscribeFromTopic = async (topic: string) => {
  if (!messaging || Platform.OS === 'web') {
    return;
  }
  
  try {
    await messaging.unsubscribeFromTopic(topic);
    console.log(`[Messaging] Unsubscribed from topic: ${topic}`);
  } catch (error) {
    console.error(`[Messaging] Failed to unsubscribe from topic ${topic}:`, error);
  }
};

// Topics for the app
export const NotificationTopics = {
  ALL_USERS: 'all_users',
  PREMIUM_USERS: 'premium_users',
  FREE_USERS: 'free_users',
  NEW_FEATURES: 'new_features',
  PROMOTIONS: 'promotions',
};

// Helper to show a simple notification alert (for foreground messages)
export const showNotificationAlert = (title: string, body: string, onPress?: () => void) => {
  Alert.alert(
    title,
    body,
    [
      { text: 'Dismiss', style: 'cancel' },
      ...(onPress ? [{ text: 'View', onPress }] : []),
    ],
    { cancelable: true }
  );
};

// Setup notification handlers - call this in your app entry
export const setupNotificationHandlers = (
  onForeground?: (message: any) => void,
  onBackground?: (message: any) => void
) => {
  if (!messaging || Platform.OS === 'web') {
    return () => {};
  }
  
  // Foreground handler
  const unsubscribeForeground = messaging.onMessage(async (remoteMessage: any) => {
    console.log('[Messaging] Foreground message:', remoteMessage);
    
    // Show alert for foreground messages
    if (remoteMessage.notification) {
      showNotificationAlert(
        remoteMessage.notification.title || 'New Message',
        remoteMessage.notification.body || '',
        onForeground ? () => onForeground(remoteMessage) : undefined
      );
    }
  });
  
  // Background/Quit handler
  const unsubscribeBackground = messaging.onNotificationOpenedApp((remoteMessage: any) => {
    console.log('[Messaging] Notification opened app:', remoteMessage);
    if (onBackground) {
      onBackground(remoteMessage);
    }
  });
  
  return () => {
    unsubscribeForeground();
    unsubscribeBackground();
  };
};

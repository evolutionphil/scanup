import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Helper to get auth token from correct storage
const getAuthToken = async (): Promise<string | null> => {
  try {
    // IMPORTANT: Must match the key used in authStore.ts
    const TOKEN_KEY = 'scanup_token';
    
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    console.error('[Notifications] Failed to get auth token:', e);
    return null;
  }
};

const PUSH_TOKEN_KEY = '@scanup_push_token';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Initialize notifications
export const initMessaging = async () => {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Skipping on web platform');
    return;
  }
  
  console.log('[Notifications] Expo Notifications initialized');
  
  // Set up notification channels for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90D9',
      sound: 'default',
    });
    
    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Promotions',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
    
    await Notifications.setNotificationChannelAsync('updates', {
      name: 'App Updates',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
};

// Request notification permissions
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }
  
  // Check if physical device (notifications don't work on simulators)
  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for push notifications');
    return false;
  }
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return false;
    }
    
    console.log('[Notifications] Permission granted');
    return true;
  } catch (error) {
    console.error('[Notifications] Permission request error:', error);
    return false;
  }
};

// Check current permission status
export const checkNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return false;
  }
  
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Notifications] Check permission error:', error);
    return false;
  }
};

// Get Expo Push Token
export const getPushToken = async (): Promise<string | null> => {
  console.log('[Notifications] getPushToken called, Platform:', Platform.OS);
  
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web platform, skipping push token');
    return null;
  }
  
  if (!Device.isDevice) {
    console.log('[Notifications] Push tokens require physical device');
    return null;
  }
  
  try {
    // Check permission first
    const hasPermission = await checkNotificationPermission();
    console.log('[Notifications] Has permission:', hasPermission);
    
    if (!hasPermission) {
      console.log('[Notifications] Requesting permission...');
      const granted = await requestNotificationPermission();
      console.log('[Notifications] Permission granted:', granted);
      if (!granted) {
        return null;
      }
    }
    
    // Get project ID from app config
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log('[Notifications] Project ID:', projectId);
    
    if (!projectId) {
      console.error('[Notifications] No project ID found in app config');
      console.log('[Notifications] Full expoConfig:', JSON.stringify(Constants.expoConfig?.extra));
      return null;
    }
    
    // Get Expo Push Token
    console.log('[Notifications] Getting Expo push token...');
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    const token = tokenData.data;
    console.log('[Notifications] Push token obtained:', token.substring(0, 40) + '...');
    
    // Store token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    
    // Save token to backend
    console.log('[Notifications] Saving token to backend...');
    const saved = await savePushTokenToBackend(token);
    console.log('[Notifications] Token saved to backend:', saved);
    
    return token;
  } catch (error) {
    console.error('[Notifications] Get push token error:', error);
    return null;
  }
};

// Save push token to backend
export const savePushTokenToBackend = async (token: string): Promise<boolean> => {
  try {
    const authToken = await getAuthToken();
    console.log('[Notifications] savePushTokenToBackend called');
    console.log('[Notifications] Push token to save:', token.substring(0, 40) + '...');
    console.log('[Notifications] Auth token available:', !!authToken, authToken ? authToken.substring(0, 20) + '...' : 'NONE');
    
    if (!authToken) {
      console.error('[Notifications] No auth token - cannot save push token');
      return false;
    }
    
    const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    console.log('[Notifications] Saving to API URL:', API_URL);
    
    const response = await fetch(`${API_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        push_token: token,
        device_type: Platform.OS,
        device_id: Device.osInternalBuildId || 'unknown',
      }),
    });

    console.log('[Notifications] Backend response status:', response.status);
    
    if (response.ok) {
      console.log('[Notifications] ✅ Push token saved to backend successfully!');
      return true;
    } else {
      const errorText = await response.text();
      console.error('[Notifications] ❌ Failed to save token to backend:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error('[Notifications] Save token to backend error:', error);
    return false;
  }
};

// Remove push token from backend (on logout)
export const removePushTokenFromBackend = async (): Promise<boolean> => {
  try {
    const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
    const response = await fetch(`${API_URL}/api/notifications/unregister-token`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
    });

    if (response.ok) {
      console.log('[Notifications] Push token removed from backend');
      return true;
    } else {
      console.error('[Notifications] Failed to remove token from backend:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Notifications] Remove token from backend error:', error);
    return false;
  }
};

// Delete/clear push token
export const deletePushToken = async () => {
  try {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    console.log('[Notifications] Push token cleared');
    
    // Also remove from backend
    await removePushTokenFromBackend();
  } catch (error) {
    console.error('[Notifications] Delete token error:', error);
  }
};

// Get stored push token
export const getStoredPushToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
};

// Add listener for foreground notifications
export const onForegroundNotification = (
  callback: (notification: Notifications.Notification) => void
) => {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return () => subscription.remove();
};

// Add listener for notification interactions (taps)
export const onNotificationResponse = (
  callback: (response: Notifications.NotificationResponse) => void
) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(callback);
  return () => subscription.remove();
};

// Get last notification response (when app opened from notification)
export const getLastNotificationResponse = async () => {
  return await Notifications.getLastNotificationResponseAsync();
};

// Schedule a local notification
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>,
  trigger?: Notifications.NotificationTriggerInput
) => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: trigger || null, // null = immediate
    });
    console.log('[Notifications] Scheduled notification:', id);
    return id;
  } catch (error) {
    console.error('[Notifications] Schedule error:', error);
    return null;
  }
};

// Cancel a scheduled notification
export const cancelNotification = async (notificationId: string) => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

// Cancel all notifications
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// Get badge count
export const getBadgeCount = async (): Promise<number> => {
  return await Notifications.getBadgeCountAsync();
};

// Set badge count
export const setBadgeCount = async (count: number) => {
  await Notifications.setBadgeCountAsync(count);
};

// Clear badge
export const clearBadge = async () => {
  await Notifications.setBadgeCountAsync(0);
};

// Show a simple notification alert
export const showNotificationAlert = (
  title: string,
  body: string,
  onPress?: () => void
) => {
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

// Setup notification handlers - call in app entry
export const setupNotificationHandlers = (
  onForeground?: (notification: Notifications.Notification) => void,
  onTap?: (response: Notifications.NotificationResponse) => void
) => {
  const subscriptions: (() => void)[] = [];
  
  if (onForeground) {
    subscriptions.push(onForegroundNotification(onForeground));
  }
  
  if (onTap) {
    subscriptions.push(onNotificationResponse(onTap));
  }
  
  // Return cleanup function
  return () => {
    subscriptions.forEach(unsub => unsub());
  };
};

// Notification Topics (for backend filtering)
export const NotificationTopics = {
  ALL_USERS: 'all_users',
  PREMIUM_USERS: 'premium_users',
  FREE_USERS: 'free_users',
  NEW_FEATURES: 'new_features',
  PROMOTIONS: 'promotions',
};

// Legacy aliases for compatibility
export const getFCMToken = getPushToken;
export const deleteFCMToken = deletePushToken;
export const subscribeToTopic = async (topic: string) => {
  console.log(`[Notifications] Topic subscription: ${topic} (handled by backend)`);
};
export const unsubscribeFromTopic = async (topic: string) => {
  console.log(`[Notifications] Topic unsubscription: ${topic} (handled by backend)`);
};
export const onNotificationOpened = onNotificationResponse;
export const getInitialNotification = getLastNotificationResponse;

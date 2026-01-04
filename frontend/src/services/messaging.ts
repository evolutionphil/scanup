import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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
  if (Platform.OS === 'web') {
    return null;
  }
  
  if (!Device.isDevice) {
    console.log('[Notifications] Push tokens require physical device');
    return null;
  }
  
  try {
    // Check permission first
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return null;
      }
    }
    
    // Get project ID from app config
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.error('[Notifications] No project ID found in app config');
      return null;
    }
    
    // Get Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    const token = tokenData.data;
    console.log('[Notifications] Push token:', token.substring(0, 30) + '...');
    
    // Store token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    
    // Save token to backend
    await savePushTokenToBackend(token);
    
    return token;
  } catch (error) {
    console.error('[Notifications] Get push token error:', error);
    return null;
  }
};

// Save push token to backend
export const savePushTokenToBackend = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AsyncStorage.getItem('@scanup_auth_token')}`,
      },
      body: JSON.stringify({
        push_token: token,
        device_type: Platform.OS,
        device_id: Device.osInternalBuildId || 'unknown',
      }),
    });

    if (response.ok) {
      console.log('[Notifications] Push token saved to backend');
      return true;
    } else {
      console.error('[Notifications] Failed to save token to backend:', response.status);
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
    const response = await fetch('/api/notifications/unregister-token', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await AsyncStorage.getItem('@scanup_auth_token')}`,
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

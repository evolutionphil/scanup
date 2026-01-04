import { Platform } from 'react-native';

// Messaging Service - Firebase removed due to iOS build issues
// This is a NO-OP implementation

export const initMessaging = async () => {
  console.log('[Messaging] Push notifications disabled - Firebase not available');
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  console.log('[Messaging] Permission request skipped - Firebase not available');
  return false;
};

export const checkNotificationPermission = async (): Promise<boolean> => {
  return false;
};

export const getFCMToken = async (): Promise<string | null> => {
  console.log('[Messaging] FCM Token not available - Firebase not installed');
  return null;
};

export const deleteFCMToken = async () => {
  // No-op
};

export const onForegroundMessage = (callback: (message: any) => void) => {
  return () => {}; // Return unsubscribe function
};

export const onNotificationOpened = (callback: (message: any) => void) => {
  return () => {};
};

export const getInitialNotification = async () => {
  return null;
};

export const subscribeToTopic = async (topic: string) => {
  console.log(`[Messaging] Topic subscription skipped: ${topic}`);
};

export const unsubscribeFromTopic = async (topic: string) => {
  // No-op
};

export const NotificationTopics = {
  ALL_USERS: 'all_users',
  PREMIUM_USERS: 'premium_users',
  FREE_USERS: 'free_users',
  NEW_FEATURES: 'new_features',
  PROMOTIONS: 'promotions',
};

export const showNotificationAlert = (title: string, body: string, onPress?: () => void) => {
  // No-op
};

export const setupNotificationHandlers = (
  onForeground?: (message: any) => void,
  onBackground?: (message: any) => void
) => {
  return () => {};
};

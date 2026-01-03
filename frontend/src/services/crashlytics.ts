import { Platform } from 'react-native';

// Firebase Crashlytics Service
let crashlytics: any = null;
let isInitialized = false;

// Check if Firebase Crashlytics is available
const isCrashlyticsAvailable = () => {
  if (Platform.OS === 'web') return false;
  try {
    require.resolve('@react-native-firebase/crashlytics');
    return true;
  } catch {
    return false;
  }
};

// Initialize Crashlytics (call this at app startup)
export const initCrashlytics = async () => {
  if (Platform.OS === 'web') {
    console.log('[Crashlytics] Skipping on web platform');
    return;
  }
  
  if (isInitialized) {
    console.log('[Crashlytics] Already initialized');
    return;
  }
  
  if (!isCrashlyticsAvailable()) {
    console.log('[Crashlytics] Firebase Crashlytics not available');
    isInitialized = true;
    return;
  }
  
  try {
    const firebaseCrashlytics = require('@react-native-firebase/crashlytics').default;
    crashlytics = firebaseCrashlytics();
    
    // Enable Crashlytics collection
    await crashlytics.setCrashlyticsCollectionEnabled(true);
    
    isInitialized = true;
    console.log('[Crashlytics] Firebase Crashlytics initialized successfully');
    
    // Log that app started
    crashlytics.log('App started');
  } catch (error) {
    console.error('[Crashlytics] Failed to initialize:', error);
    isInitialized = true;
  }
};

// Log a message for context in crash reports
export const log = (message: string) => {
  if (!crashlytics || Platform.OS === 'web') {
    console.log(`[Crashlytics] Log (not sent): ${message}`);
    return;
  }
  
  try {
    crashlytics.log(message);
  } catch (error) {
    console.error('[Crashlytics] Failed to log:', error);
  }
};

// Set user ID for crash reports
export const setUserId = async (userId: string) => {
  if (!crashlytics || Platform.OS === 'web') {
    console.log(`[Crashlytics] User ID (not sent): ${userId}`);
    return;
  }
  
  try {
    await crashlytics.setUserId(userId);
    console.log(`[Crashlytics] User ID set`);
  } catch (error) {
    console.error('[Crashlytics] Failed to set user ID:', error);
  }
};

// Set custom attributes for crash reports
export const setAttribute = async (key: string, value: string) => {
  if (!crashlytics || Platform.OS === 'web') {
    return;
  }
  
  try {
    await crashlytics.setAttribute(key, value);
  } catch (error) {
    console.error('[Crashlytics] Failed to set attribute:', error);
  }
};

// Set multiple attributes at once
export const setAttributes = async (attributes: Record<string, string>) => {
  if (!crashlytics || Platform.OS === 'web') {
    return;
  }
  
  try {
    await crashlytics.setAttributes(attributes);
  } catch (error) {
    console.error('[Crashlytics] Failed to set attributes:', error);
  }
};

// Record a non-fatal error
export const recordError = (error: Error, jsErrorName?: string) => {
  if (!crashlytics || Platform.OS === 'web') {
    console.error(`[Crashlytics] Error (not sent):`, error);
    return;
  }
  
  try {
    crashlytics.recordError(error, jsErrorName);
    console.log('[Crashlytics] Error recorded');
  } catch (err) {
    console.error('[Crashlytics] Failed to record error:', err);
  }
};

// Force a crash (for testing only!)
export const crash = () => {
  if (!crashlytics || Platform.OS === 'web') {
    console.warn('[Crashlytics] Crash not available on this platform');
    return;
  }
  
  crashlytics.crash();
};

// Check if Crashlytics collection is enabled
export const isCrashlyticsCollectionEnabled = (): boolean => {
  if (!crashlytics || Platform.OS === 'web') {
    return false;
  }
  
  return crashlytics.isCrashlyticsCollectionEnabled;
};

// Enable/Disable Crashlytics collection (for GDPR compliance)
export const setCrashlyticsCollectionEnabled = async (enabled: boolean) => {
  if (!crashlytics || Platform.OS === 'web') {
    return;
  }
  
  try {
    await crashlytics.setCrashlyticsCollectionEnabled(enabled);
    console.log(`[Crashlytics] Collection ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('[Crashlytics] Failed to set collection enabled:', error);
  }
};

// Helper to catch and record async errors
export const wrapAsync = <T>(
  asyncFn: () => Promise<T>,
  errorContext?: string
): Promise<T | undefined> => {
  return asyncFn().catch((error) => {
    log(`Error in ${errorContext || 'async operation'}`);
    recordError(error instanceof Error ? error : new Error(String(error)));
    return undefined;
  });
};

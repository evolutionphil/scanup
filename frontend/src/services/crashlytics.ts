import { Platform } from 'react-native';

// Firebase Crashlytics Service - TEMPORARILY DISABLED
// Crashlytics causes iOS build issues with modular headers
// TODO: Re-enable when Firebase fixes the Swift pod compatibility

let isInitialized = false;

// Initialize Crashlytics - NO-OP for now
export const initCrashlytics = async () => {
  console.log('[Crashlytics] Temporarily disabled due to iOS build issues');
  isInitialized = true;
};

// Log a message - NO-OP
export const log = (message: string) => {
  console.log(`[Crashlytics] Log (disabled): ${message}`);
};

// Set user ID - NO-OP
export const setUserId = async (userId: string) => {
  console.log(`[Crashlytics] User ID (disabled): ${userId}`);
};

// Set custom attributes - NO-OP
export const setAttribute = async (key: string, value: string) => {
  // Disabled
};

// Set multiple attributes - NO-OP
export const setAttributes = async (attributes: Record<string, string>) => {
  // Disabled
};

// Record a non-fatal error - Log to console only
export const recordError = (error: Error, jsErrorName?: string) => {
  console.error(`[Crashlytics] Error (disabled):`, error);
};

// Force a crash - NO-OP
export const crash = () => {
  console.warn('[Crashlytics] Crash disabled');
};

// Check if enabled - always false for now
export const isCrashlyticsCollectionEnabled = (): boolean => {
  return false;
};

// Enable/Disable - NO-OP
export const setCrashlyticsCollectionEnabled = async (enabled: boolean) => {
  console.log(`[Crashlytics] Collection toggle disabled`);
};

// Helper wrapper - just run the function
export const wrapAsync = <T>(
  asyncFn: () => Promise<T>,
  errorContext?: string
): Promise<T | undefined> => {
  return asyncFn().catch((error) => {
    console.error(`[Crashlytics] Error in ${errorContext || 'async operation'}:`, error);
    return undefined;
  });
};

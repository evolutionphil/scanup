import { Platform } from 'react-native';

// Analytics module - only works on native platforms
let analytics: any = null;

// Initialize analytics (call this at app startup)
export const initAnalytics = async () => {
  if (Platform.OS === 'web') {
    console.log('[Analytics] Skipping on web platform');
    return;
  }
  
  try {
    const firebaseAnalytics = require('@react-native-firebase/analytics').default;
    analytics = firebaseAnalytics();
    
    // Enable analytics collection
    await analytics.setAnalyticsCollectionEnabled(true);
    
    console.log('[Analytics] Firebase Analytics initialized');
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
};

// Log a custom event
export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  if (!analytics || Platform.OS === 'web') return;
  
  try {
    await analytics.logEvent(eventName, params);
    console.log(`[Analytics] Event logged: ${eventName}`, params);
  } catch (error) {
    console.error('[Analytics] Failed to log event:', error);
  }
};

// Log screen view
export const logScreenView = async (screenName: string, screenClass?: string) => {
  if (!analytics || Platform.OS === 'web') return;
  
  try {
    await analytics.logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    console.log(`[Analytics] Screen view: ${screenName}`);
  } catch (error) {
    console.error('[Analytics] Failed to log screen view:', error);
  }
};

// Set user ID for analytics
export const setUserId = async (userId: string | null) => {
  if (!analytics || Platform.OS === 'web') return;
  
  try {
    await analytics.setUserId(userId);
    console.log(`[Analytics] User ID set: ${userId ? 'logged in' : 'anonymous'}`);
  } catch (error) {
    console.error('[Analytics] Failed to set user ID:', error);
  }
};

// Set user properties
export const setUserProperties = async (properties: Record<string, string | null>) => {
  if (!analytics || Platform.OS === 'web') return;
  
  try {
    for (const [key, value] of Object.entries(properties)) {
      await analytics.setUserProperty(key, value);
    }
    console.log('[Analytics] User properties set');
  } catch (error) {
    console.error('[Analytics] Failed to set user properties:', error);
  }
};

// Pre-defined events for common actions
export const AnalyticsEvents = {
  // Scanning events
  SCAN_STARTED: 'scan_started',
  SCAN_COMPLETED: 'scan_completed',
  SCAN_CANCELLED: 'scan_cancelled',
  
  // Document events
  DOCUMENT_CREATED: 'document_created',
  DOCUMENT_OPENED: 'document_opened',
  DOCUMENT_DELETED: 'document_deleted',
  DOCUMENT_SHARED: 'document_shared',
  DOCUMENT_EXPORTED: 'document_exported',
  
  // Page events
  PAGE_ADDED: 'page_added',
  PAGE_DELETED: 'page_deleted',
  PAGE_EDITED: 'page_edited',
  FILTER_APPLIED: 'filter_applied',
  
  // OCR events
  OCR_STARTED: 'ocr_started',
  OCR_COMPLETED: 'ocr_completed',
  
  // Premium events
  PREMIUM_SCREEN_VIEWED: 'premium_screen_viewed',
  PURCHASE_STARTED: 'purchase_started',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_FAILED: 'purchase_failed',
  
  // Auth events
  LOGIN_STARTED: 'login_started',
  LOGIN_COMPLETED: 'login_completed',
  LOGIN_FAILED: 'login_failed',
  SIGNUP_COMPLETED: 'signup_completed',
  GUEST_MODE_ENTERED: 'guest_mode_entered',
  
  // Folder events
  FOLDER_CREATED: 'folder_created',
  FOLDER_DELETED: 'folder_deleted',
  
  // Settings events
  LANGUAGE_CHANGED: 'language_changed',
  THEME_CHANGED: 'theme_changed',
  
  // Ad events
  AD_SHOWN: 'ad_shown',
  AD_CLICKED: 'ad_clicked',
};

// Helper to log purchase events with proper parameters
export const logPurchaseEvent = async (
  eventType: 'started' | 'completed' | 'failed',
  productId: string,
  price?: number,
  currency?: string,
  errorMessage?: string
) => {
  if (!analytics || Platform.OS === 'web') return;
  
  try {
    const params: Record<string, any> = {
      product_id: productId,
    };
    
    if (price !== undefined) params.value = price;
    if (currency) params.currency = currency;
    if (errorMessage) params.error_message = errorMessage;
    
    const eventName = eventType === 'started' 
      ? AnalyticsEvents.PURCHASE_STARTED
      : eventType === 'completed'
        ? AnalyticsEvents.PURCHASE_COMPLETED
        : AnalyticsEvents.PURCHASE_FAILED;
    
    await analytics.logEvent(eventName, params);
    
    // Also log standard Firebase purchase event for completed purchases
    if (eventType === 'completed' && price !== undefined) {
      await analytics.logPurchase({
        value: price,
        currency: currency || 'EUR',
        items: [{ item_id: productId }],
      });
    }
  } catch (error) {
    console.error('[Analytics] Failed to log purchase event:', error);
  }
};

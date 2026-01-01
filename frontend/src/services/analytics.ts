import { Platform } from 'react-native';

// Analytics module - Firebase Analytics is auto-enabled via google-services.json
// This module provides helper functions for custom event tracking
// On native builds, Firebase SDK is automatically included and tracks basic events

// Initialize analytics (call this at app startup)
export const initAnalytics = async () => {
  if (Platform.OS === 'web') {
    console.log('[Analytics] Skipping on web platform');
    return;
  }
  
  console.log('[Analytics] Firebase Analytics auto-enabled via google-services.json');
  // Firebase Analytics is automatically initialized via google-services.json
  // Basic events like app_open, screen_view are tracked automatically
};

// Log a custom event - placeholder for future implementation
export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  if (Platform.OS === 'web') return;
  console.log(`[Analytics] Event: ${eventName}`, params);
  // Custom events can be logged when full Firebase SDK is properly integrated
};

// Log screen view
export const logScreenView = async (screenName: string, screenClass?: string) => {
  if (Platform.OS === 'web') return;
  console.log(`[Analytics] Screen view: ${screenName}`);
};

// Set user ID for analytics
export const setUserId = async (userId: string | null) => {
  if (Platform.OS === 'web') return;
  console.log(`[Analytics] User ID: ${userId ? 'logged in' : 'anonymous'}`);
};

// Set user properties
export const setUserProperties = async (properties: Record<string, string | null>) => {
  if (Platform.OS === 'web') return;
  console.log('[Analytics] User properties set');
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

// Helper to log purchase events
export const logPurchaseEvent = async (
  eventType: 'started' | 'completed' | 'failed',
  productId: string,
  price?: number,
  currency?: string,
  errorMessage?: string
) => {
  if (Platform.OS === 'web') return;
  
  const eventName = eventType === 'started' 
    ? AnalyticsEvents.PURCHASE_STARTED
    : eventType === 'completed'
      ? AnalyticsEvents.PURCHASE_COMPLETED
      : AnalyticsEvents.PURCHASE_FAILED;
  
  console.log(`[Analytics] Purchase event: ${eventName}`, { productId, price, currency, errorMessage });
};

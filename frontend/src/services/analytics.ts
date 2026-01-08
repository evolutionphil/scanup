import { Platform } from 'react-native';

// Analytics Service - Firebase removed due to iOS build issues
// This is a NO-OP implementation that logs to console instead

let isInitialized = false;

export const AnalyticsEvents = {
  PREMIUM_SCREEN_VIEWED: "PREMIUM_SCREEN_VIEWED"
}

export const initAnalytics = async () => {
  if (Platform.OS === 'web') {
    console.log('[Analytics] Skipping on web platform');
    return;
  }
  
  if (isInitialized) {
    return;
  }
  
  console.log('[Analytics] Analytics disabled - Firebase not available');
  isInitialized = true;
};

export const logPurchaseEvent = (type: string, ...params: any[]) => {
  console.log(`[Analytics] Type: ${type}`, params);
}

export const logScreenView = async (screenName: string, screenClass?: string) => {
  console.log(`[Analytics] Screen: ${screenName}`);
};

export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  console.log(`[Analytics] Event: ${eventName}`, params);
};

export const setUserId = async (userId: string | null) => {
  console.log(`[Analytics] User ID: ${userId}`);
};

export const setUserProperty = async (name: string, value: string | null) => {
  console.log(`[Analytics] User Property: ${name} = ${value}`);
};

export const logLogin = async (method: string) => {
  console.log(`[Analytics] Login: ${method}`);
};

export const logSignUp = async (method: string) => {
  console.log(`[Analytics] Sign Up: ${method}`);
};

export const logScanDocument = async (params?: { document_type?: string; page_count?: number }) => {
  console.log(`[Analytics] Scan Document`, params);
};

export const logExportDocument = async (params?: { format?: string; document_id?: string }) => {
  console.log(`[Analytics] Export Document`, params);
};

export const logShareDocument = async (params?: { method?: string; document_id?: string }) => {
  console.log(`[Analytics] Share Document`, params);
};

export const logPurchase = async (params?: {
  transaction_id?: string;
  value?: number;
  currency?: string;
  items?: any[];
}) => {
  console.log(`[Analytics] Purchase`, params);
};

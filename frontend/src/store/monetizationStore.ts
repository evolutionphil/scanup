/**
 * CENTRALIZED MONETIZATION STORE
 * 
 * Premium Value: "Unlimited, watermark-free, signed PDFs."
 * 
 * FREE FEATURES:
 * - Scan documents
 * - Crop & rotate
 * - Apply basic filters
 * - First PDF export (NO watermark)
 * - Folder organization
 * - Search
 * 
 * PREMIUM FEATURES:
 * - Remove watermark from ALL exports
 * - Unlimited PDF exports
 * - Add signature to documents
 * - Export high-quality PDFs
 * - Batch export
 * - No ads
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  EXPORT_COUNT: '@scanup_export_count',
  FIRST_INSTALL_DATE: '@scanup_first_install',
  ADS_SHOWN_THIS_SESSION: '@scanup_ads_session',
  WATERMARK_REMOVED: '@scanup_watermark_removed', // One-time purchase
};

// Premium value proposition - USE THIS EVERYWHERE
export const PREMIUM_VALUE_PROPOSITION = 'Unlimited, watermark-free, signed PDFs.';

// Export limits
export const FREE_EXPORT_LIMIT = 1; // First export is free

interface MonetizationState {
  // Export tracking
  exportCount: number;
  
  // One-time purchase: watermark removal (€2.99)
  hasRemovedWatermark: boolean;
  
  // Ads control
  adsShownThisSession: number;
  firstInstallDate: number | null;
  
  // Actions
  init: () => Promise<void>;
  incrementExportCount: () => Promise<number>;
  setWatermarkRemoved: (removed: boolean) => Promise<void>;
  incrementAdsShown: () => void;
  resetSession: () => void;
  
  // Checks
  canExportFree: () => boolean; // First export is free
  shouldShowPaywall: () => boolean; // After first export
  shouldShowWatermark: (isPremium: boolean) => boolean;
  canShowAd: (isPremium: boolean) => boolean;
  isWithin24HoursOfInstall: () => boolean;
}

export const useMonetizationStore = create<MonetizationState>((set, get) => ({
  exportCount: 0,
  hasRemovedWatermark: false,
  adsShownThisSession: 0,
  firstInstallDate: null,

  init: async () => {
    try {
      const [exportCountStr, installDateStr, watermarkStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.EXPORT_COUNT),
        AsyncStorage.getItem(STORAGE_KEYS.FIRST_INSTALL_DATE),
        AsyncStorage.getItem(STORAGE_KEYS.WATERMARK_REMOVED),
      ]);

      const exportCount = exportCountStr ? parseInt(exportCountStr, 10) : 0;
      let firstInstallDate = installDateStr ? parseInt(installDateStr, 10) : null;
      const hasRemovedWatermark = watermarkStr === 'true';

      // Set first install date if not set
      if (!firstInstallDate) {
        firstInstallDate = Date.now();
        await AsyncStorage.setItem(STORAGE_KEYS.FIRST_INSTALL_DATE, firstInstallDate.toString());
      }

      set({ exportCount, firstInstallDate, hasRemovedWatermark });
      console.log('[Monetization] Initialized:', { exportCount, firstInstallDate, hasRemovedWatermark });
    } catch (e) {
      console.error('[Monetization] Init error:', e);
    }
  },

  incrementExportCount: async () => {
    const newCount = get().exportCount + 1;
    set({ exportCount: newCount });
    await AsyncStorage.setItem(STORAGE_KEYS.EXPORT_COUNT, newCount.toString());
    console.log('[Monetization] Export count:', newCount);
    return newCount;
  },

  setWatermarkRemoved: async (removed: boolean) => {
    set({ hasRemovedWatermark: removed });
    await AsyncStorage.setItem(STORAGE_KEYS.WATERMARK_REMOVED, removed.toString());
    console.log('[Monetization] Watermark removed:', removed);
  },

  incrementAdsShown: () => {
    set({ adsShownThisSession: get().adsShownThisSession + 1 });
  },

  resetSession: () => {
    set({ adsShownThisSession: 0 });
  },

  // First export is ALWAYS free
  canExportFree: () => {
    return get().exportCount < FREE_EXPORT_LIMIT;
  },

  // Show paywall after first free export
  shouldShowPaywall: () => {
    return get().exportCount >= FREE_EXPORT_LIMIT;
  },

  // WATERMARK COMPLETELY DISABLED - Always return false
  // No watermarks for any user, regardless of premium status
  shouldShowWatermark: (isPremium: boolean) => {
    return false; // WATERMARK COMPLETELY DISABLED
  },

  // Ads logic:
  // - Premium users: NO ads
  // - First 24 hours: NO ads
  // - Max 1 ad per session
  // - Only after PDF export (not on first export)
  canShowAd: (isPremium: boolean) => {
    if (isPremium) return false;
    if (get().isWithin24HoursOfInstall()) return false;
    if (get().adsShownThisSession >= 1) return false;
    if (get().exportCount === 0) return false; // Not on first export
    return true;
  },

  isWithin24HoursOfInstall: () => {
    const { firstInstallDate } = get();
    if (!firstInstallDate) return true; // Assume yes if unknown
    const hoursSinceInstall = (Date.now() - firstInstallDate) / (1000 * 60 * 60);
    return hoursSinceInstall < 24;
  },
}));

// Paywall types
export type PaywallType = 'soft' | 'hard';
export type PaywallTrigger = 'export' | 'signature' | 'watermark_removal' | 'batch_export';

// Get paywall type based on trigger
export const getPaywallType = (trigger: PaywallTrigger): PaywallType => {
  switch (trigger) {
    case 'signature':
    case 'batch_export':
      return 'hard';
    default:
      return 'soft';
  }
};

// Get action-based copy for paywall
export const getPaywallCopy = (trigger: PaywallTrigger): { title: string; subtitle: string; buttonText: string } => {
  switch (trigger) {
    case 'export':
      return {
        title: 'Export without watermark',
        subtitle: PREMIUM_VALUE_PROPOSITION,
        buttonText: 'Remove watermark',
      };
    case 'signature':
      return {
        title: 'Sign your documents',
        subtitle: PREMIUM_VALUE_PROPOSITION,
        buttonText: 'Unlock signatures',
      };
    case 'watermark_removal':
      return {
        title: 'Remove watermark forever',
        subtitle: 'One-time purchase • €2.99',
        buttonText: 'Remove watermark',
      };
    case 'batch_export':
      return {
        title: 'Export multiple documents',
        subtitle: PREMIUM_VALUE_PROPOSITION,
        buttonText: 'Unlock batch export',
      };
    default:
      return {
        title: 'Go Premium',
        subtitle: PREMIUM_VALUE_PROPOSITION,
        buttonText: 'Upgrade now',
      };
  }
};

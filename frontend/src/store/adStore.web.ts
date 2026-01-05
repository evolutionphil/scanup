import { create } from 'zustand';

/**
 * Ad Store for Web - No-op implementation
 * Ads are not supported on web platform
 */

interface AdState {
  loaded: boolean;
  adsEnabled: boolean;
  scanCount: number;
  scansBetweenAds: number;
  
  initAdsAfterUserAction: () => Promise<void>;
  show: () => boolean;
  setAdsEnabled: (enabled: boolean) => void;
  incrementScanCount: () => boolean;
  resetScanCount: () => void;
}

export const useAdStore = create<AdState>((set, get) => ({
  loaded: false,
  adsEnabled: false, // Disabled on web
  scanCount: 0,
  scansBetweenAds: 3,

  initAdsAfterUserAction: async () => {
    console.log('[AdStore.web] Ads not available on web');
  },

  show: () => {
    console.log('[AdStore.web] Ads not available on web');
    return false;
  },

  setAdsEnabled: (enabled: boolean) => set({ adsEnabled: enabled }),
  
  incrementScanCount: () => {
    const { scanCount } = get();
    set({ scanCount: scanCount + 1 });
    return false; // Never show ads on web
  },
  
  resetScanCount: () => set({ scanCount: 0 }),
}));

// Legacy exports
export const showGlobalInterstitial = async (): Promise<boolean> => {
  console.log('[AdStore.web] Ads not available on web');
  return false;
};

export const incrementAndCheckAd = (): boolean => {
  return false;
};

export const initAdsAfterUserAction = async () => {
  console.log('[AdStore.web] Ads not available on web');
};

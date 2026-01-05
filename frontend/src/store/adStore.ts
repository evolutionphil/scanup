import { Platform } from 'react-native';
import { create } from 'zustand';

/* =========================
   AD UNIT IDS
========================= */
const AD_UNITS = {
  interstitial: {
    ios: 'ca-app-pub-8771434485570434/9099011184',
    android: 'ca-app-pub-8771434485570434/5877935563',
  },
  test: {
    interstitial: {
      ios: 'ca-app-pub-3940256099942544/4411468910',
      android: 'ca-app-pub-3940256099942544/1033173712',
    },
  },
};

// Get the correct ad unit ID
const getAdUnitId = () => {
  if (__DEV__) {
    return Platform.OS === 'ios' 
      ? AD_UNITS.test.interstitial.ios 
      : AD_UNITS.test.interstitial.android;
  }
  return Platform.OS === 'ios' 
    ? AD_UNITS.interstitial.ios 
    : AD_UNITS.interstitial.android;
};

/* =========================
   DYNAMIC IMPORT (Web safe)
========================= */
let InterstitialAd: any = null;
let AdEventType: any = null;
let interstitial: any = null;

if (Platform.OS !== 'web') {
  try {
    const ads = require('react-native-google-mobile-ads');
    InterstitialAd = ads.InterstitialAd;
    AdEventType = ads.AdEventType;
  } catch (e) {
    console.log('[AdStore] react-native-google-mobile-ads not available');
  }
}

/* =========================
   STORE
========================= */
interface AdState {
  loaded: boolean;
  adsEnabled: boolean;
  scanCount: number;
  scansBetweenAds: number;
  
  init: () => void;
  show: () => boolean;
  setAdsEnabled: (enabled: boolean) => void;
  incrementScanCount: () => boolean;
  resetScanCount: () => void;
}

export const useAdStore = create<AdState>((set, get) => ({
  loaded: false,
  adsEnabled: true,
  scanCount: 0,
  scansBetweenAds: 3,

  /* ---------- INIT ---------- */
  init: () => {
    if (Platform.OS === 'web' || !InterstitialAd || !AdEventType) {
      console.log('[AdStore] Skipping init - web or module not available');
      return;
    }

    console.log('[AdStore] Initializing interstitial...');
    const adUnitId = getAdUnitId();
    console.log('[AdStore] Ad Unit ID:', adUnitId);

    try {
      interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdStore] ✅ Interstitial LOADED');
        set({ loaded: true });
      });

      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdStore] Interstitial closed');
        set({ loaded: false });
        // 🔥 iOS CRITICAL: Reload after every show
        console.log('[AdStore] Reloading interstitial...');
        interstitial.load();
      });

      interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.log('[AdStore] ❌ Ad error:', error);
        set({ loaded: false });
        // Retry after delay
        setTimeout(() => {
          if (interstitial) {
            console.log('[AdStore] Retrying load...');
            interstitial.load();
          }
        }, 10000);
      });

      interstitial.load();
      console.log('[AdStore] ✅ Init complete, loading ad...');
    } catch (e) {
      console.error('[AdStore] Init error:', e);
    }
  },

  /* ---------- SHOW ---------- */
  show: () => {
    const { loaded, adsEnabled } = get();
    
    console.log('[AdStore] show() called - loaded:', loaded, 'adsEnabled:', adsEnabled);
    
    if (!loaded || !adsEnabled || !interstitial) {
      console.log('[AdStore] Cannot show - conditions not met');
      return false;
    }

    try {
      console.log('[AdStore] ✅ Showing interstitial NOW');
      interstitial.show();
      return true;
    } catch (e) {
      console.error('[AdStore] Show error:', e);
      return false;
    }
  },

  /* ---------- HELPERS ---------- */
  setAdsEnabled: (enabled: boolean) => set({ adsEnabled: enabled }),
  
  incrementScanCount: () => {
    const { scanCount, scansBetweenAds, adsEnabled, loaded } = get();
    const newCount = scanCount + 1;
    set({ scanCount: newCount });
    
    console.log('[AdStore] Scan count:', newCount, '/', scansBetweenAds);
    
    // Return true if should show ad
    if (newCount >= scansBetweenAds && adsEnabled && loaded) {
      return true;
    }
    return false;
  },
  
  resetScanCount: () => set({ scanCount: 0 }),
}));

/* =========================
   LEGACY EXPORTS (backwards compatibility)
========================= */
export const showGlobalInterstitial = async (): Promise<boolean> => {
  return useAdStore.getState().show();
};

export const incrementAndCheckAd = (): boolean => {
  return useAdStore.getState().incrementScanCount();
};

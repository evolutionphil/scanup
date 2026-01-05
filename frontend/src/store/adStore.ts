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

const getAdUnitId = () => {
  // Web doesn't have ads
  if (Platform.OS === 'web') return '';
  
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
   STATE
========================= */
let adsInitialized = false;
let interstitial: any = null;
let InterstitialAd: any = null;
let AdEventType: any = null;
let mobileAds: any = null;

/* =========================
   STORE
========================= */
interface AdState {
  loaded: boolean;
  adsEnabled: boolean;
  scanCount: number;
  scansBetweenAds: number;
  
  // 🔥 LAZY INIT - only called after user interaction
  initAdsAfterUserAction: () => Promise<void>;
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

  /* ---------- LAZY INIT (CRITICAL FOR iOS) ---------- */
  initAdsAfterUserAction: async () => {
    // Skip if already initialized or on web
    if (adsInitialized || Platform.OS === 'web') {
      console.log('[AdStore] Skip init - already done or web');
      return;
    }

    console.log('[AdStore] 🚀 Starting LAZY ads initialization...');

    try {
      // Dynamic import to avoid startup crash
      const adsModule = require('react-native-google-mobile-ads');
      mobileAds = adsModule.default;
      InterstitialAd = adsModule.InterstitialAd;
      AdEventType = adsModule.AdEventType;

      // iOS: Request ATT and consent FIRST
      if (Platform.OS === 'ios') {
        console.log('[AdStore] iOS: Requesting consent...');
        try {
          const { AdsConsent } = adsModule;
          await AdsConsent.requestInfoUpdate();
          console.log('[AdStore] iOS: Consent info updated');
        } catch (consentError) {
          console.log('[AdStore] iOS: Consent error (continuing):', consentError);
        }
      }

      // Initialize Mobile Ads SDK
      console.log('[AdStore] Initializing mobileAds SDK...');
      await mobileAds().initialize();
      console.log('[AdStore] ✅ mobileAds SDK initialized');

      // Create and load interstitial
      const adUnitId = getAdUnitId();
      console.log('[AdStore] Creating interstitial with ID:', adUnitId);
      
      interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdStore] ✅ Interstitial LOADED');
        set({ loaded: true });
      });

      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdStore] Interstitial closed, reloading...');
        set({ loaded: false });
        // 🔥 iOS CRITICAL: Reload after every show
        if (interstitial) {
          interstitial.load();
        }
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
      adsInitialized = true;
      console.log('[AdStore] ✅ LAZY init complete');
    } catch (error) {
      console.error('[AdStore] ❌ Init error:', error);
    }
  },

  /* ---------- SHOW ---------- */
  show: () => {
    const { loaded, adsEnabled } = get();
    
    console.log('[AdStore] show() - loaded:', loaded, 'adsEnabled:', adsEnabled, 'initialized:', adsInitialized);
    
    if (!loaded || !adsEnabled || !interstitial || !adsInitialized) {
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
    if (newCount >= scansBetweenAds && adsEnabled) {
      return true;
    }
    return false;
  },
  
  resetScanCount: () => set({ scanCount: 0 }),
}));

/* =========================
   LEGACY EXPORTS
========================= */
export const showGlobalInterstitial = async (): Promise<boolean> => {
  return useAdStore.getState().show();
};

export const incrementAndCheckAd = (): boolean => {
  return useAdStore.getState().incrementScanCount();
};

// 🔥 Export for lazy init
export const initAdsAfterUserAction = async () => {
  return useAdStore.getState().initAdsAfterUserAction();
};

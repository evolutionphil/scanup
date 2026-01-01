import { create } from 'zustand';
import { Platform } from 'react-native';

// Ad Unit IDs
const AD_UNIT_IDS = {
  interstitial: {
    ios: 'ca-app-pub-8771434485570434/9099011184',
    android: 'ca-app-pub-8771434485570434/5877935563',
  },
  // Test IDs for development
  test: {
    interstitial: {
      ios: 'ca-app-pub-3940256099942544/4411468910',
      android: 'ca-app-pub-3940256099942544/1033173712',
    },
  },
};

// Get the appropriate ad unit ID based on platform
export const getInterstitialAdUnitId = (useTestAds: boolean = false): string => {
  if (useTestAds) {
    return Platform.OS === 'ios' 
      ? AD_UNIT_IDS.test.interstitial.ios 
      : AD_UNIT_IDS.test.interstitial.android;
  }
  return Platform.OS === 'ios' 
    ? AD_UNIT_IDS.interstitial.ios 
    : AD_UNIT_IDS.interstitial.android;
};

interface AdState {
  // Track scan count for showing interstitial ads
  scanCount: number;
  lastAdShownAt: number | null;
  isAdLoaded: boolean;
  isAdShowing: boolean;
  
  // Settings
  adsEnabled: boolean; // Only false for premium users
  scansBetweenAds: number; // Show ad every N scans
  
  // Actions
  incrementScanCount: () => void;
  resetScanCount: () => void;
  setAdLoaded: (loaded: boolean) => void;
  setAdShowing: (showing: boolean) => void;
  setAdsEnabled: (enabled: boolean) => void;
  shouldShowAd: () => boolean;
  recordAdShown: () => void;
  // Combined action: increment and check if should show
  incrementAndCheckAd: () => boolean;
}

export const useAdStore = create<AdState>((set, get) => ({
  scanCount: 0,
  lastAdShownAt: null,
  isAdLoaded: false,
  isAdShowing: false,
  adsEnabled: true,
  scansBetweenAds: 3, // Show interstitial every 3 scans
  
  incrementScanCount: () => {
    const newCount = get().scanCount + 1;
    console.log('[AdStore] Incrementing scan count to:', newCount);
    set({ scanCount: newCount });
  },
  
  resetScanCount: () => {
    set({ scanCount: 0 });
  },
  
  setAdLoaded: (loaded: boolean) => {
    console.log('[AdStore] Ad loaded:', loaded);
    set({ isAdLoaded: loaded });
  },
  
  setAdShowing: (showing: boolean) => {
    set({ isAdShowing: showing });
  },
  
  setAdsEnabled: (enabled: boolean) => {
    console.log('[AdStore] Ads enabled:', enabled);
    set({ adsEnabled: enabled });
  },
  
  shouldShowAd: () => {
    const { scanCount, scansBetweenAds, adsEnabled, isAdLoaded, lastAdShownAt } = get();
    
    console.log('[AdStore] shouldShowAd check:', { scanCount, scansBetweenAds, adsEnabled, isAdLoaded, lastAdShownAt });
    
    // Don't show ads if disabled (premium users)
    if (!adsEnabled) {
      console.log('[AdStore] Ads disabled - skipping');
      return false;
    }
    
    // Don't show if ad not loaded
    if (!isAdLoaded) {
      console.log('[AdStore] Ad not loaded - skipping');
      return false;
    }
    
    // Don't show ads too frequently (minimum 30 seconds between ads)
    if (lastAdShownAt && Date.now() - lastAdShownAt < 30000) {
      console.log('[AdStore] Too soon since last ad - skipping');
      return false;
    }
    
    // Show ad every N scans
    const shouldShow = scanCount > 0 && scanCount % scansBetweenAds === 0;
    console.log('[AdStore] Should show ad:', shouldShow, `(${scanCount} % ${scansBetweenAds} = ${scanCount % scansBetweenAds})`);
    return shouldShow;
  },
  
  recordAdShown: () => {
    console.log('[AdStore] Recording ad shown');
    set({ 
      lastAdShownAt: Date.now(),
      isAdLoaded: false, // Ad needs to be reloaded after showing
    });
  },
  
  // Combined action to avoid race conditions
  incrementAndCheckAd: () => {
    const state = get();
    const newCount = state.scanCount + 1;
    set({ scanCount: newCount });
    
    console.log('[AdStore] incrementAndCheckAd:', { 
      newCount, 
      adsEnabled: state.adsEnabled, 
      isAdLoaded: state.isAdLoaded 
    });
    
    // Don't show if disabled or not loaded
    if (!state.adsEnabled || !state.isAdLoaded) {
      return false;
    }
    
    // Don't show too frequently
    if (state.lastAdShownAt && Date.now() - state.lastAdShownAt < 30000) {
      return false;
    }
    
    // Show ad every N actions
    return newCount > 0 && newCount % state.scansBetweenAds === 0;
  },
}));

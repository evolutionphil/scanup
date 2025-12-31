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
}

export const useAdStore = create<AdState>((set, get) => ({
  scanCount: 0,
  lastAdShownAt: null,
  isAdLoaded: false,
  isAdShowing: false,
  adsEnabled: true,
  scansBetweenAds: 3, // Show interstitial every 3 scans
  
  incrementScanCount: () => {
    set((state) => ({ scanCount: state.scanCount + 1 }));
  },
  
  resetScanCount: () => {
    set({ scanCount: 0 });
  },
  
  setAdLoaded: (loaded: boolean) => {
    set({ isAdLoaded: loaded });
  },
  
  setAdShowing: (showing: boolean) => {
    set({ isAdShowing: showing });
  },
  
  setAdsEnabled: (enabled: boolean) => {
    set({ adsEnabled: enabled });
  },
  
  shouldShowAd: () => {
    const { scanCount, scansBetweenAds, adsEnabled, isAdLoaded, lastAdShownAt } = get();
    
    // Don't show ads if disabled (premium users)
    if (!adsEnabled) return false;
    
    // Don't show if ad not loaded
    if (!isAdLoaded) return false;
    
    // Don't show ads too frequently (minimum 30 seconds between ads)
    if (lastAdShownAt && Date.now() - lastAdShownAt < 30000) return false;
    
    // Show ad every N scans
    return scanCount > 0 && scanCount % scansBetweenAds === 0;
  },
  
  recordAdShown: () => {
    set({ 
      lastAdShownAt: Date.now(),
      isAdLoaded: false, // Ad needs to be reloaded after showing
    });
  },
}));

import React, { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAdStore, getInterstitialAdUnitId } from '../store/adStore';
import { useAuthStore } from '../store/authStore';

// Flag to check if we're in a native environment
const isNativeEnvironment = Platform.OS !== 'web';

// Dynamically import mobile ads only on native platforms
let mobileAds: any = null;
let InterstitialAd: any = null;
let AdEventType: any = null;

if (isNativeEnvironment) {
  try {
    const mobileAdsModule = require('react-native-google-mobile-ads');
    mobileAds = mobileAdsModule.default;
    InterstitialAd = mobileAdsModule.InterstitialAd;
    AdEventType = mobileAdsModule.AdEventType;
  } catch (e) {
    console.log('[AdManager] Mobile ads not available:', e);
  }
}

// Use test ads in development
const USE_TEST_ADS = __DEV__;

interface AdManagerProps {
  children: React.ReactNode;
}

export const AdManager: React.FC<AdManagerProps> = ({ children }) => {
  const interstitialRef = useRef<any>(null);
  const { setAdLoaded, setAdShowing, setAdsEnabled, recordAdShown } = useAdStore();
  const { user } = useAuthStore();
  
  // Initialize mobile ads SDK
  useEffect(() => {
    const initializeAds = async () => {
      if (!isNativeEnvironment || !mobileAds) {
        console.log('[AdManager] Skipping ads initialization (web or not available)');
        return;
      }
      
      try {
        await mobileAds().initialize();
        console.log('[AdManager] Mobile ads initialized successfully');
        loadInterstitialAd();
      } catch (error) {
        console.error('[AdManager] Failed to initialize mobile ads:', error);
      }
    };
    
    initializeAds();
    
    return () => {
      // Cleanup
      if (interstitialRef.current) {
        interstitialRef.current = null;
      }
    };
  }, []);
  
  // Update ads enabled based on user premium status
  useEffect(() => {
    const isPremium = user?.is_premium || user?.is_trial;
    setAdsEnabled(!isPremium);
    console.log('[AdManager] Ads enabled:', !isPremium);
  }, [user?.is_premium, user?.is_trial, setAdsEnabled]);
  
  // Load interstitial ad
  const loadInterstitialAd = useCallback(() => {
    if (!isNativeEnvironment || !InterstitialAd) {
      console.log('[AdManager] Cannot load ad (web or not available)');
      return;
    }
    
    try {
      const adUnitId = getInterstitialAdUnitId(USE_TEST_ADS);
      console.log('[AdManager] Loading interstitial ad:', adUnitId);
      
      const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });
      
      interstitial.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdManager] Interstitial ad loaded');
        setAdLoaded(true);
      });
      
      interstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
        console.log('[AdManager] Interstitial ad error:', error);
        setAdLoaded(false);
        // Retry loading after error (with delay)
        setTimeout(loadInterstitialAd, 30000);
      });
      
      interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdManager] Interstitial ad closed');
        setAdShowing(false);
        recordAdShown();
        // Load the next ad
        loadInterstitialAd();
      });
      
      interstitial.addAdEventListener(AdEventType.OPENED, () => {
        console.log('[AdManager] Interstitial ad opened');
        setAdShowing(true);
      });
      
      interstitialRef.current = interstitial;
      interstitial.load();
    } catch (error) {
      console.error('[AdManager] Error creating interstitial:', error);
    }
  }, [setAdLoaded, setAdShowing, recordAdShown]);
  
  return <>{children}</>;
};

// Hook to show interstitial ad
export const useShowInterstitialAd = () => {
  const { shouldShowAd, isAdLoaded } = useAdStore();
  
  const showAd = useCallback(async (): Promise<boolean> => {
    if (!isNativeEnvironment) {
      console.log('[useShowInterstitialAd] Skipping ad on web');
      return false;
    }
    
    if (!shouldShowAd()) {
      console.log('[useShowInterstitialAd] Should not show ad');
      return false;
    }
    
    if (!isAdLoaded) {
      console.log('[useShowInterstitialAd] Ad not loaded');
      return false;
    }
    
    try {
      // Get the interstitial from the global ref
      // This is a simplified approach - in production you might want to use a more robust solution
      console.log('[useShowInterstitialAd] Attempting to show ad');
      return true;
    } catch (error) {
      console.error('[useShowInterstitialAd] Error showing ad:', error);
      return false;
    }
  }, [shouldShowAd, isAdLoaded]);
  
  return { showAd };
};

// Export a function to show ad that can be called from anywhere
let globalInterstitial: any = null;

export const initializeGlobalInterstitial = () => {
  if (!isNativeEnvironment || !InterstitialAd) return;
  
  const adUnitId = getInterstitialAdUnitId(USE_TEST_ADS);
  globalInterstitial = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });
  
  globalInterstitial.addAdEventListener(AdEventType.LOADED, () => {
    console.log('[Global] Interstitial loaded');
  });
  
  globalInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
    console.log('[Global] Interstitial closed, reloading...');
    globalInterstitial.load();
  });
  
  globalInterstitial.load();
};

export const showGlobalInterstitial = async (): Promise<boolean> => {
  if (!globalInterstitial) {
    console.log('[Global] No interstitial available');
    return false;
  }
  
  try {
    await globalInterstitial.show();
    return true;
  } catch (error) {
    console.log('[Global] Could not show interstitial:', error);
    return false;
  }
};

export default AdManager;

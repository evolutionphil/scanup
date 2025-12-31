import React, { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAdStore, getInterstitialAdUnitId } from '../store/adStore';
import { useAuthStore } from '../store/authStore';

// Flag to check if we're in a native environment
const isNativeEnvironment = Platform.OS !== 'web';

// Use test ads in development
const USE_TEST_ADS = __DEV__;

interface AdManagerProps {
  children: React.ReactNode;
}

// Global interstitial reference
let globalInterstitial: any = null;
let mobileAdsInitialized = false;

export const AdManager: React.FC<AdManagerProps> = ({ children }) => {
  const { setAdLoaded, setAdShowing, setAdsEnabled, recordAdShown } = useAdStore();
  const { user } = useAuthStore();
  
  // Initialize mobile ads SDK on native platforms only
  useEffect(() => {
    const initializeAds = async () => {
      if (!isNativeEnvironment) {
        console.log('[AdManager] Skipping ads initialization (web platform)');
        return;
      }
      
      if (mobileAdsInitialized) {
        console.log('[AdManager] Already initialized');
        return;
      }
      
      try {
        // Dynamically require mobile ads only on native
        const mobileAdsModule = require('react-native-google-mobile-ads');
        const mobileAds = mobileAdsModule.default;
        const InterstitialAd = mobileAdsModule.InterstitialAd;
        const AdEventType = mobileAdsModule.AdEventType;
        
        await mobileAds().initialize();
        console.log('[AdManager] Mobile ads initialized successfully');
        mobileAdsInitialized = true;
        
        // Initialize global interstitial
        const adUnitId = getInterstitialAdUnitId(USE_TEST_ADS);
        console.log('[AdManager] Creating interstitial with ID:', adUnitId);
        
        globalInterstitial = InterstitialAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });
        
        globalInterstitial.addAdEventListener(AdEventType.LOADED, () => {
          console.log('[AdManager] Interstitial ad loaded');
          setAdLoaded(true);
        });
        
        globalInterstitial.addAdEventListener(AdEventType.ERROR, (error: any) => {
          console.log('[AdManager] Interstitial ad error:', error);
          setAdLoaded(false);
          // Retry loading after error
          setTimeout(() => {
            if (globalInterstitial) {
              globalInterstitial.load();
            }
          }, 30000);
        });
        
        globalInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
          console.log('[AdManager] Interstitial ad closed');
          setAdShowing(false);
          recordAdShown();
          // Reload for next time
          if (globalInterstitial) {
            globalInterstitial.load();
          }
        });
        
        globalInterstitial.addAdEventListener(AdEventType.OPENED, () => {
          console.log('[AdManager] Interstitial ad opened');
          setAdShowing(true);
        });
        
        globalInterstitial.load();
      } catch (error) {
        console.log('[AdManager] Mobile ads not available:', error);
      }
    };
    
    initializeAds();
  }, [setAdLoaded, setAdShowing, recordAdShown]);
  
  // Update ads enabled based on user premium status
  useEffect(() => {
    const isPremium = user?.is_premium || user?.is_trial;
    setAdsEnabled(!isPremium);
    console.log('[AdManager] Ads enabled:', !isPremium);
  }, [user?.is_premium, user?.is_trial, setAdsEnabled]);
  
  return <>{children}</>;
};

// Export function to show interstitial ad
export const showGlobalInterstitial = async (): Promise<boolean> => {
  if (!isNativeEnvironment) {
    console.log('[showGlobalInterstitial] Skipping on web');
    return false;
  }
  
  if (!globalInterstitial) {
    console.log('[showGlobalInterstitial] No interstitial available');
    return false;
  }
  
  try {
    await globalInterstitial.show();
    return true;
  } catch (error) {
    console.log('[showGlobalInterstitial] Could not show:', error);
    return false;
  }
};

// Export function to initialize global interstitial (called from native code if needed)
export const initializeGlobalInterstitial = () => {
  // This is now handled internally by AdManager
  console.log('[initializeGlobalInterstitial] Called - handled by AdManager');
};

export default AdManager;

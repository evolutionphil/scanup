import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAdStore } from '../store/adStore';
import { useAuthStore } from '../store/authStore';

// Flag to check if we're in a native environment
const isNativeEnvironment = Platform.OS !== 'web';

interface AdManagerProps {
  children: React.ReactNode;
}

// Global interstitial reference - only used on native
let globalInterstitial: any = null;
let mobileAdsInitialized = false;

export const AdManager: React.FC<AdManagerProps> = ({ children }) => {
  const { setAdLoaded, setAdShowing, setAdsEnabled, recordAdShown } = useAdStore();
  const { user } = useAuthStore();
  
  // Update ads enabled based on user premium status
  useEffect(() => {
    const isPremium = user?.is_premium || user?.is_trial;
    setAdsEnabled(!isPremium);
    console.log('[AdManager] Ads enabled:', !isPremium);
  }, [user?.is_premium, user?.is_trial, setAdsEnabled]);
  
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
        // Dynamically require mobile ads
        const mobileAdsModule = require('react-native-google-mobile-ads');
        const mobileAds = mobileAdsModule.default;
        const { InterstitialAd, AdEventType } = mobileAdsModule;
        
        console.log('[AdManager] Initializing Google Mobile Ads...');
        await mobileAds().initialize();
        console.log('[AdManager] Google Mobile Ads initialized successfully');
        mobileAdsInitialized = true;
        
        // Create interstitial ad
        const adUnitId = Platform.OS === 'ios' 
          ? 'ca-app-pub-8771434485570434/9099011184'
          : 'ca-app-pub-8771434485570434/5877935563';
        
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
        });
        
        globalInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
          console.log('[AdManager] Interstitial ad closed');
          setAdShowing(false);
          recordAdShown();
          // Reload for next time
          setTimeout(() => {
            if (globalInterstitial) {
              globalInterstitial.load();
            }
          }, 1000);
        });
        
        globalInterstitial.addAdEventListener(AdEventType.OPENED, () => {
          console.log('[AdManager] Interstitial ad opened');
          setAdShowing(true);
        });
        
        // Load the first ad
        globalInterstitial.load();
      } catch (error) {
        console.log('[AdManager] Failed to initialize ads:', error);
        // Don't crash the app if ads fail to initialize
        mobileAdsInitialized = true; // Prevent retry loops
      }
    };
    
    // Delay initialization to allow app to fully load first
    const timer = setTimeout(initializeAds, 2000);
    return () => clearTimeout(timer);
  }, [setAdLoaded, setAdShowing, recordAdShown]);
  
  return <>{children}</>;
};

// Export function to show interstitial ad
export const showGlobalInterstitial = async (): Promise<boolean> => {
  if (!isNativeEnvironment) {
    console.log('[showGlobalInterstitial] Skipping on web');
    return false;
  }
  
  if (!globalInterstitial) {
    console.log('[showGlobalInterstitial] Interstitial not available');
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

// Export function to initialize global interstitial
export const initializeGlobalInterstitial = () => {
  console.log('[initializeGlobalInterstitial] Handled by AdManager');
};

export default AdManager;

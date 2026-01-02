import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useAdStore } from '../store/adStore';
import { useAuthStore } from '../store/authStore';
import { usePurchaseStore } from '../store/purchaseStore';

interface AdManagerProps {
  children: React.ReactNode;
}

// Check if native environment
const isNativeEnvironment = Platform.OS !== 'web';

// Track if component is mounted to prevent state updates on unmounted component
let isMounted = false;

// Ad Unit IDs
const AD_UNITS = {
  interstitial: {
    android: 'ca-app-pub-8771434485570434/5877935563',
    ios: 'ca-app-pub-8771434485570434/9099011184',
  },
  test: {
    interstitial: {
      android: 'ca-app-pub-3940256099942544/1033173712',
      ios: 'ca-app-pub-3940256099942544/4411468910',
    },
  },
};

// Global state
let globalInterstitial: any = null;
let isSDKInitialized = false;
let isInitializing = false;
let mobileAdsModule: any = null;

// Lazy load the ads module only on native
const getAdsModule = () => {
  if (!isNativeEnvironment) return null;
  if (mobileAdsModule) return mobileAdsModule;
  
  try {
    mobileAdsModule = require('react-native-google-mobile-ads');
    return mobileAdsModule;
  } catch (e) {
    console.log('[AdManager] Failed to load ads module:', e);
    return null;
  }
};

/**
 * AdManager Component - Handles Google Mobile Ads
 * Only loads native ads module on iOS/Android, not on web
 */
export const AdManager: React.FC<AdManagerProps> = ({ children }) => {
  const setAdLoaded = useAdStore((state) => state.setAdLoaded);
  const setAdShowing = useAdStore((state) => state.setAdShowing);
  const setAdsEnabled = useAdStore((state) => state.setAdsEnabled);
  const recordAdShown = useAdStore((state) => state.recordAdShown);
  
  const user = useAuthStore((state) => state.user);
  
  const isPremium = usePurchaseStore((state) => state.isPremium);
  const hasRemovedAds = usePurchaseStore((state) => state.hasRemovedAds);
  const initializePurchases = usePurchaseStore((state) => state.initialize);
  
  const [sdkReady, setSdkReady] = useState(false);
  const [purchasesInitialized, setPurchasesInitialized] = useState(false);
  const [adsStatusSet, setAdsStatusSet] = useState(false);

  // Initialize purchase store (only once on mount)
  useEffect(() => {
    if (!purchasesInitialized) {
      setPurchasesInitialized(true);
      initializePurchases().catch(err => {
        console.log('[AdManager] Purchase init error:', err);
      });
    }
  }, [purchasesInitialized]);

  // Update ads enabled based on premium status (only when values actually change)
  useEffect(() => {
    // Don't run until purchases are initialized
    if (!purchasesInitialized) return;
    
    // Calculate if ads should be disabled
    const isUserPremium = user?.is_premium === true || user?.is_trial === true;
    const shouldDisableAds = isUserPremium || isPremium || hasRemovedAds;
    
    console.log('[AdManager] Ads check - premium:', isUserPremium, 'isPremium:', isPremium, 'hasRemovedAds:', hasRemovedAds);
    
    // Only update if we haven't set it yet or if there's a real change
    if (!adsStatusSet) {
      setAdsEnabled(!shouldDisableAds);
      setAdsStatusSet(true);
    }
  }, [purchasesInitialized, user?.is_premium, user?.is_trial, isPremium, hasRemovedAds, adsStatusSet]);

  // Initialize SDK
  const initializeSDK = useCallback(async () => {
    if (!isNativeEnvironment) {
      console.log('[AdManager] Skipping - web platform');
      return;
    }

    if (isSDKInitialized || isInitializing) return;

    isInitializing = true;

    try {
      // Initialize Firebase FIRST (required for AdMob/Firebase integration)
      try {
        const firebaseApp = require('@react-native-firebase/app').default;
        if (!firebaseApp.apps.length) {
          console.log('[AdManager] Firebase not initialized, initializing...');
          // Firebase auto-initializes from google-services.json
        } else {
          console.log('[AdManager] Firebase already initialized');
        }
        
        // Initialize Firebase Analytics
        const analytics = require('@react-native-firebase/analytics').default;
        await analytics().setAnalyticsCollectionEnabled(true);
        console.log('[AdManager] Firebase Analytics enabled');
      } catch (firebaseError) {
        console.log('[AdManager] Firebase init (non-critical):', firebaseError);
      }

      // Now initialize AdMob
      const adsModule = getAdsModule();
      if (!adsModule) {
        console.log('[AdManager] Ads module not available');
        return;
      }
      
      const mobileAds = adsModule.default;
      console.log('[AdManager] Initializing AdMob SDK...');
      
      await mobileAds().initialize();
      
      console.log('[AdManager] AdMob SDK initialized');
      isSDKInitialized = true;
      setSdkReady(true);
      
      loadInterstitial();
    } catch (error) {
      console.error('[AdManager] SDK init failed:', error);
      isInitializing = false;
    }
  }, []);

  // Load interstitial
  const loadInterstitial = useCallback(() => {
    if (!isNativeEnvironment || !isSDKInitialized) return;

    try {
      const adsModule = getAdsModule();
      if (!adsModule) return;
      
      const { InterstitialAd, AdEventType } = adsModule;
      
      const adUnitId = __DEV__ 
        ? (Platform.OS === 'ios' ? AD_UNITS.test.interstitial.ios : AD_UNITS.test.interstitial.android)
        : (Platform.OS === 'ios' ? AD_UNITS.interstitial.ios : AD_UNITS.interstitial.android);
      
      console.log('[AdManager] Loading interstitial:', adUnitId);
      
      globalInterstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubscribeLoaded = globalInterstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log('[AdManager] Interstitial loaded');
          setAdLoaded(true);
        }
      );

      const unsubscribeClosed = globalInterstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('[AdManager] Interstitial closed');
          setAdShowing(false);
          recordAdShown();
          // Reload for next time
          loadInterstitial();
        }
      );

      const unsubscribeError = globalInterstitial.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          console.log('[AdManager] Ad error:', error);
          setAdLoaded(false);
          // Retry after delay
          setTimeout(loadInterstitial, 30000);
        }
      );

      globalInterstitial.load();

      return () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
      };
    } catch (error) {
      console.error('[AdManager] Load interstitial error:', error);
    }
  }, [setAdLoaded, setAdShowing, recordAdShown]);

  // Initialize on mount (delayed for stability)
  useEffect(() => {
    if (!isNativeEnvironment) return;

    const timer = setTimeout(() => {
      initializeSDK();
    }, 2000);

    return () => clearTimeout(timer);
  }, [initializeSDK]);

  // Handle app state changes
  useEffect(() => {
    if (!isNativeEnvironment) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isSDKInitialized && !globalInterstitial) {
        loadInterstitial();
      }
    });

    return () => subscription.remove();
  }, [loadInterstitial]);

  return <>{children}</>;
};

/**
 * Show interstitial ad
 * Call this when you want to show an ad (e.g., after scan)
 */
export const showGlobalInterstitial = async (): Promise<boolean> => {
  if (!isNativeEnvironment) {
    console.log('[showInterstitial] Skipping - web');
    return false;
  }

  if (!isSDKInitialized) {
    console.log('[showInterstitial] SDK not initialized');
    return false;
  }

  if (!globalInterstitial) {
    console.log('[showInterstitial] No interstitial');
    return false;
  }

  try {
    const { isAdLoaded } = useAdStore.getState();
    
    if (!isAdLoaded) {
      console.log('[showInterstitial] Ad not ready');
      return false;
    }

    console.log('[showInterstitial] Showing...');
    await globalInterstitial.show();
    return true;
  } catch (error) {
    console.log('[showInterstitial] Error:', error);
    return false;
  }
};

/**
 * Check if ads should be shown based on premium status and count
 */
export const checkShouldShowAd = (): boolean => {
  const { adsEnabled, isAdLoaded } = useAdStore.getState();
  return adsEnabled && isAdLoaded;
};

export default AdManager;

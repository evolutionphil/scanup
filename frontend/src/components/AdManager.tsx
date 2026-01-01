import React, { useEffect, useState, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useAdStore } from '../store/adStore';
import { useAuthStore } from '../store/authStore';
import { usePurchaseStore } from '../store/purchaseStore';

interface AdManagerProps {
  children: React.ReactNode;
}

// Check if native environment
const isNativeEnvironment = Platform.OS !== 'web';

// Ad Unit IDs
const AD_UNITS = {
  interstitial: {
    android: 'ca-app-pub-8771434485570434/5877935563',
    ios: 'ca-app-pub-8771434485570434/9099011184',
  },
  // Test IDs for development
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

/**
 * AdManager Component
 * 
 * Handles Google Mobile Ads initialization and interstitial ad management.
 * Key features:
 * - Delays SDK initialization until app is ready
 * - Uses delayAppMeasurementInit in app.json to prevent crash on cold start
 * - Only shows ads to non-premium users
 * - Shows interstitial every 3 scans
 */
export const AdManager: React.FC<AdManagerProps> = ({ children }) => {
  const { setAdLoaded, setAdShowing, setAdsEnabled, recordAdShown } = useAdStore();
  const { user } = useAuthStore();
  const [sdkReady, setSdkReady] = useState(false);

  // Update ads enabled based on user premium status
  useEffect(() => {
    const isPremium = user?.is_premium || user?.is_trial;
    setAdsEnabled(!isPremium);
  }, [user?.is_premium, user?.is_trial, setAdsEnabled]);

  // Initialize Google Mobile Ads SDK
  const initializeSDK = useCallback(async () => {
    if (!isNativeEnvironment) {
      console.log('[AdManager] Skipping - web platform');
      return;
    }

    if (isSDKInitialized || isInitializing) {
      console.log('[AdManager] Already initialized or initializing');
      return;
    }

    isInitializing = true;

    try {
      // Dynamic import to avoid bundling issues on web
      const mobileAds = require('react-native-google-mobile-ads').default;
      
      console.log('[AdManager] Initializing Google Mobile Ads SDK...');
      
      const adapterStatuses = await mobileAds().initialize();
      
      console.log('[AdManager] SDK initialized successfully');
      console.log('[AdManager] Adapter statuses:', JSON.stringify(adapterStatuses, null, 2));
      
      isSDKInitialized = true;
      setSdkReady(true);
      
      // Load first interstitial after SDK is ready
      loadInterstitial();
    } catch (error) {
      console.error('[AdManager] SDK initialization failed:', error);
      isInitializing = false;
    }
  }, []);

  // Load interstitial ad
  const loadInterstitial = useCallback(() => {
    if (!isNativeEnvironment || !isSDKInitialized) {
      return;
    }

    try {
      const { InterstitialAd, AdEventType } = require('react-native-google-mobile-ads');
      
      // Use test ads in development, real ads in production
      const adUnitId = __DEV__ 
        ? (Platform.OS === 'ios' ? AD_UNITS.test.interstitial.ios : AD_UNITS.test.interstitial.android)
        : (Platform.OS === 'ios' ? AD_UNITS.interstitial.ios : AD_UNITS.interstitial.android);
      
      console.log('[AdManager] Loading interstitial:', adUnitId);
      
      globalInterstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      // Event listeners
      const unsubscribeLoaded = globalInterstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log('[AdManager] Interstitial loaded');
          setAdLoaded(true);
        }
      );

      const unsubscribeError = globalInterstitial.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          console.log('[AdManager] Interstitial error:', error);
          setAdLoaded(false);
          // Retry after 60 seconds
          setTimeout(loadInterstitial, 60000);
        }
      );

      const unsubscribeClosed = globalInterstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('[AdManager] Interstitial closed');
          setAdShowing(false);
          recordAdShown();
          // Load next ad
          setTimeout(loadInterstitial, 1000);
        }
      );

      const unsubscribeOpened = globalInterstitial.addAdEventListener(
        AdEventType.OPENED,
        () => {
          console.log('[AdManager] Interstitial opened');
          setAdShowing(true);
        }
      );

      // Load the ad
      globalInterstitial.load();

      // Store unsubscribe functions for cleanup
      globalInterstitial._unsubscribers = [
        unsubscribeLoaded,
        unsubscribeError,
        unsubscribeClosed,
        unsubscribeOpened,
      ];
    } catch (error) {
      console.error('[AdManager] Error loading interstitial:', error);
    }
  }, [setAdLoaded, setAdShowing, recordAdShown]);

  // Initialize SDK after a delay to ensure app is fully loaded
  useEffect(() => {
    if (!isNativeEnvironment) {
      return;
    }

    // Delay initialization to prevent cold start crashes
    const timer = setTimeout(() => {
      initializeSDK();
    }, 3000); // 3 second delay

    return () => clearTimeout(timer);
  }, [initializeSDK]);

  // Handle app state changes - reload ad when app comes to foreground
  useEffect(() => {
    if (!isNativeEnvironment) {
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isSDKInitialized && !globalInterstitial) {
        loadInterstitial();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [loadInterstitial]);

  return <>{children}</>;
};

/**
 * Show interstitial ad
 * Call this after user actions like scanning a document
 */
export const showGlobalInterstitial = async (): Promise<boolean> => {
  if (!isNativeEnvironment) {
    console.log('[showInterstitial] Skipping - web platform');
    return false;
  }

  if (!isSDKInitialized) {
    console.log('[showInterstitial] SDK not initialized');
    return false;
  }

  if (!globalInterstitial) {
    console.log('[showInterstitial] No interstitial loaded');
    return false;
  }

  try {
    const { isAdLoaded } = useAdStore.getState();
    
    if (!isAdLoaded) {
      console.log('[showInterstitial] Ad not ready');
      return false;
    }

    console.log('[showInterstitial] Showing interstitial...');
    await globalInterstitial.show();
    return true;
  } catch (error) {
    console.log('[showInterstitial] Error:', error);
    return false;
  }
};

/**
 * Check if interstitial should be shown based on scan count
 */
export const shouldShowInterstitialAfterScan = (): boolean => {
  const { shouldShowAd, adsEnabled } = useAdStore.getState();
  return adsEnabled && shouldShowAd();
};

export default AdManager;

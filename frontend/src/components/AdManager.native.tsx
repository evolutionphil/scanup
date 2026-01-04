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
  const mountedRef = useRef(true);
  const lastAdsEnabledRef = useRef<boolean | null>(null);
  
  const setAdLoaded = useAdStore((state) => state.setAdLoaded);
  const setAdShowing = useAdStore((state) => state.setAdShowing);
  const setAdsEnabled = useAdStore((state) => state.setAdsEnabled);
  const recordAdShown = useAdStore((state) => state.recordAdShown);
  
  // Use stable selectors to prevent unnecessary re-renders
  // CRITICAL: Use default values to prevent crashes when user is null
  const userIsPremium = useAuthStore((state) => state.user?.is_premium ?? false);
  const userIsTrial = useAuthStore((state) => state.user?.is_trial ?? false);
  
  const isPremium = usePurchaseStore((state) => state.isPremium);
  const hasRemovedAds = usePurchaseStore((state) => state.hasRemovedAds);
  const purchaseInitialized = usePurchaseStore((state) => state.isInitialized);
  const initializePurchases = usePurchaseStore((state) => state.initialize);
  
  const [sdkReady, setSdkReady] = useState(false);
  const [purchasesInitStarted, setPurchasesInitStarted] = useState(false);

  // Track mount state
  useEffect(() => {
    mountedRef.current = true;
    isMounted = true;
    
    return () => {
      mountedRef.current = false;
      isMounted = false;
    };
  }, []);

  // Initialize purchase store (only once on mount)
  useEffect(() => {
    if (!purchasesInitStarted && !purchaseInitialized && mountedRef.current) {
      setPurchasesInitStarted(true);
      initializePurchases().catch(err => {
        if (mountedRef.current) {
          console.log('[AdManager] Purchase init error:', err);
        }
      });
    }
  }, [purchasesInitStarted, purchaseInitialized, initializePurchases]);

  // Update ads enabled based on premium status - with debounce to prevent loops
  useEffect(() => {
    // Don't update if not mounted
    if (!mountedRef.current) return;
    
    // Wait for purchases to initialize
    if (!purchaseInitialized) return;
    
    // Calculate if ads should be disabled
    const shouldDisableAds = userIsPremium || userIsTrial || isPremium || hasRemovedAds;
    const newAdsEnabled = !shouldDisableAds;
    
    // CRITICAL: Only update if value actually changed to prevent infinite loops
    if (lastAdsEnabledRef.current === newAdsEnabled) {
      return;
    }
    
    console.log('[AdManager] Ads check - userPremium:', userIsPremium, 'userTrial:', userIsTrial, 
      'isPremium:', isPremium, 'hasRemovedAds:', hasRemovedAds, 'disable:', shouldDisableAds);
    
    lastAdsEnabledRef.current = newAdsEnabled;
    setAdsEnabled(newAdsEnabled);
  }, [purchaseInitialized, userIsPremium, userIsTrial, isPremium, hasRemovedAds, setAdsEnabled]);

  // Initialize SDK
  const initializeSDK = useCallback(async () => {
    if (!isNativeEnvironment) {
      console.log('[AdManager] Skipping - web platform');
      return;
    }

    if (isSDKInitialized || isInitializing) return;
    if (!mountedRef.current) return;

    isInitializing = true;

    try {
      // Initialize AdMob
      const adsModule = getAdsModule();
      if (!adsModule) {
        console.log('[AdManager] Ads module not available');
        isInitializing = false;
        return;
      }
      
      const mobileAds = adsModule.default;
      console.log('[AdManager] Initializing AdMob SDK...');
      
      await mobileAds().initialize();
      
      if (!mountedRef.current) {
        console.log('[AdManager] Component unmounted during init');
        return;
      }
      
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
    if (!mountedRef.current) return;

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
          if (isMounted) setAdLoaded(true);
        }
      );

      const unsubscribeClosed = globalInterstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('[AdManager] Interstitial closed');
          if (isMounted) {
            setAdShowing(false);
            recordAdShown();
          }
          // Reload for next time
          if (isMounted) loadInterstitial();
        }
      );

      const unsubscribeError = globalInterstitial.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          console.log('[AdManager] Ad error:', error);
          if (isMounted) setAdLoaded(false);
          // Retry after delay
          if (isMounted) setTimeout(loadInterstitial, 30000);
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

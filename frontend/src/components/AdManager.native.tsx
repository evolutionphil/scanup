import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useAdStore } from '../store/adStore';
import { useAuthStore } from '../store/authStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { getTrackingPermissionsAsync } from 'expo-tracking-transparency';

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
let attTrackingStatus: string = 'not-determined';

// ATT (App Tracking Transparency) is REQUIRED for iOS
// Ads will use personalized mode if ATT is granted, non-personalized otherwise

// Note: ATT status is checked and used to determine ad personalization
// If ATT is granted, personalized ads are shown. Otherwise, non-personalized ads.

// Function to check ATT status and return whether to use personalized ads
const checkATTStatus = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    // Android doesn't have ATT, use non-personalized by default
    return false;
  }
  
  try {
    const { status } = await getTrackingPermissionsAsync();
    attTrackingStatus = status;
    console.log('[AdManager] ATT status for ads:', status);
    // Only use personalized ads if explicitly granted
    return status === 'granted';
  } catch (error) {
    console.log('[AdManager] ATT check error:', error);
    return false;
  }
};

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

  // Initialize purchase store immediately on mount (critical for IAP to work)
  useEffect(() => {
    if (!purchasesInitStarted && !purchaseInitialized && mountedRef.current) {
      setPurchasesInitStarted(true);
      console.log('[AdManager] Starting IAP initialization...');
      
      // Initialize immediately - don't wait
      initializePurchases()
        .then(() => {
          console.log('[AdManager] IAP initialized successfully');
        })
        .catch(err => {
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

  // Initialize SDK with retry mechanism
  const initializeSDK = useCallback(async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    if (!isNativeEnvironment) {
      console.log('[AdManager] Skipping - web platform');
      return;
    }

    if (isSDKInitialized) {
      console.log('[AdManager] SDK already initialized, loading interstitial...');
      loadInterstitial();
      return;
    }
    
    if (isInitializing) {
      console.log('[AdManager] SDK initialization already in progress');
      return;
    }
    
    if (!mountedRef.current) return;

    // Check ATT status on iOS before initializing ads
    if (Platform.OS === 'ios') {
      const canShowPersonalizedAds = await checkATTStatus();
      console.log('[AdManager] iOS ATT - Can show personalized ads:', canShowPersonalizedAds);
    }

    isInitializing = true;
    console.log(`[AdManager] Initializing AdMob SDK... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

    try {
      // Initialize AdMob
      const adsModule = getAdsModule();
      if (!adsModule) {
        console.log('[AdManager] ❌ Ads module not available - react-native-google-mobile-ads may not be installed');
        isInitializing = false;
        return;
      }
      
      const mobileAds = adsModule.default;
      console.log('[AdManager] Calling mobileAds().initialize()...');
      
      await mobileAds().initialize();
      
      if (!mountedRef.current) {
        console.log('[AdManager] Component unmounted during init');
        return;
      }
      
      console.log('[AdManager] ✅ AdMob SDK initialized successfully!');
      isSDKInitialized = true;
      isInitializing = false;
      setSdkReady(true);
      
      // Load interstitial immediately after SDK init
      loadInterstitial();
    } catch (error: any) {
      console.error('[AdManager] ❌ SDK init failed:', error?.message || error);
      isInitializing = false;
      
      // Retry mechanism
      if (retryCount < MAX_RETRIES && mountedRef.current) {
        const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s
        console.log(`[AdManager] Retrying in ${delay/1000}s...`);
        setTimeout(() => {
          if (mountedRef.current) {
            initializeSDK(retryCount + 1);
          }
        }, delay);
      } else {
        console.log('[AdManager] ❌ Max retries reached, ads will not be available');
      }
    }
  }, []);

  // Load interstitial with better logging
  const loadInterstitial = useCallback(async () => {
    console.log('[AdManager] loadInterstitial called - isNative:', isNativeEnvironment, 'sdkInit:', isSDKInitialized);
    
    if (!isNativeEnvironment) {
      console.log('[AdManager] Skipping loadInterstitial - not native');
      return;
    }
    
    if (!isSDKInitialized) {
      console.log('[AdManager] Skipping loadInterstitial - SDK not initialized');
      return;
    }
    
    if (!mountedRef.current) {
      console.log('[AdManager] Skipping loadInterstitial - component unmounted');
      return;
    }

    try {
      const adsModule = getAdsModule();
      if (!adsModule) {
        console.log('[AdManager] ❌ Ads module not available for loading');
        return;
      }
      
      const { InterstitialAd, AdEventType } = adsModule;
      
      // Use test ads in development, real ads in production
      const adUnitId = __DEV__ 
        ? (Platform.OS === 'ios' ? AD_UNITS.test.interstitial.ios : AD_UNITS.test.interstitial.android)
        : (Platform.OS === 'ios' ? AD_UNITS.interstitial.ios : AD_UNITS.interstitial.android);
      
      // Check ATT status to determine ad personalization
      const useNonPersonalized = Platform.OS === 'ios' ? attTrackingStatus !== 'granted' : true;
      
      console.log('[AdManager] 📢 Loading interstitial ad:', adUnitId, '(__DEV__:', __DEV__, ', nonPersonalized:', useNonPersonalized, ')');
      
      globalInterstitial = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: useNonPersonalized,
      });

      const unsubscribeLoaded = globalInterstitial.addAdEventListener(
        AdEventType.LOADED,
        () => {
          console.log('[AdManager] ✅ Interstitial LOADED and ready to show!');
          if (isMounted) setAdLoaded(true);
        }
      );

      const unsubscribeClosed = globalInterstitial.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('[AdManager] Interstitial closed by user');
          if (isMounted) {
            setAdShowing(false);
            recordAdShown();
          }
          // Reload for next time
          if (isMounted) {
            console.log('[AdManager] Reloading interstitial for next time...');
            loadInterstitial();
          }
        }
      );

      const unsubscribeError = globalInterstitial.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          console.log('[AdManager] ❌ Ad loading error:', error?.message || error);
          if (isMounted) setAdLoaded(false);
          // Retry after shorter delay (10 seconds instead of 30)
          if (isMounted) {
            console.log('[AdManager] Will retry loading ad in 10 seconds...');
            setTimeout(loadInterstitial, 10000);
          }
        }
      );

      console.log('[AdManager] Calling globalInterstitial.load()...');
      globalInterstitial.load();

      return () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
      };
    } catch (error: any) {
      console.error('[AdManager] ❌ loadInterstitial exception:', error?.message || error);
    }
  }, [setAdLoaded, setAdShowing, recordAdShown]);

  // Initialize on mount (minimal delay for stability)
  useEffect(() => {
    if (!isNativeEnvironment) return;

    // Reduced delay from 2000ms to 500ms for faster ad loading
    const timer = setTimeout(() => {
      initializeSDK();
    }, 500);

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
  console.log('[showInterstitial] === TRYING TO SHOW AD ===');
  console.log('[showInterstitial] isNativeEnvironment:', isNativeEnvironment);
  console.log('[showInterstitial] isSDKInitialized:', isSDKInitialized);
  console.log('[showInterstitial] globalInterstitial exists:', !!globalInterstitial);
  
  if (!isNativeEnvironment) {
    console.log('[showInterstitial] ❌ Skipping - web platform');
    return false;
  }

  if (!isSDKInitialized) {
    console.log('[showInterstitial] ❌ SDK not initialized');
    return false;
  }

  if (!globalInterstitial) {
    console.log('[showInterstitial] ❌ No interstitial object - ad not loaded yet');
    return false;
  }

  try {
    const { isAdLoaded, adsEnabled } = useAdStore.getState();
    console.log('[showInterstitial] Store state - isAdLoaded:', isAdLoaded, 'adsEnabled:', adsEnabled);
    
    if (!isAdLoaded) {
      console.log('[showInterstitial] ❌ Ad not loaded/ready');
      return false;
    }
    
    if (!adsEnabled) {
      console.log('[showInterstitial] ❌ Ads disabled (premium user)');
      return false;
    }

    console.log('[showInterstitial] ✅ Showing interstitial ad NOW!');
    await globalInterstitial.show();
    console.log('[showInterstitial] ✅ Ad shown successfully');
    return true;
  } catch (error: any) {
    console.log('[showInterstitial] ❌ Error showing ad:', error?.message || error);
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

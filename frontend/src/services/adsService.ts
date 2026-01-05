import { Platform } from 'react-native';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

/* =========================
   AD UNIT IDS
========================= */
const AD_UNIT_IDS = {
  interstitial: {
    ios: 'ca-app-pub-8771434485570434/9099011184',
    android: 'ca-app-pub-8771434485570434/5877935563',
  },
};

const AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === 'ios'
    ? AD_UNIT_IDS.interstitial.ios
    : AD_UNIT_IDS.interstitial.android;

/* =========================
   INTERSTITIAL STATE
========================= */
let interstitial: InterstitialAd | null = null;
let loaded = false;
let isInitialized = false;

/* =========================
   INITIALIZE
========================= */
export const initInterstitial = () => {
  if (Platform.OS === 'web') {
    console.log('[AdsService] Skipping - web platform');
    return;
  }

  if (isInitialized) {
    console.log('[AdsService] Already initialized');
    return;
  }

  console.log('[AdsService] Initializing interstitial ad...');
  console.log('[AdsService] AD_UNIT_ID:', AD_UNIT_ID);
  console.log('[AdsService] __DEV__:', __DEV__);

  try {
    interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[AdsService] ✅ Interstitial LOADED and ready');
      loaded = true;
    });

    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[AdsService] Interstitial closed, reloading...');
      loaded = false;
      // Reload for next time
      interstitial?.load();
    });

    interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('[AdsService] ❌ Ad error:', error);
      loaded = false;
      // Retry after delay
      setTimeout(() => {
        if (interstitial) {
          console.log('[AdsService] Retrying load...');
          interstitial.load();
        }
      }, 10000);
    });

    interstitial.load();
    isInitialized = true;
    console.log('[AdsService] ✅ Initialization complete');
  } catch (error) {
    console.error('[AdsService] ❌ Init error:', error);
  }
};

/* =========================
   SHOW AD
========================= */
export const showInterstitialIfReady = (): boolean => {
  console.log('[AdsService] showInterstitialIfReady - loaded:', loaded);
  
  if (Platform.OS === 'web') {
    return false;
  }

  if (loaded && interstitial) {
    console.log('[AdsService] ✅ Showing interstitial NOW');
    interstitial.show();
    return true;
  }
  
  console.log('[AdsService] Ad not ready, skipping');
  return false;
};

/* =========================
   HELPERS
========================= */
export const isAdLoaded = (): boolean => loaded;

export const isAdsInitialized = (): boolean => isInitialized;

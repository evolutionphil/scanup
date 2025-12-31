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
  // NOTE: For development build only - ads won't work in Expo Go
  useEffect(() => {
    if (!isNativeEnvironment) {
      console.log('[AdManager] Skipping ads initialization (web platform)');
      return;
    }
    
    if (mobileAdsInitialized) {
      console.log('[AdManager] Already initialized');
      return;
    }
    
    // Log that ads will be initialized when running in development build
    console.log('[AdManager] Google Mobile Ads configured - will initialize in development build');
    console.log('[AdManager] Ad Unit IDs configured:');
    console.log('[AdManager] - Android Interstitial: ca-app-pub-8771434485570434/5877935563');
    console.log('[AdManager] - iOS Interstitial: ca-app-pub-8771434485570434/9099011184');
    
    // In a development build, this would dynamically require and initialize the ads
    // For now, we just mark as ready for when the native module is available
    mobileAdsInitialized = true;
  }, [setAdLoaded, setAdShowing, recordAdShown]);
  
  return <>{children}</>;
};

// Export function to show interstitial ad
// This will work when running in a development build with native modules
export const showGlobalInterstitial = async (): Promise<boolean> => {
  if (!isNativeEnvironment) {
    console.log('[showGlobalInterstitial] Skipping on web');
    return false;
  }
  
  if (!globalInterstitial) {
    console.log('[showGlobalInterstitial] Interstitial not loaded (requires development build)');
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
  console.log('[initializeGlobalInterstitial] Will initialize when running in development build');
};

export default AdManager;

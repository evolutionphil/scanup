import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAdStore } from '../store/adStore';
import { useAuthStore } from '../store/authStore';

interface AdManagerProps {
  children: React.ReactNode;
}

/**
 * AdManager - Placeholder for Google Mobile Ads integration
 * 
 * To enable ads:
 * 1. Run: yarn add react-native-google-mobile-ads
 * 2. Add to app.json plugins:
 *    ["react-native-google-mobile-ads", {
 *      "androidAppId": "ca-app-pub-8771434485570434~5351337863",
 *      "iosAppId": "ca-app-pub-8771434485570434~1412092855"
 *    }]
 * 3. Rebuild with: eas build
 */
export const AdManager: React.FC<AdManagerProps> = ({ children }) => {
  const { setAdsEnabled } = useAdStore();
  const { user } = useAuthStore();
  
  // Update ads enabled based on user premium status
  useEffect(() => {
    const isPremium = user?.is_premium || user?.is_trial;
    setAdsEnabled(!isPremium);
    console.log('[AdManager] Ads disabled - package not installed');
  }, [user?.is_premium, user?.is_trial, setAdsEnabled]);
  
  return <>{children}</>;
};

// Placeholder function - does nothing without ads package
export const showGlobalInterstitial = async (): Promise<boolean> => {
  console.log('[Ads] showGlobalInterstitial - ads not enabled');
  return false;
};

export const initializeGlobalInterstitial = () => {
  console.log('[Ads] initializeGlobalInterstitial - ads not enabled');
};

export default AdManager;

import React from 'react';

interface AdManagerProps {
  children: React.ReactNode;
}

/**
 * AdManager for Web - No-op implementation
 * Ads are not supported on web
 */
export const AdManager: React.FC<AdManagerProps> = ({ children }) => {
  return <>{children}</>;
};

export const showGlobalInterstitial = async (): Promise<boolean> => {
  console.log('[AdManager.web] Ads not available on web');
  return false;
};

export const checkShouldShowAd = (): boolean => {
  return false;
};

export default AdManager;

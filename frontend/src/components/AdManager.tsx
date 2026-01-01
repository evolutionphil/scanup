// Platform-specific exports handled by Metro bundler
// AdManager.native.tsx is used for iOS/Android
// AdManager.web.tsx is used for web
export { AdManager, showGlobalInterstitial, checkShouldShowAd } from './AdManager';
export default AdManager;

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Firebase iOS Fix Plugin for v18.x
 * 
 * Adds modular_headers for specific Firebase dependencies that need it.
 * This approach is more targeted than global use_modular_headers!
 */
const withFirebaseFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        return config;
      }
      
      let content = fs.readFileSync(podfilePath, 'utf8');
      
      // Check if already modified
      if (content.includes('# RNFirebase Modular Headers Fix')) {
        console.log('[Firebase Fix] Already applied');
        return config;
      }

      // Add targeted modular headers for Firebase dependencies
      // This goes before target block
      const modularHeadersFix = `
# RNFirebase Modular Headers Fix
# Required for Firebase Swift pods with static frameworks
pod 'GoogleUtilities', :modular_headers => true
pod 'FirebaseCore', :modular_headers => true
pod 'FirebaseCoreInternal', :modular_headers => true
pod 'FirebaseInstallations', :modular_headers => true
pod 'FirebaseCoreExtension', :modular_headers => true
pod 'GoogleDataTransport', :modular_headers => true
pod 'nanopb', :modular_headers => true

`;

      // Find the first target and insert before it
      const targetMatch = content.match(/(target\s+['"][^'"]+['"]\s+do)/);
      if (targetMatch) {
        content = content.replace(
          targetMatch[0],
          modularHeadersFix + targetMatch[0]
        );
        console.log('[Firebase Fix] Added modular headers for Firebase dependencies');
      }

      fs.writeFileSync(podfilePath, content);
      
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;

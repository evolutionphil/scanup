const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to fix Firebase iOS build issues
 * Adds use_modular_headers! to Podfile for Firebase Swift dependencies
 */
const withFirebaseModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      // Check if Podfile exists (it may not exist until prebuild)
      if (!fs.existsSync(podfilePath)) {
        console.log('[withFirebaseModularHeaders] Podfile not found, skipping...');
        return config;
      }
      
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      
      // Check if use_modular_headers! is already present
      if (podfileContent.includes('use_modular_headers!')) {
        console.log('[withFirebaseModularHeaders] use_modular_headers! already present');
        return config;
      }
      
      // Add use_modular_headers! after use_frameworks! :linkage => :static
      // or at the beginning of the target block
      
      // Pattern 1: After use_frameworks!
      if (podfileContent.includes('use_frameworks!')) {
        podfileContent = podfileContent.replace(
          /(use_frameworks![^\n]*\n)/,
          '$1use_modular_headers!\n'
        );
        console.log('[withFirebaseModularHeaders] Added use_modular_headers! after use_frameworks!');
      } else {
        // Pattern 2: Add before the first target
        podfileContent = podfileContent.replace(
          /(target\s+['"][^'"]+['"]\s+do)/,
          'use_modular_headers!\n\n$1'
        );
        console.log('[withFirebaseModularHeaders] Added use_modular_headers! before target');
      }
      
      // Also add $RNFirebaseAsStaticFramework = true if not present
      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        podfileContent = podfileContent.replace(
          /(platform\s+:ios[^\n]*\n)/,
          '$1\n# React Native Firebase - Static Framework\n$RNFirebaseAsStaticFramework = true\n'
        );
        console.log('[withFirebaseModularHeaders] Added $RNFirebaseAsStaticFramework = true');
      }
      
      fs.writeFileSync(podfilePath, podfileContent);
      
      return config;
    },
  ]);
};

module.exports = withFirebaseModularHeaders;

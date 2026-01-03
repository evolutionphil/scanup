const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to fix Firebase iOS build issues
 * Adds $RNFirebaseAsStaticFramework = true to Podfile
 * 
 * This is required when using use_frameworks! :linkage => :static
 * (which expo-build-properties adds automatically)
 */
const withFirebaseStaticFramework = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      // Check if Podfile exists (it may not exist until prebuild)
      if (!fs.existsSync(podfilePath)) {
        console.log('[withFirebaseStaticFramework] Podfile not found, skipping...');
        return config;
      }
      
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      
      // Check if $RNFirebaseAsStaticFramework is already present
      if (podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        console.log('[withFirebaseStaticFramework] $RNFirebaseAsStaticFramework already present');
        return config;
      }
      
      // Add $RNFirebaseAsStaticFramework = true at the top of the file, after platform declaration
      const platformRegex = /(platform\s+:ios[^\n]*\n)/;
      if (platformRegex.test(podfileContent)) {
        podfileContent = podfileContent.replace(
          platformRegex,
          '$1\n# React Native Firebase requires this when using static frameworks\n$RNFirebaseAsStaticFramework = true\n'
        );
        console.log('[withFirebaseStaticFramework] Added $RNFirebaseAsStaticFramework = true after platform declaration');
      } else {
        // If no platform declaration found, add at the very beginning
        podfileContent = '# React Native Firebase requires this when using static frameworks\n$RNFirebaseAsStaticFramework = true\n\n' + podfileContent;
        console.log('[withFirebaseStaticFramework] Added $RNFirebaseAsStaticFramework = true at top');
      }
      
      fs.writeFileSync(podfilePath, podfileContent);
      
      return config;
    },
  ]);
};

module.exports = withFirebaseStaticFramework;

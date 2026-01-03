const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Firebase iOS Fix Plugin for v23.x
 * 
 * Adds $RNFirebaseAsStaticFramework = true which is required
 * when using use_frameworks! :linkage => :static
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
      if (content.includes('$RNFirebaseAsStaticFramework')) {
        console.log('[Firebase Fix] Already applied');
        return config;
      }

      // Add $RNFirebaseAsStaticFramework = true after platform declaration
      const platformRegex = /(platform\s+:ios[^\n]*\n)/;
      if (platformRegex.test(content)) {
        content = content.replace(
          platformRegex,
          `$1\n# React Native Firebase - Required for static frameworks\n$RNFirebaseAsStaticFramework = true\n`
        );
        console.log('[Firebase Fix] Added $RNFirebaseAsStaticFramework = true');
      }

      fs.writeFileSync(podfilePath, content);
      
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;

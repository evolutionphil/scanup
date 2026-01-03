const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to fix Firebase iOS build issues with Swift pods
 * 
 * This plugin adds the necessary Podfile configurations:
 * 1. $RNFirebaseAsStaticFramework = true
 * 2. Modular headers for specific Firebase dependencies
 */
const withFirebaseFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        console.log('[withFirebaseFix] Podfile not found, skipping...');
        return config;
      }
      
      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      let modified = false;
      
      // 1. Add $RNFirebaseAsStaticFramework = true
      if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
        const platformRegex = /(platform\s+:ios[^\n]*\n)/;
        if (platformRegex.test(podfileContent)) {
          podfileContent = podfileContent.replace(
            platformRegex,
            '$1\n# React Native Firebase - Static Framework configuration\n$RNFirebaseAsStaticFramework = true\n'
          );
        } else {
          podfileContent = '# React Native Firebase - Static Framework configuration\n$RNFirebaseAsStaticFramework = true\n\n' + podfileContent;
        }
        modified = true;
        console.log('[withFirebaseFix] Added $RNFirebaseAsStaticFramework = true');
      }
      
      // 2. Add pod_post_install hook to enable modular headers for specific pods
      // This is the recommended approach from Firebase iOS SDK
      const postInstallHook = `
# Firebase modular headers fix for Swift pods
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Enable modular headers for Firebase dependencies
      if ['GoogleUtilities', 'FirebaseCore', 'FirebaseCoreInternal', 'FirebaseInstallations', 'GoogleDataTransport', 'nanopb'].include?(target.name)
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
      
      # iOS deployment target fix
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'
    end
  end
end
`;
      
      // Check if we already have a post_install hook
      if (podfileContent.includes('post_install do |installer|')) {
        // Add our modifications to existing post_install
        if (!podfileContent.includes("DEFINES_MODULE") && !podfileContent.includes("Firebase modular headers fix")) {
          podfileContent = podfileContent.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|
  # Firebase modular headers fix
  installer.pods_project.targets.each do |target|
    if ['GoogleUtilities', 'FirebaseCore', 'FirebaseCoreInternal', 'FirebaseInstallations', 'GoogleDataTransport', 'nanopb'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
  end
`
          );
          modified = true;
          console.log('[withFirebaseFix] Added Firebase modular headers fix to existing post_install');
        }
      } else {
        // Add new post_install hook before the last 'end'
        const lastEndIndex = podfileContent.lastIndexOf('end');
        if (lastEndIndex !== -1) {
          podfileContent = podfileContent.slice(0, lastEndIndex) + postInstallHook + '\nend';
          modified = true;
          console.log('[withFirebaseFix] Added new post_install hook with Firebase fix');
        }
      }
      
      if (modified) {
        fs.writeFileSync(podfilePath, podfileContent);
        console.log('[withFirebaseFix] Podfile updated successfully');
      }
      
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;

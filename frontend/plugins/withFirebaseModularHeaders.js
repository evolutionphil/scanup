const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to fix Firebase iOS build issues
 * 
 * Fixes "non-modular header inside framework module" error for RNFBApp
 * by adding CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES
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
      if (content.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        console.log('[Firebase Fix] Already applied');
        return config;
      }

      // Add $RNFirebaseAsStaticFramework and post_install hook
      const firebaseFix = `
# React Native Firebase Fix
$RNFirebaseAsStaticFramework = true

# Fix for non-modular header errors in RNFBApp
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      # Allow non-modular includes for Firebase compatibility
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      
      # Suppress the warning
      other_cflags = config.build_settings['OTHER_CFLAGS'] ||= ['$(inherited)']
      unless other_cflags.include?('-Wno-non-modular-include-in-framework-module')
        config.build_settings['OTHER_CFLAGS'] = other_cflags + ['-Wno-non-modular-include-in-framework-module']
      end
    end
  end
end
`;

      // Check if there's already a post_install hook
      if (content.includes('post_install do |installer|')) {
        // Add our settings inside the existing post_install
        content = content.replace(
          /post_install do \|installer\|/,
          `# React Native Firebase Fix
$RNFirebaseAsStaticFramework = true

post_install do |installer|
  # Firebase non-modular header fix
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      other_cflags = config.build_settings['OTHER_CFLAGS'] ||= ['$(inherited)']
      unless other_cflags.include?('-Wno-non-modular-include-in-framework-module')
        config.build_settings['OTHER_CFLAGS'] = other_cflags + ['-Wno-non-modular-include-in-framework-module']
      end
    end
  end
`
        );
        console.log('[Firebase Fix] Added to existing post_install');
      } else {
        // Add before the last 'end' in the file
        const lastEndIndex = content.lastIndexOf('end');
        if (lastEndIndex !== -1) {
          content = content.slice(0, lastEndIndex) + firebaseFix + '\nend';
          console.log('[Firebase Fix] Added new post_install hook');
        }
      }

      fs.writeFileSync(podfilePath, content);
      
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;

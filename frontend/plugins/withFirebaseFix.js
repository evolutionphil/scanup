const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFirebaseFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        console.log('Podfile not found, skipping Firebase fix');
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      
      // Check if fix is already applied
      if (podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        console.log('Firebase fix already applied');
        return config;
      }

      // Add the Firebase fix right after post_install do |installer|
      const fixCode = `
    # Firebase non-modular header fix
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB') || target.name.start_with?('Firebase') || target.name.start_with?('GoogleUtilities')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end
`;

      // Find post_install and insert after it
      const postInstallMatch = podfileContent.match(/post_install do \|installer\|/);
      if (postInstallMatch) {
        podfileContent = podfileContent.replace(
          'post_install do |installer|',
          'post_install do |installer|' + fixCode
        );
        
        fs.writeFileSync(podfilePath, podfileContent, 'utf8');
        console.log('✅ Firebase iOS fix applied to Podfile');
      } else {
        console.log('⚠️ Could not find post_install in Podfile');
      }
      
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;

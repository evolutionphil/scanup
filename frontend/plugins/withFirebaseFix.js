const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFirebaseFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, 'utf8');
      
      // Add the build settings fix if not already present
      if (!podfileContent.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        // Find the post_install block and add our fix
        const postInstallRegex = /(post_install do \|installer\|)/;
        
        if (postInstallRegex.test(podfileContent)) {
          podfileContent = podfileContent.replace(
            postInstallRegex,
            `$1
    # Fix Firebase non-modular header issue
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`
          );
          
          fs.writeFileSync(podfilePath, podfileContent, 'utf8');
          console.log('✅ Firebase iOS fix applied to Podfile');
        }
      }
      
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;

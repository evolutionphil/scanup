const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * This plugin adds use_modular_headers! to fix Firebase Swift pod issues
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
      
      // Skip if already modified
      if (content.includes('use_modular_headers!') || content.includes('# Firebase Fix Applied')) {
        console.log('[Firebase Fix] Already applied');
        return config;
      }
      
      // Add use_modular_headers! right after use_frameworks!
      if (content.includes('use_frameworks!')) {
        content = content.replace(
          /(use_frameworks![^\n]*)/g,
          `$1\n\n# Firebase Fix Applied\nuse_modular_headers!`
        );
      } else {
        // Add at the beginning of the target block
        content = content.replace(
          /(target\s+['"][^'"]+['"]\s+do)/,
          `# Firebase Fix Applied\nuse_modular_headers!\n\n$1`
        );
      }
      
      fs.writeFileSync(podfilePath, content);
      console.log('[Firebase Fix] Added use_modular_headers!');
      
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;

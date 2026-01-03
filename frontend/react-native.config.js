module.exports = {
  dependencies: {
    // Disable Firebase for iOS (keep for Android)
    '@react-native-firebase/app': {
      platforms: {
        ios: null, // Disable for iOS
      },
    },
    '@react-native-firebase/analytics': {
      platforms: {
        ios: null, // Disable for iOS
      },
    },
  },
};

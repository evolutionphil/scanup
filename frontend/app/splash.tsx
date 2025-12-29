import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

const { width, height } = Dimensions.get('window');

// Brand colors from Figma design
const BRAND_BLUE = '#3366FF';

export default function SplashScreen() {
  const { isInitialized, token } = useAuthStore();
  
  // Animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Start animations
    Animated.sequence([
      // Logo fade in and scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // Text fade in and slide up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslate, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    // Navigate after splash animation
    const timer = setTimeout(() => {
      if (isInitialized) {
        if (token) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(tabs)'); // Go to home, user can login from there
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isInitialized, token]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND_BLUE} />
      
      {/* Logo Icon */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App Name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }],
          },
        ]}
      >
        <Text style={styles.appName}>
          <Text style={styles.scanText}>Scan</Text>
          <Text style={styles.upText}>Up</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
  textContainer: {
    marginTop: 24,
  },
  appName: {
    fontSize: 42,
    letterSpacing: 1,
  },
  scanText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  upText: {
    fontWeight: '300',
    color: '#FFFFFF',
  },
});

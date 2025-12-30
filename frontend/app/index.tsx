import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Dimensions, TouchableOpacity, Image, Platform, Pressable } from 'react-native';
import { router, Link } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import Button from '../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = '@scanup_onboarding_complete';

// Brand color from Figma design
const BRAND_BLUE = '#3366FF';

// Check platform at module level - this runs during SSR too
const IS_WEB = Platform.OS === 'web';

export default function Index() {
  const { isAuthenticated, isLoading, loadStoredAuth, continueAsGuest } = useAuthStore();
  const { theme, loadTheme } = useThemeStore();
  const hasLoaded = useRef(false);
  // On web, start with splash hidden to show menu immediately
  const [showSplash, setShowSplash] = useState(!IS_WEB);
  const [navigating, setNavigating] = useState(false);

  // Animations for native
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadTheme();
      loadStoredAuth();

      // Only run splash animation and navigation on native
      if (!IS_WEB) {
        // Start splash animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Navigate after splash delay (native only)
        setTimeout(() => {
          if (navigating) return;
          setNavigating(true);
          
          AsyncStorage.getItem(ONBOARDING_KEY).then((completed) => {
            if (!completed) {
              router.replace('/onboarding');
            } else {
              continueAsGuest();
              router.replace('/(tabs)');
            }
          }).catch(() => {
            router.replace('/onboarding');
          });
        }, 2000);
      }
    }
  }, []);

  // WEB: Show splash briefly then navigate
  if (IS_WEB) {
    return (
      <View style={styles.splashContainer}>
        {/* Logo Icon */}
        <View style={styles.splashLogoContainer}>
          <View style={styles.webLogoBox}>
            <Ionicons name="document-text" size={60} color="#FFFFFF" />
          </View>
        </View>

        {/* App Name */}
        <View style={styles.splashTextContainer}>
          <Text style={styles.splashAppName}>
            <Text style={styles.scanText}>Scan</Text>
            <Text style={styles.upText}>Up</Text>
          </Text>
        </View>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </View>
      </View>
    );
  }

  // NATIVE: Show animated splash screen
  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        {/* Logo Icon */}
        <Animated.View
          style={[
            styles.splashLogoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={[
            styles.splashTextContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.splashAppName}>
            <Text style={styles.scanText}>Scan</Text>
            <Text style={styles.upText}>Up</Text>
          </Text>
        </Animated.View>

        {/* Loading indicator */}
        <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
          <ActivityIndicator size="small" color="#FFFFFF" />
        </Animated.View>
      </View>
    );
  }

  // Fallback welcome screen (shouldn't normally be seen)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Splash Screen Styles - Figma Design
  splashContainer: {
    flex: 1,
    backgroundColor: BRAND_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogoContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: 160,
    height: 160,
  },
  splashTextContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  splashAppName: {
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
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
  },
  // Web Navigation Menu Styles
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webLogoWrapper: {
    marginBottom: 24,
  },
  webLogoBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: BRAND_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 36,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  navButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    marginTop: 24,
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Dimensions, TouchableOpacity, Image, Platform } from 'react-native';
import { router } from 'expo-router';
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

// Logo image URL for web compatibility
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_f61c01c3-3d34-442e-9c76-6cdad5808a35/artifacts/vjga57ci_Frame%20147.png';

export default function Index() {
  const { isAuthenticated, isLoading, loadStoredAuth, continueAsGuest } = useAuthStore();
  const { theme, loadTheme } = useThemeStore();
  const hasLoaded = useRef(false);
  const [showSplash, setShowSplash] = useState(true);
  const [navigating, setNavigating] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadTheme();
      loadStoredAuth();

      // Start splash animations (only on native)
      if (Platform.OS !== 'web') {
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
      }

      // Navigate after splash delay
      const timer = setTimeout(async () => {
        if (navigating) return;
        setNavigating(true);
        
        try {
          // On web, skip AsyncStorage check and go directly to onboarding
          if (Platform.OS === 'web') {
            router.replace('/onboarding');
            return;
          }
          
          const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
          if (!completed) {
            // First time user - show onboarding
            router.replace('/onboarding');
          } else {
            // User has completed onboarding
            setShowSplash(false);
            // Continue as guest for easy testing
            continueAsGuest();
            router.replace('/(tabs)');
          }
        } catch (error) {
          console.error('Navigation error:', error);
          // Default to onboarding on error
          router.replace('/onboarding');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Splash Screen - Figma Design
  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        {/* Logo Icon - Use URL for web, require for native */}
        <View style={styles.splashLogoContainer}>
          <Image
            source={Platform.OS === 'web' 
              ? { uri: LOGO_URL }
              : require('../assets/images/logo.png')
            }
            style={styles.splashLogo}
            resizeMode="contain"
          />
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

  // After splash - show welcome screen (fallback)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.welcomeHeader}>
          <Text style={[styles.welcomeTitle, { color: theme.text }]}>Welcome to ScanUp</Text>
          <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
            Your smart document scanner
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            onPress={() => {
              continueAsGuest();
              router.replace('/(tabs)');
            }}
            style={styles.getStartedButton}
          />
          
          <TouchableOpacity 
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={[styles.loginText, { color: theme.primary }]}>
              Already have an account? Sign In
            </Text>
          </TouchableOpacity>
        </View>
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
  // Welcome Screen Styles
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  getStartedButton: {
    width: '100%',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

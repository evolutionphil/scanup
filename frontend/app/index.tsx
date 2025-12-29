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
  const [showSplash, setShowSplash] = useState(Platform.OS !== 'web'); // Skip splash on web
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
      const timer = setTimeout(() => {
        if (navigating) return;
        setNavigating(true);
        setShowSplash(false);
        
        // For web, always go to onboarding for design testing
        if (Platform.OS === 'web') {
          router.replace('/onboarding');
          return;
        }
        
        // For native, check onboarding status
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
      
      return () => clearTimeout(timer);
    }
  }, []);

  // On web, show a simple welcome screen with navigation buttons
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* App Logo */}
          <View style={[styles.splashLogoContainer, { marginBottom: 16 }]}>
            <View style={[styles.webLogoContainer, { backgroundColor: BRAND_BLUE }]}>
              <Ionicons name="document-text" size={60} color="#FFFFFF" />
            </View>
          </View>
          
          <View style={styles.welcomeHeader}>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>
              <Text style={{ fontWeight: '700' }}>Scan</Text>
              <Text style={{ fontWeight: '300' }}>Up</Text>
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
              Smart Document Scanner
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="View Onboarding"
              onPress={() => router.push('/onboarding')}
              style={styles.getStartedButton}
            />
            
            <Button
              title="View Premium Screen"
              onPress={() => router.push('/premium')}
              variant="secondary"
              style={styles.getStartedButton}
            />
            
            <TouchableOpacity 
              style={styles.loginLink}
              onPress={() => {
                continueAsGuest();
                router.push('/(tabs)');
              }}
            >
              <Text style={[styles.loginText, { color: theme.primary }]}>
                Enter App as Guest →
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Splash Screen - Figma Design (Native only)
  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        {/* Logo Icon - Use Ionicons as fallback for web */}
        <View style={styles.splashLogoContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.webLogoContainer}>
              <Ionicons name="document-text" size={80} color="#FFFFFF" />
            </View>
          ) : (
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          )}
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
  webLogoContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
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

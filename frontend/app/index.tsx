import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Dimensions, TouchableOpacity, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = '@scanup_onboarding_complete';

// Brand color from Figma design
const BRAND_BLUE = '#3366FF';

export default function Index() {
  const { loadStoredAuth, continueAsGuest } = useAuthStore();
  const { loadTheme } = useThemeStore();
  const [isClient, setIsClient] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const hasNavigated = useRef(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [authLoaded, setAuthLoaded] = useState(false);

  // Mark as client-side rendered and load auth
  useEffect(() => {
    setIsClient(true);
    loadTheme();
    
    // Load stored auth and mark as complete
    const initAuth = async () => {
      try {
        await loadStoredAuth();
        console.log('[Index] Auth loaded from storage');
      } catch (e) {
        console.error('[Index] Auth load error:', e);
      } finally {
        setAuthLoaded(true);
      }
    };
    
    initAuth();
  }, []);

  // Handle navigation after client is ready AND auth is loaded
  useEffect(() => {
    if (!isClient || !authLoaded || hasNavigated.current) return;

    // Start animations
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

    // Navigate after shorter delay (auth is already loaded)
    const timer = setTimeout(() => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      setShouldNavigate(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isClient, authLoaded]);

  // Perform navigation
  useEffect(() => {
    if (!shouldNavigate) return;

    const navigate = async () => {
      try {
        // For web, skip AsyncStorage check and go directly to tabs
        if (Platform.OS === 'web') {
          console.log('[Index] Web platform - navigating to tabs');
          // Only continue as guest if not already authenticated
          const { isAuthenticated } = useAuthStore.getState();
          if (!isAuthenticated) {
            continueAsGuest();
          }
          router.replace('/(tabs)');
          return;
        }
        
        // For native, check onboarding status
        let completed = null;
        try {
          completed = await AsyncStorage.getItem(ONBOARDING_KEY);
        } catch (e) {
          console.log('[Index] AsyncStorage failed, defaulting to onboarding');
          completed = null;
        }
        
        if (!completed) {
          router.replace('/onboarding');
        } else {
          // Check if user is already authenticated (from loadStoredAuth)
          const { isAuthenticated } = useAuthStore.getState();
          console.log('[Index] User authenticated:', isAuthenticated);
          
          // Only continue as guest if NOT already authenticated
          if (!isAuthenticated) {
            continueAsGuest();
          }
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error('[Index] Navigation error:', error);
        // Fallback - just go to tabs
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated) {
          continueAsGuest();
        }
        router.replace('/(tabs)');
      }
    };

    navigate();
  }, [shouldNavigate]);

  const handleTap = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    setShouldNavigate(true);
  };

  // Show splash screen
  return (
    <TouchableOpacity 
      style={styles.splashContainer}
      onPress={handleTap}
      activeOpacity={0.95}
    >
      {/* Logo Icon */}
      <Animated.View
        style={[
          styles.splashLogoContainer,
          isClient && {
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
          isClient && {
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

      {/* Loading indicator / Tap text */}
      <Animated.View style={[styles.loadingContainer, isClient && { opacity: fadeAnim }]}>
        {Platform.OS === 'web' ? (
          <Text style={styles.tapToContinueText}>Tap anywhere to continue</Text>
        ) : (
          <ActivityIndicator size="small" color="#FFFFFF" />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  webLogoBox: {
    width: 100,
    height: 100,
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
  tapToContinueText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
});

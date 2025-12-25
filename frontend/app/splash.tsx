import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../src/store/themeStore';
import { useAuthStore } from '../src/store/authStore';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const { theme, loadTheme } = useThemeStore();
  const { loadStoredAuth } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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

    // Load app state and navigate
    const initApp = async () => {
      await loadTheme();
      await loadStoredAuth();
      
      // Navigate after splash animation
      setTimeout(() => {
        router.replace('/');
      }, 2000);
    };

    initApp();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Background gradient effect */}
      <View style={[styles.gradientCircle, { backgroundColor: theme.primary + '15' }]} />
      <View style={[styles.gradientCircle2, { backgroundColor: theme.primary + '10' }]} />
      
      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.logoWrapper, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="scan" size={60} color={theme.primary} />
        </View>
      </Animated.View>

      {/* App Name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={[styles.appName, { color: theme.text }]}>ScanUp</Text>
        <Text style={[styles.tagline, { color: theme.textSecondary }]}>
          Smart Document Scanner
        </Text>
      </Animated.View>

      {/* Loading indicator */}
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        <View style={styles.loadingDots}>
          <LoadingDot delay={0} theme={theme} />
          <LoadingDot delay={150} theme={theme} />
          <LoadingDot delay={300} theme={theme} />
        </View>
      </Animated.View>
    </View>
  );
}

function LoadingDot({ delay, theme }: { delay: number; theme: any }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: theme.primary, transform: [{ scale: scaleAnim }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientCircle: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    top: -width * 0.5,
    right: -width * 0.5,
  },
  gradientCircle2: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    bottom: -width * 0.3,
    left: -width * 0.4,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    marginTop: 8,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import Button from '../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function Index() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const { theme, loadTheme } = useThemeStore();
  const hasLoaded = useRef(false);
  const [showSplash, setShowSplash] = useState(true);

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

      // Hide splash after delay
      setTimeout(() => {
        setShowSplash(false);
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 1800);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !showSplash) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, showSplash]);

  // Splash Screen
  if (showSplash || isLoading) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: theme.background }]}>
        {/* Background gradient circles */}
        <View style={[styles.gradientCircle, { backgroundColor: theme.primary + '15' }]} />
        <View style={[styles.gradientCircle2, { backgroundColor: theme.primary + '10' }]} />
        
        {/* Logo */}
        <Animated.View
          style={[
            styles.splashLogoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.splashLogoWrapper, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="scan" size={60} color={theme.primary} />
          </View>
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
          <Text style={[styles.splashAppName, { color: theme.text }]}>ScanUp</Text>
          <Text style={[styles.splashTagline, { color: theme.textSecondary }]}>
            Smart Document Scanner
          </Text>
        </Animated.View>

        {/* Loading dots */}
        <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
          <ActivityIndicator size="small" color={theme.primary} />
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={[styles.content, { opacity: contentFadeAnim }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={[styles.logoWrapper, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="scan" size={50} color={theme.primary} />
          </View>
          <Text style={[styles.logoText, { color: theme.text }]}>ScanUp</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            Smart Document Scanner
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem 
            icon="camera" 
            title="Live Edge Detection"
            description="Auto-detect document boundaries"
            theme={theme}
          />
          <FeatureItem 
            icon="text" 
            title="AI-Powered OCR"
            description="Extract text instantly"
            theme={theme}
          />
          <FeatureItem 
            icon="color-wand" 
            title="Smart Enhancement"
            description="Auto-correct & beautify scans"
            theme={theme}
          />
          <FeatureItem 
            icon="cloud-upload" 
            title="Cloud Sync"
            description="Access from anywhere"
            theme={theme}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            onPress={() => router.push('/(auth)/register')}
            size="large"
            style={styles.button}
          />
          
          <View style={styles.signinRow}>
            <Text style={[styles.signinText, { color: theme.textMuted }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.signinLink, { color: theme.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.guestButton}
            onPress={() => {
              useAuthStore.getState().continueAsGuest();
              router.replace('/(tabs)');
            }}
          >
            <Ionicons name="scan-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.guestText, { color: theme.textMuted }]}>
              Continue without login
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function FeatureItem({ 
  icon, 
  title, 
  description,
  theme 
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  title: string;
  description: string;
  theme: any;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <View style={styles.featureTextContainer}>
        <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: theme.textMuted }]}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Splash Screen Styles
  splashContainer: {
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
  splashLogoContainer: {
    marginBottom: 24,
  },
  splashLogoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTextContainer: {
    alignItems: 'center',
  },
  splashAppName: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  splashTagline: {
    fontSize: 16,
    marginTop: 8,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
  },

  // Main Landing Page Styles
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    marginTop: 4,
  },
  features: {
    marginVertical: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  button: {
    marginBottom: 12,
  },
});

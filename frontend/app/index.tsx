import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import Button from '../src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const { theme, loadTheme } = useThemeStore();
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadTheme();
      loadStoredAuth();
    }
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <View style={styles.logoWrapper}>
          <Ionicons name="scan" size={50} color={theme.primary} />
        </View>
        <Text style={[styles.logoText, { color: theme.text }]}>ScanUp</Text>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
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
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            variant="outline"
            size="large"
            style={styles.button}
          />
          <Button
            title="Continue as Guest"
            onPress={() => {
              useAuthStore.getState().continueAsGuest();
              router.replace('/(tabs)');
            }}
            variant="secondary"
            size="medium"
            style={[styles.button, { marginTop: 8 }]}
          />
        </View>
      </View>
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

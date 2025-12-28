import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function LoginScreen() {
  const { theme } = useThemeStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, googleLogin } = useAuthStore();

  const handleLogin = async () => {
    console.log('Login button pressed', { email, password: !!password });
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting login...');
      await login(email, password);
      console.log('Login successful, navigating...');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Please check your credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // Create the redirect URL based on platform
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/`
        : Linking.createURL('auth-callback');
      
      console.log('Google login redirect URL:', redirectUrl);
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      console.log('Opening auth URL:', authUrl);
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      console.log('WebBrowser result:', JSON.stringify(result, null, 2));
      
      if (result.type === 'success' && result.url) {
        // Parse session_id from URL - check multiple possible formats
        let sessionId = '';
        const url = result.url;
        console.log('Return URL:', url);
        
        // Try different URL patterns for session_id
        const patterns = [
          /[#?&]session_id=([^&]+)/,
          /session_id=([^&\s]+)/,
        ];
        
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match && match[1]) {
            sessionId = match[1];
            break;
          }
        }
        
        // Also try URL parsing
        if (!sessionId) {
          try {
            const parsedUrl = new URL(url);
            sessionId = parsedUrl.searchParams.get('session_id') || '';
            if (!sessionId && parsedUrl.hash) {
              const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
              sessionId = hashParams.get('session_id') || '';
            }
          } catch (e) {
            console.log('URL parsing error:', e);
          }
        }
        
        console.log('Parsed session_id:', sessionId ? 'found' : 'not found');
        
        if (sessionId) {
          await googleLogin(sessionId);
          router.replace('/(tabs)');
        } else {
          console.error('Session ID not found in URL:', url);
          Alert.alert('Error', 'Failed to get session from Google. Please try again.');
        }
      } else if (result.type === 'dismiss') {
        console.log('User dismissed the login');
      } else if (result.type === 'cancel') {
        console.log('User cancelled the login');
      } else {
        console.log('Auth result type:', result.type);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      Alert.alert('Error', error.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.surface }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              leftIcon="mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              leftIcon="lock-closed"
              value={password}
              onChangeText={setPassword}
              isPassword
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              size="large"
              style={styles.loginButton}
            />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>or continue with</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <Button
              title="Continue with Google"
              onPress={handleGoogleLogin}
              variant="secondary"
              size="large"
              loading={googleLoading}
              icon={<Ionicons name="logo-google" size={20} color={theme.text} />}
            />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.linkText, { color: theme.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    flex: 1,
  },
  loginButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

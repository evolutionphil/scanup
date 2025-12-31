import React, { useState, useEffect } from 'react';
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
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useI18n } from '../../src/store/i18nStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '215448198260-tqfp3kj7eucqlctatrq5j8q876kspc8o.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function LoginScreen() {
  const { theme } = useThemeStore();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, googleLogin, googleLoginNative } = useAuthStore();

  const handleLogin = async () => {
    console.log('Login button pressed', { email, password: !!password });
    if (!email || !password) {
      Alert.alert(t('error', 'Error'), t('please_fill_all_fields', 'Please fill in all fields'));
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
      Alert.alert(t('login_failed', 'Login Failed'), error.message || t('check_credentials', 'Please check your credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // Check if running on native platform (not web)
      if (Platform.OS !== 'web') {
        // Use native Google Sign-In
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        
        if (isSuccessResponse(response)) {
          const { data } = response;
          console.log('Google Sign-In success:', data.user.email);
          
          // Get ID token for backend authentication
          const tokens = await GoogleSignin.getTokens();
          
          // Send to backend for authentication
          if (googleLoginNative) {
            await googleLoginNative(tokens.idToken, data.user);
          } else {
            // Fallback: create/login user with Google data
            const backendResponse = await fetch(`${BACKEND_URL}/api/auth/google/native`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id_token: tokens.idToken,
                email: data.user.email,
                name: data.user.name,
                photo: data.user.photo,
              }),
            });
            
            if (backendResponse.ok) {
              const userData = await backendResponse.json();
              // Store auth data and navigate
              router.replace('/(tabs)');
            } else {
              throw new Error('Backend authentication failed');
            }
          }
          
          router.replace('/(tabs)');
        }
      } else {
        // Web platform - use existing WebBrowser auth
        const redirectUrl = `${window.location.origin}/`;
        const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
        
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          let sessionId = '';
          const url = result.url;
          
          const patterns = [/[#?&]session_id=([^&]+)/, /session_id=([^&\s]+)/];
          for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
              sessionId = match[1];
              break;
            }
          }
          
          if (sessionId) {
            await googleLogin(sessionId);
            router.replace('/(tabs)');
          } else {
            Alert.alert(t('error', 'Error'), t('google_session_failed', 'Failed to get session from Google. Please try again.'));
          }
        }
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('User cancelled the login');
            break;
          case statusCodes.IN_PROGRESS:
            Alert.alert(t('error', 'Error'), 'Sign in already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert(t('error', 'Error'), 'Google Play Services not available');
            break;
          default:
            Alert.alert(t('error', 'Error'), error.message || t('google_signin_failed', 'Google sign-in failed. Please try again.'));
        }
      } else {
        Alert.alert(t('error', 'Error'), error.message || t('google_signin_failed', 'Google sign-in failed. Please try again.'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };
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
          Alert.alert(t('error', 'Error'), t('google_session_failed', 'Failed to get session from Google. Please try again.'));
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
      Alert.alert(t('error', 'Error'), error.message || t('google_signin_failed', 'Google sign-in failed. Please try again.'));
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
            <Text style={[styles.title, { color: theme.text }]}>{t('welcome_back', 'Welcome Back')}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('sign_in_to_continue', 'Sign in to continue')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t('email', 'Email')}
              placeholder={t('enter_your_email', 'Enter your email')}
              leftIcon="mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label={t('password', 'Password')}
              placeholder={t('enter_your_password', 'Enter your password')}
              leftIcon="lock-closed"
              value={password}
              onChangeText={setPassword}
              isPassword
            />

            <Button
              title={t('sign_in', 'Sign In')}
              onPress={handleLogin}
              loading={loading}
              size="large"
              style={styles.loginButton}
            />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>{t('or_continue_with', 'or continue with')}</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <Button
              title={t('continue_with_google', 'Continue with Google')}
              onPress={handleGoogleLogin}
              variant="secondary"
              size="large"
              loading={googleLoading}
              icon={<Ionicons name="logo-google" size={20} color={theme.text} />}
            />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>{t('dont_have_account', "Don't have an account?")} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.linkText, { color: theme.primary }]}>{t('sign_up', 'Sign Up')}</Text>
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

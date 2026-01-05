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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useI18n } from '../../src/store/i18nStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Import Google Sign-In only on native platforms
let GoogleSignin: any = null;
let statusCodes: any = null;
let isSuccessResponse: any = null;
let isErrorWithCode: any = null;
let googleSignInConfigured = false;
let googleSignInInitialized = false;

// Lazy initialization to prevent crashes on app startup
const initializeGoogleSignIn = () => {
  if (googleSignInInitialized) return;
  googleSignInInitialized = true;
  
  if (Platform.OS === 'web') return;
  
  try {
    const googleSignInModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSignInModule.GoogleSignin;
    statusCodes = googleSignInModule.statusCodes;
    isSuccessResponse = googleSignInModule.isSuccessResponse;
    isErrorWithCode = googleSignInModule.isErrorWithCode;
    
    // Configure Google Sign-In
    if (Platform.OS === 'android') {
      GoogleSignin.configure({
        webClientId: '159628540720-tn2bcg6a2hgfgn29g1vm48khlaqvctke.apps.googleusercontent.com',
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });
      googleSignInConfigured = true;
      console.log('[GoogleSignIn] Configured for Android');
    } else if (Platform.OS === 'ios') {
      GoogleSignin.configure({
        iosClientId: '159628540720-b7ud87nk02prots1ur3o7mmel82htk65.apps.googleusercontent.com',
        webClientId: '159628540720-tn2bcg6a2hgfgn29g1vm48khlaqvctke.apps.googleusercontent.com',
        offlineAccess: true,
      });
      googleSignInConfigured = true;
      console.log('[GoogleSignIn] Configured for iOS with iosClientId');
    }
  } catch (e) {
    console.log('[GoogleSignIn] Not available:', e);
  }
};

export default function LoginScreen() {
  const { theme, mode } = useThemeStore();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = params.returnTo;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { login, googleLogin, googleLoginNative, appleLogin } = useAuthStore();
  
  // Helper function to navigate after successful login
  const navigateAfterLogin = () => {
    if (returnTo) {
      // Navigate to the returnTo path (e.g., /premium)
      router.replace(returnTo as any);
    } else {
      router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    // Check if Apple Sign-In is available
    const checkAppleAvailability = async () => {
      try {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setAppleAvailable(isAvailable);
      } catch (e) {
        console.log('Apple Auth not available:', e);
        setAppleAvailable(false);
      }
    };
    checkAppleAvailability();
  }, []);

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
      navigateAfterLogin();
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(t('login_failed', 'Login Failed'), error.message || t('check_credentials', 'Please check your credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Initialize Google Sign-In lazily
    initializeGoogleSignIn();
    
    // Check if Google Sign-In is configured for this platform
    if (Platform.OS === 'ios' && !googleSignInConfigured) {
      Alert.alert(
        t('google_signin_unavailable', 'Google Sign-In Unavailable'),
        t('use_apple_signin', 'Please use Apple Sign-In on iOS devices.')
      );
      return;
    }
    
    setGoogleLoading(true);
    try {
      // Use native Google Sign-In on mobile platforms
      if (Platform.OS !== 'web' && GoogleSignin && googleSignInConfigured) {
        console.log('[GoogleLogin] Using native Google Sign-In');
        console.log('[GoogleLogin] Checking Play Services...');
        
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        console.log('[GoogleLogin] Play Services available, starting sign-in...');
        
        const response = await GoogleSignin.signIn();
        console.log('[GoogleLogin] Sign-in response received');
        
        if (isSuccessResponse && isSuccessResponse(response)) {
          const { data } = response;
          console.log('[GoogleLogin] Native sign-in success:', data.user.email);
          
          // Get ID token for backend authentication
          const tokens = await GoogleSignin.getTokens();
          console.log('[GoogleLogin] Got tokens, sending to backend...');
          
          // Send to backend for authentication
          await googleLoginNative(tokens.idToken, data.user);
          navigateAfterLogin();
        } else {
          console.log('[GoogleLogin] Response was not success:', JSON.stringify(response));
          throw new Error('Google sign-in did not return success response');
        }
      } else {
        // Web platform - use WebBrowser auth (Emergent Auth)
        console.log('[GoogleLogin] Using WebBrowser auth for web');
        const redirectUrl = Platform.OS === 'web'
          ? `${window.location.origin}/`
          : Linking.createURL('/');
        
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
            navigateAfterLogin();
          } else {
            Alert.alert(t('error', 'Error'), t('google_session_failed', 'Failed to get session from Google. Please try again.'));
          }
        } else if (result.type !== 'dismiss') {
          Alert.alert(t('login_cancelled', 'Login Cancelled'), t('please_try_signing_in_again', 'Please try signing in again'));
        }
      }
    } catch (error: any) {
      console.error('[GoogleLogin] Error:', error);
      console.error('[GoogleLogin] Error code:', error.code);
      console.error('[GoogleLogin] Error message:', error.message);
      
      // Handle native Google Sign-In errors
      if (isErrorWithCode && isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes?.SIGN_IN_CANCELLED:
            console.log('[GoogleLogin] User cancelled');
            // Don't show error for user cancellation
            break;
          case statusCodes?.IN_PROGRESS:
            Alert.alert(t('error', 'Error'), t('sign_in_in_progress', 'Sign in already in progress'));
            break;
          case statusCodes?.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert(t('error', 'Error'), t('play_services_not_available', 'Google Play Services not available'));
            break;
          default:
            // For DEVELOPER_ERROR, provide helpful message
            if (error.code === 'DEVELOPER_ERROR' || error.message?.includes('DEVELOPER_ERROR')) {
              Alert.alert(
                'Google Sign-In Configuration Error',
                'DEVELOPER_ERROR: This usually means the SHA-1 fingerprint of the signing certificate is not registered in Firebase Console.\n\nPlease check:\n1. App signing certificate SHA-1 in Play Console\n2. Firebase Console > Project Settings > Your Apps\n\nError: ' + error.message
              );
            } else {
              Alert.alert(t('error', 'Error'), `${error.code || 'Unknown'}: ${error.message || t('google_signin_failed', 'Google sign-in failed. Please try again.')}`);
            }
        }
      } else {
        Alert.alert(t('error', 'Error'), error.message || t('google_signin_failed', 'Google sign-in failed. Please try again.'));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('Apple Sign-In success:', credential.user);
      
      // Send to backend for authentication
      const response = await fetch(`${BACKEND_URL}/api/auth/apple/native`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_token: credential.identityToken,
          user_id: credential.user,
          email: credential.email,
          full_name: credential.fullName ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (appleLogin) {
          await appleLogin(data);
        }
        navigateAfterLogin();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Apple authentication failed');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('Apple Sign-In cancelled by user');
        // Don't show error for user cancellation
      } else {
        console.error('Apple login error:', error);
        Alert.alert(t('error', 'Error'), error.message || t('apple_signin_failed', 'Apple sign-in failed. Please try again.'));
      }
    } finally {
      setAppleLoading(false);
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

            {/* Google Sign-In Button - show on all platforms */}
            <Button
              title={t('continue_with_google', 'Continue with Google')}
              onPress={handleGoogleLogin}
              variant="secondary"
              size="large"
              loading={googleLoading}
              icon={<Ionicons name="logo-google" size={20} color={theme.text} />}
            />

            {/* Apple Sign-In Button - only shown on iOS */}
            {appleAvailable && (
              <TouchableOpacity
                style={[
                  styles.appleButton,
                  { 
                    backgroundColor: mode === 'dark' ? '#FFFFFF' : '#000000',
                    marginTop: 12,
                  }
                ]}
                onPress={handleAppleLogin}
                disabled={appleLoading}
              >
                <Ionicons 
                  name="logo-apple" 
                  size={20} 
                  color={mode === 'dark' ? '#000000' : '#FFFFFF'} 
                />
                <Text style={[
                  styles.appleButtonText,
                  { color: mode === 'dark' ? '#000000' : '#FFFFFF' }
                ]}>
                  {appleLoading ? '...' : t('continue_with_apple', 'Continue with Apple')}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>{t('dont_have_account', "Don't have an account?")} </Text>
              <TouchableOpacity onPress={() => router.push(returnTo ? `/(auth)/register?returnTo=${encodeURIComponent(returnTo)}` : '/(auth)/register')}>
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
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
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

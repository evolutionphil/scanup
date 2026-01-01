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
import { useI18n } from '../../src/store/i18nStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function RegisterScreen() {
  const { theme } = useThemeStore();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, googleLogin } = useAuthStore();

  const handleRegister = async () => {
    console.log('[Register] Attempting registration...');
    
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert(t('error', 'Error'), t('please_fill_all_fields', 'Please fill in all fields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('error', 'Error'), t('passwords_do_not_match', 'Passwords do not match'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('error', 'Error'), t('password_min_length', 'Password must be at least 6 characters'));
      return;
    }

    setLoading(true);
    try {
      console.log('[Register] Calling register API...');
      await register(email, password, name);
      console.log('[Register] Success! Navigating...');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[Register] Error:', error.message);
      Alert.alert(t('registration_failed', 'Registration Failed'), error.message || t('please_try_again', 'Please try again'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/`
        : Linking.createURL('/');
      
      console.log('Google login redirect URL:', redirectUrl);
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      console.log('WebBrowser result:', JSON.stringify(result, null, 2));
      
      if (result.type === 'success' && result.url) {
        let sessionId = '';
        const url = result.url;
        console.log('Return URL:', url);
        
        if (url.includes('#session_id=')) {
          sessionId = url.split('#session_id=')[1]?.split('&')[0] || '';
        } else if (url.includes('?session_id=')) {
          sessionId = url.split('?session_id=')[1]?.split('&')[0] || '';
        }
        
        console.log('Parsed session_id:', sessionId ? 'found' : 'not found');
        
        if (sessionId) {
          await googleLogin(sessionId);
          router.replace('/(tabs)');
        } else {
          Alert.alert(t('error', 'Error'), t('google_session_failed', 'Failed to get session from Google. Please try again.'));
        }
      } else if (result.type === 'dismiss') {
        console.log('User dismissed the login');
      } else {
        console.log('Auth result type:', result.type);
        Alert.alert(t('login_cancelled', 'Login Cancelled'), t('please_try_signing_in_again', 'Please try signing in again'));
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      Alert.alert(t('error', 'Error'), t('google_signin_failed', 'Google sign-in failed'));
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
            <Text style={[styles.title, { color: theme.text }]}>{t('create_account', 'Create Account')}</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('sign_up_to_get_started', 'Sign up to get started')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t('full_name', 'Full Name')}
              placeholder={t('enter_your_name', 'Enter your name')}
              leftIcon="person"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

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
              placeholder={t('create_a_password', 'Create a password')}
              leftIcon="lock-closed"
              value={password}
              onChangeText={setPassword}
              isPassword
            />

            <Input
              label={t('confirm_password', 'Confirm Password')}
              placeholder={t('confirm_your_password', 'Confirm your password')}
              leftIcon="lock-closed"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
            />

            <Button
              title={t('create_account', 'Create Account')}
              onPress={handleRegister}
              loading={loading}
              size="large"
              style={styles.registerButton}
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
              <Text style={[styles.footerText, { color: theme.textMuted }]}>{t('already_have_account', 'Already have an account?')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={[styles.linkText, { color: theme.primary }]}>{t('sign_in', 'Sign In')}</Text>
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
    marginTop: 32,
    marginBottom: 32,
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
  registerButton: {
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

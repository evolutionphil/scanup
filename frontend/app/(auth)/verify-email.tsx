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
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { useThemeStore } from '../../src/store/themeStore';
import { useI18n } from '../../src/store/i18nStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function VerifyEmailScreen() {
  const { theme } = useThemeStore();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ email?: string; returnTo?: string }>();
  const email = params.email || '';
  const returnTo = params.returnTo;
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 4) {
      Alert.alert(t('error', 'Error'), t('enter_4_digit_code', 'Please enter the 4-digit code'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase(),
          verification_code: code,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          t('success', 'Success'),
          t('email_verified_success', 'Your email has been verified! You can now login.'),
          [{ 
            text: 'OK', 
            onPress: () => {
              // Safely navigate to login
              if (returnTo && returnTo.length > 0) {
                router.replace(`/(auth)/login?returnTo=${encodeURIComponent(returnTo)}`);
              } else {
                router.replace('/(auth)/login');
              }
            }
          }]
        );
      } else {
        Alert.alert(t('error', 'Error'), data.detail || t('invalid_code', 'Invalid verification code'));
      }
    } catch (error) {
      Alert.alert(t('error', 'Error'), t('network_error', 'Network error. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setResendLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(t('code_sent', 'Code Sent'), t('new_code_sent', 'A new verification code has been sent to your email.'));
        setCountdown(60); // 60 seconds cooldown
      } else {
        Alert.alert(t('error', 'Error'), data.detail || t('failed_to_send_code', 'Failed to send code'));
      }
    } catch (error) {
      Alert.alert(t('error', 'Error'), t('network_error', 'Network error. Please try again.'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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

          <View style={styles.iconContainer}>
            <View style={[styles.iconBackground, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="mail-open" size={40} color={theme.primary} />
            </View>
          </View>

          <View style={styles.form}>
            <Text style={[styles.title, { color: theme.text }]}>
              {t('verify_email', 'Verify Your Email')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {t('verify_email_description', 'We sent a 4-digit verification code to')}{'\n'}
              <Text style={{ fontWeight: '600', color: theme.text }}>{email}</Text>
            </Text>

            <Input
              label={t('verification_code', 'Verification Code')}
              placeholder="1234"
              leftIcon="keypad"
              value={code}
              onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
            />

            <Button
              title={t('verify', 'Verify')}
              onPress={handleVerify}
              loading={loading}
              size="large"
              style={styles.button}
            />

            <TouchableOpacity 
              onPress={handleResendCode} 
              style={styles.resendLink}
              disabled={countdown > 0 || resendLoading}
            >
              <Text style={[
                styles.resendText, 
                { color: countdown > 0 ? theme.textMuted : theme.primary }
              ]}>
                {countdown > 0 
                  ? `${t('resend_code_in', 'Resend code in')} ${countdown}s`
                  : resendLoading 
                    ? `${t('sending', 'Sending')}...`
                    : t('resend_code', 'Resend Code')
                }
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              {t('wrong_email', 'Wrong email?')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.linkText, { color: theme.primary }]}>
                {t('go_back', 'Go Back')}
              </Text>
            </TouchableOpacity>
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
    marginBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    marginTop: 16,
  },
  resendLink: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
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

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
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { useThemeStore } from '../../src/store/themeStore';
import { useI18n } from '../../src/store/i18nStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Step = 'email' | 'code' | 'newPassword';

export default function ForgotPasswordScreen() {
  const { theme } = useThemeStore();
  const { t } = useI18n();
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async () => {
    if (!email.trim()) {
      Alert.alert(t('error', 'Error'), t('enter_email', 'Please enter your email'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          t('code_sent', 'Code Sent'),
          t('check_email_for_code', 'Please check your email for the 4-digit reset code.')
        );
        setStep('code');
      } else {
        Alert.alert(t('error', 'Error'), data.detail || t('failed_to_send_code', 'Failed to send reset code'));
      }
    } catch (error) {
      Alert.alert(t('error', 'Error'), t('network_error', 'Network error. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 4) {
      Alert.alert(t('error', 'Error'), t('enter_4_digit_code', 'Please enter the 4-digit code'));
      return;
    }
    setStep('newPassword');
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('error', 'Error'), t('password_min_length', 'Password must be at least 6 characters'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('error', 'Error'), t('passwords_dont_match', 'Passwords do not match'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          reset_code: code,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          t('success', 'Success'),
          t('password_reset_success', 'Your password has been reset. Please login with your new password.'),
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        Alert.alert(t('error', 'Error'), data.detail || t('failed_to_reset_password', 'Failed to reset password'));
      }
    } catch (error) {
      Alert.alert(t('error', 'Error'), t('network_error', 'Network error. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <Text style={[styles.title, { color: theme.text }]}>
        {t('forgot_password', 'Forgot Password?')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {t('forgot_password_description', 'Enter your email address and we will send you a 4-digit code to reset your password.')}
      </Text>

      <Input
        label={t('email', 'Email')}
        placeholder={t('enter_your_email', 'Enter your email')}
        leftIcon="mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button
        title={t('send_code', 'Send Code')}
        onPress={handleRequestCode}
        loading={loading}
        size="large"
        style={styles.button}
      />
    </>
  );

  const renderCodeStep = () => (
    <>
      <Text style={[styles.title, { color: theme.text }]}>
        {t('enter_code', 'Enter Code')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {t('enter_code_description', 'We sent a 4-digit code to')} {email}
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
        title={t('verify_code', 'Verify Code')}
        onPress={handleVerifyCode}
        loading={loading}
        size="large"
        style={styles.button}
      />

      <TouchableOpacity onPress={handleRequestCode} style={styles.resendLink}>
        <Text style={[styles.resendText, { color: theme.primary }]}>
          {t('resend_code', 'Resend Code')}
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderNewPasswordStep = () => (
    <>
      <Text style={[styles.title, { color: theme.text }]}>
        {t('create_new_password', 'Create New Password')}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {t('new_password_description', 'Enter your new password below.')}
      </Text>

      <Input
        label={t('new_password', 'New Password')}
        placeholder={t('enter_new_password', 'Enter new password')}
        leftIcon="lock-closed"
        value={newPassword}
        onChangeText={setNewPassword}
        isPassword
      />

      <Input
        label={t('confirm_password', 'Confirm Password')}
        placeholder={t('confirm_new_password', 'Confirm new password')}
        leftIcon="lock-closed"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        isPassword
      />

      <Button
        title={t('reset_password', 'Reset Password')}
        onPress={handleResetPassword}
        loading={loading}
        size="large"
        style={styles.button}
      />
    </>
  );

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
            onPress={() => {
              if (step === 'code') setStep('email');
              else if (step === 'newPassword') setStep('code');
              else router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <View style={[styles.iconBackground, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons 
                name={step === 'newPassword' ? 'lock-closed' : 'mail'} 
                size={40} 
                color={theme.primary} 
              />
            </View>
          </View>

          <View style={styles.form}>
            {step === 'email' && renderEmailStep()}
            {step === 'code' && renderCodeStep()}
            {step === 'newPassword' && renderNewPasswordStep()}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              {t('remember_password', 'Remember your password?')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={[styles.linkText, { color: theme.primary }]}>
                {t('sign_in', 'Sign In')}
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

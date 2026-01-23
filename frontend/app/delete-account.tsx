import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { useAuthStore } from '../src/store/authStore';
import { useI18n } from '../src/store/i18nStore';

export default function DeleteAccountScreen() {
  const { theme } = useThemeStore();
  const { user, deleteAccount } = useAuthStore();
  const { t } = useI18n();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleDeleteAccount = async () => {
    if (!confirmed) {
      Alert.alert(
        t('confirmation_required', 'Confirmation Required'),
        t('please_confirm_checkbox', 'Please check the confirmation box to proceed.')
      );
      return;
    }

    Alert.alert(
      t('final_warning', '⚠️ Final Warning'),
      t('final_warning_message', 'This is your last chance to cancel. Once deleted, your account and ALL data will be permanently erased and CANNOT be recovered.\n\nAre you absolutely sure?'),
      [
        { 
          text: t('cancel', 'Cancel'), 
          style: 'cancel' 
        },
        {
          text: t('yes_delete_everything', 'Yes, Delete Everything'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount();
              Alert.alert(
                t('account_deleted', 'Account Deleted'),
                t('account_deleted_success', 'Your account and all associated data have been permanently deleted. We are sorry to see you go.'),
                [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(auth)/login'),
                  },
                ]
              );
            } catch (error: any) {
              console.error('Delete account error:', error);
              Alert.alert(
                t('error', 'Error'),
                error.message || t('delete_failed', 'Failed to delete account. Please try again or contact support.')
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          disabled={isDeleting}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('delete_account', 'Delete Account')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Icon */}
        <View style={styles.warningIconContainer}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning" size={48} color="#EF4444" />
          </View>
        </View>

        {/* Warning Title */}
        <Text style={[styles.warningTitle, { color: '#EF4444' }]}>
          {t('permanent_action', 'This Action is Permanent')}
        </Text>

        {/* Warning Description */}
        <Text style={[styles.warningDescription, { color: theme.textMuted }]}>
          {t('delete_account_description', 'Deleting your account will permanently remove all your data from our servers. This action cannot be undone.')}
        </Text>

        {/* What will be deleted */}
        <View style={[styles.infoCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Text style={[styles.infoTitle, { color: '#991B1B' }]}>
            {t('what_will_be_deleted', 'What will be deleted:')}
          </Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="document-text" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('all_documents', 'All your scanned documents and pages')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="folder" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('all_folders', 'All your folders and organization')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="create" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('all_signatures', 'All your saved signatures')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="cloud" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('all_cloud_data', 'All cloud-stored images and backups')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('account_info', 'Your account information and settings')}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="star" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('subscription_info', 'Subscription status (if any)')}
            </Text>
          </View>
        </View>

        {/* Cannot recover warning */}
        <View style={[styles.cannotRecoverBox, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
          <Ionicons name="alert-circle" size={24} color="#D97706" />
          <Text style={[styles.cannotRecoverText, { color: '#92400E' }]}>
            {t('cannot_recover_warning', 'Once deleted, your data CANNOT be recovered. Please make sure you have exported any important documents before proceeding.')}
          </Text>
        </View>

        {/* User Email Display */}
        <View style={[styles.userInfoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.userInfoLabel, { color: theme.textMuted }]}>
            {t('account_to_delete', 'Account to be deleted:')}
          </Text>
          <Text style={[styles.userEmail, { color: theme.text }]}>
            {user?.email || 'Unknown'}
          </Text>
        </View>

        {/* Confirmation Checkbox */}
        <TouchableOpacity 
          style={styles.confirmationRow}
          onPress={() => setConfirmed(!confirmed)}
          disabled={isDeleting}
        >
          <View style={[
            styles.checkbox, 
            { borderColor: confirmed ? '#EF4444' : theme.border },
            confirmed && { backgroundColor: '#EF4444' }
          ]}>
            {confirmed && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={[styles.confirmationText, { color: theme.text }]}>
            {t('confirm_delete_checkbox', 'I understand that this action is permanent and all my data will be permanently deleted.')}
          </Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={[
            styles.deleteButton,
            { backgroundColor: confirmed ? '#EF4444' : '#FCA5A5' },
            isDeleting && { opacity: 0.7 }
          ]}
          onPress={handleDeleteAccount}
          disabled={isDeleting || !confirmed}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>
                {t('delete_my_account', 'Delete My Account')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: theme.border }]}
          onPress={() => router.back()}
          disabled={isDeleting}
        >
          <Text style={[styles.cancelButtonText, { color: theme.text }]}>
            {t('cancel_keep_account', 'Cancel & Keep My Account')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  warningIconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  warningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  warningDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  cannotRecoverBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  cannotRecoverText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  userInfoBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center',
  },
  userInfoLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  confirmationText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

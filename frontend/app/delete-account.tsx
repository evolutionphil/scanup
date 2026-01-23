import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
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
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeletePress = () => {
    if (!confirmed) {
      setErrorMsg(t('please_confirm_checkbox', 'Please check the confirmation box to proceed.'));
      return;
    }
    setErrorMsg(null);
    setShowFinalConfirm(true);
  };

  const handleFinalDelete = async () => {
    console.log('[DeleteAccount] Starting deletion...');
    setIsDeleting(true);
    setShowFinalConfirm(false);
    setErrorMsg(null);
    
    try {
      console.log('[DeleteAccount] Calling deleteAccount...');
      await deleteAccount();
      console.log('[DeleteAccount] Account deleted successfully');
      setDeleteSuccess(true);
    } catch (error: any) {
      console.error('[DeleteAccount] Error:', error);
      setErrorMsg(error.message || t('delete_failed', 'Failed to delete account. Please try again.'));
      setIsDeleting(false);
    }
  };

  const handleSuccessOk = () => {
    router.replace('/(auth)/login');
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
          {t('permanent_action', 'Bu İşlem Kalıcıdır!')}
        </Text>

        {/* Warning Description */}
        <Text style={[styles.warningDescription, { color: theme.textMuted }]}>
          {t('delete_account_description', 'Hesabınızı sildiğinizde tüm verileriniz sunucularımızdan kalıcı olarak kaldırılacaktır. Bu işlem geri alınamaz.')}
        </Text>

        {/* What will be deleted */}
        <View style={[styles.infoCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Text style={[styles.infoTitle, { color: '#991B1B' }]}>
            {t('what_will_be_deleted', 'Silinecek Veriler:')}
          </Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="document-text" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('all_documents', 'Tüm taranmış dokümanlarınız ve sayfalar')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="folder" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('all_folders', 'Tüm klasörleriniz ve organizasyon')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="create" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('all_signatures', 'Tüm kayıtlı imzalarınız')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="cloud" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('all_cloud_data', 'Tüm bulut depolama verileri ve yedekler')}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('account_info', 'Hesap bilgileriniz ve ayarlarınız')}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="star" size={20} color="#DC2626" />
            <Text style={[styles.infoText, { color: '#991B1B' }]}>
              {t('subscription_info', 'Abonelik durumunuz (varsa)')}
            </Text>
          </View>
        </View>

        {/* Cannot recover warning */}
        <View style={[styles.cannotRecoverBox, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}>
          <Ionicons name="alert-circle" size={24} color="#D97706" />
          <Text style={[styles.cannotRecoverText, { color: '#92400E' }]}>
            {t('cannot_recover_warning', 'Silindikten sonra verileriniz GERİ GETİRİLEMEZ. Lütfen devam etmeden önce önemli dokümanlarınızı dışa aktardığınızdan emin olun.')}
          </Text>
        </View>

        {/* Subscription Warning */}
        <View style={[styles.subscriptionWarning, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <Ionicons name="card" size={24} color="#2563EB" />
          <View style={styles.subscriptionTextContainer}>
            <Text style={[styles.subscriptionTitle, { color: '#1E40AF' }]}>
              {t('subscription_warning_title', 'Abonelik Uyarısı')}
            </Text>
            <Text style={[styles.subscriptionText, { color: '#1E40AF' }]}>
              {t('subscription_warning_text', 'Aktif bir aboneliğiniz varsa, hesabınızı silmeden ÖNCE aboneliğinizi Apple/Google ayarlarından manuel olarak iptal etmeniz gerekmektedir. Aksi takdirde ücretlendirilmeye devam edebilirsiniz.')}
            </Text>
            <Text style={[styles.subscriptionHint, { color: '#3B82F6' }]}>
              {t('subscription_cancel_hint', 'iOS: Ayarlar → Apple ID → Abonelikler\nAndroid: Play Store → Abonelikler')}
            </Text>
          </View>
        </View>

        {/* User Email Display */}
        <View style={[styles.userInfoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.userInfoLabel, { color: theme.textMuted }]}>
            {t('account_to_delete', 'Silinecek hesap:')}
          </Text>
          <Text style={[styles.userEmail, { color: theme.text }]}>
            {user?.email || 'Unknown'}
          </Text>
        </View>

        {/* Error Message */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Confirmation Checkbox */}
        <TouchableOpacity 
          style={styles.confirmationRow}
          onPress={() => {
            setConfirmed(!confirmed);
            setErrorMsg(null);
          }}
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
            {t('confirm_delete_checkbox', 'Bu işlemin kalıcı olduğunu ve tüm verilerimin silineceğini anlıyorum.')}
          </Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={[
            styles.deleteButton,
            { backgroundColor: confirmed ? '#EF4444' : '#FCA5A5' },
            isDeleting && { opacity: 0.7 }
          ]}
          onPress={handleDeletePress}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.deleteButtonText}>
                {t('deleting', 'Siliniyor...')}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>
                {t('delete_my_account', 'Hesabımı Sil')}
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
            {t('cancel_keep_account', 'İptal Et & Hesabımı Koru')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Final Confirmation Modal */}
      <Modal
        visible={showFinalConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFinalConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="warning" size={40} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('final_warning_title', '⚠️ Son Uyarı!')}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textMuted }]}>
              {t('final_warning_message', 'Bu son şansınız. Silindikten sonra hesabınız ve TÜM verileriniz kalıcı olarak silinecek ve GERİ ALINAMAZ.\n\nKesinlikle emin misiniz?')}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                onPress={() => setShowFinalConfirm(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.text }]}>
                  {t('cancel', 'İptal')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={handleFinalDelete}
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.modalDeleteText}>
                  {t('yes_delete_everything', 'Evet, Her Şeyi Sil')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={deleteSuccess}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={40} color="#059669" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t('account_deleted', 'Hesap Silindi')}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textMuted }]}>
              {t('account_deleted_success', 'Hesabınız ve tüm ilişkili veriler kalıcı olarak silindi. Sizi aramızda görmekten mutluluk duymuştuk.')}
            </Text>
            
            <TouchableOpacity
              style={[styles.modalDeleteBtn, { backgroundColor: '#059669' }]}
              onPress={handleSuccessOk}
            >
              <Text style={styles.modalDeleteText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 16,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalDeleteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

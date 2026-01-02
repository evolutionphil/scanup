import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useI18n } from '../../src/store/i18nStore';
import { usePurchaseStore } from '../../src/store/purchaseStore';
import Button from '../../src/components/Button';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Free tier limits (should match backend)
const FREE_SCANS_PER_DAY = 10;
const FREE_SCANS_PER_MONTH = 100;
const FREE_OCR_PER_DAY = 3;

export default function ProfileScreen() {
  const { user, token, isGuest, logout, updateUser, startTrial } = useAuthStore();
  const { theme, mode, toggleTheme } = useThemeStore();
  const { t } = useI18n();
  const { isPremium, hasRemovedAds } = usePurchaseStore();
  const [upgrading, setUpgrading] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Avatar upload handler
  const handleAvatarPress = async () => {
    if (isGuest) {
      Alert.alert(
        t('sign_in_required', 'Sign In Required'),
        t('sign_in_to_change_avatar', 'Please sign in to change your avatar'),
        [
          { text: t('cancel', 'Cancel'), style: 'cancel' },
          { text: t('sign_in', 'Sign In'), onPress: () => router.push('/(auth)/login') }
        ]
      );
      return;
    }

    Alert.alert(
      t('change_avatar', 'Change Avatar'),
      t('choose_avatar_source', 'Choose a photo source'),
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        { text: t('camera', 'Camera'), onPress: () => pickImage('camera') },
        { text: t('gallery', 'Gallery'), onPress: () => pickImage('gallery') },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('permission_denied', 'Permission Denied'), t('camera_permission_needed', 'Camera permission is needed to take photos.'));
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('permission_denied', 'Permission Denied'), t('gallery_permission_needed', 'Gallery permission is needed to select photos.'));
          return;
        }
      }

      // Launch picker
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
          });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].base64 || '');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(t('error', 'Error'), t('failed_to_pick_image', 'Failed to pick image'));
    }
  };

  const uploadAvatar = async (base64Image: string) => {
    if (!token || !base64Image) return;

    setUploadingAvatar(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar_base64: base64Image }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local user data
        if (data.avatar_url) {
          updateUser({ ...user, photo_url: data.avatar_url, avatar_url: data.avatar_url });
        }
        Alert.alert(t('success', 'Success'), t('avatar_updated', 'Avatar updated successfully!'));
      } else {
        const error = await response.json();
        Alert.alert(t('error', 'Error'), error.detail || t('failed_to_upload_avatar', 'Failed to upload avatar'));
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert(t('error', 'Error'), t('failed_to_upload_avatar', 'Failed to upload avatar'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      isGuest ? t('exit_guest_mode', 'Exit Guest Mode') : t('logout', 'Logout'),
      isGuest ? t('exit_guest_confirm', 'Are you sure you want to exit?') : t('logout_confirm', 'Are you sure you want to logout?'),
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: isGuest ? t('exit', 'Exit') : t('logout', 'Logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Use longer timeout to ensure state is fully cleared before navigation
              setTimeout(() => {
                router.replace('/');
              }, 300);
            } catch (e) {
              console.error('Logout error:', e);
              router.replace('/');
            }
          },
        },
      ]
    );
  };

  const handleStartTrial = async () => {
    if (isGuest) {
      Alert.alert(t('sign_in_required', 'Sign In Required'), t('sign_in_to_start_trial', 'Please sign in to start your free trial.'), [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        { text: t('sign_in', 'Sign In'), onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    Alert.alert(
      t('start_7_day_trial', 'Start 7-Day Free Trial'),
      `${t('unlock_premium_features', 'Unlock all premium features for 7 days')}:\n\n• ${t('unlimited_scans', 'Unlimited scans')}\n• ${t('unlimited_ocr', 'Unlimited OCR')}\n• ${t('no_watermarks', 'No watermarks')}\n• ${t('all_premium_features', 'All premium features')}`,
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('start_trial', 'Start Trial'),
          onPress: async () => {
            setStartingTrial(true);
            try {
              await startTrial();
              Alert.alert(`🎉 ${t('trial_started', 'Trial Started!')}`, t('enjoy_premium', 'Enjoy 7 days of premium features!'));
            } catch (e) {
              Alert.alert(t('error', 'Error'), String(e) || t('something_went_wrong', 'Something went wrong'));
            } finally {
              setStartingTrial(false);
            }
          },
        },
      ]
    );
  };

  const handleUpgrade = async () => {
    if (isGuest) {
      Alert.alert(t('sign_in_required', 'Sign In Required'), t('sign_in_to_upgrade', 'Please sign in to upgrade to premium.'), [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        { text: t('sign_in', 'Sign In'), onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (user?.is_premium) {
      // Premium user - show manage subscription options
      Alert.alert(
        t('manage_subscription', 'Manage Subscription'),
        t('manage_subscription_info', 'To manage or cancel your subscription, please visit your device\'s subscription settings.'),
        [
          { text: t('ok', 'OK'), style: 'cancel' },
          {
            text: t('open_settings', 'Open Settings'),
            onPress: () => {
              // Open platform-specific subscription management
              if (Platform.OS === 'ios') {
                Linking.openURL('https://apps.apple.com/account/subscriptions');
              } else {
                Linking.openURL('https://play.google.com/store/account/subscriptions');
              }
            },
          },
        ]
      );
    } else {
      // Not premium - redirect to premium screen for real IAP
      router.push('/premium');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{t('profile', 'Profile')}</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handleAvatarPress}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : user?.photo_url || user?.picture || user?.avatar_url ? (
              <Image 
                source={{ uri: user.photo_url || user.picture || user.avatar_url }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>
                  {(user?.name || 'G')[0].toUpperCase()}
                </Text>
              </View>
            )}
            {user?.is_premium && (
              <View style={[styles.premiumBadgeSmall, { backgroundColor: theme.warning }]}>
                <Ionicons name="star" size={12} color="#FFF" />
              </View>
            )}
            {/* Edit icon overlay */}
            {!isGuest && (
              <View style={[styles.editAvatarBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.userName, { color: theme.text }]}>{user?.name || t('guest_user', 'Guest User')}</Text>
          <Text style={[styles.userEmail, { color: theme.textMuted }]}>
            {isGuest ? t('not_signed_in', 'Not signed in') : user?.email}
          </Text>
          
          {isGuest && (
            <TouchableOpacity 
              style={[styles.signInPrompt, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.signInPromptText}>{t('sign_in_to_sync', 'Sign In to Sync')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Premium/Trial Card */}
        {!isGuest && (
          <View style={[styles.card, { backgroundColor: theme.surface }, (user?.is_premium || user?.is_trial) && styles.premiumCardBorder]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: ((user?.is_premium || user?.is_trial) ? theme.warning : theme.primary) + '20' }]}>
                <Ionicons
                  name={(user?.is_premium || user?.is_trial) ? 'star' : 'star-outline'}
                  size={24}
                  color={(user?.is_premium || user?.is_trial) ? theme.warning : theme.primary}
                />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {user?.is_premium ? t('premium_member', 'Premium Member') : user?.is_trial ? `${t('trial', 'Trial')} (${user.trial_days_remaining || 0} ${t('days_left', 'days left')})` : t('free_plan', 'Free Plan')}
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                  {user?.is_premium ? t('all_features_unlocked', 'All features unlocked') : user?.is_trial ? t('full_access_during_trial', 'Full access during trial') : t('limited_features', 'Limited features')}
                </Text>
              </View>
            </View>

            {/* Show trial banner for free users who haven't used trial */}
            {!user?.is_premium && !user?.is_trial && (
              <View style={[styles.trialBanner, { backgroundColor: theme.success + '15', borderColor: theme.success + '30' }]}>
                <Ionicons name="gift-outline" size={20} color={theme.success} />
                <View style={styles.trialBannerText}>
                  <Text style={[styles.trialBannerTitle, { color: theme.success }]}>{t('try_premium_free', 'Try Premium Free')}</Text>
                  <Text style={[styles.trialBannerSubtitle, { color: theme.textMuted }]}>{t('seven_day_trial', '7-day trial, no credit card needed')}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.trialButton, { backgroundColor: theme.success }]}
                  onPress={handleStartTrial}
                  disabled={startingTrial}
                >
                  <Text style={styles.trialButtonText}>{startingTrial ? '...' : t('start', 'Start')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <Button
              title={user?.is_premium ? t('manage_subscription', 'Manage Subscription') : t('upgrade_to_pro', 'Upgrade to Pro')}
              onPress={handleUpgrade}
              loading={upgrading}
              variant={user?.is_premium ? 'secondary' : 'primary'}
            />
          </View>
        )}

        {/* Usage Stats */}
        {!isGuest && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('daily_usage', 'Daily Usage')}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {(user?.is_premium || user?.is_trial) ? '∞' : (user?.scans_remaining_today ?? FREE_SCANS_PER_DAY)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('scans_left', 'Scans Left')}</Text>
                {!(user?.is_premium || user?.is_trial) && (
                  <Text style={[styles.statSubLabel, { color: theme.textMuted }]}>/{FREE_SCANS_PER_DAY} {t('daily', 'daily')}</Text>
                )}
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {(user?.is_premium || user?.is_trial) ? '∞' : (user?.ocr_remaining_today ?? FREE_OCR_PER_DAY)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('ocr_left', 'OCR Left')}</Text>
                {!(user?.is_premium || user?.is_trial) && (
                  <Text style={[styles.statSubLabel, { color: theme.textMuted }]}>/{FREE_OCR_PER_DAY} {t('daily', 'daily')}</Text>
                )}
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {user?.is_premium ? t('pro', 'Pro') : user?.is_trial ? t('trial', 'Trial') : t('free', 'Free')}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>{t('plan', 'Plan')}</Text>
              </View>
            </View>
            
            {/* Monthly usage for free users */}
            {!(user?.is_premium || user?.is_trial) && (
              <View style={[styles.monthlyUsage, { borderTopColor: theme.border }]}>
                <Text style={[styles.monthlyLabel, { color: theme.textMuted }]}>{t('monthly_scans_remaining', 'Monthly scans remaining:')}</Text>
                <Text style={[styles.monthlyValue, { color: theme.text }]}>
                  {user?.scans_remaining_month ?? FREE_SCANS_PER_MONTH}/{FREE_SCANS_PER_MONTH}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Settings */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings', 'Settings')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={22} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('dark_mode', 'Dark Mode')}</Text>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFF"
            />
          </View>

          {!isGuest && (
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="cloud-outline" size={22} color={theme.textSecondary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>{t('auto_backup', 'Auto Backup')}</Text>
              </View>
              <Switch
                value={user?.is_premium || false}
                disabled={!user?.is_premium}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFF"
              />
            </View>
          )}

          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/settings')}>
            <View style={styles.settingLeft}>
              <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('all_settings', 'All Settings')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Remove Ads Button - Only show if not premium and hasn't removed ads */}
          {!isPremium && !hasRemovedAds && (
            <TouchableOpacity 
              style={[styles.settingRow, styles.removeAdsRow]} 
              onPress={() => router.push('/remove-ads')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="ban-outline" size={22} color="#22C55E" />
                <Text style={[styles.settingLabel, { color: '#22C55E', fontWeight: '600' }]}>{t('remove_ads', 'Remove Ads')}</Text>
              </View>
              <View style={styles.removeAdsBadge}>
                <Text style={styles.removeAdsBadgeText}>{t('one_time', 'One-time')}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Show Ad-Free badge if already removed */}
          {(isPremium || hasRemovedAds) && (
            <View style={[styles.settingRow, styles.adFreeRow]}>
              <View style={styles.settingLeft}>
                <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                <Text style={[styles.settingLabel, { color: '#22C55E' }]}>{t('ad_free', 'Ad-Free')}</Text>
              </View>
              <Ionicons name="checkmark" size={20} color="#22C55E" />
            </View>
          )}

          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/legal?type=support')}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={22} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('help_support', 'Help & Support')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={() => router.push('/legal?type=privacy')}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={22} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('privacy_policy', 'Privacy Policy')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Signatures Section */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('signatures', 'Signatures')}</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>
            {t('create_manage_signatures', 'Create and manage your saved signatures')}
          </Text>
          
          <TouchableOpacity 
            style={[styles.signatureCard, { backgroundColor: theme.background, borderColor: theme.border }]}
            onPress={() => router.push('/signatures')}
          >
            <View style={[styles.signatureIconBox, { backgroundColor: theme.primary + '15' }]}>
              <Ionicons name="pencil" size={24} color={theme.primary} />
            </View>
            <View style={styles.signatureCardText}>
              <Text style={[styles.signatureCardTitle, { color: theme.text }]}>{t('manage_signatures', 'Manage Signatures')}</Text>
              <Text style={[styles.signatureCardSubtitle, { color: theme.textMuted }]}>
                {t('create_edit_delete_signatures', 'Create, edit, and delete signatures')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign In / Logout Button */}
        {isGuest ? (
          <Button
            title={t('sign_in', 'Sign In')}
            onPress={() => router.push('/(auth)/login')}
            variant="primary"
            style={styles.logoutButton}
            icon={<Ionicons name="log-in-outline" size={20} color="#FFF" />}
          />
        ) : (
          <Button
            title={t('logout', 'Logout')}
            onPress={handleLogout}
            variant="danger"
            style={styles.logoutButton}
            icon={<Ionicons name="log-out-outline" size={20} color="#FFF" />}
          />
        )}

        <Text style={[styles.version, { color: theme.textMuted }]}>ScanUp v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
  },
  premiumBadgeSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  signInPrompt: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signInPromptText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  premiumCardBorder: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statSubLabel: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  monthlyUsage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  monthlyLabel: {
    fontSize: 13,
  },
  monthlyValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  trialBannerText: {
    flex: 1,
    marginLeft: 10,
  },
  trialBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  trialBannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  trialButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  trialButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100,100,100,0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  settingLabel: {
    fontSize: 15,
  },
  removeAdsRow: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  removeAdsBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeAdsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  adFreeRow: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    marginTop: -8,
  },
  signatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  signatureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  signatureCardText: {
    flex: 1,
  },
  signatureCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  signatureCardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import Button from '../../src/components/Button';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const { user, token, isGuest, logout, updateUser } = useAuthStore();
  const { theme, mode, toggleTheme } = useThemeStore();
  const [upgrading, setUpgrading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      isGuest ? 'Exit Guest Mode' : 'Logout',
      isGuest ? 'Are you sure you want to exit?' : 'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isGuest ? 'Exit' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleUpgrade = async () => {
    if (isGuest) {
      Alert.alert('Sign In Required', 'Please sign in to upgrade to premium.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    if (user?.is_premium) {
      Alert.alert(
        'Cancel Premium',
        'Are you sure you want to cancel your premium subscription?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              setUpgrading(true);
              try {
                const response = await fetch(`${BACKEND_URL}/api/users/subscription`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ subscription_type: 'free' }),
                });

                if (response.ok) {
                  const updatedUser = await response.json();
                  updateUser(updatedUser);
                  Alert.alert('Success', 'Your subscription has been cancelled');
                }
              } catch (e) {
                Alert.alert('Error', 'Failed to update subscription');
              } finally {
                setUpgrading(false);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Upgrade to Premium',
        'Unlock all features:\n\n• Unlimited OCR scans\n• Cloud sync across devices\n• Password-protected PDFs\n• Advanced image filters\n• No watermarks on exports',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade Now',
            onPress: async () => {
              setUpgrading(true);
              try {
                const response = await fetch(`${BACKEND_URL}/api/users/subscription`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ subscription_type: 'premium', duration_days: 30 }),
                });

                if (response.ok) {
                  const updatedUser = await response.json();
                  updateUser(updatedUser);
                  Alert.alert('Welcome to Premium!', 'Enjoy unlimited features.');
                }
              } catch (e) {
                Alert.alert('Error', 'Failed to upgrade');
              } finally {
                setUpgrading(false);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
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
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>{user?.name || 'Guest User'}</Text>
          <Text style={[styles.userEmail, { color: theme.textMuted }]}>
            {isGuest ? 'Not signed in' : user?.email}
          </Text>
          
          {isGuest && (
            <TouchableOpacity 
              style={[styles.signInPrompt, { backgroundColor: theme.primary }]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.signInPromptText}>Sign In to Sync</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Premium Card */}
        {!isGuest && (
          <View style={[styles.card, { backgroundColor: theme.surface }, user?.is_premium && styles.premiumCardBorder]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: (user?.is_premium ? theme.warning : theme.primary) + '20' }]}>
                <Ionicons
                  name={user?.is_premium ? 'star' : 'star-outline'}
                  size={24}
                  color={user?.is_premium ? theme.warning : theme.primary}
                />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {user?.is_premium ? 'Premium Member' : 'Free Plan'}
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
                  {user?.is_premium ? 'All features unlocked' : 'Limited features'}
                </Text>
              </View>
            </View>

            <Button
              title={user?.is_premium ? 'Manage Subscription' : 'Upgrade to Pro'}
              onPress={handleUpgrade}
              loading={upgrading}
              variant={user?.is_premium ? 'secondary' : 'primary'}
            />
          </View>
        )}

        {/* Usage Stats */}
        {!isGuest && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Usage</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  {user?.is_premium ? '∞' : user?.ocr_remaining_today || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>OCR Left Today</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {user?.is_premium ? 'Pro' : 'Free'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Current Plan</Text>
              </View>
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={22} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
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
                <Text style={[styles.settingLabel, { color: theme.text }]}>Auto Backup</Text>
              </View>
              <Switch
                value={user?.is_premium || false}
                disabled={!user?.is_premium}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFF"
              />
            </View>
          )}

          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={22} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={22} color={theme.textSecondary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <Button
          title={isGuest ? 'Exit Guest Mode' : 'Logout'}
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
          icon={<Ionicons name="log-out-outline" size={20} color="#FFF" />}
        />

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
    paddingBottom: 40,
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
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
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
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
});

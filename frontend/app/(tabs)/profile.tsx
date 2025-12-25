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
import Button from '../../src/components/Button';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfileScreen() {
  const { user, token, logout, updateUser } = useAuthStore();
  const [upgrading, setUpgrading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
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
    if (user?.is_premium) {
      // Downgrade to free
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
      // Upgrade to premium (mock)
      Alert.alert(
        'Upgrade to Premium',
        'This is a mock subscription. In production, this would integrate with Apple/Google payments.\n\nFeatures included:\n• Unlimited OCR\n• No watermarks\n• Cloud sync\n• Advanced filters\n• Password-protected PDFs',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Activate Premium',
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
                  Alert.alert('Success', 'Welcome to Premium!');
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#64748B" />
              </View>
            )}
            {user?.is_premium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={16} color="#FFF" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.planBadge}>
            <Text style={styles.planText}>
              {user?.is_premium ? 'Premium' : 'Free'} Plan
            </Text>
          </View>
        </View>

        {/* Premium Card */}
        <View style={[styles.card, user?.is_premium && styles.premiumCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrapper}>
              <Ionicons
                name={user?.is_premium ? 'star' : 'star-outline'}
                size={24}
                color={user?.is_premium ? '#F59E0B' : '#3B82F6'}
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>
                {user?.is_premium ? 'Premium Active' : 'Upgrade to Premium'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {user?.is_premium
                  ? 'Enjoy unlimited features'
                  : 'Unlock all features'}
              </Text>
            </View>
          </View>

          {!user?.is_premium && (
            <View style={styles.featureList}>
              <FeatureItem icon="infinite" text="Unlimited OCR scans" />
              <FeatureItem icon="cloud-upload" text="Cloud backup & sync" />
              <FeatureItem icon="lock-closed" text="Password-protected PDFs" />
              <FeatureItem icon="color-wand" text="Advanced filters" />
              <FeatureItem icon="checkmark-circle" text="No watermarks" />
            </View>
          )}

          <Button
            title={user?.is_premium ? 'Manage Subscription' : 'Upgrade Now'}
            onPress={handleUpgrade}
            loading={upgrading}
            variant={user?.is_premium ? 'secondary' : 'primary'}
            style={styles.upgradeButton}
          />
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Usage</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {user?.is_premium ? '∞' : `${user?.ocr_remaining_today || 0}/5`}
              </Text>
              <Text style={styles.statLabel}>OCR Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {user?.subscription_type === 'premium' ? 'Premium' : 'Free'}
              </Text>
              <Text style={styles.statLabel}>Plan</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={22} color="#64748B" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={true}
              trackColor={{ false: '#334155', true: '#3B82F6' }}
              thumbColor="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="cloud-outline" size={22} color="#64748B" />
              <Text style={styles.settingText}>Auto Backup</Text>
            </View>
            <Switch
              value={user?.is_premium || false}
              disabled={!user?.is_premium}
              trackColor={{ false: '#334155', true: '#3B82F6' }}
              thumbColor="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={22} color="#64748B" />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={22} color="#64748B" />
              <Text style={styles.settingText}>Terms & Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          style={styles.logoutButton}
          icon={<Ionicons name="log-out-outline" size={20} color="#FFF" />}
        />

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={18} color="#3B82F6" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  planBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  planText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  premiumCard: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  featureList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  upgradeButton: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#334155',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 15,
    color: '#E2E8F0',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  version: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    marginTop: 20,
  },
});

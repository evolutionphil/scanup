import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeStore } from '../src/store/themeStore';
import { useAuthStore } from '../src/store/authStore';
import { useI18n } from '../src/store/i18nStore';

interface WebAccessRequest {
  session_id: string;
  device_info: string;
  browser_info: string;
  ip_address: string;
  created_at: string;
  expires_at: string;
}

export default function WebAccessScreen() {
  const { theme } = useThemeStore();
  const { token } = useAuthStore();
  const { t } = useI18n();
  const [pendingRequests, setPendingRequests] = useState<WebAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

  const fetchPendingRequests = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/web-access/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    fetchPendingRequests();
    
    // Poll for new requests every 10 seconds
    const interval = setInterval(fetchPendingRequests, 10000);
    return () => clearInterval(interval);
  }, [fetchPendingRequests]);

  const handleApprove = async (sessionId: string, approve: boolean) => {
    setProcessing(sessionId);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/web-access/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          approve: approve,
        }),
      });

      if (response.ok) {
        Alert.alert(
          approve ? t('access_granted', 'Access Granted') : t('access_denied', 'Access Denied'),
          approve 
            ? t('web_access_approved_msg', 'Web access has been approved. You can now view your documents on the web dashboard.')
            : t('web_access_denied_msg', 'Web access request has been denied.'),
          [{ text: t('ok', 'OK') }]
        );
        
        // Remove from pending list
        setPendingRequests(prev => prev.filter(r => r.session_id !== sessionId));
      } else {
        const error = await response.json();
        Alert.alert(t('error', 'Error'), error.detail || 'Failed to process request');
      }
    } catch (error) {
      Alert.alert(t('error', 'Error'), 'Connection error. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleRevokeAll = async () => {
    Alert.alert(
      t('revoke_all_access', 'Revoke All Access'),
      t('revoke_all_confirm', 'This will sign out all web sessions. Are you sure?'),
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('revoke_all_access', 'Revoke All'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/auth/web-access/revoke`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert(t('success', 'Success'), t('all_sessions_revoked', 'All web sessions have been revoked.'));
                setPendingRequests([]);
              }
            } catch (error) {
              Alert.alert(t('error', 'Error'), 'Failed to revoke access.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return t('request_expired', 'Expired');
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getBrowserIcon = (browserInfo: string) => {
    const info = browserInfo.toLowerCase();
    if (info.includes('chrome')) return 'logo-chrome';
    if (info.includes('firefox')) return 'logo-firefox';
    if (info.includes('safari')) return 'logo-apple';
    if (info.includes('edge')) return 'logo-edge';
    return 'globe-outline';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('web_access', 'Web Access')}
        </Text>
        <TouchableOpacity 
          onPress={handleRevokeAll}
          style={styles.revokeButton}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPendingRequests();
            }}
          />
        }
      >
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
          <View style={styles.infoIcon}>
            <Ionicons name="shield-checkmark" size={32} color="#3E51FB" />
          </View>
          <Text style={[styles.infoTitle, { color: theme.text }]}>
            {t('secure_access_required', 'Secure Web Access')}
          </Text>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            {t('web_access_desc', 'When you sign in to the web dashboard, you\'ll need to approve the request here. This keeps your documents secure.')}
          </Text>
        </View>

        {/* Pending Requests */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('pending_requests', 'Pending Requests')}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3E51FB" />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              {t('loading', 'Loading...')}
            </Text>
          </View>
        ) : pendingRequests.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {t('no_pending_requests', 'No Pending Requests')}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t('no_pending_requests_desc', 'When you sign in to the web dashboard, requests will appear here.')}
            </Text>
          </View>
        ) : (
          pendingRequests.map((request) => (
            <View 
              key={request.session_id} 
              style={[styles.requestCard, { backgroundColor: theme.card }]}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestIcon}>
                  <Ionicons 
                    name={getBrowserIcon(request.browser_info)} 
                    size={24} 
                    color="#3E51FB" 
                  />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={[styles.requestDevice, { color: theme.text }]}>
                    {request.device_info}
                  </Text>
                  <Text style={[styles.requestMeta, { color: theme.textSecondary }]}>
                    {t('ip_address', 'IP')}: {request.ip_address}
                  </Text>
                </View>
                <View style={styles.requestTimer}>
                  <Ionicons name="time-outline" size={14} color="#F59E0B" />
                  <Text style={styles.timerText}>
                    {getTimeRemaining(request.expires_at)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.requestBrowser, { color: theme.textSecondary }]} numberOfLines={1}>
                {request.browser_info.substring(0, 50)}...
              </Text>

              <Text style={[styles.requestTime, { color: theme.textSecondary }]}>
                {t('requested', 'Requested')}: {formatDate(request.created_at)}
              </Text>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.denyButton]}
                  onPress={() => handleApprove(request.session_id, false)}
                  disabled={processing === request.session_id}
                >
                  {processing === request.session_id ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="close" size={20} color="#EF4444" />
                      <Text style={styles.denyText}>{t('deny', 'Deny')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprove(request.session_id, true)}
                  disabled={processing === request.session_id}
                >
                  {processing === request.session_id ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={styles.approveText}>{t('approve', 'Approve')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Security Tips */}
        <View style={[styles.tipsCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.tipsTitle, { color: theme.text }]}>
            <Ionicons name="bulb" size={16} color="#F59E0B" /> {t('security_tips', 'Security Tips')}
          </Text>
          <Text style={[styles.tipsText, { color: theme.textSecondary }]}>
            • {t('security_tip_1', 'Only approve requests you initiated')}{'\n'}
            • {t('security_tip_2', 'Check the IP address matches your location')}{'\n'}
            • {t('security_tip_3', 'Deny suspicious or unknown requests')}{'\n'}
            • {t('security_tip_4', 'Use "Revoke All" if you suspect unauthorized access')}
          </Text>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  revokeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(62, 81, 251, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(62, 81, 251, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  requestDevice: {
    fontSize: 16,
    fontWeight: '600',
  },
  requestMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  requestTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  requestBrowser: {
    fontSize: 12,
    marginBottom: 8,
  },
  requestTime: {
    fontSize: 12,
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  denyButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  denyText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  approveText: {
    color: 'white',
    fontWeight: '600',
  },
  tipsCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    lineHeight: 22,
  },
});

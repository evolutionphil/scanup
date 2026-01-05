import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../src/store/themeStore';
import { useI18n } from '../src/store/i18nStore';
import { usePurchaseStore, CANONICAL_PRODUCTS } from '../src/store/purchaseStore';
import { useAuthStore } from '../src/store/authStore';
import { logScreenView, logEvent, logPurchaseEvent, AnalyticsEvents } from '../src/services/analytics';

const BRAND_GREEN = '#22C55E';

// Remove Ads features list
const REMOVE_ADS_FEATURES = [
  { key: 'no_banner_ads', fallback: 'No banner ads' },
  { key: 'no_interstitial_ads', fallback: 'No interstitial ads' },
  { key: 'no_video_ads', fallback: 'No video ads' },
  { key: 'faster_experience', fallback: 'Faster app experience' },
  { key: 'one_time_payment', fallback: 'One-time payment (no subscription)' },
];

export default function RemoveAdsScreen() {
  const { theme } = useThemeStore();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isGuest, continueAsGuest } = useAuthStore();
  const {
    isInitialized,
    isLoading,
    isPremium,
    hasRemovedAds,
    products,
    error,
    initialize,
    purchaseProduct,
    restorePurchases,
    setError,
  } = usePurchaseStore();

  useEffect(() => {
    initialize();
    logScreenView('RemoveAds', 'RemoveAdsScreen');
    logEvent('remove_ads_screen_viewed');
  }, []);

  // Handle back button
  const handleClose = () => {
    try {
      if (!isAuthenticated && !isGuest) {
        continueAsGuest();
      }
      router.back();
    } catch (e) {
      router.push('/(tabs)');
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Get price from fetched products - using canonicalId
  const getPrice = () => {
    const prod = products.find(p => p.canonicalId === CANONICAL_PRODUCTS.REMOVE_ADS);
    if (prod) return prod.localizedPrice;
    // Return empty string if not loaded yet - will show loading state
    return '';
  };

  const removeAdsPrice = getPrice();
  const isPriceLoaded = removeAdsPrice !== '';

  const handlePurchase = async () => {
    // Check if user is logged in (not guest)
    if (isGuest || !isAuthenticated) {
      // Redirect to login with return path to remove-ads screen
      router.push('/(auth)/login?returnTo=/remove-ads');
      return;
    }
    
    setError(null);
    
    const canonicalId = CANONICAL_PRODUCTS.REMOVE_ADS;
    logPurchaseEvent('started', canonicalId);
    
    const success = await purchaseProduct(canonicalId);
    
    if (success) {
      logPurchaseEvent('completed', canonicalId);
      Alert.alert(
        t('purchase_success', 'Purchase Successful!'),
        t('ads_removed_message', 'Ads have been removed. Enjoy an ad-free experience!'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else if (error) {
      logPurchaseEvent('failed', canonicalId, undefined, undefined, error);
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
    
    const state = usePurchaseStore.getState();
    if (state.hasRemovedAds) {
      logEvent('purchases_restored');
      Alert.alert(
        t('restore_success', 'Restore Successful!'),
        t('ads_already_removed', 'Your ad-free purchase has been restored.'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        t('no_purchases', 'No Purchases Found'),
        t('no_purchases_message', 'We could not find any previous purchases to restore.')
      );
    }
  };

  const openTerms = () => {
    Linking.openURL('https://scanup.app/terms');
  };

  // If already removed ads or premium
  if (hasRemovedAds || isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerGreen}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Remove Ads</Text>
              <View style={styles.adFreeBadge}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              Ads are already removed!
            </Text>
          </View>
        </View>
        
        <View style={styles.successContent}>
          <Ionicons name="checkmark-circle" size={80} color={BRAND_GREEN} />
          <Text style={[styles.successTitle, { color: theme.text }]}>
            {t('ads_free', 'Ad-Free!')}
          </Text>
          <Text style={[styles.successSubtitle, { color: theme.textSecondary }]}>
            {t('enjoy_ad_free', 'Enjoy your ad-free experience')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Green Header */}
      <View style={[styles.headerGreen, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Remove Ads</Text>
            <View style={styles.adFreeBadge}>
              <Ionicons name="ban" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            {t('remove_ads_subtitle', 'Enjoy a clean, ad-free experience')}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Features List */}
        <View style={styles.featuresSection}>
          {REMOVE_ADS_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={18} color={BRAND_GREEN} />
              </View>
              <Text style={styles.featureText}>
                {t(`remove_ads_${feature.key}`, feature.fallback)}
              </Text>
            </View>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            {t('remove_ads_info', 'This is a one-time purchase. Pay once and never see ads again!')}
          </Text>
        </View>

        {/* Price Card */}
        <View style={styles.priceCard}>
          <View style={styles.priceContent}>
            <Text style={styles.priceLabel}>{t('one_time', 'One-time payment')}</Text>
            {isPriceLoaded ? (
              <Text style={styles.priceText}>{removeAdsPrice}</Text>
            ) : (
              <ActivityIndicator size="small" color={BRAND_GREEN} />
            )}
          </View>
          <View style={styles.lifetimeBadge}>
            <Text style={styles.lifetimeText}>{t('lifetime', 'Lifetime')}</Text>
          </View>
        </View>

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, isLoading && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {t('remove_ads_now', 'Remove Ads Now')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Want Premium? */}
        <TouchableOpacity 
          style={styles.premiumLink}
          onPress={() => router.push('/premium')}
        >
          <Text style={styles.premiumLinkText}>
            {t('want_more_features', 'Want more features? Go Premium')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
        </TouchableOpacity>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.footerLinkText}>
              {t('already_paid', 'Already Paid?')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openTerms}>
            <Text style={styles.footerLinkText}>
              {t('terms_of_use', 'Terms of Use')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerGreen: {
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    marginTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  adFreeBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  featuresSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BRAND_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  priceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: BRAND_GREEN,
    marginBottom: 24,
  },
  priceContent: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 28,
    fontWeight: '700',
    color: BRAND_GREEN,
  },
  lifetimeBadge: {
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  lifetimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  purchaseButton: {
    backgroundColor: BRAND_GREEN,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  premiumLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  premiumLinkText: {
    color: '#3B82F6',
    fontSize: 15,
    marginRight: 4,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 20,
  },
  footerLinkText: {
    color: '#6B7280',
    fontSize: 14,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
  },
  successSubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});

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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../src/store/themeStore';
import { useI18n } from '../src/store/i18nStore';
import { usePurchaseStore, PRODUCT_IDS } from '../src/store/purchaseStore';

const BRAND_BLUE = '#3B82F6';

// Premium features list
const PREMIUM_FEATURES = [
  { icon: 'ban-outline', key: 'no_ads', fallback: 'No Ads' },
  { icon: 'water-outline', key: 'no_watermark', fallback: 'No Watermark on Exports' },
  { icon: 'infinite-outline', key: 'unlimited_scans', fallback: 'Unlimited Scans' },
  { icon: 'cloud-outline', key: 'cloud_storage', fallback: '10 GB Cloud Storage' },
  { icon: 'text-outline', key: 'unlimited_ocr', fallback: 'Unlimited OCR Text Extraction' },
  { icon: 'lock-closed-outline', key: 'pdf_password', fallback: 'PDF Password Protection' },
  { icon: 'layers-outline', key: 'batch_export', fallback: 'Batch Export' },
  { icon: 'color-filter-outline', key: 'all_filters', fallback: 'All Premium Filters' },
  { icon: 'finger-print-outline', key: 'unlimited_signatures', fallback: 'Unlimited Signatures' },
  { icon: 'headset-outline', key: 'priority_support', fallback: 'Priority Support' },
];

export default function PremiumScreen() {
  const { theme } = useThemeStore();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const {
    isInitialized,
    isLoading,
    isPremium,
    hasRemovedAds,
    products,
    subscriptions,
    activeSubscription,
    error,
    initialize,
    purchaseProduct,
    purchaseSubscription,
    restorePurchases,
    setError,
  } = usePurchaseStore();
  
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'removeAds'>('yearly');

  useEffect(() => {
    initialize();
  }, []);

  // Handle back button - always go to main tabs
  const handleClose = () => {
    try {
      // Always navigate to main tabs to avoid white screen
      router.replace('/(tabs)');
    } catch (e) {
      console.log('[Premium] Navigation error:', e);
      // Fallback
      router.push('/(tabs)');
    }
  };

  // Handle hardware back button on Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Get prices from fetched products (or use defaults)
  const getPrice = (productId: string, defaultPrice: string) => {
    const sub = subscriptions.find(s => s.productId === productId);
    if (sub) return sub.localizedPrice;
    
    const prod = products.find(p => p.productId === productId);
    if (prod) return prod.localizedPrice;
    
    return defaultPrice;
  };

  const monthlyPrice = getPrice(PRODUCT_IDS.PREMIUM_MONTHLY, '€4.99');
  const yearlyPrice = getPrice(PRODUCT_IDS.PREMIUM_YEARLY, '€29.99');
  const removeAdsPrice = getPrice(PRODUCT_IDS.REMOVE_ADS, '€4.99');

  const handlePurchase = async () => {
    setError(null);
    
    let success = false;
    
    if (selectedPlan === 'monthly') {
      success = await purchaseSubscription(PRODUCT_IDS.PREMIUM_MONTHLY);
    } else if (selectedPlan === 'yearly') {
      success = await purchaseSubscription(PRODUCT_IDS.PREMIUM_YEARLY);
    } else if (selectedPlan === 'removeAds') {
      success = await purchaseProduct(PRODUCT_IDS.REMOVE_ADS);
    }
    
    if (success) {
      Alert.alert(
        t('purchase_success', 'Purchase Successful!'),
        t('purchase_success_message', 'Thank you for your purchase. Enjoy your premium features!'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
    
    const state = usePurchaseStore.getState();
    if (state.isPremium || state.hasRemovedAds) {
      Alert.alert(
        t('restore_success', 'Restore Successful!'),
        t('restore_success_message', 'Your purchases have been restored.'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        t('no_purchases', 'No Purchases Found'),
        t('no_purchases_message', 'We could not find any previous purchases to restore.')
      );
    }
  };

  // If already premium, show different UI
  if (isPremium) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('premium', 'Premium')}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.premiumActiveContainer}>
          <View style={styles.crownContainer}>
            <Ionicons name="diamond" size={80} color={BRAND_BLUE} />
          </View>
          <Text style={[styles.premiumActiveTitle, { color: theme.text }]}>
            {t('you_are_premium', "You're Premium!")}
          </Text>
          <Text style={[styles.premiumActiveSubtitle, { color: theme.textSecondary }]}>
            {t('enjoy_premium_features', 'Enjoy all premium features')}
          </Text>
          
          <View style={styles.activeFeatures}>
            {PREMIUM_FEATURES.map((feature, index) => (
              <View key={index} style={styles.activeFeatureRow}>
                <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                <Text style={[styles.activeFeatureText, { color: theme.text }]}>
                  {t(`premium_feature_${feature.key}`, feature.fallback)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.backButton}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('go_premium', 'Go Premium')}
        </Text>
        <TouchableOpacity onPress={handleRestore} disabled={isLoading}>
          <Text style={[styles.restoreText, { color: BRAND_BLUE }]}>
            {t('restore', 'Restore')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="diamond" size={60} color={BRAND_BLUE} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            {t('unlock_full_potential', 'Unlock Full Potential')}
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
            {t('premium_description', 'Get unlimited access to all features')}
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          {PREMIUM_FEATURES.slice(0, 6).map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: BRAND_BLUE + '15' }]}>
                <Ionicons name={feature.icon as any} size={22} color={BRAND_BLUE} />
              </View>
              <Text style={[styles.featureText, { color: theme.text }]}>
                {t(`premium_feature_${feature.key}`, feature.fallback)}
              </Text>
            </View>
          ))}
        </View>

        {/* Pricing Plans */}
        <View style={styles.plansSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('choose_plan', 'Choose Your Plan')}
          </Text>
          
          {/* Yearly Plan - Best Value */}
          <TouchableOpacity
            style={[
              styles.planCard,
              { 
                backgroundColor: theme.card,
                borderColor: selectedPlan === 'yearly' ? BRAND_BLUE : theme.border,
                borderWidth: selectedPlan === 'yearly' ? 2 : 1,
              }
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{t('best_value', 'BEST VALUE')}</Text>
            </View>
            <View style={styles.planHeader}>
              <View style={[
                styles.radioButton,
                selectedPlan === 'yearly' && styles.radioButtonSelected
              ]}>
                {selectedPlan === 'yearly' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planName, { color: theme.text }]}>
                  {t('yearly_plan', 'Yearly')}
                </Text>
                <Text style={[styles.planSavings, { color: '#22C55E' }]}>
                  {t('save_50', 'Save 50%')}
                </Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={[styles.planPrice, { color: theme.text }]}>{yearlyPrice}</Text>
                <Text style={[styles.planPeriod, { color: theme.textSecondary }]}>
                  /{t('year', 'year')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              { 
                backgroundColor: theme.card,
                borderColor: selectedPlan === 'monthly' ? BRAND_BLUE : theme.border,
                borderWidth: selectedPlan === 'monthly' ? 2 : 1,
              }
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planHeader}>
              <View style={[
                styles.radioButton,
                selectedPlan === 'monthly' && styles.radioButtonSelected
              ]}>
                {selectedPlan === 'monthly' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planName, { color: theme.text }]}>
                  {t('monthly_plan', 'Monthly')}
                </Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={[styles.planPrice, { color: theme.text }]}>{monthlyPrice}</Text>
                <Text style={[styles.planPeriod, { color: theme.textSecondary }]}>
                  /{t('month', 'month')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Remove Ads - One Time */}
          <TouchableOpacity
            style={[
              styles.planCard,
              { 
                backgroundColor: theme.card,
                borderColor: selectedPlan === 'removeAds' ? BRAND_BLUE : theme.border,
                borderWidth: selectedPlan === 'removeAds' ? 2 : 1,
              }
            ]}
            onPress={() => setSelectedPlan('removeAds')}
          >
            <View style={styles.planHeader}>
              <View style={[
                styles.radioButton,
                selectedPlan === 'removeAds' && styles.radioButtonSelected
              ]}>
                {selectedPlan === 'removeAds' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planName, { color: theme.text }]}>
                  {t('remove_ads', 'Remove Ads')}
                </Text>
                <Text style={[styles.planDescription, { color: theme.textSecondary }]}>
                  {t('one_time_purchase', 'One-time purchase')}
                </Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={[styles.planPrice, { color: theme.text }]}>{removeAdsPrice}</Text>
                <Text style={[styles.planPeriod, { color: theme.textSecondary }]}>
                  {t('forever', 'forever')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Terms */}
        <Text style={[styles.termsText, { color: theme.textMuted }]}>
          {t('subscription_terms', 'Subscriptions auto-renew unless cancelled. Cancel anytime in your app store settings.')}
        </Text>
      </ScrollView>

      {/* Purchase Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.purchaseButton, isLoading && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {selectedPlan === 'removeAds' 
                ? t('remove_ads_now', 'Remove Ads Now')
                : t('start_premium', 'Start Premium')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BRAND_BLUE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  featuresSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  plansSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  planBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  planBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioButtonSelected: {
    borderColor: BRAND_BLUE,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BRAND_BLUE,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
  },
  planDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  planSavings: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  planPricing: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  planPeriod: {
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  purchaseButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  premiumActiveContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  crownContainer: {
    marginBottom: 24,
  },
  premiumActiveTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  premiumActiveSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  activeFeatures: {
    alignSelf: 'stretch',
  },
  activeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeFeatureText: {
    fontSize: 15,
    marginLeft: 12,
  },
});

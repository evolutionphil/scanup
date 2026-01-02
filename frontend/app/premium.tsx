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
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../src/store/themeStore';
import { useI18n } from '../src/store/i18nStore';
import { usePurchaseStore, PRODUCT_IDS } from '../src/store/purchaseStore';
import { useAuthStore } from '../src/store/authStore';
import { logScreenView, logEvent, logPurchaseEvent, AnalyticsEvents } from '../src/services/analytics';

const BRAND_BLUE = '#4361EE';
const { width } = Dimensions.get('window');

// Premium features list - matching the design
const PREMIUM_FEATURES = [
  { key: 'unlimited_documents', fallback: 'Unlimited documents' },
  { key: 'no_ads', fallback: 'No ADS' },
  { key: 'private_documents', fallback: 'Private documents' },
  { key: 'remove_mark', fallback: 'Remove the mark' },
  { key: 'signature', fallback: 'Signature' },
];

export default function PremiumScreen() {
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
    subscriptions,
    activeSubscription,
    error,
    initialize,
    purchaseProduct,
    purchaseSubscription,
    restorePurchases,
    setError,
  } = usePurchaseStore();
  
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    initialize();
    logScreenView('Premium', 'PremiumScreen');
    logEvent(AnalyticsEvents.PREMIUM_SCREEN_VIEWED);
  }, []);

  // Handle back button
  const handleClose = () => {
    try {
      if (!isAuthenticated && !isGuest) {
        continueAsGuest();
      }
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 50);
    } catch (e) {
      continueAsGuest();
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

  // Get prices from fetched products
  const getPrice = (productId: string, defaultPrice: string) => {
    const sub = subscriptions.find(s => s.productId === productId);
    if (sub) return sub.localizedPrice;
    const prod = products.find(p => p.productId === productId);
    if (prod) return prod.localizedPrice;
    return defaultPrice;
  };

  const monthlyPrice = getPrice(PRODUCT_IDS.PREMIUM_MONTHLY, '€5.99');
  const yearlyPrice = getPrice(PRODUCT_IDS.PREMIUM_YEARLY, '€35.99');

  const handlePurchase = async () => {
    // Check if user is logged in (not guest)
    if (isGuest || !isAuthenticated) {
      // Redirect to login with return path to premium screen
      router.push('/(auth)/login?returnTo=/premium');
      return;
    }
    
    setError(null);
    
    let success = false;
    let productId = '';
    
    if (selectedPlan === 'monthly') {
      productId = PRODUCT_IDS.PREMIUM_MONTHLY;
      logPurchaseEvent('started', productId);
      success = await purchaseSubscription(productId);
    } else {
      productId = PRODUCT_IDS.PREMIUM_YEARLY;
      logPurchaseEvent('started', productId);
      success = await purchaseSubscription(productId);
    }
    
    if (success) {
      logPurchaseEvent('completed', productId);
      Alert.alert(
        t('purchase_success', 'Purchase Successful!'),
        t('purchase_success_message', 'Thank you for your purchase. Enjoy your premium features!'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else if (error) {
      logPurchaseEvent('failed', productId, undefined, undefined, error);
    }
  };

  const handleContinueFree = () => {
    // Continue as guest/free user
    if (!isAuthenticated && !isGuest) {
      continueAsGuest();
    }
    router.replace('/(tabs)');
  };

  const handleRestore = async () => {
    await restorePurchases();
    
    const state = usePurchaseStore.getState();
    if (state.isPremium || state.hasRemovedAds) {
      logEvent('purchases_restored');
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

  const openTerms = () => {
    Linking.openURL('https://scanup.app/terms');
  };

  // If already premium
  if (isPremium) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBlue}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Go Premium</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              You're already a premium member!
            </Text>
          </View>
        </View>
        
        <View style={styles.premiumActiveContent}>
          <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
          <Text style={[styles.premiumActiveTitle, { color: theme.text }]}>
            {t('you_are_premium', "You're Premium!")}
          </Text>
          <Text style={[styles.premiumActiveSubtitle, { color: theme.textSecondary }]}>
            {t('enjoy_premium_features', 'Enjoy all premium features')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={[styles.headerBlue, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>Go Premium</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            {t('premium_subtitle', 'Unlock all the amazing features and save your time')}
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
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={18} color={BRAND_BLUE} />
              </View>
              <Text style={styles.featureText}>
                {t(`premium_feature_${feature.key}`, feature.fallback)}
              </Text>
            </View>
          ))}
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingSection}>
          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'monthly' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={[
              styles.priceText,
              selectedPlan === 'monthly' && styles.priceTextSelected
            ]}>
              {monthlyPrice}/month
            </Text>
          </TouchableOpacity>

          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              styles.pricingCardYearly,
              selectedPlan === 'yearly' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={styles.yearlyContent}>
              <View>
                <Text style={[
                  styles.priceText,
                  selectedPlan === 'yearly' && styles.priceTextSelected
                ]}>
                  {yearlyPrice}/year
                </Text>
                <Text style={styles.trialText}>
                  {t('free_trial', 'Free 3 day trial')}
                </Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>50% Off</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>
              {t('continue', 'Continue')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

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
  headerBlue: {
    backgroundColor: BRAND_BLUE,
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
    fontStyle: 'italic',
  },
  proBadge: {
    backgroundColor: '#FF7A00',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  featuresSection: {
    marginTop: 30,
    marginBottom: 30,
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
    borderColor: BRAND_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  pricingSection: {
    gap: 12,
    marginBottom: 24,
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pricingCardYearly: {
    borderWidth: 2,
    borderColor: BRAND_BLUE,
  },
  pricingCardSelected: {
    borderWidth: 2,
    borderColor: BRAND_BLUE,
    backgroundColor: '#F8FAFF',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  priceTextSelected: {
    color: BRAND_BLUE,
  },
  yearlyContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trialText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  discountBadge: {
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
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
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginTop: 20,
    marginBottom: 20,
  },
  footerLinkText: {
    color: '#6B7280',
    fontSize: 14,
  },
  premiumActiveContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  premiumActiveTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
  },
  premiumActiveSubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});

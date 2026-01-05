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
import { usePurchaseStore, CANONICAL_PRODUCTS } from '../src/store/purchaseStore';
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
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Safe initialization with error handling
    const safeInit = async () => {
      try {
        await initialize();
        logScreenView('Premium', 'PremiumScreen');
        logEvent(AnalyticsEvents.PREMIUM_SCREEN_VIEWED);
      } catch (e: any) {
        console.error('[PremiumScreen] Init error:', e);
        setInitError(e?.message || 'Failed to load premium options');
      }
    };
    safeInit();
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

  // Get prices from fetched products - using canonicalId
  const getPrice = (canonicalId: string) => {
    const sub = subscriptions.find(s => s.canonicalId === canonicalId);
    if (sub) return sub.localizedPrice;
    const prod = products.find(p => p.canonicalId === canonicalId);
    if (prod) return prod.localizedPrice;
    return ''; // Return empty if not loaded
  };

  const monthlyPrice = getPrice(CANONICAL_PRODUCTS.PREMIUM_MONTHLY);
  const yearlyPrice = getPrice(CANONICAL_PRODUCTS.PREMIUM_YEARLY);
  const arePricesLoaded = monthlyPrice !== '' || yearlyPrice !== '';

  const handlePurchase = async () => {
    // Check if user is logged in (not guest)
    if (isGuest || !isAuthenticated) {
      // Redirect to login with return path to premium screen
      router.push('/(auth)/login?returnTo=/premium');
      return;
    }
    
    setError(null);
    
    let success = false;
    let canonicalId = '';
    
    if (selectedPlan === 'monthly') {
      canonicalId = CANONICAL_PRODUCTS.PREMIUM_MONTHLY;
      logPurchaseEvent('started', canonicalId);
      success = await purchaseSubscription(canonicalId);
    } else {
      canonicalId = CANONICAL_PRODUCTS.PREMIUM_YEARLY;
      logPurchaseEvent('started', canonicalId);
      success = await purchaseSubscription(canonicalId);
    }
    
    if (success) {
      logPurchaseEvent('completed', canonicalId);
      Alert.alert(
        t('purchase_success', 'Purchase Successful!'),
        t('purchase_success_message', 'Thank you for your purchase. Enjoy your premium features!'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else if (error) {
      logPurchaseEvent('failed', canonicalId, undefined, undefined, error);
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
          {/* Monthly Plan - With Free Trial */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'monthly' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.monthlyContent}>
              {monthlyPrice ? (
                <Text style={[
                  styles.priceText,
                  selectedPlan === 'monthly' && styles.priceTextSelected
                ]}>
                  {monthlyPrice}/month
                </Text>
              ) : (
                <ActivityIndicator size="small" color={BRAND_BLUE} />
              )}
              <Text style={styles.trialText}>
                {t('free_7_day_trial', '7 days FREE trial')}
              </Text>
            </View>
            {selectedPlan === 'monthly' && (
              <View style={styles.trialBadge}>
                <Text style={styles.trialBadgeText}>FREE TRIAL</Text>
              </View>
            )}
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
                {yearlyPrice ? (
                  <Text style={[
                    styles.priceText,
                    selectedPlan === 'yearly' && styles.priceTextSelected
                  ]}>
                    {yearlyPrice}/year
                  </Text>
                ) : (
                  <ActivityIndicator size="small" color={BRAND_BLUE} />
                )}
                <Text style={styles.savingsText}>
                  {t('save_50_percent', 'Save 50%')}
                </Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>BEST VALUE</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Trial Info */}
        <View style={styles.trialInfo}>
          <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
          <Text style={styles.trialInfoText}>
            {selectedPlan === 'monthly' 
              ? t('trial_info_monthly', 'Start with 7 days free. Cancel anytime before trial ends to avoid charges.')
              : t('trial_info_yearly', 'Best value! One payment for the whole year.')
            }
          </Text>
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
              {isGuest || !isAuthenticated 
                ? t('login_to_purchase', 'Login to Purchase')
                : selectedPlan === 'monthly'
                  ? t('start_free_trial', 'Start Free Trial')
                  : t('subscribe_now', 'Subscribe Now')
              }
            </Text>
          )}
        </TouchableOpacity>

        {/* Continue as Free - Only show for guest/non-authenticated */}
        {(isGuest || !isAuthenticated) && (
          <TouchableOpacity style={styles.continueFreeButton} onPress={handleContinueFree}>
            <Text style={styles.continueFreeText}>
              {t('continue_as_free', 'Continue as Free')}
            </Text>
          </TouchableOpacity>
        )}

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
    color: '#22C55E',
    marginTop: 4,
    fontWeight: '600',
  },
  savingsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  monthlyContent: {
    flex: 1,
  },
  trialBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trialBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  trialInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
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
    marginBottom: 12,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  continueFreeButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  continueFreeText: {
    color: '#6B7280',
    fontSize: 16,
    textDecorationLine: 'underline',
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

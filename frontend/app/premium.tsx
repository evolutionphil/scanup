/**
 * PREMIUM SCREEN
 * 
 * Premium Value: "Unlimited, watermark-free, signed PDFs."
 * 
 * Pricing:
 * - Monthly: €5.99 (with 7-day free trial)
 * - Yearly: €35.99 (BEST VALUE - highlighted)
 * - One-time: €2.99 (Remove watermark forever)
 */

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
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../src/store/themeStore';
import { useI18n } from '../src/store/i18nStore';
import { usePurchaseStore, CANONICAL_PRODUCTS, ProcessedPurchaseStatus } from '../src/store/purchaseStore';
import { useAuthStore } from '../src/store/authStore';
import { PREMIUM_VALUE_PROPOSITION } from '../src/store/monetizationStore';
import { logScreenView, logEvent, logPurchaseEvent, AnalyticsEvents } from '../src/services/analytics';

const BRAND_BLUE = '#4361EE';
const { width } = Dimensions.get('window');

let IAP: any = null;

if (Platform.OS !== 'web') {
  try {
    IAP = require('react-native-iap');
    console.log('[PremiumScreen] ✅ IAP module loaded');
  } catch (e) {
    console.log('[PremiumScreen] ❌ IAP module not available:', e);
  }
}

export default function PremiumScreen() {
  const { theme } = useThemeStore();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isGuest, continueAsGuest } = useAuthStore();
  const {
    isInitialized,
    isLoading,
    isPremium,
    hasRemovedWatermark,
    products,
    subscriptions,
    error,
    initialize,
    purchaseProduct,
    purchaseSubscription,
    restorePurchases,
    setError,
    processPurchase,
  } = usePurchaseStore();
  
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
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
  const getPrice = (id: string) => {
    const sub = subscriptions.find(s => s.id === id);
    if (sub) return sub.price;
    const prod = products.find(p => p.id === id);
    if (prod) return prod.price;
    return '';
  };

  const monthlyPrice = getPrice(CANONICAL_PRODUCTS.PREMIUM_MONTHLY);
  const yearlyPrice = getPrice(CANONICAL_PRODUCTS.PREMIUM_YEARLY);
  const watermarkPrice = getPrice(CANONICAL_PRODUCTS.REMOVE_WATERMARK) || '€2.99';

  const handlePurchaseSubscription = async () => {
    if (isGuest || !isAuthenticated) {
      router.push('/(auth)/login?returnTo=/premium');
      return;
    }
    
    setError(null);
    
    const productId = selectedPlan === 'monthly' 
      ? CANONICAL_PRODUCTS.PREMIUM_MONTHLY 
      : CANONICAL_PRODUCTS.PREMIUM_YEARLY;
    
    logPurchaseEvent('started', productId);
    await purchaseSubscription(productId);
  };

  // One-time purchase: Remove watermark forever (€2.99)
  const handlePurchaseWatermarkRemoval = async () => {
    if (isGuest || !isAuthenticated) {
      router.push('/(auth)/login?returnTo=/premium');
      return;
    }
    
    setError(null);
    logPurchaseEvent('started', CANONICAL_PRODUCTS.REMOVE_WATERMARK);
    
    await purchaseProduct(CANONICAL_PRODUCTS.REMOVE_WATERMARK);
  };

  const handleContinueFree = () => {
    if (!isAuthenticated && !isGuest) {
      continueAsGuest();
    }
    router.replace('/(tabs)');
  };

  const handleRestore = async () => {
    await restorePurchases();
    
    const state = usePurchaseStore.getState();
    if (state.isPremium || state.hasRemovedWatermark) {
      logEvent('purchases_restored');
      Alert.alert(
        'Restore Successful!',
        'Your purchases have been restored.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'No Purchases Found',
        'We could not find any previous purchases to restore.'
      );
    }
  };

  const openTerms = () => {
    router.push('/legal?type=terms');
  };

  const openPrivacy = () => {
    router.push('/legal?type=privacy');
  };

  const handlePurchaseUpdate = async (purchase: any) => {
    const status = await processPurchase(purchase);
    
    if (status === ProcessedPurchaseStatus.FAILED) {
      Alert.alert(
        'Purchase Failed!',
        'We could not process your purchase. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (status === ProcessedPurchaseStatus.PENDING) {
      Alert.alert(
        'Purchase Pending!',
        'Your payment still pending, once you approve the payment you can restore the purchases to enjoy the features.',
        [{ text: 'OK' }]
      );
      return;
    }

    const REMOVE_WATERMARK_MESSAGE = 'Watermark has been permanently removed from your exports.'

    logPurchaseEvent('completed', purchase.productId);
    
    Alert.alert(
      'Purchase Successful!',
      purchase.productId.includes('premium') ? PREMIUM_VALUE_PROPOSITION : REMOVE_WATERMARK_MESSAGE,
      [{ text: 'OK' }]
    );
  };

  const handlePurchaseError = (error: any) => {
    const errorMessages = new Map([
      ['user-cancelled', 'Purchase cancelled by user.'],
      ['network-error', 'Network error. Please check your connection and try again.'],
      ['item-unavailable', 'This product is currently unavailable.'],
      ['already-owned', 'You already own this product.'],
    ]);

    Alert.alert(
      'Purchase Failed!',
      errorMessages.get(error?.code) || 'We could not process your purchase. Please try again.',
      [{ text: 'OK' }]
    );
    console.log('[PremiumScreen] ❌ Purchase error:', error);
  };

  useEffect(() => {
    let purchaseUpdateSubscription = null;
    let purchaseErrorSubscription = null;

    // Set up purchase listeners
    if (IAP) {
      purchaseUpdateSubscription = IAP.purchaseUpdatedListener(handlePurchaseUpdate);
      purchaseErrorSubscription = IAP.purchaseErrorListener(handlePurchaseError);
    }

    // Cleanup function
    return () => {
      purchaseUpdateSubscription?.remove();
      purchaseErrorSubscription?.remove();
    };
  }, []);

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
              <Text style={styles.headerTitle}>Premium</Text>
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
            You're Premium!
          </Text>
          <Text style={[styles.premiumActiveSubtitle, { color: theme.textSecondary }]}>
            {PREMIUM_VALUE_PROPOSITION}
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
          {/* Premium Value Proposition */}
          <Text style={styles.headerSubtitle}>
            {PREMIUM_VALUE_PROPOSITION}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Features - Action-based copy */}
        <View style={styles.featuresSection}>
          <View style={styles.featureRow}>
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark" size={18} color={BRAND_BLUE} />
            </View>
            <Text style={styles.featureText}>Export without watermark</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark" size={18} color={BRAND_BLUE} />
            </View>
            <Text style={styles.featureText}>Unlimited PDF exports</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark" size={18} color={BRAND_BLUE} />
            </View>
            <Text style={styles.featureText}>Sign your documents</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark" size={18} color={BRAND_BLUE} />
            </View>
            <Text style={styles.featureText}>No ads</Text>
          </View>
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingSection}>
          {/* Yearly Plan - BEST VALUE (highlighted) */}
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
                  <Text style={styles.priceText}>€35.99/year</Text>
                )}
                <Text style={styles.savingsText}>Save 50%</Text>
              </View>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>BEST VALUE</Text>
              </View>
            </View>
          </TouchableOpacity>

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
                <Text style={styles.priceText}>€5.99/month</Text>
              )}
              <Text style={styles.trialText}>7 days FREE trial</Text>
            </View>
            {selectedPlan === 'monthly' && (
              <View style={styles.trialBadge}>
                <Text style={styles.trialBadgeText}>FREE TRIAL</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handlePurchaseSubscription}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isGuest || !isAuthenticated 
                ? 'Login to Subscribe'
                : selectedPlan === 'monthly'
                  ? 'Start Free Trial'
                  : 'Subscribe Now'
              }
            </Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* One-time purchase: Remove watermark (€2.99) */}
        {!hasRemovedWatermark && (
          <TouchableOpacity
            style={[styles.oneTimeButton, isLoading && styles.buttonDisabled]}
            onPress={handlePurchaseWatermarkRemoval}
            disabled={isLoading}
          >
            <View style={styles.oneTimeContent}>
              <View>
                <Text style={styles.oneTimeTitle}>Remove watermark forever</Text>
                <Text style={styles.oneTimeSubtitle}>One-time purchase</Text>
              </View>
              <Text style={styles.oneTimePrice}>{watermarkPrice}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Continue as Free */}
        {(isGuest || !isAuthenticated) && (
          <TouchableOpacity style={styles.continueFreeButton} onPress={handleContinueFree}>
            <Text style={styles.continueFreeText}>Continue with free version</Text>
          </TouchableOpacity>
        )}

        {/* Error Message */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.footerLinkText}>Restore Purchases</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openTerms}>
            <Text style={styles.footerLinkText}>Terms of Use</Text>
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
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 24,
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
    marginBottom: 16,
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
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  pricingSection: {
    gap: 12,
    marginBottom: 20,
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
    color: '#22C55E',
    marginTop: 4,
    fontWeight: '600',
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
  primaryButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
  },
  oneTimeButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  oneTimeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  oneTimeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  oneTimeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  oneTimePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND_BLUE,
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
    fontStyle: 'italic',
  },
});

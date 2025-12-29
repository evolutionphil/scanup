import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/store/authStore';

const { width } = Dimensions.get('window');

// Brand colors from Figma
const BRAND_BLUE = '#3E51FB';
const TEXT_DARK = '#1B1B1B';
const TEXT_MUTED = '#A4A4A4';
const BORDER_GRAY = '#DADADA';

const FEATURES = [
  'Unlimited documents',
  'No ADS',
  'Private documents',
  'Remove the mark',
  'Signature',
];

interface PricingOption {
  id: 'monthly' | 'yearly';
  price: string;
  period: string;
  subtitle?: string;
  discount?: string;
}

const PRICING_OPTIONS: PricingOption[] = [
  {
    id: 'monthly',
    price: '£10.99',
    period: '/month',
  },
  {
    id: 'yearly',
    price: '£50.99',
    period: '/year',
    subtitle: 'Free 3 day trial',
    discount: '50% Off',
  },
];

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handleContinue = () => {
    Alert.alert(
      'Subscribe',
      `You selected the ${selectedPlan} plan. Payment integration coming soon!`,
      [{ text: 'OK' }]
    );
  };

  const handleClose = () => {
    // For modal screens, use back() or dismiss
    // Then continue as guest and go to main app
    const { continueAsGuest } = useAuthStore.getState();
    continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>Go Premium</Text>
            <LinearGradient
              colors={['#FFA14A', '#FF612F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.proBadge}
            >
              <Text style={styles.proText}>PRO</Text>
            </LinearGradient>
          </View>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Unlock all the amazing features and{'\n'}save your time
          </Text>
        </SafeAreaView>
      </View>

      {/* White Content Area */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Features List */}
        <View style={styles.featuresList}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Pricing Options */}
        <View style={styles.pricingContainer}>
          {PRICING_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.pricingOption,
                selectedPlan === option.id && styles.pricingOptionSelected,
              ]}
              onPress={() => setSelectedPlan(option.id)}
            >
              <View style={styles.pricingLeft}>
                <Text style={styles.priceText}>
                  {option.price}
                  <Text style={styles.periodText}>{option.period}</Text>
                </Text>
                {option.subtitle && (
                  <Text style={styles.subtitleText}>{option.subtitle}</Text>
                )}
              </View>
              {option.discount && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{option.discount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>

        {/* Commercial User Link */}
        <TouchableOpacity style={styles.commercialLink}>
          <Text style={styles.commercialText}>Are you a commercial user?</Text>
          <Ionicons name="chevron-forward" size={16} color={BRAND_BLUE} />
        </TouchableOpacity>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity>
            <Text style={styles.footerText}>Already Paid?</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerText}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: BRAND_BLUE,
    paddingBottom: 24,
  },
  headerContent: {
    paddingHorizontal: 44,
  },
  closeButton: {
    width: 24,
    height: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  proBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 40,
  },
  proText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginTop: 8,
    lineHeight: 19,
  },
  content: {
    flex: 1,
    paddingHorizontal: 44,
  },
  featuresList: {
    marginTop: 32,
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  pricingContainer: {
    marginTop: 32,
    gap: 14,
  },
  pricingOption: {
    height: 66,
    borderWidth: 2,
    borderColor: BORDER_GRAY,
    borderRadius: 10,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  pricingOptionSelected: {
    borderWidth: 3,
    borderColor: BRAND_BLUE,
    backgroundColor: 'rgba(62, 81, 251, 0.02)',
  },
  pricingLeft: {
    justifyContent: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
    color: TEXT_DARK,
  },
  periodText: {
    fontWeight: '900',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_MUTED,
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 4,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  continueButton: {
    height: 66,
    backgroundColor: BRAND_BLUE,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  continueText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  commercialLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 4,
  },
  commercialText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND_BLUE,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
    gap: 30,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#2E3654',
  },
});

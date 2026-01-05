/**
 * HARD PAYWALL COMPONENT
 * 
 * Full-screen paywall for premium-only features.
 * Used for: Signature tool, Batch export
 * 
 * Design:
 * - Full screen overlay
 * - Clear benefit copy
 * - Only "Go Premium" option (no dismiss for feature access)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREMIUM_VALUE_PROPOSITION, getPaywallCopy, PaywallTrigger } from '../store/monetizationStore';

const BRAND_BLUE = '#4361EE';

interface HardPaywallProps {
  visible: boolean;
  onClose: () => void;
  trigger: PaywallTrigger;
}

export default function HardPaywall({
  visible,
  onClose,
  trigger,
}: HardPaywallProps) {
  const insets = useSafeAreaInsets();
  const copy = getPaywallCopy(trigger);

  const handleGoPremium = () => {
    onClose();
    router.push('/premium');
  };

  const getIcon = () => {
    switch (trigger) {
      case 'signature':
        return 'create';
      case 'batch_export':
        return 'documents';
      default:
        return 'star';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={[BRAND_BLUE, '#6366F1']}
        style={styles.container}
      >
        {/* Close button */}
        <TouchableOpacity 
          style={[styles.closeButton, { top: insets.top + 10 }]} 
          onPress={onClose}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={getIcon()} size={64} color="#fff" />
          </View>

          {/* PRO Badge */}
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{copy.title}</Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>{PREMIUM_VALUE_PROPOSITION}</Text>

          {/* Premium features */}
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.featureText}>Digital signatures</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.featureText}>No watermark</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.featureText}>Unlimited exports</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text style={styles.featureText}>No ads</Text>
            </View>
          </View>
        </View>

        {/* Bottom buttons */}
        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoPremium}>
            <Text style={styles.primaryButtonText}>{copy.buttonText}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  proBadge: {
    backgroundColor: '#FF7A00',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  features: {
    alignSelf: 'stretch',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  featureText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 24,
  },
  primaryButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: BRAND_BLUE,
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
  },
});

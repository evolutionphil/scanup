/**
 * SOFT PAYWALL COMPONENT
 * 
 * Shows a blurred preview with upgrade options.
 * Used for: second export, watermark removal
 * 
 * Design:
 * - Blurred background preview
 * - Clear benefit copy: "Unlimited, watermark-free, signed PDFs."
 * - Two buttons: "Go Premium" and "Not now"
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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREMIUM_VALUE_PROPOSITION, getPaywallCopy, PaywallTrigger } from '../store/monetizationStore';

const BRAND_BLUE = '#4361EE';
const { width } = Dimensions.get('window');

interface SoftPaywallProps {
  visible: boolean;
  onClose: () => void;
  trigger: PaywallTrigger;
  onPurchaseOneTime?: () => void; // For €2.99 watermark removal
}

export default function SoftPaywall({
  visible,
  onClose,
  trigger,
  onPurchaseOneTime,
}: SoftPaywallProps) {
  const insets = useSafeAreaInsets();
  const copy = getPaywallCopy(trigger);

  const handleGoPremium = () => {
    onClose();
    router.push('/premium');
  };

  const handleOneTimePurchase = () => {
    if (onPurchaseOneTime) {
      onPurchaseOneTime();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons 
              name={trigger === 'signature' ? 'create' : 'document-text'} 
              size={48} 
              color={BRAND_BLUE} 
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{copy.title}</Text>
          
          {/* Subtitle - Premium value proposition */}
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          {/* Premium features */}
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.featureText}>No watermark on exports</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.featureText}>Unlimited PDF exports</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.featureText}>Digital signatures</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.featureText}>No ads</Text>
            </View>
          </View>

          {/* Go Premium button */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoPremium}>
            <Text style={styles.primaryButtonText}>Go Premium</Text>
          </TouchableOpacity>

          {/* One-time purchase option for watermark removal */}
          {trigger === 'export' && onPurchaseOneTime && (
            <TouchableOpacity style={styles.oneTimeButton} onPress={handleOneTimePurchase}>
              <Text style={styles.oneTimeButtonText}>Remove watermark forever • €2.99</Text>
            </TouchableOpacity>
          )}

          {/* Not now button */}
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  features: {
    width: '100%',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: BRAND_BLUE,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  oneTimeButton: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  oneTimeButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
});

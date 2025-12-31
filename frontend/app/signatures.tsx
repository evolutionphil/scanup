import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { useThemeStore } from '../src/store/themeStore';
import { useI18n } from '../src/store/i18nStore';

const SIGNATURES_KEY = '@scanup_saved_signatures';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SavedSignature {
  id: string;
  name: string;
  paths: string[]; // Store paths array instead of base64
  width: number;
  height: number;
  createdAt: string;
}

export default function SignaturesScreen() {
  const { theme } = useThemeStore();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [signatures, setSignatures] = useState<SavedSignature[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedSignatures, setSelectedSignatures] = useState<string[]>([]);

  const loadSignatures = async () => {
    try {
      const saved = await AsyncStorage.getItem(SIGNATURES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSignatures(parsed);
      }
    } catch (e) {
      console.error('Failed to load signatures:', e);
    }
  };

  // Reload signatures when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadSignatures();
    }, [])
  );

  const saveSignatures = async (newSignatures: SavedSignature[]) => {
    try {
      await AsyncStorage.setItem(SIGNATURES_KEY, JSON.stringify(newSignatures));
      setSignatures(newSignatures);
    } catch (e) {
      console.error('Failed to save signatures:', e);
    }
  };

  const handleDeleteSignature = (id: string) => {
    Alert.alert(
      t('delete_signature', 'Delete Signature'),
      t('delete_signature_confirm', 'Are you sure you want to delete this signature?'),
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('delete', 'Delete'),
          style: 'destructive',
          onPress: () => {
            const updated = signatures.filter(s => s.id !== id);
            saveSignatures(updated);
          },
        },
      ]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedSignatures.length === 0) return;
    
    Alert.alert(
      t('delete_selected', 'Delete Selected'),
      `${t('delete_confirm_multiple', 'Are you sure you want to delete')} ${selectedSignatures.length} ${t('signature_s', 'signature(s)')}?`,
      [
        { text: t('cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('delete', 'Delete'),
          style: 'destructive',
          onPress: () => {
            const updated = signatures.filter(s => !selectedSignatures.includes(s.id));
            saveSignatures(updated);
            setSelectedSignatures([]);
            setIsSelectMode(false);
          },
        },
      ]
    );
  };

  const toggleSignatureSelection = (id: string) => {
    if (selectedSignatures.includes(id)) {
      setSelectedSignatures(prev => prev.filter(s => s !== id));
    } else {
      setSelectedSignatures(prev => [...prev, id]);
    }
  };

  // Render signature preview using SVG
  const renderSignaturePreview = (sig: SavedSignature) => {
    const previewWidth = SCREEN_WIDTH - 80;
    const previewHeight = 80;
    const scaleX = previewWidth / sig.width;
    const scaleY = previewHeight / sig.height;
    const scale = Math.min(scaleX, scaleY) * 0.8;

    return (
      <Svg 
        width={previewWidth} 
        height={previewHeight} 
        viewBox={`0 0 ${sig.width} ${sig.height}`}
        style={styles.signaturePreview}
      >
        {sig.paths && sig.paths.map((p, i) => (
          <Path
            key={i}
            d={p}
            stroke="#000"
            strokeWidth={3 / scale}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('signatures', 'Signatures')}</Text>
        {signatures.length > 0 ? (
          <TouchableOpacity 
            onPress={() => {
              if (isSelectMode) {
                setIsSelectMode(false);
                setSelectedSignatures([]);
              } else {
                setIsSelectMode(true);
              }
            }}
          >
            <Text style={[styles.selectText, { color: theme.primary }]}>
              {isSelectMode ? t('cancel', 'Cancel') : t('select', 'Select')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {signatures.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="pencil-outline" size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>{t('no_signatures_yet', 'No Signatures Yet')}</Text>
            <Text style={styles.emptyText}>
              {t('create_first_signature', 'Create your first signature to use when signing documents')}
            </Text>
          </View>
        ) : (
          <View style={styles.signaturesGrid}>
            {signatures.map((sig) => (
              <TouchableOpacity 
                key={sig.id} 
                style={[
                  styles.signatureCard,
                  isSelectMode && selectedSignatures.includes(sig.id) && styles.signatureCardSelected
                ]}
                onPress={() => {
                  if (isSelectMode) {
                    toggleSignatureSelection(sig.id);
                  }
                }}
                onLongPress={() => {
                  if (!isSelectMode) {
                    handleDeleteSignature(sig.id);
                  }
                }}
                activeOpacity={0.7}
              >
                {isSelectMode && (
                  <View style={[
                    styles.checkbox,
                    selectedSignatures.includes(sig.id) && styles.checkboxSelected
                  ]}>
                    {selectedSignatures.includes(sig.id) && (
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    )}
                  </View>
                )}
                {sig.paths && sig.paths.length > 0 ? (
                  renderSignaturePreview(sig)
                ) : (
                  <View style={styles.emptySignaturePreview}>
                    <Ionicons name="pencil-outline" size={32} color="#CCC" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      {isSelectMode && selectedSignatures.length > 0 ? (
        <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <TouchableOpacity 
            style={[styles.addNewButton, styles.deleteButton]}
            onPress={handleDeleteSelected}
          >
            <Ionicons name="trash-outline" size={22} color="#FFF" />
            <Text style={styles.addNewButtonText}>{t('delete', 'Delete')} ({selectedSignatures.length})</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <TouchableOpacity 
            style={styles.addNewButton}
            onPress={() => router.push('/add-signature')}
          >
            <Ionicons name="add" size={22} color="#FFF" />
            <Text style={styles.addNewButtonText}>{t('add_new', 'Add new')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  selectText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3E51FB',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6B7280',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  signaturesGrid: {
    gap: 16,
  },
  signatureCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureCardSelected: {
    borderColor: '#3E51FB',
    borderWidth: 2,
    backgroundColor: '#EEF2FF',
  },
  checkbox: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  checkboxSelected: {
    backgroundColor: '#3E51FB',
    borderColor: '#3E51FB',
  },
  signaturePreview: {
    backgroundColor: 'transparent',
  },
  emptySignaturePreview: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#3E51FB',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  addNewButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

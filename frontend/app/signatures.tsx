import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../src/store/themeStore';

const SIGNATURES_KEY = '@scanup_saved_signatures';

interface SavedSignature {
  id: string;
  name: string;
  base64: string;
  createdAt: string;
}

export default function SignaturesScreen() {
  const { theme } = useThemeStore();
  const [signatures, setSignatures] = useState<SavedSignature[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedSignatures, setSelectedSignatures] = useState<string[]>([]);

  const loadSignatures = async () => {
    try {
      const saved = await AsyncStorage.getItem(SIGNATURES_KEY);
      if (saved) {
        setSignatures(JSON.parse(saved));
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
      'Delete Signature',
      'Are you sure you want to delete this signature?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
      'Delete Selected',
      `Are you sure you want to delete ${selectedSignatures.length} signature(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Signatures</Text>
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
            <Text style={styles.selectText}>
              {isSelectMode ? 'Cancel' : 'Select'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <View style={styles.divider} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {signatures.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="pencil-outline" size={48} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Signatures Yet</Text>
            <Text style={styles.emptyText}>
              Create your first signature to use when signing documents
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
                <Image 
                  source={{ uri: sig.base64 }} 
                  style={styles.signaturePreview}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      {isSelectMode && selectedSignatures.length > 0 ? (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={[styles.addNewButton, styles.deleteButton]}
            onPress={handleDeleteSelected}
          >
            <Ionicons name="trash-outline" size={22} color="#FFF" />
            <Text style={styles.addNewButtonText}>Delete ({selectedSignatures.length})</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={styles.addNewButton}
            onPress={() => router.push('/add-signature')}
          >
            <Ionicons name="add" size={22} color="#FFF" />
            <Text style={styles.addNewButtonText}>Add new</Text>
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
    width: '100%',
    height: 80,
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

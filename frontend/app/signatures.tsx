import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIGNATURES_KEY = '@scanup_saved_signatures';

interface SavedSignature {
  id: string;
  name: string;
  base64: string;
  createdAt: string;
}

export default function SignaturesScreen() {
  const { token, isGuest } = useAuthStore();
  const { theme } = useThemeStore();
  const [signatures, setSignatures] = useState<SavedSignature[]>([]);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedSignatures, setSelectedSignatures] = useState<string[]>([]);

  // Load saved signatures
  useEffect(() => {
    loadSignatures();
  }, []);

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

  const handleTouchStart = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath(`M${locationX},${locationY}`);
  };

  const handleTouchMove = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
  };

  const handleTouchEnd = () => {
    if (currentPath) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath('');
    }
  };

  const handleClearCanvas = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleSaveSignature = async () => {
    if (paths.length === 0) {
      Alert.alert('Error', 'Please draw a signature first');
      return;
    }

    // Create SVG content
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${SCREEN_WIDTH - 48}" height="200" viewBox="0 0 ${SCREEN_WIDTH - 48} 200">
        ${paths.map(p => `<path d="${p}" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
      </svg>
    `;

    // Convert to base64
    const base64 = btoa(svgContent);
    const dataUrl = `data:image/svg+xml;base64,${base64}`;

    const newSignature: SavedSignature = {
      id: `sig_${Date.now()}`,
      name: `Signature ${signatures.length + 1}`,
      base64: dataUrl,
      createdAt: new Date().toISOString(),
    };

    const updated = [...signatures, newSignature];
    await saveSignatures(updated);
    
    setShowDrawModal(false);
    setPaths([]);
    setCurrentPath('');
    Alert.alert('Success', 'Signature saved!');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header - Matches Figma design */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Signatures</Text>
        {signatures.length > 0 && (
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
              {isSelectMode ? 'Cancel' : 'Select'}
            </Text>
          </TouchableOpacity>
        )}
        {signatures.length === 0 && <View style={{ width: 50 }} />}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {signatures.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.surface }]}>
              <Ionicons name="pencil-outline" size={48} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Signatures Yet</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
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
                  { backgroundColor: '#FFF', borderColor: theme.border },
                  isSelectMode && selectedSignatures.includes(sig.id) && { borderColor: theme.primary, borderWidth: 2 }
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
                    selectedSignatures.includes(sig.id) && { backgroundColor: theme.primary, borderColor: theme.primary }
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

      {/* Bottom Button - Matches Figma design */}
      {isSelectMode && selectedSignatures.length > 0 ? (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={[styles.addNewButton, { backgroundColor: theme.danger }]}
            onPress={handleDeleteSelected}
          >
            <Ionicons name="trash-outline" size={22} color="#FFF" />
            <Text style={styles.addNewButtonText}>Delete ({selectedSignatures.length})</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity 
            style={[styles.addNewButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowDrawModal(true)}
          >
            <Ionicons name="add" size={22} color="#FFF" />
            <Text style={styles.addNewButtonText}>Add new</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Draw Signature Modal */}
      <Modal visible={showDrawModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => {
              setShowDrawModal(false);
              setPaths([]);
              setCurrentPath('');
            }}>
              <Text style={[styles.modalCancel, { color: theme.danger }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Draw Signature</Text>
            <TouchableOpacity onPress={handleSaveSignature}>
              <Text style={[styles.modalSave, { color: theme.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.canvasContainer}>
            <Text style={[styles.canvasLabel, { color: theme.textMuted }]}>
              Draw your signature below
            </Text>
            <View 
              style={[styles.canvas, { backgroundColor: '#FFF', borderColor: theme.border }]}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Svg width={SCREEN_WIDTH - 48} height={200}>
                {paths.map((p, i) => (
                  <Path
                    key={i}
                    d={p}
                    stroke="#000"
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentPath && (
                  <Path
                    d={currentPath}
                    stroke="#000"
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </Svg>
            </View>
            <TouchableOpacity 
              style={[styles.clearButton, { borderColor: theme.border }]}
              onPress={handleClearCanvas}
            >
              <Ionicons name="refresh" size={18} color={theme.textMuted} />
              <Text style={[styles.clearButtonText, { color: theme.textMuted }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
    borderBottomWidth: 1,
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
  },
  selectText: {
    fontSize: 16,
    fontWeight: '500',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
    lineHeight: 20,
  },
  signaturesGrid: {
    gap: 16,
  },
  signatureCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
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
    gap: 8,
  },
  addNewButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  canvasContainer: {
    padding: 24,
    alignItems: 'center',
  },
  canvasLabel: {
    fontSize: 14,
    marginBottom: 16,
  },
  canvas: {
    width: SCREEN_WIDTH - 48,
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

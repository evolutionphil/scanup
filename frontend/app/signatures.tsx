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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Signatures</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowDrawModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
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
            <TouchableOpacity 
              style={[styles.createButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowDrawModal(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Create Signature</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.signaturesGrid}>
            {signatures.map((sig) => (
              <View key={sig.id} style={[styles.signatureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Image 
                  source={{ uri: sig.base64 }} 
                  style={styles.signaturePreview}
                  resizeMode="contain"
                />
                <View style={styles.signatureInfo}>
                  <Text style={[styles.signatureName, { color: theme.text }]}>{sig.name}</Text>
                  <Text style={[styles.signatureDate, { color: theme.textMuted }]}>
                    {new Date(sig.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.deleteButton, { backgroundColor: theme.danger + '15' }]}
                  onPress={() => handleDeleteSignature(sig.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

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
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signaturesGrid: {
    gap: 16,
  },
  signatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  signaturePreview: {
    width: 100,
    height: 50,
    marginRight: 16,
  },
  signatureInfo: {
    flex: 1,
  },
  signatureName: {
    fontSize: 16,
    fontWeight: '600',
  },
  signatureDate: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { useThemeStore } from '../src/store/themeStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIGNATURES_KEY = '@scanup_saved_signatures';
const CANVAS_WIDTH = SCREEN_WIDTH - 48;
const CANVAS_HEIGHT = SCREEN_HEIGHT * 0.5;

interface SavedSignature {
  id: string;
  name: string;
  paths: string[];
  width: number;
  height: number;
  createdAt: string;
}

export default function AddSignatureScreen() {
  const { theme } = useThemeStore();
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');

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

  const handleUndo = () => {
    if (paths.length > 0) {
      setPaths(prev => prev.slice(0, -1));
    }
  };

  const handleSave = async () => {
    if (paths.length === 0) {
      Alert.alert('Error', 'Please draw a signature first');
      return;
    }

    try {
      // Load existing signatures
      const saved = await AsyncStorage.getItem(SIGNATURES_KEY);
      const existingSignatures: SavedSignature[] = saved ? JSON.parse(saved) : [];

      // Save paths directly instead of converting to base64
      const newSignature: SavedSignature = {
        id: `sig_${Date.now()}`,
        name: `Signature ${existingSignatures.length + 1}`,
        paths: paths,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        createdAt: new Date().toISOString(),
      };

      const updated = [...existingSignatures, newSignature];
      await AsyncStorage.setItem(SIGNATURES_KEY, JSON.stringify(updated));
      
      Alert.alert('Success', 'Signature saved!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error('Failed to save signature:', e);
      Alert.alert('Error', 'Failed to save signature');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - Matching Figma Design */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add signature</Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Drawing Area */}
      <View style={styles.canvasContainer}>
        {/* Sign Here Placeholder */}
        {paths.length === 0 && !currentPath && (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Sign here</Text>
          </View>
        )}
        
        {/* Canvas */}
        <View 
          style={styles.canvas}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
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
      </View>

      {/* Undo Button - Bottom Right */}
      <View style={styles.undoContainer}>
        <TouchableOpacity 
          style={[
            styles.undoButton,
            paths.length === 0 && styles.undoButtonDisabled
          ]}
          onPress={handleUndo}
          disabled={paths.length === 0}
        >
          <Ionicons 
            name="arrow-undo" 
            size={24} 
            color={paths.length === 0 ? '#CCC' : '#111827'} 
          />
        </TouchableOpacity>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerText}>Draw your signature above</Text>
      </View>
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
  saveButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#3E51FB',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  placeholderContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#D1D5DB',
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
  },
  undoContainer: {
    position: 'absolute',
    bottom: 140,
    right: 24,
  },
  undoButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  undoButtonDisabled: {
    opacity: 0.5,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});

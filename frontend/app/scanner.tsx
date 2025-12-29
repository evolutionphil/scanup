import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';

// =============================================================================
// SCANNER - Opens document scanner and saves directly
// =============================================================================

export default function ScannerScreen() {
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const { token } = useAuthStore();
  const { createDocumentLocalFirst, updateDocument, documents } = useDocumentStore();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Opening scanner...');
  const soundRef = useRef<any>(null);
  const hasScannedRef = useRef(false);
  
  const addToDocumentId = params.addToDocument as string | undefined;
  
  // Load audio
  useEffect(() => {
    const setupAudio = async () => {
      try {
        const { Audio } = require('expo-av');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/shutter.mp3')
        );
        soundRef.current = sound;
      } catch (e) {
        // Ignore audio errors
      }
    };
    setupAudio();
    
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);
  
  // Auto-open scanner on mount
  useEffect(() => {
    if (!hasScannedRef.current) {
      hasScannedRef.current = true;
      const timer = setTimeout(() => {
        openDocumentScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // =============================================================================
  // SAVE DOCUMENT - Creates document and navigates to it
  // =============================================================================
  
  const saveScannedDocument = async (images: Array<{ base64: string; uri: string }>) => {
    if (images.length === 0) {
      router.back();
      return;
    }
    
    setIsSaving(true);
    setStatusMessage('Saving document...');
    
    try {
      const validImages = images.filter(img => img.base64 && img.base64.length > 100);
      
      if (validImages.length === 0) {
        Alert.alert('Error', 'No valid images to save.');
        router.back();
        return;
      }
      
      const documentData = {
        name: `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        pages: validImages.map((img, index) => ({
          page_number: index + 1,
          image_base64: img.base64,
          original_image_base64: img.base64,
          width: 0,
          height: 0,
        })),
        document_type: 'document',
        tags: [],
      };
      
      if (addToDocumentId) {
        // Adding pages to existing document
        const existingDoc = documents.find(d => d.document_id === addToDocumentId);
        if (existingDoc) {
          const newPages = validImages.map((img, index) => ({
            page_number: existingDoc.pages.length + index + 1,
            image_base64: img.base64,
            original_image_base64: img.base64,
            width: 0,
            height: 0,
          }));
          
          await updateDocument(token || null, addToDocumentId, {
            pages: [...existingDoc.pages, ...newPages],
          });
          
          // Go back to the document
          router.back();
        } else {
          throw new Error('Document not found');
        }
      } else {
        // Create new document
        const newDoc = await createDocumentLocalFirst(token || null, documentData);
        
        if (newDoc && newDoc.document_id) {
          // Navigate to the new document
          router.replace(`/document/${newDoc.document_id}`);
        } else {
          throw new Error('Failed to create document');
        }
      }
    } catch (error: any) {
      console.error('[Scanner] Save error:', error);
      Alert.alert('Save Error', error.message || 'Failed to save document');
      router.back();
    } finally {
      setIsSaving(false);
    }
  };
  
  // =============================================================================
  // DOCUMENT SCANNER - Opens and saves directly
  // =============================================================================
  
  const openDocumentScanner = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setStatusMessage('Opening scanner...');
    
    try {
      // Play sound
      if (soundRef.current) {
        try {
          await soundRef.current.replayAsync();
        } catch (e) {}
      }
      
      // Import the document scanner
      const DocumentScanner = require('react-native-document-scanner-plugin').default;
      
      // Open the scanner with real-time edge detection
      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: 20,
        croppedImageQuality: 100,
        responseType: 'base64',
      });
      
      if (result?.scannedImages && result.scannedImages.length > 0) {
        // Process and save directly
        const images = result.scannedImages.map((imageData: string) => {
          let base64Data = imageData;
          if (base64Data.startsWith('data:')) {
            base64Data = base64Data.split(',')[1];
          }
          return {
            uri: `data:image/jpeg;base64,${base64Data}`,
            base64: base64Data,
          };
        });
        
        // Save directly - no review screen
        await saveScannedDocument(images);
      } else {
        // User cancelled or no images
        router.back();
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled' && error.message !== 'Canceled') {
        console.error('[Scanner] Error:', error);
        Alert.alert('Scanner Error', error.message || 'Failed to open scanner');
      }
      router.back();
    } finally {
      setIsScanning(false);
    }
  };
  
  // =============================================================================
  // RENDER - Simple loading screen
  // =============================================================================
  
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <SafeAreaView style={styles.content}>
        <View style={styles.loadingContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="scan" size={64} color="#3B82F6" />
          </View>
          <ActivityIndicator size="large" color="#3B82F6" style={styles.spinner} />
          <Text style={styles.statusText}>{statusMessage}</Text>
          {isSaving && (
            <Text style={styles.subText}>Please wait...</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
});

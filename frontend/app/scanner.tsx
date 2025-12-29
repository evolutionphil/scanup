import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';

// =============================================================================
// SCANNER - Opens document scanner and saves directly
// =============================================================================

export default function ScannerScreen() {
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const { token } = useAuthStore();
  const { createDocumentLocalFirst, updateDocument, documents } = useDocumentStore();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Opening scanner...');
  const [scannerError, setScannerError] = useState<string | null>(null);
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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Track navigation state to prevent double navigation
  const isNavigatingRef = useRef(false);
  
  // Handle go back safely
  const handleGoBack = () => {
    if (isNavigatingRef.current) {
      console.log('[Scanner] Navigation already in progress');
      return;
    }
    
    isNavigatingRef.current = true;
    console.log('[Scanner] handleGoBack called');
    
    try {
      // For scanner modal, we should dismiss it properly
      // Check if we came from a document (addToDocument param exists)
      if (addToDocumentId) {
        // Go back to the document screen that launched us
        if (router.canGoBack()) {
          router.back();
        } else {
          // Fallback: navigate to the document
          router.replace(`/document/${addToDocumentId}`);
        }
      } else {
        // New scan - go to home/tabs
        router.replace('/(tabs)');
      }
    } catch (e) {
      console.error('[Scanner] Navigation error:', e);
      try {
        router.replace('/(tabs)');
      } catch (e2) {
        console.error('[Scanner] Fallback navigation error:', e2);
      }
    } finally {
      // Reset navigation lock after a delay
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    }
  };
  
  // =============================================================================
  // SAVE DOCUMENT - Creates document and navigates to it
  // =============================================================================
  
  const saveScannedDocument = async (images: Array<{ base64: string; uri: string }>) => {
    if (images.length === 0) {
      handleGoBack();
      return;
    }
    
    setIsSaving(true);
    setStatusMessage('Saving document...');
    
    try {
      const validImages = images.filter(img => img.base64 && img.base64.length > 100);
      
      if (validImages.length === 0) {
        Alert.alert('Error', 'No valid images to save.', [
          { text: 'OK', onPress: handleGoBack }
        ]);
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
          
          console.log('[Scanner] Pages added to document:', addToDocumentId);
          
          // Navigate back to the document - use replace to ensure clean state
          setTimeout(() => {
            try {
              // Use replace to avoid navigation stack issues
              router.replace(`/document/${addToDocumentId}`);
            } catch (e) {
              console.error('[Scanner] Navigation error after adding pages:', e);
              handleGoBack();
            }
          }, 200);
        } else {
          throw new Error('Document not found');
        }
      } else {
        // Create new document
        const newDoc = await createDocumentLocalFirst(token || null, documentData);
        
        if (newDoc && newDoc.document_id) {
          console.log('[Scanner] Document created with ID:', newDoc.document_id);
          
          // Small delay to ensure state is updated, then navigate
          setTimeout(() => {
            try {
              router.replace(`/document/${newDoc.document_id}`);
            } catch (e) {
              console.error('[Scanner] Navigation error:', e);
              router.replace('/(tabs)');
            }
          }, 200);
        } else {
          throw new Error('Failed to create document');
        }
      }
    } catch (error: any) {
      console.error('[Scanner] Save error:', error);
      Alert.alert('Save Error', error.message || 'Failed to save document', [
        { text: 'OK', onPress: handleGoBack }
      ]);
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
    setScannerError(null);
    
    try {
      // Play sound
      if (soundRef.current) {
        try {
          await soundRef.current.replayAsync();
        } catch (e) {}
      }
      
      // Try to import the document scanner
      let DocumentScanner: any;
      try {
        DocumentScanner = require('react-native-document-scanner-plugin').default;
      } catch (e) {
        console.error('[Scanner] Failed to load document scanner plugin:', e);
        setScannerError('Scanner plugin not available. Using camera instead.');
        // Fall back to camera
        await openCameraFallback();
        return;
      }
      
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
        handleGoBack();
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled' && error.message !== 'Canceled') {
        console.error('[Scanner] Error:', error);
        setScannerError(error.message || 'Scanner failed');
      } else {
        handleGoBack();
      }
    } finally {
      setIsScanning(false);
    }
  };
  
  // =============================================================================
  // CAMERA FALLBACK - Use camera if scanner plugin fails
  // =============================================================================
  
  const openCameraFallback = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to scan documents.', [
          { text: 'OK', onPress: handleGoBack }
        ]);
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        base64: true,
        allowsMultipleSelection: false,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        const images = result.assets.map(asset => ({
          uri: asset.uri,
          base64: asset.base64 || '',
        }));
        
        await saveScannedDocument(images);
      } else {
        handleGoBack();
      }
    } catch (error: any) {
      console.error('[Scanner] Camera error:', error);
      Alert.alert('Camera Error', error.message || 'Failed to open camera', [
        { text: 'OK', onPress: handleGoBack }
      ]);
    } finally {
      setIsScanning(false);
    }
  };
  
  // =============================================================================
  // GALLERY PICKER
  // =============================================================================
  
  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.9,
        base64: true,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        const images = result.assets.map(asset => ({
          uri: asset.uri,
          base64: asset.base64 || '',
        }));
        
        await saveScannedDocument(images);
      }
    } catch (error: any) {
      console.error('[Scanner] Gallery error:', error);
      Alert.alert('Gallery Error', error.message || 'Failed to open gallery');
    }
  };
  
  // =============================================================================
  // RENDER
  // =============================================================================
  
  // Make the screen nearly invisible during initial scanner launch
  // Only show UI if there's an error or if saving
  const showUI = scannerError || isSaving || (!isScanning && hasScannedRef.current);
  
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {showUI ? (
        <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
          {/* Header with back button */}
          <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {addToDocumentId ? 'Add Page' : 'Scan Document'}
            </Text>
            <View style={{ width: 44 }} />
          </View>
          
          {/* Main content */}
          <View style={styles.loadingContainer}>
            {scannerError ? (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="scan" size={64} color="#3B82F6" />
                </View>
                <Text style={styles.errorText}>{scannerError}</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.actionButton} onPress={openDocumentScanner}>
                    <Ionicons name="refresh" size={24} color="#FFF" />
                    <Text style={styles.actionButtonText}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={openCameraFallback}>
                    <Ionicons name="camera" size={24} color="#FFF" />
                    <Text style={styles.actionButtonText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={openGallery}>
                    <Ionicons name="images" size={24} color="#FFF" />
                    <Text style={styles.actionButtonText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : isSaving ? (
              <>
                <View style={styles.iconContainer}>
                  <Ionicons name="document" size={64} color="#3B82F6" />
                </View>
                <ActivityIndicator size="large" color="#3B82F6" style={styles.spinner} />
                <Text style={styles.statusText}>{statusMessage}</Text>
                <Text style={styles.subText}>Please wait...</Text>
              </>
            ) : null}
          </View>
          
          {/* Bottom buttons - only show if not scanning and not saving */}
          {!scannerError && !isScanning && !isSaving && (
            <View style={[styles.bottomButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity style={styles.bottomButton} onPress={handleGoBack}>
                <Ionicons name="close-circle" size={24} color="#FFF" />
                <Text style={styles.bottomButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bottomButton, styles.primaryButton]} onPress={openDocumentScanner}>
                <Ionicons name="scan" size={24} color="#FFF" />
                <Text style={styles.bottomButtonText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bottomButton} onPress={openGallery}>
                <Ionicons name="images" size={24} color="#FFF" />
                <Text style={styles.bottomButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
        )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
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
  errorText: {
    fontSize: 16,
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    minWidth: 80,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 8,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bottomButton: {
    alignItems: 'center',
    padding: 16,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 32,
  },
  bottomButtonText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 4,
  },
});

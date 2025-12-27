import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface CapturedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

interface DocumentType {
  type: string;
  label: string;
  icon: any;
  color: string;
  aspectRatio: number;
  guide: string;
}

// =============================================================================
// DOCUMENT TYPES CONFIGURATION
// =============================================================================

const DOCUMENT_TYPES: DocumentType[] = [
  { type: 'auto', label: 'Auto', icon: 'scan-outline', color: '#3B82F6', aspectRatio: 0, guide: 'Auto-detect document' },
  { type: 'a4', label: 'A4', icon: 'document-outline', color: '#8B5CF6', aspectRatio: 1.414, guide: 'A4 Document' },
  { type: 'letter', label: 'Letter', icon: 'document-text-outline', color: '#10B981', aspectRatio: 1.294, guide: 'US Letter' },
  { type: 'id', label: 'ID Card', icon: 'card-outline', color: '#F59E0B', aspectRatio: 0.631, guide: 'ID Card / Credit Card' },
  { type: 'receipt', label: 'Receipt', icon: 'receipt-outline', color: '#EC4899', aspectRatio: 2.5, guide: 'Receipt / Ticket' },
  { type: 'book', label: 'Book', icon: 'book-outline', color: '#6366F1', aspectRatio: 0.75, guide: 'Book Pages' },
];

// =============================================================================
// MAIN SCANNER COMPONENT
// =============================================================================

export default function ScannerScreen() {
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const { user, isGuest, token } = useAuthStore();
  const { addDocument, updateDocument, getDocument } = useDocumentStore();
  const insets = useSafeAreaInsets();
  
  // Permissions
  const [permission, requestPermission] = useCameraPermissions();
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Sound
  const shutterSoundRef = useRef<Audio.Sound | null>(null);
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const currentType = DOCUMENT_TYPES[selectedTypeIndex];
  const addToDocumentId = params.addToDocument as string | undefined;
  
  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('scanup_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setSoundEnabled(settings.soundEffects ?? true);
        }
      } catch (e) {
        console.log('Failed to load settings');
      }
    };
    
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/shutter.mp3')
        );
        shutterSoundRef.current = sound;
      } catch (e) {
        console.log('Could not load shutter sound');
      }
    };
    
    loadSettings();
    setupAudio();
    
    return () => {
      if (shutterSoundRef.current) {
        shutterSoundRef.current.unloadAsync();
      }
    };
  }, []);
  
  // Play shutter sound
  const playShutterSound = async () => {
    if (soundEnabled && shutterSoundRef.current) {
      try {
        await shutterSoundRef.current.replayAsync();
      } catch (e) {
        console.log('Could not play shutter sound');
      }
    }
  };
  
  // =============================================================================
  // NATIVE DOCUMENT SCANNER - Real-time on-device edge detection
  // =============================================================================
  
  const startNativeScanner = async () => {
    setIsScanning(true);
    
    try {
      // Use the native document scanner with real-time edge detection
      const result = await DocumentScanner.scanDocument({
        // Maximum number of documents to scan in one session
        maxNumDocuments: 10,
        
        // Image quality (0-100) for the cropped output
        croppedImageQuality: 90,
        
        // Output format
        imageFileType: 'jpg',
      });
      
      if (result.scannedImages && result.scannedImages.length > 0) {
        // Play shutter sound for each captured image
        await playShutterSound();
        
        // Convert scanned images to our format
        const newImages: CapturedImage[] = [];
        
        for (const imagePath of result.scannedImages) {
          try {
            // Read the scanned image
            const fileUri = Platform.OS === 'android' ? `file://${imagePath}` : imagePath;
            
            // Get image info and convert to base64
            const base64 = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            // Get image dimensions using ImageManipulator
            const manipResult = await ImageManipulator.manipulateAsync(
              fileUri,
              [],
              { base64: true, compress: 0.9 }
            );
            
            newImages.push({
              uri: fileUri,
              base64: manipResult.base64 || base64,
              width: manipResult.width,
              height: manipResult.height,
            });
          } catch (e) {
            console.error('Error processing scanned image:', e);
          }
        }
        
        if (newImages.length > 0) {
          setCapturedImages(prev => [...prev, ...newImages]);
          setShowPreview(true);
        }
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.message !== 'User cancelled') {
        console.error('Scanner error:', error);
        Alert.alert('Scanner Error', 'Failed to scan document. Please try again.');
      }
    } finally {
      setIsScanning(false);
    }
  };
  
  // =============================================================================
  // GALLERY PICKER - Import images from photo library
  // =============================================================================
  
  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.9,
        base64: true,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        const newImages: CapturedImage[] = result.assets.map(asset => ({
          uri: asset.uri,
          base64: asset.base64 || '',
          width: asset.width || 0,
          height: asset.height || 0,
        }));
        
        setCapturedImages(prev => [...prev, ...newImages]);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Gallery picker error:', error);
      Alert.alert('Error', 'Failed to select images from gallery.');
    }
  };
  
  // =============================================================================
  // REMOVE IMAGE
  // =============================================================================
  
  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    if (capturedImages.length <= 1) {
      setShowPreview(false);
    }
  };
  
  // =============================================================================
  // SAVE DOCUMENT
  // =============================================================================
  
  const saveDocument = async () => {
    if (capturedImages.length === 0) {
      Alert.alert('No Images', 'Please scan at least one page.');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const documentData = {
        name: `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        pages: capturedImages.map((img, index) => ({
          page_number: index + 1,
          image_base64: img.base64,
          original_image_base64: img.base64,
          width: img.width,
          height: img.height,
        })),
        document_type: currentType.type,
        tags: [],
      };
      
      if (addToDocumentId) {
        // Add pages to existing document
        const existingDoc = getDocument(addToDocumentId);
        if (existingDoc) {
          const newPages = capturedImages.map((img, index) => ({
            page_number: existingDoc.pages.length + index + 1,
            image_base64: img.base64,
            original_image_base64: img.base64,
            width: img.width,
            height: img.height,
          }));
          
          await updateDocument(addToDocumentId, {
            pages: [...existingDoc.pages, ...newPages],
          }, token || undefined);
        }
        router.back();
      } else {
        // Create new document
        const newDocId = await addDocument(documentData, token || undefined);
        router.replace(`/document/${newDocId}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Save Error', 'Failed to save document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // =============================================================================
  // PERMISSION CHECK
  // =============================================================================
  
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
            ScanUp needs camera access to scan your documents
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} style={{ marginTop: 20 }} />
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // =============================================================================
  // PREVIEW SCREEN - Show captured images
  // =============================================================================
  
  if (showPreview && capturedImages.length > 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.previewHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.previewTitle, { color: theme.text }]}>
            {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
          </Text>
          <TouchableOpacity onPress={() => {
            setCapturedImages([]);
            setShowPreview(false);
          }} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={24} color={theme.danger} />
          </TouchableOpacity>
        </View>
        
        {/* Image Grid */}
        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewGrid}>
          {capturedImages.map((img, index) => (
            <View key={index} style={styles.previewImageContainer}>
              <Image 
                source={{ uri: img.uri || `data:image/jpeg;base64,${img.base64}` }} 
                style={styles.previewImage} 
                resizeMode="cover" 
              />
              <TouchableOpacity 
                style={styles.removeImageBtn} 
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={28} color="#EF4444" />
              </TouchableOpacity>
              <View style={styles.pageNumber}>
                <Text style={styles.pageNumberText}>{index + 1}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        
        {/* Actions */}
        <View style={[styles.previewActions, { borderTopColor: theme.border }]}>
          <Button 
            title="Add More" 
            variant="outline" 
            onPress={startNativeScanner}
            style={{ flex: 1, marginRight: 8 }}
            icon={<Ionicons name="add" size={20} color={theme.primary} />}
          />
          <Button 
            title={addToDocumentId ? "Add Pages" : "Save Document"}
            onPress={saveDocument}
            loading={isSaving}
            style={{ flex: 1.5 }}
            icon={<Ionicons name="checkmark" size={20} color="#FFF" />}
          />
        </View>
      </SafeAreaView>
    );
  }
  
  // =============================================================================
  // MAIN SCANNER INTERFACE
  // =============================================================================
  
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Scanner Preview Area */}
      <View style={styles.scannerArea}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          
          <View style={[styles.typeIndicator, { backgroundColor: currentType.color + '30' }]}>
            <Ionicons name={currentType.icon} size={16} color={currentType.color} />
            <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
          </View>
          
          <View style={{ width: 44 }} />
        </View>
        
        {/* Center Content */}
        <View style={styles.centerContent}>
          <View style={styles.scannerIcon}>
            <Ionicons name="scan" size={80} color="#3B82F6" />
          </View>
          <Text style={styles.scannerTitle}>Document Scanner</Text>
          <Text style={styles.scannerSubtitle}>
            Real-time edge detection{'\n'}Auto-crop & perspective correction
          </Text>
          
          {/* Features List */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>On-device processing</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Works offline</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.featureText}>Multi-page scanning</Text>
            </View>
          </View>
        </View>
        
        {/* Bottom Controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
          {/* Document Type Selector */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeSelector}
          >
            {DOCUMENT_TYPES.map((type, index) => (
              <TouchableOpacity
                key={type.type}
                style={[
                  styles.typeBtn,
                  selectedTypeIndex === index && {
                    backgroundColor: type.color + '30',
                    borderColor: type.color,
                    borderWidth: 2,
                  }
                ]}
                onPress={() => setSelectedTypeIndex(index)}
              >
                <Ionicons 
                  name={type.icon} 
                  size={22} 
                  color={selectedTypeIndex === index ? type.color : '#94A3B8'} 
                />
                <Text style={[
                  styles.typeLabel,
                  { color: selectedTypeIndex === index ? type.color : '#94A3B8' }
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Main Buttons */}
          <View style={styles.mainButtons}>
            {/* Gallery Button */}
            <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery}>
              <View style={styles.sideBtnInner}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <Text style={styles.sideBtnText}>Gallery</Text>
            </TouchableOpacity>
            
            {/* Scan Button */}
            <TouchableOpacity 
              style={styles.scanBtn} 
              onPress={startNativeScanner}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator size="large" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="scan" size={36} color="#FFF" />
                  <Text style={styles.scanBtnText}>Scan</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Captured Pages Indicator */}
            <TouchableOpacity 
              style={styles.sideBtn} 
              onPress={() => capturedImages.length > 0 && setShowPreview(true)}
              disabled={capturedImages.length === 0}
            >
              <View style={[
                styles.sideBtnInner,
                capturedImages.length > 0 && { backgroundColor: '#10B981' }
              ]}>
                {capturedImages.length > 0 ? (
                  <Text style={styles.pagesCount}>{capturedImages.length}</Text>
                ) : (
                  <Ionicons name="documents-outline" size={24} color="#FFF" />
                )}
              </View>
              <Text style={styles.sideBtnText}>
                {capturedImages.length > 0 ? 'Review' : 'Pages'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  
  // Permission Screen
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  
  // Scanner Area
  scannerArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Center Content
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  scannerIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scannerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  scannerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  featuresList: {
    marginTop: 32,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#E2E8F0',
  },
  
  // Bottom Controls
  bottomControls: {
    paddingHorizontal: 16,
  },
  typeSelector: {
    paddingVertical: 12,
    gap: 8,
  },
  typeBtn: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 70,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  mainButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
  },
  sideBtn: {
    alignItems: 'center',
    gap: 6,
  },
  sideBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  scanBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  scanBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  pagesCount: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  
  // Preview Screen
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  previewScroll: {
    flex: 1,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  previewImageContainer: {
    width: '48%',
    aspectRatio: 0.75,
    margin: '1%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 8,
  },
});

import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';

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
  { type: 'a4', label: 'A4', icon: 'document-outline', color: '#8B5CF6', aspectRatio: 1.414, guide: 'A4 Document (210×297mm)' },
  { type: 'letter', label: 'Letter', icon: 'document-text-outline', color: '#10B981', aspectRatio: 1.294, guide: 'US Letter (8.5×11")' },
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
  
  // Camera state
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const cameraRef = useRef<CameraView>(null);
  
  // Scanner state
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const shutterSoundRef = useRef<Audio.Sound | null>(null);
  
  const currentType = DOCUMENT_TYPES[selectedTypeIndex];
  const addToDocumentId = params.addToDocument as string | undefined;
  
  // Calculate frame dimensions based on document type
  const getFrameDimensions = () => {
    const maxWidth = SCREEN_WIDTH * 0.85;
    const maxHeight = SCREEN_HEIGHT * 0.5;
    
    if (currentType.aspectRatio === 0) {
      return { width: maxWidth, height: maxWidth * 1.3 };
    }
    
    let width = maxWidth;
    let height = width * currentType.aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height / currentType.aspectRatio;
    }
    
    return { width, height };
  };
  
  const frameDimensions = getFrameDimensions();
  
  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('scanup_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setSoundEnabled(settings.soundEffects ?? true);
          setShowGridOverlay(settings.showGrid ?? false);
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
  // CAPTURE WITH NATIVE SCANNER PLUGIN
  // Uses the plugin for edge detection, perspective correction, and cropping
  // =============================================================================
  
  const captureWithNativeScanner = async () => {
    setIsCapturing(true);
    
    try {
      await playShutterSound();
      
      // Dynamically import native scanner (only works on real devices)
      let DocumentScanner: any;
      try {
        DocumentScanner = require('react-native-document-scanner-plugin').default;
      } catch (e) {
        console.log('Native scanner not available, using manual capture');
        await captureManually();
        return;
      }
      
      if (!DocumentScanner) {
        await captureManually();
        return;
      }
      
      // Launch native scanner with BASE64 response (more reliable)
      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: 10, // Allow multiple pages
        croppedImageQuality: 90,
        responseType: 'base64', // Use base64 for reliable saving
      });
      
      console.log('[Scanner] Plugin result:', result ? 'Got result' : 'No result');
      
      if (result?.scannedImages && result.scannedImages.length > 0) {
        const newImages: CapturedImage[] = [];
        
        for (let i = 0; i < result.scannedImages.length; i++) {
          const imageData = result.scannedImages[i];
          
          // The plugin returns base64 string directly when responseType is 'base64'
          // Clean the base64 string (remove any prefix if present)
          let base64Data = imageData;
          if (base64Data.startsWith('data:')) {
            base64Data = base64Data.split(',')[1];
          }
          
          // Create a data URI for display
          const uri = `data:image/jpeg;base64,${base64Data}`;
          
          newImages.push({
            uri: uri,
            base64: base64Data,
            width: 0, // Will be determined when saved
            height: 0,
          });
          
          console.log(`[Scanner] Processed image ${i + 1}, base64 length: ${base64Data.length}`);
        }
        
        if (newImages.length > 0) {
          setCapturedImages(prev => [...prev, ...newImages]);
          setShowPreview(true);
          console.log(`[Scanner] Added ${newImages.length} images, showing preview`);
        }
      }
    } catch (error: any) {
      console.log('[Scanner] Error:', error.message);
      if (error.message !== 'User cancelled' && error.message !== 'Canceled') {
        // Fallback to manual capture
        await captureManually();
      }
    } finally {
      setIsCapturing(false);
    }
  };
  
  // =============================================================================
  // MANUAL CAPTURE (fallback when plugin not available)
  // =============================================================================
  
  const captureManually = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }
    
    setIsCapturing(true);
    
    try {
      await playShutterSound();
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
      });
      
      if (photo) {
        const newImage: CapturedImage = {
          uri: photo.uri,
          base64: photo.base64 || '',
          width: photo.width,
          height: photo.height,
        };
        
        setCapturedImages(prev => [...prev, newImage]);
        setShowPreview(true);
        console.log('[Scanner] Manual capture successful');
      }
    } catch (error) {
      console.error('[Scanner] Manual capture error:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };
  
  // =============================================================================
  // GALLERY PICKER
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
      console.error('[Scanner] Gallery picker error:', error);
      Alert.alert('Error', 'Failed to select images from gallery.');
    }
  };
  
  // =============================================================================
  // REMOVE IMAGE
  // =============================================================================
  
  const removeImage = (index: number) => {
    setCapturedImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      if (newImages.length === 0) {
        setShowPreview(false);
      }
      return newImages;
    });
  };
  
  // =============================================================================
  // SAVE DOCUMENT
  // =============================================================================
  
  const saveDocument = async () => {
    if (capturedImages.length === 0) {
      Alert.alert('No Images', 'Please scan at least one page.');
      return;
    }
    
    // Validate that we have base64 data
    const validImages = capturedImages.filter(img => img.base64 && img.base64.length > 100);
    if (validImages.length === 0) {
      Alert.alert('Error', 'No valid images to save. Please scan again.');
      return;
    }
    
    setIsSaving(true);
    console.log(`[Scanner] Saving ${validImages.length} images...`);
    
    try {
      const documentData = {
        name: `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        pages: validImages.map((img, index) => ({
          page_number: index + 1,
          image_base64: img.base64,
          original_image_base64: img.base64,
          width: img.width || 0,
          height: img.height || 0,
        })),
        document_type: currentType.type,
        tags: [],
      };
      
      console.log('[Scanner] Document data prepared, pages:', documentData.pages.length);
      
      if (addToDocumentId) {
        // Add pages to existing document
        const existingDoc = getDocument(addToDocumentId);
        if (existingDoc) {
          const newPages = validImages.map((img, index) => ({
            page_number: existingDoc.pages.length + index + 1,
            image_base64: img.base64,
            original_image_base64: img.base64,
            width: img.width || 0,
            height: img.height || 0,
          }));
          
          await updateDocument(addToDocumentId, {
            pages: [...existingDoc.pages, ...newPages],
          }, token || undefined);
          
          console.log('[Scanner] Added pages to existing document');
        }
        router.back();
      } else {
        // Create new document
        console.log('[Scanner] Creating new document...');
        const newDocId = await addDocument(documentData, token || undefined);
        
        if (newDocId) {
          console.log('[Scanner] Document created with ID:', newDocId);
          router.replace(`/document/${newDocId}`);
        } else {
          throw new Error('Failed to create document - no ID returned');
        }
      }
    } catch (error: any) {
      console.error('[Scanner] Save error:', error);
      Alert.alert(
        'Save Error', 
        `Failed to save document: ${error.message || 'Unknown error'}. Please try again.`
      );
    } finally {
      setIsSaving(false);
    }
  };
  
  // Toggle flash
  const toggleFlash = () => {
    setFlashMode(prev => prev === 'off' ? 'on' : 'off');
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
  // PREVIEW SCREEN - Review scanned pages before saving
  // =============================================================================
  
  if (showPreview && capturedImages.length > 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewGrid}>
          {capturedImages.map((img, index) => (
            <View key={index} style={styles.previewImageContainer}>
              <Image 
                source={{ uri: img.uri }} 
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
        
        <View style={[styles.previewActions, { borderTopColor: theme.border }]}>
          <Button 
            title="Add More" 
            variant="outline" 
            onPress={() => setShowPreview(false)}
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
  // CAMERA VIEW - Pre-scan UI with document type selection
  // =============================================================================
  
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flashMode}
      >
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          
          <View style={[styles.typeIndicator, { backgroundColor: currentType.color + '30' }]}>
            <Ionicons name={currentType.icon} size={16} color={currentType.color} />
            <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
          </View>
          
          <TouchableOpacity style={styles.iconBtn} onPress={toggleFlash}>
            <Ionicons name={flashMode === 'on' ? 'flash' : 'flash-off'} size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        {/* Document Frame Guide */}
        <View style={styles.frameContainer}>
          <View style={[styles.docFrame, { width: frameDimensions.width, height: frameDimensions.height }]}>
            {/* Grid overlay */}
            {showGridOverlay && (
              <View style={styles.gridOverlay}>
                <View style={[styles.gridLine, styles.gridHorizontal, { top: '33%' }]} />
                <View style={[styles.gridLine, styles.gridHorizontal, { top: '66%' }]} />
                <View style={[styles.gridLine, styles.gridVertical, { left: '33%' }]} />
                <View style={[styles.gridLine, styles.gridVertical, { left: '66%' }]} />
              </View>
            )}
            
            {/* Corner brackets */}
            <View style={[styles.corner, styles.tl, { borderColor: currentType.color }]} />
            <View style={[styles.corner, styles.tr, { borderColor: currentType.color }]} />
            <View style={[styles.corner, styles.bl, { borderColor: currentType.color }]} />
            <View style={[styles.corner, styles.br, { borderColor: currentType.color }]} />
          </View>
          
          <Text style={[styles.guideText, { color: currentType.color }]}>
            {currentType.guide}
          </Text>
          
          <Text style={styles.hintText}>
            Tap capture to scan with edge detection
          </Text>
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
            
            {/* Capture Button - Launches Native Scanner */}
            <TouchableOpacity 
              style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]} 
              onPress={captureWithNativeScanner}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator size="large" color="#3B82F6" />
              ) : (
                <View style={styles.captureBtnInner} />
              )}
            </TouchableOpacity>
            
            {/* Pages indicator / Review button */}
            {capturedImages.length > 0 ? (
              <TouchableOpacity style={styles.sideBtn} onPress={() => setShowPreview(true)}>
                <View style={[styles.sideBtnInner, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.pagesCountText}>{capturedImages.length}</Text>
                </View>
                <Text style={styles.sideBtnText}>Review</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.sideBtn}>
                <View style={[styles.sideBtnInner, { opacity: 0.5 }]}>
                  <Ionicons name="documents-outline" size={24} color="#FFF" />
                </View>
                <Text style={styles.sideBtnText}>Pages</Text>
              </View>
            )}
          </View>
        </View>
      </CameraView>
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
  
  // Permission
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
  
  // Frame Container
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docFrame: {
    borderWidth: 0,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 4,
  },
  tl: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 4 },
  
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  gridHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  
  guideText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Bottom Controls
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    paddingVertical: 16,
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
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  pagesCountText: {
    color: '#FFF',
    fontSize: 18,
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

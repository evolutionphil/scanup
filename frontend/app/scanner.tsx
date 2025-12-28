import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Polygon, Circle, Line } from 'react-native-svg';
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

interface Point {
  x: number;
  y: number;
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
  const { token } = useAuthStore();
  const { createDocumentLocalFirst, updateDocument, documents } = useDocumentStore();
  const insets = useSafeAreaInsets();
  
  // Scanner state
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Native module availability
  const [Camera, setCamera] = useState<any>(null);
  const [device, setDevice] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState(false);
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const cameraRef = useRef<any>(null);
  const soundRef = useRef<any>(null);
  
  const currentType = DOCUMENT_TYPES[selectedTypeIndex];
  const addToDocumentId = params.addToDocument as string | undefined;
  
  // Calculate frame dimensions
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
  
  // =============================================================================
  // INITIALIZE CAMERA - Safe loading of native modules
  // =============================================================================
  
  useEffect(() => {
    const initCamera = async () => {
      if (Platform.OS === 'web') {
        setCameraError('Camera not available on web');
        return;
      }
      
      try {
        // Dynamically import VisionCamera
        const VisionCamera = require('react-native-vision-camera');
        
        // Request permission
        const permission = await VisionCamera.Camera.requestCameraPermission();
        if (permission !== 'granted') {
          setCameraError('Camera permission denied');
          return;
        }
        setHasPermission(true);
        
        // Get device
        const devices = await VisionCamera.Camera.getAvailableCameraDevices();
        const backCamera = devices.find((d: any) => d.position === 'back');
        
        if (!backCamera) {
          setCameraError('No back camera found');
          return;
        }
        
        setDevice(backCamera);
        setCamera(() => VisionCamera.Camera);
        
      } catch (error: any) {
        console.error('[Scanner] Camera init error:', error);
        setCameraError(`Camera error: ${error.message}`);
      }
    };
    
    initCamera();
  }, []);
  
  // Load settings
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
        console.log('Could not load shutter sound');
      }
    };
    
    loadSettings();
    setupAudio();
    
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);
  
  // Play shutter sound
  const playShutterSound = async () => {
    if (soundEnabled && soundRef.current) {
      try {
        await soundRef.current.replayAsync();
      } catch (e) {
        // Ignore sound errors
      }
    }
  };
  
  // =============================================================================
  // CAPTURE IMAGE - VisionCamera
  // =============================================================================
  
  const captureImage = async () => {
    if (isCapturing) return;
    
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }
    
    setIsCapturing(true);
    
    try {
      await playShutterSound();
      
      const photo = await cameraRef.current.takePhoto({
        flash: flashOn ? 'on' : 'off',
        qualityPrioritization: 'quality',
      });
      
      if (photo) {
        const uri = Platform.OS === 'android' ? `file://${photo.path}` : photo.path;
        
        // Get base64
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [],
          { base64: true, compress: 0.9 }
        );
        
        const newImage: CapturedImage = {
          uri: uri,
          base64: manipResult.base64 || '',
          width: photo.width,
          height: photo.height,
        };
        
        setCapturedImages(prev => [...prev, newImage]);
        setShowPreview(true);
      }
    } catch (error: any) {
      console.error('[Scanner] Capture error:', error);
      Alert.alert('Capture Error', error.message || 'Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };
  
  // =============================================================================
  // CAPTURE WITH DOCUMENT SCANNER PLUGIN
  // =============================================================================
  
  const captureWithPlugin = async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    
    try {
      await playShutterSound();
      
      const DocumentScanner = require('react-native-document-scanner-plugin').default;
      
      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: 10,
        croppedImageQuality: 90,
        responseType: 'base64',
      });
      
      if (result?.scannedImages && result.scannedImages.length > 0) {
        const newImages: CapturedImage[] = result.scannedImages.map((imageData: string) => {
          let base64Data = imageData;
          if (base64Data.startsWith('data:')) {
            base64Data = base64Data.split(',')[1];
          }
          return {
            uri: `data:image/jpeg;base64,${base64Data}`,
            base64: base64Data,
            width: 0,
            height: 0,
          };
        });
        
        setCapturedImages(prev => [...prev, ...newImages]);
        setShowPreview(true);
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled' && error.message !== 'Canceled') {
        console.error('[Scanner] Plugin error:', error);
        Alert.alert('Scanner Error', error.message || 'Failed to scan');
      }
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
    } catch (error: any) {
      console.error('[Scanner] Gallery error:', error);
      Alert.alert('Error', 'Failed to select images');
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
    
    const validImages = capturedImages.filter(img => img.base64 && img.base64.length > 100);
    if (validImages.length === 0) {
      Alert.alert('Error', 'No valid images to save.');
      return;
    }
    
    setIsSaving(true);
    
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
      
      if (addToDocumentId) {
        const existingDoc = documents.find(d => d.document_id === addToDocumentId);
        if (existingDoc) {
          const newPages = validImages.map((img, index) => ({
            page_number: existingDoc.pages.length + index + 1,
            image_base64: img.base64,
            original_image_base64: img.base64,
            width: img.width || 0,
            height: img.height || 0,
          }));
          
          await updateDocument(token || null, addToDocumentId, {
            pages: [...existingDoc.pages, ...newPages],
          });
        }
        router.back();
      } else {
        const newDoc = await createDocumentLocalFirst(token || null, documentData);
        if (newDoc && newDoc.document_id) {
          router.replace(`/document/${newDoc.document_id}`);
        } else {
          throw new Error('Failed to create document');
        }
      }
    } catch (error: any) {
      console.error('[Scanner] Save error:', error);
      Alert.alert('Save Error', error.message || 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };
  
  // =============================================================================
  // GO BACK HANDLER
  // =============================================================================
  
  const handleGoBack = () => {
    if (showPreview && capturedImages.length > 0) {
      Alert.alert(
        'Discard Scan?',
        'You have unsaved images. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };
  
  // =============================================================================
  // PREVIEW SCREEN
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
  // CAMERA VIEW
  // =============================================================================
  
  const renderCameraView = () => {
    // If camera is available, use VisionCamera
    if (Camera && device && hasPermission && !cameraError) {
      return (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
          torch={flashOn ? 'on' : 'off'}
          onInitialized={() => setCameraReady(true)}
          onError={(error: any) => {
            console.error('[Camera] Error:', error);
            setCameraError(error.message || 'Camera error');
          }}
        />
      );
    }
    
    // Fallback: Show placeholder with scan button
    return (
      <View style={styles.cameraPlaceholder}>
        <Ionicons name="camera" size={80} color="#3B82F6" />
        <Text style={styles.placeholderTitle}>Document Scanner</Text>
        <Text style={styles.placeholderText}>
          {cameraError || 'Tap the button below to scan'}
        </Text>
      </View>
    );
  };
  
  // =============================================================================
  // MAIN RENDER
  // =============================================================================
  
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Camera View */}
      {renderCameraView()}
      
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleGoBack}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        
        <View style={[styles.typeIndicator, { backgroundColor: currentType.color + '30' }]}>
          <Ionicons name={currentType.icon} size={16} color={currentType.color} />
          <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.iconBtn} 
          onPress={() => setFlashOn(!flashOn)}
          disabled={!Camera || !device}
        >
          <Ionicons 
            name={flashOn ? 'flash' : 'flash-off'} 
            size={24} 
            color={Camera && device ? '#FFF' : '#666'} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Document Frame Guide */}
      <View style={styles.frameContainer}>
        <View style={[styles.docFrame, { width: frameDimensions.width, height: frameDimensions.height }]}>
          {showGridOverlay && (
            <View style={styles.gridOverlay}>
              <View style={[styles.gridLine, styles.gridHorizontal, { top: '33%' }]} />
              <View style={[styles.gridLine, styles.gridHorizontal, { top: '66%' }]} />
              <View style={[styles.gridLine, styles.gridVertical, { left: '33%' }]} />
              <View style={[styles.gridLine, styles.gridVertical, { left: '66%' }]} />
            </View>
          )}
          <View style={[styles.corner, styles.tl, { borderColor: currentType.color }]} />
          <View style={[styles.corner, styles.tr, { borderColor: currentType.color }]} />
          <View style={[styles.corner, styles.bl, { borderColor: currentType.color }]} />
          <View style={[styles.corner, styles.br, { borderColor: currentType.color }]} />
        </View>
        
        <Text style={[styles.guideText, { color: currentType.color }]}>
          {currentType.guide}
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
              <Text style={[styles.typeLabel, { color: selectedTypeIndex === index ? type.color : '#94A3B8' }]}>
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
          
          {/* Capture Button */}
          <TouchableOpacity 
            style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]} 
            onPress={Camera && device && cameraReady ? captureImage : captureWithPlugin}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : (
              <View style={styles.captureBtnInner} />
            )}
          </TouchableOpacity>
          
          {/* Pages/Review Button */}
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
  
  // Camera placeholder
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
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
  
  // Frame
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docFrame: {
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
  gridHorizontal: { left: 0, right: 0, height: 1 },
  gridVertical: { top: 0, bottom: 0, width: 1 },
  
  guideText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
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
  
  // Preview
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

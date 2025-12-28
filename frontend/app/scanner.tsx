import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { Audio } from 'expo-av';
import Svg, { Polygon, Circle, Line } from 'react-native-svg';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';

// Conditionally import VisionCamera and OpenCV (native only)
let Camera: any = null;
let useCameraDevice: any = null;
let useCameraPermission: any = null;
let useFrameProcessor: any = null;
let OpenCV: any = null;

try {
  const VisionCamera = require('react-native-vision-camera');
  Camera = VisionCamera.Camera;
  useCameraDevice = VisionCamera.useCameraDevice;
  useCameraPermission = VisionCamera.useCameraPermission;
  useFrameProcessor = VisionCamera.useFrameProcessor;
} catch (e) {
  console.log('[Scanner] VisionCamera not available');
}

try {
  OpenCV = require('react-native-fast-opencv').default;
} catch (e) {
  console.log('[Scanner] OpenCV not available');
}

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

interface DetectedDocument {
  corners: Point[];
  confidence: number;
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
// CORNER STABILIZATION - Smooths detected corners over multiple frames
// =============================================================================

const STABILIZATION_FRAMES = 5;
const STABILITY_THRESHOLD = 0.02; // 2% movement threshold

class CornerStabilizer {
  private history: Point[][] = [];
  private stableCorners: Point[] | null = null;
  private stableCount = 0;
  
  addFrame(corners: Point[]): Point[] | null {
    if (corners.length !== 4) return this.stableCorners;
    
    this.history.push(corners);
    if (this.history.length > STABILIZATION_FRAMES) {
      this.history.shift();
    }
    
    if (this.history.length < 3) return null;
    
    // Average corners over history
    const avgCorners: Point[] = [];
    for (let i = 0; i < 4; i++) {
      let sumX = 0, sumY = 0;
      for (const frame of this.history) {
        sumX += frame[i].x;
        sumY += frame[i].y;
      }
      avgCorners.push({
        x: sumX / this.history.length,
        y: sumY / this.history.length,
      });
    }
    
    // Check if stable
    if (this.stableCorners) {
      let maxMove = 0;
      for (let i = 0; i < 4; i++) {
        const dx = Math.abs(avgCorners[i].x - this.stableCorners[i].x);
        const dy = Math.abs(avgCorners[i].y - this.stableCorners[i].y);
        maxMove = Math.max(maxMove, dx, dy);
      }
      
      if (maxMove < STABILITY_THRESHOLD) {
        this.stableCount++;
      } else {
        this.stableCount = 0;
      }
    }
    
    this.stableCorners = avgCorners;
    return avgCorners;
  }
  
  isStable(): boolean {
    return this.stableCount >= STABILIZATION_FRAMES;
  }
  
  reset() {
    this.history = [];
    this.stableCorners = null;
    this.stableCount = 0;
  }
}

// =============================================================================
// MAIN SCANNER COMPONENT
// =============================================================================

export default function ScannerScreen() {
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const { user, isGuest, token } = useAuthStore();
  const { addDocument, updateDocument, getDocument } = useDocumentStore();
  const insets = useSafeAreaInsets();
  
  // VisionCamera hooks (only used on native)
  const device = useCameraDevice ? useCameraDevice('back') : null;
  const cameraPermission = useCameraPermission ? useCameraPermission() : { hasPermission: false, requestPermission: () => {} };
  
  // Scanner state
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  
  // Edge detection state
  const [detectedCorners, setDetectedCorners] = useState<Point[] | null>(null);
  const [isDocumentStable, setIsDocumentStable] = useState(false);
  const stabilizer = useRef(new CornerStabilizer()).current;
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const shutterSoundRef = useRef<Audio.Sound | null>(null);
  const cameraRef = useRef<any>(null);
  
  // Check if native features are available
  const isNativeAvailable = Camera && OpenCV && device;
  
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
  
  // Request camera permission
  useEffect(() => {
    if (cameraPermission && !cameraPermission.hasPermission) {
      cameraPermission.requestPermission();
    }
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
  // FRAME PROCESSOR - Real-time edge detection using OpenCV
  // =============================================================================
  
  const frameProcessor = useFrameProcessor ? useFrameProcessor((frame: any) => {
    'worklet';
    
    if (!OpenCV) return;
    
    try {
      const width = frame.width;
      const height = frame.height;
      
      // Convert frame to OpenCV Mat
      const src = OpenCV.frameBufferToMat(height, width, frame);
      
      // Resize for faster processing
      const scale = 0.25;
      const smallWidth = Math.floor(width * scale);
      const smallHeight = Math.floor(height * scale);
      const resized = OpenCV.createObject(OpenCV.ObjectType.Mat, smallHeight, smallWidth, OpenCV.DataTypes.CV_8UC4);
      OpenCV.invoke('resize', src, resized, { width: smallWidth, height: smallHeight });
      
      // Convert to grayscale
      const gray = OpenCV.createObject(OpenCV.ObjectType.Mat, smallHeight, smallWidth, OpenCV.DataTypes.CV_8U);
      OpenCV.invoke('cvtColor', resized, gray, OpenCV.ColorConversionCodes.COLOR_RGBA2GRAY);
      
      // Apply Gaussian blur
      OpenCV.invoke('GaussianBlur', gray, gray, { width: 5, height: 5 }, 0);
      
      // Edge detection with Canny
      const edges = OpenCV.createObject(OpenCV.ObjectType.Mat, smallHeight, smallWidth, OpenCV.DataTypes.CV_8U);
      OpenCV.invoke('Canny', gray, edges, 50, 150);
      
      // Dilate edges to connect broken lines
      const kernel = OpenCV.getStructuringElement(OpenCV.MorphShapes.MORPH_RECT, { width: 3, height: 3 });
      OpenCV.invoke('dilate', edges, edges, kernel, { x: -1, y: -1 }, 2);
      
      // Find contours
      const contours = OpenCV.createObject(OpenCV.ObjectType.MatVector);
      const hierarchy = OpenCV.createObject(OpenCV.ObjectType.Mat);
      OpenCV.invoke('findContours', edges, contours, hierarchy, 
        OpenCV.RetrievalModes.RETR_EXTERNAL, 
        OpenCV.ContourApproximationModes.CHAIN_APPROX_SIMPLE
      );
      
      // Find largest quadrilateral
      let bestCorners: Point[] | null = null;
      let maxArea = (smallWidth * smallHeight) * 0.1; // Minimum 10% of frame
      
      const numContours = OpenCV.invoke('size', contours);
      for (let i = 0; i < numContours; i++) {
        const contour = OpenCV.invoke('at', contours, i);
        const area = OpenCV.invoke('contourArea', contour);
        
        if (area > maxArea) {
          // Approximate polygon
          const peri = OpenCV.invoke('arcLength', contour, true);
          const approx = OpenCV.createObject(OpenCV.ObjectType.Mat);
          OpenCV.invoke('approxPolyDP', contour, approx, 0.02 * peri, true);
          
          const numPoints = OpenCV.invoke('rows', approx);
          
          if (numPoints === 4) {
            // Check if convex
            const isConvex = OpenCV.invoke('isContourConvex', approx);
            if (isConvex) {
              maxArea = area;
              
              // Extract corners and normalize to 0-1
              const corners: Point[] = [];
              for (let j = 0; j < 4; j++) {
                const pt = OpenCV.invoke('at', approx, j, 0);
                corners.push({
                  x: (pt.x / scale) / width,
                  y: (pt.y / scale) / height,
                });
              }
              
              // Sort corners: top-left, top-right, bottom-right, bottom-left
              corners.sort((a, b) => a.y - b.y);
              const top = corners.slice(0, 2).sort((a, b) => a.x - b.x);
              const bottom = corners.slice(2, 4).sort((a, b) => b.x - a.x);
              bestCorners = [top[0], top[1], bottom[0], bottom[1]];
            }
          }
        }
      }
      
      // Clear OpenCV buffers
      OpenCV.clearBuffers();
      
      // Update state (via runOnJS if needed)
      if (bestCorners) {
        // This would need to be called via runOnJS
        // For now, we'll use a different approach
      }
    } catch (e) {
      // Silently handle errors in frame processor
    }
  }, []) : null;
  
  // =============================================================================
  // CAPTURE IMAGE
  // =============================================================================
  
  const captureImage = async () => {
    if (isCapturing || !cameraRef.current) return;
    
    setIsCapturing(true);
    
    try {
      await playShutterSound();
      
      // Take photo with VisionCamera
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
        stabilizer.reset();
        setDetectedCorners(null);
        setIsDocumentStable(false);
      }
    } catch (error) {
      console.error('[Scanner] Capture error:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };
  
  // =============================================================================
  // FALLBACK: Use document scanner plugin
  // =============================================================================
  
  const captureWithPlugin = async () => {
    setIsCapturing(true);
    
    try {
      await playShutterSound();
      
      let DocumentScanner: any;
      try {
        DocumentScanner = require('react-native-document-scanner-plugin').default;
      } catch (e) {
        Alert.alert('Error', 'Scanner not available');
        setIsCapturing(false);
        return;
      }
      
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
    } catch (error) {
      console.error('[Scanner] Gallery error:', error);
      Alert.alert('Error', 'Failed to select images.');
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
        }
        router.back();
      } else {
        const newDocId = await addDocument(documentData, token || undefined);
        if (newDocId) {
          router.replace(`/document/${newDocId}`);
        } else {
          throw new Error('Failed to create document');
        }
      }
    } catch (error: any) {
      console.error('[Scanner] Save error:', error);
      Alert.alert('Save Error', `Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // =============================================================================
  // RENDER EDGE OVERLAY
  // =============================================================================
  
  const renderEdgeOverlay = () => {
    if (!detectedCorners || detectedCorners.length !== 4) return null;
    
    const points = detectedCorners.map(c => 
      `${c.x * SCREEN_WIDTH},${c.y * SCREEN_HEIGHT}`
    ).join(' ');
    
    const color = isDocumentStable ? '#10B981' : '#3B82F6';
    
    return (
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Polygon fill */}
        <Polygon
          points={points}
          fill={`${color}20`}
          stroke={color}
          strokeWidth={3}
        />
        
        {/* Corner circles */}
        {detectedCorners.map((corner, index) => (
          <Circle
            key={index}
            cx={corner.x * SCREEN_WIDTH}
            cy={corner.y * SCREEN_HEIGHT}
            r={12}
            fill={color}
            stroke="#FFF"
            strokeWidth={2}
          />
        ))}
        
        {/* Edge lines for emphasis */}
        {detectedCorners.map((corner, index) => {
          const nextIndex = (index + 1) % 4;
          return (
            <Line
              key={`line-${index}`}
              x1={corner.x * SCREEN_WIDTH}
              y1={corner.y * SCREEN_HEIGHT}
              x2={detectedCorners[nextIndex].x * SCREEN_WIDTH}
              y2={detectedCorners[nextIndex].y * SCREEN_HEIGHT}
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    );
  };
  
  // =============================================================================
  // PERMISSION CHECK
  // =============================================================================
  
  if (!isNativeAvailable) {
    // Fallback UI when native camera is not available
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={[styles.typeIndicator, { backgroundColor: currentType.color + '30' }]}>
            <Ionicons name={currentType.icon} size={16} color={currentType.color} />
            <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        
        <View style={styles.frameContainer}>
          <View style={styles.nativeUnavailable}>
            <Ionicons name="scan" size={64} color="#3B82F6" />
            <Text style={styles.nativeTitle}>Document Scanner</Text>
            <Text style={styles.nativeSubtitle}>
              Tap the button below to start scanning with{'\n'}real-time edge detection
            </Text>
          </View>
        </View>
        
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
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
          
          <View style={styles.mainButtons}>
            <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery}>
              <View style={styles.sideBtnInner}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <Text style={styles.sideBtnText}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]} 
              onPress={captureWithPlugin}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator size="large" color="#3B82F6" />
              ) : (
                <View style={styles.captureBtnInner} />
              )}
            </TouchableOpacity>
            
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
  // NATIVE CAMERA VIEW WITH REAL-TIME EDGE DETECTION
  // =============================================================================
  
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {device && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!showPreview}
          photo={true}
          torch={flashOn ? 'on' : 'off'}
          frameProcessor={frameProcessor}
          frameProcessorFps={5}
        />
      )}
      
      {/* Edge Detection Overlay */}
      {renderEdgeOverlay()}
      
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        
        <View style={[styles.typeIndicator, { backgroundColor: currentType.color + '30' }]}>
          <Ionicons name={currentType.icon} size={16} color={currentType.color} />
          <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
        </View>
        
        <TouchableOpacity style={styles.iconBtn} onPress={() => setFlashOn(!flashOn)}>
          <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      {/* Document Frame Guide (when no edges detected) */}
      {!detectedCorners && (
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
      )}
      
      {/* Detection Status */}
      {detectedCorners && (
        <View style={styles.detectionStatus}>
          <View style={[styles.statusBadge, { backgroundColor: isDocumentStable ? '#10B981' : '#3B82F6' }]}>
            <Ionicons name={isDocumentStable ? 'checkmark-circle' : 'scan-outline'} size={16} color="#FFF" />
            <Text style={styles.statusText}>
              {isDocumentStable ? 'Ready to capture!' : 'Hold steady...'}
            </Text>
          </View>
        </View>
      )}
      
      {/* Bottom Controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
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
        
        <View style={styles.mainButtons}>
          <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery}>
            <View style={styles.sideBtnInner}>
              <Ionicons name="images" size={24} color="#FFF" />
            </View>
            <Text style={styles.sideBtnText}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.captureBtn, 
              isCapturing && styles.captureBtnDisabled,
              isDocumentStable && styles.captureBtnReady
            ]} 
            onPress={captureImage}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : (
              <View style={[
                styles.captureBtnInner,
                isDocumentStable && { backgroundColor: '#10B981', borderColor: '#10B981' }
              ]} />
            )}
          </TouchableOpacity>
          
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
  
  // Native unavailable
  nativeUnavailable: {
    alignItems: 'center',
    padding: 32,
  },
  nativeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
  },
  nativeSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  
  // Detection status
  detectionStatus: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
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
  captureBtnReady: {
    borderColor: '#10B981',
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

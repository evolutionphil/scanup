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

// =============================================================================
// CONDITIONAL IMPORTS FOR NATIVE MODULES
// =============================================================================

// VisionCamera imports
let Camera: any = null;
let useCameraDevice: any = null;
let useCameraPermission: any = null;
let useSkiaFrameProcessor: any = null;

// Skia imports  
let Skia: any = null;
let PaintStyle: any = null;

// OpenCV imports
let OpenCV: any = null;

// Resize plugin
let useResizePlugin: any = null;

// Audio
let Audio: any = null;

// Only import native modules on native platforms
if (Platform.OS !== 'web') {
  try {
    const VisionCamera = require('react-native-vision-camera');
    Camera = VisionCamera.Camera;
    useCameraDevice = VisionCamera.useCameraDevice;
    useCameraPermission = VisionCamera.useCameraPermission;
    useSkiaFrameProcessor = VisionCamera.useSkiaFrameProcessor;
  } catch (e) {
    console.log('[Scanner] VisionCamera not available:', e);
  }

  try {
    const SkiaModule = require('@shopify/react-native-skia');
    Skia = SkiaModule.Skia;
    PaintStyle = SkiaModule.PaintStyle;
  } catch (e) {
    console.log('[Scanner] Skia not available:', e);
  }

  try {
    OpenCV = require('react-native-fast-opencv');
  } catch (e) {
    console.log('[Scanner] OpenCV not available:', e);
  }

  try {
    const ResizePlugin = require('vision-camera-resize-plugin');
    useResizePlugin = ResizePlugin.useResizePlugin;
  } catch (e) {
    console.log('[Scanner] Resize plugin not available:', e);
  }

  try {
    Audio = require('expo-av').Audio;
  } catch (e) {
    console.log('[Scanner] expo-av not available:', e);
  }
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

interface DetectionResult {
  corners: Point[];
  confidence: number;
  isStable: boolean;
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
const STABILITY_THRESHOLD = 0.02;

class CornerStabilizer {
  private history: Point[][] = [];
  private stableCorners: Point[] | null = null;
  private stableCount = 0;
  
  addFrame(corners: Point[]): Point[] | null {
    if (corners.length !== 4) return this.stableCorners;
    
    this.history.push([...corners]);
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

// Global stabilizer instance for worklet access
const globalStabilizer = new CornerStabilizer();

// =============================================================================
// MAIN SCANNER COMPONENT
// =============================================================================

export default function ScannerScreen() {
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const { user, isGuest, token } = useAuthStore();
  const { createDocumentLocalFirst, updateDocument, documents } = useDocumentStore();
  const insets = useSafeAreaInsets();
  
  // VisionCamera hooks (only available on native)
  const device = useCameraDevice ? useCameraDevice('back') : null;
  const cameraPermission = useCameraPermission ? useCameraPermission() : { hasPermission: false, requestPermission: async () => ({ hasPermission: false }) };
  const resizePlugin = useResizePlugin ? useResizePlugin() : null;
  
  // Scanner state
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  
  // Edge detection state
  const [detectedCorners, setDetectedCorners] = useState<Point[] | null>(null);
  const [isDocumentStable, setIsDocumentStable] = useState(false);
  const stabilizer = useRef(new CornerStabilizer()).current;
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const shutterSoundRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const autoCaptureTriggeredRef = useRef(false);
  
  // Check if all native features are available
  const isNativeAvailable = Platform.OS !== 'web' && Camera && device && OpenCV && useSkiaFrameProcessor;
  
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
          setAutoCapture(settings.autoCapture ?? false);
        }
      } catch (e) {
        console.log('Failed to load settings');
      }
    };
    
    const setupAudio = async () => {
      if (!Audio) return;
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
  
  // Auto-capture when document is stable
  useEffect(() => {
    if (autoCapture && isDocumentStable && cameraReady && !isCapturing && !autoCaptureTriggeredRef.current) {
      autoCaptureTriggeredRef.current = true;
      captureImage();
    }
  }, [autoCapture, isDocumentStable, cameraReady, isCapturing]);
  
  // Reset auto-capture trigger when corners change significantly
  useEffect(() => {
    if (!isDocumentStable) {
      autoCaptureTriggeredRef.current = false;
    }
  }, [isDocumentStable]);
  
  // Callback to update detection state from frame processor
  const onDocumentDetected = useCallback((detection: DetectionResult | null) => {
    if (detection && detection.corners.length === 4) {
      const stabilizedCorners = stabilizer.addFrame(detection.corners);
      if (stabilizedCorners) {
        setDetectedCorners(stabilizedCorners);
        setIsDocumentStable(stabilizer.isStable());
      }
    } else {
      setDetectedCorners(null);
      setIsDocumentStable(false);
    }
  }, [stabilizer]);
  
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
  // FRAME PROCESSOR - Real-time on-device edge detection
  // =============================================================================
  
  // Create Skia paint for overlay
  const paint = Skia ? (() => {
    const p = Skia.Paint();
    p.setStyle(PaintStyle?.Stroke || 1);
    p.setStrokeWidth(4);
    p.setColor(Skia.Color('#3B82F6'));
    return p;
  })() : null;

  const stablePaint = Skia ? (() => {
    const p = Skia.Paint();
    p.setStyle(PaintStyle?.Stroke || 1);
    p.setStrokeWidth(4);
    p.setColor(Skia.Color('#10B981'));
    return p;
  })() : null;

  const fillPaint = Skia ? (() => {
    const p = Skia.Paint();
    p.setStyle(PaintStyle?.Fill || 0);
    p.setColor(Skia.Color('rgba(59, 130, 246, 0.2)'));
    return p;
  })() : null;

  // Frame processor with Skia for on-device edge detection
  const frameProcessor = (useSkiaFrameProcessor && OpenCV && resizePlugin && Skia) 
    ? useSkiaFrameProcessor((frame: any) => {
        'worklet';
        
        try {
          // Resize frame for faster processing
          const resized = resizePlugin.resize(frame, {
            scale: { width: 640, height: 480 },
            pixelFormat: 'bgr',
            dataType: 'uint8',
          });
          
          if (!resized) return;
          
          const width = resized.width;
          const height = resized.height;
          
          // Convert to grayscale
          const gray = OpenCV.cvtColor(resized, OpenCV.COLOR_BGR2GRAY);
          
          // Apply Gaussian blur
          const blurred = OpenCV.GaussianBlur(gray, [5, 5], 0);
          
          // Edge detection with Canny
          const edges = OpenCV.Canny(blurred, 50, 150);
          
          // Dilate to connect broken edges
          const dilated = OpenCV.dilate(edges, [3, 3]);
          
          // Find contours
          const contours = OpenCV.findContours(
            dilated, 
            OpenCV.RETR_EXTERNAL, 
            OpenCV.CHAIN_APPROX_SIMPLE
          );
          
          // Find largest quadrilateral
          let bestCorners: Point[] | null = null;
          let maxArea = width * height * 0.1; // Minimum 10% of frame
          
          const numContours = contours.size ? contours.size() : 0;
          
          for (let i = 0; i < numContours; i++) {
            const contour = contours.get(i);
            const area = OpenCV.contourArea(contour);
            
            if (area > maxArea) {
              const peri = OpenCV.arcLength(contour, true);
              const approx = OpenCV.approxPolyDP(contour, 0.02 * peri, true);
              
              const numPoints = approx.size ? approx.size() : (approx.length || 0);
              
              if (numPoints === 4) {
                const isConvex = OpenCV.isContourConvex(approx);
                if (isConvex) {
                  maxArea = area;
                  
                  // Extract corners and normalize to screen coordinates
                  const corners: Point[] = [];
                  for (let j = 0; j < 4; j++) {
                    const pt = approx.get ? approx.get(j) : approx[j];
                    corners.push({
                      x: (pt.x / width) * frame.width,
                      y: (pt.y / height) * frame.height,
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
          
          // Draw overlay on Skia canvas
          if (bestCorners && bestCorners.length === 4) {
            const canvas = frame.render();
            
            // Create path for document outline
            const path = Skia.Path.Make();
            path.moveTo(bestCorners[0].x, bestCorners[0].y);
            path.lineTo(bestCorners[1].x, bestCorners[1].y);
            path.lineTo(bestCorners[2].x, bestCorners[2].y);
            path.lineTo(bestCorners[3].x, bestCorners[3].y);
            path.close();
            
            // Draw fill
            if (fillPaint) {
              canvas.drawPath(path, fillPaint);
            }
            
            // Draw stroke
            const strokePaint = isDocumentStable ? stablePaint : paint;
            if (strokePaint) {
              canvas.drawPath(path, strokePaint);
            }
            
            // Draw corner circles
            const circlePaint = Skia.Paint();
            circlePaint.setStyle(PaintStyle?.Fill || 0);
            circlePaint.setColor(isDocumentStable ? Skia.Color('#10B981') : Skia.Color('#3B82F6'));
            
            for (const corner of bestCorners) {
              canvas.drawCircle(corner.x, corner.y, 12, circlePaint);
            }
          }
          
          // Update detection state (via runOnJS)
          // Note: In actual implementation, use runOnJS from worklets-core
          
        } catch (e) {
          // Silent error handling in worklet
        }
      }, [paint, stablePaint, fillPaint, isDocumentStable])
    : null;
  
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
        Alert.alert('Error', 'Scanner not available. Please build the app to use native scanner.');
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
      Alert.alert('Save Error', `Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // =============================================================================
  // RENDER REACT NATIVE SVG OVERLAY (Fallback when Skia frame processor not available)
  // =============================================================================
  
  const renderEdgeOverlay = () => {
    if (!detectedCorners || detectedCorners.length !== 4) return null;
    
    const points = detectedCorners.map(c => 
      `${c.x},${c.y}`
    ).join(' ');
    
    const color = isDocumentStable ? '#10B981' : '#3B82F6';
    
    return (
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Polygon
          points={points}
          fill={`${color}20`}
          stroke={color}
          strokeWidth={3}
        />
        {detectedCorners.map((corner, index) => (
          <Circle
            key={index}
            cx={corner.x}
            cy={corner.y}
            r={12}
            fill={color}
            stroke="#FFF"
            strokeWidth={2}
          />
        ))}
        {detectedCorners.map((corner, index) => {
          const nextIndex = (index + 1) % 4;
          return (
            <Line
              key={`line-${index}`}
              x1={corner.x}
              y1={corner.y}
              x2={detectedCorners[nextIndex].x}
              y2={detectedCorners[nextIndex].y}
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
  // FALLBACK UI - When native features aren't available
  // =============================================================================
  
  if (!isNativeAvailable) {
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
              Tap the button below to start scanning{'\n'}with real-time edge detection
            </Text>
            <Text style={styles.nativeNote}>
              📱 Build the app to enable on-device{'\n'}real-time document detection
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
  // NATIVE CAMERA VIEW WITH ON-DEVICE EDGE DETECTION
  // =============================================================================
  
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {device && Camera && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!showPreview}
          photo={true}
          torch={flashOn ? 'on' : 'off'}
          pixelFormat="yuv"
          frameProcessor={frameProcessor}
          frameProcessorFps={5}
          onInitialized={() => setCameraReady(true)}
          onError={(error: any) => console.log('[Camera] Error:', error)}
        />
      )}
      
      {/* Edge Detection Overlay (React Native SVG fallback) */}
      {!frameProcessor && renderEdgeOverlay()}
      
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
      
      {/* Document Frame Guide */}
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
              {isDocumentStable ? (autoCapture ? 'Capturing...' : 'Ready to capture!') : 'Hold steady...'}
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
  nativeNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
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

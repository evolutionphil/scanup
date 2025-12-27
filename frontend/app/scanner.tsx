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
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';
import Svg, { Rect, Line, Path, Defs, Mask, Circle, Text as SvgText } from 'react-native-svg';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/*
 * =============================================================================
 * COORDINATE SYSTEM & ASPECT RATIO HANDLING
 * =============================================================================
 * 
 * KEY CONCEPT: All coordinates use NORMALIZED (0-1) space for consistency
 * 
 * CAMERA CONFIGURATION:
 * - Sensor: Always 4:3 (0.75 portrait aspect ratio)
 * - Preview: Uses "cover" mode - fills view, center-crops overflow
 * - Zoom: Locked at 0 to prevent digital zoom artifacts
 * 
 * COORDINATE SPACES:
 * 1. PREVIEW SPACE: What the user sees on screen (may be cropped from sensor)
 * 2. SENSOR SPACE: Full captured image (always 4:3)
 * 3. NORMALIZED SPACE: 0-1 range relative to each space
 * 
 * MAPPING FLOW:
 * User draws frame → Preview normalized → Sensor normalized → Pixel coords → Crop
 * 
 * =============================================================================
 */

// Constants for camera configuration
const SENSOR_ASPECT_RATIO = 4 / 3; // Standard camera sensor (landscape)
const SENSOR_ASPECT_PORTRAIT = 3 / 4; // 0.75 in portrait mode
const CAMERA_RATIO = '4:3'; // Force 4:3 capture

// Handle types for edge adjustment
type HandleType = 'corner' | 'edge';
interface CropHandle {
  type: HandleType;
  index: number; // For corners: 0-3 (TL, TR, BR, BL), for edges: 0-3 (top, right, bottom, left)
  x: number;
  y: number;
}

type DocumentType = 'document' | 'id_card' | 'book' | 'whiteboard' | 'business_card';

interface DocTypeConfig {
  type: DocumentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  aspectRatio: number;       // Width/Height of frame (< 1 = portrait, > 1 = landscape)
  frameWidthRatio: number;   // Frame width as ratio of preview width (0-1)
  color: string;
  guide: string;
  scanBack?: boolean;        // Whether to prompt for back scan (e.g., ID cards)
}

// Document types with frame configurations
// aspectRatio: width/height of the alignment frame
// frameWidthRatio: how much of preview width the frame occupies
const DOCUMENT_TYPES: DocTypeConfig[] = [
  { type: 'document', label: 'Document', icon: 'document-text-outline', aspectRatio: 0.707, frameWidthRatio: 0.85, color: '#3B82F6', guide: 'Align document edges' },
  { type: 'id_card', label: 'ID Card', icon: 'card-outline', aspectRatio: 1.586, frameWidthRatio: 0.85, color: '#F59E0B', guide: 'Scan front of ID card', scanBack: true },
  { type: 'book', label: 'Book', icon: 'book-outline', aspectRatio: 1.6, frameWidthRatio: 0.95, color: '#10B981', guide: 'Align open book pages' }, // Landscape for two-page spread
  { type: 'whiteboard', label: 'Whiteboard', icon: 'easel-outline', aspectRatio: 1.5, frameWidthRatio: 0.95, color: '#8B5CF6', guide: 'Capture entire board' },
  { type: 'business_card', label: 'Business', icon: 'person-outline', aspectRatio: 1.75, frameWidthRatio: 0.75, color: '#EC4899', guide: 'Center business card' },
];

// Document Templates - Pre-defined crop areas for common document sizes
interface DocumentTemplate {
  id: string;
  name: string;
  aspectRatio: number; // width/height
  description: string;
  icon: string;
}

const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  { id: 'auto', name: 'Auto Detect', aspectRatio: 0, description: 'Automatic edge detection', icon: 'scan-outline' },
  { id: 'a4', name: 'A4', aspectRatio: 210/297, description: '210 × 297 mm', icon: 'document-outline' },
  { id: 'letter', name: 'US Letter', aspectRatio: 8.5/11, description: '8.5 × 11 in', icon: 'document-outline' },
  { id: 'legal', name: 'US Legal', aspectRatio: 8.5/14, description: '8.5 × 14 in', icon: 'document-outline' },
  { id: 'a5', name: 'A5', aspectRatio: 148/210, description: '148 × 210 mm', icon: 'document-outline' },
  { id: 'passport', name: 'Passport', aspectRatio: 88/125, description: '88 × 125 mm', icon: 'card-outline' },
  { id: 'credit_card', name: 'Credit Card', aspectRatio: 85.6/53.98, description: '85.6 × 54 mm', icon: 'card-outline' },
  { id: 'photo_4x6', name: 'Photo 4×6', aspectRatio: 4/6, description: '4 × 6 in', icon: 'image-outline' },
  { id: 'square', name: 'Square', aspectRatio: 1, description: '1:1 ratio', icon: 'square-outline' },
];

// Normalized coordinate point (0-1 range)
interface NormalizedPoint { x: number; y: number; }

// Pixel coordinate point
interface CropPoint { x: number; y: number; }

// Camera layout tracking with visibility calculations
interface CameraLayoutInfo {
  previewWidth: number;          // Preview view dimensions in pixels
  previewHeight: number;
  previewAspect: number;         // Width/Height ratio of preview
  sensorVisibleInPreview: {      // Which portion of sensor is visible
    offsetX: number;             // Normalized 0-1 offset from sensor left
    offsetY: number;             // Normalized 0-1 offset from sensor top
    visibleWidth: number;        // Normalized 0-1 visible width
    visibleHeight: number;       // Normalized 0-1 visible height
  };
}

// Logging helper for debugging
const logDebug = (tag: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString().substr(11, 12);
  if (data) {
    console.log(`[${timestamp}] 📷 ${tag}: ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] 📷 ${tag}: ${message}`);
  }
};

export default function ScannerScreen() {
  const params = useLocalSearchParams();
  const { token, isGuest, user, refreshUser } = useAuthStore();
  const { theme } = useThemeStore();
  const { currentDocument, createDocument, createDocumentLocalFirst, updateDocument, fetchDocument, fetchDocuments, syncPendingDocuments } = useDocumentStore();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<{ base64: string; original: string }[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [showCamera, setShowCamera] = useState(true);
  const insets = useSafeAreaInsets();
  
  // Batch/Continuous scanning mode
  const [batchMode, setBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  
  // Settings from AsyncStorage
  const [showGridOverlay, setShowGridOverlay] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Load settings and setup audio
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const gridSetting = await AsyncStorage.getItem('@scanup_show_grid');
        if (gridSetting !== null) {
          setShowGridOverlay(gridSetting === 'true');
        }
        const soundSetting = await AsyncStorage.getItem('@scanup_sound_enabled');
        if (soundSetting !== null) {
          setSoundEnabled(soundSetting !== 'false');
        }
      } catch (e) {
        console.log('Could not load scanner settings');
      }
    };
    
    // Setup audio mode
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
        });
      } catch (e) {
        console.log('Could not setup audio');
      }
    };
    
    loadSettings();
    setupAudio();
    
    // Cleanup sound on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);
  
  // Play shutter sound
  const playShutterSound = async () => {
    if (!soundEnabled) return;
    
    try {
      // Create a simple beep sound using a short audio snippet
      // Using a base64-encoded beep sound for portability
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://actions.google.com/sounds/v1/doors/wood_door_open.ogg' },
        { shouldPlay: true, volume: 0.5 }
      );
      soundRef.current = sound;
      
      // Unload after playing
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      // Silently fail if sound can't play
      console.log('Could not play shutter sound');
    }
  };
  
  // Document Template
  const [selectedTemplate, setSelectedTemplate] = useState<string>('auto');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Auto-capture state
  const [autoCapture, setAutoCapture] = useState(false);
  const [edgesDetected, setEdgesDetected] = useState(false);
  const [isScanning, setIsScanning] = useState(false); // For scanning animation
  const [detectedCorners, setDetectedCorners] = useState<NormalizedPoint[] | null>(null); // Real detected corners (normalized 0-1)
  const [autoDetectStable, setAutoDetectStable] = useState(0); // Counter for stable detection
  const autoDetectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectionRef = useRef<string>(''); // To track if detection changed
  
  // REAL-TIME edge detection state
  const [liveEdgeDetection, setLiveEdgeDetection] = useState(true); // Always on by default
  const [liveDetectedEdges, setLiveDetectedEdges] = useState<NormalizedPoint[] | null>(null);
  const liveDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const isDetectingRef = useRef(false); // Prevent overlapping detection calls
  
  const addToDocumentId = params.addToDocument as string | undefined;
  
  // Crop state - uses PIXEL coordinates for the crop screen
  const [showCropScreen, setShowCropScreen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropPoints, setCropPoints] = useState<CropPoint[]>([]);  // Pixel coords
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [activeEdgeIndex, setActiveEdgeIndex] = useState<number | null>(null); // For edge handles
  const [previewLayout, setPreviewLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  
  // Book mode: separate crop points for left and right pages
  const [bookLeftCropPoints, setBookLeftCropPoints] = useState<CropPoint[]>([]);
  const [bookRightCropPoints, setBookRightCropPoints] = useState<CropPoint[]>([]);
  const [activeBookPage, setActiveBookPage] = useState<'left' | 'right'>('left');
  
  // Camera layout for aspect ratio mapping
  const [cameraLayout, setCameraLayout] = useState<CameraLayoutInfo | null>(null);
  
  // Animation for capturing indicator
  const capturingOpacity = useRef(new Animated.Value(0)).current;
  const scanningAnim = useRef(new Animated.Value(0)).current;
  
  const cameraRef = useRef<CameraView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const currentType = DOCUMENT_TYPES[selectedTypeIndex];

  // Show/hide capturing indicator with animation
  useEffect(() => {
    if (isCapturing) {
      Animated.timing(capturingOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(capturingOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isCapturing]);

  // Scanning animation for auto-capture
  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanningAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanningAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanningAnim.setValue(0);
    }
  }, [isScanning]);

  // ============================================================================
  // REAL-TIME EDGE DETECTION SYSTEM
  // ============================================================================
  
  // Real-time edge detection - runs continuously when camera is visible
  const performLiveEdgeDetection = useCallback(async () => {
    // Skip if already detecting, not showing camera, or capturing
    if (isDetectingRef.current || !showCamera || isCapturing || !cameraRef.current) {
      return;
    }
    
    isDetectingRef.current = true;
    
    try {
      // Take a very low quality photo for fast edge detection
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.1, // Very low quality for speed
        base64: true,
        skipProcessing: true,
        exif: false,
      });
      
      if (!photo?.base64) {
        isDetectingRef.current = false;
        return;
      }
      
      // Call backend edge detection API
      const response = await fetch(`${BACKEND_URL}/api/images/detect-edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image_base64: photo.base64, 
          mode: currentType.type,
          fast_mode: true // Tell backend to use fast detection
        }),
      });
      
      if (!response.ok) {
        setLiveDetectedEdges(null);
        setEdgesDetected(false);
        isDetectingRef.current = false;
        return;
      }
      
      const result = await response.json();
      
      // Backend returns: { success, points, auto_detected, image_size }
      if (result.success && result.points && result.auto_detected) {
        // Document edges detected! Update the live overlay
        const newEdges = result.points.map((c: any) => ({ x: c.x, y: c.y }));
        setLiveDetectedEdges(newEdges);
        setEdgesDetected(true);
        
        // For auto-capture: check stability
        if (autoCapture) {
          const signature = result.points.map((c: any) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join('|');
          
          if (signature === lastDetectionRef.current) {
            setAutoDetectStable(prev => prev + 1);
          } else {
            setAutoDetectStable(1);
            lastDetectionRef.current = signature;
          }
          setDetectedCorners(newEdges);
        }
      } else {
        // No document detected
        setLiveDetectedEdges(null);
        setEdgesDetected(false);
        if (autoCapture) {
          setAutoDetectStable(0);
          setDetectedCorners(null);
          lastDetectionRef.current = '';
        }
      }
    } catch (error) {
      console.log('[LiveEdge] Detection error:', error);
      setLiveDetectedEdges(null);
      setEdgesDetected(false);
    } finally {
      isDetectingRef.current = false;
    }
  }, [showCamera, isCapturing, currentType.type, autoCapture]);

  // Start/stop real-time edge detection based on camera visibility
  useEffect(() => {
    if (showCamera && liveEdgeDetection && !showCropScreen) {
      // Start real-time detection loop - every 400ms for smooth updates
      console.log('[LiveEdge] Starting real-time edge detection...');
      
      // Initial detection
      setTimeout(() => performLiveEdgeDetection(), 500);
      
      // Continuous detection
      liveDetectionRef.current = setInterval(() => {
        performLiveEdgeDetection();
      }, 400); // 400ms = 2.5 fps - good balance between speed and performance
      
    } else {
      // Stop detection
      if (liveDetectionRef.current) {
        clearInterval(liveDetectionRef.current);
        liveDetectionRef.current = null;
      }
      setLiveDetectedEdges(null);
    }
    
    return () => {
      if (liveDetectionRef.current) {
        clearInterval(liveDetectionRef.current);
        liveDetectionRef.current = null;
      }
    };
  }, [showCamera, liveEdgeDetection, showCropScreen, performLiveEdgeDetection]);

  // Auto-capture when edges are detected AND stable for a few frames
  useEffect(() => {
    if (autoCapture && edgesDetected && autoDetectStable >= 3 && !isCapturing && showCamera && detectedCorners) {
      // Edges have been stable for 3 consecutive detections - auto capture!
      console.log('[AutoCapture] Edges stable, triggering capture...');
      takePicture();
    }
  }, [autoCapture, edgesDetected, autoDetectStable, isCapturing, showCamera, detectedCorners]);

  // Toggle auto-capture mode (uses the live edge detection)
  const toggleAutoCapture = useCallback(() => {
    setAutoCapture(prev => {
      const newState = !prev;
      
      if (newState) {
        // Starting auto-capture
        setIsScanning(true);
        setAutoDetectStable(0);
        lastDetectionRef.current = '';
      } else {
        // Stopping auto-capture
        setIsScanning(false);
        setAutoDetectStable(0);
        setDetectedCorners(null);
      }
      
      return newState;
    });
  }, []);

  // Toggle live edge detection on/off
  const toggleLiveEdgeDetection = useCallback(() => {
    setLiveEdgeDetection(prev => !prev);
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (autoDetectIntervalRef.current) {
        clearInterval(autoDetectIntervalRef.current);
      }
      if (liveDetectionRef.current) {
        clearInterval(liveDetectionRef.current);
      }
    };
  }, []);

  /**
   * Calculate edge midpoints for edge handles
   */
  const getEdgeMidpoints = useCallback((): CropPoint[] => {
    if (cropPoints.length !== 4) return [];
    
    return [
      // Top edge midpoint (between TL and TR)
      { x: (cropPoints[0].x + cropPoints[1].x) / 2, y: (cropPoints[0].y + cropPoints[1].y) / 2 },
      // Right edge midpoint (between TR and BR)
      { x: (cropPoints[1].x + cropPoints[2].x) / 2, y: (cropPoints[1].y + cropPoints[2].y) / 2 },
      // Bottom edge midpoint (between BR and BL)
      { x: (cropPoints[2].x + cropPoints[3].x) / 2, y: (cropPoints[2].y + cropPoints[3].y) / 2 },
      // Left edge midpoint (between BL and TL)
      { x: (cropPoints[3].x + cropPoints[0].x) / 2, y: (cropPoints[3].y + cropPoints[0].y) / 2 },
    ];
  }, [cropPoints]);

  /**
   * Calculate frame dimensions in SCREEN PIXELS for display
   * Returns the pixel size of the alignment frame overlay
   */
  const getFrameDimensions = useCallback(() => {
    const maxFrameWidth = SCREEN_WIDTH * currentType.frameWidthRatio - 40;
    const frameHeight = maxFrameWidth / currentType.aspectRatio;
    const maxHeight = SCREEN_HEIGHT * 0.40;
    
    if (frameHeight > maxHeight) {
      return { width: maxHeight * currentType.aspectRatio, height: maxHeight };
    }
    return { width: maxFrameWidth, height: frameHeight };
  }, [currentType]);

  const frameDimensions = getFrameDimensions();

  /**
   * Calculate the NORMALIZED (0-1) frame position within the preview
   * This is the key for accurate mapping to sensor coordinates
   */
  const getNormalizedFrameInPreview = useCallback((): { 
    left: number; top: number; right: number; bottom: number 
  } => {
    if (!cameraLayout || cameraLayout.previewWidth === 0) {
      // Default to centered 80% frame
      return { left: 0.1, top: 0.1, right: 0.9, bottom: 0.9 };
    }

    const frameWidthNorm = frameDimensions.width / cameraLayout.previewWidth;
    const frameHeightNorm = frameDimensions.height / cameraLayout.previewHeight;
    
    // Center the frame
    const left = (1 - frameWidthNorm) / 2;
    const top = (1 - frameHeightNorm) / 2;
    
    return {
      left,
      top,
      right: left + frameWidthNorm,
      bottom: top + frameHeightNorm,
    };
  }, [cameraLayout, frameDimensions]);

  /**
   * Track camera preview layout and calculate sensor visibility
   * This is called when the CameraView layout changes
   */
  const handleCameraLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const previewAspect = width / height;
    
    // Calculate which portion of the 4:3 sensor is visible in this preview
    // Using "cover" mode: preview fills the view, sensor is center-cropped
    const sensorAspect = SENSOR_ASPECT_PORTRAIT; // 0.75 for portrait
    
    let sensorVisible = {
      offsetX: 0,
      offsetY: 0,
      visibleWidth: 1,
      visibleHeight: 1,
    };
    
    if (sensorAspect > previewAspect) {
      // Sensor is WIDER than preview (unlikely in portrait)
      // Left/right edges of sensor are cropped
      const visibleRatio = previewAspect / sensorAspect;
      sensorVisible.visibleWidth = visibleRatio;
      sensorVisible.offsetX = (1 - visibleRatio) / 2;
    } else if (sensorAspect < previewAspect) {
      // Sensor is TALLER than preview (common case)
      // Top/bottom edges of sensor are cropped
      const visibleRatio = sensorAspect / previewAspect;
      sensorVisible.visibleHeight = visibleRatio;
      sensorVisible.offsetY = (1 - visibleRatio) / 2;
    }
    
    const layoutInfo: CameraLayoutInfo = {
      previewWidth: width,
      previewHeight: height,
      previewAspect,
      sensorVisibleInPreview: sensorVisible,
    };
    
    setCameraLayout(layoutInfo);
    
    logDebug('LAYOUT', 'Camera preview configured', {
      preview: `${width.toFixed(0)}x${height.toFixed(0)} (${previewAspect.toFixed(3)})`,
      sensorAspect: sensorAspect.toFixed(3),
      visibleSensor: sensorVisible,
    });
  }, []);

  // Coordinate conversion for crop screen (pixel-based for UI interaction)
  const scaleX = previewLayout.width > 0 ? previewLayout.width / imageSize.width : 1;
  const scaleY = previewLayout.height > 0 ? previewLayout.height / imageSize.height : 1;

  const toScreen = useCallback((point: CropPoint) => ({
    x: point.x * scaleX,
    y: point.y * scaleY,
  }), [scaleX, scaleY]);

  const toImage = useCallback((x: number, y: number) => ({
    x: Math.max(0, Math.min(imageSize.width, x / scaleX)),
    y: Math.max(0, Math.min(imageSize.height, y / scaleY)),
  }), [imageSize, scaleX, scaleY]);

  const handleTypeSelect = useCallback((index: number) => {
    setSelectedTypeIndex(index);
    if (scrollRef.current) {
      const itemWidth = 90;
      scrollRef.current.scrollTo({ x: Math.max(0, index * itemWidth - (SCREEN_WIDTH / 2 - itemWidth / 2)), animated: true });
    }
  }, []);

  /**
   * ==========================================================================
   * CRITICAL: Map frame from PREVIEW space to SENSOR space
   * ==========================================================================
   * 
   * This function converts the alignment frame overlay position to actual
   * pixel coordinates on the captured sensor image.
   * 
   * ALGORITHM:
   * 1. Get frame position as normalized coords (0-1) in preview
   * 2. Map from preview normalized to sensor normalized (accounting for crop)
   * 3. Convert sensor normalized to pixel coordinates
   * 
   * VISUAL EXAMPLE (phone in portrait, sensor taller than preview):
   * 
   *   SENSOR (4:3 = 0.75)          PREVIEW (phone ~0.46)
   *   ┌─────────────┐              ┌─────────────┐
   *   │             │              │             │
   *   │  (hidden)   │              │   FRAME     │
   *   │─────────────│ ─┐           │   ████████  │
   *   │             │  │           │   ████████  │
   *   │   VISIBLE   │  │ visible   │   ████████  │
   *   │   PORTION   │  │ in        │             │
   *   │             │  │ preview   │             │
   *   │─────────────│ ─┘           └─────────────┘
   *   │  (hidden)   │              
   *   │             │              
   *   └─────────────┘              
   * 
   * ==========================================================================
   */
  const mapFrameToSensorCoordinates = useCallback((
    sensorWidth: number,
    sensorHeight: number
  ): CropPoint[] => {
    const MARGIN_PX = 10; // Safety margin in pixels
    
    // Validate inputs
    if (sensorWidth <= 0 || sensorHeight <= 0) {
      logDebug('MAP', '❌ Invalid sensor dimensions', { sensorWidth, sensorHeight });
      return getDefaultCropPoints(sensorWidth || 1000, sensorHeight || 1000, MARGIN_PX);
    }
    
    // Check if camera layout is ready
    if (!cameraLayout || cameraLayout.previewWidth === 0) {
      logDebug('MAP', '⚠️ Camera layout not ready, using defaults');
      return getDefaultCropPoints(sensorWidth, sensorHeight, MARGIN_PX);
    }
    
    const sensorAspect = sensorWidth / sensorHeight;
    const expectedAspect = SENSOR_ASPECT_PORTRAIT;
    
    logDebug('MAP', 'Starting coordinate mapping', {
      sensor: `${sensorWidth}x${sensorHeight} (${sensorAspect.toFixed(3)})`,
      expected: expectedAspect.toFixed(3),
      preview: `${cameraLayout.previewWidth.toFixed(0)}x${cameraLayout.previewHeight.toFixed(0)}`,
    });
    
    // Warn if sensor aspect doesn't match expected 4:3
    if (Math.abs(sensorAspect - expectedAspect) > 0.15) {
      logDebug('MAP', `⚠️ Sensor aspect ${sensorAspect.toFixed(2)} differs from expected ${expectedAspect.toFixed(2)}`);
    }
    
    // STEP 1: Get frame position normalized in preview (0-1)
    const frameInPreview = getNormalizedFrameInPreview();
    
    logDebug('MAP', 'Frame in preview (normalized)', frameInPreview);
    
    // STEP 2: Map preview coordinates to sensor coordinates
    // Account for the fact that preview shows only part of sensor (cover mode)
    const sensorVisible = cameraLayout.sensorVisibleInPreview;
    
    // Convert frame corners from preview-normalized to sensor-normalized
    const mapPreviewToSensor = (previewNormX: number, previewNormY: number): NormalizedPoint => {
      // previewNormX is 0-1 within the preview
      // We need to map this to 0-1 within the full sensor
      
      // The visible portion of sensor starts at offsetX and has width visibleWidth
      const sensorX = sensorVisible.offsetX + (previewNormX * sensorVisible.visibleWidth);
      const sensorY = sensorVisible.offsetY + (previewNormY * sensorVisible.visibleHeight);
      
      return { x: sensorX, y: sensorY };
    };
    
    // Map all four corners
    const sensorNormTL = mapPreviewToSensor(frameInPreview.left, frameInPreview.top);
    const sensorNormTR = mapPreviewToSensor(frameInPreview.right, frameInPreview.top);
    const sensorNormBR = mapPreviewToSensor(frameInPreview.right, frameInPreview.bottom);
    const sensorNormBL = mapPreviewToSensor(frameInPreview.left, frameInPreview.bottom);
    
    logDebug('MAP', 'Frame in sensor (normalized)', {
      TL: sensorNormTL,
      TR: sensorNormTR,
      BR: sensorNormBR,
      BL: sensorNormBL,
    });
    
    // STEP 3: Convert normalized sensor coords to pixel coords
    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
    
    const corners: CropPoint[] = [
      { // Top-Left
        x: clamp(sensorNormTL.x * sensorWidth, MARGIN_PX, sensorWidth - MARGIN_PX),
        y: clamp(sensorNormTL.y * sensorHeight, MARGIN_PX, sensorHeight - MARGIN_PX),
      },
      { // Top-Right
        x: clamp(sensorNormTR.x * sensorWidth, MARGIN_PX, sensorWidth - MARGIN_PX),
        y: clamp(sensorNormTR.y * sensorHeight, MARGIN_PX, sensorHeight - MARGIN_PX),
      },
      { // Bottom-Right
        x: clamp(sensorNormBR.x * sensorWidth, MARGIN_PX, sensorWidth - MARGIN_PX),
        y: clamp(sensorNormBR.y * sensorHeight, MARGIN_PX, sensorHeight - MARGIN_PX),
      },
      { // Bottom-Left
        x: clamp(sensorNormBL.x * sensorWidth, MARGIN_PX, sensorWidth - MARGIN_PX),
        y: clamp(sensorNormBL.y * sensorHeight, MARGIN_PX, sensorHeight - MARGIN_PX),
      },
    ];
    
    logDebug('MAP', 'Final crop corners (pixels)', 
      corners.map((c, i) => `${['TL', 'TR', 'BR', 'BL'][i]}:(${c.x.toFixed(0)},${c.y.toFixed(0)})`).join(' ')
    );
    
    // Validate the corners form a reasonable quadrilateral
    const width = corners[1].x - corners[0].x;
    const height = corners[3].y - corners[0].y;
    
    if (width < 50 || height < 50) {
      logDebug('MAP', '⚠️ Crop area too small, using defaults', { width, height });
      return getDefaultCropPoints(sensorWidth, sensorHeight, MARGIN_PX);
    }
    
    return corners;
  }, [cameraLayout, getNormalizedFrameInPreview]);

  /**
   * Generate default crop points with padding
   */
  const getDefaultCropPoints = (width: number, height: number, margin: number): CropPoint[] => {
    const pad = 0.08; // 8% padding
    return [
      { x: width * pad, y: height * pad },
      { x: width * (1 - pad), y: height * pad },
      { x: width * (1 - pad), y: height * (1 - pad) },
      { x: width * pad, y: height * (1 - pad) },
    ];
  };

  // Auto-detect document edges using backend API
  const autoDetectEdges = async (imageBase64: string, mode: string, width: number, height: number) => {
    try {
      logDebug('EDGE_DETECT', `Auto-detecting edges for ${mode} mode...`);
      
      const response = await fetch(`${BACKEND_URL}/api/images/detect-edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageBase64,
          mode: mode,
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.points) {
        logDebug('EDGE_DETECT', '✅ Edges detected!', { pointCount: result.points.length });
        
        // Convert normalized points to pixel coordinates
        const detectedPoints = result.points.map((p: { x: number; y: number }) => ({
          x: p.x * width,
          y: p.y * height,
        }));
        
        setCropPoints(detectedPoints);
      } else {
        logDebug('EDGE_DETECT', '⚠️ No edges detected, using default frame', { message: result.message });
      }
    } catch (error) {
      logDebug('EDGE_DETECT', '❌ Edge detection failed', { error: String(error) });
      // Keep default crop points on error
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    // Check scan limits for free users before capturing
    if (!isGuest && user && !user.is_premium && !user.is_trial) {
      if ((user.scans_remaining_today ?? 0) <= 0) {
        Alert.alert(
          'Daily Scan Limit Reached',
          `You've used all ${10} scans for today. Upgrade to Premium for unlimited scanning.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Start Free Trial', 
              onPress: () => router.push('/(tabs)/profile'),
            },
          ]
        );
        return;
      }
    }
    
    setIsCapturing(true);
    
    // Play shutter sound
    playShutterSound();
    
    try {
      logDebug('CAPTURE', 'Starting HIGH QUALITY capture...');
      
      // Capture with MAXIMUM quality settings for professional document scanning
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 1.0,           // Maximum quality (no compression)
        base64: true,           // We need base64 for processing
        exif: true,             // Include EXIF for orientation
        skipProcessing: false,  // Let camera handle basic processing
        // Note: expo-camera automatically uses the highest available resolution
      });
      
      if (photo?.base64) {
        let capturedWidth = photo.width || 0;
        let capturedHeight = photo.height || 0;
        let imageBase64 = photo.base64;
        
        logDebug('CAPTURE', 'Photo captured - HIGH RES', {
          dimensions: `${capturedWidth}x${capturedHeight}`,
          megapixels: ((capturedWidth * capturedHeight) / 1000000).toFixed(1) + 'MP',
          aspect: (capturedWidth / capturedHeight).toFixed(3),
          hasExif: !!photo.exif,
          exifOrientation: photo.exif?.Orientation,
          base64Length: photo.base64.length,
        });
        
        // Fix for Android: If image is landscape but should be portrait, rotate it
        // This happens when Android cameras don't set EXIF orientation properly
        if (capturedWidth > capturedHeight) {
          logDebug('CAPTURE', 'Rotating landscape image to portrait (LOSSLESS)...');
          try {
            const manipulated = await ImageManipulator.manipulateAsync(
              `data:image/jpeg;base64,${photo.base64}`,
              [{ rotate: 90 }],  // Rotate 90° clockwise to correct Android camera orientation
              { 
                compress: 1.0,  // NO COMPRESSION - preserve full quality
                format: ImageManipulator.SaveFormat.JPEG, 
                base64: true 
              }
            );
            
            if (manipulated.base64) {
              imageBase64 = manipulated.base64;
              // Swap dimensions after rotation
              const temp = capturedWidth;
              capturedWidth = capturedHeight;
              capturedHeight = temp;
              
              logDebug('CAPTURE', 'Image rotated to portrait (lossless)', {
                newDimensions: `${capturedWidth}x${capturedHeight}`,
                newBase64Length: manipulated.base64.length,
              });
            }
          } catch (rotateError) {
            logDebug('CAPTURE', '⚠️ Rotation failed, using original', { error: String(rotateError) });
          }
        }
        
        // Verify image size (Image.getSize is more reliable)
        Image.getSize(`data:image/jpeg;base64,${imageBase64}`, (width, height) => {
          const verifiedAspect = width / height;
          
          logDebug('CAPTURE', 'Image size verified', {
            verified: `${width}x${height}`,
            aspect: verifiedAspect.toFixed(3),
          });
          
          setImageSize({ width, height });
          setCropImage(imageBase64);
          
          // Map frame overlay to sensor coordinates
          // For book mode, use 6 points; otherwise use 4 points
          if (currentType.type === 'book') {
            const pad = 0.05;
            // 6 points for book: TL, GT, TR, BR, GB, BL
            const bookCropPoints = [
              { x: width * pad, y: height * pad },           // 0: TL - Top Left
              { x: width * 0.5, y: height * pad },           // 1: GT - Gutter Top
              { x: width * (1 - pad), y: height * pad },     // 2: TR - Top Right
              { x: width * (1 - pad), y: height * (1 - pad) }, // 3: BR - Bottom Right
              { x: width * 0.5, y: height * (1 - pad) },     // 4: GB - Gutter Bottom
              { x: width * pad, y: height * (1 - pad) },     // 5: BL - Bottom Left
            ];
            setCropPoints(bookCropPoints);
            
            // Try auto-detect edges for book mode
            autoDetectEdges(imageBase64, 'book', width, height);
          } else {
            const frameCropPoints = mapFrameToSensorCoordinates(width, height);
            setCropPoints(frameCropPoints);
            
            // Try auto-detect edges for document mode
            autoDetectEdges(imageBase64, 'document', width, height);
          }
          
          setShowCropScreen(true);
          setShowCamera(false);
        }, (error) => {
          logDebug('CAPTURE', '❌ Image.getSize failed', { error: String(error) });
          
          // Fallback to captured dimensions
          setImageSize({ width: capturedWidth, height: capturedHeight });
          setCropImage(imageBase64);
          setCropPoints(mapFrameToSensorCoordinates(capturedWidth, capturedHeight));
          setShowCropScreen(true);
          setShowCamera(false);
        });
      } else {
        logDebug('CAPTURE', '❌ No base64 in photo response');
        Alert.alert('Error', 'Failed to capture image - no data returned');
      }
    } catch (error) {
      logDebug('CAPTURE', '❌ Capture error', { error: String(error) });
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleAddMore = () => setShowCamera(true);

  const handleCornerTouchStart = (index: number) => (e: GestureResponderEvent) => {
    e.stopPropagation();
    setActiveDragIndex(index);
  };

  const handleCornerTouchMove = (e: GestureResponderEvent) => {
    if (activeDragIndex === null && activeEdgeIndex === null) return;
    
    const touchX = e.nativeEvent.pageX - previewLayout.x;
    const touchY = e.nativeEvent.pageY - previewLayout.y;
    
    const clampedX = Math.max(0, Math.min(previewLayout.width, touchX));
    const clampedY = Math.max(0, Math.min(previewLayout.height, touchY));
    
    const newPoint = toImage(clampedX, clampedY);
    
    // Handle corner dragging
    if (activeDragIndex !== null) {
      setCropPoints(prev => {
        const updated = [...prev];
        updated[activeDragIndex] = newPoint;
        return updated;
      });
      return;
    }
    
    // Handle edge dragging - moves two adjacent corners
    if (activeEdgeIndex !== null) {
      setCropPoints(prev => {
        const updated = [...prev];
        
        switch (activeEdgeIndex) {
          case 0: // Top edge - move TL and TR vertically
            const topDeltaY = newPoint.y - (updated[0].y + updated[1].y) / 2;
            updated[0] = { ...updated[0], y: updated[0].y + topDeltaY };
            updated[1] = { ...updated[1], y: updated[1].y + topDeltaY };
            break;
          case 1: // Right edge - move TR and BR horizontally
            const rightDeltaX = newPoint.x - (updated[1].x + updated[2].x) / 2;
            updated[1] = { ...updated[1], x: updated[1].x + rightDeltaX };
            updated[2] = { ...updated[2], x: updated[2].x + rightDeltaX };
            break;
          case 2: // Bottom edge - move BR and BL vertically
            const bottomDeltaY = newPoint.y - (updated[2].y + updated[3].y) / 2;
            updated[2] = { ...updated[2], y: updated[2].y + bottomDeltaY };
            updated[3] = { ...updated[3], y: updated[3].y + bottomDeltaY };
            break;
          case 3: // Left edge - move BL and TL horizontally
            const leftDeltaX = newPoint.x - (updated[3].x + updated[0].x) / 2;
            updated[3] = { ...updated[3], x: updated[3].x + leftDeltaX };
            updated[0] = { ...updated[0], x: updated[0].x + leftDeltaX };
            break;
        }
        
        // Clamp all points to image bounds
        return updated.map(p => ({
          x: Math.max(10, Math.min(imageSize.width - 10, p.x)),
          y: Math.max(10, Math.min(imageSize.height - 10, p.y)),
        }));
      });
    }
  };

  const handleCornerTouchEnd = () => {
    setActiveDragIndex(null);
    setActiveEdgeIndex(null);
  };

  const handleApplyCrop = async () => {
    const isBookMode = currentType.type === 'book' && cropPoints.length === 6;
    const expectedPoints = isBookMode ? 6 : 4;
    
    if (!cropImage || cropPoints.length !== expectedPoints) {
      logDebug('CROP', 'Skipping crop - no image or invalid points');
      if (cropImage) {
        setCapturedImages(prev => [...prev, { base64: cropImage, original: cropImage }]);
      }
      setShowCropScreen(false);
      setCropImage(null);
      return;
    }

    setIsCapturing(true);
    try {
      // Normalize coordinates to 0-1 range for backend
      const normalizedPoints = cropPoints.map(p => ({
        x: p.x / imageSize.width,
        y: p.y / imageSize.height,
      }));

      logDebug('CROP', 'Sending to backend', {
        imageSize: `${imageSize.width}x${imageSize.height}`,
        pointCount: cropPoints.length,
        isBookMode,
        isGuest,
      });

      // BOOK MODE with 6-point perspective correction
      if (isBookMode) {
        const response = await fetch(`${BACKEND_URL}/api/images/book-6point-crop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image_base64: cropImage, 
            points: normalizedPoints, // 6 points: [TL, GT, TR, BR, GB, BL]
          }),
        });

        const result = await response.json();
        
        if (result.success && result.left_page_base64 && result.right_page_base64) {
          logDebug('CROP', '✅ Book 6-point crop successful');
          // Add both pages as separate captures (left = page 1, right = page 2)
          setCapturedImages(prev => [
            ...prev, 
            { base64: result.left_page_base64, original: cropImage },
            { base64: result.right_page_base64, original: cropImage },
          ]);
        } else {
          logDebug('CROP', '⚠️ Book 6-point crop failed', { message: result.message });
          // Fallback: Try the simpler split endpoint
          const fallbackResponse = await fetch(`${BACKEND_URL}/api/images/split-book-pages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              image_base64: cropImage, 
              corners: normalizedPoints.slice(0, 4), // Use outer 4 corners
              gutter_position: null,
            }),
          });
          const fallbackResult = await fallbackResponse.json();
          if (fallbackResult.success) {
            setCapturedImages(prev => [
              ...prev, 
              { base64: fallbackResult.left_page_base64, original: cropImage },
              { base64: fallbackResult.right_page_base64, original: cropImage },
            ]);
          } else {
            setCapturedImages(prev => [...prev, { base64: cropImage, original: cropImage }]);
          }
        }
      } else {
        // STANDARD MODE: Use perspective crop endpoint
        const endpoint = (isGuest || !token) 
          ? `${BACKEND_URL}/api/images/perspective-crop-public`
          : `${BACKEND_URL}/api/images/perspective-crop`;
        
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token && !isGuest) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Check if image appears to be portrait (height > width in crop points)
        const cropHeight = Math.abs(cropPoints[2].y - cropPoints[0].y);
        const cropWidth = Math.abs(cropPoints[1].x - cropPoints[0].x);
        const forcePortrait = cropHeight > cropWidth;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            image_base64: cropImage, 
            corners: normalizedPoints,
            force_portrait: forcePortrait 
          }),
        });

        const result = await response.json();
        
        if (result.success && result.cropped_image_base64) {
          logDebug('CROP', '✅ Backend crop successful', {
            originalSize: cropImage.length,
            croppedSize: result.cropped_image_base64.length,
          });
          setCapturedImages(prev => [...prev, { base64: result.cropped_image_base64, original: cropImage }]);
        } else {
          logDebug('CROP', '⚠️ Backend crop failed', { message: result.message });
          setCapturedImages(prev => [...prev, { base64: cropImage, original: cropImage }]);
        }
      }
      
      // Prompt for back scan if ID card mode
      if (currentType.scanBack && capturedImages.length === 0) {
        Alert.alert(
          'Scan Back Side?',
          'Would you like to scan the back of your ID card?',
          [
            { text: 'Skip', style: 'cancel', onPress: () => setShowCamera(false) },
            { text: 'Scan Back', onPress: () => {
              setShowCamera(true);
            }},
          ]
        );
      }
    } catch (e) {
      logDebug('CROP', '❌ Crop error', { error: String(e) });
      setCapturedImages(prev => [...prev, { base64: cropImage, original: cropImage }]);
    } finally {
      setShowCropScreen(false);
      setCropImage(null);
      setIsCapturing(false);
      
      // In batch mode, immediately return to camera for next scan
      if (batchMode) {
        setBatchCount(prev => prev + 1);
        setShowCamera(true);
      }
    }
  };

  const handleResetCrop = () => {
    if (currentType.type === 'book') {
      const pad = 0.05;
      const width = imageSize.width;
      const height = imageSize.height;
      setCropPoints([
        { x: width * pad, y: height * pad },
        { x: width * 0.5, y: height * pad },
        { x: width * (1 - pad), y: height * pad },
        { x: width * (1 - pad), y: height * (1 - pad) },
        { x: width * 0.5, y: height * (1 - pad) },
        { x: width * pad, y: height * (1 - pad) },
      ]);
    } else {
      const frameCropPoints = mapFrameToSensorCoordinates(imageSize.width, imageSize.height);
      setCropPoints(frameCropPoints);
    }
  };

  // Apply a document template to the crop points
  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowTemplateModal(false);
    
    const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId);
    if (!template || templateId === 'auto') {
      // Auto detect - trigger edge detection
      if (cropImage) {
        autoDetectEdges(cropImage, currentType.type === 'book' ? 'book' : 'document', imageSize.width, imageSize.height);
      }
      return;
    }
    
    const { width, height } = imageSize;
    const templateAspect = template.aspectRatio;
    
    // Calculate crop area that fits the template aspect ratio centered in the image
    let cropWidth: number, cropHeight: number;
    
    if (templateAspect < 1) {
      // Portrait template (e.g., A4)
      cropHeight = height * 0.85;
      cropWidth = cropHeight * templateAspect;
      if (cropWidth > width * 0.9) {
        cropWidth = width * 0.9;
        cropHeight = cropWidth / templateAspect;
      }
    } else {
      // Landscape template
      cropWidth = width * 0.85;
      cropHeight = cropWidth / templateAspect;
      if (cropHeight > height * 0.9) {
        cropHeight = height * 0.9;
        cropWidth = cropHeight * templateAspect;
      }
    }
    
    // Center the crop area
    const left = (width - cropWidth) / 2;
    const top = (height - cropHeight) / 2;
    
    setCropPoints([
      { x: left, y: top },                         // TL
      { x: left + cropWidth, y: top },             // TR
      { x: left + cropWidth, y: top + cropHeight }, // BR
      { x: left, y: top + cropHeight },            // BL
    ]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1.0,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      Image.getSize(`data:image/jpeg;base64,${asset.base64}`, (width, height) => {
        setImageSize({ width, height });
        setCropImage(asset.base64 || null);
        const pad = 0.05;
        setCropPoints([
          { x: width * pad, y: height * pad },
          { x: width * (1 - pad), y: height * pad },
          { x: width * (1 - pad), y: height * (1 - pad) },
          { x: width * pad, y: height * (1 - pad) },
        ]);
        setShowCropScreen(true);
        setShowCamera(false);
      });
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const saveDocument = async () => {
    if (capturedImages.length === 0) {
      Alert.alert('Error', 'Please capture at least one image');
      return;
    }

    setIsSaving(true);
    try {
      const newPages = capturedImages.map((img, index) => ({
        page_id: `page_${Date.now()}_${index}`,
        image_base64: img.base64,
        original_image_base64: img.original,
        filter_applied: 'original',
        rotation: 0,
        order: index,
        created_at: new Date().toISOString(),
      }));

      if (addToDocumentId) {
        // Adding pages to existing document
        const isLocalDoc = addToDocumentId.startsWith('local_');
        
        await fetchDocument(isLocalDoc ? null : token, addToDocumentId);
        const existingDoc = useDocumentStore.getState().currentDocument;
        
        if (existingDoc) {
          const existingPages = existingDoc.pages || [];
          const updatedPages = [
            ...existingPages, 
            ...newPages.map((p, i) => ({ ...p, order: existingPages.length + i }))
          ];
          
          await updateDocument(isLocalDoc ? null : token, addToDocumentId, { pages: updatedPages });
          await fetchDocuments(isLocalDoc ? null : token);
          
          Alert.alert('Success', `Added ${capturedImages.length} page(s)`, [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else {
          Alert.alert('Error', 'Could not find document to add pages to');
        }
      } else {
        // Format: ScanUp_YYYY-MM-DD_HH-MM
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '-'); // HH-MM
        const docName = `ScanUp_${dateStr}_${timeStr}`;

        if (isGuest) {
          // Guest users can still save documents - they just won't sync to cloud
          // Save using the document store which handles local storage for guests
          await createDocumentLocalFirst(null, { name: docName, pages: newPages, document_type: currentType.type });
          await fetchDocuments(null);
          Alert.alert('Document Saved', 'Your document has been saved locally. Sign in to sync across devices.', [
            { text: 'OK', onPress: () => router.back() },
            { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
          ]);
        } else if (token) {
          // Use local-first approach: save instantly, sync in background
          await createDocumentLocalFirst(token, { name: docName, pages: newPages, document_type: currentType.type });
          // No need to fetch - document is already in state!
          // Refresh user to update scan counts
          await refreshUser();
          Alert.alert('Success', 'Document saved!', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }
      }
    } catch (error: any) {
      console.error('Save error:', error);
      // Handle scan limit error from backend
      if (error?.message?.includes('scan limit') || error?.message?.includes('403')) {
        Alert.alert(
          'Scan Limit Reached',
          'You\'ve reached your scan limit. Upgrade to Premium for unlimited scanning.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Plans', onPress: () => router.push('/(tabs)/profile') },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to save document');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Crop overlay SVG - handles both 4-point (regular) and 6-point (book) modes
  const CropOverlay = useMemo(() => {
    const isBookMode = currentType.type === 'book' && cropPoints.length === 6;
    const expectedPoints = isBookMode ? 6 : 4;
    
    if (cropPoints.length !== expectedPoints || previewLayout.width === 0) return null;
    
    const screenPoints = cropPoints.map(p => toScreen(p));
    
    if (isBookMode) {
      // Book mode with 6 points: TL(0), GT(1), TR(2), BR(3), GB(4), BL(5)
      // Left page: TL -> GT -> GB -> BL
      // Right page: GT -> TR -> BR -> GB
      const leftPathD = `M ${screenPoints[0].x} ${screenPoints[0].y} L ${screenPoints[1].x} ${screenPoints[1].y} L ${screenPoints[4].x} ${screenPoints[4].y} L ${screenPoints[5].x} ${screenPoints[5].y} Z`;
      const rightPathD = `M ${screenPoints[1].x} ${screenPoints[1].y} L ${screenPoints[2].x} ${screenPoints[2].y} L ${screenPoints[3].x} ${screenPoints[3].y} L ${screenPoints[4].x} ${screenPoints[4].y} Z`;
      const fullPathD = `M ${screenPoints[0].x} ${screenPoints[0].y} L ${screenPoints[1].x} ${screenPoints[1].y} L ${screenPoints[2].x} ${screenPoints[2].y} L ${screenPoints[3].x} ${screenPoints[3].y} L ${screenPoints[4].x} ${screenPoints[4].y} L ${screenPoints[5].x} ${screenPoints[5].y} Z`;
      
      // Point labels for book mode
      const pointLabels = ['TL', 'GT', 'TR', 'BR', 'GB', 'BL'];
      
      return (
        <Svg width={previewLayout.width} height={previewLayout.height} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="cropMask">
              <Rect x="0" y="0" width={previewLayout.width} height={previewLayout.height} fill="white" />
              <Path d={fullPathD} fill="black" />
            </Mask>
          </Defs>
          <Rect x="0" y="0" width={previewLayout.width} height={previewLayout.height} fill="rgba(0,0,0,0.5)" mask="url(#cropMask)" />
          
          {/* Left page outline */}
          <Path d={leftPathD} stroke="#3B82F6" strokeWidth={2.5} fill="rgba(59,130,246,0.1)" />
          
          {/* Right page outline */}
          <Path d={rightPathD} stroke="#10B981" strokeWidth={2.5} fill="rgba(16,185,129,0.1)" />
          
          {/* Gutter line - connecting GT to GB */}
          <Line x1={screenPoints[1].x} y1={screenPoints[1].y} x2={screenPoints[4].x} y2={screenPoints[4].y}
            stroke="#F59E0B" strokeWidth={3} strokeDasharray="8,4" />
          
          {/* Page labels */}
          <SvgText x={(screenPoints[0].x + screenPoints[1].x) / 2} y={(screenPoints[0].y + screenPoints[5].y) / 2}
            fontSize={16} fontWeight="bold" fill="#3B82F6" textAnchor="middle">Page 1</SvgText>
          <SvgText x={(screenPoints[1].x + screenPoints[2].x) / 2} y={(screenPoints[2].y + screenPoints[1].y) / 2}
            fontSize={16} fontWeight="bold" fill="#10B981" textAnchor="middle">Page 2</SvgText>
          
          {/* All 6 corner handles with labels */}
          {screenPoints.map((p, i) => {
            const isGutterPoint = i === 1 || i === 4;
            const color = isGutterPoint ? '#F59E0B' : (i <= 1 || i === 5 ? '#3B82F6' : '#10B981');
            return (
              <React.Fragment key={`point-${i}`}>
                <Circle cx={p.x} cy={p.y} r={activeDragIndex === i ? 20 : 16} 
                  fill={color} stroke="#FFF" strokeWidth={3} />
                <SvgText x={p.x} y={p.y + 4} fontSize={10} fontWeight="bold" fill="#FFF" textAnchor="middle">
                  {pointLabels[i]}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      );
    }
    
    // Standard 4-point mode
    const edgeMidpoints = getEdgeMidpoints().map(p => toScreen(p));
    const pathD = `M ${screenPoints[0].x} ${screenPoints[0].y} L ${screenPoints[1].x} ${screenPoints[1].y} L ${screenPoints[2].x} ${screenPoints[2].y} L ${screenPoints[3].x} ${screenPoints[3].y} Z`;

    return (
      <Svg width={previewLayout.width} height={previewLayout.height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="cropMask">
            <Rect x="0" y="0" width={previewLayout.width} height={previewLayout.height} fill="white" />
            <Path d={pathD} fill="black" />
          </Mask>
        </Defs>
        <Rect x="0" y="0" width={previewLayout.width} height={previewLayout.height} fill="rgba(0,0,0,0.6)" mask="url(#cropMask)" />
        <Path d={pathD} stroke={currentType.color} strokeWidth={2} fill="transparent" />
        
        {/* Grid lines */}
        {[0.33, 0.66].map((r, i) => (
          <React.Fragment key={i}>
            <Line 
              x1={screenPoints[0].x + (screenPoints[1].x - screenPoints[0].x) * r} 
              y1={screenPoints[0].y + (screenPoints[1].y - screenPoints[0].y) * r}
              x2={screenPoints[3].x + (screenPoints[2].x - screenPoints[3].x) * r} 
              y2={screenPoints[3].y + (screenPoints[2].y - screenPoints[3].y) * r}
              stroke={currentType.color + '40'} strokeWidth={1} 
            />
            <Line 
              x1={screenPoints[0].x + (screenPoints[3].x - screenPoints[0].x) * r} 
              y1={screenPoints[0].y + (screenPoints[3].y - screenPoints[0].y) * r}
              x2={screenPoints[1].x + (screenPoints[2].x - screenPoints[1].x) * r} 
              y2={screenPoints[1].y + (screenPoints[2].y - screenPoints[1].y) * r}
              stroke={currentType.color + '40'} strokeWidth={1} 
            />
          </React.Fragment>
        ))}
        
        {/* Corner handles */}
        {screenPoints.map((p, i) => (
          <Circle key={`corner-${i}`} cx={p.x} cy={p.y} r={activeDragIndex === i ? 18 : 14} 
            fill={currentType.color} stroke="#FFF" strokeWidth={3} />
        ))}
        
        {/* Edge handles (rectangles for horizontal/vertical indication) */}
        {edgeMidpoints.map((p, i) => {
          const isHorizontal = i === 0 || i === 2; // Top and bottom are horizontal
          const width = isHorizontal ? 30 : 10;
          const height = isHorizontal ? 10 : 30;
          return (
            <Rect 
              key={`edge-${i}`} 
              x={p.x - width/2} 
              y={p.y - height/2} 
              width={width} 
              height={height}
              rx={5}
              fill={activeEdgeIndex === i ? currentType.color : '#FFF'}
              stroke={currentType.color}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
    );
  }, [cropPoints, previewLayout, currentType.color, activeDragIndex, activeEdgeIndex, toScreen, getEdgeMidpoints]);

  // Magnifier - shows for both corner and edge dragging
  const Magnifier = useMemo(() => {
    const dragActive = activeDragIndex !== null || activeEdgeIndex !== null;
    if (!dragActive || !cropImage || previewLayout.width === 0) return null;
    
    // Get the point being dragged
    let point: CropPoint;
    let label: string;
    
    if (activeDragIndex !== null) {
      point = cropPoints[activeDragIndex];
      label = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left'][activeDragIndex];
    } else {
      const edgeMidpoints = getEdgeMidpoints();
      point = edgeMidpoints[activeEdgeIndex!];
      label = ['Top Edge', 'Right Edge', 'Bottom Edge', 'Left Edge'][activeEdgeIndex!];
    }
    
    const screenPoint = toScreen(point);
    const size = 110;
    const zoom = 2.5;
    
    const left = screenPoint.x > previewLayout.width / 2 ? 10 : previewLayout.width - size - 10;
    const top = screenPoint.y > previewLayout.height / 2 ? 10 : previewLayout.height - size - 10;

    return (
      <View style={[styles.magnifier, { width: size, height: size, left, top, borderColor: currentType.color }]}>
        <View style={styles.magnifierInner}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${cropImage}` }}
            style={{
              width: previewLayout.width * zoom,
              height: previewLayout.height * zoom,
              position: 'absolute',
              left: -screenPoint.x * zoom + size / 2,
              top: -screenPoint.y * zoom + size / 2,
            }}
            resizeMode="cover"
          />
        </View>
        <View style={[styles.crosshairH, { backgroundColor: currentType.color }]} />
        <View style={[styles.crosshairV, { backgroundColor: currentType.color }]} />
        <Text style={styles.magnifierLabel}>{label}</Text>
      </View>
    );
  }, [activeDragIndex, activeEdgeIndex, cropPoints, cropImage, previewLayout, toScreen, currentType.color, getEdgeMidpoints]);

  // Document guide overlay - includes grid, book mode center line
  const DocumentGuide = useMemo(() => {
    const { width, height } = frameDimensions;
    return (
      <Svg width={width} height={height} style={styles.guideSvg}>
        <Rect x={3} y={3} width={width - 6} height={height - 6} 
          rx={currentType.type === 'id_card' ? 12 : 6}
          stroke={currentType.color} strokeWidth={3} strokeDasharray="10,5" fill="transparent" />
        
        {/* Grid lines - 3x3 rule of thirds */}
        {currentType.type !== 'book' && (
          <>
            {/* Vertical grid lines */}
            <Line x1={width / 3} y1={6} x2={width / 3} y2={height - 6} 
              stroke={currentType.color + '50'} strokeWidth={1} />
            <Line x1={(width * 2) / 3} y1={6} x2={(width * 2) / 3} y2={height - 6} 
              stroke={currentType.color + '50'} strokeWidth={1} />
            
            {/* Horizontal grid lines */}
            <Line x1={6} y1={height / 3} x2={width - 6} y2={height / 3} 
              stroke={currentType.color + '50'} strokeWidth={1} />
            <Line x1={6} y1={(height * 2) / 3} x2={width - 6} y2={(height * 2) / 3} 
              stroke={currentType.color + '50'} strokeWidth={1} />
          </>
        )}
        
        {/* ID Card guide */}
        {currentType.type === 'id_card' && (
          <>
            <Rect x={width * 0.06} y={height * 0.15} width={width * 0.28} height={height * 0.7}
              rx={4} stroke={currentType.color + '60'} strokeWidth={1.5} strokeDasharray="4,4" fill={currentType.color + '08'} />
            {[0.2, 0.35, 0.5, 0.65].map((y, i) => (
              <Line key={i} x1={width * 0.4} y1={height * y} x2={width * 0.9} y2={height * y}
                stroke={currentType.color + '40'} strokeWidth={2} strokeLinecap="round" />
            ))}
          </>
        )}
        
        {/* Book mode - split frame for two-page alignment */}
        {currentType.type === 'book' && (
          <>
            {/* Vertical center line (book spine/gutter) - prominent */}
            <Line x1={width / 2} y1={6} x2={width / 2} y2={height - 6} 
              stroke={currentType.color} strokeWidth={3} strokeDasharray="12,6" />
            
            {/* Left page box */}
            <Rect x={10} y={10} width={(width / 2) - 18} height={height - 20}
              rx={4} stroke={currentType.color + '50'} strokeWidth={1.5} strokeDasharray="6,4" fill="transparent" />
            
            {/* Right page box */}
            <Rect x={(width / 2) + 8} y={10} width={(width / 2) - 18} height={height - 20}
              rx={4} stroke={currentType.color + '50'} strokeWidth={1.5} strokeDasharray="6,4" fill="transparent" />
            
            {/* Page number labels */}
            <SvgText x={width * 0.25} y={height - 20} 
              fontSize={14} fontWeight="bold" fill={currentType.color} 
              textAnchor="middle">1</SvgText>
            <SvgText x={width * 0.75} y={height - 20} 
              fontSize={14} fontWeight="bold" fill={currentType.color} 
              textAnchor="middle">2</SvgText>
              
            {/* Page indicators at top */}
            <SvgText x={width * 0.25} y={26} 
              fontSize={10} fill={currentType.color + '90'} 
              textAnchor="middle">Left Page</SvgText>
            <SvgText x={width * 0.75} y={26} 
              fontSize={10} fill={currentType.color + '90'} 
              textAnchor="middle">Right Page</SvgText>
          </>
        )}
      </Svg>
    );
  }, [frameDimensions, currentType]);

  // Permission handling
  if (!permission) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={60} color={theme.primary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>Camera Permission Required</Text>
          <Button title="Grant Permission" onPress={requestPermission} style={{ marginTop: 20, width: '100%' }} />
          <Button title="Go Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: 12, width: '100%' }} />
        </View>
      </SafeAreaView>
    );
  }

  // Crop screen
  if (showCropScreen && cropImage) {
    const maxW = SCREEN_WIDTH - 40;
    const maxH = SCREEN_HEIGHT * 0.55;
    const imgAspect = imageSize.width / imageSize.height;
    let previewW, previewH;
    if (imgAspect > maxW / maxH) {
      previewW = maxW;
      previewH = maxW / imgAspect;
    } else {
      previewH = maxH;
      previewW = maxH * imgAspect;
    }

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top', 'bottom']}>
        <View style={styles.cropHeader}>
          <TouchableOpacity onPress={() => { setShowCropScreen(false); setCropImage(null); }}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.cropTitle}>Adjust Crop</Text>
          <TouchableOpacity onPress={handleResetCrop}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.cropImageContainer}>
          <View 
            style={{ width: previewW, height: previewH, position: 'relative' }}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              e.target.measure((fx, fy, w, h, px, py) => {
                setPreviewLayout({ width: w, height: h, x: px, y: py });
              });
            }}
            onTouchMove={handleCornerTouchMove}
            onTouchEnd={handleCornerTouchEnd}
          >
            <Image
              source={{ uri: `data:image/jpeg;base64,${cropImage}` }}
              style={{ width: previewW, height: previewH, borderRadius: 8 }}
              resizeMode="cover"
            />
            {CropOverlay}
            
            {/* Corner touch areas */}
            {cropPoints.map((point, index) => {
              const sp = toScreen(point);
              return (
                <View
                  key={`corner-${index}`}
                  style={{ position: 'absolute', left: sp.x - 30, top: sp.y - 30, width: 60, height: 60, zIndex: 100 }}
                  onTouchStart={handleCornerTouchStart(index)}
                />
              );
            })}
            
            {/* Edge touch areas */}
            {getEdgeMidpoints().map((point, index) => {
              const sp = toScreen(point);
              const isHorizontal = index === 0 || index === 2;
              const touchW = isHorizontal ? 80 : 40;
              const touchH = isHorizontal ? 40 : 80;
              return (
                <View
                  key={`edge-${index}`}
                  style={{ 
                    position: 'absolute', 
                    left: sp.x - touchW / 2, 
                    top: sp.y - touchH / 2, 
                    width: touchW, 
                    height: touchH, 
                    zIndex: 90 
                  }}
                  onTouchStart={() => setActiveEdgeIndex(index)}
                />
              );
            })}
            
            {Magnifier}
          </View>
        </View>

        <Text style={styles.cropHint}>
          {currentType.type === 'book' 
            ? 'Drag 6 points: 4 corners + 2 gutter points. Each page gets separate perspective correction.' 
            : 'Drag corners or edges to adjust crop area'}
        </Text>

        {/* Quick action buttons */}
        <View style={styles.cropQuickActions}>
          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.surface }]} 
            onPress={() => autoDetectEdges(cropImage!, currentType.type === 'book' ? 'book' : 'document', imageSize.width, imageSize.height)}
          >
            <Ionicons name="scan" size={18} color={currentType.color} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Auto Detect</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.surface }]} 
            onPress={() => setShowTemplateModal(true)}
          >
            <Ionicons name="grid-outline" size={18} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Template</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: theme.surface }]} 
            onPress={handleResetCrop}
          >
            <Ionicons name="refresh" size={18} color={theme.text} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cropActions}>
          <TouchableOpacity 
            style={[styles.cropBtn, { backgroundColor: currentType.color }]} 
            onPress={handleApplyCrop} 
            disabled={isCapturing}
          >
            {isCapturing ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name={currentType.type === 'book' ? 'layers' : 'checkmark'} size={22} color="#FFF" />
                <Text style={styles.cropBtnText}>
                  {currentType.type === 'book' ? 'Split & Save Pages' : 'Save & Crop'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Template Selection Modal */}
        {showTemplateModal && (
          <TouchableOpacity 
            style={styles.templateModalOverlay}
            activeOpacity={1}
            onPress={() => setShowTemplateModal(false)}
          >
            <View style={[styles.templateModalContent, { backgroundColor: theme.surface }]}>
              <Text style={[styles.templateModalTitle, { color: theme.text }]}>Select Document Template</Text>
              <ScrollView style={styles.templateList} showsVerticalScrollIndicator={false}>
                {DOCUMENT_TEMPLATES.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.templateItem,
                      selectedTemplate === template.id && { backgroundColor: theme.primary + '15', borderColor: theme.primary },
                    ]}
                    onPress={() => applyTemplate(template.id)}
                  >
                    <Ionicons name={template.icon as any} size={24} color={selectedTemplate === template.id ? theme.primary : theme.text} />
                    <View style={styles.templateItemText}>
                      <Text style={[styles.templateName, { color: theme.text }]}>{template.name}</Text>
                      <Text style={[styles.templateDesc, { color: theme.textMuted }]}>{template.description}</Text>
                    </View>
                    {selectedTemplate === template.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // Preview mode
  if (capturedImages.length > 0 && !showCropScreen && !showCamera) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.previewHeader}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.surface }]} onPress={() => setCapturedImages([])}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.previewTitle, { color: theme.text }]}>
            {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
          </Text>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.primary }]} onPress={handleAddMore}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewContent}>
          {capturedImages.map((img, index) => (
            <View key={index} style={styles.previewImageWrapper}>
              <Image source={{ uri: `data:image/jpeg;base64,${img.base64}` }} 
                style={[styles.previewImage, { backgroundColor: theme.surface }]} resizeMode="contain" />
              <TouchableOpacity style={[styles.removeBtn, { backgroundColor: theme.background }]} onPress={() => removeImage(index)}>
                <Ionicons name="close-circle" size={28} color={theme.danger} />
              </TouchableOpacity>
              <View style={styles.pageNum}><Text style={styles.pageNumText}>Page {index + 1}</Text></View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.previewActions}>
          <Button title="Add More" variant="outline" onPress={handleAddMore} style={{ flex: 1 }} 
            icon={<Ionicons name="add-circle" size={20} color={theme.primary} />} />
          <Button title={addToDocumentId ? "Add to Document" : "Save Document"} onPress={saveDocument} 
            loading={isSaving} style={{ flex: 1.5 }} icon={<Ionicons name="checkmark" size={20} color="#FFF" />} />
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView 
        ref={cameraRef} 
        style={styles.camera} 
        facing="back" 
        flash={flashMode}
        zoom={0}
        onLayout={handleCameraLayout}
      >
        <View style={styles.cameraOverlay}>
          {/* Top Bar - with manual safe area padding */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => router.back()}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={[styles.typeIndicator, { backgroundColor: currentType.color + '30' }]}>
              <Ionicons name={currentType.icon} size={16} color={currentType.color} />
              <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
            </View>
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => setFlashMode(f => f === 'off' ? 'on' : 'off')}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name={flashMode === 'off' ? 'flash-off' : 'flash'} size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.frameContainer}>
            {/* REAL-TIME EDGE DETECTION OVERLAY */}
            {liveDetectedEdges && liveDetectedEdges.length === 4 && (
              <Svg
                style={StyleSheet.absoluteFill}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
              >
                {/* Semi-transparent overlay outside detected area */}
                <Defs>
                  <Mask id="edgeMask">
                    <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
                    <Path
                      d={`M ${liveDetectedEdges[0].x * SCREEN_WIDTH} ${liveDetectedEdges[0].y * SCREEN_HEIGHT}
                          L ${liveDetectedEdges[1].x * SCREEN_WIDTH} ${liveDetectedEdges[1].y * SCREEN_HEIGHT}
                          L ${liveDetectedEdges[2].x * SCREEN_WIDTH} ${liveDetectedEdges[2].y * SCREEN_HEIGHT}
                          L ${liveDetectedEdges[3].x * SCREEN_WIDTH} ${liveDetectedEdges[3].y * SCREEN_HEIGHT}
                          Z`}
                      fill="black"
                    />
                  </Mask>
                </Defs>
                
                {/* Dark overlay outside document */}
                <Rect
                  x="0"
                  y="0"
                  width={SCREEN_WIDTH}
                  height={SCREEN_HEIGHT}
                  fill="rgba(0,0,0,0.4)"
                  mask="url(#edgeMask)"
                />
                
                {/* Edge lines - animated glowing effect */}
                <Path
                  d={`M ${liveDetectedEdges[0].x * SCREEN_WIDTH} ${liveDetectedEdges[0].y * SCREEN_HEIGHT}
                      L ${liveDetectedEdges[1].x * SCREEN_WIDTH} ${liveDetectedEdges[1].y * SCREEN_HEIGHT}
                      L ${liveDetectedEdges[2].x * SCREEN_WIDTH} ${liveDetectedEdges[2].y * SCREEN_HEIGHT}
                      L ${liveDetectedEdges[3].x * SCREEN_WIDTH} ${liveDetectedEdges[3].y * SCREEN_HEIGHT}
                      Z`}
                  stroke={edgesDetected ? "#10B981" : "#3B82F6"}
                  strokeWidth={3}
                  fill="transparent"
                  strokeLinejoin="round"
                />
                
                {/* Glow effect */}
                <Path
                  d={`M ${liveDetectedEdges[0].x * SCREEN_WIDTH} ${liveDetectedEdges[0].y * SCREEN_HEIGHT}
                      L ${liveDetectedEdges[1].x * SCREEN_WIDTH} ${liveDetectedEdges[1].y * SCREEN_HEIGHT}
                      L ${liveDetectedEdges[2].x * SCREEN_WIDTH} ${liveDetectedEdges[2].y * SCREEN_HEIGHT}
                      L ${liveDetectedEdges[3].x * SCREEN_WIDTH} ${liveDetectedEdges[3].y * SCREEN_HEIGHT}
                      Z`}
                  stroke={edgesDetected ? "rgba(16,185,129,0.5)" : "rgba(59,130,246,0.5)"}
                  strokeWidth={8}
                  fill="transparent"
                  strokeLinejoin="round"
                />
                
                {/* Corner circles */}
                {liveDetectedEdges.map((corner, index) => (
                  <React.Fragment key={index}>
                    {/* Outer glow */}
                    <Circle
                      cx={corner.x * SCREEN_WIDTH}
                      cy={corner.y * SCREEN_HEIGHT}
                      r={16}
                      fill={edgesDetected ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)"}
                    />
                    {/* Inner circle */}
                    <Circle
                      cx={corner.x * SCREEN_WIDTH}
                      cy={corner.y * SCREEN_HEIGHT}
                      r={8}
                      fill={edgesDetected ? "#10B981" : "#3B82F6"}
                      stroke="#FFF"
                      strokeWidth={2}
                    />
                  </React.Fragment>
                ))}
              </Svg>
            )}
            
            {/* Original document frame - only shown when no edges detected */}
            {!liveDetectedEdges && (
              <View style={[styles.docFrame, { width: frameDimensions.width, height: frameDimensions.height }]}>
                {showGridOverlay && DocumentGuide}
                <View style={[styles.corner, styles.tl, { borderColor: currentType.color }]} />
                <View style={[styles.corner, styles.tr, { borderColor: currentType.color }]} />
                <View style={[styles.corner, styles.bl, { borderColor: currentType.color }]} />
                <View style={[styles.corner, styles.br, { borderColor: currentType.color }]} />
              </View>
            )}
            
            <Text style={[styles.guideText, { color: liveDetectedEdges ? '#10B981' : currentType.color }]}>
              {liveDetectedEdges ? 'Document detected! Tap to capture' : currentType.guide}
            </Text>
          </View>

          {/* Capturing Progress Indicator */}
          <Animated.View 
            style={[
              styles.capturingIndicator, 
              { opacity: capturingOpacity }
            ]}
            pointerEvents="none"
          >
            <View style={styles.capturingContent}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.capturingText}>Capturing...</Text>
              <Text style={styles.capturingSubtext}>Please wait</Text>
            </View>
          </Animated.View>

          {/* Scanning Animation Overlay - positioned INSIDE the document frame */}
          {isScanning && (
            <Animated.View 
              style={[
                styles.scanningOverlay,
                {
                  // Position at the top of the document frame and animate downward within it
                  top: (SCREEN_HEIGHT * 0.5) - (frameDimensions.height / 2) - 50, // Adjust to align with frame top
                  left: (SCREEN_WIDTH - frameDimensions.width) / 2,
                  width: frameDimensions.width,
                  opacity: scanningAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.8, 0.3],
                  }),
                  transform: [{
                    translateY: scanningAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, frameDimensions.height - 6], // Stay within frame bounds
                    }),
                  }],
                },
              ]}
              pointerEvents="none"
            >
              <View style={[styles.scanLine, { backgroundColor: currentType.color }]} />
            </Animated.View>
          )}

          {/* Live Edge Detection Status Indicator */}
          {liveEdgeDetection && (
            <View style={styles.autoDetectStatus}>
              <View style={[styles.autoDetectIndicator, { backgroundColor: liveDetectedEdges ? '#10B981' : '#6366F1' }]}>
                <Ionicons 
                  name={liveDetectedEdges ? 'scan' : 'scan-outline'} 
                  size={16} 
                  color="#FFF" 
                />
                <Text style={styles.autoDetectText}>
                  {liveDetectedEdges 
                    ? (autoCapture ? `Auto-capture ${autoDetectStable}/3` : 'Document detected!')
                    : 'Detecting edges...'}
                </Text>
              </View>
              {/* Toggle live detection */}
              <TouchableOpacity 
                style={[styles.liveToggleBtn, { backgroundColor: liveEdgeDetection ? '#10B981' : '#64748B' }]}
                onPress={toggleLiveEdgeDetection}
              >
                <Ionicons name={liveEdgeDetection ? 'eye' : 'eye-off'} size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Show toggle if live detection is OFF */}
          {!liveEdgeDetection && (
            <View style={styles.autoDetectStatus}>
              <TouchableOpacity 
                style={[styles.autoDetectIndicator, { backgroundColor: '#64748B' }]}
                onPress={toggleLiveEdgeDetection}
              >
                <Ionicons name="eye-off" size={16} color="#FFF" />
                <Text style={styles.autoDetectText}>Tap to enable edge detection</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSection}>
            <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.typeSelector} snapToInterval={90} decelerationRate="fast">
              {DOCUMENT_TYPES.map((type, idx) => (
                <TouchableOpacity key={type.type} 
                  style={[styles.typeBtn, selectedTypeIndex === idx && { backgroundColor: type.color + '30', borderColor: type.color, borderWidth: 2 }]}
                  onPress={() => handleTypeSelect(idx)}>
                  <View style={[styles.typeIcon, { backgroundColor: selectedTypeIndex === idx ? type.color + '40' : 'rgba(255,255,255,0.1)' }]}>
                    <Ionicons name={type.icon} size={22} color={selectedTypeIndex === idx ? type.color : '#94A3B8'} />
                  </View>
                  <Text style={[styles.typeLabel, { color: selectedTypeIndex === idx ? type.color : '#94A3B8' }]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Scan limit indicator for free users */}
            {!isGuest && user && !user.is_premium && !user.is_trial && (
              <View style={styles.scanLimitIndicator}>
                <Ionicons name="scan-outline" size={14} color={(user.scans_remaining_today ?? 10) <= 2 ? '#F59E0B' : '#94A3B8'} />
                <Text style={[styles.scanLimitText, (user.scans_remaining_today ?? 10) <= 2 && styles.scanLimitWarning]}>
                  {user.scans_remaining_today ?? 10} scans left today
                </Text>
              </View>
            )}

            <View style={styles.captureBar}>
              {/* Gallery Button */}
              <TouchableOpacity style={styles.sideBtn} onPress={pickImage}>
                <View style={styles.sideBtnInner}><Ionicons name="images" size={22} color="#FFF" /></View>
                <Text style={styles.sideBtnText}>Gallery</Text>
              </TouchableOpacity>

              {/* Capture Button - shows auto-capture ring when enabled */}
              <View style={styles.captureContainer}>
                <TouchableOpacity style={[styles.captureBtn, { borderColor: currentType.color }, autoCapture && styles.autoCaptureActive]} onPress={takePicture} disabled={isCapturing}>
                  {isCapturing ? <ActivityIndicator color={currentType.color} /> : <View style={[styles.captureInner, { backgroundColor: currentType.color }]} />}
                </TouchableOpacity>
                {/* Auto-capture indicator */}
                {autoCapture && edgesDetected && (
                  <View style={[styles.autoCaptureRing, { borderColor: '#10B981' }]} />
                )}
              </View>

              {/* Auto-Capture Toggle */}
              <TouchableOpacity style={styles.sideBtn} onPress={toggleAutoCapture}>
                <View style={[styles.sideBtnInner, autoCapture && { backgroundColor: '#10B981' + '40' }]}>
                  <Ionicons name={autoCapture ? 'scan' : 'scan-outline'} size={22} color={autoCapture ? '#10B981' : '#FFF'} />
                </View>
                <Text style={[styles.sideBtnText, autoCapture && { color: '#10B981' }]}>
                  {autoCapture ? 'Auto ON' : 'Auto'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Batch Mode Toggle + View Pages */}
            <View style={styles.modeToggleRow}>
              <TouchableOpacity 
                style={[styles.modeToggleBtn, batchMode && { backgroundColor: '#8B5CF6' + '30', borderColor: '#8B5CF6' }]} 
                onPress={() => {
                  setBatchMode(!batchMode);
                  if (!batchMode) {
                    setBatchCount(0);
                  }
                }}
              >
                <Ionicons name="layers-outline" size={18} color={batchMode ? '#8B5CF6' : '#94A3B8'} />
                <Text style={[styles.modeToggleText, batchMode && { color: '#8B5CF6' }]}>
                  {batchMode ? `Batch Mode (${batchCount})` : 'Batch Mode'}
                </Text>
              </TouchableOpacity>

              {/* View pages button when there are captured images */}
              {capturedImages.length > 0 && (
                <TouchableOpacity 
                  style={[styles.viewPagesBtn, { backgroundColor: currentType.color }]} 
                  onPress={() => setShowCamera(false)}
                >
                  <Ionicons name="layers" size={18} color="#FFF" />
                  <Text style={styles.viewPagesBtnText}>{capturedImages.length} Page{capturedImages.length > 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Bottom safe area spacer */}
            <View style={{ height: insets.bottom + 8 }} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  typeIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  typeText: { fontSize: 14, fontWeight: '600' },
  frameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  docFrame: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  guideSvg: { position: 'absolute' },
  corner: { position: 'absolute', width: 30, height: 30, borderWidth: 4 },
  tl: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 6 },
  guideText: { marginTop: 16, fontSize: 14, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  // Capturing indicator styles
  capturingIndicator: { 
    position: 'absolute', 
    right: 20, 
    top: '40%',
    backgroundColor: 'rgba(0,0,0,0.75)', 
    paddingVertical: 16, 
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  capturingContent: {
    alignItems: 'center',
    gap: 6,
  },
  capturingText: { 
    color: '#FFF', 
    fontSize: 13, 
    fontWeight: '600',
  },
  capturingSubtext: { 
    color: '#AAA', 
    fontSize: 11, 
  },
  // Scanning animation overlay - positioned relative to document frame
  scanningOverlay: {
    position: 'absolute',
    height: 4,
    zIndex: 50,
    borderRadius: 2,
  },
  scanLine: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  bottomSection: { paddingBottom: Platform.OS === 'android' ? 24 : 8 },
  typeSelector: { paddingHorizontal: 12, gap: 8 },
  typeBtn: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 14, minWidth: 78, backgroundColor: 'rgba(0,0,0,0.3)' },
  typeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  typeLabel: { fontSize: 10, fontWeight: '500' },
  scanLimitIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 6,
    gap: 6,
  },
  scanLimitText: { 
    color: '#94A3B8', 
    fontSize: 11,
  },
  scanLimitWarning: { 
    color: '#F59E0B',
  },
  captureBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  sideBtn: { width: 64, alignItems: 'center' },
  sideBtnInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  sideBtnText: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  captureContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  captureBtn: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 4 },
  captureInner: { width: 54, height: 54, borderRadius: 27 },
  autoCaptureActive: { borderStyle: 'dashed' },
  autoCaptureRing: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderStyle: 'dashed' },
  autoDetectStatus: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  autoDetectIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  autoDetectText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  liveToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPagesBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 16,
    borderRadius: 20, 
    gap: 6 
  },
  viewPagesBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  modeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  modeToggleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  cropHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  cropTitle: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  cropImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  cropHint: { color: '#AAA', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  cropQuickActions: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingBottom: 10 },
  quickActionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 },
  quickActionText: { fontSize: 13, fontWeight: '500' },
  cropActions: { flexDirection: 'row', justifyContent: 'center', padding: 20 },
  cropBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28, gap: 10 },
  cropBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  magnifier: { position: 'absolute', borderRadius: 55, borderWidth: 3, overflow: 'hidden', backgroundColor: '#000', zIndex: 200 },
  magnifierInner: { flex: 1, overflow: 'hidden' },
  crosshairH: { position: 'absolute', width: '100%', height: 2, top: '50%', marginTop: -1 },
  crosshairV: { position: 'absolute', width: 2, height: '100%', left: '50%', marginLeft: -1 },
  magnifierLabel: { position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#FFF', fontSize: 9, fontWeight: '600' },
  // Template Modal Styles
  templateModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  templateModalContent: {
    width: '85%',
    maxWidth: 350,
    maxHeight: '70%',
    borderRadius: 20,
    padding: 20,
  },
  templateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  templateList: {
    maxHeight: 400,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  templateItemText: {
    flex: 1,
    marginLeft: 14,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
  },
  templateDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  previewTitle: { fontSize: 17, fontWeight: '600' },
  previewScroll: { flex: 1 },
  previewContent: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  previewImageWrapper: { width: '50%', aspectRatio: 0.7, padding: 8, position: 'relative' },
  previewImage: { flex: 1, borderRadius: 10 },
  removeBtn: { position: 'absolute', top: 4, right: 4, borderRadius: 14 },
  pageNum: { position: 'absolute', bottom: 14, left: 14, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pageNumText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  previewActions: { flexDirection: 'row', padding: 16, gap: 12 },
});

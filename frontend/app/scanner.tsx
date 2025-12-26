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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';
import Svg, { Rect, Line, Path, Defs, Mask, Circle } from 'react-native-svg';

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
  { type: 'book', label: 'Book', icon: 'book-outline', aspectRatio: 1.4, frameWidthRatio: 0.95, color: '#10B981', guide: 'Align open book pages' }, // Landscape for two pages
  { type: 'whiteboard', label: 'Whiteboard', icon: 'easel-outline', aspectRatio: 1.5, frameWidthRatio: 0.95, color: '#8B5CF6', guide: 'Capture entire board' },
  { type: 'business_card', label: 'Business', icon: 'person-outline', aspectRatio: 1.75, frameWidthRatio: 0.75, color: '#EC4899', guide: 'Center business card' },
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
  const { currentDocument, createDocument, updateDocument, fetchDocument, fetchDocuments } = useDocumentStore();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<{ base64: string; original: string }[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [showCamera, setShowCamera] = useState(true);
  
  // Auto-capture state
  const [autoCapture, setAutoCapture] = useState(false);
  const [edgesDetected, setEdgesDetected] = useState(false);
  const [isScanning, setIsScanning] = useState(false); // For scanning animation
  const [detectedCorners, setDetectedCorners] = useState<CropPoint[] | null>(null); // Real detected corners
  const [autoDetectStable, setAutoDetectStable] = useState(0); // Counter for stable detection
  const autoDetectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectionRef = useRef<string>(''); // To track if detection changed
  
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

  // Auto-capture when edges are detected AND stable for a few frames
  useEffect(() => {
    if (autoCapture && edgesDetected && autoDetectStable >= 3 && !isCapturing && showCamera && detectedCorners) {
      // Edges have been stable for 3 consecutive detections - auto capture!
      console.log('[AutoCapture] Edges stable, triggering capture...');
      takePicture();
    }
  }, [autoCapture, edgesDetected, autoDetectStable, isCapturing, showCamera, detectedCorners]);

  // Function to detect edges from a camera frame
  const detectEdgesFromFrame = useCallback(async () => {
    if (!cameraRef.current || isCapturing || !autoCapture) return;
    
    try {
      // Take a quick photo for edge detection
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3, // Low quality for speed
        base64: true,
        skipProcessing: true,
      });
      
      if (!photo?.base64) return;
      
      // Call backend edge detection API
      const response = await fetch(`${BACKEND_URL}/api/images/detect-edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: photo.base64 }),
      });
      
      if (!response.ok) {
        setEdgesDetected(false);
        setAutoDetectStable(0);
        return;
      }
      
      const result = await response.json();
      
      if (result.detected && result.corners) {
        // Convert normalized corners to detection signature for stability check
        const signature = result.corners.map((c: any) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join('|');
        
        if (signature === lastDetectionRef.current) {
          // Same detection as before - increment stability counter
          setAutoDetectStable(prev => prev + 1);
        } else {
          // Detection changed - reset stability
          setAutoDetectStable(1);
          lastDetectionRef.current = signature;
        }
        
        // Store detected corners (normalized)
        setDetectedCorners(result.corners.map((c: any) => ({ x: c.x, y: c.y })));
        setEdgesDetected(true);
        console.log('[AutoCapture] Edges detected, stability:', autoDetectStable + 1);
      } else {
        setEdgesDetected(false);
        setDetectedCorners(null);
        setAutoDetectStable(0);
        lastDetectionRef.current = '';
      }
    } catch (error) {
      console.error('[AutoCapture] Edge detection error:', error);
      setEdgesDetected(false);
      setAutoDetectStable(0);
    }
  }, [autoCapture, isCapturing, autoDetectStable]);

  // Toggle auto-capture - starts/stops edge detection loop
  const toggleAutoCapture = useCallback(() => {
    setAutoCapture(prev => {
      const newState = !prev;
      
      if (newState) {
        // Starting auto-capture - begin edge detection loop
        setIsScanning(true);
        setEdgesDetected(false);
        setAutoDetectStable(0);
        setDetectedCorners(null);
        lastDetectionRef.current = '';
        
        // Start periodic edge detection (every 1.5 seconds)
        autoDetectIntervalRef.current = setInterval(() => {
          detectEdgesFromFrame();
        }, 1500);
        
      } else {
        // Stopping auto-capture - clear interval
        setIsScanning(false);
        setEdgesDetected(false);
        setAutoDetectStable(0);
        setDetectedCorners(null);
        
        if (autoDetectIntervalRef.current) {
          clearInterval(autoDetectIntervalRef.current);
          autoDetectIntervalRef.current = null;
        }
      }
      
      return newState;
    });
  }, [detectEdgesFromFrame]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (autoDetectIntervalRef.current) {
        clearInterval(autoDetectIntervalRef.current);
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
    
    try {
      logDebug('CAPTURE', 'Starting capture...');
      
      // Capture with maximum quality settings
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 1.0,           // Maximum quality
        base64: true,           // We need base64 for processing
        exif: true,             // Include EXIF for orientation
        skipProcessing: false,  // Let camera handle basic processing
      });
      
      if (photo?.base64) {
        const capturedWidth = photo.width || 0;
        const capturedHeight = photo.height || 0;
        const capturedAspect = capturedWidth / capturedHeight;
        
        logDebug('CAPTURE', 'Photo captured', {
          dimensions: `${capturedWidth}x${capturedHeight}`,
          aspect: capturedAspect.toFixed(3),
          expectedAspect: SENSOR_ASPECT_PORTRAIT.toFixed(3),
          hasExif: !!photo.exif,
          base64Length: photo.base64.length,
        });
        
        // Verify image size (Image.getSize is more reliable)
        Image.getSize(`data:image/jpeg;base64,${photo.base64}`, (width, height) => {
          const verifiedAspect = width / height;
          
          logDebug('CAPTURE', 'Image size verified', {
            verified: `${width}x${height}`,
            aspect: verifiedAspect.toFixed(3),
            matchesCapture: width === capturedWidth && height === capturedHeight,
          });
          
          setImageSize({ width, height });
          setCropImage(photo.base64 || null);
          
          // Map frame overlay to sensor coordinates
          const frameCropPoints = mapFrameToSensorCoordinates(width, height);
          setCropPoints(frameCropPoints);
          
          setShowCropScreen(true);
          setShowCamera(false);
        }, (error) => {
          logDebug('CAPTURE', '❌ Image.getSize failed', { error: String(error) });
          
          // Fallback to captured dimensions or defaults
          const w = capturedWidth || 3024;
          const h = capturedHeight || 4032;
          setImageSize({ width: w, height: h });
          setCropImage(photo.base64 || null);
          setCropPoints(mapFrameToSensorCoordinates(w, h));
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
    if (!cropImage || cropPoints.length !== 4) {
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
      if (isGuest || !token) {
        logDebug('CROP', 'Guest mode - skipping backend crop');
        setCapturedImages(prev => [...prev, { base64: cropImage, original: cropImage }]);
      } else {
        // Normalize coordinates to 0-1 range for backend
        const normalizedCorners = cropPoints.map(p => ({
          x: p.x / imageSize.width,
          y: p.y / imageSize.height,
        }));

        logDebug('CROP', 'Sending to backend', {
          imageSize: `${imageSize.width}x${imageSize.height}`,
          corners: normalizedCorners.map((c, i) => 
            `${['TL', 'TR', 'BR', 'BL'][i]}:(${c.x.toFixed(4)},${c.y.toFixed(4)})`
          ).join(' '),
        });

        const response = await fetch(`${BACKEND_URL}/api/images/perspective-crop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image_base64: cropImage, corners: normalizedCorners }),
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
        // This is the first (front) scan of ID card
        Alert.alert(
          'Scan Back Side?',
          'Would you like to scan the back of your ID card?',
          [
            { text: 'Skip', style: 'cancel', onPress: () => setShowCamera(false) },
            { text: 'Scan Back', onPress: () => {
              setShowCamera(true);
              // Update guide text
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
    }
  };

  const handleResetCrop = () => {
    const frameCropPoints = mapFrameToSensorCoordinates(imageSize.width, imageSize.height);
    setCropPoints(frameCropPoints);
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

      if (addToDocumentId && token) {
        await fetchDocument(token, addToDocumentId);
        const existingDoc = useDocumentStore.getState().currentDocument;
        
        if (existingDoc) {
          const existingPages = existingDoc.pages || [];
          const updatedPages = [
            ...existingPages, 
            ...newPages.map((p, i) => ({ ...p, order: existingPages.length + i }))
          ];
          
          await updateDocument(token, addToDocumentId, { pages: updatedPages });
          await fetchDocuments(token);
          
          Alert.alert('Success', `Added ${capturedImages.length} page(s)`, [
            { text: 'OK', onPress: () => router.back() },
          ]);
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
          await createDocument(null, { name: docName, pages: newPages, document_type: currentType.type });
          await fetchDocuments(null);
          Alert.alert('Document Saved', 'Your document has been saved locally. Sign in to sync across devices.', [
            { text: 'OK', onPress: () => router.back() },
            { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
          ]);
        } else if (token) {
          await createDocument(token, { name: docName, pages: newPages, document_type: currentType.type });
          await fetchDocuments(token);
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

  // Crop overlay SVG - now includes edge handles
  const CropOverlay = useMemo(() => {
    if (cropPoints.length !== 4 || previewLayout.width === 0) return null;
    
    const screenPoints = cropPoints.map(p => toScreen(p));
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

  // Document guide overlay - includes book mode center line
  const DocumentGuide = useMemo(() => {
    const { width, height } = frameDimensions;
    return (
      <Svg width={width} height={height} style={styles.guideSvg}>
        <Rect x={3} y={3} width={width - 6} height={height - 6} 
          rx={currentType.type === 'id_card' ? 12 : 6}
          stroke={currentType.color} strokeWidth={3} strokeDasharray="10,5" fill="transparent" />
        
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
        
        {/* Book mode - horizontal center divider for two-page alignment */}
        {currentType.type === 'book' && (
          <>
            {/* Vertical center line (book spine) */}
            <Line x1={width / 2} y1={8} x2={width / 2} y2={height - 8} 
              stroke={currentType.color} strokeWidth={2} strokeDasharray="8,4" />
            {/* Horizontal center line for page alignment */}
            <Line x1={8} y1={height / 2} x2={width - 8} y2={height / 2} 
              stroke={currentType.color + '60'} strokeWidth={1.5} strokeDasharray="6,4" />
            {/* Page labels */}
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
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top']}>
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

        <Text style={styles.cropHint}>Drag corners or edges to adjust crop area</Text>

        <View style={styles.cropActions}>
          <TouchableOpacity 
            style={[styles.cropBtn, { backgroundColor: currentType.color }]} 
            onPress={handleApplyCrop} 
            disabled={isCapturing}
          >
            {isCapturing ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="checkmark" size={22} color="#FFF" />
                <Text style={styles.cropBtnText}>Save & Crop</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Preview mode
  if (capturedImages.length > 0 && !showCropScreen && !showCamera) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
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
        <SafeAreaView style={styles.cameraOverlay} edges={['top', 'bottom']}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={[styles.typeIndicator, { backgroundColor: currentType.color + '30' }]}>
              <Ionicons name={currentType.icon} size={16} color={currentType.color} />
              <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setFlashMode(f => f === 'off' ? 'on' : 'off')}>
              <Ionicons name={flashMode === 'off' ? 'flash-off' : 'flash'} size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.frameContainer}>
            <View style={[styles.docFrame, { width: frameDimensions.width, height: frameDimensions.height }]}>
              {DocumentGuide}
              <View style={[styles.corner, styles.tl, { borderColor: currentType.color }]} />
              <View style={[styles.corner, styles.tr, { borderColor: currentType.color }]} />
              <View style={[styles.corner, styles.bl, { borderColor: currentType.color }]} />
              <View style={[styles.corner, styles.br, { borderColor: currentType.color }]} />
            </View>
            <Text style={[styles.guideText, { color: currentType.color }]}>{currentType.guide}</Text>
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

          {/* Scanning Animation Overlay */}
          {isScanning && (
            <Animated.View 
              style={[
                styles.scanningOverlay,
                {
                  opacity: scanningAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.7, 0.3],
                  }),
                  transform: [{
                    translateY: scanningAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, frameDimensions.height],
                    }),
                  }],
                },
              ]}
            >
              <View style={[styles.scanLine, { backgroundColor: currentType.color }]} />
            </Animated.View>
          )}

          {/* Auto-detect status indicator */}
          {autoCapture && (
            <View style={styles.autoDetectStatus}>
              <View style={[styles.autoDetectIndicator, { backgroundColor: edgesDetected ? '#10B981' : '#F59E0B' }]}>
                <Ionicons 
                  name={edgesDetected ? 'checkmark-circle' : 'scan-outline'} 
                  size={16} 
                  color="#FFF" 
                />
                <Text style={styles.autoDetectText}>
                  {edgesDetected 
                    ? `Document found (${autoDetectStable}/3)` 
                    : 'Scanning for document...'}
                </Text>
              </View>
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

            {/* View pages button - separate row when there are captured images */}
            {capturedImages.length > 0 && (
              <TouchableOpacity 
                style={[styles.viewPagesBtn, { backgroundColor: currentType.color }]} 
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="layers" size={18} color="#FFF" />
                <Text style={styles.viewPagesBtnText}>View {capturedImages.length} Page{capturedImages.length > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
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
  // Scanning animation overlay
  scanningOverlay: {
    position: 'absolute',
    left: '10%',
    width: '80%',
    height: 3,
    zIndex: 50,
  },
  scanLine: {
    width: '100%',
    height: 3,
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
    alignItems: 'center',
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
  viewPagesBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginHorizontal: 40, 
    marginTop: 12, 
    paddingVertical: 12, 
    borderRadius: 24, 
    gap: 8 
  },
  viewPagesBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  cropHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  cropTitle: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  cropImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  cropHint: { color: '#AAA', fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  cropActions: { flexDirection: 'row', justifyContent: 'center', padding: 20 },
  cropBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28, gap: 10 },
  cropBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  magnifier: { position: 'absolute', borderRadius: 55, borderWidth: 3, overflow: 'hidden', backgroundColor: '#000', zIndex: 200 },
  magnifierInner: { flex: 1, overflow: 'hidden' },
  crosshairH: { position: 'absolute', width: '100%', height: 2, top: '50%', marginTop: -1 },
  crosshairV: { position: 'absolute', width: 2, height: '100%', left: '50%', marginLeft: -1 },
  magnifierLabel: { position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#FFF', fontSize: 9, fontWeight: '600' },
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

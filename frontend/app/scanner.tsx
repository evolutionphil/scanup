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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
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

type DocumentType = 'document' | 'id_card' | 'book' | 'whiteboard' | 'business_card';

interface DocTypeConfig {
  type: DocumentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  aspectRatio: number;       // Width/Height of frame (< 1 = portrait, > 1 = landscape)
  frameWidthRatio: number;   // Frame width as ratio of preview width (0-1)
  color: string;
  guide: string;
}

// Document types with frame configurations
// aspectRatio: width/height of the alignment frame
// frameWidthRatio: how much of preview width the frame occupies
const DOCUMENT_TYPES: DocTypeConfig[] = [
  { type: 'document', label: 'Document', icon: 'document-text-outline', aspectRatio: 0.707, frameWidthRatio: 0.85, color: '#3B82F6', guide: 'Align document edges' },
  { type: 'id_card', label: 'ID Card', icon: 'card-outline', aspectRatio: 1.586, frameWidthRatio: 0.80, color: '#F59E0B', guide: 'Place ID card in frame' },
  { type: 'book', label: 'Book', icon: 'book-outline', aspectRatio: 0.75, frameWidthRatio: 0.90, color: '#10B981', guide: 'Capture book pages' },
  { type: 'whiteboard', label: 'Whiteboard', icon: 'easel-outline', aspectRatio: 1.5, frameWidthRatio: 0.95, color: '#8B5CF6', guide: 'Capture entire board' },
  { type: 'business_card', label: 'Business', icon: 'person-outline', aspectRatio: 1.75, frameWidthRatio: 0.70, color: '#EC4899', guide: 'Center business card' },
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
  const { token, isGuest } = useAuthStore();
  const { theme } = useThemeStore();
  const { currentDocument, createDocument, updateDocument, fetchDocument, fetchDocuments } = useDocumentStore();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<{ base64: string; original: string }[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [showCamera, setShowCamera] = useState(true);
  
  const addToDocumentId = params.addToDocument as string | undefined;
  
  // Crop state - uses PIXEL coordinates for the crop screen
  const [showCropScreen, setShowCropScreen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropPoints, setCropPoints] = useState<CropPoint[]>([]);  // Pixel coords
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [previewLayout, setPreviewLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  
  // Camera layout for aspect ratio mapping
  const [cameraLayout, setCameraLayout] = useState<CameraLayoutInfo | null>(null);
  
  const cameraRef = useRef<CameraView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const currentType = DOCUMENT_TYPES[selectedTypeIndex];

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
    if (activeDragIndex === null) return;
    
    const touchX = e.nativeEvent.pageX - previewLayout.x;
    const touchY = e.nativeEvent.pageY - previewLayout.y;
    
    const clampedX = Math.max(0, Math.min(previewLayout.width, touchX));
    const clampedY = Math.max(0, Math.min(previewLayout.height, touchY));
    
    const newPoint = toImage(clampedX, clampedY);
    
    setCropPoints(prev => {
      const updated = [...prev];
      updated[activeDragIndex] = newPoint;
      return updated;
    });
  };

  const handleCornerTouchEnd = () => setActiveDragIndex(null);

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
        const docName = `${currentType.label} ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

        if (isGuest) {
          Alert.alert('Guest Mode', 'Sign in to save documents.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else if (token) {
          await createDocument(token, { name: docName, pages: newPages, document_type: currentType.type });
          await fetchDocuments(token);
          Alert.alert('Success', 'Document saved!', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  // Crop overlay SVG
  const CropOverlay = useMemo(() => {
    if (cropPoints.length !== 4 || previewLayout.width === 0) return null;
    
    const screenPoints = cropPoints.map(p => toScreen(p));
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
        
        {screenPoints.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={activeDragIndex === i ? 18 : 14} 
            fill={currentType.color} stroke="#FFF" strokeWidth={3} />
        ))}
      </Svg>
    );
  }, [cropPoints, previewLayout, currentType.color, activeDragIndex, toScreen]);

  // Magnifier
  const Magnifier = useMemo(() => {
    if (activeDragIndex === null || !cropImage || previewLayout.width === 0) return null;
    
    const point = cropPoints[activeDragIndex];
    const screenPoint = toScreen(point);
    const size = 110;
    const zoom = 2.5;
    
    const left = screenPoint.x > previewLayout.width / 2 ? 10 : previewLayout.width - size - 10;
    const top = screenPoint.y > previewLayout.height / 2 ? 10 : previewLayout.height - size - 10;
    
    const labels = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left'];

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
        <Text style={styles.magnifierLabel}>{labels[activeDragIndex]}</Text>
      </View>
    );
  }, [activeDragIndex, cropPoints, cropImage, previewLayout, toScreen, currentType.color]);

  // Document guide overlay
  const DocumentGuide = useMemo(() => {
    const { width, height } = frameDimensions;
    return (
      <Svg width={width} height={height} style={styles.guideSvg}>
        <Rect x={3} y={3} width={width - 6} height={height - 6} 
          rx={currentType.type === 'id_card' ? 12 : 6}
          stroke={currentType.color} strokeWidth={3} strokeDasharray="10,5" fill="transparent" />
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
        {currentType.type === 'book' && (
          <Line x1={width / 2} y1={8} x2={width / 2} y2={height - 8} 
            stroke={currentType.color} strokeWidth={2} strokeDasharray="8,4" />
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
            {cropPoints.map((point, index) => {
              const sp = toScreen(point);
              return (
                <View
                  key={index}
                  style={{ position: 'absolute', left: sp.x - 30, top: sp.y - 30, width: 60, height: 60, zIndex: 100 }}
                  onTouchStart={handleCornerTouchStart(index)}
                />
              );
            })}
            {Magnifier}
          </View>
        </View>

        <Text style={styles.cropHint}>Drag corners to adjust • Frame mapped from camera view</Text>

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
        pictureSize="highest"
        onLayout={handleCameraLayout}
      >
        <SafeAreaView style={styles.cameraOverlay}>
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

            <View style={styles.captureBar}>
              <TouchableOpacity style={styles.sideBtn} onPress={pickImage}>
                <View style={styles.sideBtnInner}><Ionicons name="images" size={22} color="#FFF" /></View>
                <Text style={styles.sideBtnText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.captureBtn, { borderColor: currentType.color }]} onPress={takePicture} disabled={isCapturing}>
                {isCapturing ? <ActivityIndicator color={currentType.color} /> : <View style={[styles.captureInner, { backgroundColor: currentType.color }]} />}
              </TouchableOpacity>

              <TouchableOpacity style={styles.sideBtn} onPress={() => capturedImages.length > 0 && setShowCamera(false)}>
                {capturedImages.length > 0 ? (
                  <View style={[styles.sideBtnInner, { backgroundColor: currentType.color + '40' }]}>
                    <View style={[styles.badge, { backgroundColor: currentType.color }]}><Text style={styles.badgeText}>{capturedImages.length}</Text></View>
                    <Ionicons name="layers" size={22} color="#FFF" />
                  </View>
                ) : (
                  <View style={[styles.sideBtnInner, { opacity: 0.3 }]}><Ionicons name="layers" size={22} color="#94A3B8" /></View>
                )}
                <Text style={styles.sideBtnText}>{capturedImages.length > 0 ? 'View' : 'Pages'}</Text>
              </TouchableOpacity>
            </View>
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
  bottomSection: { paddingBottom: 8 },
  typeSelector: { paddingHorizontal: 12, gap: 8 },
  typeBtn: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 14, minWidth: 78, backgroundColor: 'rgba(0,0,0,0.3)' },
  typeIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  typeLabel: { fontSize: 10, fontWeight: '500' },
  captureBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingTop: 12 },
  sideBtn: { width: 64, alignItems: 'center' },
  sideBtnInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  sideBtnText: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  captureBtn: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 4 },
  captureInner: { width: 54, height: 54, borderRadius: 27 },
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

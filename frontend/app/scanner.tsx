import React, { useState, useRef, useCallback, useMemo } from 'react';
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
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';
import Svg, { Rect, Line, Path, Circle, Defs, Mask } from 'react-native-svg';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type DocumentType = 'document' | 'id_card' | 'book' | 'whiteboard' | 'business_card';

interface DocTypeConfig {
  type: DocumentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  aspectRatio: number;
  frameWidth: number;
  color: string;
  guide: string;
  guideType: 'rectangle' | 'id_card' | 'book' | 'whiteboard' | 'business_card';
}

const DOCUMENT_TYPES: DocTypeConfig[] = [
  { 
    type: 'document', 
    label: 'Document', 
    icon: 'document-text-outline',
    aspectRatio: 0.707,
    frameWidth: 0.85,
    color: '#3B82F6',
    guide: 'Align document edges',
    guideType: 'rectangle'
  },
  { 
    type: 'id_card', 
    label: 'ID Card', 
    icon: 'card-outline',
    aspectRatio: 1.586,
    frameWidth: 0.8,
    color: '#F59E0B',
    guide: 'Place ID card in frame',
    guideType: 'id_card'
  },
  { 
    type: 'book', 
    label: 'Book', 
    icon: 'book-outline',
    aspectRatio: 0.75,
    frameWidth: 0.9,
    color: '#10B981',
    guide: 'Capture book pages',
    guideType: 'book'
  },
  { 
    type: 'whiteboard', 
    label: 'Whiteboard', 
    icon: 'easel-outline',
    aspectRatio: 1.5,
    frameWidth: 0.95,
    color: '#8B5CF6',
    guide: 'Capture entire board',
    guideType: 'whiteboard'
  },
  { 
    type: 'business_card', 
    label: 'Business', 
    icon: 'person-outline',
    aspectRatio: 1.75,
    frameWidth: 0.7,
    color: '#EC4899',
    guide: 'Center business card',
    guideType: 'business_card'
  },
];

interface CropPoint {
  x: number;
  y: number;
}

export default function ScannerScreen() {
  const { token } = useAuthStore();
  const { theme } = useThemeStore();
  const { createDocument, fetchDocuments } = useDocumentStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<{ base64: string; original: string }[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  
  // Crop/editing state
  const [showCropScreen, setShowCropScreen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropPoints, setCropPoints] = useState<CropPoint[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [autoCropLoading, setAutoCropLoading] = useState(false);
  const [detectedCorners, setDetectedCorners] = useState<CropPoint[] | null>(null);
  
  const cameraRef = useRef<CameraView>(null);
  const scrollRef = useRef<ScrollView>(null);

  const currentType = DOCUMENT_TYPES[selectedTypeIndex];

  // Calculate frame dimensions
  const getFrameDimensions = () => {
    const frameWidth = SCREEN_WIDTH * currentType.frameWidth - 40;
    const frameHeight = frameWidth / currentType.aspectRatio;
    const maxHeight = SCREEN_HEIGHT * 0.5;
    
    if (frameHeight > maxHeight) {
      return {
        width: maxHeight * currentType.aspectRatio,
        height: maxHeight,
      };
    }
    return { width: frameWidth, height: frameHeight };
  };

  const frameDimensions = getFrameDimensions();

  const handleTypeSelect = useCallback((index: number) => {
    setSelectedTypeIndex(index);
    // Center the selected item in scroll view
    if (scrollRef.current) {
      const itemWidth = 90;
      const scrollPosition = Math.max(0, index * itemWidth - (SCREEN_WIDTH / 2 - itemWidth / 2));
      scrollRef.current.scrollTo({ x: scrollPosition, animated: true });
    }
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
      });

      if (photo?.base64) {
        // Get image size
        Image.getSize(`data:image/jpeg;base64,${photo.base64}`, (width, height) => {
          setImageSize({ width, height });
          setCropImage(photo.base64 || null);
          setShowCropScreen(true);
          
          // Initialize crop points to full frame with padding
          const padding = 0.05;
          setCropPoints([
            { x: width * padding, y: height * padding },
            { x: width * (1 - padding), y: height * padding },
            { x: width * (1 - padding), y: height * (1 - padding) },
            { x: width * padding, y: height * (1 - padding) },
          ]);
          
          // Try auto-detection
          tryAutoCrop(photo.base64 || '');
        }, (error) => {
          console.error('Error getting image size:', error);
          // Set default size
          setImageSize({ width: 1080, height: 1920 });
          setCropImage(photo.base64 || null);
          setShowCropScreen(true);
        });
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };

  const tryAutoCrop = async (imageBase64: string) => {
    if (!token) return;
    
    setAutoCropLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/images/auto-crop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          operation: 'auto_crop',
          params: { document_type: currentType.type }
        }),
      });

      const result = await response.json();
      
      if (result.corners && result.corners.length === 4) {
        const corners = result.corners.map((c: any) => ({
          x: c.x,
          y: c.y
        }));
        setDetectedCorners(corners);
        setCropPoints(corners);
        
        if (result.success) {
          // Auto-detected successfully
          Alert.alert(
            'Document Detected!',
            'Auto-crop is ready. Adjust corners if needed, then tap "Crop" to apply.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (e) {
      console.error('Auto-crop detection error:', e);
    } finally {
      setAutoCropLoading(false);
    }
  };

  const handleApplyCrop = async () => {
    if (!cropImage || !token || cropPoints.length !== 4) {
      handleSkipCrop();
      return;
    }

    setIsCapturing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/images/perspective-crop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: cropImage,
          corners: cropPoints.map(p => ({
            x: p.x / imageSize.width,
            y: p.y / imageSize.height,
          })),
        }),
      });

      const result = await response.json();
      
      if (result.success && result.cropped_image_base64) {
        setCapturedImages([...capturedImages, { base64: result.cropped_image_base64, original: cropImage }]);
      } else {
        setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
      }
    } catch (e) {
      console.error('Crop error:', e);
      setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
    } finally {
      setShowCropScreen(false);
      setCropImage(null);
      setDetectedCorners(null);
      setIsCapturing(false);
    }
  };

  const handleSkipCrop = () => {
    if (cropImage) {
      setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
    }
    setShowCropScreen(false);
    setCropImage(null);
    setDetectedCorners(null);
  };

  const handleResetCrop = () => {
    if (detectedCorners) {
      setCropPoints([...detectedCorners]);
    } else {
      // Reset to full image with padding
      const padding = 0.05;
      setCropPoints([
        { x: imageSize.width * padding, y: imageSize.height * padding },
        { x: imageSize.width * (1 - padding), y: imageSize.height * padding },
        { x: imageSize.width * (1 - padding), y: imageSize.height * (1 - padding) },
        { x: imageSize.width * padding, y: imageSize.height * (1 - padding) },
      ]);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      base64: true,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets
        .filter((asset) => asset.base64)
        .map((asset) => ({ base64: asset.base64 as string, original: asset.base64 as string }));
      
      if (newImages.length > 0) {
        // For picked images, show crop screen for first one
        const firstImage = newImages[0];
        Image.getSize(`data:image/jpeg;base64,${firstImage.base64}`, (width, height) => {
          setImageSize({ width, height });
          setCropImage(firstImage.base64);
          setShowCropScreen(true);
          
          const padding = 0.05;
          setCropPoints([
            { x: width * padding, y: height * padding },
            { x: width * (1 - padding), y: height * padding },
            { x: width * (1 - padding), y: height * (1 - padding) },
            { x: width * padding, y: height * (1 - padding) },
          ]);
          
          tryAutoCrop(firstImage.base64);
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
  };

  const saveDocument = async () => {
    if (capturedImages.length === 0) {
      Alert.alert('Error', 'Please capture at least one image');
      return;
    }

    setIsSaving(true);
    try {
      const pages = capturedImages.map((img, index) => ({
        page_id: `page_${Date.now()}_${index}`,
        image_base64: img.base64,
        original_image_base64: img.original,
        filter_applied: 'original',
        rotation: 0,
        order: index,
        created_at: new Date().toISOString(),
      }));

      const docName = `${currentType.label} ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

      await createDocument(token!, {
        name: docName,
        pages,
        document_type: currentType.type,
      });

      // Refresh documents list
      await fetchDocuments(token!);

      Alert.alert('Success', 'Document saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Error', 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  // Draggable crop corner component with improved touch handling
  const CropCorner = useCallback(({ index, point }: { index: number; point: CropPoint }) => {
    const previewWidth = SCREEN_WIDTH - 40;
    const previewHeight = Math.min(previewWidth * (imageSize.height / imageSize.width), SCREEN_HEIGHT * 0.55);
    
    const scaleX = previewWidth / imageSize.width;
    const scaleY = previewHeight / imageSize.height;
    
    const screenX = point.x * scaleX;
    const screenY = point.y * scaleY;

    const handleMove = (dx: number, dy: number) => {
      const newX = Math.max(0, Math.min(imageSize.width, point.x + dx / scaleX));
      const newY = Math.max(0, Math.min(imageSize.height, point.y + dy / scaleY));
      
      setCropPoints(prev => {
        const newPoints = [...prev];
        newPoints[index] = { x: newX, y: newY };
        return newPoints;
      });
    };

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        handleMove(gestureState.dx, gestureState.dy);
      },
      onPanResponderRelease: () => {},
    });

    const cornerLabels = ['TL', 'TR', 'BR', 'BL'];

    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.cropCorner,
          {
            left: screenX - 22,
            top: screenY - 22,
            backgroundColor: currentType.color,
          },
        ]}
      >
        <Text style={styles.cornerLabel}>{cornerLabels[index]}</Text>
      </View>
    );
  }, [imageSize, currentType.color]);

  // Render crop lines between corners
  const CropLines = useMemo(() => {
    if (cropPoints.length !== 4 || !imageSize.width) return null;

    const previewWidth = SCREEN_WIDTH - 40;
    const previewHeight = Math.min(previewWidth * (imageSize.height / imageSize.width), SCREEN_HEIGHT * 0.55);
    
    const scaleX = previewWidth / imageSize.width;
    const scaleY = previewHeight / imageSize.height;

    const points = cropPoints.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY,
    }));

    const pathData = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`;

    return (
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Semi-transparent overlay outside crop area */}
        <Defs>
          <Mask id="cropMask">
            <Rect x="0" y="0" width={previewWidth} height={previewHeight} fill="white" />
            <Path d={pathData} fill="black" />
          </Mask>
        </Defs>
        <Rect 
          x="0" 
          y="0" 
          width={previewWidth} 
          height={previewHeight} 
          fill="rgba(0,0,0,0.4)" 
          mask="url(#cropMask)" 
        />
        
        {/* Crop outline */}
        <Path 
          d={pathData} 
          stroke={currentType.color} 
          strokeWidth={3} 
          fill="transparent" 
        />
        
        {/* Corner circles */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={6} fill={currentType.color} />
        ))}
      </Svg>
    );
  }, [cropPoints, imageSize, currentType.color]);

  // Document type visual guide overlays
  const DocumentGuide = useMemo(() => {
    const { width, height } = frameDimensions;
    
    switch (currentType.guideType) {
      case 'id_card':
        return (
          <Svg width={width} height={height} style={styles.guideSvg}>
            {/* ID Card outline */}
            <Rect 
              x={5} y={5} 
              width={width - 10} height={height - 10} 
              rx={12} ry={12}
              stroke={currentType.color} 
              strokeWidth={2} 
              strokeDasharray="8,4"
              fill="transparent" 
            />
            {/* Photo placeholder */}
            <Rect 
              x={width * 0.06} y={height * 0.2} 
              width={width * 0.28} height={height * 0.6}
              rx={4} ry={4}
              stroke={currentType.color + '80'} 
              strokeWidth={1.5}
              strokeDasharray="4,4"
              fill={currentType.color + '10'} 
            />
            {/* Info lines */}
            {[0.25, 0.4, 0.55, 0.7].map((y, i) => (
              <Line 
                key={i}
                x1={width * 0.4} y1={height * y}
                x2={width * 0.9} y2={height * y}
                stroke={currentType.color + '60'}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
            {/* ID icon */}
            <Ionicons 
              name="card-outline" 
              size={30} 
              color={currentType.color + '40'}
              style={{ position: 'absolute', right: 20, bottom: 20 }}
            />
          </Svg>
        );
        
      case 'book':
        return (
          <Svg width={width} height={height} style={styles.guideSvg}>
            {/* Book outline */}
            <Rect 
              x={5} y={5} 
              width={width - 10} height={height - 10} 
              rx={4} ry={4}
              stroke={currentType.color} 
              strokeWidth={2}
              strokeDasharray="8,4"
              fill="transparent" 
            />
            {/* Center spine line */}
            <Line 
              x1={width / 2} y1={10}
              x2={width / 2} y2={height - 10}
              stroke={currentType.color}
              strokeWidth={2}
              strokeDasharray="6,6"
            />
            {/* Page lines left */}
            {[0.15, 0.35, 0.55, 0.75].map((y, i) => (
              <Line 
                key={`l${i}`}
                x1={width * 0.08} y1={height * y}
                x2={width * 0.42} y2={height * y}
                stroke={currentType.color + '40'}
                strokeWidth={1.5}
              />
            ))}
            {/* Page lines right */}
            {[0.15, 0.35, 0.55, 0.75].map((y, i) => (
              <Line 
                key={`r${i}`}
                x1={width * 0.58} y1={height * y}
                x2={width * 0.92} y2={height * y}
                stroke={currentType.color + '40'}
                strokeWidth={1.5}
              />
            ))}
          </Svg>
        );
        
      case 'whiteboard':
        return (
          <Svg width={width} height={height} style={styles.guideSvg}>
            {/* Board outline */}
            <Rect 
              x={5} y={5} 
              width={width - 10} height={height - 10} 
              rx={8} ry={8}
              stroke={currentType.color} 
              strokeWidth={3}
              strokeDasharray="12,6"
              fill="transparent" 
            />
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((x, i) => (
              <Line 
                key={`v${i}`}
                x1={width * x} y1={20}
                x2={width * x} y2={height - 20}
                stroke={currentType.color + '20'}
                strokeWidth={1}
              />
            ))}
            {[0.33, 0.66].map((y, i) => (
              <Line 
                key={`h${i}`}
                x1={20} y1={height * y}
                x2={width - 20} y2={height * y}
                stroke={currentType.color + '20'}
                strokeWidth={1}
              />
            ))}
          </Svg>
        );
        
      case 'business_card':
        return (
          <Svg width={width} height={height} style={styles.guideSvg}>
            {/* Card outline */}
            <Rect 
              x={5} y={5} 
              width={width - 10} height={height - 10} 
              rx={8} ry={8}
              stroke={currentType.color} 
              strokeWidth={2}
              strokeDasharray="6,4"
              fill="transparent" 
            />
            {/* Logo placeholder */}
            <Circle 
              cx={width * 0.15} cy={height * 0.35}
              r={height * 0.15}
              stroke={currentType.color + '60'}
              strokeWidth={1.5}
              strokeDasharray="3,3"
              fill={currentType.color + '10'}
            />
            {/* Text lines */}
            <Line 
              x1={width * 0.35} y1={height * 0.25}
              x2={width * 0.85} y2={height * 0.25}
              stroke={currentType.color + '50'}
              strokeWidth={2}
            />
            <Line 
              x1={width * 0.35} y1={height * 0.45}
              x2={width * 0.7} y2={height * 0.45}
              stroke={currentType.color + '40'}
              strokeWidth={1.5}
            />
            <Line 
              x1={width * 0.15} y1={height * 0.7}
              x2={width * 0.85} y2={height * 0.7}
              stroke={currentType.color + '30'}
              strokeWidth={1}
            />
          </Svg>
        );
        
      default:
        return (
          <Svg width={width} height={height} style={styles.guideSvg}>
            <Rect 
              x={5} y={5} 
              width={width - 10} height={height - 10} 
              rx={8} ry={8}
              stroke={currentType.color} 
              strokeWidth={2}
              strokeDasharray="10,5"
              fill="transparent" 
            />
          </Svg>
        );
    }
  }, [frameDimensions, currentType]);

  // Permission screen
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
          <View style={[styles.permissionIconWrapper, { backgroundColor: theme.surface }]}>
            <Ionicons name="camera" size={60} color={theme.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: theme.text }]}>Camera Permission</Text>
          <Text style={[styles.permissionText, { color: theme.textMuted }]}>
            We need camera access to scan documents. Your photos are stored locally and never shared.
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} style={styles.permissionButton} />
          <Button title="Go Back" variant="secondary" onPress={() => router.back()} style={styles.permissionButton} />
        </View>
      </SafeAreaView>
    );
  }

  // Crop screen
  if (showCropScreen && cropImage) {
    const previewWidth = SCREEN_WIDTH - 40;
    const previewHeight = Math.min(previewWidth * (imageSize.height / imageSize.width), SCREEN_HEIGHT * 0.55);

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top']}>
        {/* Header */}
        <View style={styles.cropHeader}>
          <TouchableOpacity style={styles.cropHeaderBtn} onPress={() => setShowCropScreen(false)}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.cropTitle}>Adjust Crop</Text>
          <TouchableOpacity style={styles.cropHeaderBtn} onPress={handleResetCrop}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Image with crop overlay */}
        <View style={styles.cropImageContainer}>
          <View style={{ width: previewWidth, height: previewHeight, position: 'relative' }}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${cropImage}` }}
              style={{ width: previewWidth, height: previewHeight, borderRadius: 8 }}
              resizeMode="contain"
            />
            {CropLines}
            {/* Draggable corners */}
            {cropPoints.map((point, index) => (
              <CropCorner key={index} index={index} point={point} />
            ))}
            
            {autoCropLoading && (
              <View style={styles.cropLoadingOverlay}>
                <ActivityIndicator size="large" color={currentType.color} />
                <Text style={styles.cropLoadingText}>Detecting document...</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.cropHint}>
          Drag the corners to adjust the crop area
        </Text>

        {/* Actions */}
        <View style={styles.cropActions}>
          <TouchableOpacity 
            style={[styles.cropActionBtn, { backgroundColor: theme.surface }]}
            onPress={handleSkipCrop}
          >
            <Ionicons name="close-circle-outline" size={22} color="#FFF" />
            <Text style={styles.cropActionText}>Skip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.cropActionBtn, { backgroundColor: currentType.color }]}
            onPress={handleApplyCrop}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="crop" size={22} color="#FFF" />
                <Text style={styles.cropActionText}>Crop</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Preview captured images
  if (capturedImages.length > 0 && !showCropScreen) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.previewHeader}>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: theme.surface }]}
            onPress={() => setCapturedImages([])}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.previewTitle, { color: theme.text }]}>
            {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
          </Text>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: theme.surface }]}
            onPress={takePicture}
          >
            <Ionicons name="camera" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewScrollView} contentContainerStyle={styles.previewContent}>
          {capturedImages.map((image, index) => (
            <View key={index} style={styles.previewImageContainer}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${image.base64}` }}
                style={[styles.previewImage, { backgroundColor: theme.surface }]}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: theme.background }]}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={28} color={theme.danger} />
              </TouchableOpacity>
              <View style={styles.pageNumber}>
                <Text style={styles.pageNumberText}>Page {index + 1}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.previewActions}>
          <Button
            title="Add More"
            variant="secondary"
            onPress={takePicture}
            style={styles.actionButton}
            icon={<Ionicons name="camera" size={20} color={theme.text} />}
          />
          <Button
            title="Save Document"
            onPress={saveDocument}
            loading={isSaving}
            style={{ ...styles.actionButton, flex: 2 }}
            icon={<Ionicons name="checkmark" size={20} color="#FFF" />}
          />
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
      >
        <SafeAreaView style={styles.cameraOverlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.topBarCenter}>
              <Ionicons name={currentType.icon} size={18} color={currentType.color} />
              <Text style={[styles.topBarTitle, { color: currentType.color }]}>{currentType.label}</Text>
            </View>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setFlashMode(flashMode === 'off' ? 'on' : 'off')}
            >
              <Ionicons name={flashMode === 'off' ? 'flash-off' : 'flash'} size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Document Frame with Visual Guide */}
          <View style={styles.frameContainer}>
            <View style={[
              styles.documentFrame,
              {
                width: frameDimensions.width,
                height: frameDimensions.height,
              }
            ]}>
              {DocumentGuide}
              
              {/* Corner markers */}
              <View style={[styles.frameCorner, styles.frameCornerTL, { borderColor: currentType.color }]} />
              <View style={[styles.frameCorner, styles.frameCornerTR, { borderColor: currentType.color }]} />
              <View style={[styles.frameCorner, styles.frameCornerBL, { borderColor: currentType.color }]} />
              <View style={[styles.frameCorner, styles.frameCornerBR, { borderColor: currentType.color }]} />
              
              {/* Guide text */}
              <View style={styles.frameGuideText}>
                <Text style={[styles.guideText, { color: currentType.color }]}>
                  {currentType.guide}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Document Type Selector - Horizontal Slider */}
            <View style={styles.typeSelectorContainer}>
              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.typeSelector}
                snapToInterval={90}
                decelerationRate="fast"
              >
                {DOCUMENT_TYPES.map((type, index) => (
                  <TouchableOpacity
                    key={type.type}
                    style={[
                      styles.typeButton,
                      selectedTypeIndex === index && { 
                        backgroundColor: type.color + '30',
                        borderColor: type.color,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => handleTypeSelect(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.typeIconWrapper,
                      { backgroundColor: selectedTypeIndex === index ? type.color + '40' : 'rgba(255,255,255,0.1)' }
                    ]}>
                      <Ionicons
                        name={type.icon}
                        size={24}
                        color={selectedTypeIndex === index ? type.color : '#94A3B8'}
                      />
                    </View>
                    <Text style={[
                      styles.typeLabel,
                      { 
                        color: selectedTypeIndex === index ? type.color : '#94A3B8',
                        fontWeight: selectedTypeIndex === index ? '700' : '500',
                      },
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Capture Controls */}
            <View style={styles.captureBar}>
              <TouchableOpacity style={styles.sideButton} onPress={pickImage}>
                <View style={styles.sideButtonInner}>
                  <Ionicons name="images" size={24} color="#FFF" />
                </View>
                <Text style={styles.sideButtonText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.captureButton,
                  { borderColor: currentType.color },
                  isCapturing && styles.capturing
                ]}
                onPress={takePicture}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator color={currentType.color} size="small" />
                ) : (
                  <View style={[styles.captureInner, { backgroundColor: currentType.color }]} />
                )}
              </TouchableOpacity>

              <View style={styles.sideButton}>
                {capturedImages.length > 0 && (
                  <TouchableOpacity 
                    style={styles.sideButtonInner}
                    onPress={() => {/* Show preview */}}
                  >
                    <View style={[styles.badge, { backgroundColor: currentType.color }]}>
                      <Text style={styles.badgeText}>{capturedImages.length}</Text>
                    </View>
                    <Ionicons name="layers" size={24} color="#FFF" />
                  </TouchableOpacity>
                )}
                {capturedImages.length === 0 && (
                  <View style={[styles.sideButtonInner, { opacity: 0.4 }]}>
                    <Ionicons name="layers" size={24} color="#94A3B8" />
                  </View>
                )}
                <Text style={styles.sideButtonText}>Pages</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  topBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentFrame: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  frameCorner: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderWidth: 4,
  },
  frameCornerTL: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 8,
  },
  frameCornerTR: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
  },
  frameCornerBL: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 8,
  },
  frameCornerBR: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 8,
  },
  frameGuideText: {
    position: 'absolute',
    bottom: -35,
    alignItems: 'center',
  },
  guideText: {
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomSection: {
    paddingBottom: 10,
  },
  typeSelectorContainer: {
    paddingVertical: 8,
  },
  typeSelector: {
    paddingHorizontal: 16,
    gap: 10,
  },
  typeButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 80,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  typeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeLabel: {
    fontSize: 11,
  },
  captureBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sideButton: {
    width: 70,
    alignItems: 'center',
  },
  sideButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sideButtonText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  capturing: {
    opacity: 0.7,
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  // Permission styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    width: '100%',
    marginBottom: 12,
  },
  // Crop styles
  cropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cropHeaderBtn: {
    padding: 8,
  },
  cropTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cropImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cropCorner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  cornerLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cropLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  cropLoadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 14,
  },
  cropActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 20,
  },
  cropActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 10,
  },
  cropActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cropHint: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    paddingBottom: 8,
  },
  // Preview styles
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  previewScrollView: {
    flex: 1,
  },
  previewContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  previewImageContainer: {
    width: '50%',
    aspectRatio: 0.7,
    padding: 10,
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 14,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pageNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});

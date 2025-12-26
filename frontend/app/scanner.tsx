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
  PanResponder,
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
import Svg, { Rect, Line, Path, Defs, Mask } from 'react-native-svg';

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
}

const DOCUMENT_TYPES: DocTypeConfig[] = [
  { type: 'document', label: 'Document', icon: 'document-text-outline', aspectRatio: 0.707, frameWidth: 0.85, color: '#3B82F6', guide: 'Align document edges' },
  { type: 'id_card', label: 'ID Card', icon: 'card-outline', aspectRatio: 1.586, frameWidth: 0.8, color: '#F59E0B', guide: 'Place ID card in frame' },
  { type: 'book', label: 'Book', icon: 'book-outline', aspectRatio: 0.75, frameWidth: 0.9, color: '#10B981', guide: 'Capture book pages' },
  { type: 'whiteboard', label: 'Whiteboard', icon: 'easel-outline', aspectRatio: 1.5, frameWidth: 0.95, color: '#8B5CF6', guide: 'Capture entire board' },
  { type: 'business_card', label: 'Business', icon: 'person-outline', aspectRatio: 1.75, frameWidth: 0.7, color: '#EC4899', guide: 'Center business card' },
];

interface CropPoint { x: number; y: number; }

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
  
  // Mode for adding to existing document
  const [addToDocumentId, setAddToDocumentId] = useState<string | null>(null);
  
  // Crop state
  const [showCropScreen, setShowCropScreen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropPoints, setCropPoints] = useState<CropPoint[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewDims, setPreviewDims] = useState({ width: 0, height: 0, scaleX: 1, scaleY: 1 });
  
  const cameraRef = useRef<CameraView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const currentType = DOCUMENT_TYPES[selectedTypeIndex];

  // Check if we're adding to an existing document
  useEffect(() => {
    if (params.addToDocument && typeof params.addToDocument === 'string') {
      setAddToDocumentId(params.addToDocument);
    }
  }, [params.addToDocument]);

  // Calculate preview dimensions
  useEffect(() => {
    if (imageSize.width > 0 && imageSize.height > 0) {
      const maxWidth = SCREEN_WIDTH - 40;
      const maxHeight = SCREEN_HEIGHT * 0.5;
      const imageAspect = imageSize.width / imageSize.height;
      let pw, ph;
      if (imageAspect > maxWidth / maxHeight) {
        pw = maxWidth;
        ph = maxWidth / imageAspect;
      } else {
        ph = maxHeight;
        pw = maxHeight * imageAspect;
      }
      setPreviewDims({ width: pw, height: ph, scaleX: pw / imageSize.width, scaleY: ph / imageSize.height });
    }
  }, [imageSize]);

  const getFrameDimensions = () => {
    const fw = SCREEN_WIDTH * currentType.frameWidth - 40;
    const fh = fw / currentType.aspectRatio;
    const maxH = SCREEN_HEIGHT * 0.45;
    if (fh > maxH) return { width: maxH * currentType.aspectRatio, height: maxH };
    return { width: fw, height: fh };
  };
  const frameDimensions = getFrameDimensions();

  const handleTypeSelect = useCallback((index: number) => {
    setSelectedTypeIndex(index);
    if (scrollRef.current) {
      const itemWidth = 90;
      scrollRef.current.scrollTo({ x: Math.max(0, index * itemWidth - (SCREEN_WIDTH / 2 - itemWidth / 2)), animated: true });
    }
  }, []);

  // Crop the image to the frame area
  const cropToFrame = async (imageBase64: string): Promise<string> => {
    if (!token || isGuest) return imageBase64;
    
    try {
      // Calculate frame crop area as percentage of image
      // The frame is centered, so calculate the crop region
      const frameAspect = currentType.aspectRatio;
      
      // Send to backend with normalized corners for perspective crop
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
      if (result.success && result.cropped_image_base64) {
        return result.cropped_image_base64;
      }
      
      // If auto-crop fails, return original
      return imageBase64;
    } catch (e) {
      console.error('Frame crop error:', e);
      return imageBase64;
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, base64: true });
      if (photo?.base64) {
        Image.getSize(`data:image/jpeg;base64,${photo.base64}`, (width, height) => {
          setImageSize({ width, height });
          setCropImage(photo.base64 || null);
          
          // Initialize crop points to frame area (centered)
          const frameRatioW = frameDimensions.width / SCREEN_WIDTH;
          const frameRatioH = frameDimensions.height / (SCREEN_HEIGHT * 0.6);
          const paddingX = (1 - frameRatioW) / 2;
          const paddingY = (1 - frameRatioH) / 2;
          
          setCropPoints([
            { x: width * paddingX, y: height * paddingY },
            { x: width * (1 - paddingX), y: height * paddingY },
            { x: width * (1 - paddingX), y: height * (1 - paddingY) },
            { x: width * paddingX, y: height * (1 - paddingY) },
          ]);
          setShowCropScreen(true);
        });
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };

  const imageToScreen = (point: CropPoint) => ({
    x: point.x * previewDims.scaleX,
    y: point.y * previewDims.scaleY,
  });

  const screenToImage = (screenX: number, screenY: number) => ({
    x: Math.max(0, Math.min(imageSize.width, screenX / previewDims.scaleX)),
    y: Math.max(0, Math.min(imageSize.height, screenY / previewDims.scaleY)),
  });

  const handleApplyCrop = async () => {
    if (!cropImage || cropPoints.length !== 4) {
      if (cropImage) setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
      setShowCropScreen(false);
      setCropImage(null);
      return;
    }

    setIsCapturing(true);
    try {
      if (isGuest || !token) {
        setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
      } else {
        const normalizedCorners = cropPoints.map(p => ({
          x: p.x / imageSize.width,
          y: p.y / imageSize.height,
        }));

        const response = await fetch(`${BACKEND_URL}/api/images/perspective-crop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image_base64: cropImage, corners: normalizedCorners }),
        });

        const result = await response.json();
        if (result.success && result.cropped_image_base64) {
          setCapturedImages([...capturedImages, { base64: result.cropped_image_base64, original: cropImage }]);
        } else {
          setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
        }
      }
    } catch (e) {
      console.error('Crop error:', e);
      setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
    } finally {
      setShowCropScreen(false);
      setCropImage(null);
      setIsCapturing(false);
    }
  };

  const handleResetCrop = () => {
    const padding = 0.05;
    setCropPoints([
      { x: imageSize.width * padding, y: imageSize.height * padding },
      { x: imageSize.width * (1 - padding), y: imageSize.height * padding },
      { x: imageSize.width * (1 - padding), y: imageSize.height * (1 - padding) },
      { x: imageSize.width * padding, y: imageSize.height * (1 - padding) },
    ]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      Image.getSize(`data:image/jpeg;base64,${asset.base64}`, (width, height) => {
        setImageSize({ width, height });
        setCropImage(asset.base64 || null);
        const padding = 0.05;
        setCropPoints([
          { x: width * padding, y: height * padding },
          { x: width * (1 - padding), y: height * padding },
          { x: width * (1 - padding), y: height * (1 - padding) },
          { x: width * padding, y: height * (1 - padding) },
        ]);
        setShowCropScreen(true);
      });
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
      const newPages = capturedImages.map((img, index) => ({
        page_id: `page_${Date.now()}_${index}`,
        image_base64: img.base64,
        original_image_base64: img.original,
        filter_applied: 'original',
        rotation: 0,
        order: index,
        created_at: new Date().toISOString(),
      }));

      if (addToDocumentId && token && currentDocument) {
        // Adding pages to existing document
        const existingPages = currentDocument.pages || [];
        const updatedPages = [...existingPages, ...newPages.map((p, i) => ({
          ...p,
          order: existingPages.length + i,
        }))];
        
        await updateDocument(token, addToDocumentId, { pages: updatedPages });
        await fetchDocuments(token);
        
        Alert.alert('Success', `Added ${capturedImages.length} page(s) to document`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        // Creating new document
        const docName = `${currentType.label} ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

        if (isGuest) {
          Alert.alert('Guest Mode', 'Document saved locally. Sign in to sync across devices.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } else {
          await createDocument(token!, { name: docName, pages: newPages, document_type: currentType.type });
          await fetchDocuments(token!);
          Alert.alert('Success', 'Document saved successfully', [
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

  // Crop corner with touch tracking
  const CropCorner = ({ index }: { index: number }) => {
    const point = cropPoints[index];
    if (!point || !previewDims.width) return null;
    
    const screenPos = imageToScreen(point);
    const labels = ['TL', 'TR', 'BR', 'BL'];
    
    const panResponder = useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        setActiveDragIndex(index);
        const touch = e.nativeEvent;
        setDragOffset({ x: touch.locationX - 24, y: touch.locationY - 24 });
      },
      onPanResponderMove: (e, gestureState) => {
        const newScreenX = screenPos.x + gestureState.dx;
        const newScreenY = screenPos.y + gestureState.dy;
        const clampedX = Math.max(0, Math.min(previewDims.width, newScreenX));
        const clampedY = Math.max(0, Math.min(previewDims.height, newScreenY));
        const newImagePoint = screenToImage(clampedX, clampedY);
        
        setCropPoints(prev => {
          const newPoints = [...prev];
          newPoints[index] = newImagePoint;
          return newPoints;
        });
      },
      onPanResponderRelease: () => setActiveDragIndex(null),
    })).current;

    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.cropCorner,
          {
            left: screenPos.x - 24,
            top: screenPos.y - 24,
            backgroundColor: currentType.color,
            borderWidth: activeDragIndex === index ? 4 : 2,
            borderColor: '#FFF',
            transform: [{ scale: activeDragIndex === index ? 1.4 : 1 }],
          },
        ]}
      >
        <Text style={styles.cornerLabel}>{labels[index]}</Text>
      </View>
    );
  };

  // Magnifier for precise corner positioning
  const Magnifier = useMemo(() => {
    if (activeDragIndex === null || !cropImage || !previewDims.width) return null;
    
    const point = cropPoints[activeDragIndex];
    if (!point) return null;
    
    const screenPos = imageToScreen(point);
    const magnifierSize = 120;
    const zoomLevel = 3;
    
    // Position magnifier in opposite corner from drag point
    const magnifierX = screenPos.x > previewDims.width / 2 ? 10 : previewDims.width - magnifierSize - 10;
    const magnifierY = screenPos.y > previewDims.height / 2 ? 10 : previewDims.height - magnifierSize - 10;

    return (
      <View style={[
        styles.magnifier,
        {
          width: magnifierSize,
          height: magnifierSize,
          left: magnifierX,
          top: magnifierY,
          borderColor: currentType.color,
        }
      ]}>
        <View style={styles.magnifierContent}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${cropImage}` }}
            style={{
              width: previewDims.width * zoomLevel,
              height: previewDims.height * zoomLevel,
              position: 'absolute',
              left: -screenPos.x * zoomLevel + magnifierSize / 2,
              top: -screenPos.y * zoomLevel + magnifierSize / 2,
            }}
            resizeMode="cover"
          />
        </View>
        {/* Crosshair */}
        <View style={[styles.crosshairH, { backgroundColor: currentType.color }]} />
        <View style={[styles.crosshairV, { backgroundColor: currentType.color }]} />
        <Text style={styles.magnifierLabel}>
          {['Top-Left', 'Top-Right', 'Bottom-Right', 'Bottom-Left'][activeDragIndex]}
        </Text>
      </View>
    );
  }, [activeDragIndex, cropPoints, cropImage, previewDims, currentType.color, imageToScreen]);

  // Crop lines
  const CropLines = useMemo(() => {
    if (cropPoints.length !== 4 || !previewDims.width) return null;
    const pts = cropPoints.map(p => imageToScreen(p));
    const pathD = `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y} L ${pts[3].x} ${pts[3].y} Z`;

    return (
      <Svg width={previewDims.width} height={previewDims.height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask id="mask">
            <Rect x="0" y="0" width={previewDims.width} height={previewDims.height} fill="white" />
            <Path d={pathD} fill="black" />
          </Mask>
        </Defs>
        <Rect x="0" y="0" width={previewDims.width} height={previewDims.height} fill="rgba(0,0,0,0.6)" mask="url(#mask)" />
        <Path d={pathD} stroke={currentType.color} strokeWidth={3} fill="transparent" />
        {/* Grid */}
        {[0.33, 0.66].map((r, i) => (
          <Line key={`v${i}`} x1={pts[0].x + (pts[1].x - pts[0].x) * r} y1={pts[0].y + (pts[1].y - pts[0].y) * r}
            x2={pts[3].x + (pts[2].x - pts[3].x) * r} y2={pts[3].y + (pts[2].y - pts[3].y) * r}
            stroke={currentType.color + '50'} strokeWidth={1} />
        ))}
        {[0.33, 0.66].map((r, i) => (
          <Line key={`h${i}`} x1={pts[0].x + (pts[3].x - pts[0].x) * r} y1={pts[0].y + (pts[3].y - pts[0].y) * r}
            x2={pts[1].x + (pts[2].x - pts[1].x) * r} y2={pts[1].y + (pts[2].y - pts[1].y) * r}
            stroke={currentType.color + '50'} strokeWidth={1} />
        ))}
      </Svg>
    );
  }, [cropPoints, previewDims, currentType.color, imageToScreen]);

  // Document frame guide for camera view
  const DocumentGuide = useMemo(() => {
    const { width, height } = frameDimensions;
    return (
      <Svg width={width} height={height} style={styles.guideSvg}>
        <Rect x={3} y={3} width={width - 6} height={height - 6} rx={currentType.type === 'id_card' ? 12 : 8}
          stroke={currentType.color} strokeWidth={3} strokeDasharray="12,6" fill="transparent" />
        {currentType.type === 'id_card' && (
          <>
            <Rect x={width * 0.06} y={height * 0.15} width={width * 0.28} height={height * 0.7}
              rx={4} stroke={currentType.color + '60'} strokeWidth={1.5} strokeDasharray="4,4" fill={currentType.color + '10'} />
            {[0.2, 0.35, 0.5, 0.65].map((y, i) => (
              <Line key={i} x1={width * 0.4} y1={height * y} x2={width * 0.9} y2={height * y}
                stroke={currentType.color + '50'} strokeWidth={2} strokeLinecap="round" />
            ))}
          </>
        )}
        {currentType.type === 'book' && (
          <Line x1={width / 2} y1={8} x2={width / 2} y2={height - 8} stroke={currentType.color} strokeWidth={2} strokeDasharray="8,4" />
        )}
        {currentType.type === 'business_card' && (
          <>
            <Rect x={width * 0.08} y={height * 0.2} width={width * 0.25} height={height * 0.35}
              rx={4} stroke={currentType.color + '50'} strokeWidth={1.5} strokeDasharray="3,3" fill={currentType.color + '08'} />
            <Line x1={width * 0.4} y1={height * 0.3} x2={width * 0.88} y2={height * 0.3}
              stroke={currentType.color + '50'} strokeWidth={2} />
            <Line x1={width * 0.4} y1={height * 0.5} x2={width * 0.75} y2={height * 0.5}
              stroke={currentType.color + '40'} strokeWidth={1.5} />
          </>
        )}
      </Svg>
    );
  }, [frameDimensions, currentType]);

  // Permission handling
  if (!permission) return <View style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIcon, { backgroundColor: theme.surface }]}>
            <Ionicons name="camera" size={60} color={theme.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: theme.text }]}>Camera Permission</Text>
          <Text style={[styles.permissionText, { color: theme.textMuted }]}>Required to scan documents.</Text>
          <Button title="Grant Permission" onPress={requestPermission} style={{ marginTop: 20, width: '100%' }} />
          <Button title="Go Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: 12, width: '100%' }} />
        </View>
      </SafeAreaView>
    );
  }

  // Crop screen
  if (showCropScreen && cropImage) {
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
          <View style={{ width: previewDims.width, height: previewDims.height, position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
            <Image source={{ uri: `data:image/jpeg;base64,${cropImage}` }} style={{ width: previewDims.width, height: previewDims.height }} resizeMode="cover" />
            {CropLines}
            {cropPoints.map((_, i) => <CropCorner key={i} index={i} />)}
            {Magnifier}
          </View>
        </View>

        <Text style={styles.cropHint}>Drag corners to adjust • Magnifier shows detail</Text>

        <View style={styles.cropActions}>
          <TouchableOpacity style={[styles.cropBtn, { backgroundColor: currentType.color }]} onPress={handleApplyCrop} disabled={isCapturing}>
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
  if (capturedImages.length > 0 && !showCropScreen) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.previewHeader}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.surface }]} onPress={() => setCapturedImages([])}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.previewTitle, { color: theme.text }]}>
            {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
            {addToDocumentId && ' (Adding)'}
          </Text>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.surface }]} onPress={takePicture}>
            <Ionicons name="add" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewContent}>
          {capturedImages.map((img, index) => (
            <View key={index} style={styles.previewImageWrapper}>
              <Image source={{ uri: `data:image/jpeg;base64,${img.base64}` }} style={[styles.previewImage, { backgroundColor: theme.surface }]} resizeMode="contain" />
              <TouchableOpacity style={[styles.removeBtn, { backgroundColor: theme.background }]} onPress={() => removeImage(index)}>
                <Ionicons name="close-circle" size={28} color={theme.danger} />
              </TouchableOpacity>
              <View style={styles.pageNum}><Text style={styles.pageNumText}>Page {index + 1}</Text></View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.previewActions}>
          <Button title="Add More" variant="secondary" onPress={takePicture} style={{ flex: 1 }} icon={<Ionicons name="camera" size={20} color={theme.text} />} />
          <Button title={addToDocumentId ? "Add Pages" : "Save Document"} onPress={saveDocument} loading={isSaving} style={{ flex: 2 }} icon={<Ionicons name="checkmark" size={20} color="#FFF" />} />
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" flash={flashMode}>
        <SafeAreaView style={styles.cameraOverlay}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={[styles.typeIndicator, { backgroundColor: currentType.color + '30' }]}>
              <Ionicons name={currentType.icon} size={16} color={currentType.color} />
              <Text style={[styles.typeIndicatorText, { color: currentType.color }]}>{currentType.label}</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setFlashMode(flashMode === 'off' ? 'on' : 'off')}>
              <Ionicons name={flashMode === 'off' ? 'flash-off' : 'flash'} size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.frameContainer}>
            <View style={[styles.documentFrame, { width: frameDimensions.width, height: frameDimensions.height }]}>
              {DocumentGuide}
              <View style={[styles.corner, styles.cornerTL, { borderColor: currentType.color }]} />
              <View style={[styles.corner, styles.cornerTR, { borderColor: currentType.color }]} />
              <View style={[styles.corner, styles.cornerBL, { borderColor: currentType.color }]} />
              <View style={[styles.corner, styles.cornerBR, { borderColor: currentType.color }]} />
            </View>
            <Text style={[styles.guideText, { color: currentType.color }]}>{currentType.guide}</Text>
          </View>

          <View style={styles.bottomSection}>
            <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeSelector} snapToInterval={90} decelerationRate="fast">
              {DOCUMENT_TYPES.map((type, index) => (
                <TouchableOpacity key={type.type} style={[styles.typeBtn, selectedTypeIndex === index && { backgroundColor: type.color + '30', borderColor: type.color, borderWidth: 2 }]}
                  onPress={() => handleTypeSelect(index)}>
                  <View style={[styles.typeIconWrap, { backgroundColor: selectedTypeIndex === index ? type.color + '40' : 'rgba(255,255,255,0.1)' }]}>
                    <Ionicons name={type.icon} size={22} color={selectedTypeIndex === index ? type.color : '#94A3B8'} />
                  </View>
                  <Text style={[styles.typeLabel, { color: selectedTypeIndex === index ? type.color : '#94A3B8', fontWeight: selectedTypeIndex === index ? '700' : '400' }]}>{type.label}</Text>
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

              <View style={styles.sideBtn}>
                {capturedImages.length > 0 ? (
                  <View style={styles.sideBtnInner}>
                    <View style={[styles.badge, { backgroundColor: currentType.color }]}><Text style={styles.badgeText}>{capturedImages.length}</Text></View>
                    <Ionicons name="layers" size={22} color="#FFF" />
                  </View>
                ) : (
                  <View style={[styles.sideBtnInner, { opacity: 0.4 }]}><Ionicons name="layers" size={22} color="#94A3B8" /></View>
                )}
                <Text style={styles.sideBtnText}>Pages</Text>
              </View>
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
  iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  typeIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  typeIndicatorText: { fontSize: 14, fontWeight: '600' },
  frameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  documentFrame: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  guideSvg: { position: 'absolute' },
  corner: { position: 'absolute', width: 32, height: 32, borderWidth: 4 },
  cornerTL: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },
  guideText: { marginTop: 20, fontSize: 14, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  bottomSection: { paddingBottom: 8 },
  typeSelector: { paddingHorizontal: 16, gap: 10 },
  typeBtn: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 14, minWidth: 80, backgroundColor: 'rgba(0,0,0,0.3)' },
  typeIconWrap: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  typeLabel: { fontSize: 10 },
  captureBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingTop: 12 },
  sideBtn: { width: 65, alignItems: 'center' },
  sideBtnInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  sideBtnText: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  captureBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 4 },
  captureInner: { width: 56, height: 56, borderRadius: 28 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  permissionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  permissionText: { fontSize: 14, textAlign: 'center' },
  cropHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  cropTitle: { color: '#FFF', fontSize: 17, fontWeight: '600' },
  cropImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  cropCorner: { position: 'absolute', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  cornerLabel: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  cropHint: { color: '#94A3B8', fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  cropActions: { flexDirection: 'row', justifyContent: 'center', padding: 20 },
  cropBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28, gap: 10 },
  cropBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  magnifier: { position: 'absolute', borderRadius: 60, borderWidth: 3, overflow: 'hidden', backgroundColor: '#000', zIndex: 200 },
  magnifierContent: { flex: 1, overflow: 'hidden' },
  crosshairH: { position: 'absolute', width: '100%', height: 2, top: '50%', marginTop: -1 },
  crosshairV: { position: 'absolute', width: 2, height: '100%', left: '50%', marginLeft: -1 },
  magnifierLabel: { position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', color: '#FFF', fontSize: 9, fontWeight: '600' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  headerBtn: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
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

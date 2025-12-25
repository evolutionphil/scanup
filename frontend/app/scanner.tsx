import React, { useState, useRef, useCallback } from 'react';
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
  Animated,
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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type DocumentType = 'document' | 'id_card' | 'book' | 'whiteboard' | 'business_card';

interface DocTypeConfig {
  type: DocumentType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  aspectRatio: number; // width/height
  frameWidth: number; // percentage of screen width
  color: string;
  guide: string;
}

const DOCUMENT_TYPES: DocTypeConfig[] = [
  { 
    type: 'document', 
    label: 'Document', 
    icon: 'document-text-outline',
    aspectRatio: 0.707, // A4 ratio
    frameWidth: 0.85,
    color: '#3B82F6',
    guide: 'Align document edges'
  },
  { 
    type: 'id_card', 
    label: 'ID Card', 
    icon: 'card-outline',
    aspectRatio: 1.586, // Standard ID card ratio (85.6mm x 53.98mm)
    frameWidth: 0.8,
    color: '#F59E0B',
    guide: 'Place ID card in frame'
  },
  { 
    type: 'book', 
    label: 'Book', 
    icon: 'book-outline',
    aspectRatio: 0.75,
    frameWidth: 0.9,
    color: '#10B981',
    guide: 'Capture book pages'
  },
  { 
    type: 'whiteboard', 
    label: 'Whiteboard', 
    icon: 'easel-outline',
    aspectRatio: 1.5, // Wide format
    frameWidth: 0.95,
    color: '#8B5CF6',
    guide: 'Capture entire board'
  },
  { 
    type: 'business_card', 
    label: 'Business', 
    icon: 'person-outline',
    aspectRatio: 1.75, // Business card ratio
    frameWidth: 0.7,
    color: '#EC4899',
    guide: 'Center business card'
  },
];

interface CropPoint {
  x: number;
  y: number;
}

export default function ScannerScreen() {
  const { token } = useAuthStore();
  const { theme } = useThemeStore();
  const { createDocument } = useDocumentStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<{ base64: string; original: string }[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  
  // Manual crop state
  const [showManualCrop, setShowManualCrop] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropPoints, setCropPoints] = useState<CropPoint[]>([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const cameraRef = useRef<CameraView>(null);
  const scrollRef = useRef<ScrollView>(null);

  const currentType = DOCUMENT_TYPES[selectedTypeIndex];

  // Calculate frame dimensions based on document type
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

  const handleTypeSelect = (index: number) => {
    setSelectedTypeIndex(index);
    // Scroll to center the selected item
    scrollRef.current?.scrollTo({ x: index * 100 - 100, animated: true });
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
      });

      if (photo?.base64) {
        // Store the image and show crop options
        setCropImage(photo.base64);
        
        // Get image dimensions for crop interface
        Image.getSize(`data:image/jpeg;base64,${photo.base64}`, (width, height) => {
          setImageSize({ width, height });
          // Initialize crop points to frame area (approximate)
          const padding = 0.1;
          setCropPoints([
            { x: width * padding, y: height * padding },
            { x: width * (1 - padding), y: height * padding },
            { x: width * (1 - padding), y: height * (1 - padding) },
            { x: width * padding, y: height * (1 - padding) },
          ]);
        });
        
        setShowManualCrop(true);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleAutoCrop = async () => {
    if (!cropImage || !token) {
      handleSkipCrop();
      return;
    }

    setIsCapturing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/images/auto-crop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: cropImage,
          operation: 'auto_crop',
          params: { document_type: currentType.type }
        }),
      });

      const result = await response.json();
      
      if (result.success && result.cropped_image_base64) {
        setCapturedImages([...capturedImages, { base64: result.cropped_image_base64, original: cropImage }]);
        setShowManualCrop(false);
        setCropImage(null);
        Alert.alert('Success', 'Document cropped automatically');
      } else {
        Alert.alert(
          'Auto-Crop Failed',
          'Could not detect document edges. Please adjust the corners manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      console.error('Auto-crop error:', e);
      Alert.alert('Error', 'Auto-crop failed. Please adjust manually.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleManualCrop = async () => {
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
      console.error('Manual crop error:', e);
      setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
    } finally {
      setShowManualCrop(false);
      setCropImage(null);
      setIsCapturing(false);
    }
  };

  const handleSkipCrop = () => {
    if (cropImage) {
      setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
    }
    setShowManualCrop(false);
    setCropImage(null);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets
        .filter((asset) => asset.base64)
        .map((asset) => ({ base64: asset.base64 as string, original: asset.base64 as string }));
      setCapturedImages([...capturedImages, ...newImages]);
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

  // Draggable crop corner component
  const CropCorner = ({ index }: { index: number }) => {
    const point = cropPoints[index];
    if (!point) return null;

    // Convert image coordinates to screen coordinates
    const previewWidth = SCREEN_WIDTH - 40;
    const previewHeight = previewWidth * (imageSize.height / imageSize.width) || 400;
    const screenX = (point.x / imageSize.width) * previewWidth;
    const screenY = (point.y / imageSize.height) * previewHeight;

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          const newX = Math.max(0, Math.min(imageSize.width, (screenX + gestureState.dx) / previewWidth * imageSize.width));
          const newY = Math.max(0, Math.min(imageSize.height, (screenY + gestureState.dy) / previewHeight * imageSize.height));
          
          setCropPoints(prev => {
            const newPoints = [...prev];
            newPoints[index] = { x: newX, y: newY };
            return newPoints;
          });
        },
      })
    ).current;

    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.cropCorner,
          {
            left: screenX - 20,
            top: screenY - 20,
            backgroundColor: currentType.color,
            borderColor: '#FFF',
          },
        ]}
      >
        <View style={styles.cropCornerInner} />
      </View>
    );
  };

  // Render crop lines
  const renderCropLines = () => {
    if (cropPoints.length !== 4 || !imageSize.width) return null;

    const previewWidth = SCREEN_WIDTH - 40;
    const previewHeight = previewWidth * (imageSize.height / imageSize.width) || 400;

    const points = cropPoints.map(p => ({
      x: (p.x / imageSize.width) * previewWidth,
      y: (p.y / imageSize.height) * previewHeight,
    }));

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Draw lines between corners */}
        {[0, 1, 2, 3].map(i => {
          const next = (i + 1) % 4;
          const startX = points[i].x;
          const startY = points[i].y;
          const endX = points[next].x;
          const endY = points[next].y;
          const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
          const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

          return (
            <View
              key={i}
              style={[
                styles.cropLine,
                {
                  left: startX,
                  top: startY,
                  width: length,
                  backgroundColor: currentType.color,
                  transform: [{ rotate: `${angle}deg` }],
                  transformOrigin: 'left center',
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

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
          <View style={[styles.permissionIconWrapper, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="camera" size={60} color={theme.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: theme.text }]}>Camera Access Required</Text>
          <Text style={[styles.permissionText, { color: theme.textMuted }]}>
            Please grant camera access to scan documents
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} style={styles.permissionButton} />
          <Button title="Go Back" variant="secondary" onPress={() => router.back()} style={styles.permissionButton} />
        </View>
      </SafeAreaView>
    );
  }

  // Manual Crop Screen
  if (showManualCrop && cropImage) {
    const previewWidth = SCREEN_WIDTH - 40;
    const previewHeight = previewWidth * (imageSize.height / imageSize.width) || 400;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.cropHeader}>
          <TouchableOpacity onPress={handleSkipCrop} style={styles.cropHeaderBtn}>
            <Text style={styles.cropHeaderText}>Skip</Text>
          </TouchableOpacity>
          <Text style={styles.cropTitle}>Adjust Edges</Text>
          <TouchableOpacity onPress={handleManualCrop} style={styles.cropHeaderBtn}>
            <Text style={[styles.cropHeaderText, { color: currentType.color }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cropImageContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${cropImage}` }}
            style={[styles.cropPreviewImage, { width: previewWidth, height: previewHeight }]}
            resizeMode="contain"
          />
          <View style={[styles.cropOverlay, { width: previewWidth, height: previewHeight }]}>
            {renderCropLines()}
            {[0, 1, 2, 3].map(i => (
              <CropCorner key={i} index={i} />
            ))}
          </View>
        </View>

        <View style={styles.cropActions}>
          <TouchableOpacity
            style={[styles.cropActionBtn, { backgroundColor: currentType.color }]}
            onPress={handleAutoCrop}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="scan" size={20} color="#FFF" />
                <Text style={styles.cropActionText}>Auto Detect</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cropActionBtn, { backgroundColor: '#374151' }]}
            onPress={handleSkipCrop}
          >
            <Ionicons name="close" size={20} color="#FFF" />
            <Text style={styles.cropActionText}>No Crop</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cropHint}>
          Drag the corners to adjust the crop area
        </Text>
      </SafeAreaView>
    );
  }

  // Preview captured images
  if (capturedImages.length > 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.previewHeader}>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: theme.surface }]}
            onPress={() => setCapturedImages([])}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.previewTitle, { color: theme.text }]}>
            {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
          </Text>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: theme.surface }]}
            onPress={() => {}}
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
            onPress={() => {}}
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
            <Text style={styles.topBarTitle}>{currentType.label}</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setFlashMode(flashMode === 'off' ? 'on' : 'off')}
            >
              <Ionicons name={flashMode === 'off' ? 'flash-off' : 'flash'} size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Document Frame */}
          <View style={styles.frameContainer}>
            <View style={[
              styles.documentFrame,
              {
                width: frameDimensions.width,
                height: frameDimensions.height,
                borderColor: currentType.color,
              }
            ]}>
              {/* Corner markers */}
              <View style={[styles.frameCorner, styles.frameCornerTL, { borderColor: currentType.color }]} />
              <View style={[styles.frameCorner, styles.frameCornerTR, { borderColor: currentType.color }]} />
              <View style={[styles.frameCorner, styles.frameCornerBL, { borderColor: currentType.color }]} />
              <View style={[styles.frameCorner, styles.frameCornerBR, { borderColor: currentType.color }]} />
              
              {/* Document type specific icon/guide */}
              <View style={styles.frameGuide}>
                <Ionicons name={currentType.icon} size={48} color={currentType.color + '60'} />
                <Text style={[styles.frameGuideText, { color: currentType.color + '80' }]}>
                  {currentType.guide}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Document Type Selector */}
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeSelector}
            >
              {DOCUMENT_TYPES.map((type, index) => (
                <TouchableOpacity
                  key={type.type}
                  style={[
                    styles.typeButton,
                    selectedTypeIndex === index && { backgroundColor: type.color + '30' },
                  ]}
                  onPress={() => handleTypeSelect(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={type.icon}
                    size={24}
                    color={selectedTypeIndex === index ? type.color : '#94A3B8'}
                  />
                  <Text style={[
                    styles.typeLabel,
                    { color: selectedTypeIndex === index ? type.color : '#94A3B8' },
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Capture Controls */}
            <View style={styles.captureBar}>
              <TouchableOpacity style={styles.sideButton} onPress={pickImage}>
                <Ionicons name="images" size={26} color="#FFF" />
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
                  <View style={[styles.badge, { backgroundColor: currentType.color }]}>
                    <Text style={styles.badgeText}>{capturedImages.length}</Text>
                  </View>
                )}
                <Ionicons name="layers" size={26} color="#94A3B8" />
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
  topBarTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  frameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
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
  frameGuide: {
    alignItems: 'center',
    gap: 12,
  },
  frameGuideText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomSection: {
    paddingBottom: 20,
  },
  typeSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  typeButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  captureBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
  },
  sideButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  capturing: {
    opacity: 0.7,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  cropHeaderText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 20,
  },
  cropPreviewImage: {
    borderRadius: 8,
  },
  cropOverlay: {
    position: 'absolute',
  },
  cropCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropCornerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
  },
  cropLine: {
    position: 'absolute',
    height: 3,
  },
  cropActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  cropActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  cropActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cropHint: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    paddingBottom: 20,
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

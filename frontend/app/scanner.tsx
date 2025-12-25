import React, { useState, useRef } from 'react';
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

const DOCUMENT_TYPES: { type: DocumentType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'whiteboard', label: 'Whiteboard', icon: 'easel-outline' },
  { type: 'book', label: 'Book', icon: 'book-outline' },
  { type: 'document', label: 'Document', icon: 'document-text-outline' },
  { type: 'id_card', label: 'ID Card', icon: 'card-outline' },
  { type: 'business_card', label: 'Business', icon: 'person-outline' },
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
  const [autoCropEnabled, setAutoCropEnabled] = useState(true);
  const [documentType, setDocumentType] = useState<DocumentType>('document');
  const [showManualCrop, setShowManualCrop] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropPoints, setCropPoints] = useState<CropPoint[]>([
    { x: 50, y: 50 },
    { x: SCREEN_WIDTH - 90, y: 50 },
    { x: SCREEN_WIDTH - 90, y: 350 },
    { x: 50, y: 350 },
  ]);
  const cameraRef = useRef<CameraView>(null);

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo?.base64) {
        let processedImage = photo.base64;
        const originalImage = photo.base64;

        if (autoCropEnabled && token) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/images/auto-crop`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                image_base64: photo.base64,
                operation: 'auto_crop',
                params: { document_type: documentType }
              }),
            });

            const result = await response.json();
            if (result.success) {
              processedImage = result.cropped_image_base64;
              setCapturedImages([...capturedImages, { base64: processedImage, original: originalImage }]);
            } else {
              // Auto-crop failed, show manual crop interface
              setCropImage(originalImage);
              setShowManualCrop(true);
            }
          } catch (e) {
            console.log('Auto-crop failed, showing manual crop');
            setCropImage(originalImage);
            setShowManualCrop(true);
          }
        } else {
          setCapturedImages([...capturedImages, { base64: processedImage, original: originalImage }]);
        }
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleManualCropConfirm = async () => {
    if (!cropImage || !token) return;

    setIsCapturing(true);
    try {
      // Convert screen coordinates to image coordinates (normalized 0-1)
      const normalizedPoints = cropPoints.map(p => ({
        x: p.x / (SCREEN_WIDTH - 40),
        y: p.y / 400,
      }));

      const response = await fetch(`${BACKEND_URL}/api/images/perspective-crop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: cropImage,
          corners: normalizedPoints,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setCapturedImages([...capturedImages, { base64: result.cropped_image_base64, original: cropImage }]);
      } else {
        // Use original if crop fails
        setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
      }
    } catch (e) {
      console.log('Manual crop failed, using original');
      setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
    } finally {
      setShowManualCrop(false);
      setCropImage(null);
      setIsCapturing(false);
    }
  };

  const handleManualCropSkip = () => {
    if (cropImage) {
      setCapturedImages([...capturedImages, { base64: cropImage, original: cropImage }]);
    }
    setShowManualCrop(false);
    setCropImage(null);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
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

  const moveImage = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= capturedImages.length) return;
    
    const newImages = [...capturedImages];
    [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
    setCapturedImages(newImages);
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

      const typeLabel = DOCUMENT_TYPES.find(t => t.type === documentType)?.label || 'Document';
      const docName = `${typeLabel} ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

      await createDocument(token!, {
        name: docName,
        pages,
        document_type: documentType,
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

  // Manual Crop Corner Component
  const CropCorner = ({ index, position }: { index: number; position: CropPoint }) => {
    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          const newPoints = [...cropPoints];
          newPoints[index] = {
            x: Math.max(0, Math.min(SCREEN_WIDTH - 40, position.x + gestureState.dx)),
            y: Math.max(0, Math.min(400, position.y + gestureState.dy)),
          };
          setCropPoints(newPoints);
        },
      })
    ).current;

    return (
      <View
        {...panResponder.panHandlers}
        style={[
          styles.cropCorner,
          {
            left: position.x - 15,
            top: position.y - 15,
            backgroundColor: theme.primary,
          },
        ]}
      />
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
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.manualCropHeader}>
          <TouchableOpacity onPress={handleManualCropSkip}>
            <Text style={[styles.headerButton, { color: theme.textMuted }]}>Skip</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Adjust Edges</Text>
          <TouchableOpacity onPress={handleManualCropConfirm}>
            <Text style={[styles.headerButton, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.manualCropContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${cropImage}` }}
            style={styles.cropPreviewImage}
            resizeMode="contain"
          />
          <View style={styles.cropOverlay}>
            {/* SVG-like path between corners */}
            <View style={[styles.cropLine, {
              left: cropPoints[0].x,
              top: cropPoints[0].y,
              width: cropPoints[1].x - cropPoints[0].x,
              height: 3,
              backgroundColor: theme.primary,
            }]} />
            <View style={[styles.cropLine, {
              left: cropPoints[1].x,
              top: cropPoints[1].y,
              width: 3,
              height: cropPoints[2].y - cropPoints[1].y,
              backgroundColor: theme.primary,
            }]} />
            <View style={[styles.cropLine, {
              left: cropPoints[3].x,
              top: cropPoints[2].y,
              width: cropPoints[2].x - cropPoints[3].x,
              height: 3,
              backgroundColor: theme.primary,
            }]} />
            <View style={[styles.cropLine, {
              left: cropPoints[0].x,
              top: cropPoints[0].y,
              width: 3,
              height: cropPoints[3].y - cropPoints[0].y,
              backgroundColor: theme.primary,
            }]} />
            
            {cropPoints.map((point, index) => (
              <CropCorner key={index} index={index} position={point} />
            ))}
          </View>
        </View>

        <View style={styles.manualCropActions}>
          <TouchableOpacity
            style={[styles.cropActionButton, { backgroundColor: theme.surface }]}
            onPress={() => {
              setCropPoints([
                { x: 50, y: 50 },
                { x: SCREEN_WIDTH - 90, y: 50 },
                { x: SCREEN_WIDTH - 90, y: 350 },
                { x: 50, y: 350 },
              ]);
            }}
          >
            <Ionicons name="scan" size={20} color={theme.text} />
            <Text style={[styles.cropActionText, { color: theme.text }]}>Auto Detect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cropActionButton, { backgroundColor: theme.surface }]}
            onPress={handleManualCropSkip}
          >
            <Ionicons name="close" size={20} color={theme.text} />
            <Text style={[styles.cropActionText, { color: theme.text }]}>No Crop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {capturedImages.length === 0 ? (
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
              <TouchableOpacity
                style={[styles.toggleButton, autoCropEnabled && { backgroundColor: theme.primary + 'CC' }]}
                onPress={() => setAutoCropEnabled(!autoCropEnabled)}
              >
                <Ionicons name="crop" size={18} color={autoCropEnabled ? '#FFF' : '#94A3B8'} />
                <Text style={[styles.toggleText, autoCropEnabled && styles.toggleTextActive]}>Auto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setFlashMode(flashMode === 'off' ? 'on' : 'off')}
              >
                <Ionicons name={flashMode === 'off' ? 'flash-off' : 'flash'} size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Scan Frame */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft, { borderColor: theme.primary }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: theme.primary }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.primary }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: theme.primary }]} />
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomSection}>
              {/* Document Type Selector - Horizontal Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.docTypeScroll}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.type}
                    style={styles.docTypeItem}
                    onPress={() => setDocumentType(type.type)}
                  >
                    <Text style={[
                      styles.docTypeLabel,
                      { color: documentType === type.type ? theme.primary : '#94A3B8' },
                      documentType === type.type && styles.docTypeLabelActive
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
                  style={[styles.captureButton, isCapturing && styles.capturing]}
                  onPress={takePicture}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <ActivityIndicator color={theme.primary} size="small" />
                  ) : (
                    <View style={styles.captureInner} />
                  )}
                </TouchableOpacity>

                <View style={styles.sideButton}>
                  {capturedImages.length > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.badgeText}>{capturedImages.length}</Text>
                    </View>
                  )}
                  <Ionicons name="layers" size={26} color="#94A3B8" />
                </View>
              </View>
            </View>
          </SafeAreaView>
        </CameraView>
      ) : (
        <SafeAreaView style={[styles.previewContainer, { backgroundColor: theme.background }]}>
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
              onPress={() => setCapturedImages([])}
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
                <View style={[styles.reorderButtons, { backgroundColor: theme.background + 'E0' }]}>
                  {index > 0 && (
                    <TouchableOpacity style={styles.reorderBtn} onPress={() => moveImage(index, 'up')}>
                      <Ionicons name="arrow-up" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  )}
                  {index < capturedImages.length - 1 && (
                    <TouchableOpacity style={styles.reorderBtn} onPress={() => moveImage(index, 'down')}>
                      <Ionicons name="arrow-down" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.previewActions}>
            <Button
              title="Add More"
              variant="secondary"
              onPress={() => setCapturedImages([])}
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
      )}
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
    padding: 20,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  toggleText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#FFF',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    flex: 1,
    margin: 30,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 12,
  },
  bottomSection: {
    paddingBottom: 20,
  },
  docTypeScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 24,
  },
  docTypeItem: {
    paddingHorizontal: 4,
  },
  docTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  docTypeLabelActive: {
    fontWeight: '700',
  },
  captureBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  capturing: {
    opacity: 0.7,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
  },
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
  // Manual Crop Styles
  manualCropHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  manualCropContainer: {
    flex: 1,
    margin: 20,
    position: 'relative',
  },
  cropPreviewImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
    marginTop: 0,
  },
  cropCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  cropLine: {
    position: 'absolute',
  },
  manualCropActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    padding: 20,
  },
  cropActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  cropActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Preview Styles
  previewContainer: {
    flex: 1,
  },
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
  reorderButtons: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  reorderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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

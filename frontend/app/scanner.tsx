import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../src/store/authStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ScannerScreen() {
  const { token } = useAuthStore();
  const { createDocument } = useDocumentStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [autoCropEnabled, setAutoCropEnabled] = useState(true);
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
        let imageToAdd = photo.base64;

        // Try auto-crop if enabled
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
                params: {}
              }),
            });

            const result = await response.json();
            if (result.success) {
              imageToAdd = result.cropped_image_base64;
            }
          } catch (e) {
            console.log('Auto-crop not available, using original');
          }
        }

        setCapturedImages([...capturedImages, imageToAdd]);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
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
        .map((asset) => asset.base64 as string);
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
      const pages = capturedImages.map((imageBase64, index) => ({
        page_id: `page_${Date.now()}_${index}`,
        image_base64: imageBase64,
        filter_applied: 'original',
        rotation: 0,
        order: index,
        created_at: new Date().toISOString(),
      }));

      const docName = `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

      await createDocument(token!, {
        name: docName,
        pages,
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

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrapper}>
            <Ionicons name="camera" size={60} color="#3B82F6" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Please grant camera access to scan documents
          </Text>
          <Button
            title="Grant Permission"
            onPress={requestPermission}
            style={styles.permissionButton}
          />
          <Button
            title="Go Back"
            variant="secondary"
            onPress={() => router.back()}
            style={styles.permissionButton}
          />
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
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => router.back()}
              >
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
              
              <View style={styles.topBarCenter}>
                <TouchableOpacity
                  style={[styles.toggleButton, autoCropEnabled && styles.toggleActive]}
                  onPress={() => setAutoCropEnabled(!autoCropEnabled)}
                >
                  <Ionicons name="crop" size={18} color={autoCropEnabled ? '#FFF' : '#94A3B8'} />
                  <Text style={[styles.toggleText, autoCropEnabled && styles.toggleTextActive]}>
                    Auto Crop
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setFlashMode(flashMode === 'off' ? 'on' : 'off')}
              >
                <Ionicons
                  name={flashMode === 'off' ? 'flash-off' : 'flash'}
                  size={28}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>

            {/* Document Detection Frame */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Center guide text */}
              <View style={styles.guideContainer}>
                <Ionicons name="document-text-outline" size={40} color="rgba(59, 130, 246, 0.5)" />
                <Text style={styles.guideText}>
                  Position document within frame
                </Text>
              </View>
            </View>

            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
                <Ionicons name="images" size={28} color="#FFF" />
                <Text style={styles.bottomButtonText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureButton, isCapturing && styles.capturing]}
                onPress={takePicture}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#3B82F6" size="small" />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </TouchableOpacity>

              <View style={styles.bottomPlaceholder}>
                <Ionicons name="scan-outline" size={28} color="#94A3B8" />
                <Text style={styles.bottomButtonTextMuted}>Scan</Text>
              </View>
            </View>
          </SafeAreaView>
        </CameraView>
      ) : (
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setCapturedImages([])}
            >
              <Ionicons name="arrow-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>
              {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
            </Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setCapturedImages([])}
            >
              <Ionicons name="camera" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.previewScrollView}
            contentContainerStyle={styles.previewContent}
          >
            {capturedImages.map((image, index) => (
              <View key={index} style={styles.previewImageContainer}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${image}` }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={32} color="#EF4444" />
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
              onPress={() => setCapturedImages([])}
              style={styles.actionButton}
              icon={<Ionicons name="camera" size={20} color="#FFF" />}
            />
            <Button
              title="Save Document"
              onPress={saveDocument}
              loading={isSaving}
              style={[styles.actionButton, { flex: 2 }]}
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
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  toggleActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: '#3B82F6',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 16,
  },
  guideContainer: {
    alignItems: 'center',
    gap: 12,
  },
  guideText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 30,
    paddingTop: 20,
  },
  galleryButton: {
    alignItems: 'center',
    gap: 4,
  },
  bottomPlaceholder: {
    alignItems: 'center',
    gap: 4,
    opacity: 0.5,
  },
  bottomButtonText: {
    fontSize: 11,
    color: '#FFF',
  },
  bottomButtonTextMuted: {
    fontSize: 11,
    color: '#94A3B8',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#0F172A',
  },
  permissionIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    width: '100%',
    marginBottom: 12,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
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
    backgroundColor: '#1E293B',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#0F172A',
    borderRadius: 16,
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

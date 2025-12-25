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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../src/store/authStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';

export default function ScannerScreen() {
  const { token, user } = useAuthStore();
  const { createDocument, processImage } = useDocumentStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
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
        setCapturedImages([...capturedImages, photo.base64]);
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

            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
                <Ionicons name="images" size={28} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureButton, isCapturing && styles.capturing]}
                onPress={takePicture}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </TouchableOpacity>

              <View style={styles.placeholder} />
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
              style={styles.addMoreButton}
              onPress={() => setCapturedImages([])}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewContent}>
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
                  <Ionicons name="close-circle" size={28} color="#EF4444" />
                </TouchableOpacity>
                <View style={styles.pageNumber}>
                  <Text style={styles.pageNumberText}>{index + 1}</Text>
                </View>
              </View>
            ))}
          </View>

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
    padding: 20,
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
    margin: 40,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
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
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 30,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  placeholder: {
    width: 56,
    height: 56,
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
  addMoreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    flex: 1,
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

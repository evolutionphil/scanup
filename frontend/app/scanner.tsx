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
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';
import Svg, { Rect, Line, Path, Defs, Mask, Circle } from 'react-native-svg';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
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

interface NormalizedPoint {
  x: number;
  y: number;
}

// =============================================================================
// DOCUMENT TYPES CONFIGURATION
// =============================================================================

const DOCUMENT_TYPES: DocumentType[] = [
  { type: 'auto', label: 'Auto', icon: 'scan-outline', color: '#3B82F6', aspectRatio: 0, guide: 'Auto-detect document' },
  { type: 'a4', label: 'A4', icon: 'document-outline', color: '#8B5CF6', aspectRatio: 1.414, guide: 'A4 Document' },
  { type: 'letter', label: 'Letter', icon: 'document-text-outline', color: '#10B981', aspectRatio: 1.294, guide: 'US Letter' },
  { type: 'id', label: 'ID Card', icon: 'card-outline', color: '#F59E0B', aspectRatio: 0.631, guide: 'ID Card / Credit Card' },
  { type: 'receipt', label: 'Receipt', icon: 'receipt-outline', color: '#EC4899', aspectRatio: 2.5, guide: 'Receipt / Ticket' },
  { type: 'book', label: 'Book', icon: 'book-outline', color: '#6366F1', aspectRatio: 0.75, guide: 'Book Pages' },
];

// =============================================================================
// MAIN SCANNER COMPONENT
// =============================================================================

export default function ScannerScreen() {
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const { user, isGuest, token } = useAuthStore();
  const { addDocument, updateDocument, getDocument } = useDocumentStore();
  const insets = useSafeAreaInsets();
  
  // Permissions
  const [permission, requestPermission] = useCameraPermissions();
  
  // Camera state
  const [showCamera, setShowCamera] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const cameraRef = useRef<CameraView>(null);
  
  // Scanner state
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Edge detection state
  const [liveDetectedEdges, setLiveDetectedEdges] = useState<NormalizedPoint[] | null>(null);
  const [edgesDetected, setEdgesDetected] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoDetectStable, setAutoDetectStable] = useState(0);
  const liveDetectionRef = useRef<NodeJS.Timeout | null>(null);
  const isDetectingRef = useRef(false);
  const lastDetectionRef = useRef<string>('');
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const shutterSoundRef = useRef<Audio.Sound | null>(null);
  
  // Animation
  const scanningAnim = useRef(new Animated.Value(0)).current;
  
  const currentType = DOCUMENT_TYPES[selectedTypeIndex];
  const addToDocumentId = params.addToDocument as string | undefined;
  
  // Calculate frame dimensions based on document type
  const frameDimensions = useMemo(() => {
    const maxWidth = SCREEN_WIDTH * 0.85;
    const maxHeight = SCREEN_HEIGHT * 0.55;
    
    if (currentType.aspectRatio === 0) {
      // Auto mode - use a default frame
      return { width: maxWidth, height: maxWidth * 1.3 };
    }
    
    let width = maxWidth;
    let height = width * currentType.aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height / currentType.aspectRatio;
    }
    
    return { width, height };
  }, [currentType]);
  
  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('scanup_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setSoundEnabled(settings.soundEffects ?? true);
          setShowGridOverlay(settings.showGrid ?? false);
        }
      } catch (e) {
        console.log('Failed to load settings');
      }
    };
    
    const setupAudio = async () => {
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
      if (liveDetectionRef.current) {
        clearInterval(liveDetectionRef.current);
      }
    };
  }, []);
  
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
  // REAL-TIME EDGE DETECTION (Backend-based)
  // =============================================================================
  
  const performLiveEdgeDetection = useCallback(async () => {
    if (isDetectingRef.current || !showCamera || isCapturing || !cameraRef.current) {
      return;
    }
    
    isDetectingRef.current = true;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.1,
        base64: true,
        skipProcessing: true,
        exif: false,
      });
      
      if (!photo?.base64) {
        isDetectingRef.current = false;
        return;
      }
      
      const response = await fetch(`${BACKEND_URL}/api/images/detect-edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image_base64: photo.base64, 
          mode: currentType.type,
          fast_mode: true
        }),
      });
      
      if (!response.ok) {
        setLiveDetectedEdges(null);
        setEdgesDetected(false);
        isDetectingRef.current = false;
        return;
      }
      
      const result = await response.json();
      
      if (result.success && result.points && result.auto_detected) {
        const newEdges = result.points.map((c: any) => ({ x: c.x, y: c.y }));
        setLiveDetectedEdges(newEdges);
        setEdgesDetected(true);
        
        if (autoCapture) {
          const signature = result.points.map((c: any) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join('|');
          
          if (signature === lastDetectionRef.current) {
            setAutoDetectStable(prev => prev + 1);
          } else {
            setAutoDetectStable(1);
            lastDetectionRef.current = signature;
          }
        }
      } else {
        setLiveDetectedEdges(null);
        setEdgesDetected(false);
        if (autoCapture) {
          setAutoDetectStable(0);
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
  
  // Start/stop edge detection
  useEffect(() => {
    if (showCamera && !showPreview) {
      setTimeout(() => performLiveEdgeDetection(), 500);
      
      liveDetectionRef.current = setInterval(() => {
        performLiveEdgeDetection();
      }, 500);
    } else {
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
  }, [showCamera, showPreview, performLiveEdgeDetection]);
  
  // Auto-capture when stable
  useEffect(() => {
    if (autoCapture && edgesDetected && autoDetectStable >= 3 && !isCapturing) {
      console.log('[AutoCapture] Edges stable, triggering capture...');
      captureWithNativeScanner();
    }
  }, [autoCapture, edgesDetected, autoDetectStable, isCapturing]);
  
  // =============================================================================
  // CAPTURE USING NATIVE SCANNER (for best quality)
  // =============================================================================
  
  const captureWithNativeScanner = async () => {
    setIsCapturing(true);
    
    try {
      await playShutterSound();
      
      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 95,
        imageFileType: 'jpg',
      });
      
      if (result.scannedImages && result.scannedImages.length > 0) {
        const newImages: CapturedImage[] = [];
        
        for (const imagePath of result.scannedImages) {
          try {
            const fileUri = Platform.OS === 'android' ? `file://${imagePath}` : imagePath;
            
            const manipResult = await ImageManipulator.manipulateAsync(
              fileUri,
              [],
              { base64: true, compress: 0.9 }
            );
            
            newImages.push({
              uri: fileUri,
              base64: manipResult.base64 || '',
              width: manipResult.width,
              height: manipResult.height,
            });
          } catch (e) {
            console.error('Error processing scanned image:', e);
          }
        }
        
        if (newImages.length > 0) {
          setCapturedImages(prev => [...prev, ...newImages]);
          setShowPreview(true);
          setShowCamera(false);
        }
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled') {
        console.error('Scanner error:', error);
        // Fallback to manual capture
        captureManually();
      }
    } finally {
      setIsCapturing(false);
      setAutoDetectStable(0);
    }
  };
  
  // Manual capture fallback
  const captureManually = async () => {
    if (!cameraRef.current) return;
    
    setIsCapturing(true);
    
    try {
      await playShutterSound();
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
      });
      
      if (photo) {
        const newImage: CapturedImage = {
          uri: photo.uri,
          base64: photo.base64 || '',
          width: photo.width,
          height: photo.height,
        };
        
        setCapturedImages(prev => [...prev, newImage]);
        setShowPreview(true);
        setShowCamera(false);
      }
    } catch (error) {
      console.error('Manual capture error:', error);
      Alert.alert('Error', 'Failed to capture image');
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
        setShowCamera(false);
      }
    } catch (error) {
      console.error('Gallery picker error:', error);
      Alert.alert('Error', 'Failed to select images from gallery.');
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
        setShowCamera(true);
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
    
    setIsSaving(true);
    
    try {
      const documentData = {
        name: `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        pages: capturedImages.map((img, index) => ({
          page_number: index + 1,
          image_base64: img.base64,
          original_image_base64: img.base64,
          width: img.width,
          height: img.height,
        })),
        document_type: currentType.type,
        tags: [],
      };
      
      if (addToDocumentId) {
        const existingDoc = getDocument(addToDocumentId);
        if (existingDoc) {
          const newPages = capturedImages.map((img, index) => ({
            page_number: existingDoc.pages.length + index + 1,
            image_base64: img.base64,
            original_image_base64: img.base64,
            width: img.width,
            height: img.height,
          }));
          
          await updateDocument(addToDocumentId, {
            pages: [...existingDoc.pages, ...newPages],
          }, token || undefined);
        }
        router.back();
      } else {
        const newDocId = await addDocument(documentData, token || undefined);
        if (newDocId) {
          router.replace(`/document/${newDocId}`);
        } else {
          Alert.alert('Error', 'Failed to create document');
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Save Error', 'Failed to save document. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Toggle flash
  const toggleFlash = () => {
    setFlashMode(prev => prev === 'off' ? 'on' : 'off');
  };
  
  // Toggle auto capture
  const toggleAutoCapture = () => {
    setAutoCapture(prev => {
      if (!prev) {
        setAutoDetectStable(0);
        lastDetectionRef.current = '';
      }
      return !prev;
    });
  };
  
  // =============================================================================
  // PERMISSION CHECK
  // =============================================================================
  
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
          <Ionicons name="camera-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
            ScanUp needs camera access to scan your documents
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} style={{ marginTop: 20 }} />
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // =============================================================================
  // PREVIEW SCREEN
  // =============================================================================
  
  if (showPreview && capturedImages.length > 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.previewHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => {
            setShowPreview(false);
            setShowCamera(true);
          }} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.previewTitle, { color: theme.text }]}>
            {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
          </Text>
          <TouchableOpacity onPress={() => {
            setCapturedImages([]);
            setShowPreview(false);
            setShowCamera(true);
          }} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={24} color={theme.danger} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewGrid}>
          {capturedImages.map((img, index) => (
            <View key={index} style={styles.previewImageContainer}>
              <Image 
                source={{ uri: img.uri || `data:image/jpeg;base64,${img.base64}` }} 
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
            onPress={() => {
              setShowPreview(false);
              setShowCamera(true);
            }}
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
  // CAMERA VIEW
  // =============================================================================
  
  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flashMode}
      >
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          
          <View style={[styles.typeIndicator, { backgroundColor: currentType.color + '30' }]}>
            <Ionicons name={currentType.icon} size={16} color={currentType.color} />
            <Text style={[styles.typeText, { color: currentType.color }]}>{currentType.label}</Text>
          </View>
          
          <TouchableOpacity style={styles.iconBtn} onPress={toggleFlash}>
            <Ionicons name={flashMode === 'on' ? 'flash' : 'flash-off'} size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        {/* Document Frame & Edge Overlay */}
        <View style={styles.frameContainer}>
          {/* Live Edge Detection Overlay */}
          {liveDetectedEdges && liveDetectedEdges.length === 4 ? (
            <Svg
              style={StyleSheet.absoluteFill}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
            >
              {/* Dark overlay outside document */}
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
              
              <Rect
                x="0" y="0"
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                fill="rgba(0,0,0,0.5)"
                mask="url(#edgeMask)"
              />
              
              {/* Edge lines */}
              <Path
                d={`M ${liveDetectedEdges[0].x * SCREEN_WIDTH} ${liveDetectedEdges[0].y * SCREEN_HEIGHT}
                    L ${liveDetectedEdges[1].x * SCREEN_WIDTH} ${liveDetectedEdges[1].y * SCREEN_HEIGHT}
                    L ${liveDetectedEdges[2].x * SCREEN_WIDTH} ${liveDetectedEdges[2].y * SCREEN_HEIGHT}
                    L ${liveDetectedEdges[3].x * SCREEN_WIDTH} ${liveDetectedEdges[3].y * SCREEN_HEIGHT}
                    Z`}
                stroke="#10B981"
                strokeWidth={3}
                fill="transparent"
                strokeLinejoin="round"
              />
              
              {/* Corner circles */}
              {liveDetectedEdges.map((corner, index) => (
                <Circle
                  key={index}
                  cx={corner.x * SCREEN_WIDTH}
                  cy={corner.y * SCREEN_HEIGHT}
                  r={10}
                  fill="#10B981"
                  stroke="#FFF"
                  strokeWidth={2}
                />
              ))}
            </Svg>
          ) : (
            /* Document type frame when no edges detected */
            <View style={[styles.docFrame, { width: frameDimensions.width, height: frameDimensions.height }]}>
              {/* Grid overlay */}
              {showGridOverlay && (
                <View style={styles.gridOverlay}>
                  <View style={[styles.gridLine, styles.gridHorizontal, { top: '33%' }]} />
                  <View style={[styles.gridLine, styles.gridHorizontal, { top: '66%' }]} />
                  <View style={[styles.gridLine, styles.gridVertical, { left: '33%' }]} />
                  <View style={[styles.gridLine, styles.gridVertical, { left: '66%' }]} />
                </View>
              )}
              
              {/* Corner brackets */}
              <View style={[styles.corner, styles.tl, { borderColor: currentType.color }]} />
              <View style={[styles.corner, styles.tr, { borderColor: currentType.color }]} />
              <View style={[styles.corner, styles.bl, { borderColor: currentType.color }]} />
              <View style={[styles.corner, styles.br, { borderColor: currentType.color }]} />
            </View>
          )}
          
          <Text style={[styles.guideText, { color: liveDetectedEdges ? '#10B981' : currentType.color }]}>
            {liveDetectedEdges ? 'Document detected!' : currentType.guide}
          </Text>
        </View>
        
        {/* Auto-capture indicator */}
        {autoCapture && (
          <View style={styles.autoCaptureIndicator}>
            <View style={[styles.autoCaptureStatus, { backgroundColor: edgesDetected ? '#10B981' : '#F59E0B' }]}>
              <Ionicons name={edgesDetected ? 'checkmark-circle' : 'scan-outline'} size={16} color="#FFF" />
              <Text style={styles.autoCaptureText}>
                {edgesDetected ? `Auto-capture: ${autoDetectStable}/3` : 'Scanning...'}
              </Text>
            </View>
          </View>
        )}
        
        {/* Bottom Controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
          {/* Document Type Selector */}
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
                <Text style={[
                  styles.typeLabel,
                  { color: selectedTypeIndex === index ? type.color : '#94A3B8' }
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Main Buttons */}
          <View style={styles.mainButtons}>
            {/* Gallery Button */}
            <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery}>
              <View style={styles.sideBtnInner}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <Text style={styles.sideBtnText}>Gallery</Text>
            </TouchableOpacity>
            
            {/* Capture Button */}
            <TouchableOpacity 
              style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]} 
              onPress={captureWithNativeScanner}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator size="large" color="#FFF" />
              ) : (
                <View style={styles.captureBtnInner} />
              )}
            </TouchableOpacity>
            
            {/* Auto-capture Toggle */}
            <TouchableOpacity style={styles.sideBtn} onPress={toggleAutoCapture}>
              <View style={[
                styles.sideBtnInner,
                autoCapture && { backgroundColor: '#10B981' }
              ]}>
                <Ionicons name={autoCapture ? 'pause' : 'play'} size={24} color="#FFF" />
              </View>
              <Text style={styles.sideBtnText}>{autoCapture ? 'Auto On' : 'Auto'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Pages indicator */}
          {capturedImages.length > 0 && (
            <TouchableOpacity 
              style={styles.pagesIndicator}
              onPress={() => {
                setShowPreview(true);
                setShowCamera(false);
              }}
            >
              <View style={styles.pagesIndicatorInner}>
                <Text style={styles.pagesCount}>{capturedImages.length}</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFF" />
              </View>
              <Text style={styles.pagesText}>Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
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
  
  // Permission
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
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
  
  // Frame Container
  frameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docFrame: {
    borderWidth: 0,
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
  gridHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  
  guideText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  
  // Auto-capture Indicator
  autoCaptureIndicator: {
    position: 'absolute',
    bottom: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  autoCaptureStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  autoCaptureText: {
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
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
  },
  
  // Pages Indicator
  pagesIndicator: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    alignItems: 'center',
  },
  pagesIndicatorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  pagesCount: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pagesText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  
  // Preview Screen
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

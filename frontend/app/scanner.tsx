import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { useDocumentStore } from '../src/store/documentStore';
import Button from '../src/components/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =============================================================================
// TYPES
// =============================================================================

interface CapturedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
  filter: string;
}

interface DocumentType {
  type: string;
  label: string;
  icon: any;
  color: string;
}

// =============================================================================
// FILTERS
// =============================================================================

const FILTERS = [
  { id: 'original', label: 'Original', icon: 'image-outline' },
  { id: 'grayscale', label: 'B&W', icon: 'contrast-outline' },
  { id: 'enhanced', label: 'Enhanced', icon: 'sunny-outline' },
  { id: 'document', label: 'Document', icon: 'document-outline' },
];

const DOCUMENT_TYPES: DocumentType[] = [
  { type: 'auto', label: 'Auto', icon: 'scan-outline', color: '#3B82F6' },
  { type: 'a4', label: 'A4', icon: 'document-outline', color: '#8B5CF6' },
  { type: 'id', label: 'ID Card', icon: 'card-outline', color: '#F59E0B' },
  { type: 'receipt', label: 'Receipt', icon: 'receipt-outline', color: '#EC4899' },
];

// =============================================================================
// MAIN SCANNER COMPONENT
// =============================================================================

export default function ScannerScreen() {
  const params = useLocalSearchParams();
  const { theme } = useThemeStore();
  const { token } = useAuthStore();
  const { createDocumentLocalFirst, updateDocument, documents } = useDocumentStore();
  const insets = useSafeAreaInsets();
  
  // State
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('original');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef<any>(null);
  
  const currentType = DOCUMENT_TYPES[selectedTypeIndex];
  const addToDocumentId = params.addToDocument as string | undefined;
  
  // Load settings and audio
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('scanup_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setSoundEnabled(settings.soundEffects ?? true);
        }
      } catch (e) {
        console.log('Failed to load settings');
      }
    };
    
    const setupAudio = async () => {
      try {
        const { Audio } = require('expo-av');
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/shutter.mp3')
        );
        soundRef.current = sound;
      } catch (e) {
        // Ignore audio errors
      }
    };
    
    loadSettings();
    setupAudio();
    
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);
  
  // Auto-open scanner on mount if no images
  useEffect(() => {
    if (capturedImages.length === 0) {
      // Small delay to let the screen render first
      const timer = setTimeout(() => {
        openDocumentScanner();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // =============================================================================
  // DOCUMENT SCANNER - Uses react-native-document-scanner-plugin
  // =============================================================================
  
  const openDocumentScanner = async () => {
    if (isScanning) return;
    setIsScanning(true);
    
    try {
      // Play sound
      if (soundEnabled && soundRef.current) {
        try {
          await soundRef.current.replayAsync();
        } catch (e) {}
      }
      
      // Import the document scanner
      const DocumentScanner = require('react-native-document-scanner-plugin').default;
      
      // Open the scanner with real-time edge detection
      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: 20,
        croppedImageQuality: 100,
        responseType: 'base64',
      });
      
      if (result?.scannedImages && result.scannedImages.length > 0) {
        const newImages: CapturedImage[] = result.scannedImages.map((imageData: string) => {
          let base64Data = imageData;
          if (base64Data.startsWith('data:')) {
            base64Data = base64Data.split(',')[1];
          }
          return {
            uri: `data:image/jpeg;base64,${base64Data}`,
            base64: base64Data,
            width: 0,
            height: 0,
            filter: 'original',
          };
        });
        
        setCapturedImages(prev => [...prev, ...newImages]);
        setSelectedImageIndex(capturedImages.length); // Select first new image
      } else if (result?.status === 'cancel') {
        // User cancelled - if no images, go back
        if (capturedImages.length === 0) {
          router.back();
        }
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled' && error.message !== 'Canceled') {
        console.error('[Scanner] Error:', error);
        Alert.alert('Scanner Error', error.message || 'Failed to open scanner');
      } else if (capturedImages.length === 0) {
        // User cancelled and no images - go back
        router.back();
      }
    } finally {
      setIsScanning(false);
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
          filter: 'original',
        }));
        
        setCapturedImages(prev => [...prev, ...newImages]);
      }
    } catch (error: any) {
      console.error('[Scanner] Gallery error:', error);
      Alert.alert('Error', 'Failed to select images');
    }
  };
  
  // =============================================================================
  // APPLY FILTER
  // =============================================================================
  
  const applyFilter = async (filterId: string) => {
    if (capturedImages.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setSelectedFilter(filterId);
    
    try {
      const currentImage = capturedImages[selectedImageIndex];
      let manipulations: ImageManipulator.Action[] = [];
      
      // Note: ImageManipulator has limited filter options
      // For real filters, you'd need a more advanced library
      // This is a simplified version
      
      if (filterId === 'grayscale') {
        // Convert to grayscale by desaturating
        // ImageManipulator doesn't support grayscale directly,
        // but we can mark it for backend processing
      }
      
      // For now, just update the filter tag
      // Real filtering would require backend processing or a native module
      const updatedImages = [...capturedImages];
      updatedImages[selectedImageIndex] = {
        ...currentImage,
        filter: filterId,
      };
      setCapturedImages(updatedImages);
      
    } catch (error) {
      console.error('[Scanner] Filter error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // =============================================================================
  // REMOVE IMAGE
  // =============================================================================
  
  const removeImage = (index: number) => {
    setCapturedImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      if (selectedImageIndex >= newImages.length) {
        setSelectedImageIndex(Math.max(0, newImages.length - 1));
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
    
    const validImages = capturedImages.filter(img => img.base64 && img.base64.length > 100);
    if (validImages.length === 0) {
      Alert.alert('Error', 'No valid images to save.');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const documentData = {
        name: `Scan ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        pages: validImages.map((img, index) => ({
          page_number: index + 1,
          image_base64: img.base64,
          original_image_base64: img.base64,
          width: img.width || 0,
          height: img.height || 0,
          filter: img.filter,
        })),
        document_type: currentType.type,
        tags: [],
      };
      
      if (addToDocumentId) {
        const existingDoc = documents.find(d => d.document_id === addToDocumentId);
        if (existingDoc) {
          const newPages = validImages.map((img, index) => ({
            page_number: existingDoc.pages.length + index + 1,
            image_base64: img.base64,
            original_image_base64: img.base64,
            width: img.width || 0,
            height: img.height || 0,
          }));
          
          await updateDocument(token || null, addToDocumentId, {
            pages: [...existingDoc.pages, ...newPages],
          });
        }
        router.back();
      } else {
        const newDoc = await createDocumentLocalFirst(token || null, documentData);
        if (newDoc && newDoc.document_id) {
          router.replace(`/document/${newDoc.document_id}`);
        } else {
          throw new Error('Failed to create document');
        }
      }
    } catch (error: any) {
      console.error('[Scanner] Save error:', error);
      Alert.alert('Save Error', error.message || 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };
  
  // =============================================================================
  // RENDER - No images yet (scanning mode)
  // =============================================================================
  
  if (capturedImages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <SafeAreaView style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            {isScanning ? (
              <>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Opening Scanner...</Text>
              </>
            ) : (
              <>
                <Ionicons name="scan" size={64} color="#3B82F6" />
                <Text style={styles.loadingTitle}>ScanUp</Text>
                <Text style={styles.loadingText}>Preparing document scanner...</Text>
              </>
            )}
          </View>
          
          {/* Bottom buttons */}
          <View style={[styles.emptyBottomBar, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#FFF" />
              <Text style={styles.emptyBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.emptyBtn, styles.emptyBtnPrimary]} 
              onPress={openDocumentScanner}
              disabled={isScanning}
            >
              <Ionicons name="scan" size={24} color="#FFF" />
              <Text style={styles.emptyBtnText}>Scan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.emptyBtn} onPress={pickFromGallery}>
              <Ionicons name="images" size={24} color="#FFF" />
              <Text style={styles.emptyBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }
  
  // =============================================================================
  // RENDER - Review & Edit Screen (YOUR CUSTOM UI)
  // =============================================================================
  
  const currentImage = capturedImages[selectedImageIndex];
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.headerBtn} 
          onPress={() => {
            Alert.alert(
              'Discard Scan?',
              'Are you sure you want to discard all scanned pages?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => router.back() },
              ]
            );
          }}
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {capturedImages.length} {capturedImages.length === 1 ? 'Page' : 'Pages'}
        </Text>
        
        <TouchableOpacity 
          style={styles.headerBtn}
          onPress={() => removeImage(selectedImageIndex)}
        >
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
      
      {/* Main Image Preview */}
      <View style={styles.previewContainer}>
        <Image
          source={{ uri: currentImage.uri }}
          style={styles.mainPreview}
          resizeMode="contain"
        />
        
        {/* Filter badge */}
        {currentImage.filter !== 'original' && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              {FILTERS.find(f => f.id === currentImage.filter)?.label || currentImage.filter}
            </Text>
          </View>
        )}
        
        {/* Page indicator */}
        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>
            {selectedImageIndex + 1} / {capturedImages.length}
          </Text>
        </View>
      </View>
      
      {/* Thumbnails */}
      <View style={styles.thumbnailSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailScroll}
        >
          {capturedImages.map((img, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.thumbnail,
                selectedImageIndex === index && styles.thumbnailSelected,
              ]}
              onPress={() => setSelectedImageIndex(index)}
            >
              <Image 
                source={{ uri: img.uri }} 
                style={styles.thumbnailImage} 
                resizeMode="cover"
              />
              <View style={styles.thumbnailNumber}>
                <Text style={styles.thumbnailNumberText}>{index + 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
          
          {/* Add more button */}
          <TouchableOpacity 
            style={styles.addMoreBtn}
            onPress={openDocumentScanner}
            disabled={isScanning}
          >
            <Ionicons name="add" size={32} color="#3B82F6" />
            <Text style={styles.addMoreText}>Add</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {/* Filter Options */}
      <View style={[styles.filterSection, { borderTopColor: theme.border }]}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Filter</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterBtn,
                selectedFilter === filter.id && styles.filterBtnActive,
              ]}
              onPress={() => applyFilter(filter.id)}
              disabled={isProcessing}
            >
              <Ionicons 
                name={filter.icon} 
                size={20} 
                color={selectedFilter === filter.id ? '#FFF' : theme.text} 
              />
              <Text style={[
                styles.filterLabel,
                { color: selectedFilter === filter.id ? '#FFF' : theme.text }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Document Type */}
      <View style={styles.typeSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Document Type</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeScroll}
        >
          {DOCUMENT_TYPES.map((type, index) => (
            <TouchableOpacity
              key={type.type}
              style={[
                styles.typeBtn,
                selectedTypeIndex === index && { 
                  backgroundColor: type.color + '20',
                  borderColor: type.color,
                }
              ]}
              onPress={() => setSelectedTypeIndex(index)}
            >
              <Ionicons 
                name={type.icon} 
                size={18} 
                color={selectedTypeIndex === index ? type.color : theme.textSecondary} 
              />
              <Text style={[
                styles.typeLabel,
                { color: selectedTypeIndex === index ? type.color : theme.textSecondary }
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Save Button */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity 
          style={styles.galleryBtn}
          onPress={pickFromGallery}
        >
          <Ionicons name="images-outline" size={24} color={theme.primary} />
        </TouchableOpacity>
        
        <Button 
          title={addToDocumentId ? "Add to Document" : "Save Document"}
          onPress={saveDocument}
          loading={isSaving}
          style={styles.saveBtn}
          icon={<Ionicons name="checkmark-circle" size={20} color="#FFF" />}
        />
      </View>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Loading / Empty state
  loadingContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 8,
  },
  emptyBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyBtn: {
    alignItems: 'center',
    padding: 16,
  },
  emptyBtnPrimary: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 32,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 4,
  },
  
  // Header
  header: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Preview
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  mainPreview: {
    flex: 1,
    width: '100%',
  },
  filterBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pageIndicatorText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Thumbnails
  thumbnailSection: {
    paddingVertical: 12,
  },
  thumbnailScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: '#3B82F6',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailNumber: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailNumberText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  addMoreBtn: {
    width: 60,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Filters
  filterSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  filterScroll: {
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: '#3B82F6',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Document Type
  typeSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typeScroll: {
    gap: 8,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 6,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    alignItems: 'center',
  },
  galleryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
  },
});

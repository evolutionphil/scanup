import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/themeStore';
import Slider from './Slider';
import Button from './Button';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Backend URL for filter processing
const BACKEND_URL = 
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://scanup-production.up.railway.app';

const FILTER_PRESETS = [
  { id: 'original', name: 'Original', icon: 'image' },
  { id: 'enhanced', name: 'Auto', icon: 'color-wand' },
  { id: 'grayscale', name: 'Gray', icon: 'contrast' },
  { id: 'bw', name: 'B&W', icon: 'moon' },
  { id: 'document', name: 'Doc', icon: 'document-text' },
];

// Helper to load image base64 from URL
const loadImageFromUrl = async (url: string): Promise<string> => {
  try {
    console.log('[FilterEditor] Loading image from URL...');
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[FilterEditor] Failed to load from URL:', error);
    return '';
  }
};

interface FilterEditorProps {
  visible: boolean;
  onClose: () => void;
  imageBase64: string;
  imageUrl?: string;
  imageFileUri?: string;
  originalImageBase64?: string;
  currentFilter?: string;
  onApply: (filter: string, adjustments: { brightness: number; contrast: number; saturation: number }, processedImage?: string) => void;
  token?: string | null;
}

export default function FilterEditor({
  visible,
  onClose,
  imageBase64,
  imageUrl,
  imageFileUri,
  originalImageBase64,
  currentFilter = 'original',
  onApply,
  token,
}: FilterEditorProps) {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  
  const [selectedFilter, setSelectedFilter] = useState(currentFilter);
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [loadedBase64, setLoadedBase64] = useState<string>('');
  
  // Preview state
  const [previewImage, setPreviewImage] = useState<string>(imageBase64);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load image from URL/file when modal opens
  useEffect(() => {
    const loadImage = async () => {
      if (!visible) return;
      
      if (imageBase64 && imageBase64.length > 100) {
        setLoadedBase64(imageBase64);
        return;
      }
      
      setIsLoadingImage(true);
      
      if (imageFileUri && Platform.OS !== 'web') {
        try {
          const fileInfo = await FileSystem.getInfoAsync(imageFileUri);
          if (fileInfo.exists) {
            const base64 = await FileSystem.readAsStringAsync(imageFileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            console.log('[FilterEditor] Loaded from file URI');
            setLoadedBase64(base64);
            setIsLoadingImage(false);
            return;
          }
        } catch (e) {
          console.error('[FilterEditor] Failed to load from file:', e);
        }
      }
      
      if (imageUrl) {
        const base64 = await loadImageFromUrl(imageUrl);
        if (base64) {
          setLoadedBase64(base64);
        }
      }
      
      setIsLoadingImage(false);
    };
    
    loadImage();
  }, [visible, imageBase64, imageUrl, imageFileUri]);

  const effectiveImageBase64 = loadedBase64 || imageBase64;

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedFilter(currentFilter || 'original');
      setBrightness(50);
      setContrast(50);
      setSaturation(50);
      setPreviewImage(originalImageBase64 || effectiveImageBase64);
    }
  }, [visible, currentFilter, effectiveImageBase64, originalImageBase64]);

  /**
   * Process filter using backend API
   * This ensures filters work correctly on all platforms
   */
  const processFilterWithBackend = useCallback(async (
    base64Image: string,
    filter: string,
    adjustments: { brightness: number; contrast: number; saturation: number }
  ): Promise<string> => {
    try {
      const cleanBase64 = base64Image.startsWith('data:') 
        ? base64Image.split(',')[1] 
        : base64Image;
      
      // For original with no adjustments, return as-is
      if (filter === 'original' && 
          adjustments.brightness === 0 && 
          adjustments.contrast === 0 && 
          adjustments.saturation === 0) {
        return cleanBase64;
      }
      
      console.log('[FilterEditor] Processing filter via backend:', filter);
      
      const endpoint = `${BACKEND_URL}/api/images/apply-filter`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_base64: cleanBase64,
          filter_type: filter,
          brightness: adjustments.brightness,
          contrast: adjustments.contrast,
          saturation: adjustments.saturation,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.image_base64) {
          console.log('[FilterEditor] Filter applied successfully');
          return result.image_base64;
        }
      }
      
      console.warn('[FilterEditor] Backend filter failed');
      return cleanBase64;
    } catch (error) {
      console.error('[FilterEditor] Backend processing error:', error);
      return base64Image.startsWith('data:') ? base64Image.split(',')[1] : base64Image;
    }
  }, [token]);

  // Live preview - debounced
  const updatePreview = useCallback(async (filter: string, b: number, c: number, s: number) => {
    const baseImage = originalImageBase64 || effectiveImageBase64;
    
    if (!baseImage || baseImage.length < 100) {
      console.log('[FilterEditor] No image data for preview');
      return;
    }
    
    // For original with no adjustments, show original
    if (filter === 'original' && b === 50 && c === 50 && s === 50) {
      setPreviewImage(baseImage);
      return;
    }

    setIsLoadingPreview(true);
    
    try {
      const processed = await processFilterWithBackend(baseImage, filter, {
        brightness: b - 50,
        contrast: c - 50,
        saturation: s - 50,
      });
      
      if (processed && processed.length > 100) {
        setPreviewImage(processed);
      }
    } catch (error) {
      console.error('[FilterEditor] Preview error:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [effectiveImageBase64, originalImageBase64, processFilterWithBackend]);

  // Debounced preview update
  useEffect(() => {
    if (!visible) return;
    
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    previewTimeoutRef.current = setTimeout(() => {
      updatePreview(selectedFilter, brightness, contrast, saturation);
    }, 300);
    
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, [selectedFilter, brightness, contrast, saturation, visible, updatePreview]);

  const handleApply = () => {
    // Pass the processed preview image along with the settings
    const processedImage = previewImage || effectiveImageBase64;
    onApply(selectedFilter, {
      brightness: brightness - 50,
      contrast: contrast - 50,
      saturation: saturation - 50,
    }, processedImage);
  };

  const handleRevertToOriginal = () => {
    setBrightness(50);
    setContrast(50);
    setSaturation(50);
    setSelectedFilter('original');
    onApply('original', { brightness: 0, contrast: 0, saturation: 0 });
  };

  const handleReset = () => {
    setBrightness(50);
    setContrast(50);
    setSaturation(50);
    setSelectedFilter('original');
    setPreviewImage(originalImageBase64 || effectiveImageBase64);
  };

  const getImageUri = (base64: string) => {
    if (!base64) return '';
    if (base64.startsWith('data:')) return base64;
    if (base64.startsWith('http')) return base64;
    if (base64.startsWith('file://')) return base64;
    return `data:image/jpeg;base64,${base64}`;
  };

  // Loading state
  if (visible && isLoadingImage) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.content, { backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text, marginTop: 16 }]}>Loading image...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.content, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }]}>Edit Filter</Text>
              <TouchableOpacity onPress={handleApply} style={styles.headerButton}>
                <Text style={[styles.applyText, { color: theme.primary }]}>Apply</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Live Preview */}
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: getImageUri(previewImage) }}
                  style={styles.preview}
                  resizeMode="contain"
                />
                {isLoadingPreview && (
                  <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={styles.processingText}>Updating preview...</Text>
                  </View>
                )}
                <View style={[styles.livePreviewBadge, { backgroundColor: theme.success + '20' }]}>
                  <Ionicons name="eye" size={12} color={theme.success} />
                  <Text style={[styles.livePreviewText, { color: theme.success }]}>Live Preview</Text>
                </View>
              </View>

              {/* Filter Presets */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Filters</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                  {FILTER_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.presetButton,
                        { borderColor: selectedFilter === preset.id ? theme.primary : theme.border },
                        selectedFilter === preset.id && { backgroundColor: theme.primary + '20' }
                      ]}
                      onPress={() => setSelectedFilter(preset.id)}
                    >
                      <Ionicons 
                        name={preset.icon as any} 
                        size={24} 
                        color={selectedFilter === preset.id ? theme.primary : theme.textMuted}
                      />
                      <Text style={[
                        styles.presetLabel,
                        { color: selectedFilter === preset.id ? theme.primary : theme.textMuted }
                      ]}>
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Adjustments */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Adjustments</Text>
                
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderHeader}>
                    <Ionicons name="sunny" size={18} color={theme.textMuted} />
                    <Text style={[styles.sliderLabel, { color: theme.text }]}>Brightness</Text>
                    <Text style={[styles.sliderValue, { color: theme.textMuted }]}>{brightness - 50}</Text>
                  </View>
                  <Slider
                    value={brightness}
                    onValueChange={setBrightness}
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    trackColor={theme.border}
                    activeColor={theme.primary}
                  />
                </View>
                
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderHeader}>
                    <Ionicons name="contrast" size={18} color={theme.textMuted} />
                    <Text style={[styles.sliderLabel, { color: theme.text }]}>Contrast</Text>
                    <Text style={[styles.sliderValue, { color: theme.textMuted }]}>{contrast - 50}</Text>
                  </View>
                  <Slider
                    value={contrast}
                    onValueChange={setContrast}
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    trackColor={theme.border}
                    activeColor={theme.primary}
                  />
                </View>
                
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderHeader}>
                    <Ionicons name="color-palette" size={18} color={theme.textMuted} />
                    <Text style={[styles.sliderLabel, { color: theme.text }]}>Saturation</Text>
                    <Text style={[styles.sliderValue, { color: theme.textMuted }]}>{saturation - 50}</Text>
                  </View>
                  <Slider
                    value={saturation}
                    onValueChange={setSaturation}
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    trackColor={theme.border}
                    activeColor={theme.primary}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.border }]} 
                  onPress={handleReset}
                >
                  <Ionicons name="refresh" size={20} color={theme.text} />
                  <Text style={[styles.actionButtonText, { color: theme.text }]}>Reset</Text>
                </TouchableOpacity>
                
                {originalImageBase64 && (
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#EF4444' + '20' }]} 
                    onPress={handleRevertToOriginal}
                  >
                    <Ionicons name="arrow-undo" size={20} color="#EF4444" />
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Revert</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    height: 200,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
    marginTop: 16,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
  },
  livePreviewBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  livePreviewText: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  presetsScroll: {
    flexDirection: 'row',
  },
  presetButton: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  presetLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
  },
});

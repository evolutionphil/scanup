import React, { useState, useEffect, useCallback } from 'react';
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

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FilterValues {
  brightness: number;
  contrast: number;
  saturation: number;
  filterType: string;
}

const FILTER_PRESETS = [
  { id: 'original', name: 'Original', icon: 'image' },
  { id: 'enhanced', name: 'Auto', icon: 'color-wand' },
  { id: 'grayscale', name: 'Gray', icon: 'contrast' },
  { id: 'bw', name: 'B&W', icon: 'moon' },
  { id: 'document', name: 'Doc', icon: 'document-text' },
];

interface FilterEditorProps {
  visible: boolean;
  onClose: () => void;
  imageBase64: string;
  originalImageBase64?: string;
  currentFilter: string;
  onApply: (filterType: string, adjustments: { brightness: number; contrast: number; saturation: number }) => void;
  isProcessing?: boolean;
  token?: string | null;
}

export default function FilterEditor({
  visible,
  onClose,
  imageBase64,
  originalImageBase64,
  currentFilter,
  onApply,
  isProcessing = false,
  token,
}: FilterEditorProps) {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState(currentFilter || 'original');
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Live preview state
  const [previewImage, setPreviewImage] = useState<string>(imageBase64);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const previewTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedFilter(currentFilter || 'original');
      setBrightness(50);
      setContrast(50);
      setSaturation(50);
      // Start with original image for preview
      setPreviewImage(originalImageBase64 || imageBase64);
    }
  }, [visible, currentFilter, imageBase64, originalImageBase64]);

  // Live preview - debounced
  const updatePreview = useCallback(async (filter: string, b: number, c: number, s: number) => {
    // Use original image as base for preview
    const baseImage = originalImageBase64 || imageBase64;
    
    // For "original" filter with no adjustments, show original
    if (filter === 'original' && b === 50 && c === 50 && s === 50) {
      setPreviewImage(baseImage);
      return;
    }

    setIsLoadingPreview(true);
    try {
      // Use public endpoint if no token (guest users)
      const endpoint = token 
        ? `${BACKEND_URL}/api/images/process`
        : `${BACKEND_URL}/api/images/process-public`;
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image_base64: baseImage,
          operation: 'filter',
          params: {
            type: filter,
            brightness: b - 50,
            contrast: c - 50,
            saturation: s - 50,
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.processed_image_base64) {
          setPreviewImage(result.processed_image_base64);
        }
      }
    } catch (e) {
      console.error('Preview error:', e);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [token, imageBase64, originalImageBase64]);

  // Debounced preview update
  useEffect(() => {
    if (!visible) return;

    // Clear existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Set new timeout for debounced update
    previewTimeoutRef.current = setTimeout(() => {
      updatePreview(selectedFilter, brightness, contrast, saturation);
    }, 300); // 300ms debounce

    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, [selectedFilter, brightness, contrast, saturation, visible, updatePreview]);

  const handleApply = () => {
    onApply(selectedFilter, {
      brightness: brightness - 50,
      contrast: contrast - 50,
      saturation: saturation - 50,
    });
  };

  const handleRevertToOriginal = () => {
    setBrightness(50);
    setContrast(50);
    setSaturation(50);
    setSelectedFilter('original');
    // Apply original immediately
    onApply('original', { brightness: 0, contrast: 0, saturation: 0 });
  };

  const handleReset = () => {
    setBrightness(50);
    setContrast(50);
    setSaturation(50);
    setSelectedFilter('original');
    // Update preview to original
    setPreviewImage(originalImageBase64 || imageBase64);
  };

  // Ensure image has proper prefix
  const getImageUri = (base64: string) => {
    if (!base64) return '';
    if (base64.startsWith('data:')) return base64;
    if (base64.startsWith('http')) return base64;
    return `data:image/jpeg;base64,${base64}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View style={[
            styles.content, 
            { 
              backgroundColor: theme.surface,
              paddingBottom: Math.max(insets.bottom, 20) + 16,
            }
          ]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.text }]}>Adjust & Filter</Text>
              <TouchableOpacity onPress={handleReset} style={styles.headerBtn}>
                <Text style={[styles.resetText, { color: theme.primary }]}>Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Live Preview */}
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: getImageUri(previewImage) }}
                style={styles.preview}
                resizeMode="contain"
              />
              {(isProcessing || isLoadingPreview) && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={styles.processingText}>
                    {isProcessing ? 'Applying...' : 'Updating preview...'}
                  </Text>
                </View>
              )}
              <View style={[styles.livePreviewBadge, { backgroundColor: theme.success + '20' }]}>
                <Ionicons name="eye" size={12} color={theme.success} />
                <Text style={[styles.livePreviewText, { color: theme.success }]}>Live Preview</Text>
              </View>
            </View>

            {/* Filter Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
              <View style={styles.presets}>
                {FILTER_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetItem,
                      { backgroundColor: theme.background },
                      selectedFilter === preset.id && { borderColor: theme.primary, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedFilter(preset.id)}
                  >
                    <View style={[
                      styles.presetIcon,
                      { backgroundColor: selectedFilter === preset.id ? theme.primary + '20' : theme.surfaceVariant || theme.surface },
                    ]}>
                      <Ionicons
                        name={preset.icon as any}
                        size={22}
                        color={selectedFilter === preset.id ? theme.primary : theme.textMuted}
                      />
                    </View>
                    <Text style={[
                      styles.presetName,
                      { color: selectedFilter === preset.id ? theme.primary : theme.textMuted },
                    ]}>
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Advanced Toggle */}
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={[styles.advancedText, { color: theme.textSecondary }]}>
                Fine-tune adjustments
              </Text>
              <Ionicons
                name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {/* Sliders */}
            {showAdvanced && (
              <View style={styles.sliders}>
                <Slider
                  label="Brightness"
                  value={brightness}
                  onValueChange={setBrightness}
                  minimumValue={0}
                  maximumValue={100}
                  valueFormatter={(v) => `${v > 50 ? '+' : ''}${Math.round(v - 50)}`}
                />
                <Slider
                  label="Contrast"
                  value={contrast}
                  onValueChange={setContrast}
                  minimumValue={0}
                  maximumValue={100}
                  valueFormatter={(v) => `${v > 50 ? '+' : ''}${Math.round(v - 50)}`}
                />
                <Slider
                  label="Saturation"
                  value={saturation}
                  onValueChange={setSaturation}
                  minimumValue={0}
                  maximumValue={100}
                  valueFormatter={(v) => `${v > 50 ? '+' : ''}${Math.round(v - 50)}`}
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Button
                title="Revert to Original"
                variant="secondary"
                onPress={handleRevertToOriginal}
                style={styles.revertButton}
                icon={<Ionicons name="refresh" size={18} color={theme.primary} />}
              />
              <Button
                title="Apply"
                onPress={handleApply}
                loading={isProcessing}
                disabled={isProcessing}
                style={styles.applyButton}
                icon={!isProcessing ? <Ionicons name="checkmark" size={18} color="#FFF" /> : undefined}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerBtn: {
    minWidth: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  resetText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  previewContainer: {
    height: 200,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFF',
    marginTop: 8,
    fontSize: 14,
  },
  livePreviewBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  livePreviewText: {
    fontSize: 11,
    fontWeight: '600',
  },
  presetsScroll: {
    marginBottom: 12,
  },
  presets: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  presetItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    minWidth: 70,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  presetName: {
    fontSize: 12,
    fontWeight: '500',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  advancedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sliders: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  revertButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});

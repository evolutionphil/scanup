import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import Slider from './Slider';
import Button from './Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
}

export default function FilterEditor({
  visible,
  onClose,
  imageBase64,
  originalImageBase64,
  currentFilter,
  onApply,
  isProcessing = false,
}: FilterEditorProps) {
  const { theme } = useThemeStore();
  const [selectedFilter, setSelectedFilter] = useState(currentFilter || 'original');
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedFilter(currentFilter || 'original');
      setBrightness(50);
      setContrast(50);
      setSaturation(50);
    }
  }, [visible, currentFilter]);

  const handleApply = () => {
    onApply(selectedFilter, {
      brightness: brightness - 50, // -50 to +50
      contrast: contrast - 50,
      saturation: saturation - 50,
    });
  };

  const handleReset = () => {
    setBrightness(50);
    setContrast(50);
    setSaturation(50);
    setSelectedFilter('original');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.content, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>Adjust & Filter</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={[styles.resetText, { color: theme.primary }]}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
              style={styles.preview}
              resizeMode="contain"
            />
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
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
                    { backgroundColor: selectedFilter === preset.id ? theme.primary + '20' : theme.surfaceVariant },
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
            {originalImageBase64 && (
              <Button
                title="Revert to Original"
                variant="secondary"
                onPress={() => {
                  handleReset();
                  onApply('original', { brightness: 0, contrast: 0, saturation: 0 });
                }}
                style={styles.actionButton}
              />
            )}
            <Button
              title="Apply"
              onPress={handleApply}
              loading={isProcessing}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
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
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
    position: 'relative',
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
  presetsScroll: {
    marginBottom: 16,
  },
  presets: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  presetItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  advancedText: {
    fontSize: 14,
  },
  sliders: {
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});

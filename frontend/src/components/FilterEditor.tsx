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
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const webViewRef = useRef<WebView>(null);
  
  const [selectedFilter, setSelectedFilter] = useState(currentFilter);
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [loadedBase64, setLoadedBase64] = useState<string>('');
  
  // Preview and processed image state
  const [processedImage, setProcessedImage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load image from URL/file when modal opens
  useEffect(() => {
    const loadImage = async () => {
      if (!visible) return;
      
      if (imageBase64 && imageBase64.length > 100) {
        setLoadedBase64(imageBase64);
        setProcessedImage(imageBase64);
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
            setProcessedImage(base64);
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
          setProcessedImage(base64);
        }
      }
      
      setIsLoadingImage(false);
    };
    
    loadImage();
  }, [visible, imageBase64, imageUrl, imageFileUri]);

  const effectiveImageBase64 = loadedBase64 || imageBase64;
  const baseImage = originalImageBase64 || effectiveImageBase64;

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedFilter(currentFilter || 'original');
      setBrightness(50);
      setContrast(50);
      setSaturation(50);
      setProcessedImage(baseImage);
    }
  }, [visible, currentFilter, baseImage]);

  // Generate HTML for Canvas-based filter processing
  const generateFilterHTML = (
    imgBase64: string,
    filter: string,
    bright: number,
    cont: number,
    sat: number
  ): string => {
    const cleanBase64 = imgBase64.startsWith('data:') ? imgBase64 : `data:image/jpeg;base64,${imgBase64}`;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; }
    body { background: #000; }
    canvas { display: none; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Filter parameters
      const filter = '${filter}';
      const brightness = ${bright - 50}; // -50 to 50
      const contrast = ${cont - 50}; // -50 to 50
      const saturation = ${sat - 50}; // -50 to 50
      
      // Apply filter
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        
        // Apply filter type
        if (filter === 'grayscale' || filter === 'bw' || filter === 'document') {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        }
        
        // Apply enhanced (slight contrast + saturation boost)
        if (filter === 'enhanced') {
          // Boost contrast slightly
          const factor = 1.15;
          r = ((r / 255 - 0.5) * factor + 0.5) * 255;
          g = ((g / 255 - 0.5) * factor + 0.5) * 255;
          b = ((b / 255 - 0.5) * factor + 0.5) * 255;
          
          // Boost saturation
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const satFactor = 1.2;
          r = gray + satFactor * (r - gray);
          g = gray + satFactor * (g - gray);
          b = gray + satFactor * (b - gray);
        }
        
        // Apply B&W high contrast
        if (filter === 'bw') {
          const threshold = 128;
          r = g = b = (r > threshold) ? 255 : 0;
        }
        
        // Apply document mode (high contrast grayscale)
        if (filter === 'document') {
          const factor = 1.4;
          r = g = b = ((r / 255 - 0.5) * factor + 0.5) * 255;
        }
        
        // Apply brightness
        if (brightness !== 0) {
          const bFactor = brightness * 2.55; // Convert to 0-255 range
          r += bFactor;
          g += bFactor;
          b += bFactor;
        }
        
        // Apply contrast
        if (contrast !== 0) {
          const cFactor = (100 + contrast) / 100;
          r = ((r / 255 - 0.5) * cFactor + 0.5) * 255;
          g = ((g / 255 - 0.5) * cFactor + 0.5) * 255;
          b = ((b / 255 - 0.5) * cFactor + 0.5) * 255;
        }
        
        // Apply saturation (skip for grayscale filters)
        if (saturation !== 0 && filter !== 'grayscale' && filter !== 'bw' && filter !== 'document') {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const sFactor = (100 + saturation) / 100;
          r = gray + sFactor * (r - gray);
          g = gray + sFactor * (g - gray);
          b = gray + sFactor * (b - gray);
        }
        
        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
      
      // Put processed data back
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to base64 and send back
      const resultBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'filtered',
        data: resultBase64
      }));
    };
    
    img.onerror = function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        message: 'Failed to load image'
      }));
    };
    
    img.src = '${cleanBase64}';
  </script>
</body>
</html>
    `;
  };

  // Process filter locally using WebView Canvas
  const processFilterLocally = useCallback(() => {
    if (!baseImage || baseImage.length < 100) {
      console.log('[FilterEditor] No image data for processing');
      return;
    }
    
    // For original with no adjustments, use original
    if (selectedFilter === 'original' && brightness === 50 && contrast === 50 && saturation === 50) {
      setProcessedImage(baseImage);
      return;
    }
    
    setIsProcessing(true);
    
    // Inject new HTML to process
    if (webViewRef.current) {
      const html = generateFilterHTML(baseImage, selectedFilter, brightness, contrast, saturation);
      webViewRef.current.injectJavaScript(`
        document.open();
        document.write(${JSON.stringify(html)});
        document.close();
        true;
      `);
    }
  }, [baseImage, selectedFilter, brightness, contrast, saturation]);

  // Debounced filter processing
  useEffect(() => {
    if (!visible || !baseImage) return;
    
    if (processTimeoutRef.current) {
      clearTimeout(processTimeoutRef.current);
    }
    
    processTimeoutRef.current = setTimeout(() => {
      processFilterLocally();
    }, 300);
    
    return () => {
      if (processTimeoutRef.current) clearTimeout(processTimeoutRef.current);
    };
  }, [selectedFilter, brightness, contrast, saturation, visible, processFilterLocally]);

  // Handle WebView messages
  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'filtered' && message.data) {
        console.log('[FilterEditor] ✅ Filter applied locally');
        setProcessedImage(message.data);
        setIsProcessing(false);
      } else if (message.type === 'error') {
        console.error('[FilterEditor] WebView error:', message.message);
        setIsProcessing(false);
      }
    } catch (e) {
      console.error('[FilterEditor] Failed to parse WebView message:', e);
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    // Pass the locally processed image
    const finalImage = processedImage || effectiveImageBase64;
    onApply(selectedFilter, {
      brightness: brightness - 50,
      contrast: contrast - 50,
      saturation: saturation - 50,
    }, finalImage);
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
    setProcessedImage(baseImage);
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

  // Initial HTML for WebView
  const initialHTML = baseImage ? generateFilterHTML(baseImage, selectedFilter, brightness, contrast, saturation) : '<html><body></body></html>';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.content, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 }]}>
            {/* Hidden WebView for Canvas processing */}
            <View style={styles.hiddenWebView}>
              <WebView
                ref={webViewRef}
                source={{ html: initialHTML }}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
                style={{ width: 1, height: 1, opacity: 0 }}
              />
            </View>

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
                  source={{ uri: getImageUri(processedImage || effectiveImageBase64) }}
                  style={styles.preview}
                  resizeMode="contain"
                />
                {isProcessing && (
                  <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={styles.processingText}>Processing...</Text>
                  </View>
                )}
                <View style={[styles.livePreviewBadge, { backgroundColor: '#22C55E20' }]}>
                  <Ionicons name="phone-portrait" size={12} color="#22C55E" />
                  <Text style={[styles.livePreviewText, { color: '#22C55E' }]}>100% Local</Text>
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
                    style={[styles.actionButton, { backgroundColor: '#EF444420' }]} 
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
  hiddenWebView: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
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

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Line } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string) => void;
  theme: any;
}

interface Point {
  x: number;
  y: number;
}

interface PathData {
  points: Point[];
  color: string;
  strokeWidth: number;
}

const COLORS = ['#000000', '#1E40AF', '#DC2626', '#059669'];
const STROKE_WIDTHS = [2, 4, 6];

export default function SignatureModal({ visible, onClose, onSave, theme }: SignatureModalProps) {
  const insets = useSafeAreaInsets();
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  
  const canvasRef = useRef<View>(null);
  const isDrawingRef = useRef(false);

  // Handle touch events manually for better control
  const handleTouchStart = useCallback((e: GestureResponderEvent) => {
    isDrawingRef.current = true;
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath([{ x: locationX, y: locationY }]);
  }, []);

  const handleTouchMove = useCallback((e: GestureResponderEvent) => {
    if (!isDrawingRef.current) return;
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath(prev => [...prev, { x: locationX, y: locationY }]);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    if (currentPath.length > 1) {
      setPaths(prev => [...prev, {
        points: [...currentPath],
        color: selectedColor,
        strokeWidth: selectedStrokeWidth,
      }]);
    }
    setCurrentPath([]);
  }, [currentPath, selectedColor, selectedStrokeWidth]);

  const handleClear = useCallback(() => {
    setPaths([]);
    setCurrentPath([]);
  }, []);

  const handleUndo = useCallback(() => {
    setPaths(prev => prev.slice(0, -1));
  }, []);

  const pointsToPath = useCallback((points: Point[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
    }
    
    let d = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      if (i < points.length - 1) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        d += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
      } else {
        d += ` L ${points[i].x} ${points[i].y}`;
      }
    }
    
    return d;
  }, []);

  const handleSave = useCallback(async () => {
    if (paths.length === 0 && currentPath.length === 0) {
      Alert.alert('No Signature', 'Please draw your signature first.');
      return;
    }

    setIsSaving(true);
    try {
      if (canvasRef.current) {
        const uri = await captureRef(canvasRef.current, {
          format: 'png',
          quality: 1,
          result: 'base64',
        });
        
        onSave(uri);
        handleClear();
        onClose();
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      Alert.alert('Error', 'Failed to save signature. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [paths, currentPath, onSave, onClose, handleClear]);

  const handleClose = useCallback(() => {
    handleClear();
    onClose();
  }, [handleClear, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[styles.container, { backgroundColor: '#F5F5F5' }]}>
        {/* Header with safe area padding */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 8, backgroundColor: '#FFFFFF' }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Add Signature</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, { backgroundColor: theme.primary }, (paths.length === 0 && currentPath.length === 0) && { opacity: 0.5 }]}
            disabled={isSaving || (paths.length === 0 && currentPath.length === 0)}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Done'}</Text>
          </TouchableOpacity>
        </View>

        {/* Signature Canvas */}
        <View style={styles.canvasContainer}>
          <View
            ref={canvasRef}
            style={styles.canvas}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleTouchStart}
            onResponderMove={handleTouchMove}
            onResponderRelease={handleTouchEnd}
            onResponderTerminate={handleTouchEnd}
          >
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              {/* Signature guideline */}
              <Line
                x1="5%"
                y1="75%"
                x2="95%"
                y2="75%"
                stroke="#DDDDDD"
                strokeWidth={2}
                strokeDasharray="10,5"
              />
              
              {/* Existing completed paths */}
              {paths.map((path, index) => (
                <Path
                  key={`path-${index}`}
                  d={pointsToPath(path.points)}
                  stroke={path.color}
                  strokeWidth={path.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              
              {/* Current drawing path */}
              {currentPath.length > 0 && (
                <Path
                  d={pointsToPath(currentPath)}
                  stroke={selectedColor}
                  strokeWidth={selectedStrokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
            
            {/* Placeholder text when empty */}
            {paths.length === 0 && currentPath.length === 0 && (
              <View style={styles.placeholder} pointerEvents="none">
                <Ionicons name="create-outline" size={48} color="#CCCCCC" />
                <Text style={styles.placeholderText}>Sign here</Text>
                <Text style={styles.placeholderSubtext}>Draw your signature with your finger</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tools */}
        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: '#FFFFFF' }]}>
          {/* Color selection */}
          <View style={styles.toolSection}>
            <Text style={styles.toolLabel}>Color</Text>
            <View style={styles.colorOptions}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stroke width selection */}
          <View style={styles.toolSection}>
            <Text style={styles.toolLabel}>Thickness</Text>
            <View style={styles.strokeOptions}>
              {STROKE_WIDTHS.map((width) => (
                <TouchableOpacity
                  key={width}
                  style={[
                    styles.strokeOption,
                    selectedStrokeWidth === width && { borderColor: theme.primary, backgroundColor: theme.primary + '15' },
                  ]}
                  onPress={() => setSelectedStrokeWidth(width)}
                >
                  <View
                    style={[
                      styles.strokePreview,
                      { height: width, backgroundColor: selectedColor },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, paths.length === 0 && { opacity: 0.4 }]}
              onPress={handleUndo}
              disabled={paths.length === 0}
            >
              <Ionicons name="arrow-undo" size={22} color={paths.length === 0 ? '#999' : '#333'} />
              <Text style={[styles.actionText, paths.length === 0 && { color: '#999' }]}>Undo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, paths.length === 0 && { opacity: 0.4 }]}
              onPress={handleClear}
              disabled={paths.length === 0}
            >
              <Ionicons name="trash-outline" size={22} color={paths.length === 0 ? '#999' : '#DC2626'} />
              <Text style={[styles.actionText, { color: paths.length === 0 ? '#999' : '#DC2626' }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
    padding: 16,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#BBBBBB',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  toolSection: {
    marginBottom: 16,
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#666',
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  strokeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  strokeOption: {
    width: 64,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  strokePreview: {
    width: 44,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
});

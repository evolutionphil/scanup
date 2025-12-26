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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, G, Line, Rect } from 'react-native-svg';
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
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  
  const canvasRef = useRef<View>(null);
  const canvasLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPath(prev => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        if (currentPath.length > 0) {
          setPaths(prev => [...prev, {
            points: currentPath,
            color: selectedColor,
            strokeWidth: selectedStrokeWidth,
          }]);
          setCurrentPath([]);
        }
      },
    })
  ).current;

  const handleClear = useCallback(() => {
    setPaths([]);
    setCurrentPath([]);
  }, []);

  const handleUndo = useCallback(() => {
    setPaths(prev => prev.slice(0, -1));
  }, []);

  const pointsToPath = useCallback((points: Point[]): string => {
    if (points.length === 0) return '';
    
    let d = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      // Use quadratic curves for smoother lines
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
    if (paths.length === 0) {
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
  }, [paths, onSave, onClose, handleClear]);

  const handleClose = useCallback(() => {
    handleClear();
    onClose();
  }, [handleClear, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Add Signature</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, { backgroundColor: theme.primary }]}
            disabled={isSaving || paths.length === 0}
          >
            {isSaving ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <Text style={styles.saveButtonText}>Done</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Signature Canvas */}
        <View style={styles.canvasContainer}>
          <View
            ref={canvasRef}
            style={styles.canvas}
            onLayout={(e) => {
              const { x, y, width, height } = e.nativeEvent.layout;
              canvasLayout.current = { x, y, width, height };
            }}
            {...panResponder.panHandlers}
          >
            {/* Background with signature line */}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              {/* Signature guideline */}
              <Line
                x1="10%"
                y1="70%"
                x2="90%"
                y2="70%"
                stroke="#E5E5E5"
                strokeWidth={2}
                strokeDasharray="8,4"
              />
              
              {/* "Sign here" indicator */}
              <Text
                x="50%"
                y="78%"
                fontSize="12"
                fill="#BBBBBB"
                textAnchor="middle"
              >
              </Text>
              
              {/* Existing paths */}
              {paths.map((path, index) => (
                <Path
                  key={index}
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
              <View style={styles.placeholder}>
                <Ionicons name="finger-print-outline" size={40} color="#CCCCCC" />
                <Text style={styles.placeholderText}>Draw your signature here</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tools */}
        <View style={[styles.toolbar, { backgroundColor: theme.surface }]}>
          {/* Color selection */}
          <View style={styles.toolSection}>
            <Text style={[styles.toolLabel, { color: theme.textSecondary }]}>Color</Text>
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
            <Text style={[styles.toolLabel, { color: theme.textSecondary }]}>Thickness</Text>
            <View style={styles.strokeOptions}>
              {STROKE_WIDTHS.map((width) => (
                <TouchableOpacity
                  key={width}
                  style={[
                    styles.strokeOption,
                    { borderColor: selectedStrokeWidth === width ? theme.primary : theme.border },
                    selectedStrokeWidth === width && { backgroundColor: theme.primary + '20' },
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
              style={[styles.actionButton, { borderColor: theme.border }]}
              onPress={handleUndo}
              disabled={paths.length === 0}
            >
              <Ionicons 
                name="arrow-undo" 
                size={22} 
                color={paths.length === 0 ? theme.textMuted : theme.text} 
              />
              <Text style={[
                styles.actionText, 
                { color: paths.length === 0 ? theme.textMuted : theme.text }
              ]}>
                Undo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: theme.border }]}
              onPress={handleClear}
              disabled={paths.length === 0}
            >
              <Ionicons 
                name="trash-outline" 
                size={22} 
                color={paths.length === 0 ? theme.textMuted : theme.danger} 
              />
              <Text style={[
                styles.actionText, 
                { color: paths.length === 0 ? theme.textMuted : theme.danger }
              ]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#BBBBBB',
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  toolSection: {
    marginBottom: 16,
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
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
    width: 60,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strokePreview: {
    width: 40,
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
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

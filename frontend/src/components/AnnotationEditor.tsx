import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  TextInput,
  ScrollView,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Rect, Line, Text as SvgText } from 'react-native-svg';
import { useThemeStore } from '../store/themeStore';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Annotation {
  id: string;
  type: 'text' | 'arrow' | 'rectangle' | 'circle' | 'highlight' | 'freehand';
  color: string;
  strokeWidth: number;
  // Position data
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  text?: string;
  points?: { x: number; y: number }[];
}

interface AnnotationEditorProps {
  visible: boolean;
  onClose: () => void;
  imageBase64: string;
  imageUrl?: string;
  onSave: (annotations: Annotation[], annotatedImageBase64: string, displayDimensions?: { width: number; height: number }) => void;
  existingAnnotations?: Annotation[];
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#000000', '#FFFFFF'];
const STROKE_WIDTHS = [2, 4, 6, 8];

const TOOLS = [
  { id: 'select', icon: 'move', label: 'Select' },
  { id: 'freehand', icon: 'pencil', label: 'Draw' },
  { id: 'text', icon: 'text', label: 'Text' },
  { id: 'arrow', icon: 'arrow-forward', label: 'Arrow' },
  { id: 'rectangle', icon: 'square-outline', label: 'Rectangle' },
  { id: 'circle', icon: 'ellipse-outline', label: 'Circle' },
  { id: 'highlight', icon: 'color-fill', label: 'Highlight' },
];

export default function AnnotationEditor({
  visible,
  onClose,
  imageBase64,
  imageUrl,
  onSave,
  existingAnnotations = [],
}: AnnotationEditorProps) {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  
  // Get the image source - prefer base64, fallback to URL
  const getImageSource = () => {
    if (imageBase64 && imageBase64.length > 100) {
      if (imageBase64.startsWith('data:')) {
        return { uri: imageBase64 };
      }
      return { uri: `data:image/jpeg;base64,${imageBase64}` };
    }
    if (imageUrl) {
      return { uri: imageUrl };
    }
    return { uri: '' };
  };
  const [annotations, setAnnotations] = useState<Annotation[]>(existingAnnotations);
  const [selectedTool, setSelectedTool] = useState<string>('freehand');
  const [selectedColor, setSelectedColor] = useState<string>('#EF4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  
  // Use refs to track state inside PanResponder
  const selectedToolRef = useRef(selectedTool);
  const selectedColorRef = useRef(selectedColor);
  const strokeWidthRef = useRef(strokeWidth);
  const annotationsRef = useRef(annotations);
  const currentAnnotationRef = useRef<Annotation | null>(null);
  const selectedAnnotationIdRef = useRef<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const originalAnnotationRef = useRef<Annotation | null>(null); // Store the entire original annotation
  
  // Keep refs in sync with state
  selectedToolRef.current = selectedTool;
  selectedColorRef.current = selectedColor;
  strokeWidthRef.current = strokeWidth;
  annotationsRef.current = annotations;
  selectedAnnotationIdRef.current = selectedAnnotationId;

  // Find annotation at a given point
  const findAnnotationAtPoint = (x: number, y: number): Annotation | null => {
    const hitRadius = 30; // Touch tolerance
    
    for (let i = annotationsRef.current.length - 1; i >= 0; i--) {
      const ann = annotationsRef.current[i];
      
      if (ann.type === 'text') {
        // Check if point is near text position
        if (Math.abs(x - ann.x) < hitRadius * 2 && Math.abs(y - ann.y) < hitRadius) {
          return ann;
        }
      } else if (ann.type === 'rectangle' || ann.type === 'circle') {
        // Check if inside bounding box
        const minX = Math.min(ann.x, ann.endX || ann.x);
        const maxX = Math.max(ann.x, ann.endX || ann.x);
        const minY = Math.min(ann.y, ann.endY || ann.y);
        const maxY = Math.max(ann.y, ann.endY || ann.y);
        
        if (x >= minX - hitRadius && x <= maxX + hitRadius &&
            y >= minY - hitRadius && y <= maxY + hitRadius) {
          return ann;
        }
      } else if (ann.type === 'arrow') {
        // Check if near line
        if (ann.endX && ann.endY) {
          const dist = pointToLineDistance(x, y, ann.x, ann.y, ann.endX, ann.endY);
          if (dist < hitRadius) {
            return ann;
          }
        }
      } else if (ann.type === 'freehand' || ann.type === 'highlight') {
        // Check if near any point in the path
        if (ann.points) {
          for (const point of ann.points) {
            if (Math.abs(x - point.x) < hitRadius && Math.abs(y - point.y) < hitRadius) {
              return ann;
            }
          }
        }
      }
    }
    return null;
  };

  // Helper to calculate distance from point to line segment
  const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const tool = selectedToolRef.current;
          const color = selectedColorRef.current;
          const width = strokeWidthRef.current;
          
          // Handle select tool - try to find and select an annotation
          if (tool === 'select') {
            const found = findAnnotationAtPoint(locationX, locationY);
            if (found) {
              setSelectedAnnotationId(found.id);
              selectedAnnotationIdRef.current = found.id;
              dragStartRef.current = { x: locationX, y: locationY };
              // Store a deep copy of the entire original annotation
              originalAnnotationRef.current = JSON.parse(JSON.stringify(found));
            } else {
              setSelectedAnnotationId(null);
              selectedAnnotationIdRef.current = null;
              originalAnnotationRef.current = null;
            }
            return;
          }
          
          if (tool === 'text') {
            setTextPosition({ x: locationX, y: locationY });
            setShowTextInput(true);
            return;
          }
          
          const newAnnotation: Annotation = {
            id: `annotation_${Date.now()}`,
            type: tool as Annotation['type'],
            color: tool === 'highlight' ? color + '60' : color,
            strokeWidth: tool === 'highlight' ? 20 : width,
            x: locationX,
            y: locationY,
            points: (tool === 'freehand' || tool === 'highlight') ? [{ x: locationX, y: locationY }] : undefined,
          };
          
          currentAnnotationRef.current = newAnnotation;
          setCurrentAnnotation(newAnnotation);
        },
        onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const tool = selectedToolRef.current;
          
          // Handle moving a selected annotation
          if (tool === 'select' && selectedAnnotationIdRef.current && dragStartRef.current && originalAnnotationRef.current) {
            const deltaX = locationX - dragStartRef.current.x;
            const deltaY = locationY - dragStartRef.current.y;
            const original = originalAnnotationRef.current;
            
            // Update the annotation position based on original + delta
            setAnnotations(prev => prev.map(ann => {
              if (ann.id !== selectedAnnotationIdRef.current) return ann;
              
              const updated: Annotation = {
                ...ann,
                x: original.x + deltaX,
                y: original.y + deltaY,
              };
              
              // Move endX/endY for arrows, rectangles, circles
              if (original.endX !== undefined) {
                updated.endX = original.endX + deltaX;
              }
              if (original.endY !== undefined) {
                updated.endY = original.endY + deltaY;
              }
              
              // Move all points for freehand/highlight paths
              if (original.points) {
                updated.points = original.points.map(p => ({
                  x: p.x + deltaX,
                  y: p.y + deltaY,
                }));
              }
              
              return updated;
            }));
            return;
          }
          
          const current = currentAnnotationRef.current;
          if (!current || tool === 'text' || tool === 'select') return;
          
          let updated: Annotation;
          if (current.type === 'freehand' || current.type === 'highlight') {
            updated = {
              ...current,
              points: [...(current.points || []), { x: locationX, y: locationY }],
            };
          } else {
            updated = {
              ...current,
              endX: locationX,
              endY: locationY,
              width: Math.abs(locationX - current.x),
              height: Math.abs(locationY - current.y),
            };
          }
          
          currentAnnotationRef.current = updated;
          setCurrentAnnotation(updated);
        },
        onPanResponderRelease: () => {
          const tool = selectedToolRef.current;
          
          // Clear drag state for select tool
          if (tool === 'select') {
            dragStartRef.current = null;
            originalAnnotationRef.current = null;
            return;
          }
          
          const current = currentAnnotationRef.current;
          if (current && tool !== 'text') {
            const newAnnotations = [...annotationsRef.current, current];
            setAnnotations(newAnnotations);
            annotationsRef.current = newAnnotations;
            currentAnnotationRef.current = null;
            setCurrentAnnotation(null);
          }
        },
      }),
    []
  );

  const handleAddText = () => {
    if (textInputValue.trim()) {
      const textAnnotation: Annotation = {
        id: `annotation_${Date.now()}`,
        type: 'text',
        color: selectedColor,
        strokeWidth: 16,
        x: textPosition.x,
        y: textPosition.y,
        text: textInputValue,
      };
      setAnnotations([...annotations, textAnnotation]);
    }
    setShowTextInput(false);
    setTextInputValue('');
  };

  const handleUndo = () => {
    if (annotations.length > 0) {
      setAnnotations(annotations.slice(0, -1));
    }
  };

  const handleClear = () => {
    setAnnotations([]);
  };

  const handleSave = () => {
    // Pass annotations back with display dimensions for proper scaling
    const displayDimensions = imageLayout.width > 0 && imageLayout.height > 0 
      ? { width: imageLayout.width, height: imageLayout.height }
      : undefined;
    onSave(annotations, imageBase64, displayDimensions);
    onClose();
  };

  const renderAnnotation = (annotation: Annotation, isPreview = false) => {
    switch (annotation.type) {
      case 'freehand':
      case 'highlight':
        if (!annotation.points || annotation.points.length < 2) return null;
        const pathD = annotation.points.reduce((d, point, i) => {
          return i === 0 ? `M ${point.x} ${point.y}` : `${d} L ${point.x} ${point.y}`;
        }, '');
        return (
          <Path
            key={annotation.id}
            d={pathD}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );
      
      case 'arrow':
        if (!annotation.endX || !annotation.endY) return null;
        const angle = Math.atan2(annotation.endY - annotation.y, annotation.endX - annotation.x);
        const arrowLength = 15;
        return (
          <React.Fragment key={annotation.id}>
            <Line
              x1={annotation.x}
              y1={annotation.y}
              x2={annotation.endX}
              y2={annotation.endY}
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
            />
            <Path
              d={`M ${annotation.endX} ${annotation.endY} 
                  L ${annotation.endX - arrowLength * Math.cos(angle - Math.PI / 6)} ${annotation.endY - arrowLength * Math.sin(angle - Math.PI / 6)}
                  M ${annotation.endX} ${annotation.endY}
                  L ${annotation.endX - arrowLength * Math.cos(angle + Math.PI / 6)} ${annotation.endY - arrowLength * Math.sin(angle + Math.PI / 6)}`}
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
              fill="none"
            />
          </React.Fragment>
        );
      
      case 'rectangle':
        if (!annotation.width || !annotation.height) return null;
        return (
          <Rect
            key={annotation.id}
            x={Math.min(annotation.x, annotation.endX || annotation.x)}
            y={Math.min(annotation.y, annotation.endY || annotation.y)}
            width={annotation.width}
            height={annotation.height}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            fill="none"
          />
        );
      
      case 'circle':
        if (!annotation.width || !annotation.height) return null;
        const rx = annotation.width / 2;
        const ry = annotation.height / 2;
        const cx = Math.min(annotation.x, annotation.endX || annotation.x) + rx;
        const cy = Math.min(annotation.y, annotation.endY || annotation.y) + ry;
        return (
          <Circle
            key={annotation.id}
            cx={cx}
            cy={cy}
            r={Math.max(rx, ry)}
            stroke={annotation.color}
            strokeWidth={annotation.strokeWidth}
            fill="none"
          />
        );
      
      case 'text':
        return (
          <SvgText
            key={annotation.id}
            x={annotation.x}
            y={annotation.y}
            fill={annotation.color}
            fontSize={annotation.strokeWidth}
            fontWeight="600"
          >
            {annotation.text}
          </SvgText>
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with proper safe area padding */}
        <View style={[styles.header, { backgroundColor: theme.surface, paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Annotate</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.saveText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Canvas */}
        <View 
          style={styles.canvasContainer}
          onLayout={(e) => setImageLayout(e.nativeEvent.layout)}
          {...panResponder.panHandlers}
        >
          <Image
            source={getImageSource()}
            style={styles.image}
            resizeMode="contain"
          />
          <Svg style={StyleSheet.absoluteFill}>
            {annotations.map(renderAnnotation)}
            {currentAnnotation && renderAnnotation(currentAnnotation, true)}
          </Svg>
        </View>

        {/* Text Input Modal */}
        {showTextInput && (
          <View style={[styles.textInputOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.textInputContainer, { backgroundColor: theme.surface }]}>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
                placeholder="Enter text..."
                placeholderTextColor={theme.textMuted}
                value={textInputValue}
                onChangeText={setTextInputValue}
                autoFocus
              />
              <View style={styles.textInputButtons}>
                <TouchableOpacity 
                  style={[styles.textInputBtn, { backgroundColor: theme.border }]}
                  onPress={() => setShowTextInput(false)}
                >
                  <Text style={{ color: theme.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.textInputBtn, { backgroundColor: theme.primary }]}
                  onPress={handleAddText}
                >
                  <Text style={{ color: '#FFF' }}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Tool bar */}
        <View style={[styles.toolbar, { backgroundColor: theme.surface }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsRow}>
            {TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={[
                  styles.toolBtn,
                  selectedTool === tool.id && { backgroundColor: theme.primary + '20' },
                ]}
                onPress={() => setSelectedTool(tool.id)}
              >
                <Ionicons 
                  name={tool.icon as any} 
                  size={22} 
                  color={selectedTool === tool.id ? theme.primary : theme.text} 
                />
                <Text style={[
                  styles.toolLabel, 
                  { color: selectedTool === tool.id ? theme.primary : theme.textMuted }
                ]}>
                  {tool.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Color and stroke controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity 
              style={[styles.colorBtn, { backgroundColor: selectedColor }]}
              onPress={() => setShowColorPicker(!showColorPicker)}
            >
              <Ionicons name="color-palette" size={18} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.strokePicker}>
              {STROKE_WIDTHS.map((sw) => (
                <TouchableOpacity
                  key={sw}
                  style={[
                    styles.strokeBtn,
                    strokeWidth === sw && { borderColor: theme.primary },
                  ]}
                  onPress={() => setStrokeWidth(sw)}
                >
                  <View style={[styles.strokePreview, { height: sw, backgroundColor: selectedColor }]} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleUndo} style={styles.actionBtn}>
              <Ionicons name="arrow-undo" size={22} color={theme.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClear} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={22} color={theme.danger || '#EF4444'} />
            </TouchableOpacity>
          </View>

          {/* Color picker */}
          {showColorPicker && (
            <View style={styles.colorPicker}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedColor(color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </View>
          )}
        </View>
        
        {/* Bottom safe area spacer */}
        <View style={{ height: insets.bottom }} />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  toolbar: {
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  toolsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  toolBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 60,
  },
  toolLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  colorBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strokePicker: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  strokeBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  strokePreview: {
    width: '60%',
    borderRadius: 2,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 12,
    gap: 10,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  textInputOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  textInputContainer: {
    width: '80%',
    padding: 20,
    borderRadius: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textInputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  textInputBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});

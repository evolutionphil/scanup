import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Line, Defs, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============ TYPES ============
interface SignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onSignatureCreated: (signatureBase64: string) => void;
  theme: any;
}

interface SignaturePlacementProps {
  visible: boolean;
  documentImage: string;
  signatureImage: string;
  onClose: () => void;
  onApply: (signatureBase64: string, position: { x: number; y: number }, scale: number) => void;
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

// ============ SIGNATURE DRAWING MODAL ============
export function SignatureDrawingModal({ visible, onClose, onSignatureCreated, theme }: SignatureModalProps) {
  const insets = useSafeAreaInsets();
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  
  const canvasRef = useRef<View>(null);
  const isDrawingRef = useRef(false);

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
        // Capture as PNG with transparent background
        const uri = await captureRef(canvasRef.current, {
          format: 'png',
          quality: 1,
          result: 'base64',
        });
        
        onSignatureCreated(uri);
        handleClear();
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      Alert.alert('Error', 'Failed to save signature. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [paths, currentPath, onSignatureCreated, handleClear]);

  const handleClose = useCallback(() => {
    handleClear();
    onClose();
  }, [handleClear, onClose]);

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent presentationStyle="fullScreen" onRequestClose={handleClose}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[styles.container, { backgroundColor: '#F5F5F5' }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 8, backgroundColor: '#FFFFFF' }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Draw Signature</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, { backgroundColor: theme.primary }, (paths.length === 0) && { opacity: 0.5 }]}
            disabled={isSaving || paths.length === 0}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Next'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.canvasContainer}>
          <View
            ref={canvasRef}
            style={styles.transparentCanvas}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleTouchStart}
            onResponderMove={handleTouchMove}
            onResponderRelease={handleTouchEnd}
            onResponderTerminate={handleTouchEnd}
          >
            {/* Transparent checkered background to show transparency */}
            <View style={styles.checkeredBackground}>
              {Array.from({ length: 20 }).map((_, row) => (
                <View key={row} style={styles.checkeredRow}>
                  {Array.from({ length: 20 }).map((_, col) => (
                    <View 
                      key={col} 
                      style={[
                        styles.checkeredCell,
                        (row + col) % 2 === 0 ? styles.checkeredLight : styles.checkeredDark
                      ]} 
                    />
                  ))}
                </View>
              ))}
            </View>
            
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
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
            
            {paths.length === 0 && currentPath.length === 0 && (
              <View style={styles.placeholder} pointerEvents="none">
                <Ionicons name="create-outline" size={48} color="rgba(0,0,0,0.3)" />
                <Text style={styles.placeholderText}>Sign here</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: '#FFFFFF' }]}>
          <View style={styles.toolSection}>
            <Text style={styles.toolLabel}>Color</Text>
            <View style={styles.colorOptions}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.colorOptionSelected]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Ionicons name="checkmark" size={16} color="#FFF" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.toolSection}>
            <Text style={styles.toolLabel}>Thickness</Text>
            <View style={styles.strokeOptions}>
              {STROKE_WIDTHS.map((width) => (
                <TouchableOpacity
                  key={width}
                  style={[styles.strokeOption, selectedStrokeWidth === width && { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]}
                  onPress={() => setSelectedStrokeWidth(width)}
                >
                  <View style={[styles.strokePreview, { height: width, backgroundColor: selectedColor }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, paths.length === 0 && { opacity: 0.4 }]} onPress={handleUndo} disabled={paths.length === 0}>
              <Ionicons name="arrow-undo" size={22} color={paths.length === 0 ? '#999' : '#333'} />
              <Text style={[styles.actionText, paths.length === 0 && { color: '#999' }]}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, paths.length === 0 && { opacity: 0.4 }]} onPress={handleClear} disabled={paths.length === 0}>
              <Ionicons name="trash-outline" size={22} color={paths.length === 0 ? '#999' : '#DC2626'} />
              <Text style={[styles.actionText, { color: paths.length === 0 ? '#999' : '#DC2626' }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============ SIGNATURE PLACEMENT MODAL ============
export function SignaturePlacementModal({ visible, documentImage, signatureImage, onClose, onApply, theme }: SignaturePlacementProps) {
  const insets = useSafeAreaInsets();
  const [position, setPosition] = useState({ x: 0.5, y: 0.7 }); // Normalized 0-1
  const [scale, setScale] = useState(0.3);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const initialPinchDistance = useRef(0);
  const initialScale = useRef(scale);

  // Calculate signature dimensions
  const signatureWidth = imageLayout.width * scale;
  const signatureHeight = signatureWidth * 0.4; // Assume signature aspect ratio
  
  // Calculate pixel position
  const signatureX = position.x * imageLayout.width - signatureWidth / 2;
  const signatureY = position.y * imageLayout.height - signatureHeight / 2;

  const handleTouchStart = useCallback((e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    if (touches.length === 2) {
      // Pinch to resize
      const dx = touches[1].pageX - touches[0].pageX;
      const dy = touches[1].pageY - touches[0].pageY;
      initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
      initialScale.current = scale;
      setIsResizing(true);
    } else {
      setIsDragging(true);
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    
    if (isResizing && touches.length === 2) {
      // Handle pinch resize
      const dx = touches[1].pageX - touches[0].pageX;
      const dy = touches[1].pageY - touches[0].pageY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      const scaleChange = currentDistance / initialPinchDistance.current;
      const newScale = Math.max(0.1, Math.min(0.8, initialScale.current * scaleChange));
      setScale(newScale);
    } else if (isDragging && touches.length === 1) {
      // Handle drag
      const touch = touches[0];
      const touchX = touch.pageX - imageLayout.x;
      const touchY = touch.pageY - imageLayout.y;
      
      const normalizedX = Math.max(0.1, Math.min(0.9, touchX / imageLayout.width));
      const normalizedY = Math.max(0.1, Math.min(0.9, touchY / imageLayout.height));
      
      setPosition({ x: normalizedX, y: normalizedY });
    }
  }, [isDragging, isResizing, imageLayout]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  const handleApply = useCallback(() => {
    onApply(signatureImage, position, scale);
  }, [signatureImage, position, scale, onApply]);

  const adjustScale = useCallback((delta: number) => {
    setScale(prev => Math.max(0.1, Math.min(0.8, prev + delta)));
  }, []);

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.placementContainer}>
        <View style={[styles.placementHeader, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.placementTitle}>Position Signature</Text>
          <TouchableOpacity onPress={handleApply} style={[styles.saveButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.saveButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.placementHint}>Drag to move • Pinch to resize</Text>

        <View 
          style={styles.documentContainer}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouchStart}
          onResponderMove={handleTouchMove}
          onResponderRelease={handleTouchEnd}
          onResponderTerminate={handleTouchEnd}
        >
          <Image
            source={{ uri: `data:image/jpeg;base64,${documentImage}` }}
            style={styles.documentImage}
            resizeMode="contain"
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              e.target.measure((fx, fy, w, h, px, py) => {
                setImageLayout({ width: w, height: h, x: px, y: py });
              });
            }}
          />
          
          {/* Signature overlay */}
          {imageLayout.width > 0 && (
            <View
              style={[
                styles.signatureOverlay,
                {
                  left: signatureX,
                  top: signatureY,
                  width: signatureWidth,
                  height: signatureHeight,
                  borderColor: isDragging ? theme.primary : 'rgba(255,255,255,0.8)',
                },
              ]}
            >
              <Image
                source={{ uri: `data:image/png;base64,${signatureImage}` }}
                style={styles.signatureImage}
                resizeMode="contain"
              />
              
              {/* Resize handles */}
              <View style={[styles.resizeHandle, styles.handleTL]} />
              <View style={[styles.resizeHandle, styles.handleTR]} />
              <View style={[styles.resizeHandle, styles.handleBL]} />
              <View style={[styles.resizeHandle, styles.handleBR]} />
            </View>
          )}
        </View>

        {/* Size controls */}
        <View style={[styles.sizeControls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity style={styles.sizeButton} onPress={() => adjustScale(-0.05)}>
            <Ionicons name="remove" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.sizeLabel}>Size: {Math.round(scale * 100)}%</Text>
          <TouchableOpacity style={styles.sizeButton} onPress={() => adjustScale(0.05)}>
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============ COMBINED EXPORT ============
export default function SignatureModal({ visible, onClose, onSave, theme }: {
  visible: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string, position: { x: number; y: number }, scale: number) => void;
  theme: any;
  documentImage?: string;
}) {
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [showPlacement, setShowPlacement] = useState(false);

  const handleSignatureCreated = useCallback((base64: string) => {
    setSignatureBase64(base64);
    setShowPlacement(true);
  }, []);

  const handleApply = useCallback((sig: string, pos: { x: number; y: number }, scale: number) => {
    onSave(sig, pos, scale);
    setSignatureBase64(null);
    setShowPlacement(false);
    onClose();
  }, [onSave, onClose]);

  const handleClose = useCallback(() => {
    setSignatureBase64(null);
    setShowPlacement(false);
    onClose();
  }, [onClose]);

  // For backward compatibility - if no documentImage, just return the drawing modal
  return (
    <SignatureDrawingModal
      visible={visible && !showPlacement}
      onClose={handleClose}
      onSignatureCreated={handleSignatureCreated}
      theme={theme}
    />
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600', color: '#333' },
  saveButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  saveButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  canvasContainer: { flex: 1, padding: 16 },
  transparentCanvas: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  checkeredBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  checkeredRow: { flex: 1, flexDirection: 'row' },
  checkeredCell: { flex: 1 },
  checkeredLight: { backgroundColor: '#FFFFFF' },
  checkeredDark: { backgroundColor: '#F0F0F0' },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: { fontSize: 20, fontWeight: '600', color: 'rgba(0,0,0,0.3)' },
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
  toolSection: { marginBottom: 16 },
  toolLabel: { fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666' },
  colorOptions: { flexDirection: 'row', gap: 16 },
  colorOption: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorOptionSelected: { borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  strokeOptions: { flexDirection: 'row', gap: 12 },
  strokeOption: { width: 64, height: 44, borderRadius: 10, borderWidth: 2, borderColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  strokePreview: { width: 44, borderRadius: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#F5F5F5', gap: 8 },
  actionText: { fontSize: 15, fontWeight: '500', color: '#333' },
  // Placement modal styles
  placementContainer: { flex: 1, backgroundColor: '#000' },
  placementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  placementTitle: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  placementHint: { color: '#AAA', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  documentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  documentImage: { width: '100%', height: '100%' },
  signatureOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 4,
  },
  signatureImage: { width: '100%', height: '100%' },
  resizeHandle: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  handleTL: { top: -8, left: -8 },
  handleTR: { top: -8, right: -8 },
  handleBL: { bottom: -8, left: -8 },
  handleBR: { bottom: -8, right: -8 },
  sizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 24,
  },
  sizeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeLabel: { color: '#FFF', fontSize: 16, fontWeight: '500', minWidth: 100, textAlign: 'center' },
});

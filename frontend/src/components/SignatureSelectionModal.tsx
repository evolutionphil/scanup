/**
 * SignatureSelectionModal
 * 
 * Modal for selecting saved signatures and applying them to document pages
 * Matches Figma design with saved signatures list and "Apply all pages" toggle
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Switch,
  Alert,
  StatusBar,
  GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIGNATURES_KEY = '@scanup_saved_signatures';

interface SavedSignature {
  id: string;
  name: string;
  base64?: string;
  paths?: string[];
  width?: number;
  height?: number;
  createdAt: string;
}

interface SignatureSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (signatureBase64: string, position: { x: number; y: number }, scale: number, applyToAllPages: boolean) => void;
  documentImage: string;
  documentImageUrl?: string;
  pageCount: number;
  currentPage: number;
  theme: any;
}

interface Point { x: number; y: number; }
interface PathData { points: Point[]; color: string; strokeWidth: number; }

export default function SignatureSelectionModal({
  visible,
  onClose,
  onApply,
  documentImage,
  documentImageUrl,
  pageCount,
  currentPage,
  theme,
}: SignatureSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [selectedSignature, setSelectedSignature] = useState<SavedSignature | null>(null);
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [applyToAllPages, setApplyToAllPages] = useState(false);
  
  // Position and scale for signature placement
  const [position, setPosition] = useState({ x: 0.5, y: 0.7 });
  const [scale, setScale] = useState(0.25);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Drawing state
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const svgContainerRef = useRef<View>(null);
  const isDrawingRef = useRef(false);
  
  // Touch handling refs
  const startPosition = useRef({ x: 0, y: 0 });
  const startTouchPosition = useRef({ x: 0, y: 0 });

  // Load saved signatures
  useEffect(() => {
    if (visible) {
      loadSavedSignatures();
    }
  }, [visible]);

  const loadSavedSignatures = async () => {
    try {
      const saved = await AsyncStorage.getItem(SIGNATURES_KEY);
      if (saved) {
        const signatures = JSON.parse(saved);
        setSavedSignatures(signatures);
        // Auto-select first signature if available
        if (signatures.length > 0 && !selectedSignature) {
          setSelectedSignature(signatures[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load signatures:', e);
    }
  };

  const getImageSource = () => {
    if (documentImage && documentImage.length > 100) {
      if (documentImage.startsWith('data:')) {
        return { uri: documentImage };
      }
      return { uri: `data:image/jpeg;base64,${documentImage}` };
    }
    if (documentImageUrl) {
      return { uri: documentImageUrl };
    }
    return { uri: '' };
  };

  const signatureWidth = imageLayout.width * scale;
  const signatureHeight = signatureWidth * 0.4;
  const signatureX = position.x * imageLayout.width - signatureWidth / 2;
  const signatureY = position.y * imageLayout.height - signatureHeight / 2;

  // Handle touch events for signature positioning
  const handleSignatureTouchStart = useCallback((e: GestureResponderEvent) => {
    setIsDragging(true);
    const { pageX, pageY } = e.nativeEvent;
    startPosition.current = { ...position };
    startTouchPosition.current = { x: pageX, y: pageY };
  }, [position]);

  const handleSignatureTouchMove = useCallback((e: GestureResponderEvent) => {
    if (!isDragging || imageLayout.width === 0) return;
    const { pageX, pageY } = e.nativeEvent;
    
    const dx = pageX - startTouchPosition.current.x;
    const dy = pageY - startTouchPosition.current.y;
    
    const newX = startPosition.current.x + (dx / imageLayout.width);
    const newY = startPosition.current.y + (dy / imageLayout.height);
    
    setPosition({
      x: Math.max(0.1, Math.min(0.9, newX)),
      y: Math.max(0.1, Math.min(0.9, newY)),
    });
  }, [isDragging, imageLayout]);

  const handleSignatureTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleRemoveSignature = () => {
    setSelectedSignature(null);
  };

  const handleSave = () => {
    if (!selectedSignature) {
      Alert.alert('No Signature', 'Please select or create a signature first');
      return;
    }

    // Get the base64 from the selected signature
    let signatureBase64 = selectedSignature.base64;
    
    // If it's an SVG data URL, we need to use it directly
    // The backend will handle converting it
    if (signatureBase64.startsWith('data:image/svg+xml')) {
      // Extract base64 part
      signatureBase64 = signatureBase64.split(',')[1] || signatureBase64;
    } else if (signatureBase64.startsWith('data:image/png')) {
      signatureBase64 = signatureBase64.split(',')[1] || signatureBase64;
    }

    onApply(signatureBase64, position, scale, applyToAllPages);
  };

  // Drawing functions
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
      setPaths(prev => [...prev, { points: [...currentPath], color: '#000000', strokeWidth: 3 }]);
    }
    setCurrentPath([]);
  }, [currentPath]);

  const pointsToPath = useCallback((points: Point[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
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

  const handleSaveNewSignature = async () => {
    if (paths.length === 0) {
      Alert.alert('No Signature', 'Please draw your signature first.');
      return;
    }
    
    try {
      if (svgContainerRef.current) {
        const uri = await captureRef(svgContainerRef.current, {
          format: 'png',
          quality: 1,
          result: 'base64',
        });
        
        const newSignature: SavedSignature = {
          id: `sig_${Date.now()}`,
          name: `Signature ${savedSignatures.length + 1}`,
          base64: `data:image/png;base64,${uri}`,
          createdAt: new Date().toISOString(),
        };

        const updated = [...savedSignatures, newSignature];
        await AsyncStorage.setItem(SIGNATURES_KEY, JSON.stringify(updated));
        setSavedSignatures(updated);
        setSelectedSignature(newSignature);
        setShowDrawModal(false);
        setPaths([]);
        setCurrentPath([]);
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      Alert.alert('Error', 'Failed to save signature.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={[styles.container, { backgroundColor: '#F5F5F5' }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Signature</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.headerButton}
            disabled={!selectedSignature}
          >
            <Text style={[styles.saveText, { color: selectedSignature ? theme.primary : '#CCC' }]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Document Preview */}
        <View style={styles.previewContainer}>
          <View style={styles.documentWrapper}>
            <Image
              source={getImageSource()}
              style={styles.documentImage}
              resizeMode="contain"
              onLayout={(e) => {
                e.target.measure((fx, fy, w, h, px, py) => {
                  setImageLayout({ width: w, height: h, x: px, y: py });
                });
              }}
            />
            
            {/* Signature overlay */}
            {selectedSignature && imageLayout.width > 0 && (
              <View
                style={[
                  styles.signatureOverlay,
                  {
                    left: signatureX,
                    top: signatureY,
                    width: signatureWidth,
                    height: signatureHeight,
                    borderColor: theme.primary,
                  },
                ]}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleSignatureTouchStart}
                onResponderMove={handleSignatureTouchMove}
                onResponderRelease={handleSignatureTouchEnd}
                onResponderTerminate={handleSignatureTouchEnd}
              >
                <Image
                  source={{ uri: selectedSignature.base64 }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
                {/* Delete button */}
                <TouchableOpacity style={styles.deleteSignatureBtn} onPress={handleRemoveSignature}>
                  <Ionicons name="trash" size={16} color="#FFF" />
                </TouchableOpacity>
                {/* Resize handle */}
                <View style={[styles.resizeHandle, { backgroundColor: theme.primary }]}>
                  <View style={styles.resizeHandleInner} />
                </View>
              </View>
            )}
          </View>
          
          {/* Page indicator */}
          <Text style={styles.pageIndicator}>{currentPage}/{pageCount}</Text>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.bottomControls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Saved Signatures List */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.signaturesScroll}
          >
            {/* Add new button */}
            <TouchableOpacity 
              style={styles.addSignatureBtn}
              onPress={() => setShowDrawModal(true)}
            >
              <Ionicons name="add" size={28} color="#666" />
            </TouchableOpacity>
            
            {savedSignatures.map((sig) => (
              <TouchableOpacity
                key={sig.id}
                style={[
                  styles.signatureThumb,
                  selectedSignature?.id === sig.id && { borderColor: theme.primary, borderWidth: 2 }
                ]}
                onPress={() => setSelectedSignature(sig)}
              >
                <Image
                  source={{ uri: sig.base64 }}
                  style={styles.signatureThumbImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Apply all pages toggle & Remove button */}
          <View style={styles.optionsRow}>
            <View style={styles.toggleContainer}>
              <Switch
                value={applyToAllPages}
                onValueChange={setApplyToAllPages}
                trackColor={{ false: '#DDD', true: theme.primary }}
                thumbColor="#FFF"
              />
              <Text style={styles.toggleLabel}>Apply all pages</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.removeButton}
              onPress={handleRemoveSignature}
              disabled={!selectedSignature}
            >
              <Text style={[styles.removeButtonText, !selectedSignature && { color: '#CCC' }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Draw Signature Modal */}
      <Modal visible={showDrawModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.drawContainer, { backgroundColor: '#F5F5F5' }]}>
          <View style={[styles.drawHeader, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
            <TouchableOpacity onPress={() => {
              setShowDrawModal(false);
              setPaths([]);
              setCurrentPath([]);
            }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Draw Signature</Text>
            <TouchableOpacity onPress={handleSaveNewSignature}>
              <Text style={[styles.saveText, { color: paths.length > 0 ? theme.primary : '#CCC' }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.canvasContainer}>
            <View style={styles.canvasWrapper}>
              {/* Checkered background */}
              <View style={styles.checkeredBackground} pointerEvents="none">
                {Array.from({ length: 12 }).map((_, row) => (
                  <View key={row} style={styles.checkeredRow}>
                    {Array.from({ length: 12 }).map((_, col) => (
                      <View key={col} style={[styles.checkeredCell, (row + col) % 2 === 0 ? styles.checkeredLight : styles.checkeredDark]} />
                    ))}
                  </View>
                ))}
              </View>
              
              {/* SVG Canvas */}
              <View
                ref={svgContainerRef}
                style={styles.svgContainer}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={handleTouchStart}
                onResponderMove={handleTouchMove}
                onResponderRelease={handleTouchEnd}
                onResponderTerminate={handleTouchEnd}
              >
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
                      stroke="#000000" 
                      strokeWidth={3} 
                      fill="none" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  )}
                </Svg>
              </View>
              
              {/* Placeholder */}
              {paths.length === 0 && currentPath.length === 0 && (
                <View style={styles.placeholder} pointerEvents="none">
                  <Ionicons name="create-outline" size={40} color="rgba(0,0,0,0.15)" />
                  <Text style={styles.placeholderText}>Sign here</Text>
                </View>
              )}
            </View>
            
            {/* Clear button */}
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => { setPaths([]); setCurrentPath([]); }}
              disabled={paths.length === 0}
            >
              <Ionicons name="refresh" size={18} color={paths.length > 0 ? '#666' : '#CCC'} />
              <Text style={[styles.clearButtonText, { color: paths.length > 0 ? '#666' : '#CCC' }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    paddingVertical: 8,
    minWidth: 60,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  previewContainer: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentWrapper: {
    width: '100%',
    height: '100%',
    maxHeight: SCREEN_HEIGHT * 0.5,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  signatureOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'solid',
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  deleteSignatureBtn: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resizeHandleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  pageIndicator: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  bottomControls: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  signaturesScroll: {
    paddingVertical: 8,
    gap: 12,
    flexDirection: 'row',
  },
  addSignatureBtn: {
    width: 80,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  signatureThumb: {
    width: 100,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
    padding: 8,
  },
  signatureThumbImage: {
    width: '100%',
    height: '100%',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  removeButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  // Draw modal styles
  drawContainer: {
    flex: 1,
  },
  drawHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  canvasContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  canvasWrapper: {
    width: SCREEN_WIDTH - 48,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  checkeredBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  checkeredRow: { flex: 1, flexDirection: 'row' },
  checkeredCell: { flex: 1 },
  checkeredLight: { backgroundColor: '#FFFFFF' },
  checkeredDark: { backgroundColor: '#F5F5F5' },
  svgContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.15)',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    marginTop: 20,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

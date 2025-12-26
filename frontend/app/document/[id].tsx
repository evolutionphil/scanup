import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useDocumentStore, Document, PageData } from '../../src/store/documentStore';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';
import FilterEditor from '../../src/components/FilterEditor';
import ExportModal from '../../src/components/ExportModal';
import SignatureModal from '../../src/components/SignatureModal';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user, refreshUser } = useAuthStore();
  const { theme } = useThemeStore();
  const { currentDocument, fetchDocument, updateDocument, deleteDocument, processImage } = useDocumentStore();
  const [loading, setLoading] = useState(true);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFilterEditor, setShowFilterEditor] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signaturePosition, setSignaturePosition] = useState({ x: 0.5, y: 0.8 }); // Default bottom center

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      await fetchDocument(token, id);
    } catch (e) {
      Alert.alert('Error', 'Failed to load document');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || !currentDocument || !token) return;
    
    try {
      await updateDocument(token, currentDocument.document_id, { name: newName.trim() });
      setShowRenameModal(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to rename document');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (token && currentDocument) {
              try {
                await deleteDocument(token, currentDocument.document_id);
                router.back();
              } catch (e) {
                Alert.alert('Error', 'Failed to delete document');
              }
            }
          },
        },
      ]
    );
  };

  const handleApplyFilter = async (filterType: string, adjustments: { brightness: number; contrast: number; saturation: number }) => {
    if (!currentDocument || !token || processing) return;
    
    setProcessing(true);
    try {
      const currentPage = currentDocument.pages[selectedPageIndex];
      
      // Use original image as base for non-destructive editing
      const baseImage = currentPage.original_image_base64 || currentPage.image_base64;
      
      // If filter is "original" and no adjustments, just restore original
      if (filterType === 'original' && adjustments.brightness === 0 && adjustments.contrast === 0 && adjustments.saturation === 0) {
        const updatedPages = [...currentDocument.pages];
        updatedPages[selectedPageIndex] = {
          ...updatedPages[selectedPageIndex],
          image_base64: baseImage,
          filter_applied: 'original',
          adjustments: undefined,
        };
        await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
        setShowFilterEditor(false);
        setProcessing(false);
        return;
      }
      
      const response = await fetch(`${BACKEND_URL}/api/images/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: baseImage,
          operation: 'filter',
          params: {
            type: filterType,
            brightness: adjustments.brightness,
            contrast: adjustments.contrast,
            saturation: adjustments.saturation,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const result = await response.json();

      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...updatedPages[selectedPageIndex],
        image_base64: result.processed_image_base64,
        original_image_base64: currentPage.original_image_base64 || currentPage.image_base64,
        filter_applied: filterType,
        adjustments: adjustments,
      };

      await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
      setShowFilterEditor(false);
    } catch (e) {
      console.error('Filter error:', e);
      Alert.alert('Error', 'Failed to apply filter');
    } finally {
      setProcessing(false);
    }
  };

  const handleRotate = async () => {
    if (!currentDocument || !token || processing) return;
    
    setProcessing(true);
    try {
      const currentPage = currentDocument.pages[selectedPageIndex];
      const processedImage = await processImage(
        token,
        currentPage.image_base64,
        'rotate',
        { degrees: 90 }
      );

      // Also rotate the original if it exists
      let rotatedOriginal = currentPage.original_image_base64;
      if (rotatedOriginal) {
        rotatedOriginal = await processImage(token, rotatedOriginal, 'rotate', { degrees: 90 });
      }

      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...updatedPages[selectedPageIndex],
        image_base64: processedImage,
        original_image_base64: rotatedOriginal || processedImage,
        rotation: ((currentPage.rotation || 0) + 90) % 360,
      };

      await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
    } catch (e) {
      Alert.alert('Error', 'Failed to rotate image');
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoCrop = async () => {
    if (!currentDocument || !token || processing) return;
    
    setProcessing(true);
    try {
      const currentPage = currentDocument.pages[selectedPageIndex];
      
      // Store original before cropping if not already stored
      const originalImage = currentPage.original_image_base64 || currentPage.image_base64;
      
      const response = await fetch(`${BACKEND_URL}/api/images/auto-crop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: currentPage.image_base64,
          operation: 'auto_crop',
          params: {}
        }),
      });

      const result = await response.json();

      if (result.success && result.cropped_image_base64) {
        const updatedPages = [...currentDocument.pages];
        updatedPages[selectedPageIndex] = {
          ...updatedPages[selectedPageIndex],
          image_base64: result.cropped_image_base64,
          original_image_base64: originalImage, // Preserve original for revert
        };

        await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
        Alert.alert('Success', 'Document cropped. Use "Revert" to undo if needed.');
      } else {
        Alert.alert('Auto-crop', result.message || 'Could not detect document edges. The image might already be well-cropped or try manual adjustment.');
      }
    } catch (e) {
      console.error('Auto-crop error:', e);
      Alert.alert('Error', 'Failed to auto-crop image');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevertToOriginal = async () => {
    if (!currentDocument || !token || processing) return;
    
    const currentPage = currentDocument.pages[selectedPageIndex];
    if (!currentPage.original_image_base64) {
      Alert.alert('Info', 'No original image saved for this page');
      return;
    }

    Alert.alert(
      'Revert to Original',
      'This will remove all filters and adjustments. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revert',
          onPress: async () => {
            setProcessing(true);
            try {
              const updatedPages = [...currentDocument.pages];
              updatedPages[selectedPageIndex] = {
                ...updatedPages[selectedPageIndex],
                image_base64: currentPage.original_image_base64!,
                filter_applied: 'original',
                adjustments: undefined,
              };

              await updateDocument(token!, currentDocument.document_id, { pages: updatedPages });
            } catch (e) {
              Alert.alert('Error', 'Failed to revert image');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleOCR = async () => {
    if (!currentDocument || !user || !token) return;
    
    if (!user.is_premium && user.ocr_remaining_today <= 0) {
      Alert.alert(
        'OCR Limit Reached',
        'You have used all your free OCR scans today. Upgrade to Premium for unlimited OCR.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    const currentPage = currentDocument.pages[selectedPageIndex];
    
    if (currentPage.ocr_text) {
      setOcrText(currentPage.ocr_text);
      setShowOcrModal(true);
      return;
    }

    setOcrLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ocr/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: currentPage.image_base64,
          language: 'en',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'OCR failed');
      }

      const result = await response.json();
      
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...updatedPages[selectedPageIndex],
        ocr_text: result.text,
      };

      await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
      
      setOcrText(result.text);
      setShowOcrModal(true);
      
      refreshUser();
    } catch (e: any) {
      console.error('OCR error:', e);
      Alert.alert('OCR Error', e.message || 'Failed to extract text');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCopyText = async () => {
    if (ocrText) {
      await Clipboard.setStringAsync(ocrText);
      Alert.alert('Copied', 'Text copied to clipboard');
    }
  };

  const handleShare = async () => {
    if (!currentDocument) return;
    
    setShareLoading(true);
    try {
      const currentPage = currentDocument.pages[selectedPageIndex];
      const fileName = `${currentDocument.name.replace(/[^a-z0-9]/gi, '_')}_page${selectedPageIndex + 1}.jpg`;
      const fileUri = `${cacheDirectory}${fileName}`;
      
      await writeAsStringAsync(fileUri, currentPage.image_base64, {
        encoding: EncodingType.Base64,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/jpeg',
          dialogTitle: `Share ${currentDocument.name}`,
          UTI: 'public.jpeg',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (e: any) {
      console.error('Share error:', e);
      Alert.alert('Share Error', 'Failed to share document. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleAddSignature = async (signatureBase64: string) => {
    if (!currentDocument || !token || processing) return;
    
    setProcessing(true);
    try {
      const currentPage = currentDocument.pages[selectedPageIndex];
      
      // Store original before signing if not already stored
      const originalImage = currentPage.original_image_base64 || currentPage.image_base64;
      
      const response = await fetch(`${BACKEND_URL}/api/images/add-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: currentPage.image_base64,
          signature_base64: signatureBase64,
          position_x: signaturePosition.x,
          position_y: signaturePosition.y,
          scale: 0.35, // 35% of image width
        }),
      });

      const result = await response.json();

      if (result.success && result.signed_image_base64) {
        const updatedPages = [...currentDocument.pages];
        updatedPages[selectedPageIndex] = {
          ...updatedPages[selectedPageIndex],
          image_base64: result.signed_image_base64,
          original_image_base64: originalImage, // Preserve original for revert
        };

        await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
        Alert.alert('Success', 'Signature added to document');
      } else {
        Alert.alert('Error', result.message || 'Failed to add signature');
      }
    } catch (e) {
      console.error('Signature error:', e);
      Alert.alert('Error', 'Failed to add signature');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePage = () => {
    if (!currentDocument || currentDocument.pages.length <= 1) {
      Alert.alert('Cannot Delete', 'Document must have at least one page');
      return;
    }

    Alert.alert(
      'Delete Page',
      'Are you sure you want to delete this page?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (token && currentDocument) {
              const updatedPages = currentDocument.pages.filter((_, i) => i !== selectedPageIndex);
              try {
                await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
                setSelectedPageIndex(Math.max(0, selectedPageIndex - 1));
              } catch (e) {
                Alert.alert('Error', 'Failed to delete page');
              }
            }
          },
        },
      ]
    );
  };

  const handleMovePage = async (direction: 'up' | 'down') => {
    if (!currentDocument || !token) return;
    
    const newIndex = direction === 'up' ? selectedPageIndex - 1 : selectedPageIndex + 1;
    if (newIndex < 0 || newIndex >= currentDocument.pages.length) return;
    
    const updatedPages = [...currentDocument.pages];
    [updatedPages[selectedPageIndex], updatedPages[newIndex]] = [updatedPages[newIndex], updatedPages[selectedPageIndex]];
    
    // Update order property
    updatedPages.forEach((page, index) => {
      page.order = index;
    });
    
    try {
      await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
      setSelectedPageIndex(newIndex);
    } catch (e) {
      Alert.alert('Error', 'Failed to reorder pages');
    }
  };

  if (loading || !currentDocument) {
    return <LoadingScreen message="Loading document..." />;
  }

  const currentPage = currentDocument.pages[selectedPageIndex];
  // Show revert button if we have an original saved (regardless of current filter)
  const hasOriginal = !!currentPage.original_image_base64;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.titleContainer}
          onPress={() => {
            setNewName(currentDocument.name);
            setShowRenameModal(true);
          }}
        >
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {currentDocument.name}
          </Text>
          <Ionicons name="pencil" size={16} color={theme.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuButton, { backgroundColor: theme.surface }]} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={24} color={theme.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${currentPage.image_base64}` }}
          style={styles.mainImage}
          resizeMode="contain"
        />
        {(processing || ocrLoading || shareLoading) && (
          <View style={[styles.processingOverlay, { backgroundColor: theme.overlay }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.processingText}>
              {ocrLoading ? 'Extracting text...' : shareLoading ? 'Preparing...' : 'Processing...'}
            </Text>
          </View>
        )}
        
        {/* Filter badge */}
        {currentPage.filter_applied && currentPage.filter_applied !== 'original' && (
          <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="color-wand" size={12} color="#FFF" />
            <Text style={styles.filterBadgeText}>{currentPage.filter_applied}</Text>
          </View>
        )}
      </View>

      {currentDocument.pages.length > 1 && (
        <View style={styles.pageIndicator}>
          <TouchableOpacity 
            onPress={() => selectedPageIndex > 0 && setSelectedPageIndex(selectedPageIndex - 1)}
            disabled={selectedPageIndex === 0}
            style={[styles.pageNavBtn, selectedPageIndex === 0 && { opacity: 0.3 }]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.pageIndicatorText, { color: theme.textMuted }]}>
            Page {selectedPageIndex + 1} of {currentDocument.pages.length}
          </Text>
          <TouchableOpacity 
            onPress={() => selectedPageIndex < currentDocument.pages.length - 1 && setSelectedPageIndex(selectedPageIndex + 1)}
            disabled={selectedPageIndex === currentDocument.pages.length - 1}
            style={[styles.pageNavBtn, selectedPageIndex === currentDocument.pages.length - 1 && { opacity: 0.3 }]}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {currentDocument.pages.length > 1 && (
        <ScrollView
          horizontal
          style={styles.thumbnailScroll}
          contentContainerStyle={styles.thumbnailContent}
          showsHorizontalScrollIndicator={false}
        >
          {currentDocument.pages.map((page, index) => (
            <TouchableOpacity
              key={page.page_id}
              style={[
                styles.thumbnailContainer,
                { borderColor: index === selectedPageIndex ? theme.primary : 'transparent' },
              ]}
              onPress={() => setSelectedPageIndex(index)}
            >
              <Image
                source={{ uri: `data:image/jpeg;base64,${page.thumbnail_base64 || page.image_base64}` }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <View style={styles.thumbnailNumber}>
                <Text style={styles.thumbnailNumberText}>{index + 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll}>
        <View style={[styles.actions, { borderTopColor: theme.border }]}>
          <ActionButton icon="add-circle" label="Add Page" onPress={() => router.push({ pathname: '/scanner', params: { addToDocument: currentDocument.document_id } })} theme={theme} />
          <ActionButton icon="color-wand" label="Filters" onPress={() => setShowFilterEditor(true)} theme={theme} />
          <ActionButton icon="refresh" label="Rotate" onPress={handleRotate} theme={theme} />
          <ActionButton icon="crop" label="Auto Crop" onPress={handleAutoCrop} theme={theme} />
          <ActionButton icon="pencil" label="Sign" onPress={() => setShowSignatureModal(true)} theme={theme} />
          {hasOriginal && (
            <ActionButton icon="arrow-undo" label="Revert" onPress={handleRevertToOriginal} theme={theme} />
          )}
          <ActionButton icon="text" label="OCR" onPress={handleOCR} badge={currentPage.ocr_text ? '✓' : undefined} theme={theme} />
          <ActionButton icon="download-outline" label="Export" onPress={() => setShowExportModal(true)} theme={theme} />
          <ActionButton icon="share-outline" label="Share" onPress={handleShare} theme={theme} />
          {currentDocument.pages.length > 1 && (
            <>
              <ActionButton 
                icon="arrow-up" 
                label="Move Up" 
                onPress={() => handleMovePage('up')} 
                disabled={selectedPageIndex === 0}
                theme={theme} 
              />
              <ActionButton 
                icon="arrow-down" 
                label="Move Down" 
                onPress={() => handleMovePage('down')} 
                disabled={selectedPageIndex === currentDocument.pages.length - 1}
                theme={theme} 
              />
              <ActionButton icon="trash" label="Del Page" onPress={handleDeletePage} danger theme={theme} />
            </>
          )}
        </View>
      </ScrollView>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Rename Document</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Document name"
              placeholderTextColor={theme.textMuted}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowRenameModal(false)}
                style={styles.modalButton}
              />
              <Button
                title="Save"
                onPress={handleRename}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Editor */}
      <FilterEditor
        visible={showFilterEditor}
        onClose={() => setShowFilterEditor(false)}
        imageBase64={currentPage.image_base64}
        originalImageBase64={currentPage.original_image_base64}
        currentFilter={currentPage.filter_applied || 'original'}
        onApply={handleApplyFilter}
        isProcessing={processing}
        token={token || ''}
      />

      {/* OCR Modal */}
      <Modal
        visible={showOcrModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOcrModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.ocrModalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.ocrModalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Extracted Text</Text>
              <TouchableOpacity onPress={() => setShowOcrModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.ocrTextContainer, { backgroundColor: theme.background }]}>
              <Text style={[styles.ocrText, { color: theme.textSecondary }]} selectable>{ocrText || 'No text detected'}</Text>
            </ScrollView>
            <Button
              title="Copy Text"
              onPress={handleCopyText}
              style={styles.copyButton}
              icon={<Ionicons name="copy" size={20} color="#FFF" />}
            />
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        documentId={currentDocument.document_id}
        documentName={currentDocument.name}
        hasOcrText={currentDocument.pages.some((p) => !!p.ocr_text)}
        isPremium={user?.is_premium || false}
        token={token || ''}
        pages={currentDocument.pages.map(p => ({ image_base64: p.image_base64, ocr_text: p.ocr_text }))}
      />
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  danger,
  badge,
  disabled,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
  disabled?: boolean;
  theme: any;
}) {
  return (
    <TouchableOpacity 
      style={[styles.actionButton, disabled && { opacity: 0.4 }]} 
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[
        styles.actionIcon,
        { backgroundColor: danger ? theme.danger + '15' : theme.primary + '15' }
      ]}>
        <Ionicons name={icon} size={22} color={danger ? theme.danger : theme.primary} />
        {badge && (
          <View style={[styles.badge, { backgroundColor: theme.success }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.actionLabel, { color: danger ? theme.danger : theme.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  mainImage: {
    flex: 1,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 12,
  },
  filterBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  filterBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  pageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 16,
  },
  pageNavBtn: {
    padding: 4,
  },
  pageIndicatorText: {
    fontSize: 13,
  },
  thumbnailScroll: {
    maxHeight: 100,
  },
  thumbnailContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  thumbnailContainer: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailNumber: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  thumbnailNumberText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  actionsScroll: {
    maxHeight: 90,
  },
  actions: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    alignItems: 'center',
    minWidth: 56,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  actionLabel: {
    fontSize: 10,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  ocrModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '70%',
    position: 'absolute',
    bottom: 0,
  },
  ocrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ocrTextContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    maxHeight: 300,
  },
  ocrText: {
    fontSize: 15,
    lineHeight: 24,
  },
  copyButton: {
    marginTop: 8,
  },
});

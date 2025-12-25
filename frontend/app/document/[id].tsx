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
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../src/store/authStore';
import { useDocumentStore, Document, PageData } from '../../src/store/documentStore';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FILTERS = [
  { id: 'original', name: 'Original', icon: 'image' },
  { id: 'enhanced', name: 'Enhanced', icon: 'color-wand' },
  { id: 'grayscale', name: 'Grayscale', icon: 'contrast' },
  { id: 'bw', name: 'B&W', icon: 'moon' },
  { id: 'document', name: 'Document', icon: 'document-text' },
];

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user, refreshUser } = useAuthStore();
  const { currentDocument, fetchDocument, updateDocument, deleteDocument, processImage } = useDocumentStore();
  const [loading, setLoading] = useState(true);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

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

  const handleApplyFilter = async (filterType: string) => {
    if (!currentDocument || !token || processing) return;
    
    setProcessing(true);
    try {
      const currentPage = currentDocument.pages[selectedPageIndex];
      const processedImage = await processImage(
        token,
        currentPage.image_base64,
        'filter',
        { type: filterType }
      );

      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...updatedPages[selectedPageIndex],
        image_base64: processedImage,
        filter_applied: filterType,
      };

      await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
      setShowFilterModal(false);
    } catch (e) {
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

      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...updatedPages[selectedPageIndex],
        image_base64: processedImage,
        rotation: (currentPage.rotation + 90) % 360,
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
      
      // Call auto-crop API
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

      if (result.success) {
        const updatedPages = [...currentDocument.pages];
        updatedPages[selectedPageIndex] = {
          ...updatedPages[selectedPageIndex],
          image_base64: result.cropped_image_base64,
        };

        await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
        Alert.alert('Success', 'Document cropped automatically');
      } else {
        Alert.alert('Auto-crop', result.message || 'Could not detect document edges. Try manual crop.');
      }
    } catch (e) {
      console.error('Auto-crop error:', e);
      Alert.alert('Error', 'Failed to auto-crop image');
    } finally {
      setProcessing(false);
    }
  };

  const handleOCR = async () => {
    if (!currentDocument || !user || !token) return;
    
    // Check OCR limits for free users
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
    
    // If OCR already exists for this page, show it
    if (currentPage.ocr_text) {
      setOcrText(currentPage.ocr_text);
      setShowOcrModal(true);
      return;
    }

    setOcrLoading(true);
    try {
      // Call OCR API
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
      
      // Save OCR text to document
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...updatedPages[selectedPageIndex],
        ocr_text: result.text,
      };

      await updateDocument(token, currentDocument.document_id, { pages: updatedPages });
      
      setOcrText(result.text);
      setShowOcrModal(true);
      
      // Refresh user to update OCR count
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
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Write base64 to file
      await FileSystem.writeAsStringAsync(fileUri, currentPage.image_base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Check if sharing is available
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

  const handleShareAllPages = async () => {
    if (!currentDocument || currentDocument.pages.length === 0) return;
    
    setShareLoading(true);
    try {
      // Share all pages as individual images
      const fileUris: string[] = [];
      
      for (let i = 0; i < currentDocument.pages.length; i++) {
        const page = currentDocument.pages[i];
        const fileName = `${currentDocument.name.replace(/[^a-z0-9]/gi, '_')}_page${i + 1}.jpg`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, page.image_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileUris.push(fileUri);
      }

      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable && fileUris.length > 0) {
        // Share the first file (most platforms don't support multi-file sharing)
        await Sharing.shareAsync(fileUris[0], {
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

  if (loading || !currentDocument) {
    return <LoadingScreen message="Loading document..." />;
  }

  const currentPage = currentDocument.pages[selectedPageIndex];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.titleContainer}
          onPress={() => {
            setNewName(currentDocument.name);
            setShowRenameModal(true);
          }}
        >
          <Text style={styles.title} numberOfLines={1}>
            {currentDocument.name}
          </Text>
          <Ionicons name="pencil" size={16} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${currentPage.image_base64}` }}
          style={styles.mainImage}
          resizeMode="contain"
        />
        {(processing || ocrLoading || shareLoading) && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.processingText}>
              {ocrLoading ? 'Extracting text...' : shareLoading ? 'Preparing...' : 'Processing...'}
            </Text>
          </View>
        )}
      </View>

      {currentDocument.pages.length > 1 && (
        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>
            Page {selectedPageIndex + 1} of {currentDocument.pages.length}
          </Text>
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
                index === selectedPageIndex && styles.thumbnailSelected,
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
        <View style={styles.actions}>
          <ActionButton icon="color-wand" label="Filter" onPress={() => setShowFilterModal(true)} />
          <ActionButton icon="refresh" label="Rotate" onPress={handleRotate} />
          <ActionButton icon="crop" label="Auto Crop" onPress={handleAutoCrop} />
          <ActionButton icon="text" label="OCR" onPress={handleOCR} badge={currentPage.ocr_text ? 'Done' : undefined} />
          <ActionButton icon="share-outline" label="Share" onPress={handleShare} />
          {currentDocument.pages.length > 1 && (
            <ActionButton icon="trash" label="Del Page" onPress={handleDeletePage} danger />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Document</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Document name"
              placeholderTextColor="#64748B"
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

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.modalTitle}>Apply Filter</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#F1F5F9" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterGrid}>
              {FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterOption,
                    currentPage.filter_applied === filter.id && styles.filterSelected,
                  ]}
                  onPress={() => handleApplyFilter(filter.id)}
                  disabled={processing}
                >
                  <View style={[
                    styles.filterIcon,
                    currentPage.filter_applied === filter.id && styles.filterIconSelected
                  ]}>
                    <Ionicons
                      name={filter.icon as any}
                      size={28}
                      color={currentPage.filter_applied === filter.id ? '#FFF' : '#94A3B8'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.filterName,
                      currentPage.filter_applied === filter.id && styles.filterNameSelected,
                    ]}
                  >
                    {filter.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* OCR Modal */}
      <Modal
        visible={showOcrModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOcrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ocrModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.modalTitle}>Extracted Text</Text>
              <TouchableOpacity onPress={() => setShowOcrModal(false)}>
                <Ionicons name="close" size={24} color="#F1F5F9" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.ocrTextContainer}>
              <Text style={styles.ocrText} selectable>{ocrText || 'No text detected'}</Text>
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
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  danger,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
}) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>
        <Ionicons name={icon} size={22} color={danger ? '#EF4444' : '#3B82F6'} />
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    backgroundColor: '#1E293B',
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
    color: '#F1F5F9',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1E293B',
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 12,
  },
  pageIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  pageIndicatorText: {
    fontSize: 13,
    color: '#64748B',
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
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbnailSelected: {
    borderColor: '#3B82F6',
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
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  actionButton: {
    alignItems: 'center',
    minWidth: 60,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  actionIconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionLabelDanger: {
    color: '#EF4444',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10B981',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 8,
    color: '#FFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  filterModalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-around',
  },
  filterOption: {
    alignItems: 'center',
    width: 60,
  },
  filterSelected: {},
  filterIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterIconSelected: {
    backgroundColor: '#3B82F6',
  },
  filterName: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  filterNameSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  ocrModalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '70%',
    position: 'absolute',
    bottom: 0,
  },
  ocrTextContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    maxHeight: 300,
  },
  ocrText: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 24,
  },
  copyButton: {
    marginTop: 8,
  },
});

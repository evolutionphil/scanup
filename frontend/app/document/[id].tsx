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
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync, EncodingType, readAsStringAsync, getInfoAsync } from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useDocumentStore, Document, PageData, getImageSource } from '../../src/store/documentStore';
import Button from '../../src/components/Button';
import LoadingScreen from '../../src/components/LoadingScreen';
import FilterEditor from '../../src/components/FilterEditor';
import ExportModal from '../../src/components/ExportModal';
import ShareModal from '../../src/components/ShareModal';
import { SignatureDrawingModal, SignaturePlacementModal } from '../../src/components/SignatureModal';
import AnnotationEditor from '../../src/components/AnnotationEditor';
// Local image processing - no backend needed!
import { rotateImage as rotateImageLocal, generatePdfLocally, shareFile } from '../../src/utils/localImageProcessor';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to get page image (handles S3 URLs, file URIs, and base64)
// Priority: base64 (in memory) > S3 URL > file URI
const getPageImage = (page: PageData): string => {
  // Priority 1: In-memory base64 (already loaded)
  if (page.image_base64) {
    if (page.image_base64.startsWith('data:')) return page.image_base64;
    return `data:image/jpeg;base64,${page.image_base64}`;
  }
  // Priority 2: S3 URL
  if (page.image_url) return page.image_url;
  // Priority 3: File URI (local storage)
  if (page.image_file_uri) return page.image_file_uri;
  return '';
};

const getPageThumbnail = (page: PageData): string => {
  if (page.thumbnail_url) return page.thumbnail_url;
  if (page.thumbnail_base64) {
    if (page.thumbnail_base64.startsWith('data:')) return page.thumbnail_base64;
    return `data:image/jpeg;base64,${page.thumbnail_base64}`;
  }
  return getPageImage(page); // Fallback to main image
};

// Helper to get base64 for API calls (needed for filters, OCR, export)
// Returns the actual base64 data (without data: prefix) for API calls
const getPageBase64ForAPI = (page: PageData): string => {
  if (page.image_base64) {
    // Remove data: prefix if present
    if (page.image_base64.startsWith('data:')) {
      return page.image_base64.split(',')[1];
    }
    return page.image_base64;
  }
  return '';
};

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user, refreshUser, isGuest } = useAuthStore();
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const { currentDocument, fetchDocument, updateDocument, deleteDocument, processImage } = useDocumentStore();
  const [loading, setLoading] = useState(true);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFilterEditor, setShowFilterEditor] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Signature states
  const [showSignatureDrawing, setShowSignatureDrawing] = useState(false);
  const [showSignaturePlacement, setShowSignaturePlacement] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  
  // Annotation states
  const [showAnnotationEditor, setShowAnnotationEditor] = useState(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = React.useRef(true);
  const isNavigatingRef = React.useRef(false);

  // Handle safe navigation back
  const handleGoBack = useCallback(() => {
    // Prevent double navigation
    if (isNavigatingRef.current) {
      console.log('[Document] Navigation already in progress');
      return;
    }
    
    isNavigatingRef.current = true;
    console.log('[Document] handleGoBack called');
    
    try {
      // Always navigate to tabs home for consistency
      // This avoids issues with corrupted navigation stack
      router.replace('/(tabs)');
    } catch (e) {
      console.error('[Document] Navigation error:', e);
      // Last resort fallback
      try {
        router.navigate('/(tabs)');
      } catch (e2) {
        console.error('[Document] Fallback navigation error:', e2);
      }
    } finally {
      // Reset navigation lock after a delay
      setTimeout(() => {
        if (isMountedRef.current) {
          isNavigatingRef.current = false;
        }
      }, 500);
    }
  }, []);

  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleGoBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [handleGoBack])
  );

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadDocument();
  }, [id]);

  // Helper to show upgrade prompt for premium features
  const showUpgradePrompt = (featureName: string) => {
    Alert.alert(
      'Premium Feature',
      `${featureName} is available for premium users. Upgrade your plan to unlock this feature!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/(tabs)/profile') },
      ]
    );
  };

  // Check if user can use premium features
  const canUsePremiumFeature = () => {
    return token && (user?.is_premium || user?.is_trial);
  };

  const loadDocument = async () => {
    if (!id) {
      setLoadError('No document ID provided');
      setLoading(false);
      return;
    }
    
    console.log('[DocumentScreen] Loading document:', id);
    setLoading(true);
    setLoadError(null);
    
    try {
      // For local documents (guest mode), token can be null
      const doc = await fetchDocument(token, id);
      console.log('[DocumentScreen] Document loaded:', doc?.document_id, 'Pages:', doc?.pages?.length);
      
      if (!doc || !doc.pages || doc.pages.length === 0) {
        setLoadError('Document has no pages');
        return;
      }
      
      // Debug: Log what data we have for each page
      doc.pages.forEach((p, i) => {
        console.log(`[DocumentScreen] Page ${i}: base64=${!!p.image_base64}, fileUri=${!!p.image_file_uri}, url=${!!p.image_url}`);
        if (p.image_file_uri) {
          console.log(`[DocumentScreen] Page ${i} file URI:`, p.image_file_uri);
        }
      });
      
      // ALWAYS try to load images from file system for local documents
      const pagesWithImages = await Promise.all(doc.pages.map(async (page, idx) => {
        let updatedPage = { ...page };
        
        // If page already has base64 data, use it
        if (page.image_base64 && page.image_base64.length > 100) {
          console.log(`[DocumentScreen] Page ${idx}: Using existing base64`);
          return updatedPage;
        }
        
        // If page has S3 URL, use it (Image component will load from URL)
        if (page.image_url) {
          console.log(`[DocumentScreen] Page ${idx}: Using S3 URL`);
          return updatedPage;
        }
        
        // Load image from file URI
        if (page.image_file_uri) {
          try {
            console.log(`[DocumentScreen] Page ${idx}: Loading from file...`);
            const fileInfo = await getInfoAsync(page.image_file_uri);
            console.log(`[DocumentScreen] Page ${idx}: File exists=${fileInfo.exists}`);
            
            if (fileInfo.exists) {
              const base64 = await readAsStringAsync(page.image_file_uri, {
                encoding: EncodingType.Base64,
              });
              console.log(`[DocumentScreen] Page ${idx}: Loaded ${(base64.length / 1024).toFixed(1)}KB from file`);
              updatedPage.image_base64 = base64;
            } else {
              console.warn(`[DocumentScreen] Page ${idx}: File not found at ${page.image_file_uri}`);
            }
          } catch (e) {
            console.error(`[DocumentScreen] Page ${idx}: Error loading from file:`, e);
          }
        }
        
        // Load original from file too if needed
        if (page.original_file_uri && !page.original_image_base64) {
          try {
            const fileInfo = await getInfoAsync(page.original_file_uri);
            if (fileInfo.exists) {
              const base64 = await readAsStringAsync(page.original_file_uri, {
                encoding: EncodingType.Base64,
              });
              updatedPage.original_image_base64 = base64;
            }
          } catch (e) {
            console.error(`[DocumentScreen] Page ${idx}: Error loading original:`, e);
          }
        }
        
        return updatedPage;
      }));
      
      // Update the document in store with loaded images
      const docWithImages = { ...doc, pages: pagesWithImages };
      useDocumentStore.setState({ currentDocument: docWithImages });
      console.log('[DocumentScreen] Document updated with images');
      
    } catch (e: any) {
      console.error('[DocumentScreen] Failed to load document:', e);
      setLoadError(e.message || 'Failed to load document');
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
    if (!currentDocument || processing) return;
    
    const isLocalDoc = currentDocument.document_id.startsWith('local_');
    
    setProcessing(true);
    try {
      const currentPage = currentDocument.pages[selectedPageIndex];
      
      // Use original image as base for non-destructive editing
      let baseImage = currentPage.original_image_base64 || currentPage.image_base64;
      
      if (!baseImage || baseImage.length < 100) {
        Alert.alert('Error', 'No image found to apply filter');
        setProcessing(false);
        return;
      }
      
      // If filter is "original" and no adjustments, just restore original
      if (filterType === 'original' && adjustments.brightness === 0 && adjustments.contrast === 0 && adjustments.saturation === 0) {
        const updatedPages = [...currentDocument.pages];
        updatedPages[selectedPageIndex] = {
          ...updatedPages[selectedPageIndex],
          image_base64: currentPage.original_image_base64 || currentPage.image_base64,
          filter_applied: 'original',
          adjustments: undefined,
        };
        await updateDocument(isLocalDoc ? null : token, currentDocument.document_id, { pages: updatedPages });
        setShowFilterEditor(false);
        setProcessing(false);
        return;
      }
      
      // LOCAL PROCESSING - no backend needed!
      // For now, filters are stored as metadata and the original image is kept
      // This allows for non-destructive editing
      console.log('[handleApplyFilter] Applying filter locally:', filterType);
      
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...updatedPages[selectedPageIndex],
        // Keep the current image (filter will be re-applied on display if needed)
        image_base64: currentPage.image_base64,
        original_image_base64: currentPage.original_image_base64 || currentPage.image_base64,
        filter_applied: filterType,
        adjustments: adjustments,
      };

      await updateDocument(isLocalDoc ? null : token, currentDocument.document_id, { pages: updatedPages });
      setShowFilterEditor(false);
    } catch (e) {
      console.error('Filter error:', e);
      Alert.alert('Error', 'Failed to apply filter');
    } finally {
      setProcessing(false);
    }
  };

  const handleRotate = async () => {
    if (!currentDocument || processing) return;
    
    setProcessing(true);
    try {
      const currentPage = currentDocument.pages[selectedPageIndex];
      const isLocalDoc = currentDocument.document_id.startsWith('local_');
      
      // Get the image data to rotate
      let imageToRotate = currentPage.image_base64;
      if (!imageToRotate || imageToRotate.length < 100) {
        Alert.alert('Error', 'No image data available to rotate');
        setProcessing(false);
        return;
      }
      
      // Use LOCAL processing - no backend needed!
      console.log('[handleRotate] Using local image processing');
      const processedImage = await rotateImageLocal(imageToRotate, 90);

      // Also rotate the original if it exists
      let rotatedOriginal = currentPage.original_image_base64;
      if (rotatedOriginal && rotatedOriginal.length > 100) {
        rotatedOriginal = await rotateImageLocal(rotatedOriginal, 90);
      }

      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...updatedPages[selectedPageIndex],
        image_base64: processedImage,
        original_image_base64: rotatedOriginal || processedImage,
        rotation: ((currentPage.rotation || 0) + 90) % 360,
      };

      await updateDocument(isLocalDoc ? null : token, currentDocument.document_id, { pages: updatedPages });
    } catch (e) {
      console.error('[handleRotate] Error:', e);
      Alert.alert('Error', 'Failed to rotate image');
    } finally {
      setProcessing(false);
    }
  };

  // Auto-crop removed - document scanner plugin handles cropping during scan

  const handleRevertToOriginal = async () => {
    if (!currentDocument || processing) return;
    
    const currentPage = currentDocument.pages[selectedPageIndex];
    const isLocalDoc = currentDocument.document_id.startsWith('local_');
    
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
    if (!currentDocument) return;
    
    // Check OCR limits for non-premium users (guests and free users)
    const isPremium = user?.is_premium || user?.is_trial;
    if (!isPremium) {
      const ocrRemaining = user?.ocr_remaining_today ?? 3;
      if (ocrRemaining <= 0) {
        Alert.alert(
          'OCR Limit Reached',
          'You have used all your free OCR scans today. Subscribe to Premium for unlimited OCR.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Subscribe', onPress: () => router.push('/(tabs)/profile') },
          ]
        );
        return;
      }
    }

    const currentPage = currentDocument.pages[selectedPageIndex];
    
    if (currentPage.ocr_text) {
      setOcrText(currentPage.ocr_text);
      setShowOcrModal(true);
      return;
    }

    // For guests or local documents, show subscribe message
    if (!token || currentDocument.document_id.startsWith('local_')) {
      Alert.alert(
        'Sign In Required',
        'OCR feature requires an account. Sign in to use OCR.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    setOcrLoading(true);
    try {
      // Strip data: prefix if present - API expects raw base64
      let imageData = currentPage.image_base64;
      if (imageData && imageData.startsWith('data:')) {
        imageData = imageData.split(',')[1];
      }
      
      // Validate image data
      if (!imageData || imageData.length < 100) {
        Alert.alert('Error', 'Image data is not available. Please try closing and reopening the document.');
        setOcrLoading(false);
        return;
      }
      
      const response = await fetch(`${BACKEND_URL}/api/ocr/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: imageData,
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
      const docName = currentDocument.name.replace(/[^a-z0-9]/gi, '_');
      
      // Get image data from pages
      const imagesBase64 = currentDocument.pages.map(page => {
        let imgData = page.image_base64 || '';
        if (imgData.includes(',')) {
          imgData = imgData.split(',')[1];
        }
        return imgData;
      });
      
      if (!imagesBase64[0] || imagesBase64[0].length < 100) {
        Alert.alert('Share Error', 'Document image not available locally. Please try opening the document again.');
        return;
      }
      
      // LOCAL PDF generation - no backend needed!
      console.log('[handleShare] Generating PDF locally...');
      
      // Build HTML with images
      const imageHtml = imagesBase64.map((img, index) => {
        const base64WithPrefix = `data:image/jpeg;base64,${img}`;
        return `
          <div style="page-break-after: ${index < imagesBase64.length - 1 ? 'always' : 'auto'}; text-align: center; padding: 0; margin: 0;">
            <img src="${base64WithPrefix}" style="max-width: 100%; max-height: 100vh; object-fit: contain;" />
          </div>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${currentDocument.name}</title>
            <style>
              @page { margin: 10mm; padding: 0; }
              body { margin: 0; padding: 0; }
              img { display: block; margin: 0 auto; }
            </style>
          </head>
          <body>
            ${imageHtml}
          </body>
        </html>
      `;

      // Generate PDF locally using expo-print
      const { printToFileAsync } = await import('expo-print');
      const { uri } = await printToFileAsync({ html });
      
      // Move to cache with proper name
      const fileName = `ScanUp_${docName}.pdf`;
      const fileUri = `${cacheDirectory}${fileName}`;
      
      // Copy the PDF to cache directory with proper name
      const { copyAsync } = await import('expo-file-system');
      await copyAsync({ from: uri, to: fileUri });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share via ScanUp',
        });
      }
    } catch (e: any) {
      console.error('Share error:', e);
      Alert.alert('Share Error', 'Failed to share document. Please try again.');
    } finally {
      setShareLoading(false);
    }
  };

  // Step 1: User draws signature
  const handleSignatureCreated = (signatureBase64: string) => {
    setPendingSignature(signatureBase64);
    setShowSignatureDrawing(false);
    setShowSignaturePlacement(true);
  };

  // Step 2: User positions and applies signature
  const handleApplySignature = async (signatureBase64: string, position: { x: number; y: number }, scale: number) => {
    if (!currentDocument || !token || processing) return;
    
    setShowSignaturePlacement(false);
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
          position_x: position.x,
          position_y: position.y,
          scale: scale,
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
        Alert.alert('Success', 'Signature added to document. Use "Revert" to undo.');
      } else {
        Alert.alert('Error', result.message || 'Failed to add signature');
      }
    } catch (e) {
      console.error('Signature error:', e);
      Alert.alert('Error', 'Failed to add signature');
    } finally {
      setPendingSignature(null);
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

  // Handle saving annotations
  const handleSaveAnnotations = async (annotations: any[], annotatedImageBase64: string) => {
    if (!currentDocument || processing) return;
    
    const isLocalDoc = currentDocument.document_id.startsWith('local_');
    
    setProcessing(true);
    try {
      const currentPage = currentDocument.pages[selectedPageIndex];
      
      // Store original before annotating if not already stored
      const originalImage = currentPage.original_image_base64 || currentPage.image_base64;
      
      // If we have annotations, render them onto the image via backend
      if (annotations.length > 0) {
        const endpoint = `${BACKEND_URL}/api/images/apply-annotations`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token && !isLocalDoc) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image_base64: currentPage.image_base64,
            annotations: annotations,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.annotated_image_base64) {
            const updatedPages = [...currentDocument.pages];
            updatedPages[selectedPageIndex] = {
              ...updatedPages[selectedPageIndex],
              image_base64: result.annotated_image_base64,
              original_image_base64: originalImage,
              annotations: annotations, // Store annotations data for future editing
            };
            
            await updateDocument(isLocalDoc ? null : token, currentDocument.document_id, { pages: updatedPages });
            Alert.alert('Success', 'Annotations saved! Use "Revert" to undo.');
          } else {
            throw new Error('Failed to apply annotations');
          }
        } else {
          throw new Error('Backend error');
        }
      }
    } catch (e) {
      console.error('Annotation error:', e);
      Alert.alert('Error', 'Failed to save annotations. The annotations data will not be saved.');
    } finally {
      setProcessing(false);
      setShowAnnotationEditor(false);
    }
  };

  // Loading state with back button
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface }]} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Loading...</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading document...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state or no document
  if (loadError || !currentDocument) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface }]} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Document</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingCenter}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.danger} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Document Not Found</Text>
          <Text style={[styles.errorText, { color: theme.textMuted }]}>
            {loadError || 'This document could not be loaded.'}
          </Text>
          <Button 
            title="Go Back" 
            onPress={handleGoBack}
            style={{ marginTop: 20 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const currentPage = currentDocument.pages[selectedPageIndex];
  
  // Check if current page is valid
  if (!currentPage) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface }]} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Document</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingCenter}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.warning} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>No Pages</Text>
          <Text style={[styles.errorText, { color: theme.textMuted }]}>
            This document has no pages to display.
          </Text>
          <Button 
            title="Go Back" 
            onPress={handleGoBack}
            style={{ marginTop: 20 }}
          />
        </View>
      </SafeAreaView>
    );
  }
  
  // Show revert button if we have an original saved (regardless of current filter)
  const hasOriginal = !!currentPage.original_image_base64;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface }]} onPress={handleGoBack}>
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
          source={{ uri: getPageImage(currentPage) }}
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
              key={page.page_id || `page-${index}`}
              style={[
                styles.thumbnailContainer,
                { borderColor: index === selectedPageIndex ? theme.primary : 'transparent' },
              ]}
              onPress={() => setSelectedPageIndex(index)}
            >
              <Image
                source={{ uri: getPageThumbnail(page) }}
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
          <ActionButton 
            icon="add-circle" 
            label="Add Page" 
            onPress={() => {
              if (isNavigatingRef.current) return;
              isNavigatingRef.current = true;
              try {
                router.push({ pathname: '/scanner', params: { addToDocument: currentDocument.document_id } });
              } catch (e) {
                console.error('[Document] Add page navigation error:', e);
              } finally {
                setTimeout(() => {
                  if (isMountedRef.current) {
                    isNavigatingRef.current = false;
                  }
                }, 500);
              }
            }} 
            theme={theme} 
          />
          <ActionButton icon="color-wand" label="Filters" onPress={() => setShowFilterEditor(true)} theme={theme} />
          <ActionButton icon="refresh" label="Rotate" onPress={handleRotate} theme={theme} />
          <ActionButton 
            icon="brush" 
            label="Annotate" 
            onPress={() => setShowAnnotationEditor(true)} 
            theme={theme} 
          />
          <ActionButton 
            icon="pencil" 
            label={hasOriginal ? "Re-Sign" : "Sign"} 
            onPress={() => {
              if (!token) {
                showUpgradePrompt('Signature');
              } else if (hasOriginal) {
                // Page already has signature - confirm replacement
                Alert.alert(
                  'Replace Signature',
                  'This page already has edits. Would you like to add another signature or start fresh?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Add New', 
                      onPress: () => setShowSignatureDrawing(true) 
                    },
                    { 
                      text: 'Start Fresh', 
                      onPress: async () => {
                        // Revert to original first, then open signature
                        await handleRevertToOriginal();
                        setTimeout(() => setShowSignatureDrawing(true), 500);
                      }
                    },
                  ]
                );
              } else {
                setShowSignatureDrawing(true);
              }
            }} 
            theme={theme} 
          />
          {hasOriginal && (
            <ActionButton icon="arrow-undo" label="Revert" onPress={handleRevertToOriginal} theme={theme} />
          )}
          <ActionButton icon="text" label="OCR" onPress={handleOCR} badge={currentPage.ocr_text ? '✓' : undefined} theme={theme} />
          <ActionButton 
            icon="download-outline" 
            label="Export" 
            onPress={() => {
              if (!token) {
                showUpgradePrompt('Export to PDF/DOCX');
              } else {
                setShowExportModal(true);
              }
            }} 
            theme={theme} 
          />
          <ActionButton 
            icon="share-outline" 
            label="Share" 
            onPress={() => setShowShareModal(true)} 
            theme={theme} 
          />
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
        imageBase64={currentPage.image_base64 || ''}
        originalImageBase64={currentPage.original_image_base64 || ''}
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

      {/* Signature Drawing Modal - Step 1 */}
      <SignatureDrawingModal
        visible={showSignatureDrawing}
        onClose={() => setShowSignatureDrawing(false)}
        onSignatureCreated={handleSignatureCreated}
        theme={theme}
      />

      {/* Signature Placement Modal - Step 2 */}
      {pendingSignature && currentDocument && (
        <SignaturePlacementModal
          visible={showSignaturePlacement}
          documentImage={currentDocument.pages[selectedPageIndex].image_base64}
          signatureImage={pendingSignature}
          onClose={() => {
            setShowSignaturePlacement(false);
            setPendingSignature(null);
          }}
          onApply={handleApplySignature}
          theme={theme}
        />
      )}

      {/* Annotation Editor Modal */}
      {currentDocument && (
        <AnnotationEditor
          visible={showAnnotationEditor}
          onClose={() => setShowAnnotationEditor(false)}
          imageBase64={currentDocument.pages[selectedPageIndex].image_base64}
          onSave={handleSaveAnnotations}
          existingAnnotations={(currentDocument.pages[selectedPageIndex] as any).annotations || []}
        />
      )}
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
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
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

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  Image,
  Platform,
  TextInput,
  StatusBar,
  ActivityIndicator,
  ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Print from 'expo-print';
import { getInfoAsync, readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useDocumentStore, Document, Folder, getImageSource } from '../../src/store/documentStore';
import MoveToFolderModal from '../../src/components/MoveToFolderModal';
import ShareModal from '../../src/components/ShareModal';
import DeleteConfirmModal from '../../src/components/DeleteConfirmModal';
import { useOfflineQueue } from '../../src/hooks/useOfflineQueue';
import { useTabStore } from './_layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FOLDER_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

type TabType = 'documents' | 'folders';
type SortType = 'a-z' | 'z-a' | 'newest' | 'oldest';
type ViewType = 'list' | 'grid';

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const { user, token, isGuest } = useAuthStore();
  const { theme } = useThemeStore();
  const { activeMainTab, setActiveMainTab } = useTabStore();
  const { documents, folders, isLoading, isSyncing, pendingSyncCount, fetchDocuments, fetchFolders, deleteDocument, updateDocument, deleteFolder, syncPendingDocuments, loadLocalCache, createFolder } = useDocumentStore();
  const { hasPending, pendingDocIds } = useOfflineQueue();
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('a-z');
  const [viewMode, setViewMode] = useState<ViewType>('list');
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Deleting state for spinner
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Create folder modal
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [creating, setCreating] = useState(false);
  
  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameDoc, setRenameDoc] = useState<Document | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Rename folder modal state
  const [showRenameFolderModal, setShowRenameFolderModal] = useState(false);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  
  // Folder password modal state
  const [showFolderPasswordModal, setShowFolderPasswordModal] = useState(false);
  const [folderForPassword, setFolderForPassword] = useState<Folder | null>(null);
  const [folderPasswordValue, setFolderPasswordValue] = useState('');
  
  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordDoc, setPasswordDoc] = useState<Document | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  
  // Unlock password modal state
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockDoc, setUnlockDoc] = useState<Document | null>(null);
  const [unlockPasswordValue, setUnlockPasswordValue] = useState('');
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDoc, setShareDoc] = useState<Document | null>(null);
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);
  
  // Document action sheet modal (for Android)
  const [showDocActionSheet, setShowDocActionSheet] = useState(false);
  const [actionSheetDoc, setActionSheetDoc] = useState<Document | null>(null);
  
  // Folder action sheet modal (for Android)
  const [showFolderActionSheet, setShowFolderActionSheet] = useState(false);
  const [actionSheetFolder, setActionSheetFolder] = useState<Folder | null>(null);
  
  // Share after unlock flag
  const [shareAfterUnlock, setShareAfterUnlock] = useState(false);
  
  // Temp sort values for modal
  const [tempSortBy, setTempSortBy] = useState<SortType>('a-z');
  const [tempViewMode, setTempViewMode] = useState<ViewType>('list');
  
  // Network listener for background sync
  useEffect(() => {
    loadLocalCache();
    
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && token && !isGuest) {
        syncPendingDocuments(token);
      }
    });
    
    return () => unsubscribe();
  }, [token, isGuest]);

  // Migrate guest documents after login
  useEffect(() => {
    const migrateIfNeeded = async () => {
      if (token && !isGuest && user && user.user_id) {
        const { migrateGuestDocumentsToAccount } = useDocumentStore.getState();
        const migratedCount = await migrateGuestDocumentsToAccount(token, user.user_id);
        if (migratedCount > 0) {
          Alert.alert(
            'Documents Migrated',
            `${migratedCount} document${migratedCount > 1 ? 's' : ''} from guest mode ${migratedCount > 1 ? 'have' : 'has'} been added to your account.`,
            [{ text: 'OK' }]
          );
          fetchDocuments(token);
        }
      }
    };
    migrateIfNeeded();
  }, [token, isGuest, user]);

  const loadDocuments = async () => {
    try {
      if (token && !isGuest) {
        await Promise.all([fetchDocuments(token), fetchFolders(token)]);
      } else {
        await fetchDocuments(null);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
      setSelectionMode(false);
      setSelectedDocs([]);
    }, [token, isGuest])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  // Get sorted documents
  const getSortedDocuments = () => {
    const docs = [...documents];
    switch (sortBy) {
      case 'a-z':
        return docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'z-a':
        return docs.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      case 'newest':
        return docs.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
      case 'oldest':
        return docs.sort((a, b) => new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime());
      default:
        return docs;
    }
  };

  // Get latest 5 documents
  const getLatestDocuments = () => {
    return [...documents]
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 5);
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'a-z': return 'A-Z';
      case 'z-a': return 'Z-A';
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      default: return 'Name';
    }
  };

  const handleDocumentPress = (doc: Document) => {
    if (selectionMode) {
      toggleSelection(doc.document_id);
    } else {
      const latestDoc = documents.find(d => d.document_id === doc.document_id) || doc;
      
      if (latestDoc.password || latestDoc.is_password_protected) {
        setUnlockDoc(latestDoc);
        setUnlockPasswordValue('');
        setShowUnlockModal(true);
      } else {
        router.push(`/document/${doc.document_id}`);
      }
    }
  };
  
  const handleUnlockDocument = () => {
    if (!unlockDoc) return;
    
    const latestDoc = documents.find(d => d.document_id === unlockDoc.document_id);
    const docPassword = latestDoc?.password || unlockDoc.password;
    
    if (unlockPasswordValue === docPassword) {
      setShowUnlockModal(false);
      
      if (shareAfterUnlock) {
        setShareDoc(latestDoc || unlockDoc);
        setShowShareModal(true);
        setShareAfterUnlock(false);
      } else {
        router.push(`/document/${unlockDoc.document_id}`);
      }
      
      setUnlockDoc(null);
      setUnlockPasswordValue('');
    } else {
      Alert.alert('Incorrect Password', 'Please try again.');
    }
  };

  const handleDocumentLongPress = (doc: Document) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedDocs([doc.document_id]);
    }
  };

  const toggleSelection = (docId: string) => {
    if (selectedDocs.includes(docId)) {
      const newSelection = selectedDocs.filter(id => id !== docId);
      setSelectedDocs(newSelection);
      if (newSelection.length === 0) {
        setSelectionMode(false);
      }
    } else {
      setSelectedDocs([...selectedDocs, docId]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocs.length === 0) return;
    
    Alert.alert(
      'Delete Documents',
      `Are you sure you want to delete ${selectedDocs.length} document(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              for (const docId of selectedDocs) {
                await deleteDocument(token || null, docId);
              }
              setSelectionMode(false);
              setSelectedDocs([]);
            } catch (e) {
              console.error('Error deleting:', e);
              Alert.alert('Error', 'Failed to delete some documents');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (selectedDocs.length === 0) return;
    
    try {
      for (const docId of selectedDocs) {
        await updateDocument(token || null, docId, { folder_id: folderId });
      }
      
      await fetchFolders(token || null);
      
      setShowMoveModal(false);
      setSelectionMode(false);
      setSelectedDocs([]);
      Alert.alert('Success', `Moved ${selectedDocs.length} document(s) to ${folderId ? 'folder' : 'main library'}`);
    } catch (e) {
      console.error('Error moving document:', e);
      Alert.alert('Error', 'Failed to move document');
    }
  };
  
  const handleCreateFolderInModal = async (name: string, color: string): Promise<any> => {
    try {
      const newFolder = await createFolder(token || null, { name, color });
      return newFolder;
    } catch (e) {
      Alert.alert('Error', 'Failed to create folder');
      return null;
    }
  };

  // Create folder handler
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    setCreating(true);
    try {
      await createFolder(token || null, { name: newFolderName.trim(), color: selectedColor });
      setShowCreateFolderModal(false);
      setNewFolderName('');
      setSelectedColor(FOLDER_COLORS[0]);
      await fetchFolders(token || null);
    } catch (e) {
      console.error('Folder creation error:', e);
      Alert.alert('Error', 'Failed to create folder. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Show document actions (iOS ActionSheet / Android custom modal)
  const showDocumentActions = (doc: Document) => {
    setActionSheetDoc(doc);
    // Always use custom modal for consistent design across platforms
    setShowDocActionSheet(true);
  };

  // Show folder actions
  const showFolderActions = (folder: Folder) => {
    setActionSheetFolder(folder);
    // Always use custom modal for consistent design across platforms
    setShowFolderActionSheet(true);
  };

  // Document action handlers
  const handleExportDocument = (doc: Document) => {
    const latestDoc = documents.find(d => d.document_id === doc.document_id) || doc;
    
    if (latestDoc.password || latestDoc.is_password_protected) {
      Alert.alert(
        'Protected Document',
        'This document is password protected. Enter the password to share.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enter Password',
            onPress: () => {
              setUnlockDoc(latestDoc);
              setUnlockPasswordValue('');
              setShowUnlockModal(true);
              setShareAfterUnlock(true);
            },
          },
        ]
      );
    } else {
      setShareDoc(doc);
      setShowShareModal(true);
    }
  };

  const handleRenameDocument = (doc: Document) => {
    setRenameDoc(doc);
    setRenameValue(doc.name);
    setShowRenameModal(true);
  };
  
  const confirmRename = async () => {
    if (renameDoc && renameValue.trim() && token) {
      try {
        await updateDocument(token, renameDoc.document_id, { name: renameValue.trim() });
        Alert.alert('Success', 'Document renamed successfully');
      } catch (e) {
        Alert.alert('Error', 'Failed to rename document');
      }
    }
    setShowRenameModal(false);
    setRenameDoc(null);
    setRenameValue('');
  };

  const handleEditDocument = (doc: Document) => {
    router.push(`/document/${doc.document_id}`);
  };

  const handlePrintDocument = async (doc: Document) => {
    try {
      const pageImages: string[] = [];
      
      for (const page of doc.pages) {
        let imgSrc = '';
        
        if (page.image_base64 && page.image_base64.length > 100) {
          imgSrc = page.image_base64.startsWith('data:') 
            ? page.image_base64 
            : `data:image/jpeg;base64,${page.image_base64}`;
        }
        else if (page.image_file_uri) {
          try {
            const fileInfo = await getInfoAsync(page.image_file_uri);
            if (fileInfo.exists) {
              const base64 = await readAsStringAsync(page.image_file_uri, {
                encoding: EncodingType.Base64,
              });
              imgSrc = `data:image/jpeg;base64,${base64}`;
            }
          } catch (e) {
            console.error('Failed to load image from file:', e);
          }
        }
        else if (page.image_url) {
          try {
            const response = await fetch(page.image_url);
            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            imgSrc = dataUrl;
          } catch (e) {
            console.error('Failed to load image from URL:', e);
          }
        }
        
        if (imgSrc) {
          pageImages.push(imgSrc);
        }
      }
      
      if (pageImages.length === 0) {
        Alert.alert('Error', 'No images available to print');
        return;
      }
      
      const pagesHtml = pageImages.map((imgSrc, i) => {
        return `<div style="page-break-after: ${i < pageImages.length - 1 ? 'always' : 'auto'}; text-align: center; padding: 10mm;">
          <img src="${imgSrc}" style="max-width: 100%; max-height: 90vh; object-fit: contain;"/>
        </div>`;
      }).join('');
      
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${doc.name}</title>
            <style>
              @page { margin: 10mm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: sans-serif; }
            </style>
          </head>
          <body>
            ${pagesHtml}
          </body>
        </html>
      `;
      
      await Print.printAsync({ html });
    } catch (e) {
      console.error('Print error:', e);
      Alert.alert('Error', 'Failed to print document');
    }
  };

  const handlePasswordDocument = (doc: Document) => {
    setPasswordDoc(doc);
    setPasswordValue('');
    setShowPasswordModal(true);
  };
  
  const confirmPassword = async () => {
    if (passwordDoc) {
      try {
        const isLocalDoc = passwordDoc.document_id.startsWith('local_');
        await updateDocument(isLocalDoc ? null : token, passwordDoc.document_id, { 
          password: passwordValue || null,
          is_password_protected: !!passwordValue,
          is_locked: !!passwordValue
        });
        Alert.alert('Success', passwordValue ? 'Password set successfully' : 'Password removed');
      } catch (e) {
        console.error('Password update error:', e);
        Alert.alert('Error', 'Failed to update password');
      }
    }
    setShowPasswordModal(false);
    setPasswordDoc(null);
    setPasswordValue('');
  };

  const handleMoveDocument = (doc: Document) => {
    setSelectedDocs([doc.document_id]);
    setShowMoveModal(true);
  };

  const handleDeleteDocument = (doc: Document) => {
    setDeleteDoc(doc);
    setShowDeleteModal(true);
  };
  
  const confirmDeleteDocument = async () => {
    if (!deleteDoc) return;
    
    try {
      const isLocalDoc = deleteDoc.document_id.startsWith('local_');
      await deleteDocument(isLocalDoc ? null : token, deleteDoc.document_id);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete document');
    } finally {
      setShowDeleteModal(false);
      setDeleteDoc(null);
    }
  };

  // Folder action handlers
  const handleRenameFolderAction = (folder: Folder) => {
    setRenameFolder(folder);
    setRenameFolderValue(folder.name);
    setShowRenameFolderModal(true);
  };

  const confirmRenameFolder = async () => {
    if (renameFolder && renameFolderValue.trim()) {
      try {
        // Update folder name via API
        const response = await fetch(`/api/folders/${renameFolder.folder_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: renameFolderValue.trim() }),
        });
        
        if (response.ok) {
          await fetchFolders(token || null);
          Alert.alert('Success', 'Folder renamed successfully');
        } else {
          throw new Error('Failed to rename folder');
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to rename folder');
      }
    }
    setShowRenameFolderModal(false);
    setRenameFolder(null);
    setRenameFolderValue('');
  };

  const handleFolderPasswordAction = (folder: Folder) => {
    setFolderForPassword(folder);
    setFolderPasswordValue('');
    setShowFolderPasswordModal(true);
  };

  const confirmFolderPassword = async () => {
    if (folderForPassword) {
      try {
        const response = await fetch(`/api/folders/${folderForPassword.folder_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ 
            password: folderPasswordValue || null,
            is_password_protected: !!folderPasswordValue
          }),
        });
        
        if (response.ok) {
          await fetchFolders(token || null);
          Alert.alert('Success', folderPasswordValue ? 'Password set successfully' : 'Password removed');
        } else {
          throw new Error('Failed to set password');
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to set folder password');
      }
    }
    setShowFolderPasswordModal(false);
    setFolderForPassword(null);
    setFolderPasswordValue('');
  };

  const handleDeleteFolderAction = (folder: Folder) => {
    Alert.alert(
      'Delete Folder',
      `Are you sure you want to delete "${folder.name}"? Documents inside will be moved to the main library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFolder(token || null, folder.folder_id);
            } catch (e) {
              Alert.alert('Error', 'Failed to delete folder');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'short', 
      year: 'numeric'
    });
  };

  // Open sort menu
  const openSortMenu = () => {
    setTempSortBy(sortBy);
    setTempViewMode(viewMode);
    setShowSortMenu(true);
  };

  // Apply sort settings
  const applySortSettings = () => {
    setSortBy(tempSortBy);
    setViewMode(tempViewMode);
    setShowSortMenu(false);
  };

  // Render document list item
  const renderDocumentItem = ({ item }: { item: Document }) => {
    const page = item.pages?.[0];
    const thumbnailSource = page ? getImageSource(page, true) : null;
    const isSelected = selectedDocs.includes(item.document_id);
    
    if (viewMode === 'grid') {
      return (
        <TouchableOpacity
          style={[
            styles.documentCardGrid,
            isSelected && styles.documentCardSelected
          ]}
          onPress={() => handleDocumentPress(item)}
          onLongPress={() => handleDocumentLongPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.gridThumbnail}>
            {thumbnailSource && thumbnailSource.uri ? (
              <Image
                source={thumbnailSource}
                style={styles.gridThumbnailImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="document-text-outline" size={40} color="#CCC" />
              </View>
            )}
          </View>
          <Text style={styles.gridDocName} numberOfLines={2}>
            {item.name || 'Untitled'}
          </Text>
          <Text style={styles.gridDocDate}>
            {formatDate(item.updated_at || item.created_at)}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.documentCard,
          isSelected && styles.documentCardSelected
        ]}
        onPress={() => handleDocumentPress(item)}
        onLongPress={() => handleDocumentLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.documentThumbnail}>
          {thumbnailSource && thumbnailSource.uri ? (
            <Image
              source={thumbnailSource}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="document-text-outline" size={32} color="#CCC" />
            </View>
          )}
        </View>
        
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {item.name || 'Untitled Document'}
          </Text>
          <Text style={styles.documentDate}>
            {formatDate(item.updated_at || item.created_at)}
          </Text>
          <View style={styles.documentMeta}>
            <Ionicons name="document-outline" size={12} color="#999" />
            <Text style={styles.documentMetaText}>
              {item.pages?.length || 1}
            </Text>
            <Text style={styles.documentMetaDot}>•</Text>
            <Text style={styles.documentMetaText}>PDF</Text>
          </View>
        </View>
        
        <View style={styles.documentActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleExportDocument(item)}
          >
            <Ionicons name="share-outline" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => showDocumentActions(item)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render folder item
  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => router.push(`/folder/${item.folder_id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.folderIcon, { backgroundColor: item.color || '#3E51FB' }]}>
        <Ionicons name="folder" size={28} color="#FFF" />
      </View>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.documentDate}>
          {item.document_count || 0} documents
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => showFolderActions(item)}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#333" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrapper}>
        <Ionicons name={activeMainTab === 'documents' ? "documents-outline" : "folder-outline"} size={56} color="#CCC" />
      </View>
      <Text style={styles.emptyTitle}>
        {activeMainTab === 'documents' ? 'No Documents Yet' : 'No Folders Yet'}
      </Text>
      <Text style={styles.emptyText}>
        {activeMainTab === 'documents' 
          ? 'Tap the scan button to scan your first document'
          : 'Create folders to organize your documents'}
      </Text>
    </View>
  );

  // Documents content with sections
  const renderDocumentsContent = () => {
    const sortedDocs = getSortedDocuments();
    const latestDocs = getLatestDocuments();
    const remainingDocs = sortedDocs.filter(d => !latestDocs.find(l => l.document_id === d.document_id));

    if (viewMode === 'grid') {
      return (
        <FlatList
          key="grid"
          data={sortedDocs}
          keyExtractor={(item) => item.document_id}
          renderItem={renderDocumentItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3E51FB"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      );
    }

    // List view with Latest and All sections
    return (
      <FlatList
        key="list"
        data={[]}
        keyExtractor={() => 'dummy'}
        renderItem={() => null}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <>
            {documents.length === 0 ? (
              renderEmptyState()
            ) : (
              <>
                {/* Latest Section */}
                <Text style={styles.sectionTitle}>Latest</Text>
                {latestDocs.map((doc) => (
                  <View key={`latest-${doc.document_id}`}>
                    {renderDocumentItem({ item: doc })}
                  </View>
                ))}
                
                {/* All Section */}
                {remainingDocs.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>All</Text>
                    {remainingDocs.map((doc) => (
                      <View key={`all-${doc.document_id}`}>
                        {renderDocumentItem({ item: doc })}
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3E51FB"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // Folders content
  const renderFoldersContent = () => (
    <FlatList
      data={folders}
      keyExtractor={(item) => item.folder_id}
      renderItem={renderFolderItem}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={renderEmptyState}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3E51FB"
        />
      }
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3E51FB" />
      
      {/* Loading Spinner Overlay */}
      {isDeleting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#3E51FB" />
            <Text style={styles.loadingText}>Deleting...</Text>
          </View>
        </View>
      )}
      
      {/* Blue Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Your Documents</Text>
            <TouchableOpacity 
              style={styles.sortSelector}
              onPress={openSortMenu}
            >
              <Text style={styles.sortLabel}>Sort by</Text>
              <Text style={styles.sortValue}>{getSortLabel()}</Text>
              <Ionicons name="chevron-down" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Ionicons name="search" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => {
                if (selectionMode) {
                  setSelectionMode(false);
                  setSelectedDocs([]);
                } else {
                  setSelectionMode(true);
                }
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowCreateFolderModal(true)}
            >
              <Ionicons name="folder-outline" size={18} color="#FFF" />
              <View style={styles.plusBadge}>
                <Text style={styles.plusBadgeText}>+</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Tabs - Documents / Folders */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeMainTab === 'documents' && styles.tabActive]}
          onPress={() => setActiveMainTab('documents')}
        >
          <Text style={[styles.tabText, activeMainTab === 'documents' && styles.tabTextActive]}>
            Documents
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeMainTab === 'folders' && styles.tabActive]}
          onPress={() => setActiveMainTab('folders')}
        >
          <Text style={[styles.tabText, activeMainTab === 'folders' && styles.tabTextActive]}>
            Folders
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Selection Header */}
      {selectionMode && (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => {
            setSelectionMode(false);
            setSelectedDocs([]);
          }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.selectedCount}>{selectedDocs.length} selected</Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity onPress={() => setShowMoveModal(true)} style={styles.selectionAction}>
              <Ionicons name="folder-outline" size={22} color="#3E51FB" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteSelected} style={styles.selectionAction}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content */}
      {activeMainTab === 'documents' ? renderDocumentsContent() : renderFoldersContent()}

      {/* Sort Menu Modal */}
      <Modal visible={showSortMenu} transparent animationType="fade">
        <Pressable style={styles.sortModalOverlay} onPress={() => setShowSortMenu(false)}>
          <Pressable style={styles.sortModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sortModalHeader}>
              <Text style={styles.sortModalTitle}>Sort by</Text>
              <TouchableOpacity onPress={() => setShowSortMenu(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {/* Sort Options */}
            {(['a-z', 'z-a', 'newest', 'oldest'] as SortType[]).map((option) => (
              <TouchableOpacity 
                key={option}
                style={styles.sortOptionRow}
                onPress={() => setTempSortBy(option)}
              >
                <Text style={styles.sortOptionLabel}>
                  {option === 'a-z' ? 'A-Z' : option === 'z-a' ? 'Z-A' : option === 'newest' ? 'Newest First' : 'Oldest First'}
                </Text>
                <View style={[styles.radioOuter, tempSortBy === option && styles.radioOuterActive]}>
                  {tempSortBy === option && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
            
            <View style={styles.sortDivider} />
            
            {/* View Options */}
            {(['list', 'grid'] as ViewType[]).map((option) => (
              <TouchableOpacity 
                key={option}
                style={styles.sortOptionRow}
                onPress={() => setTempViewMode(option)}
              >
                <Text style={styles.sortOptionLabel}>{option === 'list' ? 'List' : 'Grid'}</Text>
                <View style={[styles.radioOuter, tempViewMode === option && styles.radioOuterActive]}>
                  {tempViewMode === option && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Done Button */}
            <TouchableOpacity 
              style={styles.sortDoneButton}
              onPress={applySortSettings}
            >
              <Text style={styles.sortDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Document Action Sheet Modal */}
      <Modal visible={showDocActionSheet} transparent animationType="slide">
        <Pressable style={styles.actionSheetOverlay} onPress={() => setShowDocActionSheet(false)}>
          <Pressable style={styles.actionSheetContent} onPress={(e) => e.stopPropagation()}>
            {/* Header with document name, size, and close button */}
            <View style={styles.actionSheetHeader}>
              <View style={styles.actionSheetHeaderLeft}>
                <Text style={styles.actionSheetTitle}>{actionSheetDoc?.name || 'Document'}</Text>
                <Text style={styles.actionSheetSubtitle}>
                  {actionSheetDoc?.pages?.length || 1} {(actionSheetDoc?.pages?.length || 1) === 1 ? 'Page' : 'Pages'} • PDF
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.actionSheetCloseBtn} 
                onPress={() => setShowDocActionSheet(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowDocActionSheet(false); actionSheetDoc && handleRenameDocument(actionSheetDoc); }}>
              <Ionicons name="pencil-outline" size={22} color="#333" />
              <Text style={styles.actionSheetOptionText}>Name</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowDocActionSheet(false); actionSheetDoc && handleEditDocument(actionSheetDoc); }}>
              <Ionicons name="create-outline" size={22} color="#333" />
              <Text style={styles.actionSheetOptionText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowDocActionSheet(false); actionSheetDoc && handlePrintDocument(actionSheetDoc); }}>
              <Ionicons name="print-outline" size={22} color="#333" />
              <Text style={styles.actionSheetOptionText}>Print</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowDocActionSheet(false); actionSheetDoc && handlePasswordDocument(actionSheetDoc); }}>
              <Ionicons name="lock-closed-outline" size={22} color="#333" />
              <Text style={styles.actionSheetOptionText}>Password</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowDocActionSheet(false); actionSheetDoc && handleMoveDocument(actionSheetDoc); }}>
              <Ionicons name="folder-outline" size={22} color="#333" />
              <Text style={styles.actionSheetOptionText}>Move to Folder</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionSheetOption, styles.actionSheetOptionDestructive]} onPress={() => { setShowDocActionSheet(false); actionSheetDoc && handleDeleteDocument(actionSheetDoc); }}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
              <Text style={[styles.actionSheetOptionText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Folder Action Sheet Modal */}
      <Modal visible={showFolderActionSheet} transparent animationType="slide">
        <Pressable style={styles.actionSheetOverlay} onPress={() => setShowFolderActionSheet(false)}>
          <Pressable style={styles.actionSheetContent} onPress={(e) => e.stopPropagation()}>
            {/* Header with folder name and close button */}
            <View style={styles.actionSheetHeader}>
              <View style={styles.actionSheetHeaderLeft}>
                <Text style={styles.actionSheetTitle}>{actionSheetFolder?.name || 'Folder'}</Text>
                <Text style={styles.actionSheetSubtitle}>Folder</Text>
              </View>
              <TouchableOpacity 
                style={styles.actionSheetCloseBtn} 
                onPress={() => setShowFolderActionSheet(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowFolderActionSheet(false); actionSheetFolder && handleRenameFolderAction(actionSheetFolder); }}>
              <Ionicons name="pencil-outline" size={22} color="#333" />
              <Text style={styles.actionSheetOptionText}>Edit Name</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionSheetOption} onPress={() => { setShowFolderActionSheet(false); actionSheetFolder && handleFolderPasswordAction(actionSheetFolder); }}>
              <Ionicons name="lock-closed-outline" size={22} color="#333" />
              <Text style={styles.actionSheetOptionText}>Password</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionSheetOption, styles.actionSheetOptionDestructive]} onPress={() => { setShowFolderActionSheet(false); actionSheetFolder && handleDeleteFolderAction(actionSheetFolder); }}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
              <Text style={[styles.actionSheetOptionText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Folder Modal */}
      <Modal visible={showCreateFolderModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCreateFolderModal(false)}>
          <Pressable style={styles.createFolderModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>New Folder</Text>
            
            <TextInput
              style={styles.folderInput}
              placeholder="Folder name"
              placeholderTextColor="#999"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            
            <Text style={styles.colorLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {FOLDER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalBtnCancel} 
                onPress={() => setShowCreateFolderModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalBtnConfirm} 
                onPress={handleCreateFolder}
                disabled={creating}
              >
                <Text style={styles.modalBtnConfirmText}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Move to Folder Modal */}
      <MoveToFolderModal
        visible={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        folders={folders}
        onSelectFolder={handleMoveToFolder}
        onCreateFolder={handleCreateFolderInModal}
      />
      
      {/* Rename Modal */}
      <Modal visible={showRenameModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRenameModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Document</Text>
            <TextInput
              style={styles.modalInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Enter new name"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowRenameModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={confirmRename}>
                <Text style={styles.modalBtnConfirmText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Folder Modal */}
      <Modal visible={showRenameFolderModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRenameFolderModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Folder</Text>
            <TextInput
              style={styles.modalInput}
              value={renameFolderValue}
              onChangeText={setRenameFolderValue}
              placeholder="Enter new name"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowRenameFolderModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={confirmRenameFolder}>
                <Text style={styles.modalBtnConfirmText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Folder Password Modal */}
      <Modal visible={showFolderPasswordModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFolderPasswordModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Folder Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter a password to protect this folder. Leave empty to remove password.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={folderPasswordValue}
              onChangeText={setFolderPasswordValue}
              placeholder="Enter password (optional)"
              placeholderTextColor="#999"
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowFolderPasswordModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={confirmFolderPassword}>
                <Text style={styles.modalBtnConfirmText}>{folderPasswordValue ? 'Set Password' : 'Remove Password'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPasswordModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter a password to protect this document. Leave empty to remove password.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={passwordValue}
              onChangeText={setPasswordValue}
              placeholder="Enter password (optional)"
              placeholderTextColor="#999"
              secureTextEntry
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={confirmPassword}>
                <Text style={styles.modalBtnConfirmText}>{passwordValue ? 'Set Password' : 'Remove Password'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Unlock Password Modal */}
      <Modal visible={showUnlockModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUnlockModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.unlockHeader}>
              <Ionicons name="lock-closed" size={40} color="#3E51FB" />
              <Text style={[styles.modalTitle, { marginTop: 12 }]}>Document Protected</Text>
            </View>
            <Text style={[styles.modalSubtitle, { textAlign: 'center' }]}>
              Enter the password to view this document.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={unlockPasswordValue}
              onChangeText={setUnlockPasswordValue}
              placeholder="Enter password"
              placeholderTextColor="#999"
              secureTextEntry
              autoFocus
              onSubmitEditing={handleUnlockDocument}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowUnlockModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleUnlockDocument}>
                <Text style={styles.modalBtnConfirmText}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Share Modal */}
      {shareDoc && (
        <ShareModal
          visible={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShareDoc(null);
          }}
          documentName={shareDoc.name}
          pages={shareDoc.pages}
        />
      )}
      
      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        visible={showDeleteModal}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeleteDoc(null);
        }}
        onConfirm={confirmDeleteDocument}
        itemName={deleteDoc?.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  header: {
    backgroundColor: '#3E51FB',
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 6,
  },
  sortSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  sortValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 16,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3E51FB',
    marginTop: -1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginRight: 28,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#3E51FB',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3E51FB',
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  selectionAction: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginLeft: 4,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  documentCardSelected: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3E51FB',
  },
  documentCardGrid: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: '#E8F4F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridThumbnail: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    marginBottom: 8,
  },
  gridThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  gridDocName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  gridDocDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  documentThumbnail: {
    width: 60,
    height: 75,
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 14,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  documentMetaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  documentMetaDot: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 4,
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Sort Modal Styles
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sortModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  sortOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  sortOptionLabel: {
    fontSize: 16,
    color: '#111827',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#3E51FB',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3E51FB',
  },
  sortDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  sortDoneButton: {
    backgroundColor: '#3E51FB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  sortDoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Action Sheet Styles
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 20,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  actionSheetHeaderLeft: {
    flex: 1,
    paddingRight: 16,
  },
  actionSheetCloseBtn: {
    padding: 4,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'left',
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 16,
  },
  actionSheetOptionDestructive: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 24,
  },
  actionSheetOptionText: {
    fontSize: 17,
    color: '#111827',
  },
  actionSheetCancel: {
    marginTop: 16,
    marginHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Create Folder Modal
  createFolderModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
  },
  folderInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  // General Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalBtnCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#3E51FB',
  },
  modalBtnConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  unlockHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
});

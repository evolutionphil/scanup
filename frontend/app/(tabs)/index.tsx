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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useDocumentStore, Document } from '../../src/store/documentStore';
import DocumentCard from '../../src/components/DocumentCard';
import LoadingScreen from '../../src/components/LoadingScreen';
import MoveToFolderModal from '../../src/components/MoveToFolderModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEW_MODE_KEY = '@scanup_view_mode';

type ViewMode = 'grid' | 'list';

export default function DocumentsScreen() {
  const { user, token, isGuest } = useAuthStore();
  const { theme } = useThemeStore();
  const { documents, folders, isLoading, fetchDocuments, fetchFolders, deleteDocument, updateDocument } = useDocumentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showViewMenu, setShowViewMenu] = useState(false);

  // Load saved view mode preference
  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(VIEW_MODE_KEY);
        if (saved === 'grid' || saved === 'list') {
          setViewMode(saved);
        }
      } catch (e) {
        console.log('Could not load view mode preference');
      }
    };
    loadViewMode();
  }, []);

  // Save view mode preference
  const changeViewMode = async (mode: ViewMode) => {
    setViewMode(mode);
    setShowViewMenu(false);
    try {
      await AsyncStorage.setItem(VIEW_MODE_KEY, mode);
    } catch (e) {
      console.log('Could not save view mode preference');
    }
  };

  const loadDocuments = async () => {
    if (token && !isGuest) {
      try {
        await Promise.all([fetchDocuments(token), fetchFolders(token)]);
      } catch (e) {
        console.error('Failed to load data:', e);
      }
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

  const handleDocumentPress = (doc: Document) => {
    if (selectionMode) {
      toggleSelection(doc.document_id);
    } else {
      router.push(`/document/${doc.document_id}`);
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

  const handleDeleteSelected = () => {
    Alert.alert(
      'Delete Documents',
      `Are you sure you want to delete ${selectedDocs.length} document(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (token) {
              for (const docId of selectedDocs) {
                try {
                  await deleteDocument(token, docId);
                } catch (e) {
                  console.error('Error deleting:', e);
                }
              }
              setSelectionMode(false);
              setSelectedDocs([]);
            }
          },
        },
      ]
    );
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (token) {
      for (const docId of selectedDocs) {
        try {
          await updateDocument(token, docId, { folder_id: folderId });
        } catch (e) {
          console.error('Error moving document:', e);
        }
      }
      setShowMoveModal(false);
      setSelectionMode(false);
      setSelectedDocs([]);
      Alert.alert('Success', `Moved ${selectedDocs.length} document(s) to ${folderId ? 'folder' : 'main library'}`);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: theme.surface }]}>
        <Ionicons name="documents-outline" size={56} color={theme.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Documents Yet</Text>
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
        {isGuest 
          ? 'Sign in to save documents to the cloud'
          : 'Tap the scan button below to scan your first document'}
      </Text>
      {isGuest && (
        <TouchableOpacity 
          style={[styles.signInButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && documents.length === 0 && !isGuest) {
    return <LoadingScreen message="Loading documents..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.appName, { color: theme.primary }]}>ScanUp</Text>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            Hello, {user?.name?.split(' ')[0] || 'Guest'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {!user?.is_premium && !isGuest && (
            <TouchableOpacity
              style={[styles.premiumBadge, { backgroundColor: theme.warning + '20' }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="star" size={14} color={theme.warning} />
              <Text style={[styles.premiumText, { color: theme.warning }]}>Pro</Text>
            </TouchableOpacity>
          )}
          {/* View Mode Menu Button */}
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: theme.surface }]}
            onPress={() => setShowViewMenu(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Menu Modal */}
      <Modal
        visible={showViewMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowViewMenu(false)}>
          <View style={[styles.menuContainer, { backgroundColor: theme.surface }]}>
            <Text style={[styles.menuTitle, { color: theme.textSecondary }]}>View Mode</Text>
            
            <TouchableOpacity
              style={[styles.menuOption, viewMode === 'grid' && { backgroundColor: theme.primary + '15' }]}
              onPress={() => changeViewMode('grid')}
            >
              <Ionicons 
                name="grid-outline" 
                size={22} 
                color={viewMode === 'grid' ? theme.primary : theme.text} 
              />
              <Text style={[
                styles.menuOptionText, 
                { color: viewMode === 'grid' ? theme.primary : theme.text }
              ]}>
                Grid View
              </Text>
              {viewMode === 'grid' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuOption, viewMode === 'list' && { backgroundColor: theme.primary + '15' }]}
              onPress={() => changeViewMode('list')}
            >
              <Ionicons 
                name="list-outline" 
                size={22} 
                color={viewMode === 'list' ? theme.primary : theme.text} 
              />
              <Text style={[
                styles.menuOptionText, 
                { color: viewMode === 'list' ? theme.primary : theme.text }
              ]}>
                List View
              </Text>
              {viewMode === 'list' && (
                <Ionicons name="checkmark" size={20} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Selection Mode Header */}
      {selectionMode && (
        <View style={[styles.selectionHeader, { backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={() => {
            setSelectionMode(false);
            setSelectedDocs([]);
          }}>
            <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.selectedCount, { color: theme.text }]}>
            {selectedDocs.length} selected
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity onPress={() => setShowMoveModal(true)} style={styles.selectionAction}>
              <Ionicons name="folder-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteSelected} style={styles.selectionAction}>
              <Ionicons name="trash-outline" size={22} color={theme.danger} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* OCR Banner for Free Users */}
      {user && !user.is_premium && !isGuest && (
        <View style={[styles.ocrBanner, { backgroundColor: theme.primary + '15' }]}>
          <Ionicons name="text" size={16} color={theme.primary} />
          <Text style={[styles.ocrBannerText, { color: theme.primary }]}>
            {user.ocr_remaining_today} OCR scans remaining today
          </Text>
        </View>
      )}

      {/* Documents Grid/List */}
      <FlatList
        data={documents}
        keyExtractor={(item) => item.document_id}
        renderItem={({ item }) => (
          viewMode === 'grid' ? (
            <DocumentCard
              document={item}
              onPress={() => handleDocumentPress(item)}
              onLongPress={() => handleDocumentLongPress(item)}
              selected={selectedDocs.includes(item.document_id)}
            />
          ) : (
            <DocumentListItem
              document={item}
              onPress={() => handleDocumentPress(item)}
              onLongPress={() => handleDocumentLongPress(item)}
              selected={selectedDocs.includes(item.document_id)}
              theme={theme}
            />
          )
        )}
        contentContainerStyle={styles.listContent}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        columnWrapperStyle={viewMode === 'grid' ? styles.row : undefined}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={() => (
          viewMode === 'list' && folders.length > 0 ? (
            <View style={styles.foldersSection}>
              <Text style={[styles.foldersSectionTitle, { color: theme.textSecondary }]}>
                Folders
              </Text>
              {folders.map((folder) => (
                <FolderListItem
                  key={folder.folder_id}
                  folder={folder}
                  onPress={() => router.push(`/folder/${folder.folder_id}`)}
                  theme={theme}
                />
              ))}
            </View>
          ) : null
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Move to Folder Modal */}
      <MoveToFolderModal
        visible={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        folders={folders}
        onSelectFolder={handleMoveToFolder}
      />
    </SafeAreaView>
  );
}

// List view item component
const DocumentListItem = ({ 
  document, 
  onPress, 
  onLongPress, 
  selected, 
  theme 
}: { 
  document: Document; 
  onPress: () => void; 
  onLongPress: () => void; 
  selected: boolean; 
  theme: any;
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get thumbnail from document or first page
  const thumbnailSource = document.thumbnail_base64 
    || document.pages?.[0]?.processed_image_base64 
    || document.pages?.[0]?.image_base64;

  return (
    <TouchableOpacity
      style={[
        styles.listItem,
        { backgroundColor: theme.surface },
        selected && { backgroundColor: theme.primary + '20', borderColor: theme.primary }
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View style={[styles.listThumbnail, { backgroundColor: theme.background }]}>
        {thumbnailSource ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${thumbnailSource}` }}
            style={styles.listThumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="document-outline" size={24} color={theme.textMuted} />
        )}
      </View>
      
      {/* Document Info */}
      <View style={styles.listItemContent}>
        <Text style={[styles.listItemTitle, { color: theme.text }]} numberOfLines={1}>
          {document.title || 'Untitled Document'}
        </Text>
        <View style={styles.listItemMeta}>
          <Text style={[styles.listItemDate, { color: theme.textMuted }]}>
            {formatDate(document.updated_at || document.created_at)}
          </Text>
          <View style={styles.listItemDot} />
          <Text style={[styles.listItemPages, { color: theme.textMuted }]}>
            {document.pages?.length || 1} page{(document.pages?.length || 1) !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      {/* Selection indicator */}
      {selected && (
        <View style={[styles.listCheckmark, { backgroundColor: theme.primary }]}>
          <Ionicons name="checkmark" size={14} color="#FFF" />
        </View>
      )}
      
      {/* Chevron */}
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );
};

// Folder list item component
const FolderListItem = ({ 
  folder, 
  onPress, 
  theme 
}: { 
  folder: any; 
  onPress: () => void; 
  theme: any;
}) => {
  return (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: theme.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.folderIcon, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="folder" size={26} color={theme.primary} />
      </View>
      <View style={styles.listItemContent}>
        <Text style={[styles.listItemTitle, { color: theme.text }]} numberOfLines={1}>
          {folder.name}
        </Text>
        <Text style={[styles.listItemDate, { color: theme.textMuted }]}>
          {folder.document_count || 0} documents
        </Text>
      </View>
      {folder.is_protected && (
        <Ionicons name="lock-closed" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
      )}
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: {},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 14,
    marginTop: 2,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  selectionAction: {
    padding: 4,
  },
  ocrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  ocrBannerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  signInButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Menu button and modal styles
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  menuContainer: {
    borderRadius: 12,
    padding: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  menuOptionText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  // List view styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  listThumbnail: {
    width: 50,
    height: 65,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  listThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemDate: {
    fontSize: 13,
  },
  listItemDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#999',
    marginHorizontal: 8,
  },
  listItemPages: {
    fontSize: 13,
  },
  listCheckmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  // Folder styles
  folderIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foldersSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  foldersSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});

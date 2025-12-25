import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useDocumentStore, Document } from '../../src/store/documentStore';
import DocumentCard from '../../src/components/DocumentCard';
import LoadingScreen from '../../src/components/LoadingScreen';
import MoveToFolderModal from '../../src/components/MoveToFolderModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DocumentsScreen() {
  const { user, token, isGuest } = useAuthStore();
  const { theme } = useThemeStore();
  const { documents, folders, isLoading, fetchDocuments, fetchFolders, deleteDocument, updateDocument } = useDocumentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);

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
        </View>
      </View>

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
          <TouchableOpacity onPress={handleDeleteSelected}>
            <Ionicons name="trash-outline" size={24} color={theme.danger} />
          </TouchableOpacity>
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

      {/* Documents Grid */}
      <FlatList
        data={documents}
        keyExtractor={(item) => item.document_id}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => handleDocumentPress(item)}
            onLongPress={() => handleDocumentLongPress(item)}
            selected={selectedDocs.includes(item.document_id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={renderEmptyState}
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
    </SafeAreaView>
  );
}

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
});

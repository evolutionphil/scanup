import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useDocumentStore, Document, Folder } from '../../src/store/documentStore';
import DocumentCard from '../../src/components/DocumentCard';
import Button from '../../src/components/Button';

export default function FolderDetailScreen() {
  const { folder_id, folder_name } = useLocalSearchParams<{ folder_id: string; folder_name: string }>();
  const { token } = useAuthStore();
  const { theme } = useThemeStore();
  const { documents, folders, fetchDocuments, updateDocument, deleteFolder } = useDocumentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const folderDocuments = documents.filter((d) => d.folder_id === folder_id);
  const availableDocuments = documents.filter((d) => !d.folder_id || d.folder_id !== folder_id);
  const currentFolder = folders.find((f) => f.folder_id === folder_id);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [token, folder_id])
  );

  const loadData = async () => {
    if (token) {
      try {
        await fetchDocuments(token);
      } catch (e) {
        console.error('Failed to load documents:', e);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDocumentPress = (doc: Document) => {
    router.push(`/document/${doc.document_id}`);
  };

  const handleRemoveFromFolder = async (doc: Document) => {
    Alert.alert(
      'Remove from Folder',
      `Remove "${doc.name}" from this folder?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          onPress: async () => {
            if (token) {
              try {
                await updateDocument(token, doc.document_id, { folder_id: null });
              } catch (e) {
                Alert.alert('Error', 'Failed to remove document from folder');
              }
            }
          },
        },
      ]
    );
  };

  const handleAddToFolder = async (doc: Document) => {
    if (token) {
      try {
        await updateDocument(token, doc.document_id, { folder_id: folder_id });
        setShowAddDocModal(false);
      } catch (e) {
        Alert.alert('Error', 'Failed to add document to folder');
      }
    }
  };

  const handleDeleteFolder = () => {
    Alert.alert(
      'Delete Folder',
      'Are you sure you want to delete this folder? Documents will be moved to the main library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (token && folder_id) {
              try {
                await deleteFolder(token, folder_id);
                router.back();
              } catch (e) {
                Alert.alert('Error', 'Failed to delete folder');
              }
            }
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: theme.surface }]}>
        <Ionicons name="document-outline" size={60} color={theme.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Documents</Text>
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
        Add documents to this folder
      </Text>
      <Button
        title="Add Documents"
        onPress={() => setShowAddDocModal(true)}
        style={{ marginTop: 20 }}
        icon={<Ionicons name="add" size={20} color="#FFF" />}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surface }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.folderIcon, { backgroundColor: (currentFolder?.color || theme.primary) + '20' }]}>
            <Ionicons name="folder" size={20} color={currentFolder?.color || theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {folder_name || 'Folder'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: theme.surface }]}
          onPress={() => setShowOptionsModal(true)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBar}>
        <Text style={[styles.statsText, { color: theme.textMuted }]}>
          {folderDocuments.length} {folderDocuments.length === 1 ? 'document' : 'documents'}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary + '15' }]}
          onPress={() => setShowAddDocModal(true)}
        >
          <Ionicons name="add" size={20} color={theme.primary} />
          <Text style={[styles.addButtonText, { color: theme.primary }]}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={folderDocuments}
        keyExtractor={(item) => item.document_id}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => handleDocumentPress(item)}
            onLongPress={() => handleRemoveFromFolder(item)}
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
      />

      {/* Add Documents Modal */}
      <Modal
        visible={showAddDocModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddDocModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Documents</Text>
              <TouchableOpacity onPress={() => setShowAddDocModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {availableDocuments.length === 0 ? (
              <View style={styles.noDocsMessage}>
                <Text style={[styles.noDocsText, { color: theme.textMuted }]}>
                  All documents are already in this folder or you don't have any documents yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableDocuments}
                keyExtractor={(item) => item.document_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.docListItem, { backgroundColor: theme.background }]}
                    onPress={() => handleAddToFolder(item)}
                  >
                    <Ionicons name="document" size={24} color={theme.primary} />
                    <Text style={[styles.docListName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Ionicons name="add-circle" size={24} color={theme.primary} />
                  </TouchableOpacity>
                )}
                style={styles.docList}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[styles.optionsModal, { backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsModal(false);
                setShowPasswordModal(true);
              }}
            >
              <Ionicons name="lock-closed" size={22} color={theme.text} />
              <Text style={[styles.optionText, { color: theme.text }]}>
                {currentFolder?.is_protected ? 'Change Password' : 'Set Password'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsModal(false);
                handleDeleteFolder();
              }}
            >
              <Ionicons name="trash" size={22} color={theme.danger} />
              <Text style={[styles.optionText, { color: theme.danger }]}>Delete Folder</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.passwordModal, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Set Folder Password</Text>
            <Text style={[styles.passwordHint, { color: theme.textMuted }]}>
              Protect this folder with a password. You'll need to enter it to access the folder.
            </Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Confirm Password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setConfirmPassword('');
                }}
                style={styles.modalButton}
              />
              <Button
                title="Set Password"
                onPress={() => {
                  if (password !== confirmPassword) {
                    Alert.alert('Error', 'Passwords do not match');
                    return;
                  }
                  if (password.length < 4) {
                    Alert.alert('Error', 'Password must be at least 4 characters');
                    return;
                  }
                  // TODO: Implement password protection API
                  Alert.alert('Coming Soon', 'Password protection will be available soon');
                  setShowPasswordModal(false);
                  setPassword('');
                  setConfirmPassword('');
                }}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  folderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  statsText: {
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  noDocsMessage: {
    padding: 40,
    alignItems: 'center',
  },
  noDocsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  docList: {
    maxHeight: 400,
  },
  docListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  docListName: {
    flex: 1,
    fontSize: 15,
  },
  optionsModal: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  optionText: {
    fontSize: 16,
  },
  passwordModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  passwordHint: {
    fontSize: 14,
    marginBottom: 20,
    marginTop: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
  },
});

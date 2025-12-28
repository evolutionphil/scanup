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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useDocumentStore, Document, Folder } from '../../src/store/documentStore';
import DocumentCard from '../../src/components/DocumentCard';
import Button from '../../src/components/Button';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FolderDetailScreen() {
  const { id, folder_name } = useLocalSearchParams<{ id: string; folder_name: string }>();
  const { token } = useAuthStore();
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const { documents, folders, fetchDocuments, fetchFolders, updateDocument, deleteFolder, updateFolder } = useDocumentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  const folderDocuments = documents.filter((d) => d.folder_id === id);
  const availableDocuments = documents.filter((d) => !d.folder_id || d.folder_id !== id);
  const currentFolder = folders.find((f) => f.folder_id === id);

  useEffect(() => {
    // Check if folder is protected and needs password
    if (currentFolder?.is_protected && !isUnlocked) {
      setShowPasswordPrompt(true);
    }
  }, [currentFolder, isUnlocked]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [token, id])
  );

  const loadData = async () => {
    if (token) {
      try {
        await Promise.all([fetchDocuments(token), fetchFolders(token)]);
      } catch (e) {
        console.error('Failed to load data:', e);
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
        await updateDocument(token, doc.document_id, { folder_id: id });
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
            if (token && id) {
              try {
                await deleteFolder(token, id);
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

  const handleSetPassword = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }

    if (token && id) {
      try {
        await updateFolder(token, id, { 
          is_protected: true, 
          password_hash: password // In production, hash this
        });
        Alert.alert('Success', 'Password set successfully');
        setShowPasswordModal(false);
        setPassword('');
        setConfirmPassword('');
      } catch (e) {
        Alert.alert('Error', 'Failed to set password');
      }
    }
  };

  const handleUnlockFolder = async () => {
    if (!token || !enteredPassword) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/folders/${id}/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: enteredPassword }),
      });
      
      if (response.ok) {
        setIsUnlocked(true);
        setShowPasswordPrompt(false);
        setEnteredPassword('');
      } else {
        Alert.alert('Error', 'Incorrect password');
      }
    } catch (e) {
      console.error('Password verification error:', e);
      Alert.alert('Error', 'Failed to verify password');
    }
  };

  const handleRemovePassword = async () => {
    if (token && id) {
      try {
        await updateFolder(token, id, { 
          is_protected: false, 
          password_hash: null 
        });
        Alert.alert('Success', 'Password removed');
        setShowOptionsModal(false);
      } catch (e) {
        Alert.alert('Error', 'Failed to remove password');
      }
    }
  };

  // Show password prompt if folder is locked
  if (currentFolder?.is_protected && !isUnlocked) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.surface }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>{folder_name || 'Folder'}</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.lockedContainer}>
          <View style={[styles.lockIconWrapper, { backgroundColor: theme.surface }]}>
            <Ionicons name="lock-closed" size={60} color={theme.primary} />
          </View>
          <Text style={[styles.lockedTitle, { color: theme.text }]}>Folder Protected</Text>
          <Text style={[styles.lockedText, { color: theme.textMuted }]}>
            Enter the password to access this folder
          </Text>
          <TextInput
            style={[styles.passwordInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Enter password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={enteredPassword}
            onChangeText={setEnteredPassword}
          />
          <Button title="Unlock" onPress={handleUnlockFolder} style={{ width: '100%' }} />
        </View>
      </SafeAreaView>
    );
  }

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
          {currentFolder?.is_protected && (
            <Ionicons name="lock-closed" size={14} color={theme.textMuted} />
          )}
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

      {/* Add Documents Modal - Fixed as Bottom Sheet */}
      <Modal
        visible={showAddDocModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddDocModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAddDocModal(false)}
        >
          <View style={[styles.bottomSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Add Documents</Text>
              <TouchableOpacity onPress={() => setShowAddDocModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {availableDocuments.length === 0 ? (
              <View style={styles.noDocsMessage}>
                <Ionicons name="document-outline" size={40} color={theme.textMuted} />
                <Text style={[styles.noDocsText, { color: theme.textMuted }]}>
                  No documents available to add
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
                    <Ionicons name="document" size={22} color={theme.primary} />
                    <Text style={[styles.docListName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[styles.addIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="add" size={18} color={theme.primary} />
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.docList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[styles.optionsSheet, { backgroundColor: theme.surface }]}>
            <View style={styles.sheetHandle} />
            {currentFolder?.is_protected ? (
              <TouchableOpacity style={styles.optionItem} onPress={handleRemovePassword}>
                <Ionicons name="lock-open" size={22} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Remove Password</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setShowOptionsModal(false);
                  setShowPasswordModal(true);
                }}
              >
                <Ionicons name="lock-closed" size={22} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Set Password</Text>
              </TouchableOpacity>
            )}
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

      {/* Set Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.bottomSheet, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
                <View style={styles.sheetHandle} />
                <Text style={[styles.sheetTitle, { color: theme.text }]}>Set Folder Password</Text>
                <Text style={[styles.passwordHint, { color: theme.textMuted }]}>
                  Protect this folder with a password
                </Text>
                
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="Password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoFocus={true}
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
                  Keyboard.dismiss();
                }}
                style={styles.modalButton}
              />
              <Button title="Set Password" onPress={handleSetPassword} style={styles.modalButton} />
            </View>
          </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  // Locked state
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  lockIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  passwordInput: {
    width: '100%',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#94A3B8',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  noDocsMessage: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  noDocsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  docList: {
    maxHeight: 350,
  },
  docListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  docListName: {
    flex: 1,
    fontSize: 15,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
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
  passwordHint: {
    fontSize: 14,
    marginBottom: 20,
    marginTop: 4,
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
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});

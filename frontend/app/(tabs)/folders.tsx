import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useDocumentStore, Folder } from '../../src/store/documentStore';
import FolderCard from '../../src/components/FolderCard';
import Button from '../../src/components/Button';

const FOLDER_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

export default function FoldersScreen() {
  const { token } = useAuthStore();
  const { theme } = useThemeStore();
  const { documents, folders, fetchFolders, fetchDocuments, createFolder, deleteFolder } = useDocumentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    if (token) {
      try {
        await Promise.all([fetchFolders(token), fetchDocuments(token)]);
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [token])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    setCreating(true);
    try {
      await createFolder(token!, { name: newFolderName.trim(), color: selectedColor });
      setShowCreateModal(false);
      setNewFolderName('');
      setSelectedColor(FOLDER_COLORS[0]);
    } catch (e) {
      Alert.alert('Error', 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleFolderPress = (folder: Folder) => {
    router.push({ pathname: '/(tabs)', params: { folder_id: folder.folder_id, folder_name: folder.name } });
  };

  const handleFolderLongPress = (folder: Folder) => {
    Alert.alert(
      folder.name,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (token) {
              try {
                await deleteFolder(token, folder.folder_id);
              } catch (e) {
                Alert.alert('Error', 'Failed to delete folder');
              }
            }
          },
        },
      ]
    );
  };

  const getDocumentCount = (folderId: string) => {
    return documents.filter((d) => d.folder_id === folderId).length;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: theme.surface }]}>
        <Ionicons name="folder-outline" size={60} color={theme.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Folders Yet</Text>
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
        Create folders to organize your documents
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Folders</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.surface }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={folders}
        keyExtractor={(item) => item.folder_id}
        renderItem={({ item }) => (
          <FolderCard
            folder={item}
            documentCount={getDocumentCount(item.folder_id)}
            onPress={() => handleFolderPress(item)}
            onLongPress={() => handleFolderLongPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
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

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Folder</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background, 
                color: theme.text,
                borderColor: theme.border 
              }]}
              placeholder="Folder name"
              placeholderTextColor={theme.textMuted}
              value={newFolderName}
              onChangeText={setNewFolderName}
            />

            <Text style={[styles.colorLabel, { color: theme.textSecondary }]}>Color</Text>
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
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowCreateModal(false)}
                style={styles.modalButton}
              />
              <Button
                title="Create"
                onPress={handleCreateFolder}
                loading={creating}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    flexGrow: 1,
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
  colorLabel: {
    fontSize: 14,
    fontWeight: '500',
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

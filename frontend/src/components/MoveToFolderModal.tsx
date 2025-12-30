import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { Folder } from '../store/documentStore';
import Button from './Button';

interface MoveToFolderModalProps {
  visible: boolean;
  onClose: () => void;
  folders: Folder[];
  onSelectFolder: (folderId: string | null) => void;
  currentFolderId?: string | null;
  onCreateFolder?: (name: string, color: string) => Promise<Folder | null>;
}

const FOLDER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function MoveToFolderModal({
  visible,
  onClose,
  folders,
  onSelectFolder,
  currentFolderId,
  onCreateFolder,
}: MoveToFolderModalProps) {
  const { theme } = useThemeStore();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }
    
    if (!onCreateFolder) {
      Alert.alert('Error', 'Create folder not available');
      return;
    }
    
    setIsCreating(true);
    try {
      const newFolder = await onCreateFolder(newFolderName.trim(), selectedColor);
      if (newFolder) {
        setShowCreateFolder(false);
        setNewFolderName('');
        // Automatically select the new folder
        onSelectFolder(newFolder.folder_id);
      } else {
        Alert.alert('Error', 'Failed to create folder');
      }
    } catch (e: any) {
      console.error('Create folder error:', e);
      Alert.alert('Error', e.message || 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setShowCreateFolder(false);
    setNewFolderName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.content, { backgroundColor: theme.surface, paddingBottom: Platform.OS === 'android' ? 50 : 34 }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Move to Folder</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Create New Folder Section */}
            {showCreateFolder ? (
              <View style={[styles.createFolderSection, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  placeholder="Folder name"
                  placeholderTextColor={theme.textMuted}
                  autoFocus
                />
                <View style={styles.colorPicker}>
                  {FOLDER_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.colorSelected,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    />
                  ))}
                </View>
                <View style={styles.createButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.createBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => {
                      setShowCreateFolder(false);
                      setNewFolderName('');
                    }}
                    disabled={isCreating}
                  >
                    <Text style={{ color: theme.text }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.createBtn, { backgroundColor: theme.primary, opacity: isCreating ? 0.7 : 1 }]}
                    onPress={handleCreateFolder}
                    disabled={isCreating}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '600' }}>
                      {isCreating ? 'Creating...' : 'Create & Move'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addFolderBtn, { borderColor: theme.primary }]}
                onPress={() => setShowCreateFolder(true)}
              >
                <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
                <Text style={[styles.addFolderText, { color: theme.primary }]}>Create New Folder</Text>
              </TouchableOpacity>
            )}

            {/* Remove from folder option */}
            {currentFolderId && (
              <TouchableOpacity
                style={[styles.folderItem, { backgroundColor: theme.background }]}
                onPress={() => onSelectFolder(null)}
              >
                <View style={[styles.folderIcon, { backgroundColor: theme.danger + '20' }]}>
                  <Ionicons name="close-circle" size={24} color={theme.danger} />
                </View>
                <Text style={[styles.folderName, { color: theme.danger }]}>Remove from folder</Text>
              </TouchableOpacity>
            )}

            {/* Folder list */}
            <FlatList
              data={folders.filter((f) => f.folder_id !== currentFolderId)}
              keyExtractor={(item) => item.folder_id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.folderItem, { backgroundColor: theme.background }]}
                  onPress={() => onSelectFolder(item.folder_id)}
                >
                  <View style={[styles.folderIcon, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name="folder" size={24} color={item.color} />
                  </View>
                  <Text style={[styles.folderName, { color: theme.text }]}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                !showCreateFolder ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="folder-open-outline" size={48} color={theme.textMuted} />
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      No folders yet
                    </Text>
                    <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                      Create a folder to organize your documents
                    </Text>
                  </View>
                ) : null
              }
              style={styles.list}
              keyboardShouldPersistTaps="handled"
            />

            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleClose}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  addFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 16,
    gap: 8,
  },
  addFolderText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createFolderSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  input: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 12,
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  createBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  list: {
    maxHeight: 300,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 14,
  },
  folderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});

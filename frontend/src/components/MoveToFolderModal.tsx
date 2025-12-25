import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
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
}

export default function MoveToFolderModal({
  visible,
  onClose,
  folders,
  onSelectFolder,
  currentFolderId,
}: MoveToFolderModalProps) {
  const { theme } = useThemeStore();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.content, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Move to Folder</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

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
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No folders available. Create a folder first.
                </Text>
              </View>
            }
            style={styles.list}
          />

          <Button
            title="Cancel"
            variant="secondary"
            onPress={onClose}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
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
    maxHeight: '70%',
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
  list: {
    maxHeight: 350,
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
    fontSize: 14,
    textAlign: 'center',
  },
});

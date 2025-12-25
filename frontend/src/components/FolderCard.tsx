import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder } from '../store/documentStore';
import { useThemeStore } from '../store/themeStore';

interface FolderCardProps {
  folder: Folder;
  documentCount: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function FolderCard({
  folder,
  documentCount,
  onPress,
  onLongPress,
}: FolderCardProps) {
  const { theme } = useThemeStore();
  const folderColor = folder.color || theme.primary;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: folderColor + '20' }]}>
        <Ionicons name="folder" size={32} color={folderColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {folder.name}
        </Text>
        <Text style={[styles.count, { color: theme.textMuted }]}>
          {documentCount} {documentCount === 1 ? 'document' : 'documents'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  count: {
    fontSize: 13,
  },
});

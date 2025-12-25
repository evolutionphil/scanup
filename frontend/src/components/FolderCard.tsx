import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Folder } from '../store/documentStore';

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
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: folder.color + '20' }]}>
        <Ionicons name="folder" size={32} color={folder.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {folder.name}
        </Text>
        <Text style={styles.count}>
          {documentCount} {documentCount === 1 ? 'document' : 'documents'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748B" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  count: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
});

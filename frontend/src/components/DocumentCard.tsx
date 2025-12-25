import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Document } from '../store/documentStore';
import { format } from 'date-fns';

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function DocumentCard({
  document,
  onPress,
  onLongPress,
}: DocumentCardProps) {
  const thumbnail = document.pages[0]?.thumbnail_base64;
  const pageCount = document.pages.length;
  const hasOCR = !!document.ocr_full_text;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.thumbnailContainer}>
        {thumbnail ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${thumbnail}` }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Ionicons name="document-text" size={40} color="#475569" />
          </View>
        )}
        {pageCount > 1 && (
          <View style={styles.pageCountBadge}>
            <Text style={styles.pageCountText}>{pageCount}</Text>
          </View>
        )}
        {document.is_password_protected && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#FFF" />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {document.name}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.date}>
            {format(new Date(document.updated_at), 'MMM d, yyyy')}
          </Text>
          {hasOCR && (
            <View style={styles.ocrBadge}>
              <Ionicons name="text" size={10} color="#3B82F6" />
              <Text style={styles.ocrText}>OCR</Text>
            </View>
          )}
        </View>
        {document.tags.length > 0 && (
          <View style={styles.tags}>
            {document.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {document.tags.length > 2 && (
              <Text style={styles.moreTagsText}>+{document.tags.length - 2}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  thumbnailContainer: {
    height: 140,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageCountBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pageCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    padding: 6,
    borderRadius: 8,
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 12,
    color: '#64748B',
  },
  ocrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ocrText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  tags: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#64748B',
  },
});

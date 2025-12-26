import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Document, getImageSource } from '../store/documentStore';
import { useThemeStore } from '../store/themeStore';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
}

export default function DocumentCard({
  document,
  onPress,
  onLongPress,
  selected,
}: DocumentCardProps) {
  const { theme } = useThemeStore();
  // Support both base64 and S3 URLs for thumbnails
  const firstPage = document.pages[0];
  const thumbnailSource = firstPage ? getImageSource(firstPage, true) : null;
  const pageCount = document.pages.length;
  const hasOCR = !!document.ocr_full_text;
  const syncStatus = document.sync_status;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card, width: CARD_WIDTH },
        selected && { borderColor: theme.primary, borderWidth: 2 },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.thumbnailContainer, { backgroundColor: theme.surfaceVariant }]}>
        {thumbnailSource && thumbnailSource.uri ? (
          <Image
            source={thumbnailSource}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Ionicons name="document-text" size={40} color={theme.textMuted} />
          </View>
        )}
        {pageCount > 1 && (
          <View style={styles.pageCountBadge}>
            <Ionicons name="documents" size={10} color="#FFF" />
            <Text style={styles.pageCountText}>{pageCount}</Text>
          </View>
        )}
        {document.is_password_protected && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#FFF" />
          </View>
        )}
        {/* Sync status indicator */}
        {syncStatus && syncStatus !== 'synced' && (
          <View style={[styles.syncBadge, { 
            backgroundColor: syncStatus === 'syncing' ? theme.primary : 
                            syncStatus === 'failed' ? theme.danger : theme.warning 
          }]}>
            {syncStatus === 'syncing' ? (
              <ActivityIndicator size={10} color="#FFF" />
            ) : syncStatus === 'failed' ? (
              <Ionicons name="alert-circle" size={12} color="#FFF" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={12} color="#FFF" />
            )}
          </View>
        )}
        {selected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {document.name}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.date, { color: theme.textMuted }]}>
            {format(new Date(document.updated_at), 'MMM d')}
          </Text>
          {hasOCR && (
            <View style={[styles.ocrBadge, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="text" size={10} color={theme.primary} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnailContainer: {
    height: 160,
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
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageCountText: {
    color: '#FFF',
    fontSize: 11,
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
  selectedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
  },
  ocrBadge: {
    padding: 4,
    borderRadius: 4,
  },
});

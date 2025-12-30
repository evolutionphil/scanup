import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
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
  onExport?: () => void;
  onRename?: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onPassword?: () => void;
  onMoveToFolder?: () => void;
  onDelete?: () => void;
}

export default function DocumentCard({
  document,
  onPress,
  onLongPress,
  selected,
  onExport,
  onRename,
  onEdit,
  onPrint,
  onPassword,
  onMoveToFolder,
  onDelete,
}: DocumentCardProps) {
  const { theme } = useThemeStore();
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // Support both base64 and S3 URLs for thumbnails
  const firstPage = document.pages[0];
  const thumbnailSource = firstPage ? getImageSource(firstPage, true) : null;
  const pageCount = document.pages.length;
  const hasOCR = !!document.ocr_full_text;
  const syncStatus = document.sync_status;
  
  // Calculate file size
  const fileSize = document.pages.reduce((acc, page) => {
    const base64 = page.image_base64 || '';
    return acc + (base64.length * 0.75); // Approximate size
  }, 0);
  const fileSizeFormatted = fileSize > 1024 * 1024 
    ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB` 
    : fileSize > 1024 
    ? `${(fileSize / 1024).toFixed(0)} KB`
    : 'N/A';

  const handleMenuOption = (action: (() => void) | undefined) => {
    setShowOptionsMenu(false);
    if (action) action();
  };

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
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {document.name}
          </Text>
          <View style={styles.actionButtons}>
            {/* Export Icon */}
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={onExport}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-outline" size={18} color={theme.textMuted} />
            </TouchableOpacity>
            {/* More Options */}
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setShowOptionsMenu(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
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
      
      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={[styles.optionsMenu, { backgroundColor: theme.surface }]}>
            {/* Header */}
            <View style={styles.optionsHeader}>
              <View>
                <Text style={[styles.optionsTitle, { color: theme.text }]}>{document.name}</Text>
                <Text style={[styles.optionsMeta, { color: theme.textMuted }]}>
                  {fileSizeFormatted} - {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowOptionsMenu(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {/* Menu Options */}
            <TouchableOpacity style={styles.optionItem} onPress={() => handleMenuOption(onRename)}>
              <Ionicons name="pencil-outline" size={22} color={theme.text} />
              <Text style={[styles.optionText, { color: theme.text }]}>Name</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => handleMenuOption(onEdit)}>
              <Ionicons name="options-outline" size={22} color={theme.text} />
              <Text style={[styles.optionText, { color: theme.text }]}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => handleMenuOption(onPrint)}>
              <Ionicons name="print-outline" size={22} color={theme.text} />
              <Text style={[styles.optionText, { color: theme.text }]}>Print</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => handleMenuOption(onPassword)}>
              <Ionicons name="lock-closed-outline" size={22} color={theme.text} />
              <Text style={[styles.optionText, { color: theme.text }]}>Password</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => handleMenuOption(onMoveToFolder)}>
              <Ionicons name="folder-outline" size={22} color={theme.text} />
              <Text style={[styles.optionText, { color: theme.text }]}>Move to Folder</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => handleMenuOption(onDelete)}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
              <Text style={[styles.optionText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  syncBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 6,
    borderRadius: 8,
    minWidth: 24,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
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
  // Options Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  optionsMenu: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionsMeta: {
    fontSize: 13,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

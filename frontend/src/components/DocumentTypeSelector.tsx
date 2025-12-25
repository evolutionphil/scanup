import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';

export type DocumentType = 'document' | 'id_card' | 'passport' | 'book' | 'whiteboard' | 'business_card';

interface DocumentTypeOption {
  type: DocumentType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  {
    type: 'document',
    icon: 'document-text',
    label: 'Document',
    description: 'A4, Letter, Legal',
  },
  {
    type: 'id_card',
    icon: 'card',
    label: 'ID Card',
    description: 'Driver license, ID',
  },
  {
    type: 'passport',
    icon: 'book',
    label: 'Passport',
    description: 'Passport pages',
  },
  {
    type: 'book',
    icon: 'library',
    label: 'Book',
    description: 'Book pages, magazines',
  },
  {
    type: 'whiteboard',
    icon: 'easel',
    label: 'Whiteboard',
    description: 'Whiteboards, posters',
  },
  {
    type: 'business_card',
    icon: 'person-circle',
    label: 'Business Card',
    description: 'Extract contacts',
  },
];

interface DocumentTypeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: DocumentType) => void;
  selectedType?: DocumentType;
}

export default function DocumentTypeSelector({
  visible,
  onClose,
  onSelect,
  selectedType = 'document',
}: DocumentTypeSelectorProps) {
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
            <Text style={[styles.title, { color: theme.text }]}>Select Document Type</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.grid}>
            {DOCUMENT_TYPES.map((docType) => (
              <TouchableOpacity
                key={docType.type}
                style={[
                  styles.option,
                  { backgroundColor: theme.background },
                  selectedType === docType.type && { borderColor: theme.primary, borderWidth: 2 },
                ]}
                onPress={() => {
                  onSelect(docType.type);
                  onClose();
                }}
              >
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: selectedType === docType.type ? theme.primary + '20' : theme.surfaceVariant },
                ]}>
                  <Ionicons
                    name={docType.icon}
                    size={28}
                    color={selectedType === docType.type ? theme.primary : theme.textMuted}
                  />
                </View>
                <Text style={[
                  styles.label,
                  { color: selectedType === docType.type ? theme.primary : theme.text },
                ]}>
                  {docType.label}
                </Text>
                <Text style={[styles.description, { color: theme.textMuted }]}>
                  {docType.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  option: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 11,
    textAlign: 'center',
  },
});

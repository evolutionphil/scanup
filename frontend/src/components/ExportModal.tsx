import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { useThemeStore } from '../store/themeStore';
import Button from './Button';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ExportFormat {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  extension: string;
  requiresOcr: boolean;
  isPremium: boolean;
}

const EXPORT_FORMATS: ExportFormat[] = [
  { id: 'pdf', name: 'PDF', icon: 'document-text', extension: 'pdf', requiresOcr: false, isPremium: false },
  { id: 'jpeg', name: 'Image (JPEG)', icon: 'image', extension: 'jpg', requiresOcr: false, isPremium: false },
  { id: 'docx', name: 'Word (.docx)', icon: 'document', extension: 'docx', requiresOcr: true, isPremium: true },
  { id: 'xlsx', name: 'Excel (.xlsx)', icon: 'grid', extension: 'xlsx', requiresOcr: true, isPremium: true },
];

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  hasOcrText: boolean;
  isPremium: boolean;
  token: string;
}

export default function ExportModal({
  visible,
  onClose,
  documentId,
  documentName,
  hasOcrText,
  isPremium,
  token,
}: ExportModalProps) {
  const { theme } = useThemeStore();
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [includeOcr, setIncludeOcr] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const format = EXPORT_FORMATS.find((f) => f.id === selectedFormat);
    if (!format) return;

    if (format.isPremium && !isPremium) {
      Alert.alert(
        'Premium Feature',
        `${format.name} export is a premium feature. Upgrade to access Word and Excel exports.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (format.requiresOcr && !hasOcrText) {
      Alert.alert(
        'OCR Required',
        `${format.name} export requires OCR text. Please run OCR on the document first.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/documents/${documentId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          document_id: documentId,
          format: selectedFormat,
          include_ocr: includeOcr || format.requiresOcr,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Export failed');
      }

      const result = await response.json();
      
      // Save file and share
      const fileName = result.filename || `${documentName}.${format.extension}`;
      const fileUri = `${cacheDirectory}${fileName}`;
      
      await writeAsStringAsync(fileUri, result.file_base64, {
        encoding: EncodingType.Base64,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: result.mime_type,
          dialogTitle: `Export ${documentName}`,
        });
        onClose();
      } else {
        Alert.alert('Success', 'File exported successfully');
        onClose();
      }
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error.message || 'Failed to export document');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormatInfo = EXPORT_FORMATS.find((f) => f.id === selectedFormat);

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
            <Text style={[styles.title, { color: theme.text }]}>Export Document</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Select Format
          </Text>

          <View style={styles.formatGrid}>
            {EXPORT_FORMATS.map((format) => {
              const isDisabled = format.isPremium && !isPremium;
              const needsOcr = format.requiresOcr && !hasOcrText;
              
              return (
                <TouchableOpacity
                  key={format.id}
                  style={[
                    styles.formatOption,
                    { backgroundColor: theme.background },
                    selectedFormat === format.id && { borderColor: theme.primary, borderWidth: 2 },
                    (isDisabled || needsOcr) && { opacity: 0.5 },
                  ]}
                  onPress={() => !isDisabled && !needsOcr && setSelectedFormat(format.id)}
                  disabled={isDisabled || needsOcr}
                >
                  <View style={[
                    styles.formatIcon,
                    { backgroundColor: selectedFormat === format.id ? theme.primary + '20' : theme.surfaceVariant },
                  ]}>
                    <Ionicons
                      name={format.icon}
                      size={24}
                      color={selectedFormat === format.id ? theme.primary : theme.textMuted}
                    />
                  </View>
                  <Text style={[
                    styles.formatName,
                    { color: selectedFormat === format.id ? theme.primary : theme.text },
                  ]}>
                    {format.name}
                  </Text>
                  {format.isPremium && (
                    <View style={[styles.premiumBadge, { backgroundColor: theme.warning + '20' }]}>
                      <Ionicons name="star" size={10} color={theme.warning} />
                      <Text style={[styles.premiumText, { color: theme.warning }]}>Pro</Text>
                    </View>
                  )}
                  {needsOcr && !format.isPremium && (
                    <Text style={[styles.ocrRequired, { color: theme.textMuted }]}>
                      OCR needed
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Include OCR option for PDF */}
          {selectedFormat === 'pdf' && hasOcrText && (
            <TouchableOpacity
              style={[styles.ocrToggle, { backgroundColor: theme.background }]}
              onPress={() => setIncludeOcr(!includeOcr)}
            >
              <View style={styles.ocrToggleContent}>
                <Ionicons name="text" size={20} color={theme.primary} />
                <View>
                  <Text style={[styles.ocrToggleLabel, { color: theme.text }]}>
                    Include OCR text
                  </Text>
                  <Text style={[styles.ocrToggleHint, { color: theme.textMuted }]}>
                    Add extracted text as footer
                  </Text>
                </View>
              </View>
              <View style={[
                styles.checkbox,
                { borderColor: theme.border },
                includeOcr && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}>
                {includeOcr && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
            </TouchableOpacity>
          )}

          <Button
            title={isExporting ? 'Exporting...' : `Export as ${selectedFormatInfo?.name || 'File'}`}
            onPress={handleExport}
            loading={isExporting}
            disabled={isExporting}
            style={{ marginTop: 20 }}
            icon={!isExporting ? <Ionicons name="download" size={20} color="#FFF" /> : undefined}
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formatOption: {
    width: '47%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  formatIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  formatName: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
    gap: 3,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ocrRequired: {
    fontSize: 10,
    marginTop: 4,
  },
  ocrToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  ocrToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ocrToggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  ocrToggleHint: {
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import Button from './Button';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ExportFormat {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  extension: string;
  requiresOcr: boolean;
  isPremium: boolean;
  mimeType: string;
}

const EXPORT_FORMATS: ExportFormat[] = [
  { id: 'pdf', name: 'PDF', icon: 'document-text', extension: 'pdf', requiresOcr: false, isPremium: false, mimeType: 'application/pdf' },
  { id: 'jpeg', name: 'Image (JPEG)', icon: 'image', extension: 'jpg', requiresOcr: false, isPremium: false, mimeType: 'image/jpeg' },
  { id: 'png', name: 'Image (PNG)', icon: 'image-outline', extension: 'png', requiresOcr: false, isPremium: false, mimeType: 'image/png' },
  { id: 'tiff', name: 'Image (TIFF)', icon: 'images', extension: 'tiff', requiresOcr: false, isPremium: true, mimeType: 'image/tiff' },
  { id: 'docx', name: 'Word (.docx)', icon: 'document', extension: 'docx', requiresOcr: true, isPremium: true, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
];

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  hasOcrText: boolean;
  isPremium: boolean;
  token: string;
  pages?: Array<{ image_base64: string; ocr_text?: string }>;
}

export default function ExportModal({
  visible,
  onClose,
  documentId,
  documentName,
  hasOcrText,
  isPremium,
  token,
  pages = [],
}: ExportModalProps) {
  const { theme } = useThemeStore();
  const { isGuest } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [includeOcr, setIncludeOcr] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const format = EXPORT_FORMATS.find((f) => f.id === selectedFormat);
    if (!format) return;

    if (format.isPremium && !isPremium) {
      Alert.alert('Premium Feature', `${format.name} export requires premium.`);
      return;
    }

    if (format.requiresOcr && !hasOcrText) {
      Alert.alert('OCR Required', 'Please run OCR on the document first.');
      return;
    }

    setIsExporting(true);
    try {
      let fileBase64: string;
      let fileName: string;
      let mimeType: string;

      // For JPEG and PNG, handle locally
      if (selectedFormat === 'jpeg' || selectedFormat === 'png') {
        if (!pages || pages.length === 0) {
          throw new Error('No pages available for image export');
        }
        
        const firstPage = pages[0];
        if (!firstPage || !firstPage.image_base64) {
          throw new Error('First page has no image data');
        }
        
        fileBase64 = firstPage.image_base64;
        if (fileBase64.includes(',')) {
          fileBase64 = fileBase64.split(',')[1];
        }
        const ext = selectedFormat === 'png' ? 'png' : 'jpg';
        fileName = `${documentName.replace(/[^a-z0-9]/gi, '_')}_page1.${ext}`;
        mimeType = selectedFormat === 'png' ? 'image/png' : 'image/jpeg';
      } else if (selectedFormat === 'pdf') {
        // LOCAL PDF generation - no backend needed!
        if (!pages || pages.length === 0) {
          throw new Error('No pages available for PDF export');
        }
        
        console.log('[ExportModal] Generating PDF locally...');
        
        // Prepare images for PDF
        const imagesBase64 = pages.map(page => {
          let imgData = page.image_base64 || '';
          if (imgData.includes(',')) {
            imgData = imgData.split(',')[1];
          }
          return imgData;
        });
        
        if (!imagesBase64[0] || imagesBase64[0].length < 100) {
          throw new Error('Page images not available. Please try again.');
        }
        
        // Build HTML with images for local PDF generation
        const imageHtml = imagesBase64.map((img, index) => {
          const base64WithPrefix = `data:image/jpeg;base64,${img}`;
          return `
            <div style="page-break-after: ${index < imagesBase64.length - 1 ? 'always' : 'auto'}; text-align: center; padding: 0; margin: 0;">
              <img src="${base64WithPrefix}" style="max-width: 100%; max-height: 100vh; object-fit: contain;" />
            </div>
          `;
        }).join('');

        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>${documentName}</title>
              <style>
                @page { margin: 10mm; padding: 0; }
                body { margin: 0; padding: 0; }
                img { display: block; margin: 0 auto; }
              </style>
            </head>
            <body>
              ${imageHtml}
            </body>
          </html>
        `;

        // Generate PDF locally using expo-print
        const { uri } = await Print.printToFileAsync({ html });
        
        // Read the PDF file as base64
        fileBase64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        fileName = `${documentName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        mimeType = 'application/pdf';
        
        console.log('[ExportModal] PDF generated locally, size:', fileBase64.length);
      } else if (isGuest) {
        Alert.alert('Sign In Required', `Sign in to export as ${format.name}.`);
        setIsExporting(false);
        return;
      } else {
        // Use backend for TIFF, DOCX and other formats (require authentication)
        const response = await fetch(`${BACKEND_URL}/api/documents/${documentId}/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            format: selectedFormat,
            include_ocr: includeOcr || format.requiresOcr,
          }),
        });

        if (!response.ok) {
          throw new Error(`Export failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.file_base64) {
          throw new Error('No file data received from server');
        }
        
        fileBase64 = result.file_base64;
        fileName = result.filename || `${documentName.replace(/[^a-z0-9]/gi, '_')}.${format.extension}`;
        mimeType = result.mime_type || format.mimeType;
      }

      // Get the cache directory
      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      
      if (!cacheDir) {
        Alert.alert('Error', 'File system not available.');
        return;
      }
      
      const fileUri = `${cacheDir}${fileName}`;
      
      if (!fileBase64 || fileBase64.length === 0) {
        throw new Error('File data is empty');
      }
      
      // Write file
      await FileSystem.writeAsStringAsync(fileUri, fileBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: `Share ${documentName}`,
        });
        onClose();
      } else {
        Alert.alert('Success', `File saved to: ${fileUri}`);
        onClose();
      }
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', error.message || 'Unknown error occurred');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormatInfo = EXPORT_FORMATS.find((f) => f.id === selectedFormat);
  
  // All formats available for logged-in users, PDF/JPEG for guests
  const availableFormats = isGuest 
    ? EXPORT_FORMATS.filter(f => f.id === 'pdf' || f.id === 'jpeg')
    : EXPORT_FORMATS;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[
          styles.content, 
          { 
            backgroundColor: theme.surface,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          }
        ]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Export Document</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {isGuest && (
            <View style={[styles.guestNotice, { backgroundColor: theme.warning + '20' }]}>
              <Ionicons name="information-circle" size={20} color={theme.warning} />
              <Text style={[styles.guestNoticeText, { color: theme.warning }]}>
                Sign in to unlock all export formats
              </Text>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Select Format
          </Text>

          <View style={styles.formatGrid}>
            {availableFormats.map((format) => {
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
                    { backgroundColor: selectedFormat === format.id ? theme.primary + '20' : theme.surfaceVariant || theme.surface },
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
          {selectedFormat === 'pdf' && hasOcrText && !isGuest && (
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
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  guestNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  guestNoticeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
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

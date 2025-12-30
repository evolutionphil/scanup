import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/themeStore';

// Brand colors from Figma
const BRAND_BLUE = '#3E51FB';
const TEXT_DARK = '#1B1B1B';
const TEXT_MUTED = '#A4A4A4';
const BORDER_GRAY = '#DADADA';

// Helper to load image base64 from any source
const loadPageImageBase64 = async (page: { image_base64?: string; image_url?: string; image_file_uri?: string }): Promise<string> => {
  // Priority 1: Already have base64
  if (page.image_base64 && page.image_base64.length > 100) {
    if (page.image_base64.startsWith('data:')) {
      return page.image_base64.split(',')[1];
    }
    return page.image_base64;
  }
  
  // Priority 2: Load from file URI
  if (page.image_file_uri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(page.image_file_uri);
      if (fileInfo.exists) {
        const base64 = await FileSystem.readAsStringAsync(page.image_file_uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }
    } catch (e) {
      console.error('[ShareModal] Failed to load from file:', e);
    }
  }
  
  // Priority 3: Download from S3 URL
  if (page.image_url) {
    try {
      console.log('[ShareModal] Downloading from S3...');
      const response = await fetch(page.image_url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('[ShareModal] Failed to download from S3:', e);
    }
  }
  
  return '';
};

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  documentName: string;
  pageCount: number;
  fileSize?: string;
  pages?: Array<{ image_base64?: string; image_url?: string; image_file_uri?: string; ocr_text?: string }>;
}

export default function ShareModal({
  visible,
  onClose,
  documentName,
  pageCount,
  fileSize = '0 MB',
  pages = [],
}: ShareModalProps) {
  const { theme } = useThemeStore();
  const insets = useSafeAreaInsets();
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'jpg'>('pdf');
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate file size from pages
  const calculateFileSize = () => {
    if (fileSize !== '0 MB') return fileSize;
    if (!pages || pages.length === 0) return '0 MB';
    
    let totalSize = 0;
    pages.forEach(page => {
      if (page.image_base64) {
        // Base64 string length * 0.75 gives approximate bytes
        totalSize += (page.image_base64.length * 0.75);
      }
    });
    
    if (totalSize > 1024 * 1024) {
      return `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
    } else if (totalSize > 1024) {
      return `${(totalSize / 1024).toFixed(1)} KB`;
    }
    return `${totalSize} B`;
  };

  const generatePdf = async (): Promise<string> => {
    // Load images from any source
    const imagesBase64 = await Promise.all(pages.map(page => loadPageImageBase64(page)));

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

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  };

  const handleShare = async () => {
    if (!pages || pages.length === 0) {
      Alert.alert('Error', 'No pages available to share');
      return;
    }

    setIsExporting(true);
    try {
      let fileUri: string;
      let mimeType: string;
      const safeFileName = documentName.replace(/[^a-z0-9]/gi, '_');

      if (selectedFormat === 'pdf') {
        const pdfUri = await generatePdf();
        const newUri = `${FileSystem.cacheDirectory}${safeFileName}.pdf`;
        await FileSystem.copyAsync({ from: pdfUri, to: newUri });
        fileUri = newUri;
        mimeType = 'application/pdf';
      } else {
        // JPG - export first page
        const firstPage = pages[0];
        let base64 = firstPage.image_base64;
        if (base64.includes(',')) {
          base64 = base64.split(',')[1];
        }
        fileUri = `${FileSystem.cacheDirectory}${safeFileName}.jpg`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        mimeType = 'image/jpeg';
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `Share ${documentName}`,
        });
      } else {
        Alert.alert('Success', 'File saved successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Share error:', error);
      Alert.alert('Error', error.message || 'Failed to share document');
    } finally {
      setIsExporting(false);
    }
  };

  const handleMail = async () => {
    if (!pages || pages.length === 0) {
      Alert.alert('Error', 'No pages available to share');
      return;
    }

    setIsExporting(true);
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Mail is not available on this device');
        setIsExporting(false);
        return;
      }

      const pdfUri = await generatePdf();
      const safeFileName = documentName.replace(/[^a-z0-9]/gi, '_');
      const newUri = `${FileSystem.cacheDirectory}${safeFileName}.pdf`;
      await FileSystem.copyAsync({ from: pdfUri, to: newUri });

      await MailComposer.composeAsync({
        subject: documentName,
        body: `Please find attached: ${documentName}`,
        attachments: [newUri],
      });
      onClose();
    } catch (error: any) {
      console.error('Mail error:', error);
      Alert.alert('Error', error.message || 'Failed to send mail');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!pages || pages.length === 0) {
      Alert.alert('Error', 'No pages available to print');
      return;
    }

    setIsExporting(true);
    try {
      const imagesBase64 = pages.map(page => {
        let imgData = page.image_base64 || '';
        if (imgData.includes(',')) {
          imgData = imgData.split(',')[1];
        }
        return `data:image/jpeg;base64,${imgData}`;
      });

      const imageHtml = imagesBase64.map((img, index) => `
        <div style="page-break-after: ${index < imagesBase64.length - 1 ? 'always' : 'auto'}; text-align: center;">
          <img src="${img}" style="max-width: 100%; max-height: 100vh; object-fit: contain;" />
        </div>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8"></head>
          <body style="margin: 0; padding: 0;">
            ${imageHtml}
          </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (error: any) {
      console.error('Print error:', error);
      Alert.alert('Error', error.message || 'Failed to print');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Share</Text>
              <Text style={styles.subtitle}>
                {documentName} - {calculateFileSize()} - {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* File Format */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>File format</Text>
            <View style={styles.formatToggle}>
              <TouchableOpacity
                style={[
                  styles.formatOption,
                  selectedFormat === 'pdf' && styles.formatOptionSelected,
                ]}
                onPress={() => setSelectedFormat('pdf')}
              >
                <Text style={[
                  styles.formatText,
                  selectedFormat === 'pdf' && styles.formatTextSelected,
                ]}>
                  PDF
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formatOption,
                  selectedFormat === 'jpg' && styles.formatOptionSelected,
                ]}
                onPress={() => setSelectedFormat('jpg')}
              >
                <Text style={[
                  styles.formatText,
                  selectedFormat === 'jpg' && styles.formatTextSelected,
                ]}>
                  JPG
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Password Protect */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Password protect</Text>
            <Switch
              value={passwordProtect}
              onValueChange={setPasswordProtect}
              trackColor={{ false: '#E5E5E5', true: BRAND_BLUE + '50' }}
              thumbColor={passwordProtect ? BRAND_BLUE : '#FFFFFF'}
              ios_backgroundColor="#E5E5E5"
            />
          </View>

          <View style={styles.divider} />

          {/* Mail Option */}
          <TouchableOpacity style={styles.actionRow} onPress={handleMail} disabled={isExporting}>
            <Text style={styles.rowLabel}>Mail</Text>
            <Ionicons name="mail-outline" size={24} color={TEXT_DARK} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Print Option */}
          <TouchableOpacity style={styles.actionRow} onPress={handlePrint} disabled={isExporting}>
            <Text style={styles.rowLabel}>Print</Text>
            <Ionicons name="print-outline" size={24} color={TEXT_DARK} />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={[styles.shareButton, isExporting && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="arrow-up-circle-outline" size={22} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share document</Text>
              </>
            )}
          </TouchableOpacity>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_GRAY,
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  formatToggle: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    padding: 4,
  },
  formatOption: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  formatOptionSelected: {
    backgroundColor: BRAND_BLUE,
  },
  formatText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  formatTextSelected: {
    color: '#FFFFFF',
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: BRAND_BLUE,
    borderRadius: 12,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

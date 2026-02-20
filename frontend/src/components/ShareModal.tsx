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
import { cacheDirectory, writeAsStringAsync, copyAsync, EncodingType, getInfoAsync, readAsStringAsync } from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../store/i18nStore';
import { useAdStore } from '../store/adStore';
import { useAuthStore } from '../store/authStore';
import { usePurchaseStore, canExportWithoutWatermark } from '../store/purchaseStore';
import { useMonetizationStore } from '../store/monetizationStore';
import { showGlobalInterstitial } from './AdManager';
import SoftPaywall from './SoftPaywall';
import { PDFDocument } from 'pdf-lib-with-encrypt';

import Constants from 'expo-constants';

const BRAND_BLUE = '#3E51FB';

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
      const fileInfo = await getInfoAsync(page.image_file_uri);
      if (fileInfo.exists) {
        const base64 = await readAsStringAsync(page.image_file_uri, {
          encoding: EncodingType.Base64,
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
  pageCount?: number;
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
  const { theme, isDark } = useThemeStore();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'jpg'>('pdf');
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [password, setPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Monetization store for export tracking
  const { 
    exportCount, 
    canExportFree, 
    shouldShowPaywall: checkPaywall,
    shouldShowWatermark,
    canShowAd,
    incrementExportCount,
    incrementAdsShown,
  } = useMonetizationStore();
  
  const { isPremium } = usePurchaseStore();

  // ==========================================
  // WATERMARK LOGIC - DISABLED (No watermarks anymore)
  // ==========================================
  // Watermark completely removed as per user request
  const getWatermarkStatus = (): boolean => {
    // Always return false - no watermarks
    return false;
  };

  // ==========================================
  // AD LOGIC - Using monetization store
  // ==========================================
  // RULES:
  // 1. Premium users → NO ADS
  // 2. First 24 hours → NO ADS
  // 3. Max 1 ad per session
  // 4. Only after PDF export (not on first export)
  const tryShowAd = async () => {
    if (!canShowAd(isPremium)) {
      console.log('[ShareModal] Ad skipped by monetization rules');
      return;
    }
    
    const { adsEnabled, isAdLoaded } = useAdStore.getState();
    if (adsEnabled && isAdLoaded) {
      console.log('[ShareModal] Showing ad after export');
      try {
        await showGlobalInterstitial();
        incrementAdsShown();
      } catch (e) {
        console.log('[ShareModal] Could not show ad:', e);
      }
    }
  };

  const generatePdf = async (): Promise<string> => {
    console.log('[ShareModal] generatePdf - pageCount:', pages.length);
    
    // Load images from any source
    const imagesBase64 = await Promise.all(pages.map(page => loadPageImageBase64(page)));
    
    // Filter out any empty images
    const validImages = imagesBase64.filter(img => img && img.length > 100);
    console.log('[ShareModal] Valid images count:', validImages.length);

    // Build HTML for each page
    // CRITICAL: Each image = exactly one PDF page
    // No page-break-after needed when using height: 100vh
    const imageHtml = validImages.map((img) => {
      const base64WithPrefix = `data:image/jpeg;base64,${img}`;
      return `<div class="page"><img src="${base64WithPrefix}" /></div>`;
    }).join('');

    // FIXED CSS: Simple and reliable for iOS/Android PDF generation
    // KEY FIX: Each page should be exactly one PDF page, no overflow
    // Using height: 100vh ensures content fits in exactly one page
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { 
    margin: 0; 
    size: A4 portrait;
  }
  html, body { 
    margin: 0; 
    padding: 0;
    background: white;
    width: 100%;
    height: 100%;
  }
  .page {
    width: 100%;
    height: 100vh;
    padding: 10mm;
    display: flex;
    justify-content: center;
    align-items: center;
    background: white;
    box-sizing: border-box;
  }
  .page img { 
    max-width: calc(100% - 10mm);
    max-height: calc(100vh - 20mm);
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
  }
</style>
</head>
<body>${imageHtml}</body>
</html>`;

    console.log('[ShareModal] Generated PDF HTML for', validImages.length, 'pages');
    
    const { uri } = await Print.printToFileAsync({ 
      html,
      margins: { left: 0, right: 0, top: 0, bottom: 0 },
    });
    return uri;
  };

  const handleShare = async () => {
    if (!pages || pages.length === 0) {
      Alert.alert('Error', 'No pages available to share');
      return;
    }

    // ==========================================
    // PAYWALL CHECK - Show soft paywall after first free export
    // ==========================================
    // First export is FREE and uninterrupted
    // Second export shows soft paywall (but user can dismiss)
    if (!isPremium && checkPaywall()) {
      console.log('[ShareModal] Showing paywall - export count:', exportCount);
      setShowPaywall(true);
      return;
    }

    await performExport();
  };

  const performExport = async () => {
    setIsExporting(true);
    try {
      let fileUri: string;
      let mimeType: string;
      const safeFileName = documentName.replace(/[^a-z0-9]/gi, '_');

      if (selectedFormat === 'pdf') {
        const pdfUri = await generatePdf();
        let newUri = `${cacheDirectory}${safeFileName}.pdf`;
        await copyAsync({ from: pdfUri, to: newUri });
        
        // Apply password protection if enabled - using local pdf-lib-with-encrypt
        if (passwordProtect && password) {
          try {
            console.log('[ShareModal] Applying password protection locally with pdf-lib-with-encrypt');
            
            // Read the PDF file as base64
            const pdfBase64 = await readAsStringAsync(newUri, {
              encoding: EncodingType.Base64,
            });
            
            console.log('[ShareModal] PDF base64 length:', pdfBase64.length);
            
            if (pdfBase64 && pdfBase64.length > 100) {
              // Convert base64 to Uint8Array
              const binaryString = atob(pdfBase64);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Load PDF with pdf-lib-with-encrypt
              const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
              
              // Encrypt the PDF with user password
              await pdfDoc.encrypt({
                userPassword: password,
                ownerPassword: password,
                permissions: {
                  printing: 'highResolution',
                  modifying: false,
                  copying: false,
                  annotating: true,
                  fillingForms: true,
                  contentAccessibility: true,
                  documentAssembly: false,
                },
              });
              
              // Save encrypted PDF
              const encryptedPdfBytes = await pdfDoc.save();
              
              // Convert to base64
              let binary = '';
              const len = encryptedPdfBytes.byteLength;
              for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(encryptedPdfBytes[i]);
              }
              const encryptedBase64 = btoa(binary);
              
              // Write to file
              const protectedUri = `${cacheDirectory}${safeFileName}_protected.pdf`;
              await writeAsStringAsync(protectedUri, encryptedBase64, {
                encoding: EncodingType.Base64,
              });
              
              newUri = protectedUri;
              console.log('[ShareModal] ✅ PDF encrypted successfully with password (local encryption)');
            } else {
              console.warn('[ShareModal] PDF base64 data is too short or empty');
              Alert.alert('Warning', 'Could not read PDF file. Sharing unprotected PDF.');
            }
          } catch (encryptError: any) {
            console.error('[ShareModal] Local password protection error:', encryptError.message || encryptError);
            Alert.alert('Warning', `Could not apply password protection: ${encryptError.message || 'Unknown error'}. Sharing unprotected PDF.`);
          }
        }
        
        fileUri = newUri;
        mimeType = 'application/pdf';
      } else {
        // JPG - export first page, load from any source
        const firstPage = pages[0];
        const base64 = await loadPageImageBase64(firstPage);
        
        if (!base64 || base64.length < 100) {
          throw new Error('Could not load image data');
        }
        
        fileUri = `${cacheDirectory}${safeFileName}.jpg`;
        await writeAsStringAsync(fileUri, base64, {
          encoding: EncodingType.Base64,
        });
        mimeType = 'image/jpeg';
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: `Share ${documentName}`,
        });
        
        // ⭐ Increment export count after successful share
        await incrementExportCount();
        
        // Show ad after successful share (respects monetization rules)
        await tryShowAd();
      } else {
        Alert.alert('Success', 'File saved successfully');
        await incrementExportCount();
      }
      onClose();
    } catch (error: any) {
      console.error('Share error:', error);
      Alert.alert('Error', error.message || 'Failed to share document');
    } finally {
      setIsExporting(false);
    }
  };

  // Called when user dismisses paywall and wants to continue with watermark
  const handlePaywallDismiss = () => {
    setShowPaywall(false);
    // User chose "Not now" - proceed with export (with watermark)
    performExport();
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
      const newUri = `${cacheDirectory}${safeFileName}.pdf`;
      await copyAsync({ from: pdfUri, to: newUri });

      await MailComposer.composeAsync({
        subject: documentName,
        body: `Please find attached: ${documentName}`,
        attachments: [newUri],
      });
      
      // Show ad after mail compose
      await tryShowAd();
      
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
      console.log('[ShareModal] handlePrint - pageCount:', pages.length);
      
      // Load images from any source
      const imagesBase64 = await Promise.all(pages.map(page => loadPageImageBase64(page)));
      
      // Filter out any empty images
      const validImages = imagesBase64.filter(img => img && img.length > 100);

      // Build HTML for each page
      const imageHtml = validImages.map((img, index) => {
        const isLastPage = index === validImages.length - 1;
        const pageBreak = !isLastPage ? 'page-break-after: always;' : '';
        return `<div class="page" style="${pageBreak}">
          <img src="data:image/jpeg;base64,${img}" />
        </div>`;
      }).join('');

      // FIXED CSS: Same as generatePdf - with padding on all sides
      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { margin: 10mm; size: A4; }
  html, body { 
    margin: 0; 
    padding: 0;
    background: white;
  }
  .page {
    width: 190mm;
    height: 277mm;
    padding: 5mm;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    page-break-inside: avoid;
    background: white;
  }
  .page img { 
    max-width: 180mm;
    max-height: 267mm;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
  }
</style>
</head>
<body>${imageHtml}</body>
</html>`;

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
          { 
            backgroundColor: theme.card,
            paddingBottom: Math.max(insets.bottom, 24) + 16 
          }
        ]}>
          {/* Sheet Handle */}
          <View style={styles.sheetHandle} />
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>{t('share', 'Share')}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {documentName} - {fileSize} - {pageCount || pages.length} {(pageCount || pages.length) === 1 ? t('page', 'Page') : t('pages', 'Pages')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* File Format */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('file_format', 'File format')}</Text>
            <View style={[styles.formatToggle, { backgroundColor: theme.surfaceVariant }]}>
              <TouchableOpacity
                style={[
                  styles.formatOption,
                  selectedFormat === 'pdf' && styles.formatOptionSelected,
                ]}
                onPress={() => setSelectedFormat('pdf')}
              >
                <Text style={[
                  styles.formatText,
                  { color: theme.textMuted },
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
                  { color: theme.textMuted },
                  selectedFormat === 'jpg' && styles.formatTextSelected,
                ]}>
                  JPG
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Password Protect */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('password_protect', 'Password protect')}</Text>
            <Switch
              value={passwordProtect}
              onValueChange={(value) => {
                setPasswordProtect(value);
                if (!value) setPassword('');
              }}
              trackColor={{ false: theme.surfaceVariant, true: BRAND_BLUE + '50' }}
              thumbColor={passwordProtect ? BRAND_BLUE : theme.card}
              ios_backgroundColor={theme.surfaceVariant}
            />
          </View>
          
          {/* Password Input - shows when toggle is on */}
          {passwordProtect && selectedFormat === 'pdf' && (
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  { 
                    backgroundColor: theme.surfaceVariant,
                    color: theme.text,
                  }
                ]}
                placeholder={t('enter_password_for_pdf', 'Enter password for PDF')}
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Mail Option */}
          <TouchableOpacity style={styles.actionRow} onPress={handleMail} disabled={isExporting}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('mail', 'Mail')}</Text>
            <Ionicons name="mail-outline" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Print Option */}
          <TouchableOpacity style={styles.actionRow} onPress={handlePrint} disabled={isExporting}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{t('print', 'Print')}</Text>
            <Ionicons name="print-outline" size={24} color={theme.text} />
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
                <Text style={styles.shareButtonText}>{t('share_document', 'Share document')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Soft Paywall - shown after first free export */}
      <SoftPaywall
        visible={showPaywall}
        onClose={handlePaywallDismiss}
        trigger="export"
      />
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
    // No background color - completely transparent
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#94A3B8',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
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
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  divider: {
    height: 1,
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
  },
  formatToggle: {
    flexDirection: 'row',
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
  },
  formatTextSelected: {
    color: '#FFFFFF',
  },
  passwordInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  passwordInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
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

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

import Constants from 'expo-constants';

// Backend URL for PDF password protection
const BACKEND_URL = 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://scanup-production.up.railway.app';

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
  // WATERMARK LOGIC - Using monetization store
  // ==========================================
  // RULES:
  // 1. Premium users → NO WATERMARK
  // 2. Users who bought "Remove Watermark" (€2.99) → NO WATERMARK
  // 3. First export → NO WATERMARK (free trial)
  // 4. Subsequent exports for free users → WATERMARK
  const getWatermarkStatus = (): boolean => {
    // Use centralized monetization logic
    return shouldShowWatermark(isPremium);
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
    const showWatermark = getWatermarkStatus();
    
    console.log('[ShareModal] generatePdf - showWatermark:', showWatermark, 'exportCount:', exportCount, 'pageCount:', pages.length);
    
    // Load images from any source
    const imagesBase64 = await Promise.all(pages.map(page => loadPageImageBase64(page)));
    
    // Filter out any empty images
    const validImages = imagesBase64.filter(img => img && img.length > 100);
    console.log('[ShareModal] Valid images count:', validImages.length);

    // Watermark HTML - diagonal text overlay
    const watermarkHtml = showWatermark ? `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 72px;
        font-weight: bold;
        color: rgba(62, 81, 251, 0.15);
        white-space: nowrap;
        pointer-events: none;
        z-index: 1000;
        font-family: Arial, sans-serif;
        letter-spacing: 8px;
      ">ScanUp</div>
    ` : '';

    // Build HTML for each page - FIXED: removed min-height that causes extra pages
    const imageHtml = validImages.map((img, index) => {
      const base64WithPrefix = `data:image/jpeg;base64,${img}`;
      const isLastPage = index === validImages.length - 1;
      
      // Only add page-break-after for pages that are NOT the last one
      // Using 'avoid' for last page to prevent extra blank page
      return `<div class="page-container" style="${!isLastPage ? 'page-break-after: always;' : 'page-break-after: avoid;'} page-break-inside: avoid;">
          <img src="${base64WithPrefix}" />
          ${watermarkHtml}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${documentName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { 
    margin: 0; 
    padding: 0;
    size: auto;
  }
  html, body { 
    margin: 0; 
    padding: 0; 
    width: 100%;
    height: 100%;
  }
  .page-container {
    position: relative;
    width: 100%;
    height: auto;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
  .page-container img {
    width: 100%;
    height: auto;
    max-width: 100%;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }
</style>
</head>
<body>${imageHtml}</body>
</html>`;

    console.log('[ShareModal] Generated HTML for', validImages.length, 'pages');
    
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
        
        // Apply password protection if enabled
        if (passwordProtect && password) {
          try {
            const apiUrl = `${BACKEND_URL}/api/pdf/protect`;
            console.log('[ShareModal] Applying password protection via backend:', apiUrl);
            
            // Read the PDF file
            const pdfBase64 = await readAsStringAsync(newUri, {
              encoding: EncodingType.Base64,
            });
            
            console.log('[ShareModal] PDF base64 length:', pdfBase64.length);
            
            // Call backend to encrypt PDF
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pdf_base64: pdfBase64,
                password: password,
              }),
            });
            
            console.log('[ShareModal] Backend response status:', response.status);
            
            if (response.ok) {
              const result = await response.json();
              console.log('[ShareModal] Backend response:', result.success, result.message);
              
              if (result.success && result.pdf_base64) {
                // Save encrypted PDF
                const protectedUri = `${cacheDirectory}${safeFileName}_protected.pdf`;
                await writeAsStringAsync(protectedUri, result.pdf_base64, {
                  encoding: EncodingType.Base64,
                });
                newUri = protectedUri;
                console.log('[ShareModal] PDF encrypted successfully with password');
              } else {
                console.warn('[ShareModal] Backend encryption failed:', result.message);
                Alert.alert('Warning', 'Could not apply password protection. Sharing unprotected PDF.');
              }
            } else {
              const errorText = await response.text();
              console.warn('[ShareModal] Backend request failed:', response.status, errorText);
              Alert.alert('Warning', 'Could not apply password protection. Sharing unprotected PDF.');
            }
          } catch (encryptError: any) {
            console.error('[ShareModal] Password protection error:', encryptError.message || encryptError);
            Alert.alert('Warning', 'Could not apply password protection. Sharing unprotected PDF.');
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
      // Use same watermark logic as PDF
      const showWatermark = getWatermarkStatus();
      console.log('[ShareModal] handlePrint - showWatermark:', showWatermark, 'pageCount:', pages.length);
      
      // Load images from any source
      const imagesBase64 = await Promise.all(pages.map(page => loadPageImageBase64(page)));
      
      // Filter out any empty images
      const validImages = imagesBase64.filter(img => img && img.length > 100);

      // Watermark HTML for print
      const watermarkHtml = showWatermark ? `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 72px;
          font-weight: bold;
          color: rgba(62, 81, 251, 0.15);
          white-space: nowrap;
          pointer-events: none;
          z-index: 1000;
          font-family: Arial, sans-serif;
          letter-spacing: 8px;
        ">ScanUp</div>
      ` : '';

      // Build HTML for each page - FIXED: same as generatePdf
      const imageHtml = validImages.map((img, index) => {
        const isLastPage = index === validImages.length - 1;
        return `<div class="page-container" style="${!isLastPage ? 'page-break-after: always;' : 'page-break-after: avoid;'}">
          <img src="data:image/jpeg;base64,${img}" />
          ${watermarkHtml}
        </div>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { margin: 5mm; size: A4; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
  .page-container {
    position: relative;
    width: 100%;
    height: auto;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    margin: 0;
  }
  .page-container img {
    max-width: 100%;
    max-height: 95vh;
    width: auto;
    height: auto;
    object-fit: contain;
    display: block;
    margin: 0 auto;
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
        <TouchableOpacity style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose} activeOpacity={1} />
        
        <View style={[
          styles.content,
          { 
            backgroundColor: theme.card,
            paddingBottom: Math.max(insets.bottom, 24) + 16 
          }
        ]}>
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
  },
  content: {
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

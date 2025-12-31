import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '../src/store/themeStore';
import { useAuthStore } from '../src/store/authStore';
import { useI18n } from '../src/store/i18nStore';

// Settings keys
const SETTINGS_KEYS = {
  DEFAULT_SCAN_QUALITY: '@scanup_default_quality',
  DEFAULT_FILTER: '@scanup_default_filter',
  AUTO_SAVE: '@scanup_auto_save',
  AUTO_ENHANCE: '@scanup_auto_enhance',
  SHOW_GRID: '@scanup_show_grid',
  SOUND_ENABLED: '@scanup_sound_enabled',
  HAPTIC_FEEDBACK: '@scanup_haptic_feedback',
  LANGUAGE: '@scanup_language',
  ONBOARDING_COMPLETE: '@scanup_onboarding_complete',
};

type ScanQuality = 'high' | 'medium' | 'low';
type FilterType = 'original' | 'grayscale' | 'bw' | 'enhanced' | 'magic';

interface Settings {
  defaultScanQuality: ScanQuality;
  defaultFilter: FilterType;
  autoSave: boolean;
  autoEnhance: boolean;
  showGrid: boolean;
  soundEnabled: boolean;
  hapticFeedback: boolean;
  language: string;
}

const DEFAULT_SETTINGS: Settings = {
  defaultScanQuality: 'high',
  defaultFilter: 'original',
  autoSave: false,
  autoEnhance: true,
  showGrid: false,
  soundEnabled: true,
  hapticFeedback: true,
  language: 'en',
};

const QUALITY_OPTIONS: { label: string; value: ScanQuality; description: string }[] = [
  { label: 'High', value: 'high', description: 'Best quality, larger file size' },
  { label: 'Medium', value: 'medium', description: 'Balanced quality and size' },
  { label: 'Low', value: 'low', description: 'Smaller files, faster upload' },
];

const FILTER_OPTIONS: { label: string; value: FilterType; icon: string }[] = [
  { label: 'Original', value: 'original', icon: 'image-outline' },
  { label: 'Grayscale', value: 'grayscale', icon: 'contrast-outline' },
  { label: 'Black & White', value: 'bw', icon: 'moon-outline' },
  { label: 'Enhanced', value: 'enhanced', icon: 'sunny-outline' },
  { label: 'Magic', value: 'magic', icon: 'sparkles-outline' },
];

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en', flag: '🇺🇸' },
  { label: 'Deutsch', value: 'de', flag: '🇩🇪' },
  { label: 'Français', value: 'fr', flag: '🇫🇷' },
  { label: 'Español', value: 'es', flag: '🇪🇸' },
  { label: 'Italiano', value: 'it', flag: '🇮🇹' },
  { label: 'العربية', value: 'ar', flag: '🇸🇦' },
  { label: '中文', value: 'zh', flag: '🇨🇳' },
];

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useThemeStore();
  const { user, isGuest, logout } = useAuthStore();
  const { currentLanguage, setLanguage, t, availableLanguages } = useI18n();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showQualityPicker, setShowQualityPicker] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Sync language setting with i18n store
  useEffect(() => {
    if (currentLanguage && settings.language !== currentLanguage) {
      setSettings(prev => ({ ...prev, language: currentLanguage }));
    }
  }, [currentLanguage]);

  const loadSettings = async () => {
    try {
      const savedSettings: Partial<Settings> = {};
      
      const quality = await AsyncStorage.getItem(SETTINGS_KEYS.DEFAULT_SCAN_QUALITY);
      if (quality) savedSettings.defaultScanQuality = quality as ScanQuality;
      
      const filter = await AsyncStorage.getItem(SETTINGS_KEYS.DEFAULT_FILTER);
      if (filter) savedSettings.defaultFilter = filter as FilterType;
      
      const autoSave = await AsyncStorage.getItem(SETTINGS_KEYS.AUTO_SAVE);
      if (autoSave) savedSettings.autoSave = autoSave === 'true';
      
      const autoEnhance = await AsyncStorage.getItem(SETTINGS_KEYS.AUTO_ENHANCE);
      if (autoEnhance) savedSettings.autoEnhance = autoEnhance === 'true';
      
      const showGrid = await AsyncStorage.getItem(SETTINGS_KEYS.SHOW_GRID);
      if (showGrid) savedSettings.showGrid = showGrid === 'true';
      
      const sound = await AsyncStorage.getItem(SETTINGS_KEYS.SOUND_ENABLED);
      if (sound) savedSettings.soundEnabled = sound === 'true';
      
      const haptic = await AsyncStorage.getItem(SETTINGS_KEYS.HAPTIC_FEEDBACK);
      if (haptic) savedSettings.hapticFeedback = haptic === 'true';
      
      const language = await AsyncStorage.getItem(SETTINGS_KEYS.LANGUAGE);
      if (language) savedSettings.language = language;
      
      setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSetting = async (key: string, value: string | boolean) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Map key to storage key
    const storageKeyMap: Record<keyof Settings, string> = {
      defaultScanQuality: SETTINGS_KEYS.DEFAULT_SCAN_QUALITY,
      defaultFilter: SETTINGS_KEYS.DEFAULT_FILTER,
      autoSave: SETTINGS_KEYS.AUTO_SAVE,
      autoEnhance: SETTINGS_KEYS.AUTO_ENHANCE,
      showGrid: SETTINGS_KEYS.SHOW_GRID,
      soundEnabled: SETTINGS_KEYS.SOUND_ENABLED,
      hapticFeedback: SETTINGS_KEYS.HAPTIC_FEEDBACK,
      language: SETTINGS_KEYS.LANGUAGE,
    };
    
    saveSetting(storageKeyMap[key], value);
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setSettings(DEFAULT_SETTINGS);
            await AsyncStorage.multiRemove(Object.values(SETTINGS_KEYS));
            Alert.alert('Done', 'Settings have been reset');
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear ALL local documents and cached data. This cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear guest documents
              await AsyncStorage.removeItem('@scanup_guest_documents');
              await AsyncStorage.removeItem('@scanup_guest_folders');
              // Clear local cache
              await AsyncStorage.removeItem('@scanup_local_documents');
              // Clear pending sync
              await AsyncStorage.removeItem('@scanup_pending_sync');
              
              Alert.alert('Done', 'All local data has been cleared. Please restart the app.');
            } catch (e) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const SettingRow = ({ 
    icon, 
    label, 
    value, 
    onPress, 
    rightElement,
    subtitle,
  }: { 
    icon: string; 
    label: string; 
    value?: string; 
    onPress?: () => void;
    rightElement?: React.ReactNode;
    subtitle?: string;
  }) => (
    <TouchableOpacity 
      style={[styles.settingRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
          <Ionicons name={icon as any} size={20} color={theme.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement || (
          <>
            {value && <Text style={[styles.settingValue, { color: theme.textMuted }]}>{value}</Text>}
            {onPress && <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>{title}</Text>
  );

  const PickerModal = ({ 
    visible, 
    onClose, 
    title, 
    options, 
    selectedValue, 
    onSelect,
  }: { 
    visible: boolean; 
    onClose: () => void; 
    title: string;
    options: { label: string; value: string; description?: string; icon?: string; flag?: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
  }) => (
    visible ? (
      <TouchableOpacity 
        style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.pickerContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.pickerTitle, { color: theme.text }]}>{title}</Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.pickerOption,
                selectedValue === option.value && { backgroundColor: theme.primary + '15' },
              ]}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <View style={styles.pickerOptionLeft}>
                {option.flag && <Text style={styles.flag}>{option.flag}</Text>}
                {option.icon && <Ionicons name={option.icon as any} size={20} color={theme.text} style={styles.optionIcon} />}
                <View>
                  <Text style={[styles.pickerOptionLabel, { color: theme.text }]}>{option.label}</Text>
                  {option.description && (
                    <Text style={[styles.pickerOptionDesc, { color: theme.textMuted }]}>{option.description}</Text>
                  )}
                </View>
              </View>
              {selectedValue === option.value && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    ) : null
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings', 'Settings')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Scan Settings */}
        <SectionHeader title={t('scan_settings', 'SCAN SETTINGS').toUpperCase()} />
        
        <SettingRow
          icon="camera-outline"
          label={t('default_scan_quality', 'Default Scan Quality')}
          value={QUALITY_OPTIONS.find(q => q.value === settings.defaultScanQuality)?.label}
          onPress={() => setShowQualityPicker(true)}
        />
        
        <SettingRow
          icon="color-palette-outline"
          label={t('default_filter', 'Default Filter')}
          value={FILTER_OPTIONS.find(f => f.value === settings.defaultFilter)?.label}
          onPress={() => setShowFilterPicker(true)}
        />
        
        <SettingRow
          icon="pencil-outline"
          label={t('signature', 'Signatures')}
          subtitle={t('manage_signatures', 'Manage your saved signatures')}
          onPress={() => router.push('/signatures')}
        />
        
        <SettingRow
          icon="flash-outline"
          label={t('auto_enhance', 'Auto Enhance')}
          subtitle={t('auto_enhance_desc', 'Automatically enhance scanned images')}
          rightElement={
            <Switch
              value={settings.autoEnhance}
              onValueChange={(v) => updateSetting('autoEnhance', v)}
              trackColor={{ false: theme.border, true: theme.primary + '50' }}
              thumbColor={settings.autoEnhance ? theme.primary : theme.textMuted}
            />
          }
        />

        {/* Appearance */}
        <SectionHeader title={t('appearance', 'APPEARANCE').toUpperCase()} />
        
        <SettingRow
          icon="moon-outline"
          label={t('dark_mode', 'Dark Mode')}
          rightElement={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.primary + '50' }}
              thumbColor={isDark ? theme.primary : theme.textMuted}
            />
          }
        />
        
        <SettingRow
          icon="language-outline"
          label={t('language', 'Language')}
          value={LANGUAGE_OPTIONS.find(l => l.value === settings.language)?.label}
          onPress={() => setShowLanguagePicker(true)}
        />

        {/* Feedback */}
        <SectionHeader title={t('feedback', 'FEEDBACK').toUpperCase()} />
        
        <SettingRow
          icon="volume-high-outline"
          label={t('sound_effects', 'Sound Effects')}
          rightElement={
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => updateSetting('soundEnabled', v)}
              trackColor={{ false: theme.border, true: theme.primary + '50' }}
              thumbColor={settings.soundEnabled ? theme.primary : theme.textMuted}
            />
          }
        />
        
        <SettingRow
          icon="phone-portrait-outline"
          label={t('haptic_feedback', 'Haptic Feedback')}
          rightElement={
            <Switch
              value={settings.hapticFeedback}
              onValueChange={(v) => updateSetting('hapticFeedback', v)}
              trackColor={{ false: theme.border, true: theme.primary + '50' }}
              thumbColor={settings.hapticFeedback ? theme.primary : theme.textMuted}
            />
          }
        />

        {/* Storage & Data */}
        <SectionHeader title={t('storage_data', 'STORAGE & DATA').toUpperCase()} />
        
        <SettingRow
          icon="trash-outline"
          label={t('clear_cache', 'Clear Cache')}
          subtitle={t('clear_cache_desc', 'Free up storage space')}
          onPress={handleClearCache}
        />
        
        <SettingRow
          icon="refresh-outline"
          label={t('reset_settings', 'Reset Settings')}
          subtitle={t('reset_settings_desc', 'Restore default settings')}
          onPress={handleResetSettings}
        />

        {/* About */}
        <SectionHeader title={t('about', 'ABOUT').toUpperCase()} />
        
        <SettingRow
          icon="information-circle-outline"
          label={t('version', 'Version')}
          value="1.0.0"
        />
        
        <SettingRow
          icon="document-text-outline"
          label={t('terms_conditions', 'Terms of Service')}
          onPress={() => router.push('/legal?type=terms')}
        />
        
        <SettingRow
          icon="shield-checkmark-outline"
          label={t('privacy_policy', 'Privacy Policy')}
          onPress={() => router.push('/legal?type=privacy')}
        />
        
        <SettingRow
          icon="help-circle-outline"
          label={t('help_support', 'Help & Support')}
          onPress={() => router.push('/legal?type=support')}
        />

        <View style={[styles.footer, { marginBottom: 80 }]}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            ScanUp v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Made with ❤️
          </Text>
        </View>
      </ScrollView>

      {/* Quality Picker Modal */}
      <PickerModal
        visible={showQualityPicker}
        onClose={() => setShowQualityPicker(false)}
        title="Select Scan Quality"
        options={QUALITY_OPTIONS}
        selectedValue={settings.defaultScanQuality}
        onSelect={(v) => updateSetting('defaultScanQuality', v as ScanQuality)}
      />

      {/* Filter Picker Modal */}
      <PickerModal
        visible={showFilterPicker}
        onClose={() => setShowFilterPicker(false)}
        title="Select Default Filter"
        options={FILTER_OPTIONS}
        selectedValue={settings.defaultFilter}
        onSelect={(v) => updateSetting('defaultFilter', v as FilterType)}
      />

      {/* Language Picker Modal */}
      <PickerModal
        visible={showLanguagePicker}
        onClose={() => setShowLanguagePicker(false)}
        title={t('select_language', 'Select Language')}
        options={LANGUAGE_OPTIONS}
        selectedValue={settings.language}
        onSelect={(v) => {
          updateSetting('language', v);
          // Update the global i18n language and fetch new translations
          setLanguage(v);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pickerContainer: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 22,
    marginRight: 12,
  },
  optionIcon: {
    marginRight: 12,
  },
  pickerOptionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../config';
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  Download,
  Upload,
  Search
} from 'lucide-react';

const API_URL = `${API_BASE}/api`;

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

// Translation key categories for better organization
const KEY_CATEGORIES = {
  'General': ['app_name', 'loading', 'please_wait', 'cancel', 'save', 'done', 'apply', 'delete', 'edit', 'create', 'search', 'close', 'back', 'next', 'skip', 'retry', 'yes', 'no', 'ok', 'error', 'success', 'warning', 'add', 'remove', 'select', 'selected', 'all', 'none', 'recent', 'favorites', 'tags', 'date', 'size', 'name', 'type', 'sort_by', 'filter_by'],
  'Authentication': ['sign_in', 'sign_up', 'sign_out', 'logout', 'create_account', 'welcome_back', 'sign_in_to_continue', 'sign_up_to_get_started', 'already_have_account', 'dont_have_account', 'continue_with_google', 'email', 'password', 'full_name', 'confirm_password', 'enter_email', 'enter_password', 'enter_name', 'create_password', 'confirm_your_password', 'forgot_password', 'reset_password', 'set_password', 'sign_in_to_sync', 'guest_mode', 'continue_as_guest'],
  'Onboarding': ['get_started', 'smart_scanning', 'auto_detect_boundaries', 'smart_enhancement', 'auto_correct_beautify', 'instant_ocr', 'extract_text_instantly', 'cloud_sync', 'access_from_anywhere'],
  'Documents': ['documents', 'my_documents', 'no_documents', 'no_documents_yet', 'add_documents', 'search_documents', 'loading_documents', 'loading_document', 'document_name', 'rename_document', 'delete_document', 'export_document', 'share_document', 'view_mode'],
  'Folders': ['folders', 'no_folders_yet', 'new_folder', 'folder_name', 'delete_folder', 'move_to_folder', 'remove_from_folder', 'folder_protected', 'set_folder_password', 'remove_password', 'enter_folder_password', 'unlock'],
  'Scanner': ['scan', 'camera', 'gallery', 'auto_detect', 'capturing', 'camera_permission_required', 'grant_permission', 'live_preview', 'live_edge_detection', 'show_grid_overlay', 'display_grid_on_camera', 'flash', 'flash_on', 'flash_off', 'flash_auto'],
  'Document Modes': ['single_page', 'multi_page', 'book_mode', 'id_card', 'batch_scan', 'left_page', 'right_page'],
  'Templates': ['select_document_type', 'select_document_template', 'template', 'general_document', 'receipt', 'business_card', 'whiteboard', 'passport', 'form'],
  'Editing': ['crop', 'adjust_crop', 'auto_crop', 'rotate', 'adjust_filter', 'revert', 'revert_to_original', 'reset'],
  'Filters': ['filters', 'original', 'enhanced', 'grayscale', 'black_white', 'color', 'magic', 'default_filter', 'select_default_filter'],
  'Adjustments': ['brightness', 'contrast', 'saturation', 'auto_enhance', 'automatically_enhance'],
  'Pages': ['pages', 'page', 'add_page', 'add_more', 'del_page', 'delete_page', 'move_up', 'move_down', 'add_to_document', 'edit_page_screen'],
  'Annotations': ['annotate', 'annotations', 'draw', 'text', 'shapes', 'arrow', 'rectangle', 'circle', 'line', 'highlight', 'thickness', 'enter_text', 'clear', 'undo'],
  'Signature': ['sign', 'signature', 'draw_signature', 'sign_here', 'position_signature', 'signature_hint', 're_sign', 'saved_signatures'],
  'OCR': ['ocr', 'extract_text', 'extracted_text', 'copy_text', 'text_copied', 'no_text_found', 'ocr_processing', 'ocr_left'],
  'Export': ['export', 'share', 'export_as_pdf', 'export_as_image', 'export_as_jpeg', 'export_as_png', 'pdf', 'jpeg', 'png', 'high_quality', 'medium_quality', 'low_quality'],
  'Settings': ['settings', 'all_settings', 'preferences', 'general', 'appearance', 'dark_mode', 'language', 'select_language', 'default_scan_quality', 'select_scan_quality', 'sound_effects', 'haptic_feedback', 'auto_backup', 'clear_cache', 'free_up_storage', 'reset_settings', 'restore_defaults', 'advanced_features_coming'],
  'Profile': ['profile', 'account', 'plan', 'pro', 'free', 'try_premium_free', 'scans_left', 'monthly_scans_remaining', 'daily_usage', 'help_support', 'privacy_policy', 'terms_of_service', 'version', 'go_back'],
  'Errors': ['something_went_wrong', 'network_error', 'invalid_credentials', 'email_already_exists', 'password_too_short', 'passwords_dont_match', 'document_saved', 'document_deleted', 'changes_saved', 'cache_cleared', 'settings_reset'],
};

export default function Localization() {
  const { token } = useAuth();
  const [languages, setLanguages] = useState(['en']);
  const [translations, setTranslations] = useState({});
  const [defaultTranslations, setDefaultTranslations] = useState({});
  const [selectedLang, setSelectedLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddLang, setShowAddLang] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddKey, setShowAddKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchLocalization();
  }, []);

  const fetchLocalization = async () => {
    try {
      // Fetch from the new admin localization endpoint
      const res = await fetch(`${API_URL}/admin/localization`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const langs = data.languages || [];
        const trans = data.translations || {};
        const defaultKeys = data.default_keys || [];
        
        // Extract language codes from language objects (handle both string and object formats)
        const langCodes = langs.map(l => typeof l === 'string' ? l : l.code).filter(Boolean);
        
        setLanguages(langCodes.length > 0 ? langCodes : ['en']);
        setTranslations(trans);
        
        // Use English translations as default reference
        if (trans.en) {
          setDefaultTranslations({ en: trans.en });
        }
      } else {
        // Fallback: fetch from public endpoint
        const publicRes = await fetch(`${API_URL}/content/translations/en`);
        if (publicRes.ok) {
          const data = await publicRes.json();
          setDefaultTranslations({ en: data.translations || {} });
          setTranslations({ en: data.translations || {} });
        }
        setLanguages(['en']);
      }
    } catch (e) {
      console.error('Failed to fetch localization:', e);
      setLanguages(['en']);
      setTranslations({});
    } finally {
      setLoading(false);
    }
  };

  const saveTranslations = async () => {
    setSaving(true);
    try {
      // Save translations for the selected language
      const res = await fetch(`${API_URL}/admin/translations/${selectedLang}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ translations: translations[selectedLang] || {} }),
      });

      if (res.ok) {
        alert('Translations saved successfully!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (e) {
      console.error('Failed to save:', e);
      alert('Failed to save translations');
    } finally {
      setSaving(false);
    }
  };

  const addLanguage = (langCode) => {
    if (!languages.includes(langCode)) {
      setLanguages([...languages, langCode]);
      // Copy English translations as base
      setTranslations({
        ...translations,
        [langCode]: { ...(translations.en || defaultTranslations.en || {}) },
      });
    }
    setShowAddLang(false);
  };

  const removeLanguage = (langCode) => {
    if (langCode === 'en') return;
    setLanguages(languages.filter(l => l !== langCode));
    const newTranslations = { ...translations };
    delete newTranslations[langCode];
    setTranslations(newTranslations);
    if (selectedLang === langCode) setSelectedLang('en');
  };

  const updateTranslation = (key, value) => {
    setTranslations({
      ...translations,
      [selectedLang]: {
        ...translations[selectedLang],
        [key]: value,
      },
    });
    setEditingKey(null);
  };

  const addTranslationKey = () => {
    if (!newKey.trim()) return;
    const updated = { ...translations };
    languages.forEach(lang => {
      updated[lang] = {
        ...updated[lang],
        [newKey]: lang === 'en' ? newValue : newValue,
      };
    });
    setTranslations(updated);
    setNewKey('');
    setNewValue('');
    setShowAddKey(false);
  };

  const deleteTranslationKey = (key) => {
    const updated = { ...translations };
    languages.forEach(lang => {
      delete updated[lang][key];
    });
    setTranslations(updated);
  };

  const exportTranslations = () => {
    const dataStr = JSON.stringify(translations, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scanup_translations.json';
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const currentTranslations = translations[selectedLang] || translations.en || defaultTranslations.en || {};
  const englishTranslations = translations.en || defaultTranslations.en || {};
  
  // Get all keys and filter
  const allKeys = Object.keys(englishTranslations).sort();
  const filteredKeys = allKeys.filter(key => {
    const matchesSearch = searchQuery === '' || 
      key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (englishTranslations[key] || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === 'All') return matchesSearch;
    
    const categoryKeys = KEY_CATEGORIES[selectedCategory] || [];
    return matchesSearch && categoryKeys.includes(key);
  });

  const categories = ['All', ...Object.keys(KEY_CATEGORIES)];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Localization</h1>
          <p className="text-gray-500 mt-1">Manage app translations ({allKeys.length} keys)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportTranslations}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <Download size={18} />
            Export
          </button>
          <button
            onClick={saveTranslations}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Languages */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages ({languages.length})</h3>
        <div className="flex flex-wrap gap-2">
          {languages.map((langCode) => {
            const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || { code: langCode, name: langCode, flag: '🌐' };
            const translatedCount = Object.keys(currentTranslations).filter(k => currentTranslations[k]).length;
            const totalCount = Object.keys(englishTranslations).length;
            const percentage = totalCount > 0 ? Math.round((translatedCount / totalCount) * 100) : 0;
            
            return (
              <div
                key={langCode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${
                  selectedLang === langCode
                    ? 'bg-emerald-100 border-2 border-emerald-500'
                    : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
                }`}
                onClick={() => setSelectedLang(langCode)}
              >
                <span className="text-xl">{lang.flag}</span>
                <div>
                  <span className="font-medium">{lang.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>
                </div>
                {langCode !== 'en' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeLanguage(langCode); }}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={() => setShowAddLang(true)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition"
          >
            <Plus size={18} />
            Add Language
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="stat-card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search keys or values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Translations Editor */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Translations - {SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name || selectedLang}
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Showing {filteredKeys.length} of {allKeys.length} keys)
            </span>
          </h3>
          <button
            onClick={() => setShowAddKey(true)}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
          >
            <Plus size={18} />
            Add Key
          </button>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-200">
                <th className="table-header py-3 px-4 w-1/4 text-left">Key</th>
                <th className="table-header py-3 px-4 w-1/3 text-left">English (Reference)</th>
                <th className="table-header py-3 px-4 w-1/3 text-left">Translation</th>
                <th className="table-header py-3 px-4 w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredKeys.map((key) => (
                <tr key={key} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{key}</td>
                  <td className="py-3 px-4 text-gray-500 text-sm">{englishTranslations[key]}</td>
                  <td className="py-3 px-4">
                    {editingKey === key ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => updateTranslation(key, editValue)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-sm ${
                          !currentTranslations[key] ? 'text-red-400 italic' : ''
                        }`}
                        onClick={() => {
                          setEditingKey(key);
                          setEditValue(currentTranslations[key] || '');
                        }}
                      >
                        {currentTranslations[key] || 'Click to translate...'}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => deleteTranslationKey(key)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Language Modal */}
      {showAddLang && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Language</h3>
            <div className="space-y-2">
              {SUPPORTED_LANGUAGES.filter(l => !languages.includes(l.code)).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => addLanguage(lang.code)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition text-left"
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddLang(false)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Key Modal */}
      {showAddKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Translation Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g., button_submit"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">English Value</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g., Submit"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddKey(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={addTranslationKey}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                Add Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

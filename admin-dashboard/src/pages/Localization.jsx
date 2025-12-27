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
  Upload
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
];

const DEFAULT_TRANSLATIONS = {
  'app.name': 'ScanUp',
  'app.tagline': 'Scan documents like a pro',
  'nav.home': 'Home',
  'nav.scan': 'Scan',
  'nav.documents': 'Documents',
  'nav.profile': 'Profile',
  'scan.document': 'Document',
  'scan.book': 'Book',
  'scan.id_card': 'ID Card',
  'scan.receipt': 'Receipt',
  'button.capture': 'Capture',
  'button.save': 'Save',
  'button.cancel': 'Cancel',
  'button.share': 'Share',
  'button.export': 'Export',
  'button.delete': 'Delete',
  'auth.login': 'Sign In',
  'auth.register': 'Sign Up',
  'auth.logout': 'Logout',
  'auth.guest': 'Continue as Guest',
};

export default function Localization() {
  const { token } = useAuth();
  const [languages, setLanguages] = useState([]);
  const [translations, setTranslations] = useState({});
  const [selectedLang, setSelectedLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddLang, setShowAddLang] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAddKey, setShowAddKey] = useState(false);

  useEffect(() => {
    fetchLocalization();
  }, []);

  const fetchLocalization = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/localization`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLanguages(data.languages || ['en']);
        setTranslations(data.translations || { en: DEFAULT_TRANSLATIONS });
      } else {
        // Initialize with defaults
        setLanguages(['en']);
        setTranslations({ en: DEFAULT_TRANSLATIONS });
      }
    } catch (e) {
      console.error('Failed to fetch localization:', e);
      setLanguages(['en']);
      setTranslations({ en: DEFAULT_TRANSLATIONS });
    } finally {
      setLoading(false);
    }
  };

  const saveTranslations = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/localization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ languages, translations }),
      });

      if (res.ok) {
        alert('Translations saved successfully!');
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
        [langCode]: { ...translations.en },
      });
    }
    setShowAddLang(false);
  };

  const removeLanguage = (langCode) => {
    if (langCode === 'en') return; // Can't remove English
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
    // Add to all languages
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

  const currentTranslations = translations[selectedLang] || {};
  const englishTranslations = translations.en || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Localization</h1>
          <p className="text-gray-500 mt-1">Manage app translations</p>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages</h3>
        <div className="flex flex-wrap gap-2">
          {languages.map((langCode) => {
            const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || { code: langCode, name: langCode, flag: '🌐' };
            const isComplete = Object.keys(englishTranslations).every(key => currentTranslations[key]);
            
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
                <span className="font-medium">{lang.name}</span>
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

      {/* Translations Editor */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Translations - {SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.name || selectedLang}
          </h3>
          <button
            onClick={() => setShowAddKey(true)}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
          >
            <Plus size={18} />
            Add Key
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header py-3 px-4 w-1/3">Key</th>
                <th className="table-header py-3 px-4 w-1/3">English (Reference)</th>
                <th className="table-header py-3 px-4 w-1/3">Translation</th>
                <th className="table-header py-3 px-4 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(englishTranslations).sort().map((key) => (
                <tr key={key} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">{key}</td>
                  <td className="py-3 px-4 text-gray-500">{englishTranslations[key]}</td>
                  <td className="py-3 px-4">
                    {editingKey === key ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
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
                        className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${
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
                  <td className="py-3 px-4">
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
                  placeholder="e.g., button.submit"
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

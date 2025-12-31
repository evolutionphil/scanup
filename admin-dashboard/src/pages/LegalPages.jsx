import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../config';
import {
  FileText,
  Shield,
  HelpCircle,
  Save,
  Globe,
  ChevronDown,
  Check,
} from 'lucide-react';

const API_URL = `${API_BASE}/api`;

const LEGAL_PAGES = [
  { id: 'terms', name: 'Terms & Conditions', icon: FileText },
  { id: 'privacy', name: 'Privacy Policy', icon: Shield },
  { id: 'support', name: 'Help & Support', icon: HelpCircle },
];

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
];

export default function LegalPages() {
  const { token } = useAuth();
  const [selectedPage, setSelectedPage] = useState('terms');
  const [selectedLang, setSelectedLang] = useState('en');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [legalPages, setLegalPages] = useState({});

  useEffect(() => {
    fetchAllLegalPages();
  }, []);

  useEffect(() => {
    // Update content when page or language changes
    if (legalPages[selectedPage] && legalPages[selectedPage][selectedLang]) {
      setContent(legalPages[selectedPage][selectedLang].content || '');
    } else {
      setContent('');
    }
  }, [selectedPage, selectedLang, legalPages]);

  const fetchAllLegalPages = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/legal-pages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLegalPages(data);
      }
    } catch (e) {
      console.error('Failed to fetch legal pages:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveLegalPage = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/legal-pages/${selectedPage}/${selectedLang}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        // Update local state
        setLegalPages(prev => ({
          ...prev,
          [selectedPage]: {
            ...prev[selectedPage],
            [selectedLang]: { content, updated_at: new Date().toISOString() }
          }
        }));
        alert('Legal page saved successfully!');
      } else {
        throw new Error('Failed to save');
      }
    } catch (e) {
      console.error('Failed to save:', e);
      alert('Failed to save legal page');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const currentPage = LEGAL_PAGES.find(p => p.id === selectedPage);
  const PageIcon = currentPage?.icon || FileText;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Legal Pages</h1>
          <p className="text-gray-500 mt-1">Manage Terms, Privacy Policy, and Help pages</p>
        </div>
        <button
          onClick={saveLegalPage}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Page Selection Tabs */}
      <div className="stat-card">
        <div className="flex flex-wrap gap-2">
          {LEGAL_PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <button
                key={page.id}
                onClick={() => setSelectedPage(page.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  selectedPage === page.id
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                    : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
                }`}
              >
                <Icon size={18} />
                {page.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language Selector */}
      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-gray-500" />
            <span className="font-medium">Language:</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <span className="text-xl">{LANGUAGES.find(l => l.code === selectedLang)?.flag}</span>
              <span>{LANGUAGES.find(l => l.code === selectedLang)?.name}</span>
              <ChevronDown size={16} />
            </button>
            {showLangDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLang(lang.code);
                      setShowLangDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-left"
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span>{lang.name}</span>
                    {selectedLang === lang.code && (
                      <Check size={16} className="ml-auto text-emerald-600" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-4">
          <PageIcon size={20} className="text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {currentPage?.name} ({LANGUAGES.find(l => l.code === selectedLang)?.name})
          </h3>
        </div>
        
        <div className="mb-2 text-sm text-gray-500">
          Use Markdown formatting: # Heading, ## Subheading, **bold**, *italic*, - list item
        </div>
        
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Enter ${currentPage?.name} content in Markdown format...`}
          className="w-full h-[500px] px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
        />
        
        <div className="mt-4 text-sm text-gray-500">
          Last updated: {legalPages[selectedPage]?.[selectedLang]?.updated_at 
            ? new Date(legalPages[selectedPage][selectedLang].updated_at).toLocaleString()
            : 'Never'}
        </div>
      </div>

      {/* Preview */}
      <div className="stat-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
        <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px]">
          {content ? (
            <div 
              className="markdown-preview"
              dangerouslySetInnerHTML={{ 
                __html: content
                  .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                  .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                  .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                  .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                  .replace(/\*(.*)\*/gim, '<em>$1</em>')
                  .replace(/^\- (.*$)/gim, '<li>$1</li>')
                  .replace(/\n/gim, '<br>')
              }}
            />
          ) : (
            <p className="text-gray-400 italic">No content to preview</p>
          )}
        </div>
      </div>
    </div>
  );
}

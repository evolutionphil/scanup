import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API_BASE from '../config';
import {
  Search,
  FileText,
  Image,
  Calendar,
  User,
  Trash2,
  Eye,
  Download
} from 'lucide-react';

const API_URL = `${API_BASE}/api`;

export default function Documents() {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [search]);

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', '50');

      const res = await fetch(`${API_URL}/admin/documents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const res = await fetch(`${API_URL}/admin/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setDocuments(documents.filter(d => d.document_id !== docId));
      }
    } catch (e) {
      console.error('Failed to delete document:', e);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 mt-1">View all scanned documents</p>
      </div>

      {/* Search */}
      <div className="stat-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <div key={doc.document_id} className="stat-card hover:shadow-md transition group">
              {/* Thumbnail */}
              <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                {doc.thumbnail_url ? (
                  <img
                    src={doc.thumbnail_url}
                    alt={doc.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    onClick={() => { setSelectedDoc(doc); setShowPreview(true); }}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.document_id)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <h3 className="font-medium text-gray-900 truncate">{doc.name || 'Untitled'}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <Image size={14} />
                <span>{doc.page_count || 1} pages</span>
                <span>•</span>
                <span>{formatFileSize(doc.size)}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <User size={12} />
                <span className="truncate">{doc.user_email}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <Calendar size={12} />
                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {documents.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              No documents found
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedDoc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{selectedDoc.name}</h3>
              <button
                onClick={() => { setShowPreview(false); setSelectedDoc(null); }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[70vh]">
              {selectedDoc.pages?.map((page, idx) => (
                <img
                  key={idx}
                  src={page.image_url || `data:image/jpeg;base64,${page.image_base64}`}
                  alt={`Page ${idx + 1}`}
                  className="w-full mb-4 rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

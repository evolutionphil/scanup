import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const GUEST_DOCUMENTS_KEY = 'guest_documents';
const GUEST_FOLDERS_KEY = 'guest_folders';

export interface PageData {
  page_id: string;
  image_base64: string;
  original_image_base64?: string;  // Original image before filters (non-destructive editing)
  thumbnail_base64?: string;
  ocr_text?: string;
  filter_applied: string;
  rotation: number;
  order: number;
  created_at: string;
  adjustments?: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

export interface Document {
  document_id: string;
  user_id: string;
  name: string;
  folder_id?: string;
  tags: string[];
  pages: PageData[];
  document_type?: string;  // document, id_card, passport, book, whiteboard, business_card
  ocr_full_text?: string;
  is_password_protected: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  folder_id: string;
  user_id: string;
  name: string;
  color: string;
  parent_id?: string;
  is_protected?: boolean;
  password_hash?: string;
  created_at: string;
}

interface DocumentState {
  documents: Document[];
  folders: Folder[];
  currentDocument: Document | null;
  isLoading: boolean;
  
  // Document actions
  fetchDocuments: (token: string | null, params?: { folder_id?: string; search?: string; tag?: string }) => Promise<void>;
  fetchDocument: (token: string | null, documentId: string) => Promise<Document>;
  createDocument: (token: string | null, data: { name: string; folder_id?: string; tags?: string[]; pages: Partial<PageData>[]; document_type?: string }) => Promise<Document>;
  updateDocument: (token: string | null, documentId: string, data: Partial<Document>) => Promise<Document>;
  deleteDocument: (token: string | null, documentId: string) => Promise<void>;
  addPageToDocument: (token: string, documentId: string, page: Partial<PageData>) => Promise<Document>;
  setCurrentDocument: (doc: Document | null) => void;
  
  // Folder actions
  fetchFolders: (token: string) => Promise<void>;
  createFolder: (token: string, data: { name: string; color?: string }) => Promise<Folder>;
  updateFolder: (token: string, folderId: string, data: Partial<Folder>) => Promise<Folder>;
  deleteFolder: (token: string, folderId: string) => Promise<void>;
  
  // Image processing
  processImage: (token: string, imageBase64: string, operation: string, params: Record<string, any>) => Promise<string>;
  
  // Local storage helpers
  loadGuestDocuments: () => Promise<void>;
  saveGuestDocuments: () => Promise<void>;
}

// Helper to generate unique IDs
const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to create thumbnail (simple resize for local storage)
const createLocalThumbnail = (base64: string): string => {
  // For local storage, we'll just use a smaller version or the same image
  // In a real implementation, you'd resize the image
  return base64;
};

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  folders: [],
  currentDocument: null,
  isLoading: false,

  loadGuestDocuments: async () => {
    try {
      const stored = await AsyncStorage.getItem(GUEST_DOCUMENTS_KEY);
      if (stored) {
        const documents = JSON.parse(stored);
        set({ documents });
      }
    } catch (e) {
      console.error('Error loading guest documents:', e);
    }
  },

  saveGuestDocuments: async () => {
    try {
      const { documents } = get();
      // Only save local documents (those with 'local_' prefix)
      const localDocs = documents.filter(d => d.document_id.startsWith('local_'));
      await AsyncStorage.setItem(GUEST_DOCUMENTS_KEY, JSON.stringify(localDocs));
    } catch (e) {
      console.error('Error saving guest documents:', e);
    }
  },

  fetchDocuments: async (token, params = {}) => {
    set({ isLoading: true });
    try {
      // If no token (guest mode), load from local storage
      if (!token) {
        await get().loadGuestDocuments();
        set({ isLoading: false });
        return;
      }

      const queryParams = new URLSearchParams();
      if (params.folder_id) queryParams.append('folder_id', params.folder_id);
      if (params.search) queryParams.append('search', params.search);
      if (params.tag) queryParams.append('tag', params.tag);

      const response = await fetch(
        `${BACKEND_URL}/api/documents?${queryParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch documents');
      const documents = await response.json();
      set({ documents, isLoading: false });
    } catch (e) {
      console.error('Error fetching documents:', e);
      set({ isLoading: false });
      throw e;
    }
  },

  fetchDocument: async (token, documentId) => {
    // If no token or local document, find in local state
    if (!token || documentId.startsWith('local_')) {
      const { documents } = get();
      const document = documents.find(d => d.document_id === documentId);
      if (document) {
        set({ currentDocument: document });
        return document;
      }
      throw new Error('Document not found');
    }

    const response = await fetch(
      `${BACKEND_URL}/api/documents/${documentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error('Failed to fetch document');
    const document = await response.json();
    set({ currentDocument: document });
    return document;
  },

  createDocument: async (token, data) => {
    // If no token (guest mode), save locally
    if (!token) {
      const now = new Date().toISOString();
      const document: Document = {
        document_id: generateId(),
        user_id: 'guest',
        name: data.name,
        folder_id: data.folder_id,
        tags: data.tags || [],
        pages: data.pages.map((p, i) => ({
          page_id: generateId(),
          image_base64: p.image_base64 || '',
          thumbnail_base64: createLocalThumbnail(p.image_base64 || ''),
          ocr_text: p.ocr_text,
          filter_applied: p.filter_applied || 'original',
          rotation: p.rotation || 0,
          order: i,
          created_at: now,
        })),
        document_type: data.document_type,
        ocr_full_text: undefined,
        is_password_protected: false,
        created_at: now,
        updated_at: now,
      };
      
      set((state) => ({ documents: [document, ...state.documents] }));
      await get().saveGuestDocuments();
      return document;
    }

    const response = await fetch(`${BACKEND_URL}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to create document');
    const document = await response.json();
    set((state) => ({ documents: [document, ...state.documents] }));
    return document;
  },

  updateDocument: async (token, documentId, data) => {
    // If no token or local document, update locally
    if (!token || documentId.startsWith('local_')) {
      const { documents } = get();
      const existingDoc = documents.find(d => d.document_id === documentId);
      if (!existingDoc) throw new Error('Document not found');
      
      const updatedDoc: Document = {
        ...existingDoc,
        ...data,
        updated_at: new Date().toISOString(),
      };
      
      set((state) => ({
        documents: state.documents.map((d) =>
          d.document_id === documentId ? updatedDoc : d
        ),
        currentDocument: state.currentDocument?.document_id === documentId ? updatedDoc : state.currentDocument,
      }));
      await get().saveGuestDocuments();
      return updatedDoc;
    }

    const response = await fetch(`${BACKEND_URL}/api/documents/${documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to update document');
    const document = await response.json();
    set((state) => ({
      documents: state.documents.map((d) =>
        d.document_id === documentId ? document : d
      ),
      currentDocument: state.currentDocument?.document_id === documentId ? document : state.currentDocument,
    }));
    return document;
  },

  deleteDocument: async (token, documentId) => {
    // If no token or local document, delete locally
    if (!token || documentId.startsWith('local_')) {
      set((state) => ({
        documents: state.documents.filter((d) => d.document_id !== documentId),
      }));
      await get().saveGuestDocuments();
      return;
    }

    const response = await fetch(`${BACKEND_URL}/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to delete document');
    set((state) => ({
      documents: state.documents.filter((d) => d.document_id !== documentId),
    }));
  },

  addPageToDocument: async (token, documentId, page) => {
    const response = await fetch(
      `${BACKEND_URL}/api/documents/${documentId}/pages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(page),
      }
    );

    if (!response.ok) throw new Error('Failed to add page');
    const document = await response.json();
    set((state) => ({
      documents: state.documents.map((d) =>
        d.document_id === documentId ? document : d
      ),
      currentDocument: document,
    }));
    return document;
  },

  setCurrentDocument: (doc) => set({ currentDocument: doc }),

  fetchFolders: async (token) => {
    const response = await fetch(`${BACKEND_URL}/api/folders`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to fetch folders');
    const folders = await response.json();
    set({ folders });
  },

  createFolder: async (token, data) => {
    const response = await fetch(`${BACKEND_URL}/api/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to create folder');
    const folder = await response.json();
    set((state) => ({ folders: [...state.folders, folder] }));
    return folder;
  },

  updateFolder: async (token, folderId, data) => {
    const response = await fetch(`${BACKEND_URL}/api/folders/${folderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to update folder');
    const folder = await response.json();
    set((state) => ({
      folders: state.folders.map((f) =>
        f.folder_id === folderId ? folder : f
      ),
    }));
    return folder;
  },

  deleteFolder: async (token, folderId) => {
    const response = await fetch(`${BACKEND_URL}/api/folders/${folderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to delete folder');
    set((state) => ({
      folders: state.folders.filter((f) => f.folder_id !== folderId),
    }));
  },

  processImage: async (token, imageBase64, operation, params) => {
    const response = await fetch(`${BACKEND_URL}/api/images/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ image_base64: imageBase64, operation, params }),
    });

    if (!response.ok) throw new Error('Failed to process image');
    const result = await response.json();
    return result.processed_image_base64;
  },
}));

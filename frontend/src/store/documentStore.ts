import { create } from 'zustand';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  created_at: string;
}

interface DocumentState {
  documents: Document[];
  folders: Folder[];
  currentDocument: Document | null;
  isLoading: boolean;
  
  // Document actions
  fetchDocuments: (token: string, params?: { folder_id?: string; search?: string; tag?: string }) => Promise<void>;
  fetchDocument: (token: string, documentId: string) => Promise<Document>;
  createDocument: (token: string, data: { name: string; folder_id?: string; tags?: string[]; pages: Partial<PageData>[] }) => Promise<Document>;
  updateDocument: (token: string, documentId: string, data: Partial<Document>) => Promise<Document>;
  deleteDocument: (token: string, documentId: string) => Promise<void>;
  addPageToDocument: (token: string, documentId: string, page: Partial<PageData>) => Promise<Document>;
  setCurrentDocument: (doc: Document | null) => void;
  
  // Folder actions
  fetchFolders: (token: string) => Promise<void>;
  createFolder: (token: string, data: { name: string; color?: string }) => Promise<Folder>;
  deleteFolder: (token: string, folderId: string) => Promise<void>;
  
  // Image processing
  processImage: (token: string, imageBase64: string, operation: string, params: Record<string, any>) => Promise<string>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  folders: [],
  currentDocument: null,
  isLoading: false,

  fetchDocuments: async (token, params = {}) => {
    set({ isLoading: true });
    try {
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

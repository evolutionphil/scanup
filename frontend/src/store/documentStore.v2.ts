/**
 * DOCUMENT STORE V2 - OFFLINE-FIRST ARCHITECTURE
 * 
 * Key Principles:
 * 1. LOCAL-FIRST: All edits happen locally first, sync in background
 * 2. INSTANT UI: No loading spinners for local operations
 * 3. OPTIMISTIC UPDATES: UI updates immediately, rollback on failure
 * 4. FILE-BASED STORAGE: Images stored on filesystem, not in memory
 * 5. PER-DOCUMENT LOADING: No global loading state
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const DOCUMENTS_META_KEY = '@scanup_documents_meta_v2';
const IMAGE_DIR = `${FileSystem.documentDirectory}scanup_images/`;

// ============ TYPES ============

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export interface PageData {
  page_id: string;
  image_base64?: string;           // In-memory only, NOT persisted
  image_file_uri?: string;         // Local file path (persisted)
  image_url?: string;              // S3 URL (from server)
  original_image_base64?: string;  // In-memory only
  original_file_uri?: string;      // Original image file path
  thumbnail_url?: string;
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
  signatures?: any[];
  annotations?: any[];
}

export interface Document {
  document_id: string;
  user_id: string;
  name: string;
  folder_id?: string;
  tags: string[];
  pages: PageData[];
  document_type?: string;
  is_password_protected: boolean;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  // V2 fields
  is_local: boolean;        // true = created locally, false = from server
  last_synced_at?: string;  // When last synced with server
  dirty: boolean;           // Has unsaved changes
}

interface DocumentState {
  // State
  documents: Document[];
  currentDocument: Document | null;
  
  // Loading states - PER DOCUMENT
  loadingDocuments: Record<string, boolean>;
  savingDocuments: Record<string, boolean>;
  
  // Global states (minimal)
  isInitialized: boolean;
  isSyncing: boolean;
  
  // Actions
  init: () => Promise<void>;
  
  // Document CRUD - LOCAL-FIRST
  getDocument: (documentId: string) => Document | null;
  setCurrentDocument: (documentId: string) => Promise<void>;
  createDocumentLocal: (data: CreateDocumentData) => Promise<Document>;
  updateDocumentLocal: (documentId: string, updates: Partial<Document>) => Promise<Document>;
  updatePageLocal: (documentId: string, pageIndex: number, pageUpdates: Partial<PageData>) => Promise<Document>;
  deleteDocumentLocal: (documentId: string) => Promise<void>;
  
  // Image helpers
  saveImageToFile: (base64: string, documentId: string, pageIndex: number, suffix?: string) => Promise<string>;
  loadImageFromFile: (fileUri: string) => Promise<string | null>;
  
  // Sync with server (background)
  syncWithServer: (token: string) => Promise<void>;
  fetchDocumentsFromServer: (token: string) => Promise<void>;
  
  // State helpers
  isDocumentLoading: (documentId: string) => boolean;
  isDocumentSaving: (documentId: string) => boolean;
  setDocumentLoading: (documentId: string, loading: boolean) => void;
  setDocumentSaving: (documentId: string, saving: boolean) => void;
}

interface CreateDocumentData {
  name: string;
  folder_id?: string;
  tags?: string[];
  pages: Partial<PageData>[];
  document_type?: string;
}

// ============ HELPERS ============

const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const ensureImageDir = async () => {
  if (Platform.OS === 'web') return;
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
};

// ============ STORE ============

export const useDocumentStoreV2 = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  loadingDocuments: {},
  savingDocuments: {},
  isInitialized: false,
  isSyncing: false,

  // ============ INIT ============
  init: async () => {
    if (get().isInitialized) return;
    
    console.log('[DocStoreV2] Initializing...');
    
    try {
      // Load documents metadata from storage
      const stored = await AsyncStorage.getItem(DOCUMENTS_META_KEY);
      if (stored) {
        const documents = JSON.parse(stored);
        console.log(`[DocStoreV2] Loaded ${documents.length} documents from storage`);
        set({ documents, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch (e) {
      console.error('[DocStoreV2] Init error:', e);
      set({ isInitialized: true });
    }
  },

  // ============ DOCUMENT CRUD - LOCAL FIRST ============
  
  getDocument: (documentId) => {
    return get().documents.find(d => d.document_id === documentId) || null;
  },

  setCurrentDocument: async (documentId) => {
    const doc = get().getDocument(documentId);
    if (!doc) {
      console.error('[DocStoreV2] Document not found:', documentId);
      set({ currentDocument: null });
      return;
    }
    
    // Load images from files if needed
    if (Platform.OS !== 'web') {
      const pagesWithImages = await Promise.all(doc.pages.map(async (page) => {
        // Skip if already has base64
        if (page.image_base64 && page.image_base64.length > 100) {
          return page;
        }
        
        // Load from file
        if (page.image_file_uri) {
          const base64 = await get().loadImageFromFile(page.image_file_uri);
          if (base64) {
            return { ...page, image_base64: base64 };
          }
        }
        
        return page;
      }));
      
      const docWithImages = { ...doc, pages: pagesWithImages };
      set({ currentDocument: docWithImages });
    } else {
      set({ currentDocument: doc });
    }
  },

  createDocumentLocal: async (data) => {
    const now = new Date().toISOString();
    const documentId = generateId();
    
    console.log('[DocStoreV2] Creating local document:', documentId);
    
    // Process pages - save images to files
    const processedPages: PageData[] = await Promise.all(
      data.pages.map(async (page, idx) => {
        const pageId = generateId();
        let fileUri: string | undefined;
        
        // Save image to file if we have base64
        if (page.image_base64 && Platform.OS !== 'web') {
          fileUri = await get().saveImageToFile(page.image_base64, documentId, idx);
        }
        
        return {
          page_id: pageId,
          image_base64: page.image_base64, // Keep in memory for immediate display
          image_file_uri: fileUri,
          image_url: undefined,
          original_image_base64: page.image_base64,
          original_file_uri: fileUri,
          ocr_text: page.ocr_text,
          filter_applied: page.filter_applied || 'original',
          rotation: page.rotation || 0,
          order: idx,
          created_at: now,
        };
      })
    );
    
    const document: Document = {
      document_id: documentId,
      user_id: 'local',
      name: data.name,
      folder_id: data.folder_id,
      tags: data.tags || [],
      pages: processedPages,
      document_type: data.document_type || 'document',
      is_password_protected: false,
      sync_status: 'local',
      created_at: now,
      updated_at: now,
      is_local: true,
      dirty: true,
    };
    
    // Add to state immediately (INSTANT)
    set(state => ({
      documents: [document, ...state.documents],
      currentDocument: document,
    }));
    
    // Persist to storage (async, don't wait)
    get().persistDocuments();
    
    console.log('[DocStoreV2] ✅ Document created locally:', documentId);
    return document;
  },

  updateDocumentLocal: async (documentId, updates) => {
    console.log('[DocStoreV2] Updating document:', documentId);
    
    const existing = get().getDocument(documentId);
    if (!existing) {
      throw new Error('Document not found');
    }
    
    const updated: Document = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
      dirty: true,
    };
    
    // Update state immediately (INSTANT)
    set(state => ({
      documents: state.documents.map(d => 
        d.document_id === documentId ? updated : d
      ),
      currentDocument: state.currentDocument?.document_id === documentId 
        ? updated 
        : state.currentDocument,
    }));
    
    // Persist to storage (async)
    get().persistDocuments();
    
    return updated;
  },

  updatePageLocal: async (documentId, pageIndex, pageUpdates) => {
    console.log('[DocStoreV2] Updating page:', documentId, 'index:', pageIndex);
    
    const doc = get().getDocument(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }
    
    if (pageIndex < 0 || pageIndex >= doc.pages.length) {
      throw new Error('Invalid page index');
    }
    
    // If we have new image data, save to file
    let newFileUri = doc.pages[pageIndex].image_file_uri;
    if (pageUpdates.image_base64 && Platform.OS !== 'web') {
      const suffix = pageUpdates.filter_applied || 'edited';
      newFileUri = await get().saveImageToFile(
        pageUpdates.image_base64, 
        documentId, 
        pageIndex,
        suffix
      );
    }
    
    const updatedPage: PageData = {
      ...doc.pages[pageIndex],
      ...pageUpdates,
      image_file_uri: newFileUri,
    };
    
    const updatedPages = [...doc.pages];
    updatedPages[pageIndex] = updatedPage;
    
    return get().updateDocumentLocal(documentId, { pages: updatedPages });
  },

  deleteDocumentLocal: async (documentId) => {
    console.log('[DocStoreV2] Deleting document:', documentId);
    
    // Remove from state immediately (INSTANT)
    set(state => ({
      documents: state.documents.filter(d => d.document_id !== documentId),
      currentDocument: state.currentDocument?.document_id === documentId 
        ? null 
        : state.currentDocument,
    }));
    
    // Delete image files (async)
    if (Platform.OS !== 'web') {
      const doc = get().getDocument(documentId);
      if (doc) {
        for (const page of doc.pages) {
          if (page.image_file_uri) {
            try {
              await FileSystem.deleteAsync(page.image_file_uri, { idempotent: true });
            } catch (e) {
              console.error('[DocStoreV2] Error deleting image file:', e);
            }
          }
        }
      }
    }
    
    // Persist (async)
    get().persistDocuments();
  },

  // ============ IMAGE HELPERS ============
  
  saveImageToFile: async (base64, documentId, pageIndex, suffix = '') => {
    if (Platform.OS === 'web') return '';
    
    await ensureImageDir();
    
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const filename = `${documentId}_p${pageIndex}_${suffix}_${Date.now()}.jpg`;
    const fileUri = `${IMAGE_DIR}${filename}`;
    
    await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log('[DocStoreV2] ✅ Saved image to:', fileUri);
    return fileUri;
  },

  loadImageFromFile: async (fileUri) => {
    if (Platform.OS === 'web' || !fileUri) return null;
    
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) return null;
      
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return base64;
    } catch (e) {
      console.error('[DocStoreV2] Error loading image:', e);
      return null;
    }
  },

  // ============ PERSISTENCE ============
  
  persistDocuments: async () => {
    try {
      const { documents } = get();
      
      // Strip base64 data before saving (only keep file URIs)
      const metaDocs = documents.map(doc => ({
        ...doc,
        pages: doc.pages.map(page => ({
          ...page,
          image_base64: undefined,        // Don't persist
          original_image_base64: undefined, // Don't persist
          thumbnail_base64: undefined,    // Don't persist
        })),
      }));
      
      await AsyncStorage.setItem(DOCUMENTS_META_KEY, JSON.stringify(metaDocs));
      console.log('[DocStoreV2] ✅ Persisted', metaDocs.length, 'documents');
    } catch (e) {
      console.error('[DocStoreV2] Persist error:', e);
    }
  },

  // ============ SERVER SYNC (BACKGROUND) ============
  
  syncWithServer: async (token) => {
    if (!token || get().isSyncing) return;
    
    set({ isSyncing: true });
    console.log('[DocStoreV2] Starting server sync...');
    
    try {
      const { documents } = get();
      const dirtyDocs = documents.filter(d => d.dirty && d.is_local);
      
      for (const doc of dirtyDocs) {
        try {
          // Read images from files for upload
          const pagesWithImages = await Promise.all(
            doc.pages.map(async (page) => {
              let imageBase64 = page.image_base64;
              if (!imageBase64 && page.image_file_uri) {
                imageBase64 = await get().loadImageFromFile(page.image_file_uri);
              }
              return {
                image_base64: imageBase64,
                filter_applied: page.filter_applied,
                rotation: page.rotation,
                order: page.order,
                ocr_text: page.ocr_text,
              };
            })
          );
          
          // Upload to server
          const response = await fetch(`${BACKEND_URL}/api/documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: doc.name,
              folder_id: doc.folder_id,
              tags: doc.tags,
              pages: pagesWithImages,
              document_type: doc.document_type,
            }),
          });
          
          if (response.ok) {
            const serverDoc = await response.json();
            
            // Update local doc with server ID and URLs
            set(state => ({
              documents: state.documents.map(d =>
                d.document_id === doc.document_id
                  ? { ...serverDoc, is_local: false, dirty: false, sync_status: 'synced' as SyncStatus }
                  : d
              ),
            }));
            
            console.log('[DocStoreV2] ✅ Synced:', doc.document_id, '->', serverDoc.document_id);
          }
        } catch (e) {
          console.error('[DocStoreV2] Sync error for', doc.document_id, e);
        }
      }
    } finally {
      set({ isSyncing: false });
      get().persistDocuments();
    }
  },

  fetchDocumentsFromServer: async (token) => {
    if (!token) return;
    
    console.log('[DocStoreV2] Fetching documents from server...');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/documents`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const serverDocs = await response.json();
      
      // Merge with local docs (keep local ones that aren't synced)
      const { documents } = get();
      const localOnly = documents.filter(d => d.is_local && d.dirty);
      
      const merged = [
        ...localOnly,
        ...serverDocs.map((d: any) => ({
          ...d,
          is_local: false,
          dirty: false,
          sync_status: 'synced' as SyncStatus,
        })),
      ];
      
      set({ documents: merged });
      get().persistDocuments();
      
      console.log('[DocStoreV2] ✅ Fetched', serverDocs.length, 'documents from server');
    } catch (e) {
      console.error('[DocStoreV2] Fetch error:', e);
    }
  },

  // ============ STATE HELPERS ============
  
  isDocumentLoading: (documentId) => {
    return get().loadingDocuments[documentId] || false;
  },

  isDocumentSaving: (documentId) => {
    return get().savingDocuments[documentId] || false;
  },

  setDocumentLoading: (documentId, loading) => {
    set(state => ({
      loadingDocuments: {
        ...state.loadingDocuments,
        [documentId]: loading,
      },
    }));
  },

  setDocumentSaving: (documentId, saving) => {
    set(state => ({
      savingDocuments: {
        ...state.savingDocuments,
        [documentId]: saving,
      },
    }));
  },
}));

// Export helper to get image source
export const getImageSource = (page: PageData, useThumbnail = false) => {
  if (useThumbnail && page.thumbnail_url) {
    return { uri: page.thumbnail_url };
  }
  
  // Priority: base64 (in-memory) > file URI > S3 URL
  if (page.image_base64) {
    if (page.image_base64.startsWith('data:')) return { uri: page.image_base64 };
    return { uri: `data:image/jpeg;base64,${page.image_base64}` };
  }
  if (page.image_file_uri) return { uri: page.image_file_uri };
  if (page.image_url) return { uri: page.image_url };
  
  return { uri: '' };
};

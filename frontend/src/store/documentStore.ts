import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const GUEST_DOCUMENTS_KEY = 'guest_documents';
const GUEST_FOLDERS_KEY = 'guest_folders';
const PENDING_SYNC_KEY = 'pending_sync_documents';
const LOCAL_DOCUMENTS_KEY = 'local_documents_cache';

// Sync status for documents
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'failed';

export interface PageData {
  page_id: string;
  image_base64?: string;           // Base64 image (local/MongoDB storage)
  image_url?: string;              // S3 URL (cloud storage)
  original_image_base64?: string;  // Original image before filters
  thumbnail_base64?: string;       // Base64 thumbnail
  thumbnail_url?: string;          // S3 thumbnail URL
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

// Helper to get image source (handles both base64 and S3 URLs)
export const getImageSource = (page: PageData, useThumbnail: boolean = false) => {
  if (useThumbnail) {
    if (page.thumbnail_url) return { uri: page.thumbnail_url };
    if (page.thumbnail_base64) return { uri: `data:image/jpeg;base64,${page.thumbnail_base64}` };
  }
  if (page.image_url) return { uri: page.image_url };
  if (page.image_base64) return { uri: `data:image/jpeg;base64,${page.image_base64}` };
  return { uri: '' };
};

export interface Document {
  document_id: string;
  user_id: string;
  name: string;
  folder_id?: string;
  tags: string[];
  pages: PageData[];
  document_type?: string;
  ocr_full_text?: string;
  is_password_protected: boolean;
  storage_type?: string;  // 's3', 'mongodb', or 'local'
  sync_status?: SyncStatus;  // Sync status for UI
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

// Pending sync item
interface PendingSyncItem {
  document_id: string;
  action: 'create' | 'update' | 'delete';
  data?: any;
  retries: number;
  created_at: string;
}

interface DocumentState {
  documents: Document[];
  folders: Folder[];
  currentDocument: Document | null;
  isLoading: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  
  // Document actions
  fetchDocuments: (token: string | null, params?: { folder_id?: string; search?: string; tag?: string }) => Promise<void>;
  fetchDocument: (token: string | null, documentId: string) => Promise<Document>;
  createDocument: (token: string | null, data: { name: string; folder_id?: string; tags?: string[]; pages: Partial<PageData>[]; document_type?: string }) => Promise<Document>;
  createDocumentLocalFirst: (token: string | null, data: { name: string; folder_id?: string; tags?: string[]; pages: Partial<PageData>[]; document_type?: string }) => Promise<Document>;
  updateDocument: (token: string | null, documentId: string, data: Partial<Document>) => Promise<Document>;
  deleteDocument: (token: string | null, documentId: string) => Promise<void>;
  addPageToDocument: (token: string, documentId: string, page: Partial<PageData>) => Promise<Document>;
  setCurrentDocument: (doc: Document | null) => void;
  
  // Folder actions
  fetchFolders: (token: string | null) => Promise<void>;
  createFolder: (token: string | null, data: { name: string; color?: string }) => Promise<Folder>;
  updateFolder: (token: string | null, folderId: string, data: Partial<Folder>) => Promise<Folder>;
  deleteFolder: (token: string | null, folderId: string) => Promise<void>;
  
  // Image processing
  processImage: (token: string | null, imageBase64: string, operation: string, params: Record<string, any>) => Promise<string>;
  
  // Local storage & sync
  loadGuestDocuments: () => Promise<void>;
  saveGuestDocuments: () => Promise<void>;
  saveLocalCache: () => Promise<void>;
  loadLocalCache: () => Promise<void>;
  syncPendingDocuments: (token: string) => Promise<void>;
  addToPendingSync: (item: PendingSyncItem) => Promise<void>;
  getPendingSyncItems: () => Promise<PendingSyncItem[]>;
  clearPendingSyncItem: (documentId: string) => Promise<void>;
  updateDocumentSyncStatus: (documentId: string, status: SyncStatus) => void;
}

// Helper to generate unique IDs
const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to create thumbnail
const createLocalThumbnail = (base64: string): string => {
  // For local storage, just use the same image (thumbnail creation happens on backend)
  return base64.substring(0, 5000); // Truncated for storage efficiency
};

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  folders: [],
  currentDocument: null,
  isLoading: false,
  isSyncing: false,
  pendingSyncCount: 0,

  loadGuestDocuments: async () => {
    try {
      const storedDocs = await AsyncStorage.getItem(GUEST_DOCUMENTS_KEY);
      const storedFolders = await AsyncStorage.getItem(GUEST_FOLDERS_KEY);
      
      const documents = storedDocs ? JSON.parse(storedDocs) : [];
      const folders = storedFolders ? JSON.parse(storedFolders) : [];
      
      set({ documents, folders });
    } catch (e) {
      console.error('Error loading guest data:', e);
    }
  },

  saveGuestDocuments: async () => {
    try {
      const { documents, folders } = get();
      // Only save local documents and folders (those with 'local_' prefix)
      const localDocs = documents.filter(d => d.document_id.startsWith('local_'));
      const localFolders = folders.filter(f => f.folder_id.startsWith('local_'));
      
      await AsyncStorage.setItem(GUEST_DOCUMENTS_KEY, JSON.stringify(localDocs));
      await AsyncStorage.setItem(GUEST_FOLDERS_KEY, JSON.stringify(localFolders));
    } catch (e) {
      console.error('Error saving guest data:', e);
    }
  },

  // Save all documents to local cache (for offline access)
  saveLocalCache: async () => {
    try {
      const { documents } = get();
      await AsyncStorage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify(documents));
    } catch (e) {
      console.error('Error saving local cache:', e);
    }
  },

  // Load documents from local cache
  loadLocalCache: async () => {
    try {
      const cached = await AsyncStorage.getItem(LOCAL_DOCUMENTS_KEY);
      if (cached) {
        const documents = JSON.parse(cached);
        set({ documents });
      }
    } catch (e) {
      console.error('Error loading local cache:', e);
    }
  },

  // Add item to pending sync queue
  addToPendingSync: async (item: PendingSyncItem) => {
    try {
      const existing = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      const items: PendingSyncItem[] = existing ? JSON.parse(existing) : [];
      
      // Remove any existing item for same document
      const filtered = items.filter(i => i.document_id !== item.document_id);
      filtered.push(item);
      
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
      set({ pendingSyncCount: filtered.length });
    } catch (e) {
      console.error('Error adding to pending sync:', e);
    }
  },

  // Get pending sync items
  getPendingSyncItems: async () => {
    try {
      const existing = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      return existing ? JSON.parse(existing) : [];
    } catch (e) {
      console.error('Error getting pending sync items:', e);
      return [];
    }
  },

  // Clear a pending sync item after successful sync
  clearPendingSyncItem: async (documentId: string) => {
    try {
      const existing = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      const items: PendingSyncItem[] = existing ? JSON.parse(existing) : [];
      const filtered = items.filter(i => i.document_id !== documentId);
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
      set({ pendingSyncCount: filtered.length });
    } catch (e) {
      console.error('Error clearing pending sync item:', e);
    }
  },

  // Update document sync status in state
  updateDocumentSyncStatus: (documentId: string, status: SyncStatus) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.document_id === documentId ? { ...d, sync_status: status } : d
      ),
      currentDocument: state.currentDocument?.document_id === documentId 
        ? { ...state.currentDocument, sync_status: status } 
        : state.currentDocument,
    }));
  },

  // Sync pending documents to server
  syncPendingDocuments: async (token: string) => {
    const { isSyncing, getPendingSyncItems, clearPendingSyncItem, updateDocumentSyncStatus } = get();
    
    if (isSyncing) return;
    
    // Check network connectivity
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('No network, skipping sync');
      return;
    }
    
    set({ isSyncing: true });
    
    try {
      const pendingItems = await getPendingSyncItems();
      console.log(`Syncing ${pendingItems.length} pending items...`);
      
      for (const item of pendingItems) {
        if (item.retries >= 3) {
          console.log(`Skipping ${item.document_id} after 3 failed retries`);
          updateDocumentSyncStatus(item.document_id, 'failed');
          continue;
        }
        
        updateDocumentSyncStatus(item.document_id, 'syncing');
        
        try {
          if (item.action === 'create' && item.data) {
            // Upload to server
            const response = await fetch(`${BACKEND_URL}/api/documents`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(item.data),
            });
            
            if (response.ok) {
              const serverDoc = await response.json();
              
              // Update local document with server ID and S3 URLs
              set((state) => ({
                documents: state.documents.map((d) =>
                  d.document_id === item.document_id ? { ...serverDoc, sync_status: 'synced' as SyncStatus } : d
                ),
              }));
              
              await clearPendingSyncItem(item.document_id);
              console.log(`✅ Synced: ${item.document_id} → ${serverDoc.document_id}`);
            } else {
              throw new Error('Server returned error');
            }
          }
        } catch (e) {
          console.error(`Failed to sync ${item.document_id}:`, e);
          // Increment retry count
          item.retries++;
          await get().addToPendingSync(item);
          updateDocumentSyncStatus(item.document_id, 'failed');
        }
      }
    } finally {
      set({ isSyncing: false });
    }
  },

  // LOCAL-FIRST document creation
  createDocumentLocalFirst: async (token, data) => {
    const now = new Date().toISOString();
    const localId = generateId();
    
    // Create local document immediately
    const localDocument: Document = {
      document_id: localId,
      user_id: token ? 'pending' : 'guest',
      name: data.name,
      folder_id: data.folder_id,
      tags: data.tags || [],
      pages: data.pages.map((p, i) => ({
        page_id: generateId(),
        image_base64: p.image_base64 || '',
        thumbnail_base64: p.image_base64 ? createLocalThumbnail(p.image_base64) : '',
        ocr_text: p.ocr_text,
        filter_applied: p.filter_applied || 'original',
        rotation: p.rotation || 0,
        order: i,
        created_at: now,
      })),
      document_type: data.document_type,
      ocr_full_text: undefined,
      is_password_protected: false,
      storage_type: 'local',
      sync_status: token ? 'local' : 'synced', // Guests don't need sync
      created_at: now,
      updated_at: now,
    };
    
    // Add to state immediately (instant feedback!)
    set((state) => ({ documents: [localDocument, ...state.documents] }));
    
    // Save to local storage
    await get().saveGuestDocuments();
    await get().saveLocalCache();
    
    // If logged in, queue for background sync
    if (token) {
      await get().addToPendingSync({
        document_id: localId,
        action: 'create',
        data: {
          name: data.name,
          folder_id: data.folder_id,
          tags: data.tags || [],
          pages: data.pages,
          document_type: data.document_type,
        },
        retries: 0,
        created_at: now,
      });
      
      // Trigger background sync
      setTimeout(() => {
        get().syncPendingDocuments(token);
      }, 1000);
    }
    
    return localDocument;
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
    // If no token (guest mode), load from local storage
    if (!token) {
      await get().loadGuestDocuments();
      return;
    }

    const response = await fetch(`${BACKEND_URL}/api/folders`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Failed to fetch folders');
    const folders = await response.json();
    set({ folders });
  },

  createFolder: async (token, data) => {
    // If no token (guest mode), create locally
    if (!token) {
      const now = new Date().toISOString();
      const folder: Folder = {
        folder_id: generateId(),
        user_id: 'guest',
        name: data.name,
        color: data.color || '#3B82F6',
        created_at: now,
      };
      
      set((state) => ({ folders: [...state.folders, folder] }));
      await get().saveGuestDocuments();
      return folder;
    }

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
    // If no token or local folder, update locally
    if (!token || folderId.startsWith('local_')) {
      const { folders } = get();
      const existingFolder = folders.find(f => f.folder_id === folderId);
      if (!existingFolder) throw new Error('Folder not found');
      
      const updatedFolder: Folder = {
        ...existingFolder,
        ...data,
      };
      
      set((state) => ({
        folders: state.folders.map((f) =>
          f.folder_id === folderId ? updatedFolder : f
        ),
      }));
      await get().saveGuestDocuments();
      return updatedFolder;
    }

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
    // If no token or local folder, delete locally
    if (!token || folderId.startsWith('local_')) {
      set((state) => ({
        folders: state.folders.filter((f) => f.folder_id !== folderId),
      }));
      await get().saveGuestDocuments();
      return;
    }

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
    // Use public endpoint if no token (guest mode)
    const endpoint = token 
      ? `${BACKEND_URL}/api/images/process`
      : `${BACKEND_URL}/api/images/process-public`;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image_base64: imageBase64, operation, params }),
    });

    if (!response.ok) throw new Error('Failed to process image');
    const result = await response.json();
    return result.processed_image_base64;
  },
}));

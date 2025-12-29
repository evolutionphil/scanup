import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
// Use legacy API for expo-file-system (SDK 54+ deprecated the old methods)
import * as FileSystem from 'expo-file-system/legacy';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const GUEST_DOCUMENTS_KEY = 'guest_documents_meta'; // Only stores metadata now
const GUEST_FOLDERS_KEY = 'guest_folders';
const PENDING_SYNC_KEY = 'pending_sync_documents';
const LOCAL_DOCUMENTS_KEY = 'local_documents_meta'; // Only stores metadata now

// Image storage directory
const IMAGE_DIR = `${FileSystem.documentDirectory}scanup_images/`;

// Clear ALL corrupted AsyncStorage data (nuclear option for SQLITE_FULL)
const clearCorruptedAsyncStorage = async (): Promise<boolean> => {
  try {
    console.log('[Storage] 🧹 Clearing all corrupted AsyncStorage data...');
    const keys = await AsyncStorage.getAllKeys();
    const documentKeys = keys.filter(k => 
      k.includes('document') || 
      k.includes('local_') || 
      k.includes('guest') ||
      k.includes('pending_sync') ||
      k.includes('catalystLocalStorage')
    );
    
    for (const key of documentKeys) {
      try {
        await AsyncStorage.removeItem(key);
        console.log(`[Storage] Removed key: ${key}`);
      } catch (e) {
        console.error(`[Storage] Failed to remove ${key}:`, e);
      }
    }
    
    console.log('[Storage] ✅ Cleared corrupted data');
    return true;
  } catch (e) {
    console.error('[Storage] Failed to clear corrupted data:', e);
    return false;
  }
};

// Ensure image directory exists
const ensureImageDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
};

// Save image to file system, return file URI
const saveImageToFile = async (base64: string, docId: string, pageNum: number): Promise<string> => {
  await ensureImageDir();
  const filename = `${docId}_p${pageNum}_${Date.now()}.jpg`;
  const fileUri = `${IMAGE_DIR}${filename}`;
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  await FileSystem.writeAsStringAsync(fileUri, cleanBase64, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
};

// Load image from file system as base64
const loadImageFromFile = async (fileUri: string): Promise<string | null> => {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) return null;
    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:image/jpeg;base64,${base64}`;
  } catch (e) {
    console.error('Error loading image from file:', e);
    return null;
  }
};

// Delete image file
const deleteImageFile = async (fileUri: string) => {
  try {
    if (fileUri.startsWith('file://') || fileUri.startsWith(IMAGE_DIR)) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (e) {
    console.error('Error deleting image file:', e);
  }
};

// Sync status for documents
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'failed';

export interface PageData {
  page_id: string;
  image_base64?: string;           // Base64 image (for display/upload)
  image_file_uri?: string;         // Local file path (for file system storage)
  image_url?: string;              // S3 URL (cloud storage)
  original_image_base64?: string;  // Original image before filters
  original_file_uri?: string;      // Original image file path
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

// Helper to get image source (handles file URIs, base64, and S3 URLs)
export const getImageSource = (page: PageData, useThumbnail: boolean = false) => {
  if (useThumbnail) {
    if (page.thumbnail_url) return { uri: page.thumbnail_url };
    if (page.thumbnail_base64) return { uri: `data:image/jpeg;base64,${page.thumbnail_base64}` };
  }
  // Priority: S3 URL > File URI > Base64
  if (page.image_url) return { uri: page.image_url };
  if (page.image_file_uri) return { uri: page.image_file_uri };
  if (page.image_base64) {
    // Handle both raw base64 and data URI
    if (page.image_base64.startsWith('data:')) return { uri: page.image_base64 };
    return { uri: `data:image/jpeg;base64,${page.image_base64}` };
  }
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
  setCurrentDocument: (doc: Document | null) => Promise<void>;
  
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
  migrateGuestDocumentsToAccount: (token: string, userId: string) => Promise<number>;
}

// Helper to generate unique IDs
const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to create thumbnail
const createLocalThumbnail = (base64: string): string => {
  // For local storage, use the full image as thumbnail since we can't resize on frontend
  // The image is already compressed from the camera, so this should be fine
  return base64;
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
      // First, check if AsyncStorage has corrupted/oversized data and clean it
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('[loadGuestDocuments] AsyncStorage keys:', allKeys.length);
        
        // Check size of each document-related key
        for (const key of allKeys) {
          if (key.includes('document') || key.includes('local_')) {
            const value = await AsyncStorage.getItem(key);
            if (value && value.length > 100000) { // More than 100KB is suspicious
              console.warn(`[loadGuestDocuments] Found oversized key "${key}" (${(value.length / 1024).toFixed(1)}KB) - likely contains base64, clearing...`);
              await AsyncStorage.removeItem(key);
            }
          }
        }
      } catch (cleanupError) {
        console.error('[loadGuestDocuments] Error during cleanup check:', cleanupError);
      }
      
      const storedDocs = await AsyncStorage.getItem(GUEST_DOCUMENTS_KEY);
      const storedFolders = await AsyncStorage.getItem(GUEST_FOLDERS_KEY);
      
      const metaDocs = storedDocs ? JSON.parse(storedDocs) : [];
      const folders = storedFolders ? JSON.parse(storedFolders) : [];
      
      console.log(`[loadGuestDocuments] Loaded ${metaDocs.length} docs, ${folders.length} folders`);
      
      // Documents from meta storage already have file URIs pointing to saved images
      set({ documents: metaDocs, folders });
    } catch (e: any) {
      console.error('Error loading guest data:', e);
      // If loading fails due to corruption, clear everything and start fresh
      if (e?.message?.includes('SQLITE') || e?.message?.includes('parse')) {
        console.warn('[loadGuestDocuments] Storage corrupted, clearing all document data...');
        try {
          await AsyncStorage.removeItem(GUEST_DOCUMENTS_KEY);
          await AsyncStorage.removeItem(GUEST_FOLDERS_KEY);
          await AsyncStorage.removeItem(LOCAL_DOCUMENTS_KEY);
          await AsyncStorage.removeItem(PENDING_SYNC_KEY);
          set({ documents: [], folders: [] });
        } catch (clearError) {
          console.error('[loadGuestDocuments] Failed to clear corrupted data:', clearError);
        }
      }
    }
  },

  // Save documents: images to file system, metadata to AsyncStorage
  saveGuestDocuments: async () => {
    try {
      const { documents, folders } = get();
      const localDocs = documents.filter(d => d.document_id.startsWith('local_'));
      const localFolders = folders.filter(f => f.folder_id.startsWith('local_'));
      
      // Process each document - save images to files, keep metadata light
      const metaDocs = await Promise.all(localDocs.map(async (doc) => {
        const processedPages = await Promise.all(doc.pages.map(async (page, idx) => {
          let fileUri = page.image_file_uri;
          let origFileUri = page.original_file_uri;
          
          // If we have base64 but no file URI, save to file
          if (page.image_base64 && !page.image_file_uri) {
            try {
              fileUri = await saveImageToFile(page.image_base64, doc.document_id, idx);
              console.log(`[saveGuestDocuments] Saved image to: ${fileUri}`);
            } catch (e) {
              console.error('Error saving image to file:', e);
            }
          }
          
          // Save original image to file too
          if (page.original_image_base64 && !page.original_file_uri) {
            try {
              origFileUri = await saveImageToFile(page.original_image_base64, doc.document_id + '_orig', idx);
            } catch (e) {
              console.error('Error saving original image to file:', e);
            }
          }
          
          // Return ONLY metadata fields - NO base64 data!
          return {
            page_id: page.page_id,
            image_file_uri: fileUri,
            image_url: page.image_url,
            original_file_uri: origFileUri,
            thumbnail_url: page.thumbnail_url,
            ocr_text: page.ocr_text,
            filter_applied: page.filter_applied,
            rotation: page.rotation,
            order: page.order,
            created_at: page.created_at,
            adjustments: page.adjustments,
            // Explicitly NOT including: image_base64, original_image_base64, thumbnail_base64
          };
        }));
        
        return { ...doc, pages: processedPages };
      }));
      
      const jsonStr = JSON.stringify(metaDocs);
      console.log(`[saveGuestDocuments] Saving ${metaDocs.length} docs, size: ${(jsonStr.length / 1024).toFixed(1)}KB`);
      
      // Save only metadata (with file URIs) to AsyncStorage - much smaller!
      await AsyncStorage.setItem(GUEST_DOCUMENTS_KEY, jsonStr);
      await AsyncStorage.setItem(GUEST_FOLDERS_KEY, JSON.stringify(localFolders));
      
      // ALSO update the in-memory state with file URIs so subsequent operations work
      // But keep the base64 in memory for immediate display
      const updatedDocs = documents.map(doc => {
        if (!doc.document_id.startsWith('local_')) return doc;
        const metaDoc = metaDocs.find(m => m.document_id === doc.document_id);
        if (!metaDoc) return doc;
        return {
          ...doc,
          pages: doc.pages.map((page, idx) => ({
            ...page,
            image_file_uri: metaDoc.pages[idx]?.image_file_uri || page.image_file_uri,
            original_file_uri: metaDoc.pages[idx]?.original_file_uri || page.original_file_uri,
          }))
        };
      });
      set({ documents: updatedDocs });
      
    } catch (e: any) {
      console.error('Error saving guest data:', e);
      if (e?.message?.includes('SQLITE_FULL')) {
        console.warn('[saveGuestDocuments] Storage full! This should not happen if base64 is properly stripped.');
      }
    }
  },

  // Save all documents to local cache (for offline access)
  // CRITICAL: Never save base64 data to AsyncStorage - only metadata with file URIs
  saveLocalCache: async () => {
    try {
      const { documents } = get();
      
      // Process each document - save images to files if needed, strip all base64
      const metaDocs = await Promise.all(documents.slice(0, 100).map(async (doc) => {
        const processedPages = await Promise.all(doc.pages.map(async (page, idx) => {
          let fileUri = page.image_file_uri;
          let origFileUri = page.original_file_uri;
          
          // If we have base64 but no file URI, save to file first
          if (page.image_base64 && !page.image_file_uri) {
            try {
              fileUri = await saveImageToFile(page.image_base64, doc.document_id, idx);
              console.log(`[saveLocalCache] Saved image to file: ${fileUri}`);
            } catch (e) {
              console.error('[saveLocalCache] Error saving image to file:', e);
            }
          }
          
          // Save original to file if needed
          if (page.original_image_base64 && !page.original_file_uri) {
            try {
              origFileUri = await saveImageToFile(page.original_image_base64, doc.document_id + '_orig', idx);
            } catch (e) {
              console.error('[saveLocalCache] Error saving original to file:', e);
            }
          }
          
          // Return ONLY metadata - NO base64 data!
          return {
            page_id: page.page_id,
            image_file_uri: fileUri,
            image_url: page.image_url,
            original_file_uri: origFileUri,
            thumbnail_url: page.thumbnail_url,
            ocr_text: page.ocr_text,
            filter_applied: page.filter_applied,
            rotation: page.rotation,
            order: page.order,
            created_at: page.created_at,
            adjustments: page.adjustments,
            // Explicitly exclude: image_base64, original_image_base64, thumbnail_base64
          };
        }));
        
        return { ...doc, pages: processedPages };
      }));
      
      const jsonStr = JSON.stringify(metaDocs);
      console.log(`[saveLocalCache] Saving ${metaDocs.length} docs, size: ${(jsonStr.length / 1024).toFixed(1)}KB`);
      
      await AsyncStorage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify(metaDocs));
    } catch (e: any) {
      console.error('Error saving local cache:', e);
      // If storage is full, clear old corrupted data and retry ONCE
      if (e?.message?.includes('SQLITE_FULL') || e?.message?.includes('disk is full')) {
        console.warn('[saveLocalCache] Storage full! Clearing corrupted data and retrying...');
        const cleared = await clearCorruptedAsyncStorage();
        if (cleared) {
          try {
            // Retry save after clearing
            const { documents } = get();
            const cleanDocs = documents.map(doc => ({
              ...doc,
              pages: doc.pages.map(p => ({
                page_id: p.page_id,
                image_file_uri: p.image_file_uri,
                image_url: p.image_url,
                original_file_uri: p.original_file_uri,
                filter_applied: p.filter_applied,
                rotation: p.rotation,
                order: p.order,
              }))
            }));
            await AsyncStorage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify(cleanDocs));
            console.log('[saveLocalCache] ✅ Retry successful after clearing corrupted data');
          } catch (retryError) {
            console.error('[saveLocalCache] Retry failed:', retryError);
          }
        }
      }
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
  // CRITICAL: Never store base64 data here - only file URIs for images
  addToPendingSync: async (item: PendingSyncItem) => {
    try {
      // Strip any base64 data from the item before saving
      let cleanedItem = { ...item };
      if (cleanedItem.data && cleanedItem.data.pages) {
        cleanedItem.data = {
          ...cleanedItem.data,
          pages: cleanedItem.data.pages.map((page: any) => ({
            page_id: page.page_id,
            image_file_uri: page.image_file_uri,
            original_file_uri: page.original_file_uri,
            filter_applied: page.filter_applied,
            rotation: page.rotation,
            order: page.order,
            ocr_text: page.ocr_text,
            // Explicitly exclude base64 data
          }))
        };
      }
      
      const existing = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      const items: PendingSyncItem[] = existing ? JSON.parse(existing) : [];
      
      // Remove any existing item for same document
      const filtered = items.filter(i => i.document_id !== item.document_id);
      filtered.push(cleanedItem);
      
      const jsonStr = JSON.stringify(filtered);
      console.log(`[addToPendingSync] Saving ${filtered.length} items, size: ${(jsonStr.length / 1024).toFixed(1)}KB`);
      
      await AsyncStorage.setItem(PENDING_SYNC_KEY, jsonStr);
      set({ pendingSyncCount: filtered.length });
    } catch (e: any) {
      console.error('Error adding to pending sync:', e);
      // If storage is full, just skip - don't crash
      if (e?.message?.includes('SQLITE_FULL')) {
        console.warn('[addToPendingSync] Storage full - sync item not saved');
      }
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
    const { isSyncing, getPendingSyncItems, clearPendingSyncItem, updateDocumentSyncStatus, documents } = get();
    
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
            // Find the local document to get file URIs
            const localDoc = documents.find(d => d.document_id === item.document_id);
            
            // Read images from files for upload
            const pagesWithImages = await Promise.all((item.data.pages || []).map(async (page: any, idx: number) => {
              let imageBase64 = page.image_base64;
              
              // If no base64, try to read from file
              if (!imageBase64 && page.image_file_uri) {
                imageBase64 = await loadImageFromFile(page.image_file_uri);
              }
              // Also try from local document
              if (!imageBase64 && localDoc?.pages[idx]?.image_file_uri) {
                imageBase64 = await loadImageFromFile(localDoc.pages[idx].image_file_uri);
              }
              
              return {
                ...page,
                image_base64: imageBase64,
              };
            }));
            
            // Upload to server
            const response = await fetch(`${BACKEND_URL}/api/documents`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                ...item.data,
                pages: pagesWithImages,
              }),
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

      // First, load from local cache for instant display
      const cached = await AsyncStorage.getItem(LOCAL_DOCUMENTS_KEY);
      if (cached) {
        const cachedDocs = JSON.parse(cached);
        set({ documents: cachedDocs });
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
      
      // Save to local cache for next time (this will strip base64 and save images to files)
      await get().saveLocalCache();
    } catch (e) {
      console.error('Error fetching documents:', e);
      set({ isLoading: false });
      // Don't throw if we have cached data
      const { documents } = get();
      if (documents.length === 0) {
        throw e;
      }
    }
  },

  fetchDocument: async (token, documentId) => {
    // First, try to find in local state/cache
    const { documents } = get();
    const cachedDocument = documents.find(d => d.document_id === documentId);
    
    // If no token, use cached/local document only
    if (!token) {
      if (cachedDocument) {
        set({ currentDocument: cachedDocument });
        return cachedDocument;
      }
      // Try loading from local storage
      const storedDocs = await AsyncStorage.getItem(GUEST_DOCUMENTS_KEY);
      if (storedDocs) {
        const guestDocs = JSON.parse(storedDocs);
        const localDoc = guestDocs.find((d: Document) => d.document_id === documentId);
        if (localDoc) {
          set({ currentDocument: localDoc });
          return localDoc;
        }
      }
      throw new Error('Document not found');
    }
    
    // For local documents, just use the cached version
    if (documentId.startsWith('local_')) {
      if (cachedDocument) {
        set({ currentDocument: cachedDocument });
        return cachedDocument;
      }
      throw new Error('Local document not found');
    }

    // Show cached document immediately while fetching
    if (cachedDocument) {
      set({ currentDocument: cachedDocument });
    }

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/documents/${documentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        // If server fetch fails but we have cached, use cached
        if (cachedDocument) {
          return cachedDocument;
        }
        throw new Error('Failed to fetch document');
      }
      
      const document = await response.json();
      set({ currentDocument: document });
      
      // Update the cached version
      const updatedDocs = documents.map(d => 
        d.document_id === documentId ? document : d
      );
      set({ documents: updatedDocs });
      // Save to local cache (strips base64, saves to file system)
      await get().saveLocalCache();
      
      return document;
    } catch (e) {
      // If fetch fails but we have cached document, use it
      if (cachedDocument) {
        set({ currentDocument: cachedDocument });
        return cachedDocument;
      }
      throw e;
    }
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

  setCurrentDocument: async (doc) => {
    if (!doc) {
      set({ currentDocument: null });
      return;
    }
    
    // Check if we need to download images from S3 URLs
    const hasUrls = doc.pages?.some(p => p.image_url && (!p.image_base64 || p.image_base64.length < 100));
    
    if (hasUrls) {
      // Download images from S3 URLs and add base64 data
      const pagesWithBase64 = await Promise.all(doc.pages.map(async (page) => {
        if (page.image_url && (!page.image_base64 || page.image_base64.length < 100)) {
          try {
            const response = await fetch(page.image_url);
            if (response.ok) {
              const blob = await response.blob();
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const result = reader.result as string;
                  // Remove data:image/jpeg;base64, prefix if present
                  const base64Data = result.includes(',') ? result.split(',')[1] : result;
                  resolve(base64Data);
                };
                reader.readAsDataURL(blob);
              });
              return { ...page, image_base64: base64 };
            }
          } catch (e) {
            console.error('Failed to download image from S3:', e);
          }
        }
        return page;
      }));
      
      set({ currentDocument: { ...doc, pages: pagesWithBase64 } });
    } else {
      set({ currentDocument: doc });
    }
  },

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

    // Strip data: prefix if present - API expects raw base64
    let imageData = imageBase64;
    if (imageBase64 && imageBase64.startsWith('data:')) {
      imageData = imageBase64.split(',')[1];
    }
    
    // Validate image data
    if (!imageData || imageData.length < 100) {
      console.error('[processImage] Invalid image data:', imageData?.length || 0);
      throw new Error('Invalid image data');
    }
    
    console.log('[processImage] Sending request, operation:', operation, 'image length:', imageData.length);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image_base64: imageData, operation, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[processImage] API error:', response.status, errorText);
      throw new Error('Failed to process image');
    }
    const result = await response.json();
    return result.processed_image_base64;
  },

  // Migrate guest/local documents to user account after login
  // This function now checks if migration was already done for this user
  migrateGuestDocumentsToAccount: async (token: string, userId: string) => {
    try {
      // Check if already migrated for this user
      const migratedKey = `migrated_docs_${userId}`;
      const alreadyMigrated = await AsyncStorage.getItem(migratedKey);
      
      if (alreadyMigrated === 'true') {
        console.log('Documents already migrated for this user');
        // Still clear guest docs if any exist
        await AsyncStorage.removeItem(GUEST_DOCUMENTS_KEY);
        await AsyncStorage.removeItem(GUEST_FOLDERS_KEY);
        return 0;
      }
      
      // Load any stored guest documents
      const storedDocs = await AsyncStorage.getItem(GUEST_DOCUMENTS_KEY);
      const guestDocuments: Document[] = storedDocs ? JSON.parse(storedDocs) : [];
      
      if (guestDocuments.length === 0) {
        console.log('No guest documents to migrate');
        // Mark as migrated anyway to prevent future checks
        await AsyncStorage.setItem(migratedKey, 'true');
        return 0;
      }
      
      console.log(`Migrating ${guestDocuments.length} guest documents to account...`);
      
      let migratedCount = 0;
      let skippedCount = 0;
      const { createDocument } = get();
      
      for (const localDoc of guestDocuments) {
        try {
          // Read images from file system for migration
          const pagesWithImages = await Promise.all(localDoc.pages.map(async (page) => {
            let imageBase64 = page.image_base64;
            let originalBase64 = page.original_image_base64;
            
            // Read from file if we only have file URI
            if (!imageBase64 && page.image_file_uri) {
              imageBase64 = await loadImageFromFile(page.image_file_uri);
            }
            if (!originalBase64 && page.original_file_uri) {
              originalBase64 = await loadImageFromFile(page.original_file_uri);
            }
            
            return {
              image_base64: imageBase64,
              original_image_base64: originalBase64,
              filter_applied: page.filter_applied || 'original',
              rotation: page.rotation || 0,
              ocr_text: page.ocr_text,
            };
          }));
          
          // Check if we have any valid images to migrate
          const hasValidImages = pagesWithImages.some(p => p.image_base64 && p.image_base64.length > 100);
          if (!hasValidImages) {
            console.log(`Skipping ${localDoc.name} - no valid images to migrate`);
            skippedCount++;
            continue;
          }
          
          // Create a new document in the user's account
          const newDoc = await createDocument(token, {
            name: localDoc.name,
            folder_id: undefined,
            tags: localDoc.tags || [],
            pages: pagesWithImages,
            document_type: localDoc.document_type || 'document',
          });
          
          if (newDoc) {
            migratedCount++;
            console.log(`Migrated document: ${localDoc.name}`);
          }
        } catch (docError) {
          console.error(`Failed to migrate document ${localDoc.name}:`, docError);
          skippedCount++;
        }
      }
      
      // Clear guest documents and mark as migrated
      await AsyncStorage.removeItem(GUEST_DOCUMENTS_KEY);
      await AsyncStorage.removeItem(GUEST_FOLDERS_KEY);
      await AsyncStorage.setItem(migratedKey, 'true');
      
      console.log(`Successfully migrated ${migratedCount} documents, skipped ${skippedCount}`);
      return migratedCount;
    } catch (e) {
      console.error('Error migrating guest documents:', e);
      return 0;
    }
  },
}));

import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
// Use legacy API for expo-file-system (SDK 54+ deprecated the old methods)
import * as FileSystem from 'expo-file-system/legacy';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const GUEST_DOCUMENTS_KEY = 'guest_documents_meta'; // Only stores metadata now
const GUEST_FOLDERS_KEY = 'guest_folders';
const PENDING_SYNC_KEY = 'pending_sync_documents';
const LOCAL_DOCUMENTS_KEY = 'local_documents_meta'; // Only stores metadata now
const LOCAL_MANIFEST_KEY = 'scanup_local_manifest'; // ⭐ Manifest for efficient sync
const LAST_SYNC_KEY = 'scanup_last_sync_time'; // ⭐ Last successful sync timestamp

// Image storage directory
const IMAGE_DIR = `${FileSystem.documentDirectory}scanup_images/`;

// Manifest entry type for efficient sync
interface ManifestEntry {
  document_id: string;
  name: string;
  folder_id: string | null;
  updated_at: string;
  created_at: string;
  page_count: number;
  tags?: string[];
  is_password_protected?: boolean;
}

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
  // ⭐ LOCAL-FIRST: Always prioritize local file URI for thumbnails
  // This ensures rotated/filtered images show correctly on main screen
  if (page.image_file_uri) return { uri: page.image_file_uri };
  
  // Then check for base64 (in-memory edited images)
  if (page.image_base64) {
    if (page.image_base64.startsWith('data:')) return { uri: page.image_base64 };
    return { uri: `data:image/jpeg;base64,${page.image_base64}` };
  }
  
  // Finally, fall back to cloud URLs
  if (useThumbnail) {
    if (page.thumbnail_url) return { uri: page.thumbnail_url };
    if (page.thumbnail_base64) return { uri: `data:image/jpeg;base64,${page.thumbnail_base64}` };
  }
  if (page.image_url) return { uri: page.image_url };
  
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
  password?: string;  // Local password for document protection
  is_locked?: boolean;
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
  document_count?: number;  // Added for folder document count display
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
  initialCloudSyncDone: boolean;  // ⭐ Tracks if initial cloud sync is complete (app launch only)
  isInitialCloudSyncing: boolean; // ⭐ True only during first cloud fetch
  
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
  forceRefreshFromCloud: (token: string) => Promise<void>;  // ⭐ Manual refresh (pull-to-refresh)
  resetForLogout: () => void;  // ⭐ Reset state on logout
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
  initialCloudSyncDone: false,  // ⭐ Will be true after first cloud fetch
  isInitialCloudSyncing: false, // ⭐ True only during first cloud fetch

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
      const foldersRaw = storedFolders ? JSON.parse(storedFolders) : [];
      
      // Calculate document count for each folder (for guest mode)
      const folders = foldersRaw.map((folder: Folder) => ({
        ...folder,
        document_count: metaDocs.filter((doc: Document) => doc.folder_id === folder.folder_id).length,
      }));
      
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
          
          // ⭐ FIX: Always save base64 to file if we have it
          // This ensures rotated/filtered images are persisted
          if (page.image_base64 && page.image_base64.length > 100) {
            try {
              // Clean base64 (remove data: prefix if present)
              let cleanBase64 = page.image_base64;
              if (cleanBase64.startsWith('data:')) {
                cleanBase64 = cleanBase64.split(',')[1];
              }
              
              // Generate new filename with timestamp to avoid stale cache
              const newFileUri = await saveImageToFile(cleanBase64, doc.document_id, idx);
              
              // Delete old file if it's different
              if (fileUri && fileUri !== newFileUri && Platform.OS !== 'web') {
                try {
                  const oldFileInfo = await FileSystem.getInfoAsync(fileUri);
                  if (oldFileInfo.exists) {
                    await FileSystem.deleteAsync(fileUri, { idempotent: true });
                  }
                } catch (delErr) {
                  // Ignore delete errors
                }
              }
              
              fileUri = newFileUri;
              console.log(`[saveLocalCache] Saved/updated image to file: ${fileUri}`);
            } catch (e) {
              console.error('[saveLocalCache] Error saving image to file:', e);
            }
          }
          
          // Save original to file if needed
          if (page.original_image_base64 && page.original_image_base64.length > 100 && !page.original_file_uri) {
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
      
      // ⭐ CRITICAL: Update state with new file URIs so main screen shows updated images
      // Merge the new file URIs into the current documents state
      const { documents: currentDocs } = get();
      const updatedDocs = currentDocs.map(doc => {
        const metaDoc = metaDocs.find(m => m.document_id === doc.document_id);
        if (metaDoc) {
          return {
            ...doc,
            pages: doc.pages.map((page, idx) => ({
              ...page,
              image_file_uri: metaDoc.pages[idx]?.image_file_uri || page.image_file_uri,
              original_file_uri: metaDoc.pages[idx]?.original_file_uri || page.original_file_uri,
            })),
          };
        }
        return doc;
      });
      set({ documents: updatedDocs });
      console.log('[saveLocalCache] ✅ State updated with new file URIs');
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
              
              // ⭐ FIX: Replace local document with server document
              // Remove the old local_xxx ID and add the server ID
              // This prevents duplicates when cache is loaded
              set((state) => ({
                documents: state.documents.map((d) =>
                  d.document_id === item.document_id 
                    ? { ...serverDoc, sync_status: 'synced' as SyncStatus } 
                    : d
                ),
              }));
              
              // ⭐ Also update local cache immediately with new server ID
              await get().saveLocalCache();
              
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
    console.log('[fetchDocuments] Starting, token:', !!token);
    
    const { initialCloudSyncDone, documents: currentDocs } = get();
    
    // ⭐ CRITICAL: If we already have documents in memory and sync is done,
    // DON'T overwrite with cache - memory state is more recent (has edits)
    if (initialCloudSyncDone && currentDocs.length > 0) {
      console.log('[fetchDocuments] ⏭️ Using in-memory documents (sync already done, has', currentDocs.length, 'docs)');
      return;
    }
    
    // ⭐ LOCAL-FIRST: Load from local cache IMMEDIATELY (no loading spinner)
    // Only do this if we don't have documents in memory yet
    if (currentDocs.length === 0) {
      try {
        const cached = await AsyncStorage.getItem(LOCAL_DOCUMENTS_KEY);
        if (cached) {
          const cachedDocs = JSON.parse(cached);
          console.log('[fetchDocuments] ✅ Loaded', cachedDocs.length, 'docs from local cache');
          set({ documents: cachedDocs });
        }
      } catch (e) {
        console.error('[fetchDocuments] Cache load error:', e);
      }
    }
    
    // If no token (guest mode), just load guest documents
    if (!token) {
      await get().loadGuestDocuments();
      return;
    }

    // ⭐ CRITICAL: If initial cloud sync already done, DON'T fetch from server again
    // Just use local cache - server sync happens in background via syncPendingDocuments
    if (initialCloudSyncDone) {
      console.log('[fetchDocuments] ⏭️ Initial sync already complete, using local cache only');
      return;
    }

    // ⭐ MANIFEST-BASED SMART SYNC
    console.log('[fetchDocuments] 🌐 Starting manifest-based smart sync...');
    set({ isInitialCloudSyncing: true });

    // Set a maximum sync timeout (30 seconds)
    const syncTimeout = setTimeout(() => {
      console.warn('[fetchDocuments] ⚠️ Sync timeout reached, forcing completion');
      set({ isInitialCloudSyncing: false, initialCloudSyncDone: true });
    }, 30000);

    try {
      // Create abort controller for fetch timeout
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout for manifest

      // ⭐ Step 1: Fetch lightweight manifest from server (not full documents)
      const manifestResponse = await fetch(
        `${BACKEND_URL}/api/documents/manifest`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }
      );
      
      clearTimeout(fetchTimeout);

      if (!manifestResponse.ok) {
        console.error('[fetchDocuments] Manifest fetch failed:', manifestResponse.status);
        clearTimeout(syncTimeout);
        set({ isInitialCloudSyncing: false, initialCloudSyncDone: true });
        return;
      }
      
      const manifestData = await manifestResponse.json();
      const cloudManifest: ManifestEntry[] = manifestData.documents || [];
      const serverTime = manifestData.server_time;
      
      console.log('[fetchDocuments] 📋 Got manifest with', cloudManifest.length, 'documents');

      // ⭐ Step 2: Load local manifest for comparison
      const localManifestStr = await AsyncStorage.getItem(LOCAL_MANIFEST_KEY);
      const localManifest: ManifestEntry[] = localManifestStr ? JSON.parse(localManifestStr) : [];
      
      // ⭐ Step 3: Compare manifests to find what needs syncing
      const localMap = new Map(localManifest.map(m => [m.document_id, m]));
      const cloudMap = new Map(cloudManifest.map(m => [m.document_id, m]));
      
      const docsToFetch: string[] = []; // Documents to download from cloud
      const docsToDelete: string[] = []; // Documents deleted on cloud
      
      // Find new/updated documents on cloud
      for (const cloudDoc of cloudManifest) {
        const localDoc = localMap.get(cloudDoc.document_id);
        if (!localDoc) {
          // New document on cloud
          docsToFetch.push(cloudDoc.document_id);
        } else if (new Date(cloudDoc.updated_at) > new Date(localDoc.updated_at)) {
          // Document updated on cloud
          docsToFetch.push(cloudDoc.document_id);
        }
      }
      
      // Find documents deleted on cloud
      for (const localDoc of localManifest) {
        if (!cloudMap.has(localDoc.document_id) && !localDoc.document_id.startsWith('local_')) {
          docsToDelete.push(localDoc.document_id);
        }
      }
      
      console.log('[fetchDocuments] 📊 Sync analysis:', {
        totalCloud: cloudManifest.length,
        totalLocal: localManifest.length,
        toFetch: docsToFetch.length,
        toDelete: docsToDelete.length
      });

      // ⭐ Step 4: Process changes
      const { documents: currentDocs } = get();
      let updatedDocs = [...currentDocs];
      
      // Remove deleted documents IMMEDIATELY (no network needed)
      if (docsToDelete.length > 0) {
        updatedDocs = updatedDocs.filter(d => !docsToDelete.includes(d.document_id));
        console.log('[fetchDocuments] 🗑️ Removed', docsToDelete.length, 'deleted documents');
        
        // Update state immediately so UI reflects deletion
        set({ documents: updatedDocs });
      }
      
      // If no new documents to fetch, we're done!
      if (docsToFetch.length === 0) {
        console.log('[fetchDocuments] ✅ Only deletions processed, sync complete');
        clearTimeout(syncTimeout);
        
        // Update manifests
        await AsyncStorage.setItem(LOCAL_MANIFEST_KEY, JSON.stringify(cloudManifest));
        await AsyncStorage.setItem(LAST_SYNC_KEY, serverTime);
        
        set({ isInitialCloudSyncing: false, initialCloudSyncDone: true });
        await get().saveLocalCache();
        return;
      }

      // ⭐ Step 5: Fetch ONLY changed documents using BATCH endpoint
      console.log('[fetchDocuments] ⬇️ Fetching', docsToFetch.length, 'changed documents via batch API...');
      
      // Keep syncing flag true until documents are fetched
      // This ensures UI shows loading state
      
      // Fetch documents in batches of 50 (much faster than one-by-one)
      const BATCH_SIZE = 50;
      let useBatchEndpoint = true; // Flag to track if batch endpoint works
      let fetchedAny = false; // Track if we fetched any documents
      
      for (let i = 0; i < docsToFetch.length; i += BATCH_SIZE) {
        const batchIds = docsToFetch.slice(i, i + BATCH_SIZE);
        
        // Try batch endpoint first (if not already failed)
        if (useBatchEndpoint) {
          try {
            console.log('[fetchDocuments] 📦 Trying batch endpoint for', batchIds.length, 'docs...');
            const batchResponse = await fetch(
              `${BACKEND_URL}/api/documents/batch`,
              { 
                method: 'POST',
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ document_ids: batchIds }),
                signal: AbortSignal.timeout(30000)
              }
            );
            
            if (batchResponse.ok) {
              const fetchedDocs: Document[] = await batchResponse.json();
              console.log('[fetchDocuments] ✅ Batch fetched:', fetchedDocs.length, 'documents');
              
              // Update state with all fetched documents
              const { documents: latestDocs } = get();
              const docMap = new Map(latestDocs.map(d => [d.document_id, d]));
              
              for (const fetchedDoc of fetchedDocs) {
                docMap.set(fetchedDoc.document_id, fetchedDoc);
              }
              
              set({ documents: Array.from(docMap.values()) });
              fetchedAny = true;
              continue; // Skip fallback for this batch
            } else {
              console.warn('[fetchDocuments] ⚠️ Batch endpoint returned:', batchResponse.status, '- switching to fallback');
              useBatchEndpoint = false; // Disable batch for remaining requests
            }
          } catch (e) {
            console.warn('[fetchDocuments] ⚠️ Batch request error:', e, '- switching to fallback');
            useBatchEndpoint = false;
          }
        }
        
        // Fallback: fetch one by one for this batch
        console.log('[fetchDocuments] 🔄 Fallback: fetching', batchIds.length, 'docs one-by-one...');
        for (const docId of batchIds) {
          try {
            const docResponse = await fetch(
              `${BACKEND_URL}/api/documents/${docId}`,
              { 
                headers: { Authorization: `Bearer ${token}` },
                signal: AbortSignal.timeout(10000)
              }
            );
            if (docResponse.ok) {
              const fetchedDoc = await docResponse.json();
              const { documents: docs } = get();
              const idx = docs.findIndex(d => d.document_id === docId);
              if (idx >= 0) {
                docs[idx] = fetchedDoc;
              } else {
                docs.push(fetchedDoc);
              }
              set({ documents: [...docs] });
              fetchedAny = true;
              console.log('[fetchDocuments] ✅ Fetched:', fetchedDoc.name);
            }
          } catch (e) {
            console.warn('[fetchDocuments] Failed to fetch doc:', docId, e);
          }
        }
      }
      
      // ⭐ NOW mark sync as complete AFTER all documents are fetched
      clearTimeout(syncTimeout);
      set({ isInitialCloudSyncing: false, initialCloudSyncDone: true });
      await AsyncStorage.setItem(LOCAL_MANIFEST_KEY, JSON.stringify(cloudManifest));
      await AsyncStorage.setItem(LAST_SYNC_KEY, serverTime);
      
      // Save to local cache
      await get().saveLocalCache();
      console.log('[fetchDocuments] ✅ Smart sync COMPLETE');
      
    } catch (e: any) {
      clearTimeout(syncTimeout);
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        console.error('[fetchDocuments] Request timed out');
      } else {
        console.error('[fetchDocuments] Sync error:', e);
      }
      set({ isInitialCloudSyncing: false, initialCloudSyncDone: true });
    }
  },

  fetchDocument: async (token, documentId) => {
    console.log('[fetchDocument] Fetching:', documentId);
    
    // ⭐ LOCAL-FIRST: First check local state/cache
    const { documents, currentDocument } = get();
    let cachedDocument = documents.find(d => d.document_id === documentId);
    
    // If already current document and has images in memory, use it immediately
    if (currentDocument?.document_id === documentId && 
        currentDocument.pages?.some(p => (p.image_base64 && p.image_base64.length > 100) || p.image_file_uri)) {
      console.log('[fetchDocument] ✅ Using current document from memory');
      
      // Load images from file if needed
      const docWithImages = await get().loadDocumentImages(currentDocument);
      set({ currentDocument: docWithImages });
      return docWithImages;
    }
    
    // If cached document has local file URIs, load from files (INSTANT!)
    if (cachedDocument && cachedDocument.pages?.some(p => p.image_file_uri)) {
      console.log('[fetchDocument] ✅ Loading from local files');
      const docWithImages = await get().loadDocumentImages(cachedDocument);
      set({ currentDocument: docWithImages });
      return docWithImages;
    }
    
    // If no token, use cached/local document only
    if (!token) {
      if (cachedDocument) {
        const docWithImages = await get().loadDocumentImages(cachedDocument);
        set({ currentDocument: docWithImages });
        return docWithImages;
      }
      // Try loading from local storage
      const storedDocs = await AsyncStorage.getItem(GUEST_DOCUMENTS_KEY);
      if (storedDocs) {
        const guestDocs = JSON.parse(storedDocs);
        const localDoc = guestDocs.find((d: Document) => d.document_id === documentId);
        if (localDoc) {
          const docWithImages = await get().loadDocumentImages(localDoc);
          set({ currentDocument: docWithImages });
          return docWithImages;
        }
      }
      throw new Error('Document not found');
    }
    
    // For local documents, just use the cached version
    if (documentId.startsWith('local_')) {
      if (cachedDocument) {
        const docWithImages = await get().loadDocumentImages(cachedDocument);
        set({ currentDocument: docWithImages });
        return docWithImages;
      }
      throw new Error('Local document not found');
    }

    // Show cached document immediately while fetching from server
    if (cachedDocument) {
      const docWithImages = await get().loadDocumentImages(cachedDocument);
      set({ currentDocument: docWithImages });
      
      // If we have local images, no need to fetch from server
      if (cachedDocument.pages?.every(p => p.image_file_uri || (p.image_base64 && p.image_base64.length > 100))) {
        console.log('[fetchDocument] ✅ All images available locally, skipping server fetch');
        return docWithImages;
      }
    }

    // Only fetch from server if we don't have local images
    try {
      console.log('[fetchDocument] Fetching from server...');
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
      
      const serverDoc = await response.json();
      console.log('[fetchDocument] Server returned doc with', serverDoc.pages?.length, 'pages');
      
      // ⭐ CRITICAL: Download images from S3 and save to local files
      const pagesWithLocalFiles = await Promise.all(
        serverDoc.pages.map(async (page: PageData, idx: number) => {
          // If we already have local file, skip download
          const cachedPage = cachedDocument?.pages?.[idx];
          if (cachedPage?.image_file_uri) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(cachedPage.image_file_uri);
              if (fileInfo.exists) {
                console.log(`[fetchDocument] Page ${idx}: Using cached local file`);
                return { ...page, image_file_uri: cachedPage.image_file_uri };
              }
            } catch (e) {
              // File doesn't exist, need to download
            }
          }
          
          // Download from S3 and save locally
          if (page.image_url) {
            try {
              console.log(`[fetchDocument] Page ${idx}: Downloading from S3...`);
              const imageDir = `${FileSystem.documentDirectory}images/`;
              const dirInfo = await FileSystem.getInfoAsync(imageDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(imageDir, { intermediates: true });
              }
              
              const filename = `${documentId}_p${idx}_${Date.now()}.jpg`;
              const localPath = `${imageDir}${filename}`;
              
              // Download the file
              const downloadResult = await FileSystem.downloadAsync(page.image_url, localPath);
              
              if (downloadResult.status === 200) {
                console.log(`[fetchDocument] Page ${idx}: ✅ Saved to local: ${localPath}`);
                return { ...page, image_file_uri: localPath };
              }
            } catch (e) {
              console.error(`[fetchDocument] Page ${idx}: Download error:`, e);
            }
          }
          
          return page;
        })
      );
      
      const mergedDoc = { ...serverDoc, pages: pagesWithLocalFiles };
      
      // Load images into memory for immediate display
      const docWithImages = await get().loadDocumentImages(mergedDoc);
      
      set({ currentDocument: docWithImages });
      
      // Update the cached version
      const updatedDocs = documents.map(d => 
        d.document_id === documentId ? mergedDoc : d
      );
      if (!documents.some(d => d.document_id === documentId)) {
        updatedDocs.push(mergedDoc);
      }
      set({ documents: updatedDocs });
      
      // Save to local cache (this saves file URIs for next time)
      await get().saveLocalCache();
      
      return docWithImages;
    } catch (e) {
      // If fetch fails but we have cached document, use it
      if (cachedDocument) {
        const docWithImages = await get().loadDocumentImages(cachedDocument);
        set({ currentDocument: docWithImages });
        return docWithImages;
      }
      throw e;
    }
  },
  
  // ⭐ Helper: Load images from local files into memory
  loadDocumentImages: async (doc: Document): Promise<Document> => {
    if (!doc || !doc.pages) return doc;
    
    const pagesWithImages = await Promise.all(
      doc.pages.map(async (page, idx) => {
        // If already has base64 in memory, use it
        if (page.image_base64 && page.image_base64.length > 100) {
          return page;
        }
        
        // Load from local file
        if (page.image_file_uri) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(page.image_file_uri);
            if (fileInfo.exists) {
              const base64 = await FileSystem.readAsStringAsync(page.image_file_uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              console.log(`[loadDocumentImages] Page ${idx}: Loaded from file`);
              return { ...page, image_base64: base64 };
            }
          } catch (e) {
            console.error(`[loadDocumentImages] Page ${idx}: Error loading:`, e);
          }
        }
        
        return page;
      })
    );
    
    return { ...doc, pages: pagesWithImages };
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
    const { documents, currentDocument } = get();
    const existingDoc = documents.find(d => d.document_id === documentId) || currentDocument;
    
    if (!existingDoc) {
      console.error('[updateDocument] Document not found in state:', documentId);
      throw new Error('Document not found');
    }
    
    // ⭐ LOCAL-FIRST: Always update local state IMMEDIATELY
    const updatedDoc: Document = {
      ...existingDoc,
      ...data,
      updated_at: new Date().toISOString(),
    };
    
    // Update state immediately (INSTANT UI feedback)
    set((state) => ({
      documents: state.documents.map((d) =>
        d.document_id === documentId ? updatedDoc : d
      ),
      currentDocument: state.currentDocument?.document_id === documentId ? updatedDoc : state.currentDocument,
    }));
    
    console.log('[updateDocument] ✅ Local state updated immediately');
    
    // If no token or local document, just save locally
    if (!token || documentId.startsWith('local_')) {
      await get().saveGuestDocuments();
      return updatedDoc;
    }
    
    // ⭐ For server documents: Save to local cache first, then sync in BACKGROUND
    await get().saveLocalCache();
    
    // Background sync - don't await, don't block UI
    // Only sync if we have significant changes (not just in-memory base64 updates)
    const shouldSyncToServer = data.name || data.folder_id || data.tags;
    
    if (shouldSyncToServer) {
      // Fire and forget - sync in background
      fetch(`${BACKEND_URL}/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          folder_id: data.folder_id,
          tags: data.tags,
          // Don't send pages with base64 - too slow
        }),
      }).then(response => {
        if (response.ok) {
          console.log('[updateDocument] ✅ Background sync complete');
        } else {
          console.error('[updateDocument] Background sync failed');
        }
      }).catch(err => {
        console.error('[updateDocument] Background sync error:', err);
      });
    }
    
    return updatedDoc;
  },

  deleteDocument: async (token, documentId) => {
    console.log('[deleteDocument] Deleting:', documentId);
    
    // ⭐ LOCAL-FIRST: Remove from UI IMMEDIATELY
    set((state) => ({
      documents: state.documents.filter((d) => d.document_id !== documentId),
      currentDocument: state.currentDocument?.document_id === documentId ? null : state.currentDocument,
    }));
    
    console.log('[deleteDocument] ✅ Removed from UI immediately');
    
    // If no token or local document, just save locally
    if (!token || documentId.startsWith('local_')) {
      await get().saveGuestDocuments();
      return;
    }
    
    // ⭐ For server documents: Delete in BACKGROUND (fire and forget)
    fetch(`${BACKEND_URL}/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).then(response => {
      if (response.ok) {
        console.log('[deleteDocument] ✅ Background delete complete');
      } else {
        console.error('[deleteDocument] Background delete failed - document may still exist on server');
      }
    }).catch(err => {
      console.error('[deleteDocument] Background delete error:', err);
    });
    
    // Save local cache
    await get().saveLocalCache();
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
  // ⭐ Force refresh from cloud (for pull-to-refresh)
  // This bypasses the initialCloudSyncDone check and always fetches from server
  // BUT preserves local edits (rotations, filters) that haven't been synced yet
  forceRefreshFromCloud: async (token: string) => {
    if (!token) return;
    
    console.log('[forceRefreshFromCloud] 🔄 Manual refresh triggered');
    
    try {
      // ⭐ FIRST: Save current local state before fetching from cloud
      // This ensures we don't lose any edits
      await get().saveLocalCache();
      
      const response = await fetch(
        `${BACKEND_URL}/api/documents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        console.error('[forceRefreshFromCloud] Server fetch failed:', response.status);
        return;
      }
      
      const serverDocs = await response.json();
      console.log('[forceRefreshFromCloud] ✅ Fetched', serverDocs.length, 'docs from server');
      
      // Get current local documents
      const { documents: currentDocs } = get();
      
      // ⭐ SMART MERGE: Preserve local edits
      // 1. Keep local-only documents (not yet synced to server)
      // 2. For server documents, preserve local image_file_uri if it exists (means we have local edits)
      const mergedDocs = serverDocs.map((serverDoc: Document) => {
        const localDoc = currentDocs.find(d => d.document_id === serverDoc.document_id);
        
        if (localDoc) {
          // Check if local document has edits (local file URIs)
          const hasLocalEdits = localDoc.pages?.some(p => p.image_file_uri);
          
          if (hasLocalEdits) {
            console.log(`[forceRefreshFromCloud] 📌 Preserving local edits for: ${serverDoc.name}`);
            // Merge: Keep server metadata but preserve local page data (images)
            return {
              ...serverDoc,
              pages: localDoc.pages, // Keep local pages with edits
              updated_at: localDoc.updated_at, // Keep local timestamp
            };
          }
        }
        
        return serverDoc;
      });
      
      // Add any local-only documents (not on server yet)
      const localOnlyDocs = currentDocs.filter(d => 
        d.document_id.startsWith('local_') && 
        !serverDocs.some((s: Document) => s.document_id === d.document_id)
      );
      
      const finalDocs = [...localOnlyDocs, ...mergedDocs];
      set({ documents: finalDocs });
      
      // Save merged state to local cache
      await get().saveLocalCache();
      console.log('[forceRefreshFromCloud] ✅ Refresh complete, preserved local edits');
    } catch (e) {
      console.error('[forceRefreshFromCloud] Error:', e);
    }
  },

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

  // ⭐ Reset state on logout - clears documents and sync state for new user
  resetForLogout: () => {
    console.log('[DocumentStore] Resetting state for logout');
    set({
      documents: [],
      folders: [],
      currentDocument: null,
      isLoading: false,
      isSyncing: false,
      pendingSyncCount: 0,
      initialCloudSyncDone: false,  // ⭐ Force new cloud sync for next user
      isInitialCloudSyncing: false,
    });
  },
}));

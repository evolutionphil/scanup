/**
 * OFFLINE SYNC MANAGER
 * 
 * Monitors network connectivity and automatically syncs
 * pending documents when connection is restored.
 * 
 * Features:
 * - Automatic sync on network restore
 * - Background sync with retry logic
 * - Queue management for offline changes
 * - Premium user optimized (no ads blocking)
 */

import { useEffect, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useDocumentStore } from '../store/documentStore';
import { useAuthStore } from '../store/authStore';
import { AppState, AppStateStatus } from 'react-native';

// Minimum interval between sync attempts (30 seconds)
const MIN_SYNC_INTERVAL = 30 * 1000;

// Track last sync time
let lastSyncTime = 0;
let isSyncing = false;

/**
 * Hook to manage offline sync
 * Call this once in your app's root component
 */
export const useOfflineSync = () => {
  const token = useAuthStore(state => state.token);
  const syncPendingDocuments = useDocumentStore(state => state.syncPendingDocuments);
  const getPendingSyncItems = useDocumentStore(state => state.getPendingSyncItems);
  const saveLocalCache = useDocumentStore(state => state.saveLocalCache);
  
  const wasOfflineRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger sync if conditions are met
  const triggerSync = async (reason: string) => {
    if (!token) {
      console.log('[OfflineSync] No token, skipping sync');
      return;
    }
    
    if (isSyncing) {
      console.log('[OfflineSync] Already syncing, skipping');
      return;
    }
    
    const now = Date.now();
    if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
      console.log('[OfflineSync] Too soon since last sync, skipping');
      return;
    }
    
    // Check if there are pending items
    const pendingItems = await getPendingSyncItems();
    if (pendingItems.length === 0) {
      console.log('[OfflineSync] No pending items to sync');
      return;
    }
    
    console.log(`[OfflineSync] 🔄 Starting sync (${reason}), ${pendingItems.length} pending items`);
    
    isSyncing = true;
    lastSyncTime = now;
    
    try {
      await syncPendingDocuments(token);
      console.log('[OfflineSync] ✅ Sync completed successfully');
    } catch (e) {
      console.error('[OfflineSync] ❌ Sync failed:', e);
    } finally {
      isSyncing = false;
    }
  };

  // Handle network state changes
  const handleNetworkChange = (state: NetInfoState) => {
    console.log('[OfflineSync] Network state:', state.isConnected ? 'ONLINE' : 'OFFLINE');
    
    if (state.isConnected && wasOfflineRef.current) {
      // Just came back online - trigger sync after short delay
      console.log('[OfflineSync] 📶 Network restored - scheduling sync');
      
      // Clear any existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      // Delay sync slightly to ensure connection is stable
      syncTimeoutRef.current = setTimeout(() => {
        triggerSync('network_restored');
      }, 2000);
    }
    
    wasOfflineRef.current = !state.isConnected;
  };

  // Handle app state changes (foreground/background)
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground - check if we need to sync
      console.log('[OfflineSync] App became active, checking for pending sync');
      
      // Check network and sync if online
      NetInfo.fetch().then(state => {
        if (state.isConnected) {
          triggerSync('app_foreground');
        }
      });
    }
  };

  useEffect(() => {
    // Subscribe to network changes
    const unsubscribeNetwork = NetInfo.addEventListener(handleNetworkChange);
    
    // Subscribe to app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Initial check
    NetInfo.fetch().then(state => {
      wasOfflineRef.current = !state.isConnected;
      if (state.isConnected) {
        // Initial sync on mount if online
        setTimeout(() => triggerSync('initial'), 3000);
      }
    });
    
    // Cleanup
    return () => {
      unsubscribeNetwork();
      appStateSubscription.remove();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [token]);

  // Return sync trigger for manual use
  return {
    triggerSync: () => triggerSync('manual'),
    isSyncing: () => isSyncing,
  };
};

/**
 * Queue a document for sync when offline
 * Call this after creating/updating a document
 */
export const queueForSync = async (
  documentId: string,
  action: 'create' | 'update' | 'delete',
  data?: any
) => {
  const { addToPendingSync } = useDocumentStore.getState();
  
  await addToPendingSync({
    document_id: documentId,
    action,
    data,
    retries: 0,
    created_at: new Date().toISOString(),
  });
  
  console.log(`[OfflineSync] 📝 Queued ${action} for ${documentId}`);
};

/**
 * Check if we're currently online
 */
export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
};

export default useOfflineSync;

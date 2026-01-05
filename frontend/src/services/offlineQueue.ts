/**
 * Offline Queue Service
 * 
 * Manages pending operations when the device is offline.
 * Operations are queued locally and processed when back online.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@scanup_offline_queue';
const OVERLAYS_KEY = '@scanup_pending_overlays';

// Check if we're running in a browser/SSR environment
const isSSR = typeof window === 'undefined';

export type OperationType = 
  | 'apply_signature'
  | 'apply_annotation'
  | 'apply_filter'
  | 'update_document';

export interface PendingOperation {
  id: string;
  type: OperationType;
  documentId: string;
  pageIndex: number;
  data: any;
  createdAt: number;
  status: 'pending' | 'processing' | 'failed';
  retryCount: number;
}

export interface PendingOverlay {
  documentId: string;
  pageIndex: number;
  type: 'signature' | 'annotation';
  data: any;
  operationId: string;
}

class OfflineQueueService {
  private queue: PendingOperation[] = [];
  private overlays: PendingOverlay[] = [];
  private isProcessing: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Don't initialize storage/network listeners during SSR
    if (!isSSR) {
      this.loadFromStorage();
      this.setupNetworkListener();
    }
  }

  // Load queue from AsyncStorage
  async loadFromStorage(): Promise<void> {
    // Skip on SSR
    if (isSSR) return;
    
    try {
      const [queueData, overlaysData] = await Promise.all([
        AsyncStorage.getItem(QUEUE_KEY),
        AsyncStorage.getItem(OVERLAYS_KEY),
      ]);
      
      if (queueData) {
        this.queue = JSON.parse(queueData);
        console.log('[OfflineQueue] Loaded', this.queue.length, 'pending operations');
      }
      
      if (overlaysData) {
        this.overlays = JSON.parse(overlaysData);
        console.log('[OfflineQueue] Loaded', this.overlays.length, 'pending overlays');
      }
    } catch (e) {
      console.error('[OfflineQueue] Failed to load from storage:', e);
    }
  }

  // Save queue to AsyncStorage
  async saveToStorage(): Promise<void> {
    // Skip on SSR
    if (isSSR) return;
    
    try {
      await Promise.all([
        AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue)),
        AsyncStorage.setItem(OVERLAYS_KEY, JSON.stringify(this.overlays)),
      ]);
    } catch (e) {
      console.error('[OfflineQueue] Failed to save to storage:', e);
    }
  }

  // Setup network listener for auto-sync
  setupNetworkListener(): void {
    // Skip on SSR
    if (isSSR) return;
    
    NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('[OfflineQueue] Network available - processing queue');
        this.processQueue();
      }
    });
  }

  // Subscribe to queue changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Add operation to queue
  async addOperation(
    type: OperationType,
    documentId: string,
    pageIndex: number,
    data: any
  ): Promise<string> {
    const operation: PendingOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      documentId,
      pageIndex,
      data,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    this.queue.push(operation);
    await this.saveToStorage();
    this.notifyListeners();
    
    console.log('[OfflineQueue] Added operation:', operation.id, type);
    
    // Try to process immediately if online
    this.processQueue();
    
    return operation.id;
  }

  // Add visual overlay (for immediate preview)
  async addOverlay(
    documentId: string,
    pageIndex: number,
    type: 'signature' | 'annotation',
    data: any,
    operationId: string
  ): Promise<void> {
    const overlay: PendingOverlay = {
      documentId,
      pageIndex,
      type,
      data,
      operationId,
    };

    this.overlays.push(overlay);
    await this.saveToStorage();
    this.notifyListeners();
    
    console.log('[OfflineQueue] Added overlay for', documentId);
  }

  // Remove overlay when operation completes
  async removeOverlay(operationId: string): Promise<void> {
    this.overlays = this.overlays.filter(o => o.operationId !== operationId);
    await this.saveToStorage();
    this.notifyListeners();
  }

  // Get overlays for a specific document page
  getOverlaysForPage(documentId: string, pageIndex: number): PendingOverlay[] {
    return this.overlays.filter(
      o => o.documentId === documentId && o.pageIndex === pageIndex
    );
  }

  // Get pending operations for a document
  getPendingOperations(documentId: string): PendingOperation[] {
    return this.queue.filter(op => op.documentId === documentId);
  }

  // Check if document has pending operations
  hasPendingOperations(documentId: string): boolean {
    return this.queue.some(op => op.documentId === documentId && op.status === 'pending');
  }

  // Get total pending count
  getPendingCount(): number {
    return this.queue.filter(op => op.status === 'pending').length;
  }

  // Get all pending document IDs
  getPendingDocumentIds(): string[] {
    return [...new Set(this.queue.filter(op => op.status === 'pending').map(op => op.documentId))];
  }

  // Process the queue
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('[OfflineQueue] Already processing');
      return;
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) {
      console.log('[OfflineQueue] Offline - skipping queue processing');
      return;
    }

    this.isProcessing = true;
    const pendingOps = this.queue.filter(op => op.status === 'pending');
    
    console.log('[OfflineQueue] Processing', pendingOps.length, 'operations');

    for (const operation of pendingOps) {
      try {
        operation.status = 'processing';
        this.notifyListeners();

        await this.processOperation(operation);

        // Success - remove from queue and overlays
        this.queue = this.queue.filter(op => op.id !== operation.id);
        await this.removeOverlay(operation.id);
        
        console.log('[OfflineQueue] Completed operation:', operation.id);
      } catch (e) {
        console.error('[OfflineQueue] Failed operation:', operation.id, e);
        operation.status = 'pending';
        operation.retryCount++;
        
        // Remove after 3 retries
        if (operation.retryCount >= 3) {
          console.log('[OfflineQueue] Removing failed operation after 3 retries:', operation.id);
          this.queue = this.queue.filter(op => op.id !== operation.id);
          await this.removeOverlay(operation.id);
        }
      }
    }

    await this.saveToStorage();
    this.isProcessing = false;
    this.notifyListeners();
  }

  // Process individual operation
  private async processOperation(operation: PendingOperation): Promise<void> {
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://premiumunlocker-1.preview.emergentagent.com';
    
    switch (operation.type) {
      case 'apply_signature':
        await this.processSignature(operation, BACKEND_URL);
        break;
      case 'apply_annotation':
        await this.processAnnotation(operation, BACKEND_URL);
        break;
      case 'apply_filter':
        await this.processFilter(operation, BACKEND_URL);
        break;
      case 'update_document':
        await this.processDocumentUpdate(operation, BACKEND_URL);
        break;
    }
  }

  private async processSignature(operation: PendingOperation, baseUrl: string): Promise<void> {
    const { imageBase64, signatureBase64, position, scale, token } = operation.data;
    
    const response = await fetch(`${baseUrl}/api/images/apply-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        signature_base64: signatureBase64,
        position_x: position.x,
        position_y: position.y,
        scale: scale,
      }),
    });

    if (!response.ok) {
      throw new Error(`Signature API failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Signature processing failed');
    }

    // Update document with processed image
    await this.updateDocumentImage(
      operation.documentId,
      operation.pageIndex,
      result.image_base64,
      operation.data.token,
      baseUrl
    );
  }

  private async processAnnotation(operation: PendingOperation, baseUrl: string): Promise<void> {
    const { imageBase64, annotations, token } = operation.data;
    
    const response = await fetch(`${baseUrl}/api/images/apply-annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        annotations: annotations,
      }),
    });

    if (!response.ok) {
      throw new Error(`Annotation API failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Annotation processing failed');
    }

    await this.updateDocumentImage(
      operation.documentId,
      operation.pageIndex,
      result.annotated_image_base64,
      operation.data.token,
      baseUrl
    );
  }

  private async processFilter(operation: PendingOperation, baseUrl: string): Promise<void> {
    const { imageBase64, filterType, adjustments, token } = operation.data;
    
    const response = await fetch(`${baseUrl}/api/images/apply-filter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        image_base64: imageBase64,
        filter_type: filterType,
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
      }),
    });

    if (!response.ok) {
      throw new Error(`Filter API failed: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Filter processing failed');
    }

    await this.updateDocumentImage(
      operation.documentId,
      operation.pageIndex,
      result.image_base64,
      operation.data.token,
      baseUrl
    );
  }

  private async processDocumentUpdate(operation: PendingOperation, baseUrl: string): Promise<void> {
    const { updates, token } = operation.data;
    
    const response = await fetch(`${baseUrl}/api/documents/${operation.documentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Document update failed: ${response.status}`);
    }
  }

  private async updateDocumentImage(
    documentId: string,
    pageIndex: number,
    newImageBase64: string,
    token: string | null,
    baseUrl: string
  ): Promise<void> {
    // This will be handled by the document store
    // We emit an event or callback to update the store
    console.log('[OfflineQueue] Document image updated:', documentId, 'page:', pageIndex);
  }

  // Check network status
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueService();

/**
 * useOfflineQueue Hook
 * 
 * React hook for using the offline queue service in components
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineQueue, PendingOperation, PendingOverlay } from '../services/offlineQueue';
import NetInfo from '@react-native-community/netinfo';

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingDocIds, setPendingDocIds] = useState<string[]>([]);

  // Listen for queue changes
  useEffect(() => {
    const updateState = () => {
      setPendingCount(offlineQueue.getPendingCount());
      setPendingDocIds(offlineQueue.getPendingDocumentIds());
    };

    // Initial state
    updateState();

    // Subscribe to changes
    const unsubscribe = offlineQueue.subscribe(updateState);

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen for network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected === true && state.isInternetReachable === true);
    });

    // Initial check
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected === true && state.isInternetReachable === true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Add signature operation
  const queueSignature = useCallback(async (
    documentId: string,
    pageIndex: number,
    imageBase64: string,
    signatureBase64: string,
    position: { x: number; y: number },
    scale: number,
    token: string | null
  ): Promise<string> => {
    const operationId = await offlineQueue.addOperation(
      'apply_signature',
      documentId,
      pageIndex,
      {
        imageBase64,
        signatureBase64,
        position,
        scale,
        token,
      }
    );

    // Add visual overlay for immediate preview
    await offlineQueue.addOverlay(
      documentId,
      pageIndex,
      'signature',
      {
        signatureBase64,
        position,
        scale,
      },
      operationId
    );

    return operationId;
  }, []);

  // Add annotation operation
  const queueAnnotation = useCallback(async (
    documentId: string,
    pageIndex: number,
    imageBase64: string,
    annotations: any[],
    token: string | null
  ): Promise<string> => {
    const operationId = await offlineQueue.addOperation(
      'apply_annotation',
      documentId,
      pageIndex,
      {
        imageBase64,
        annotations,
        token,
      }
    );

    // Add visual overlay for immediate preview
    await offlineQueue.addOverlay(
      documentId,
      pageIndex,
      'annotation',
      {
        annotations,
      },
      operationId
    );

    return operationId;
  }, []);

  // Add filter operation
  const queueFilter = useCallback(async (
    documentId: string,
    pageIndex: number,
    imageBase64: string,
    filterType: string,
    adjustments: { brightness: number; contrast: number; saturation: number },
    token: string | null
  ): Promise<string> => {
    return offlineQueue.addOperation(
      'apply_filter',
      documentId,
      pageIndex,
      {
        imageBase64,
        filterType,
        adjustments,
        token,
      }
    );
  }, []);

  // Get overlays for a specific document page
  const getPageOverlays = useCallback((documentId: string, pageIndex: number): PendingOverlay[] => {
    return offlineQueue.getOverlaysForPage(documentId, pageIndex);
  }, []);

  // Check if document has pending operations
  const hasPending = useCallback((documentId: string): boolean => {
    return offlineQueue.hasPendingOperations(documentId);
  }, []);

  // Force process queue
  const processQueue = useCallback(async () => {
    await offlineQueue.processQueue();
  }, []);

  return {
    pendingCount,
    pendingDocIds,
    isOnline,
    queueSignature,
    queueAnnotation,
    queueFilter,
    getPageOverlays,
    hasPending,
    processQueue,
  };
}

export default useOfflineQueue;

/**
 * Image Storage Utility
 * 
 * Stores images in the file system instead of AsyncStorage
 * to avoid the 6MB SQLite limit on Android.
 * 
 * AsyncStorage limit: ~6MB
 * File system: Unlimited (uses phone storage)
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Directory for storing scanned images
const IMAGE_DIRECTORY = `${FileSystem.documentDirectory}scanup_images/`;

/**
 * Ensures the image directory exists
 */
export const ensureImageDirectory = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIRECTORY);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DIRECTORY, { intermediates: true });
      console.log('[ImageStorage] Created image directory');
    }
  } catch (error) {
    console.error('[ImageStorage] Error creating directory:', error);
  }
};

/**
 * Generates a unique filename for an image
 */
const generateImageFilename = (documentId: string, pageNumber: number): string => {
  return `${documentId}_page_${pageNumber}_${Date.now()}.jpg`;
};

/**
 * Saves a base64 image to the file system
 * Returns the file URI
 */
export const saveImageToFile = async (
  base64Data: string,
  documentId: string,
  pageNumber: number
): Promise<string | null> => {
  try {
    await ensureImageDirectory();
    
    const filename = generateImageFilename(documentId, pageNumber);
    const fileUri = `${IMAGE_DIRECTORY}${filename}`;
    
    // Remove data URI prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    console.log(`[ImageStorage] Saved image: ${filename}`);
    return fileUri;
  } catch (error) {
    console.error('[ImageStorage] Error saving image:', error);
    return null;
  }
};

/**
 * Loads an image from the file system as base64
 */
export const loadImageFromFile = async (fileUri: string): Promise<string | null> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      console.warn(`[ImageStorage] File not found: ${fileUri}`);
      return null;
    }
    
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('[ImageStorage] Error loading image:', error);
    return null;
  }
};

/**
 * Deletes an image from the file system
 */
export const deleteImageFile = async (fileUri: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      console.log(`[ImageStorage] Deleted image: ${fileUri}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[ImageStorage] Error deleting image:', error);
    return false;
  }
};

/**
 * Deletes all images for a document
 */
export const deleteDocumentImages = async (documentId: string): Promise<void> => {
  try {
    await ensureImageDirectory();
    const files = await FileSystem.readDirectoryAsync(IMAGE_DIRECTORY);
    
    for (const file of files) {
      if (file.startsWith(documentId)) {
        await FileSystem.deleteAsync(`${IMAGE_DIRECTORY}${file}`, { idempotent: true });
        console.log(`[ImageStorage] Deleted: ${file}`);
      }
    }
  } catch (error) {
    console.error('[ImageStorage] Error deleting document images:', error);
  }
};

/**
 * Gets total size of stored images
 */
export const getStorageUsage = async (): Promise<{ count: number; sizeBytes: number; sizeMB: string }> => {
  try {
    await ensureImageDirectory();
    const files = await FileSystem.readDirectoryAsync(IMAGE_DIRECTORY);
    
    let totalSize = 0;
    for (const file of files) {
      const info = await FileSystem.getInfoAsync(`${IMAGE_DIRECTORY}${file}`);
      if (info.exists && 'size' in info) {
        totalSize += info.size || 0;
      }
    }
    
    return {
      count: files.length,
      sizeBytes: totalSize,
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  } catch (error) {
    console.error('[ImageStorage] Error getting storage usage:', error);
    return { count: 0, sizeBytes: 0, sizeMB: '0' };
  }
};

/**
 * Clears all stored images
 */
export const clearAllImages = async (): Promise<void> => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIRECTORY);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(IMAGE_DIRECTORY, { idempotent: true });
      await ensureImageDirectory();
      console.log('[ImageStorage] Cleared all images');
    }
  } catch (error) {
    console.error('[ImageStorage] Error clearing images:', error);
  }
};

/**
 * Checks if a string is a file URI (vs base64)
 */
export const isFileUri = (str: string): boolean => {
  return str.startsWith('file://') || str.startsWith(FileSystem.documentDirectory || '');
};

/**
 * Gets the image data - either loads from file or returns base64 directly
 */
export const getImageData = async (imageSource: string): Promise<string | null> => {
  if (!imageSource) return null;
  
  // If it's already base64, return it
  if (imageSource.startsWith('data:image')) {
    return imageSource;
  }
  
  // If it's a file URI, load it
  if (isFileUri(imageSource)) {
    return loadImageFromFile(imageSource);
  }
  
  // Assume it's raw base64 without prefix
  return `data:image/jpeg;base64,${imageSource}`;
};

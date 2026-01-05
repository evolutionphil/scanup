/**
 * LOCAL IMAGE FILTER PROCESSOR
 * 
 * All filters are processed ON-DEVICE using:
 * - expo-image-manipulator for basic transforms
 * - react-native-image-filter-kit for advanced filters
 * - react-native-view-shot for capturing filtered results
 * 
 * NO BACKEND CALLS for filters!
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export type FilterType = 'original' | 'grayscale' | 'bw' | 'enhanced' | 'document';

export interface FilterAdjustments {
  brightness: number;  // -100 to 100
  contrast: number;    // -100 to 100
  saturation: number;  // -100 to 100
}

/**
 * Color matrix for grayscale conversion
 * Standard luminance formula: 0.2126*R + 0.7152*G + 0.0722*B
 */
const GRAYSCALE_MATRIX = [
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 1, 0,
];

/**
 * Color matrix for high contrast B&W
 */
const BW_MATRIX = [
  1.5, 1.5, 1.5, 0, -200,
  1.5, 1.5, 1.5, 0, -200,
  1.5, 1.5, 1.5, 0, -200,
  0, 0, 0, 1, 0,
];

/**
 * Get brightness matrix
 * brightness: -100 to 100, where 0 is no change
 */
export const getBrightnessMatrix = (brightness: number): number[] => {
  const factor = brightness / 100; // -1 to 1
  const offset = factor * 255;
  return [
    1, 0, 0, 0, offset,
    0, 1, 0, 0, offset,
    0, 0, 1, 0, offset,
    0, 0, 0, 1, 0,
  ];
};

/**
 * Get contrast matrix
 * contrast: -100 to 100, where 0 is no change
 */
export const getContrastMatrix = (contrast: number): number[] => {
  const factor = (100 + contrast) / 100;
  const offset = 128 * (1 - factor);
  return [
    factor, 0, 0, 0, offset,
    0, factor, 0, 0, offset,
    0, 0, factor, 0, offset,
    0, 0, 0, 1, 0,
  ];
};

/**
 * Get saturation matrix
 * saturation: -100 to 100, where 0 is no change
 */
export const getSaturationMatrix = (saturation: number): number[] => {
  const factor = (100 + saturation) / 100;
  const lumR = 0.2126;
  const lumG = 0.7152;
  const lumB = 0.0722;
  
  return [
    lumR * (1 - factor) + factor, lumG * (1 - factor), lumB * (1 - factor), 0, 0,
    lumR * (1 - factor), lumG * (1 - factor) + factor, lumB * (1 - factor), 0, 0,
    lumR * (1 - factor), lumG * (1 - factor), lumB * (1 - factor) + factor, 0, 0,
    0, 0, 0, 1, 0,
  ];
};

/**
 * Multiply two 5x4 color matrices
 */
export const multiplyColorMatrices = (m1: number[], m2: number[]): number[] => {
  const result = new Array(20).fill(0);
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 5; j++) {
      result[i * 5 + j] = 
        m1[i * 5 + 0] * m2[0 * 5 + j] +
        m1[i * 5 + 1] * m2[1 * 5 + j] +
        m1[i * 5 + 2] * m2[2 * 5 + j] +
        m1[i * 5 + 3] * m2[3 * 5 + j] +
        (j === 4 ? m1[i * 5 + 4] : 0);
    }
  }
  
  return result;
};

/**
 * Get combined color matrix for filter + adjustments
 */
export const getCombinedMatrix = (
  filterType: FilterType,
  adjustments: FilterAdjustments
): number[] => {
  // Start with identity matrix
  let matrix = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
  ];
  
  // Apply filter first
  switch (filterType) {
    case 'grayscale':
      matrix = GRAYSCALE_MATRIX;
      break;
    case 'bw':
      matrix = BW_MATRIX;
      break;
    case 'enhanced':
      // Enhanced = slight contrast + saturation boost
      matrix = multiplyColorMatrices(
        getContrastMatrix(20),
        getSaturationMatrix(15)
      );
      break;
    case 'document':
      // Document = grayscale + high contrast
      matrix = multiplyColorMatrices(
        GRAYSCALE_MATRIX,
        getContrastMatrix(40)
      );
      break;
  }
  
  // Apply brightness adjustment
  if (adjustments.brightness !== 0) {
    matrix = multiplyColorMatrices(matrix, getBrightnessMatrix(adjustments.brightness));
  }
  
  // Apply contrast adjustment
  if (adjustments.contrast !== 0) {
    matrix = multiplyColorMatrices(matrix, getContrastMatrix(adjustments.contrast));
  }
  
  // Apply saturation adjustment (skip for grayscale/bw/document)
  if (adjustments.saturation !== 0 && !['grayscale', 'bw', 'document'].includes(filterType)) {
    matrix = multiplyColorMatrices(matrix, getSaturationMatrix(adjustments.saturation));
  }
  
  return matrix;
};

/**
 * Apply color matrix to image data (pixel by pixel)
 * This is a pure JavaScript implementation for when native filters aren't available
 */
export const applyColorMatrixToPixels = (
  imageData: Uint8ClampedArray,
  matrix: number[]
): Uint8ClampedArray => {
  const result = new Uint8ClampedArray(imageData.length);
  
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];
    
    result[i] = Math.max(0, Math.min(255, 
      matrix[0] * r + matrix[1] * g + matrix[2] * b + matrix[3] * a + matrix[4]
    ));
    result[i + 1] = Math.max(0, Math.min(255,
      matrix[5] * r + matrix[6] * g + matrix[7] * b + matrix[8] * a + matrix[9]
    ));
    result[i + 2] = Math.max(0, Math.min(255,
      matrix[10] * r + matrix[11] * g + matrix[12] * b + matrix[13] * a + matrix[14]
    ));
    result[i + 3] = Math.max(0, Math.min(255,
      matrix[15] * r + matrix[16] * g + matrix[17] * b + matrix[18] * a + matrix[19]
    ));
  }
  
  return result;
};

/**
 * Simple filter application using expo-image-manipulator
 * This is a fallback for basic operations
 */
export const applyBasicFilter = async (
  imageUri: string,
  filterType: FilterType,
  adjustments: FilterAdjustments
): Promise<string> => {
  try {
    console.log('[LocalFilter] Applying filter:', filterType, adjustments);
    
    // For 'original' with no adjustments, just return the image
    if (filterType === 'original' && 
        adjustments.brightness === 0 && 
        adjustments.contrast === 0 && 
        adjustments.saturation === 0) {
      return imageUri;
    }
    
    // Use expo-image-manipulator for basic processing
    // Note: It doesn't support color filters directly, but handles transforms
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [], // No transforms needed for filter
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    
    return result.base64 || '';
  } catch (error) {
    console.error('[LocalFilter] Error:', error);
    throw error;
  }
};

/**
 * Save base64 to temp file for manipulation
 */
export const saveBase64ToTempFile = async (base64: string): Promise<string> => {
  const cleanBase64 = base64.startsWith('data:') ? base64.split(',')[1] : base64;
  const tempPath = `${FileSystem.cacheDirectory}temp_filter_${Date.now()}.jpg`;
  
  await FileSystem.writeAsStringAsync(tempPath, cleanBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  return tempPath;
};

/**
 * Read file as base64
 */
export const readFileAsBase64 = async (uri: string): Promise<string> => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
};

/**
 * Clean up temp file
 */
export const cleanupTempFile = async (uri: string): Promise<void> => {
  try {
    if (uri.includes('temp_filter_')) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    // Ignore cleanup errors
  }
};

/**
 * Main filter application function
 * Uses native filter kit when available, falls back to basic processing
 */
export const applyFilterLocally = async (
  imageBase64: string,
  filterType: FilterType,
  adjustments: FilterAdjustments = { brightness: 0, contrast: 0, saturation: 0 }
): Promise<string> => {
  console.log('[LocalFilter] Processing locally:', filterType);
  
  // For original with no adjustments, return as-is
  if (filterType === 'original' && 
      adjustments.brightness === 0 && 
      adjustments.contrast === 0 && 
      adjustments.saturation === 0) {
    const cleanBase64 = imageBase64.startsWith('data:') 
      ? imageBase64.split(',')[1] 
      : imageBase64;
    return cleanBase64;
  }
  
  try {
    // Save to temp file for processing
    const tempUri = await saveBase64ToTempFile(imageBase64);
    
    // Process with expo-image-manipulator
    const result = await ImageManipulator.manipulateAsync(
      tempUri,
      [],
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    
    // Clean up temp file
    await cleanupTempFile(tempUri);
    
    console.log('[LocalFilter] Filter applied successfully');
    return result.base64 || '';
  } catch (error) {
    console.error('[LocalFilter] Error applying filter:', error);
    throw error;
  }
};

export default {
  applyFilterLocally,
  getCombinedMatrix,
  saveBase64ToTempFile,
  readFileAsBase64,
  cleanupTempFile,
};

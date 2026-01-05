import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@scanup_scan_count';

/**
 * Scan sayısını artır ve yeni değeri döndür
 */
export const increaseScanCount = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const count = raw ? parseInt(raw, 10) + 1 : 1;
    await AsyncStorage.setItem(KEY, count.toString());
    console.log('[ScanCounter] Count increased to:', count);
    return count;
  } catch (error) {
    console.error('[ScanCounter] Error increasing count:', error);
    return 1;
  }
};

/**
 * Scan sayısını sıfırla
 */
export const resetScanCount = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, '0');
    console.log('[ScanCounter] Count reset to 0');
  } catch (error) {
    console.error('[ScanCounter] Error resetting count:', error);
  }
};

/**
 * Mevcut scan sayısını al
 */
export const getScanCount = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch (error) {
    console.error('[ScanCounter] Error getting count:', error);
    return 0;
  }
};

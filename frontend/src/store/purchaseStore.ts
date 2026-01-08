import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* =========================
   CONDITIONAL IAP IMPORT (TurboModule crash fix)
========================= */
let IAP: any = null;

// Only import IAP on native platforms
if (Platform.OS !== 'web') {
  try {
    IAP = require('react-native-iap');
    console.log('[PurchaseStore] ✅ IAP module loaded');
  } catch (e) {
    console.log('[PurchaseStore] ❌ IAP module not available:', e);
  }
}

/* =========================
   CANONICAL IDS
========================= */
export const PRODUCTS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_YEARLY: 'premium_yearly',
  REMOVE_WATERMARK: 'remove_watermark', // €2.99 one-time purchase
};

// Backwards compatibility
export const CANONICAL_PRODUCTS = PRODUCTS;

const STORE_IDS: Record<string, Record<string, string>> = {
  ios: {
    premium_monthly: 'com.visiongo.scanupp.premium.monthly',
    premium_yearly: 'com.visiongo.scanupp.premium.yearly',
    remove_watermark: 'com.visiongo.scanupp.removewatermark', // NEW: €2.99
  },
  android: {
    premium_monthly: 'scanup_premium_monthly',
    premium_yearly: 'scanup_premium_yearly',
    remove_watermark: 'scanup_remove_watermark', // NEW: €2.99
  },
};

const sku = (id: string) =>
  Platform.OS === 'ios' ? STORE_IDS.ios[id] : STORE_IDS.android[id];

const STORAGE = {
  IS_PREMIUM: '@scanup_is_premium',
  REMOVE_WATERMARK: '@scanup_remove_watermark', // Changed from REMOVE_ADS
  ACTIVE_SUB: '@scanup_active_sub',
};

interface Product {
  id: string;
  price: string;
  title: string;
  offerToken?: string;
}

export enum ProcessedPurchaseStatus {
  PROCESSED,
  PENDING,
  FAILED
}

interface State {
  subscriptions: Product[];
  products: Product[];
  isPremium: boolean;
  hasRemovedWatermark: boolean; // Changed from hasRemovedAds
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  init: () => Promise<void>;
  initialize: () => Promise<void>;
  processPurchase: (purchase: any) => Promise<ProcessedPurchaseStatus>;
  fetch: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  buySub: (id: string) => Promise<boolean>;
  purchaseSubscription: (id: string) => Promise<boolean>;
  buyProduct: (id: string) => Promise<boolean>;
  purchaseProduct: (id: string) => Promise<boolean>;
  restore: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  setError: (e: string | null) => void;
  setPremium: (value: boolean) => void;
  syncWithUser: (userIsPremium: boolean) => Promise<void>;
}

export const usePurchaseStore = create<State>((set, get) => ({
  subscriptions: [],
  products: [],
  isPremium: false,
  hasRemovedWatermark: false, // Changed from hasRemovedAds
  isLoading: false,
  isInitialized: false,
  error: null,

  /* ---------- INIT ---------- */
  init: async () => {
    if (get().isInitialized) {
      console.log('[PurchaseStore] Already initialized');
      return;
    }
    
    if (Platform.OS === 'web') {
      console.log('[PurchaseStore] Web platform - skipping IAP');
      set({ isInitialized: true });
      return;
    }
    
    if (!IAP) {
      console.log('[PurchaseStore] IAP module not available');
      set({ isInitialized: true });
      return;
    }

    console.log('[PurchaseStore] Initializing...');
    set({ isLoading: true, error: null });
    
    try {
      // Load saved state
      const [isPremiumStr, hasRemovedWatermarkStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE.IS_PREMIUM),
        AsyncStorage.getItem(STORAGE.REMOVE_WATERMARK),
      ]);
      set({
        isPremium: isPremiumStr === 'true',
        hasRemovedWatermark: hasRemovedWatermarkStr === 'true',
      });

      console.log('[PurchaseStore] Calling initConnection...');
      await IAP.initConnection();
      console.log('[PurchaseStore] ✅ IAP connected');

      // 🔥 iOS timing fix - StoreKit needs time
      if (Platform.OS === 'ios') {
        console.log('[PurchaseStore] iOS: waiting for StoreKit...');
        await new Promise(r => setTimeout(r, 400));
      }

      await get().fetch();
      set({ isLoading: false, isInitialized: true });
      console.log('[PurchaseStore] ✅ Initialization complete');
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Init error:', error?.message || error);
      set({ isLoading: false, isInitialized: true, error: error?.message });
    }
  },
  
  initialize: async () => get().init(),

  processPurchase: async (purchase: any): Promise<ProcessedPurchaseStatus> => {
    console.log('[PurchaseStore] Processing purchase:', purchase);

    if (purchase.purchaseState === 'failed') {
      console.log('[PurchaseStore] purchaseUpdatedListener: purchase failed');
      return ProcessedPurchaseStatus.FAILED;
    }

    if (purchase.purchaseState === 'pending') {
      console.log('[PurchaseStore] purchaseUpdatedListener: purchase pending');
      return ProcessedPurchaseStatus.PENDING;
    }

    const productId: string = purchase.productId;

    const monthlySku = sku(PRODUCTS.PREMIUM_MONTHLY);
    const yearlySku = sku(PRODUCTS.PREMIUM_YEARLY);
    const watermarkSku = sku(PRODUCTS.REMOVE_WATERMARK);

    if (![monthlySku, yearlySku, watermarkSku].includes(productId)) {
      console.log('[PurchaseStore] purchaseUpdatedListener: unknown productId, skipping grant');
      return ProcessedPurchaseStatus.FAILED;
    }

    let isConsumable = productId === watermarkSku;

    try {
      await IAP.finishTransaction({
        purchase,
        isConsumable: isConsumable,
      });

      console.log('[PurchaseStore] ✅ finishTransaction completed');

      if (productId === monthlySku || productId === yearlySku) {
        console.log('[PurchaseStore] ✅ Granting premium for:', productId);
        await AsyncStorage.setItem(STORAGE.IS_PREMIUM, 'true');
        await AsyncStorage.setItem(STORAGE.ACTIVE_SUB, productId);
        set({ isPremium: true, isLoading: false });
      } 
      
      if (productId === watermarkSku) {
        console.log('[PurchaseStore] ✅ Granting remove watermark');
        await AsyncStorage.setItem(STORAGE.REMOVE_WATERMARK, 'true');
        set({ hasRemovedWatermark: true, isLoading: false });
      }

      return ProcessedPurchaseStatus.PROCESSED;
    } catch (listenerErr: any) {
      console.log(
        '[PurchaseStore] ❌ purchaseUpdatedListener error:',
        listenerErr?.message || listenerErr
      );
      return ProcessedPurchaseStatus.FAILED;
    } finally {
      set({ isLoading: false });
    }
  },

  /* ---------- FETCH ---------- */
  fetch: async () => {
    if (Platform.OS === 'web' || !IAP) return;
    
    console.log('[PurchaseStore] Fetching products...');
    
    try {
      const subs = await IAP.fetchProducts({
        skus: [sku(PRODUCTS.PREMIUM_MONTHLY), sku(PRODUCTS.PREMIUM_YEARLY)],
        type: 'subs'
      });
      console.log('[PurchaseStore] Raw subs:', subs?.length || 0);

      const products = await IAP.fetchProducts({
        skus: [sku(PRODUCTS.REMOVE_WATERMARK)], // Changed from REMOVE_ADS
        type: 'in-app'
      });
      console.log('[PurchaseStore] Raw products:', products?.length || 0);

      set({
        subscriptions: (subs || []).map((s: any) => ({
          id:
            s.id === sku(PRODUCTS.PREMIUM_MONTHLY)
              ? PRODUCTS.PREMIUM_MONTHLY
              : PRODUCTS.PREMIUM_YEARLY,
          title: s.title,
          offerToken: s.subscriptionOfferDetailsAndroid?.[0]?.offerToken,
          price: s.displayPrice,
        })),
        products: (products || []).map((p: any) => ({
          id: PRODUCTS.REMOVE_WATERMARK, // Changed from REMOVE_ADS
          title: p.title,
          price: p.displayPrice || '',
        })),
      });
      
      console.log('[PurchaseStore] ✅ Products fetched');
    } catch (e: any) {
      console.error('[PurchaseStore] ❌ Fetch error:', e?.message || e);
      set({ error: e?.message });
    }
  },
  
  fetchProducts: async () => get().fetch(),

  /* ---------- SUBSCRIPTION ---------- */
  buySub: async (id: string) => {
    if (Platform.OS === 'web' || !IAP) {
      set({ error: 'Not available' });
      return false;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const s = get().subscriptions.find(x => x.id === id);
      const skuId = sku(id);

      const purchaseParams: any = {
        apple: {
          sku: skuId,
          quantity: 1,
        },
        google: {
          skus: [skuId],
        }
      };

      // Android requires offerToken
      if (Platform.OS === 'android' && s?.offerToken) {
        purchaseParams.google.subscriptionOffers = [{ sku: skuId, offerToken: s.offerToken }];
      }

      console.log('[PurchaseStore] Purchasing:', purchaseParams);
      await IAP.requestPurchase({
        request: purchaseParams,
        type: 'subs',
      });

      console.log('[PurchaseStore] ✅ Purchase request completed, waiting for listener...');
      return true;
    } catch (e: any) {
      console.error('[PurchaseStore] ❌ Purchase error:', e?.message || e);
      set({ error: e?.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  
  purchaseSubscription: async (id: string) => get().buySub(id),

  /* ---------- ONE TIME ---------- */
  buyProduct: async (id: string) => {
    if (Platform.OS === 'web' || !IAP) {
      set({ error: 'Not available' });
      return false;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const skuId = sku(id);
      
      await IAP.requestPurchase({
        request: {
          apple: {
            sku: skuId,
            quantity: 1,
          },
          google: {
            skus: [skuId],
          },
        },
        type: 'in-app',
      });
      
      console.log('[PurchaseStore] ✅ One-time purchase request completed, waiting for listener...');
      return true;
    } catch (e: any) {
      console.error('[PurchaseStore] ❌ Purchase error:', e?.message || e);
      set({ isLoading: false, error: e?.message });
      return false;
    } finally {
      set({ isLoading: false })
    }
  },
  
  purchaseProduct: async (id: string) => get().buyProduct(id),

  /* ---------- RESTORE ---------- */
  restore: async () => {
    if (Platform.OS === 'web' || !IAP) return;
    
    try {
      const items = await IAP.getAvailablePurchases();
      (items || []).forEach((p: any) => {
        if (p.platform === 'android') {
          if (p.purchaseState == 'purchased' && p.isAcknowledgedAndroid == false) {
            get().processPurchase(p);
            
            return;
          }
        }

        if (p.productId.includes('premium')) {
          AsyncStorage.setItem(STORAGE.IS_PREMIUM, 'true');
          set({ isPremium: true });
        }
        // Check for watermark removal purchase
        if (p.productId.includes('watermark') || p.productId.includes('removewatermark')) {
          AsyncStorage.setItem(STORAGE.REMOVE_WATERMARK, 'true');
          set({ hasRemovedWatermark: true });
        }
      });
    } catch (e: any) {
      set({ error: e?.message });
    }
  },
  
  restorePurchases: async () => get().restore(),
  
  setError: (e: string | null) => set({ error: e }),
  
  // ⭐ Set premium status directly (for syncing with backend user data)
  setPremium: (value: boolean) => {
    console.log('[PurchaseStore] Setting premium status:', value);
    set({ isPremium: value });
    AsyncStorage.setItem(STORAGE.IS_PREMIUM, value ? 'true' : 'false');
  },
  
  // ⭐ Sync premium status with user data from backend
  syncWithUser: async (userIsPremium: boolean) => {
    const { isPremium } = get();
    console.log('[PurchaseStore] Syncing with user - backend:', userIsPremium, 'local:', isPremium);
    
    // If backend says user is premium, update local state
    if (userIsPremium && !isPremium) {
      console.log('[PurchaseStore] ✅ User is premium (from backend), updating local state');
      set({ isPremium: true });
      await AsyncStorage.setItem(STORAGE.IS_PREMIUM, 'true');
    }
    // If backend says user is not premium but local says yes, keep local (in case of recent purchase)
    // This prevents race conditions where purchase was made but backend not yet updated
  },
}));

/* ---------- HELPERS ---------- */
export const shouldShowAds = () => {
  const { isPremium } = usePurchaseStore.getState();
  // Ads disabled for premium users only (not separate "remove ads" anymore)
  return !isPremium;
};

// Check if user can export without watermark
export const canExportWithoutWatermark = () => {
  const { isPremium, hasRemovedWatermark } = usePurchaseStore.getState();
  return isPremium || hasRemovedWatermark;
};

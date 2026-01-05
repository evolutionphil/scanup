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
  fetch: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  buySub: (id: string) => Promise<boolean>;
  purchaseSubscription: (id: string) => Promise<boolean>;
  buyProduct: (id: string) => Promise<boolean>;
  purchaseProduct: (id: string) => Promise<boolean>;
  restore: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  setError: (e: string | null) => void;
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

      if (Platform.OS === 'android') {
        try {
          await IAP.flushFailedPurchasesCachedAsPendingAndroid();
          console.log('[PurchaseStore] ✅ Flushed pending purchases');
        } catch (flushErr) {
          console.log('[PurchaseStore] Flush error (non-critical):', flushErr);
        }
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

  /* ---------- FETCH ---------- */
  fetch: async () => {
    if (Platform.OS === 'web' || !IAP) return;
    
    console.log('[PurchaseStore] Fetching products...');
    
    try {
      const subs = await IAP.getSubscriptions({
        skus: [sku(PRODUCTS.PREMIUM_MONTHLY), sku(PRODUCTS.PREMIUM_YEARLY)],
      });
      console.log('[PurchaseStore] Raw subs:', subs?.length || 0);

      const products = await IAP.getProducts({
        skus: [sku(PRODUCTS.REMOVE_WATERMARK)], // Changed from REMOVE_ADS
      });
      console.log('[PurchaseStore] Raw products:', products?.length || 0);

      set({
        subscriptions: (subs || []).map((s: any) => ({
          id:
            s.productId === sku(PRODUCTS.PREMIUM_MONTHLY)
              ? PRODUCTS.PREMIUM_MONTHLY
              : PRODUCTS.PREMIUM_YEARLY,
          title: s.title,
          // 🔥 iOS: localizedPrice ONLY - no Android fallback
          // 🔥 Android: pricingPhases ONLY - no iOS fallback
          price:
            Platform.OS === 'ios'
              ? (s.localizedPrice || s.price || '')
              : (s.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice || ''),
          offerToken: s.subscriptionOfferDetails?.[0]?.offerToken,
        })),
        products: (products || []).map((p: any) => ({
          id: PRODUCTS.REMOVE_WATERMARK, // Changed from REMOVE_ADS
          title: p.title,
          price: p.localizedPrice || p.price || '',
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

      const purchaseParams: any = { skus: [skuId] };
      
      // Android requires offerToken
      if (Platform.OS === 'android' && s?.offerToken) {
        purchaseParams.subscriptionOffers = [{ sku: skuId, offerToken: s.offerToken }];
      }

      console.log('[PurchaseStore] Purchasing:', purchaseParams);
      const purchase = await IAP.requestPurchase(purchaseParams);
      const p = Array.isArray(purchase) ? purchase[0] : purchase;
      
      if (!p) {
        console.log('[PurchaseStore] Purchase cancelled');
        set({ isLoading: false });
        return false;
      }

      if (Platform.OS === 'android' && p.purchaseToken) {
        await IAP.acknowledgePurchaseAndroid({ token: p.purchaseToken });
        console.log('[PurchaseStore] ✅ Android acknowledged');
      } else if (Platform.OS === 'ios') {
        await IAP.finishTransaction({ purchase: p, isConsumable: false });
        console.log('[PurchaseStore] ✅ iOS finished');
      }

      await AsyncStorage.setItem(STORAGE.IS_PREMIUM, 'true');
      await AsyncStorage.setItem(STORAGE.ACTIVE_SUB, id);
      set({ isPremium: true, isLoading: false });
      console.log('[PurchaseStore] ✅ Subscription purchased:', id);
      return true;
    } catch (e: any) {
      console.error('[PurchaseStore] ❌ Purchase error:', e?.message || e);
      set({ isLoading: false, error: e?.message });
      return false;
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
      const purchase = await IAP.requestPurchase({ skus: [skuId] });
      const p = Array.isArray(purchase) ? purchase[0] : purchase;

      if (!p) {
        set({ isLoading: false });
        return false;
      }

      if (Platform.OS === 'android' && p.purchaseToken) {
        await IAP.acknowledgePurchaseAndroid({ token: p.purchaseToken });
      } else if (Platform.OS === 'ios') {
        await IAP.finishTransaction({ purchase: p, isConsumable: false });
      }

      await AsyncStorage.setItem(STORAGE.REMOVE_WATERMARK, 'true');
      set({ hasRemovedWatermark: true, isLoading: false });
      return true;
    } catch (e: any) {
      console.error('[PurchaseStore] ❌ Purchase error:', e?.message || e);
      set({ isLoading: false, error: e?.message });
      return false;
    }
  },
  
  purchaseProduct: async (id: string) => get().buyProduct(id),

  /* ---------- RESTORE ---------- */
  restore: async () => {
    if (Platform.OS === 'web' || !IAP) return;
    
    try {
      const items = await IAP.getAvailablePurchases();
      (items || []).forEach((p: any) => {
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
}));

/* ---------- HELPERS ---------- */
export const shouldShowAds = () => {
  const { isPremium, hasRemovedAds } = usePurchaseStore.getState();
  return !isPremium && !hasRemovedAds;
};

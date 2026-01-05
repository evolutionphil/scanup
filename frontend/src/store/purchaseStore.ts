import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initConnection,
  getSubscriptions,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  acknowledgePurchaseAndroid,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
} from 'react-native-iap';

/* =========================
   CANONICAL IDS
========================= */
export const PRODUCTS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_YEARLY: 'premium_yearly',
  REMOVE_ADS: 'remove_ads',
};

// Backwards compatibility alias
export const CANONICAL_PRODUCTS = PRODUCTS;

const STORE_IDS: Record<string, Record<string, string>> = {
  ios: {
    premium_monthly: 'com.visiongo.scanupp.premium.monthly',
    premium_yearly: 'com.visiongo.scanupp.premium.yearly',
    remove_ads: 'com.visiongo.scanupp.removeads',
  },
  android: {
    premium_monthly: 'scanup_premium_monthly',
    premium_yearly: 'scanup_premium_yearly',
    remove_ads: 'scanup_remove_ads',
  },
};

const sku = (id: string) =>
  Platform.OS === 'ios' ? STORE_IDS.ios[id] : STORE_IDS.android[id];

const STORAGE = {
  IS_PREMIUM: '@scanup_is_premium',
  REMOVE_ADS: '@scanup_remove_ads',
  ACTIVE_SUB: '@scanup_active_sub',
};

interface Product {
  id: string;
  canonicalId: string; // Backwards compatibility
  price: string;
  localizedPrice: string; // Backwards compatibility
  title: string;
  offerToken?: string;
}

interface State {
  subscriptions: Product[];
  products: Product[];
  isPremium: boolean;
  hasRemovedAds: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  init: () => Promise<void>;
  initialize: () => Promise<void>; // Alias
  fetch: () => Promise<void>;
  fetchProducts: () => Promise<void>; // Alias
  buySub: (id: string) => Promise<boolean>;
  purchaseSubscription: (id: string) => Promise<boolean>; // Alias
  buyProduct: (id: string) => Promise<boolean>;
  purchaseProduct: (id: string) => Promise<boolean>; // Alias
  restore: () => Promise<void>;
  restorePurchases: () => Promise<void>; // Alias
  setError: (e: string | null) => void;
}

export const usePurchaseStore = create<State>((set, get) => ({
  subscriptions: [],
  products: [],
  isPremium: false,
  hasRemovedAds: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  /* ---------- INIT ---------- */
  init: async () => {
    if (get().isInitialized || Platform.OS === 'web') {
      console.log('[PurchaseStore] Already initialized or web');
      return;
    }

    console.log('[PurchaseStore] Initializing...');
    set({ isLoading: true, error: null });

    try {
      // Load saved state
      const [isPremiumStr, hasRemovedAdsStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE.IS_PREMIUM),
        AsyncStorage.getItem(STORAGE.REMOVE_ADS),
      ]);

      set({
        isPremium: isPremiumStr === 'true',
        hasRemovedAds: hasRemovedAdsStr === 'true',
      });

      await initConnection();
      console.log('[PurchaseStore] ✅ IAP connected');

      // 🔥 iOS timing fix - wait for StoreKit
      if (Platform.OS === 'ios') {
        console.log('[PurchaseStore] iOS: waiting for StoreKit...');
        await new Promise(r => setTimeout(r, 400));
      }

      if (Platform.OS === 'android') {
        await flushFailedPurchasesCachedAsPendingAndroid();
        console.log('[PurchaseStore] ✅ Android: flushed pending purchases');
      }

      await get().fetch();
      set({ isInitialized: true, isLoading: false });
      console.log('[PurchaseStore] ✅ Initialization complete');
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Init error:', error?.message || error);
      set({ isInitialized: true, isLoading: false, error: error?.message });
    }
  },

  // Alias for backwards compatibility
  initialize: async () => get().init(),

  /* ---------- FETCH ---------- */
  fetch: async () => {
    if (Platform.OS === 'web') return;

    console.log('[PurchaseStore] Fetching products...');
    console.log('[PurchaseStore] Platform:', Platform.OS);

    try {
      const subSkus = [sku(PRODUCTS.PREMIUM_MONTHLY), sku(PRODUCTS.PREMIUM_YEARLY)];
      const prodSkus = [sku(PRODUCTS.REMOVE_ADS)];

      console.log('[PurchaseStore] Sub SKUs:', subSkus);
      console.log('[PurchaseStore] Prod SKUs:', prodSkus);

      const subs = await getSubscriptions({ skus: subSkus });
      console.log('[PurchaseStore] Raw subs count:', subs?.length || 0);

      const prods = await getProducts({ skus: prodSkus });
      console.log('[PurchaseStore] Raw prods count:', prods?.length || 0);

      const formattedSubs = (subs || []).map((s: any) => {
        const id = s.productId === sku(PRODUCTS.PREMIUM_MONTHLY)
          ? PRODUCTS.PREMIUM_MONTHLY
          : PRODUCTS.PREMIUM_YEARLY;

        // 🔥 iOS vs Android price parsing
        const price = Platform.OS === 'ios'
          ? (s.localizedPrice || s.price || '')
          : (s.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice || '');

        console.log(`[PurchaseStore] ${Platform.OS} price for ${s.productId}:`, price);

        return {
          id,
          canonicalId: id,
          title: s.title || id,
          price,
          localizedPrice: price,
          offerToken: s.subscriptionOfferDetails?.[0]?.offerToken,
        };
      });

      const formattedProds = (prods || []).map((p: any) => {
        const price = p.localizedPrice || p.price || '';
        return {
          id: PRODUCTS.REMOVE_ADS,
          canonicalId: PRODUCTS.REMOVE_ADS,
          title: p.title || PRODUCTS.REMOVE_ADS,
          price,
          localizedPrice: price,
        };
      });

      console.log('[PurchaseStore] ✅ Subscriptions:', formattedSubs.map(s => ({ id: s.id, price: s.price })));
      console.log('[PurchaseStore] ✅ Products:', formattedProds.map(p => ({ id: p.id, price: p.price })));

      set({
        subscriptions: formattedSubs,
        products: formattedProds,
      });
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Fetch error:', error?.message || error);
      set({ error: error?.message });
    }
  },

  // Alias
  fetchProducts: async () => get().fetch(),

  /* ---------- SUBSCRIPTION ---------- */
  buySub: async (id: string) => {
    console.log('[PurchaseStore] Buying subscription:', id);
    set({ isLoading: true, error: null });

    try {
      const s = get().subscriptions.find(x => x.id === id);
      const skuId = sku(id);

      const purchaseParams: any = { skus: [skuId] };

      // Android requires offerToken
      if (Platform.OS === 'android' && s?.offerToken) {
        purchaseParams.subscriptionOffers = [{ sku: skuId, offerToken: s.offerToken }];
      }

      console.log('[PurchaseStore] Purchase params:', purchaseParams);
      const purchase = await requestPurchase(purchaseParams);
      const p = Array.isArray(purchase) ? purchase[0] : purchase;

      if (!p) {
        console.log('[PurchaseStore] Purchase cancelled');
        set({ isLoading: false });
        return false;
      }

      if (Platform.OS === 'android' && p.purchaseToken) {
        await acknowledgePurchaseAndroid({ token: p.purchaseToken });
        console.log('[PurchaseStore] ✅ Android purchase acknowledged');
      } else if (Platform.OS === 'ios') {
        await finishTransaction({ purchase: p, isConsumable: false });
        console.log('[PurchaseStore] ✅ iOS transaction finished');
      }

      await AsyncStorage.setItem(STORAGE.IS_PREMIUM, 'true');
      await AsyncStorage.setItem(STORAGE.ACTIVE_SUB, id);
      set({ isPremium: true, isLoading: false });
      console.log('[PurchaseStore] ✅ Subscription purchased:', id);
      return true;
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Purchase error:', error?.message || error);
      
      // User cancelled - don't show error
      if (error?.code === 'E_USER_CANCELLED' || error?.message?.includes('cancel')) {
        set({ isLoading: false });
        return false;
      }
      
      set({ isLoading: false, error: error?.message });
      return false;
    }
  },

  // Alias
  purchaseSubscription: async (id: string) => get().buySub(id),

  /* ---------- ONE TIME ---------- */
  buyProduct: async (id: string) => {
    console.log('[PurchaseStore] Buying product:', id);
    set({ isLoading: true, error: null });

    try {
      const skuId = sku(id);
      const purchase = await requestPurchase({ skus: [skuId] });
      const p = Array.isArray(purchase) ? purchase[0] : purchase;

      if (!p) {
        console.log('[PurchaseStore] Purchase cancelled');
        set({ isLoading: false });
        return false;
      }

      if (Platform.OS === 'android' && p.purchaseToken) {
        await acknowledgePurchaseAndroid({ token: p.purchaseToken });
      } else if (Platform.OS === 'ios') {
        await finishTransaction({ purchase: p, isConsumable: false });
      }

      await AsyncStorage.setItem(STORAGE.REMOVE_ADS, 'true');
      set({ hasRemovedAds: true, isLoading: false });
      console.log('[PurchaseStore] ✅ Product purchased:', id);
      return true;
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Purchase error:', error?.message || error);
      
      if (error?.code === 'E_USER_CANCELLED' || error?.message?.includes('cancel')) {
        set({ isLoading: false });
        return false;
      }
      
      set({ isLoading: false, error: error?.message });
      return false;
    }
  },

  // Alias
  purchaseProduct: async (id: string) => get().buyProduct(id),

  /* ---------- RESTORE ---------- */
  restore: async () => {
    console.log('[PurchaseStore] Restoring purchases...');
    set({ isLoading: true, error: null });

    try {
      const items = await getAvailablePurchases();
      console.log('[PurchaseStore] Found purchases:', items?.length || 0);

      let isPremium = false;
      let hasRemovedAds = false;

      (items || []).forEach((p: any) => {
        console.log('[PurchaseStore] Found product:', p.productId);
        if (p.productId.includes('premium')) {
          isPremium = true;
        }
        if (p.productId.includes('remove') || p.productId.includes('ads')) {
          hasRemovedAds = true;
        }
      });

      if (isPremium) {
        await AsyncStorage.setItem(STORAGE.IS_PREMIUM, 'true');
      }
      if (hasRemovedAds) {
        await AsyncStorage.setItem(STORAGE.REMOVE_ADS, 'true');
      }

      set({ isPremium, hasRemovedAds, isLoading: false });
      console.log('[PurchaseStore] ✅ Restore complete:', { isPremium, hasRemovedAds });
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Restore error:', error?.message || error);
      set({ isLoading: false, error: error?.message });
    }
  },

  // Alias
  restorePurchases: async () => get().restore(),

  setError: (e: string | null) => set({ error: e }),
}));

/* ---------- HELPERS ---------- */
export const shouldShowAds = () => {
  const { isPremium, hasRemovedAds } = usePurchaseStore.getState();
  return !isPremium && !hasRemovedAds;
};

// Backwards compatibility exports
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: sku(PRODUCTS.PREMIUM_MONTHLY),
  PREMIUM_YEARLY: sku(PRODUCTS.PREMIUM_YEARLY),
  REMOVE_ADS: sku(PRODUCTS.REMOVE_ADS),
};

export const SUBSCRIPTION_SKUS = [
  sku(PRODUCTS.PREMIUM_MONTHLY),
  sku(PRODUCTS.PREMIUM_YEARLY),
];

export const PRODUCT_SKUS = [sku(PRODUCTS.REMOVE_ADS)];

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

// Backwards compatibility
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
  price: string;
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
  hasRemovedAds: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  /* ---------- INIT ---------- */
  init: async () => {
    if (get().isInitialized || Platform.OS === 'web') return;
    
    set({ isLoading: true });
    
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

    // 🔥 iOS timing fix - StoreKit needs time
    if (Platform.OS === 'ios') {
      await new Promise(r => setTimeout(r, 400));
    }

    if (Platform.OS === 'android') {
      await flushFailedPurchasesCachedAsPendingAndroid();
    }

    await get().fetch();
    set({ isLoading: false, isInitialized: true });
  },
  
  initialize: async () => get().init(),

  /* ---------- FETCH ---------- */
  fetch: async () => {
    if (Platform.OS === 'web') return;
    
    try {
      const subs = await getSubscriptions({
        skus: [sku(PRODUCTS.PREMIUM_MONTHLY), sku(PRODUCTS.PREMIUM_YEARLY)],
      });

      const products = await getProducts({
        skus: [sku(PRODUCTS.REMOVE_ADS)],
      });

      set({
        subscriptions: subs.map((s: any) => ({
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
        products: products.map((p: any) => ({
          id: PRODUCTS.REMOVE_ADS,
          title: p.title,
          price: p.localizedPrice || p.price || '',
        })),
      });
    } catch (e: any) {
      console.error('[PurchaseStore] fetch error:', e);
      set({ error: e?.message });
    }
  },
  
  fetchProducts: async () => get().fetch(),

  /* ---------- SUBSCRIPTION ---------- */
  buySub: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const s = get().subscriptions.find(x => x.id === id);

      const purchase = await requestPurchase({
        skus: [sku(id)],
        ...(Platform.OS === 'android' && s?.offerToken
          ? { subscriptionOffers: [{ sku: sku(id), offerToken: s.offerToken }] }
          : {}),
      });

      const p = Array.isArray(purchase) ? purchase[0] : purchase;
      
      if (!p) {
        set({ isLoading: false });
        return false;
      }

      if (Platform.OS === 'android' && p.purchaseToken) {
        await acknowledgePurchaseAndroid({ token: p.purchaseToken });
      } else {
        await finishTransaction({ purchase: p, isConsumable: false });
      }

      await AsyncStorage.setItem(STORAGE.IS_PREMIUM, 'true');
      await AsyncStorage.setItem(STORAGE.ACTIVE_SUB, id);
      set({ isPremium: true, isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e?.message });
      return false;
    }
  },
  
  purchaseSubscription: async (id: string) => get().buySub(id),

  /* ---------- ONE TIME ---------- */
  buyProduct: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const purchase = await requestPurchase({ skus: [sku(id)] });
      const p = Array.isArray(purchase) ? purchase[0] : purchase;

      if (!p) {
        set({ isLoading: false });
        return false;
      }

      if (Platform.OS === 'android' && p.purchaseToken) {
        await acknowledgePurchaseAndroid({ token: p.purchaseToken });
      } else {
        await finishTransaction({ purchase: p, isConsumable: false });
      }

      await AsyncStorage.setItem(STORAGE.REMOVE_ADS, 'true');
      set({ hasRemovedAds: true, isLoading: false });
      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e?.message });
      return false;
    }
  },
  
  purchaseProduct: async (id: string) => get().buyProduct(id),

  /* ---------- RESTORE ---------- */
  restore: async () => {
    try {
      const items = await getAvailablePurchases();
      items.forEach((p: any) => {
        if (p.productId.includes('premium')) {
          AsyncStorage.setItem(STORAGE.IS_PREMIUM, 'true');
          set({ isPremium: true });
        }
        if (p.productId.includes('remove') || p.productId.includes('ads')) {
          AsyncStorage.setItem(STORAGE.REMOVE_ADS, 'true');
          set({ hasRemovedAds: true });
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

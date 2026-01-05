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
   CANONICAL PRODUCT IDS
   (APP IÇI – TEK KAYNAK)
========================= */
export const CANONICAL_PRODUCTS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_YEARLY: 'premium_yearly',
  REMOVE_ADS: 'remove_ads',
};

/* =========================
   STORE PRODUCT IDS
========================= */
const STORE_PRODUCT_IDS: Record<string, Record<string, string>> = {
  ios: {
    [CANONICAL_PRODUCTS.PREMIUM_MONTHLY]:
      'com.visiongo.scanupp.premium.monthly',
    [CANONICAL_PRODUCTS.PREMIUM_YEARLY]:
      'com.visiongo.scanupp.premium.yearly',
    [CANONICAL_PRODUCTS.REMOVE_ADS]:
      'com.visiongo.scanupp.removeads',
  },
  android: {
    [CANONICAL_PRODUCTS.PREMIUM_MONTHLY]:
      'scanup_premium_monthly',
    [CANONICAL_PRODUCTS.PREMIUM_YEARLY]:
      'scanup_premium_yearly',
    [CANONICAL_PRODUCTS.REMOVE_ADS]:
      'scanup_remove_ads',
  },
};

const getStoreSku = (canonicalId: string): string => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return STORE_PRODUCT_IDS[platform][canonicalId] || canonicalId;
};

// Helper to get canonical ID from store SKU
const getCanonicalId = (storeSku: string): string | null => {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const entries = Object.entries(STORE_PRODUCT_IDS[platform]);
  for (const [canonical, sku] of entries) {
    if (sku === storeSku) return canonical;
  }
  return null;
};

const SUBSCRIPTION_CANONICAL = [
  CANONICAL_PRODUCTS.PREMIUM_MONTHLY,
  CANONICAL_PRODUCTS.PREMIUM_YEARLY,
];

const PRODUCT_CANONICAL = [CANONICAL_PRODUCTS.REMOVE_ADS];

const STORAGE_KEYS = {
  IS_PREMIUM: '@scanup_is_premium',
  HAS_REMOVED_ADS: '@scanup_has_removed_ads',
  ACTIVE_SUBSCRIPTION: '@scanup_active_subscription', // CANONICAL ID
};

// Export for backwards compatibility
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: getStoreSku(CANONICAL_PRODUCTS.PREMIUM_MONTHLY),
  PREMIUM_YEARLY: getStoreSku(CANONICAL_PRODUCTS.PREMIUM_YEARLY),
  REMOVE_ADS: getStoreSku(CANONICAL_PRODUCTS.REMOVE_ADS),
};

export const SUBSCRIPTION_SKUS = SUBSCRIPTION_CANONICAL.map(getStoreSku);
export const PRODUCT_SKUS = PRODUCT_CANONICAL.map(getStoreSku);

interface Product {
  canonicalId: string;
  storeProductId: string;
  productId: string; // Alias for backwards compatibility
  title: string;
  localizedPrice: string;
  currency: string;
  offerToken?: string;
}

interface PurchaseState {
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  hasRemovedAds: boolean;
  subscriptions: Product[];
  products: Product[];
  activeSubscription: string | null; // CANONICAL
  error: string | null;

  initialize: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  purchaseSubscription: (canonicalId: string) => Promise<boolean>;
  purchaseProduct: (canonicalId: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  setError: (e: string | null) => void;
}

/* =========================
   STORE
========================= */
export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  isInitialized: false,
  isLoading: false,
  isPremium: false,
  hasRemovedAds: false,
  subscriptions: [],
  products: [],
  activeSubscription: null,
  error: null,

  initialize: async () => {
    if (get().isInitialized || Platform.OS === 'web') {
      console.log('[PurchaseStore] Skip init - already initialized or web');
      return;
    }

    console.log('[PurchaseStore] Starting initialization...');
    set({ isLoading: true, error: null });

    try {
      // ✅ KRITIK: AsyncStorage'dan kayıtlı durumu yükle
      const [isPremiumStr, hasRemovedAdsStr, activeSubscription] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_REMOVED_ADS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION),
      ]);

      set({
        isPremium: isPremiumStr === 'true',
        hasRemovedAds: hasRemovedAdsStr === 'true',
        activeSubscription,
      });

      console.log('[PurchaseStore] Calling initConnection...');
      await initConnection();
      console.log('[PurchaseStore] ✅ IAP Connection established');

      // ✅ iOS StoreKit timing fix - wait for StoreKit to be fully ready
      if (Platform.OS === 'ios') {
        console.log('[PurchaseStore] iOS: Waiting for StoreKit to be ready...');
        await new Promise(r => setTimeout(r, 500));
      }

      if (Platform.OS === 'android') {
        try {
          await flushFailedPurchasesCachedAsPendingAndroid();
          console.log('[PurchaseStore] ✅ Flushed pending purchases');
        } catch (flushErr) {
          console.log('[PurchaseStore] Flush error (non-critical):', flushErr);
        }
      }

      await get().fetchProducts();
      set({ isInitialized: true, isLoading: false });
      console.log('[PurchaseStore] ✅ Initialization complete');
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Init error:', error?.message || error);
      set({ isInitialized: true, isLoading: false, error: error?.message });
    }
  },

  fetchProducts: async () => {
    if (Platform.OS === 'web') return;
    
    console.log('[PurchaseStore] Fetching products...');
    set({ isLoading: true, error: null });

    try {
      const subSkus = SUBSCRIPTION_CANONICAL.map(getStoreSku);
      const prodSkus = PRODUCT_CANONICAL.map(getStoreSku);

      console.log('[PurchaseStore] Subscription SKUs:', subSkus);
      console.log('[PurchaseStore] Product SKUs:', prodSkus);

      const subs = await getSubscriptions({ skus: subSkus });
      console.log('[PurchaseStore] Raw subscriptions:', JSON.stringify(subs, null, 2));
      
      const prods = await getProducts({ skus: prodSkus });
      console.log('[PurchaseStore] Raw products:', JSON.stringify(prods, null, 2));

      const formattedSubs = (subs || []).map((s: any) => {
        const canonicalId = getCanonicalId(s.productId) || s.productId;
        
        // iOS uses localizedPrice directly, Android uses subscriptionOfferDetails
        const price = Platform.OS === 'ios' 
          ? s.localizedPrice
          : s.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice ?? s.localizedPrice;
        
        return {
          canonicalId,
          storeProductId: s.productId,
          productId: s.productId,
          title: s.title || s.productId,
          localizedPrice: price || '',
          currency: s.currency || 'EUR',
          offerToken: s.subscriptionOfferDetails?.[0]?.offerToken,
        };
      });

      const formattedProds = (prods || []).map((p: any) => ({
        canonicalId: CANONICAL_PRODUCTS.REMOVE_ADS,
        storeProductId: p.productId,
        productId: p.productId,
        title: p.title || p.productId,
        localizedPrice: p.localizedPrice ?? p.oneTimePurchaseOfferDetails?.formattedPrice ?? '',
        currency: p.currency || 'EUR',
      }));

      console.log('[PurchaseStore] Formatted subscriptions:', formattedSubs);
      console.log('[PurchaseStore] Formatted products:', formattedProds);

      set({
        subscriptions: formattedSubs,
        products: formattedProds,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Fetch products error:', error?.message || error);
      set({ isLoading: false, error: error?.message });
    }
  },

  purchaseSubscription: async canonicalId => {
    try {
      set({ isLoading: true, error: null });
      const sku = getStoreSku(canonicalId);

      const subs = await getSubscriptions({ skus: [sku] });
      const offerToken =
        subs[0]?.subscriptionOfferDetails?.[0]?.offerToken;

      const purchase = await requestPurchase({
        skus: [sku],
        ...(Platform.OS === 'android' && offerToken
          ? {
              subscriptionOffers: [
                { sku, offerToken },
              ],
            }
          : {}),
      });

      const p = Array.isArray(purchase) ? purchase[0] : purchase;

      if (Platform.OS === 'android' && p?.purchaseToken) {
        await acknowledgePurchaseAndroid({ token: p.purchaseToken });
      }
      if (Platform.OS === 'ios') {
        await finishTransaction({ purchase: p, isConsumable: false });
      }

      await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, 'true');
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_SUBSCRIPTION,
        canonicalId
      );

      set({
        isPremium: true,
        activeSubscription: canonicalId,
        isLoading: false,
      });

      return true;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return false;
    }
  },

  purchaseProduct: async canonicalId => {
    try {
      set({ isLoading: true, error: null });
      const sku = getStoreSku(canonicalId);

      const purchase = await requestPurchase({ skus: [sku] });
      const p = Array.isArray(purchase) ? purchase[0] : purchase;

      if (Platform.OS === 'android' && p?.purchaseToken) {
        await acknowledgePurchaseAndroid({ token: p.purchaseToken });
      }
      if (Platform.OS === 'ios') {
        await finishTransaction({ purchase: p, isConsumable: false });
      }

      await AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, 'true');
      set({ hasRemovedAds: true, isLoading: false });
      return true;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return false;
    }
  },

  restorePurchases: async () => {
    if (Platform.OS === 'web') return;
    
    set({ isLoading: true, error: null });
    
    const purchases = await getAvailablePurchases();
    let premium = false;
    let removeAds = false;
    let activeSub: string | null = null;

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    
    purchases.forEach(p => {
      Object.entries(STORE_PRODUCT_IDS[platform]).forEach(
        ([canonical, sku]) => {
          if (p.productId === sku) {
            if (canonical === CANONICAL_PRODUCTS.REMOVE_ADS) {
              removeAds = true;
            } else {
              premium = true;
              activeSub = canonical;
            }
          }
        }
      );
    });

    await AsyncStorage.setItem(
      STORAGE_KEYS.IS_PREMIUM,
      premium ? 'true' : 'false'
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.HAS_REMOVED_ADS,
      removeAds ? 'true' : 'false'
    );
    if (activeSub) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_SUBSCRIPTION,
        activeSub
      );
    }

    set({ 
      isPremium: premium, 
      hasRemovedAds: removeAds, 
      activeSubscription: activeSub,
      isLoading: false,
    });
  },

  setError: (e: string | null) => set({ error: e }),
}));

export const shouldShowAds = () =>
  !usePurchaseStore.getState().isPremium &&
  !usePurchaseStore.getState().hasRemovedAds;

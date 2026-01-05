import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* =========================
   CONDITIONAL IAP IMPORT (Web uyumlu)
========================= */
let IAP: any = null;

if (Platform.OS !== 'web') {
  try {
    IAP = require('react-native-iap');
    console.log('[PurchaseStore] ✅ IAP module loaded');
  } catch (e) {
    console.log('[PurchaseStore] ❌ IAP module not available:', e);
  }
}

/* =========================
   PRODUCT IDS - Platform specific
========================= */
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: Platform.OS === 'ios'
    ? 'com.visiongo.scanupp.premium.monthly'
    : 'scanup_premium_monthly',
  PREMIUM_YEARLY: Platform.OS === 'ios'
    ? 'com.visiongo.scanupp.premium.yearly'
    : 'scanup_premium_yearly',
  REMOVE_ADS: Platform.OS === 'ios'
    ? 'com.visiongo.scanupp.removeads'
    : 'scanup_remove_ads',
};

export const SUBSCRIPTION_SKUS = [
  PRODUCT_IDS.PREMIUM_MONTHLY,
  PRODUCT_IDS.PREMIUM_YEARLY,
];

export const PRODUCT_SKUS = [PRODUCT_IDS.REMOVE_ADS];

/* =========================
   STORAGE KEYS
========================= */
const STORAGE_KEYS = {
  IS_PREMIUM: '@scanup_is_premium',
  HAS_REMOVED_ADS: '@scanup_has_removed_ads',
  ACTIVE_SUBSCRIPTION: '@scanup_active_subscription',
};

/* =========================
   TYPES
========================= */
interface Product {
  productId: string;
  title: string;
  description: string;
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
  activeSubscription: string | null;
  error: string | null;

  initialize: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  purchaseSubscription: (productId: string) => Promise<boolean>;
  purchaseProduct: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  setPremium: (isPremium: boolean) => void;
  setHasRemovedAds: (hasRemovedAds: boolean) => void;
  setError: (e: string | null) => void;
  syncWithBackend: (token: string | null, userId: string | null) => Promise<void>;
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

  /* ---------- INITIALIZE ---------- */
  initialize: async () => {
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
      // Load saved state from AsyncStorage
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

      // Initialize IAP connection
      console.log('[PurchaseStore] Calling initConnection...');
      await IAP.initConnection();
      console.log('[PurchaseStore] ✅ IAP connection established');

      // Android: Flush any failed purchases
      if (Platform.OS === 'android') {
        try {
          await IAP.flushFailedPurchasesCachedAsPendingAndroid();
          console.log('[PurchaseStore] ✅ Flushed failed Android purchases');
        } catch (flushError) {
          console.log('[PurchaseStore] Flush error (non-critical):', flushError);
        }
      }

      // Fetch products
      await get().fetchProducts();

      set({ isInitialized: true, isLoading: false });
      console.log('[PurchaseStore] ✅ Initialization complete');
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Init error:', error?.message || error);
      set({ 
        isInitialized: true, 
        isLoading: false, 
        error: `IAP init failed: ${error?.message || 'Unknown error'}` 
      });
    }
  },

  /* ---------- FETCH PRODUCTS ---------- */
  fetchProducts: async () => {
    if (Platform.OS === 'web' || !IAP) return;

    console.log('[PurchaseStore] Fetching products...');
    set({ isLoading: true, error: null });

    try {
      /* SUBSCRIPTIONS */
      console.log('[PurchaseStore] Getting subscriptions:', SUBSCRIPTION_SKUS);
      const subs = await IAP.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
      console.log('[PurchaseStore] Raw subscriptions:', JSON.stringify(subs, null, 2));

      const formattedSubs: Product[] = (subs || []).map((s: any) => {
        // Android: Get offer token and price from subscriptionOfferDetails
        const offer = s.subscriptionOfferDetails?.[0];
        const price = offer?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice 
          ?? s.localizedPrice 
          ?? '';

        return {
          productId: s.productId,
          title: s.title || s.productId,
          description: s.description || '',
          localizedPrice: price,
          currency: s.currency || 'EUR',
          offerToken: offer?.offerToken,
        };
      });

      console.log('[PurchaseStore] Formatted subscriptions:', formattedSubs);

      /* ONE-TIME PRODUCTS */
      console.log('[PurchaseStore] Getting products:', PRODUCT_SKUS);
      const prods = await IAP.getProducts({ skus: PRODUCT_SKUS });
      console.log('[PurchaseStore] Raw products:', JSON.stringify(prods, null, 2));

      const formattedProducts: Product[] = (prods || []).map((p: any) => ({
        productId: p.productId,
        title: p.title || p.productId,
        description: p.description || '',
        localizedPrice: p.localizedPrice ?? p.oneTimePurchaseOfferDetails?.formattedPrice ?? '',
        currency: p.currency || 'EUR',
      }));

      console.log('[PurchaseStore] Formatted products:', formattedProducts);

      set({
        subscriptions: formattedSubs,
        products: formattedProducts,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Fetch products error:', error?.message || error);
      set({ isLoading: false, error: error?.message });
    }
  },

  /* ---------- PURCHASE SUBSCRIPTION ---------- */
  purchaseSubscription: async (productId: string) => {
    if (Platform.OS === 'web' || !IAP) {
      set({ error: 'Not available on web' });
      return false;
    }

    console.log('[PurchaseStore] === PURCHASING SUBSCRIPTION ===');
    console.log('[PurchaseStore] Product ID:', productId);
    set({ isLoading: true, error: null });

    try {
      // Get fresh subscription data with offerToken
      const subs = await IAP.getSubscriptions({ skus: [productId] });
      console.log('[PurchaseStore] Subscription data:', JSON.stringify(subs, null, 2));

      if (!subs || subs.length === 0) {
        throw new Error('Subscription not found in store');
      }

      const offerToken = subs[0]?.subscriptionOfferDetails?.[0]?.offerToken;
      console.log('[PurchaseStore] Offer token:', offerToken);

      if (Platform.OS === 'android' && !offerToken) {
        throw new Error('No offer token found for Android subscription');
      }

      // Request purchase
      console.log('[PurchaseStore] Requesting purchase...');
      const purchaseParams: any = {
        skus: [productId],
      };

      // Android requires subscriptionOffers
      if (Platform.OS === 'android' && offerToken) {
        purchaseParams.subscriptionOffers = [{
          sku: productId,
          offerToken: offerToken,
        }];
      }

      const purchase = await IAP.requestPurchase(purchaseParams);
      console.log('[PurchaseStore] Purchase result:', JSON.stringify(purchase, null, 2));

      const p = Array.isArray(purchase) ? purchase[0] : purchase;

      if (!p) {
        console.log('[PurchaseStore] Purchase cancelled or no result');
        set({ isLoading: false });
        return false;
      }

      // Acknowledge/Finish transaction
      if (Platform.OS === 'android' && p?.purchaseToken) {
        console.log('[PurchaseStore] Acknowledging Android purchase...');
        await IAP.acknowledgePurchaseAndroid({ token: p.purchaseToken });
        console.log('[PurchaseStore] ✅ Android purchase acknowledged');
      }

      if (Platform.OS === 'ios') {
        console.log('[PurchaseStore] Finishing iOS transaction...');
        await IAP.finishTransaction({ purchase: p, isConsumable: false });
        console.log('[PurchaseStore] ✅ iOS transaction finished');
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, productId);

      set({
        isPremium: true,
        activeSubscription: productId,
        isLoading: false,
      });

      // Sync with backend
      try {
        const { useAuthStore } = require('./authStore');
        const { token, user } = useAuthStore.getState();
        if (token && user?.user_id) {
          await get().syncWithBackend(token, user.user_id);
        }
      } catch (syncError) {
        console.log('[PurchaseStore] Sync error (non-critical):', syncError);
      }

      console.log('[PurchaseStore] ✅ Subscription purchase complete!');
      return true;
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Purchase error:', error);
      
      // User cancelled - don't show error
      if (error?.code === 'E_USER_CANCELLED' || 
          error?.message?.includes('cancelled') || 
          error?.message?.includes('Cancelled')) {
        set({ isLoading: false });
        return false;
      }

      set({ isLoading: false, error: error?.message || 'Purchase failed' });
      return false;
    }
  },

  /* ---------- PURCHASE ONE-TIME PRODUCT ---------- */
  purchaseProduct: async (productId: string) => {
    if (Platform.OS === 'web' || !IAP) {
      set({ error: 'Not available on web' });
      return false;
    }

    console.log('[PurchaseStore] === PURCHASING PRODUCT ===');
    console.log('[PurchaseStore] Product ID:', productId);
    set({ isLoading: true, error: null });

    try {
      // Request purchase (simpler for one-time products)
      console.log('[PurchaseStore] Requesting purchase...');
      const purchase = await IAP.requestPurchase({
        skus: [productId],
      });

      console.log('[PurchaseStore] Purchase result:', JSON.stringify(purchase, null, 2));

      const p = Array.isArray(purchase) ? purchase[0] : purchase;

      if (!p) {
        console.log('[PurchaseStore] Purchase cancelled or no result');
        set({ isLoading: false });
        return false;
      }

      // Acknowledge/Finish transaction
      if (Platform.OS === 'android' && p?.purchaseToken) {
        console.log('[PurchaseStore] Acknowledging Android purchase...');
        await IAP.acknowledgePurchaseAndroid({ token: p.purchaseToken });
        console.log('[PurchaseStore] ✅ Android purchase acknowledged');
      }

      if (Platform.OS === 'ios') {
        console.log('[PurchaseStore] Finishing iOS transaction...');
        await IAP.finishTransaction({ purchase: p, isConsumable: false });
        console.log('[PurchaseStore] ✅ iOS transaction finished');
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, 'true');

      set({ hasRemovedAds: true, isLoading: false });

      // Sync with backend
      try {
        const { useAuthStore } = require('./authStore');
        const { token, user } = useAuthStore.getState();
        if (token && user?.user_id) {
          await get().syncWithBackend(token, user.user_id);
        }
      } catch (syncError) {
        console.log('[PurchaseStore] Sync error (non-critical):', syncError);
      }

      console.log('[PurchaseStore] ✅ Product purchase complete!');
      return true;
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Purchase error:', error);
      
      if (error?.code === 'E_USER_CANCELLED' || 
          error?.message?.includes('cancelled') || 
          error?.message?.includes('Cancelled')) {
        set({ isLoading: false });
        return false;
      }

      set({ isLoading: false, error: error?.message || 'Purchase failed' });
      return false;
    }
  },

  /* ---------- RESTORE PURCHASES ---------- */
  restorePurchases: async () => {
    if (Platform.OS === 'web' || !IAP) return;

    console.log('[PurchaseStore] Restoring purchases...');
    set({ isLoading: true, error: null });

    try {
      const purchases = await IAP.getAvailablePurchases();
      console.log('[PurchaseStore] Available purchases:', JSON.stringify(purchases, null, 2));

      let premium = false;
      let removeAds = false;
      let activeSub: string | null = null;

      (purchases || []).forEach((p: any) => {
        if (SUBSCRIPTION_SKUS.includes(p.productId)) {
          premium = true;
          activeSub = p.productId;
        }
        if (p.productId === PRODUCT_IDS.REMOVE_ADS) {
          removeAds = true;
        }
      });

      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, premium ? 'true' : 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, removeAds ? 'true' : 'false');
      if (activeSub) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, activeSub);
      }

      set({
        isPremium: premium,
        hasRemovedAds: removeAds,
        activeSubscription: activeSub,
        isLoading: false,
      });

      console.log('[PurchaseStore] ✅ Restore complete:', { premium, removeAds, activeSub });

      // Sync with backend
      if (premium || removeAds) {
        try {
          const { useAuthStore } = require('./authStore');
          const { token, user } = useAuthStore.getState();
          if (token && user?.user_id) {
            await get().syncWithBackend(token, user.user_id);
          }
        } catch (syncError) {
          console.log('[PurchaseStore] Sync error (non-critical):', syncError);
        }
      }
    } catch (error: any) {
      console.error('[PurchaseStore] ❌ Restore error:', error?.message || error);
      set({ isLoading: false, error: error?.message });
    }
  },

  /* ---------- HELPERS ---------- */
  setPremium: (isPremium: boolean) => {
    AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, isPremium ? 'true' : 'false');
    set({ isPremium });
  },

  setHasRemovedAds: (hasRemovedAds: boolean) => {
    AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, hasRemovedAds ? 'true' : 'false');
    set({ hasRemovedAds });
  },

  setError: (error: string | null) => set({ error }),

  /* ---------- SYNC WITH BACKEND ---------- */
  syncWithBackend: async (token: string | null, userId: string | null) => {
    if (!token || !userId) return;

    const { isPremium, hasRemovedAds, activeSubscription } = get();

    if (!isPremium && !hasRemovedAds) return;

    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

      const response = await fetch(`${BACKEND_URL}/api/user/update-premium`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          is_premium: isPremium,
          has_removed_ads: hasRemovedAds,
          subscription_type: activeSubscription || (hasRemovedAds ? 'remove_ads' : 'free'),
        }),
      });

      if (response.ok) {
        console.log('[PurchaseStore] ✅ Synced with backend');

        // Remove watermarks from existing documents
        try {
          await fetch(`${BACKEND_URL}/api/documents/remove-watermarks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          console.log('[PurchaseStore] ✅ Watermarks removed');
        } catch (wmError) {
          console.log('[PurchaseStore] Watermark removal error (non-critical):', wmError);
        }
      }
    } catch (error) {
      console.error('[PurchaseStore] Sync error:', error);
    }
  },
}));

/* ---------- ADS HELPER ---------- */
export const shouldShowAds = () => {
  const { isPremium, hasRemovedAds } = usePurchaseStore.getState();
  return !isPremium && !hasRemovedAds;
};

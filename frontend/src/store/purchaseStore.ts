import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  initConnection,
  endConnection,
  getSubscriptions,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  acknowledgePurchaseAndroid,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
} from 'react-native-iap';

/* =========================
   PRODUCT IDS - Platform specific (iOS ve Android farklı!)
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

  /* ---------- INIT ---------- */
  initialize: async () => {
    if (get().isInitialized || Platform.OS === 'web') return;

    set({ isLoading: true });

    const [isPremium, hasRemovedAds, activeSubscription] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM),
      AsyncStorage.getItem(STORAGE_KEYS.HAS_REMOVED_ADS),
      AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION),
    ]);

    set({
      isPremium: isPremium === 'true',
      hasRemovedAds: hasRemovedAds === 'true',
      activeSubscription,
    });

    await initConnection();

    if (Platform.OS === 'android') {
      await flushFailedPurchasesCachedAsPendingAndroid();
    }

    await get().fetchProducts();

    set({ isInitialized: true, isLoading: false });
  },

  /* ---------- FETCH PRODUCTS ---------- */
  fetchProducts: async () => {
    if (Platform.OS === 'web') return;

    set({ isLoading: true, error: null });

    /* SUBSCRIPTIONS */
    const subs = await getSubscriptions({ skus: SUBSCRIPTION_SKUS });

    const formattedSubs: Product[] = subs.map((s: any) => {
      const offer = s.subscriptionOfferDetails?.[0];
      const price =
        offer?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice ??
        s.localizedPrice ??
        '';

      return {
        productId: s.productId,
        title: s.title,
        description: s.description,
        localizedPrice: price,
        currency: s.currency,
        offerToken: offer?.offerToken,
      };
    });

    /* ONE-TIME PRODUCTS */
    const prods = await getProducts({ skus: PRODUCT_SKUS });

    const formattedProducts: Product[] = prods.map((p: any) => ({
      productId: p.productId,
      title: p.title,
      description: p.description,
      localizedPrice:
        p.localizedPrice ??
        p.oneTimePurchaseOfferDetails?.formattedPrice ??
        '',
      currency: p.currency,
    }));

    set({
      subscriptions: formattedSubs,
      products: formattedProducts,
      isLoading: false,
    });
  },

  /* ---------- SUBSCRIPTION (ANDROID + IOS) ---------- */
  purchaseSubscription: async (productId: string) => {
    try {
      set({ isLoading: true, error: null });

      const subs = await getSubscriptions({ skus: [productId] });
      const offerToken =
        subs[0]?.subscriptionOfferDetails?.[0]?.offerToken;

      // Android requires offerToken, iOS doesn't
      if (Platform.OS === 'android' && !offerToken) {
        throw new Error('NO_OFFER_TOKEN');
      }

      const purchase = await requestPurchase({
        skus: [productId],
        ...(Platform.OS === 'android' && offerToken ? {
          subscriptionOffers: [
            {
              sku: productId,
              offerToken,
            },
          ],
        } : {}),
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
        productId
      );

      set({
        isPremium: true,
        activeSubscription: productId,
        isLoading: false,
      });

      return true;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  /* ---------- ONE-TIME PRODUCT ---------- */
  purchaseProduct: async (productId: string) => {
    try {
      set({ isLoading: true, error: null });

      const purchase = await requestPurchase({
        skus: [productId],
      });

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
      set({ isLoading: false, error: e.message });
      return false;
    }
  },

  /* ---------- RESTORE ---------- */
  restorePurchases: async () => {
    const purchases = await getAvailablePurchases();

    let premium = false;
    let removeAds = false;
    let activeSub: string | null = null;

    purchases.forEach(p => {
      if (SUBSCRIPTION_SKUS.includes(p.productId)) {
        premium = true;
        activeSub = p.productId;
      }
      if (p.productId === PRODUCT_IDS.REMOVE_ADS) {
        removeAds = true;
      }
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
    });
  },

  setError: (e: string | null) => set({ error: e }),
}));

/* ---------- ADS HELPER ---------- */
export const shouldShowAds = () => {
  const { isPremium, hasRemovedAds } = usePurchaseStore.getState();
  return !isPremium && !hasRemovedAds;
};

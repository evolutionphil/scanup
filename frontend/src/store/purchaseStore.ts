import { create } from 'zustand';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Product IDs - Must match Google Play Console / App Store Connect
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'scanup_premium_monthly',
  PREMIUM_YEARLY: 'scanup_premium_yearly',
  REMOVE_ADS: 'scanup_remove_ads',
};

export const SUBSCRIPTION_SKUS = [PRODUCT_IDS.PREMIUM_MONTHLY, PRODUCT_IDS.PREMIUM_YEARLY];
export const PRODUCT_SKUS = [PRODUCT_IDS.REMOVE_ADS];

interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
  offerToken?: string;
}

interface PurchaseState {
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  hasRemovedAds: boolean;
  products: Product[];
  subscriptions: Product[];
  activeSubscription: string | null;
  error: string | null;
  
  initialize: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  purchaseProduct: (productId: string) => Promise<boolean>;
  purchaseSubscription: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  checkPremiumStatus: () => Promise<void>;
  setPremium: (isPremium: boolean) => void;
  setHasRemovedAds: (hasRemovedAds: boolean) => void;
  setError: (error: string | null) => void;
  syncWithBackend: (token: string | null, userId: string | null) => Promise<void>;
}

const STORAGE_KEYS = {
  IS_PREMIUM: '@scanup_is_premium',
  HAS_REMOVED_ADS: '@scanup_has_removed_ads',
  ACTIVE_SUBSCRIPTION: '@scanup_active_subscription',
};

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  isInitialized: false,
  isLoading: false,
  isPremium: false,
  hasRemovedAds: false,
  products: [],
  subscriptions: [],
  activeSubscription: null,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;
    
    console.log('[PurchaseStore] Initializing...');
    set({ isLoading: true });
    
    try {
      // Load saved state
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
      
      // Initialize IAP (only on native)
      if (Platform.OS !== 'web') {
        try {
          const { initConnection, flushFailedPurchasesCachedAsPendingAndroid } = require('react-native-iap');
          
          await initConnection();
          console.log('[PurchaseStore] IAP connected');
          
          if (Platform.OS === 'android') {
            await flushFailedPurchasesCachedAsPendingAndroid().catch(() => {});
          }
          
          await get().fetchProducts();
        } catch (iapError: any) {
          console.error('[PurchaseStore] IAP init error:', iapError);
          set({ error: iapError.message });
        }
      }
      
      set({ isInitialized: true, isLoading: false });
    } catch (error: any) {
      console.error('[PurchaseStore] Init error:', error);
      set({ isInitialized: true, isLoading: false, error: 'Failed to initialize' });
    }
  },

  fetchProducts: async () => {
    if (Platform.OS === 'web') return;
    
    console.log('[PurchaseStore] Fetching products...');
    set({ isLoading: true, error: null });
    
    try {
      const { fetchProducts } = require('react-native-iap');
      
      // Fetch subscriptions using v14 API
      try {
        console.log('[PurchaseStore] Getting subscriptions:', SUBSCRIPTION_SKUS);
        const subs = await fetchProducts({
          skus: SUBSCRIPTION_SKUS,
          type: 'subs',
        });
        console.log('[PurchaseStore] Subscriptions:', JSON.stringify(subs, null, 2));
        
        const formattedSubs: Product[] = subs.map((sub: any) => {
          let offerToken = undefined;
          let price = sub.localizedPrice || '€4.99';
          
          if (Platform.OS === 'android' && sub.subscriptionOfferDetails?.length > 0) {
            offerToken = sub.subscriptionOfferDetails[0].offerToken;
            const phases = sub.subscriptionOfferDetails[0].pricingPhases?.pricingPhaseList;
            if (phases?.length > 0) {
              price = phases[0].formattedPrice || price;
            }
          }
          
          return {
            productId: sub.productId,
            title: sub.title || sub.productId,
            description: sub.description || '',
            price: sub.price || '0',
            localizedPrice: price,
            currency: sub.currency || 'EUR',
            offerToken,
          };
        });
        
        set({ subscriptions: formattedSubs });
      } catch (subError: any) {
        console.log('[PurchaseStore] Subscriptions error:', subError.message);
      }
      
      // Fetch one-time products using v14 API
      try {
        console.log('[PurchaseStore] Getting products:', PRODUCT_SKUS);
        const products = await fetchProducts({
          skus: PRODUCT_SKUS,
          type: 'inapp',
        });
        console.log('[PurchaseStore] Products:', JSON.stringify(products, null, 2));
        
        const formattedProducts: Product[] = products.map((prod: any) => ({
          productId: prod.productId,
          title: prod.title || prod.productId,
          description: prod.description || '',
          price: prod.price || '0',
          localizedPrice: prod.localizedPrice || prod.oneTimePurchaseOfferDetails?.formattedPrice || '€4.99',
          currency: prod.currency || 'EUR',
        }));
        
        set({ products: formattedProducts });
      } catch (prodError: any) {
        console.log('[PurchaseStore] Products error:', prodError.message);
      }
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('[PurchaseStore] Fetch error:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  purchaseProduct: async (productId: string) => {
    if (Platform.OS === 'web') {
      set({ error: 'Not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing product:', productId);
    set({ isLoading: true, error: null });
    
    try {
      const { requestPurchase, finishTransaction, acknowledgePurchaseAndroid } = require('react-native-iap');
      
      // V14 API - Must use platform-specific nested object
      let request: any;
      if (Platform.OS === 'android') {
        request = { skus: [productId] };
      } else {
        request = { sku: productId };
      }
      
      console.log('[PurchaseStore] requestPurchase with:', JSON.stringify(request));
      
      const purchase = await requestPurchase({ request });
      
      console.log('[PurchaseStore] Purchase result:', JSON.stringify(purchase, null, 2));
      
      if (purchase) {
        // Acknowledge/finish transaction
        try {
          if (Platform.OS === 'android' && purchase.purchaseToken) {
            await acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
            console.log('[PurchaseStore] Android purchase acknowledged');
          } else if (Platform.OS === 'ios') {
            await finishTransaction({ purchase, isConsumable: false });
            console.log('[PurchaseStore] iOS transaction finished');
          }
        } catch (finishErr) {
          console.log('[PurchaseStore] Finish error:', finishErr);
        }
        
        // Update state
        if (productId === PRODUCT_IDS.REMOVE_ADS) {
          await AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, 'true');
          set({ hasRemovedAds: true });
        }
        
        set({ isLoading: false });
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error: any) {
      console.error('[PurchaseStore] Purchase error:', error);
      
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancelled')) {
        set({ isLoading: false });
        return false;
      }
      
      set({ isLoading: false, error: error.message || 'Purchase failed' });
      return false;
    }
  },

  purchaseSubscription: async (productId: string) => {
    if (Platform.OS === 'web') {
      set({ error: 'Not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing subscription:', productId);
    set({ isLoading: true, error: null });
    
    try {
      const { requestSubscription, getSubscriptions, finishTransaction, acknowledgePurchaseAndroid } = require('react-native-iap');
      
      let purchase;
      
      if (Platform.OS === 'android') {
        // Get fresh subscription with offer token
        const subs = await getSubscriptions({ skus: [productId] });
        console.log('[PurchaseStore] Fresh subs:', JSON.stringify(subs, null, 2));
        
        if (subs.length === 0) {
          throw new Error('Subscription not found in store');
        }
        
        const sub = subs[0];
        const offerToken = sub.subscriptionOfferDetails?.[0]?.offerToken;
        
        if (!offerToken) {
          throw new Error('No offer token available');
        }
        
        console.log('[PurchaseStore] Using offerToken:', offerToken);
        
        // V14 API for Android subscriptions - use requestSubscription
        purchase = await requestSubscription({
          sku: productId,
          subscriptionOffers: [{ sku: productId, offerToken }],
        });
      } else {
        // iOS - use requestSubscription
        purchase = await requestSubscription({
          sku: productId,
        });
      }
      
      console.log('[PurchaseStore] Subscription result:', JSON.stringify(purchase, null, 2));
      
      if (purchase) {
        // Acknowledge/finish
        try {
          if (Platform.OS === 'android' && purchase.purchaseToken) {
            await acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
          } else if (Platform.OS === 'ios') {
            await finishTransaction({ purchase, isConsumable: false });
          }
        } catch (finishErr) {
          console.log('[PurchaseStore] Finish error:', finishErr);
        }
        
        // Update state
        await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, 'true');
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, productId);
        set({ isPremium: true, activeSubscription: productId, isLoading: false });
        
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error: any) {
      console.error('[PurchaseStore] Subscription error:', error);
      
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancelled')) {
        set({ isLoading: false });
        return false;
      }
      
      set({ isLoading: false, error: error.message || 'Subscription failed' });
      return false;
    }
  },

  restorePurchases: async () => {
    if (Platform.OS === 'web') {
      set({ error: 'Not available on web' });
      return;
    }
    
    console.log('[PurchaseStore] Restoring...');
    set({ isLoading: true, error: null });
    
    try {
      const { getAvailablePurchases } = require('react-native-iap');
      const purchases = await getAvailablePurchases();
      console.log('[PurchaseStore] Available:', JSON.stringify(purchases, null, 2));
      
      let isPremium = false;
      let hasRemovedAds = false;
      let activeSubscription: string | null = null;
      
      for (const purchase of purchases) {
        if (purchase.productId === PRODUCT_IDS.REMOVE_ADS) {
          hasRemovedAds = true;
        }
        if (purchase.productId === PRODUCT_IDS.PREMIUM_MONTHLY || 
            purchase.productId === PRODUCT_IDS.PREMIUM_YEARLY) {
          isPremium = true;
          activeSubscription = purchase.productId;
        }
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, isPremium.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, hasRemovedAds.toString());
      if (activeSubscription) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, activeSubscription);
      }
      
      set({ isPremium, hasRemovedAds, activeSubscription, isLoading: false });
    } catch (error: any) {
      console.error('[PurchaseStore] Restore error:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  checkPremiumStatus: async () => {
    const isPremiumStr = await AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM);
    const hasRemovedAdsStr = await AsyncStorage.getItem(STORAGE_KEYS.HAS_REMOVED_ADS);
    set({
      isPremium: isPremiumStr === 'true',
      hasRemovedAds: hasRemovedAdsStr === 'true',
    });
  },

  setPremium: (isPremium: boolean) => {
    set({ isPremium });
    AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, isPremium.toString());
  },

  setHasRemovedAds: (hasRemovedAds: boolean) => {
    set({ hasRemovedAds });
    AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, hasRemovedAds.toString());
  },

  setError: (error: string | null) => {
    set({ error });
  },

  syncWithBackend: async (token: string | null, userId: string | null) => {
    if (!token || !userId) return;
    
    const state = get();
    console.log('[PurchaseStore] Syncing with backend...');
    
    try {
      const Constants = require('expo-constants').default;
      const BACKEND_URL = 
        Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
        process.env.EXPO_PUBLIC_BACKEND_URL ||
        'https://scanup-production.up.railway.app';
      
      if (state.isPremium || state.hasRemovedAds) {
        await fetch(`${BACKEND_URL}/api/user/update-premium`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: userId,
            is_premium: state.isPremium,
            has_removed_ads: state.hasRemovedAds,
            subscription_type: state.activeSubscription,
          }),
        });
      }
    } catch (error) {
      console.error('[PurchaseStore] Sync error:', error);
    }
  },
}));

export const useShouldShowAds = () => {
  const { isPremium, hasRemovedAds } = usePurchaseStore();
  return !isPremium && !hasRemovedAds;
};

import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Static imports from react-native-iap v14 (ESM compatible)
import {
  initConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
} from 'react-native-iap';

// Log that IAP is loaded (only on native)
if (Platform.OS !== 'web') {
  console.log('[PurchaseStore] IAP module loaded with react-native-iap v14');
}

// Product IDs - Platform specific
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
export const ALL_SKUS = [...SUBSCRIPTION_SKUS, ...PRODUCT_SKUS];

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
    if (Platform.OS === 'web') {
      set({ isInitialized: true });
      return;
    }
    
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
      
      // Initialize IAP
      try {
        await initConnection();
        console.log('[PurchaseStore] IAP connected');
        
        // Fetch products
        await get().fetchProducts();
        
      } catch (iapError: any) {
        console.error('[PurchaseStore] IAP init error:', iapError);
        set({ error: iapError.message });
      }
      
      set({ isInitialized: true, isLoading: false });
    } catch (error: any) {
      console.error('[PurchaseStore] Init error:', error);
      set({ isInitialized: true, isLoading: false, error: error.message });
    }
  },

  fetchProducts: async () => {
    if (Platform.OS === 'web') return;
    
    console.log('[PurchaseStore] Fetching products with v14 API...');
    set({ isLoading: true, error: null });
    
    try {
      // v14 API: Use fetchProducts with type parameter
      // Fetch subscriptions
      try {
        console.log('[PurchaseStore] Getting subscriptions:', SUBSCRIPTION_SKUS);
        const subs = await fetchProducts({ skus: SUBSCRIPTION_SKUS, type: 'subs' });
        console.log('[PurchaseStore] Raw subscriptions:', JSON.stringify(subs, null, 2));
        
        const formattedSubs: Product[] = (subs || []).map((sub: any) => {
          let offerToken = undefined;
          let price = sub.localizedPrice || '€4.99';
          
          // Android: Get offer token from subscriptionOfferDetailsAndroid
          if (Platform.OS === 'android' && sub.subscriptionOfferDetailsAndroid) {
            const offerDetails = sub.subscriptionOfferDetailsAndroid;
            if (offerDetails && offerDetails.length > 0) {
              offerToken = offerDetails[0].offerToken;
              const phases = offerDetails[0].pricingPhases?.pricingPhaseList;
              if (phases && phases.length > 0) {
                price = phases[0].formattedPrice || price;
              }
            }
          }
          
          // iOS: Use localizedPrice directly
          if (Platform.OS === 'ios') {
            price = sub.localizedPrice || price;
          }
          
          return {
            productId: sub.id || sub.productId,
            title: sub.title || sub.id || sub.productId,
            description: sub.description || '',
            price: sub.price || '0',
            localizedPrice: price,
            currency: sub.currency || 'EUR',
            offerToken,
          };
        });
        
        console.log('[PurchaseStore] Formatted subscriptions:', formattedSubs);
        set({ subscriptions: formattedSubs });
      } catch (subError: any) {
        console.log('[PurchaseStore] Subscriptions error:', subError.message || subError);
      }
      
      // Fetch one-time products
      try {
        console.log('[PurchaseStore] Getting products:', PRODUCT_SKUS);
        const prods = await fetchProducts({ skus: PRODUCT_SKUS, type: 'in-app' });
        console.log('[PurchaseStore] Raw products:', JSON.stringify(prods, null, 2));
        
        const formattedProducts: Product[] = (prods || []).map((prod: any) => ({
          productId: prod.id || prod.productId,
          title: prod.title || prod.id || prod.productId,
          description: prod.description || '',
          price: prod.price || '0',
          localizedPrice: prod.localizedPrice || prod.oneTimePurchaseOfferDetailsAndroid?.formattedPrice || '€4.99',
          currency: prod.currency || 'EUR',
        }));
        
        console.log('[PurchaseStore] Formatted products:', formattedProducts);
        set({ products: formattedProducts });
      } catch (prodError: any) {
        console.log('[PurchaseStore] Products error:', prodError.message || prodError);
      }
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('[PurchaseStore] Fetch error:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  // Purchase ONE-TIME product (like Remove Ads) - v14 API
  purchaseProduct: async (productId: string) => {
    if (Platform.OS === 'web') {
      set({ error: 'Not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing product with v14 API:', productId);
    set({ isLoading: true, error: null });
    
    try {
      // v14 API: use request object with platform-specific properties
      const purchaseParams = {
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: 'in-app' as const,
      };
      
      console.log('[PurchaseStore] requestPurchase params:', JSON.stringify(purchaseParams));
      
      // Note: v14 is event-based, requestPurchase doesn't return purchase directly
      // Instead, listen for events via purchaseUpdatedListener
      await requestPurchase(purchaseParams);
      
      console.log('[PurchaseStore] Purchase request sent successfully');
      
      // For now, we'll wait a bit and check available purchases
      // In production, you should use purchaseUpdatedListener
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if purchase was successful
      const purchases = await getAvailablePurchases();
      console.log('[PurchaseStore] Available purchases after request:', JSON.stringify(purchases, null, 2));
      
      const purchasedProduct = purchases.find((p: any) => 
        p.productId === productId || p.id === productId
      );
      
      if (!purchasedProduct) {
        console.log('[PurchaseStore] Purchase not found in available purchases - may have been cancelled');
        set({ isLoading: false });
        return false;
      }
      
      // Finish transaction
      try {
        await finishTransaction({ purchase: purchasedProduct, isConsumable: false });
        console.log('[PurchaseStore] Transaction finished');
      } catch (finishError) {
        console.log('[PurchaseStore] Finish error (may be already finished):', finishError);
      }
      
      // Update state
      if (productId === PRODUCT_IDS.REMOVE_ADS) {
        await AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, 'true');
        set({ hasRemovedAds: true });
        
        // Sync with backend and remove watermarks
        try {
          const { useAuthStore } = require('./authStore');
          const { token, user } = useAuthStore.getState();
          if (token && user?.user_id) {
            console.log('[PurchaseStore] Syncing remove-ads status with backend...');
            await get().syncWithBackend(token, user.user_id);
          }
        } catch (syncError) {
          console.log('[PurchaseStore] Sync after purchase error:', syncError);
        }
      }
      
      set({ isLoading: false });
      return true;
    } catch (error: any) {
      console.error('[PurchaseStore] Purchase error:', error);
      
      // User cancelled - don't show error
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancelled') || error.message?.includes('Cancelled')) {
        set({ isLoading: false });
        return false;
      }
      
      set({ isLoading: false, error: error.message || 'Purchase failed' });
      return false;
    }
  },

  // Purchase SUBSCRIPTION - v14 API with proper request structure
  purchaseSubscription: async (productId: string) => {
    if (Platform.OS === 'web') {
      set({ error: 'Not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing subscription with v14 API:', productId);
    set({ isLoading: true, error: null });
    
    try {
      console.log('[PurchaseStore] === SUBSCRIPTION PURCHASE v14 ===');
      
      // For Android, we need the offerToken
      let subscriptionOffers: Array<{ sku: string; offerToken: string }> = [];
      
      if (Platform.OS === 'android') {
        console.log('[PurchaseStore] Android: Getting offerToken');
        
        // Try to get from cached subscriptions first
        const cachedSub = get().subscriptions.find(s => s.productId === productId);
        if (cachedSub?.offerToken) {
          subscriptionOffers = [{ sku: productId, offerToken: cachedSub.offerToken }];
          console.log('[PurchaseStore] Got offerToken from cache');
        }
        
        // If no cached offerToken, fetch fresh
        if (subscriptionOffers.length === 0) {
          console.log('[PurchaseStore] Fetching fresh subscription data');
          try {
            const subs = await fetchProducts({ skus: [productId], type: 'subs' });
            console.log('[PurchaseStore] Fetched subs:', JSON.stringify(subs, null, 2));
            
            if (subs && subs.length > 0) {
              const sub = subs[0] as any;
              const offerDetails = sub.subscriptionOfferDetailsAndroid;
              if (offerDetails && offerDetails.length > 0) {
                subscriptionOffers = [{ sku: productId, offerToken: offerDetails[0].offerToken }];
                console.log('[PurchaseStore] Got fresh offerToken');
              }
            }
          } catch (fetchError: any) {
            console.log('[PurchaseStore] Error fetching subscriptions:', fetchError.message);
          }
        }
        
        if (subscriptionOffers.length === 0) {
          console.error('[PurchaseStore] No offerToken found for Android subscription');
          set({ isLoading: false, error: 'Could not load subscription details. Please try again.' });
          return false;
        }
      }
      
      // v14 API: Use request object with type: 'subs'
      const purchaseParams = {
        request: {
          apple: { sku: productId },
          google: { 
            skus: [productId],
            subscriptionOffers: subscriptionOffers.length > 0 ? subscriptionOffers : undefined,
          },
        },
        type: 'subs' as const,
      };
      
      console.log('[PurchaseStore] requestPurchase params:', JSON.stringify(purchaseParams));
      
      // v14 is event-based - requestPurchase triggers the purchase flow
      await requestPurchase(purchaseParams);
      
      console.log('[PurchaseStore] Purchase request sent successfully');
      
      // Wait for purchase to complete and check available purchases
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if purchase was successful
      const purchases = await getAvailablePurchases();
      console.log('[PurchaseStore] Available purchases after request:', JSON.stringify(purchases, null, 2));
      
      const purchasedSub = purchases.find((p: any) => 
        p.productId === productId || p.id === productId
      );
      
      if (!purchasedSub) {
        console.log('[PurchaseStore] Subscription not found - may have been cancelled');
        set({ isLoading: false });
        return false;
      }
      
      // Finish transaction
      try {
        await finishTransaction({ purchase: purchasedSub, isConsumable: false });
        console.log('[PurchaseStore] Subscription transaction finished');
      } catch (finishError) {
        console.log('[PurchaseStore] Finish error (may be already finished):', finishError);
      }
      
      // Update state
      await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, 'true');
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, productId);
      set({ isPremium: true, activeSubscription: productId, isLoading: false });
      
      // Sync with backend and remove watermarks
      try {
        const { useAuthStore } = require('./authStore');
        const { token, user } = useAuthStore.getState();
        if (token && user?.user_id) {
          console.log('[PurchaseStore] Syncing premium status with backend...');
          await get().syncWithBackend(token, user.user_id);
        }
      } catch (syncError) {
        console.log('[PurchaseStore] Sync after purchase error:', syncError);
      }
      
      return true;
      
    } catch (error: any) {
      console.error('[PurchaseStore] Subscription error:', error);
      
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancelled') || error.message?.includes('Cancelled')) {
        set({ isLoading: false });
        return false;
      }
      
      set({ isLoading: false, error: error.message || 'Subscription failed' });
      return false;
    }
  },

  restorePurchases: async () => {
    if (Platform.OS === 'web') return;
    
    console.log('[PurchaseStore] Restoring purchases...');
    set({ isLoading: true, error: null });
    
    try {
      const purchases = await getAvailablePurchases();
      console.log('[PurchaseStore] Available purchases:', JSON.stringify(purchases, null, 2));
      
      let foundPremium = false;
      let foundRemoveAds = false;
      let activeSubscription = null;
      
      for (const purchase of purchases) {
        const sku = purchase.productId;
        
        if (SUBSCRIPTION_SKUS.includes(sku)) {
          foundPremium = true;
          activeSubscription = sku;
        }
        
        if (sku === PRODUCT_IDS.REMOVE_ADS) {
          foundRemoveAds = true;
        }
      }
      
      // Save state
      await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, foundPremium ? 'true' : 'false');
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, foundRemoveAds ? 'true' : 'false');
      if (activeSubscription) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, activeSubscription);
      }
      
      set({
        isPremium: foundPremium,
        hasRemovedAds: foundRemoveAds,
        activeSubscription,
        isLoading: false,
      });
      
      console.log('[PurchaseStore] Restore complete:', { foundPremium, foundRemoveAds });
      
      // Sync with backend if restored purchases exist
      if (foundPremium || foundRemoveAds) {
        try {
          const { useAuthStore } = require('./authStore');
          const { token, user } = useAuthStore.getState();
          if (token && user?.user_id) {
            console.log('[PurchaseStore] Syncing restored purchases with backend...');
            await get().syncWithBackend(token, user.user_id);
          }
        } catch (syncError) {
          console.log('[PurchaseStore] Sync after restore error:', syncError);
        }
      }
    } catch (error: any) {
      console.error('[PurchaseStore] Restore error:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  checkPremiumStatus: async () => {
    const [isPremiumStr, hasRemovedAdsStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM),
      AsyncStorage.getItem(STORAGE_KEYS.HAS_REMOVED_ADS),
    ]);
    
    set({
      isPremium: isPremiumStr === 'true',
      hasRemovedAds: hasRemovedAdsStr === 'true',
    });
  },

  setPremium: (isPremium: boolean) => {
    AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, isPremium ? 'true' : 'false');
    set({ isPremium });
  },

  setHasRemovedAds: (hasRemovedAds: boolean) => {
    AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, hasRemovedAds ? 'true' : 'false');
    set({ hasRemovedAds });
  },

  setError: (error: string | null) => set({ error }),

  syncWithBackend: async (token: string | null, userId: string | null) => {
    if (!token || !userId) return;
    
    const { isPremium, hasRemovedAds, activeSubscription } = get();
    
    if (!isPremium && !hasRemovedAds) return;
    
    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      
      // First update premium status
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
        console.log('[PurchaseStore] Synced with backend');
        
        // Then remove watermarks from existing documents
        try {
          const watermarkResponse = await fetch(`${BACKEND_URL}/api/documents/remove-watermarks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (watermarkResponse.ok) {
            const result = await watermarkResponse.json();
            console.log('[PurchaseStore] Watermarks removed:', result);
          }
        } catch (wmError) {
          console.log('[PurchaseStore] Watermark removal error (non-critical):', wmError);
        }
      }
    } catch (error) {
      console.error('[PurchaseStore] Sync error:', error);
    }
  },
}));

// Helper to check if user should see ads
export const shouldShowAds = () => {
  const { isPremium, hasRemovedAds } = usePurchaseStore();
  return !isPremium && !hasRemovedAds;
};

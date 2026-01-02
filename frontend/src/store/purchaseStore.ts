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
          const RNIap = require('react-native-iap');
          
          // Connect to store
          await RNIap.initConnection();
          console.log('[PurchaseStore] IAP connected');
          
          // Clear pending purchases on Android
          if (Platform.OS === 'android') {
            try {
              await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
            } catch (e) {
              // Ignore
            }
          }
          
          // Fetch products
          await get().fetchProducts();
          
        } catch (iapError: any) {
          console.error('[PurchaseStore] IAP init error:', iapError);
          set({ error: iapError.message });
        }
      }
      
      set({ isInitialized: true, isLoading: false });
    } catch (error: any) {
      console.error('[PurchaseStore] Init error:', error);
      set({ isInitialized: true, isLoading: false, error: error.message });
    }
  },

  fetchProducts: async () => {
    if (Platform.OS === 'web') return;
    
    console.log('[PurchaseStore] Fetching products...');
    set({ isLoading: true, error: null });
    
    try {
      const RNIap = require('react-native-iap');
      
      // Fetch subscriptions
      try {
        console.log('[PurchaseStore] Getting subscriptions:', SUBSCRIPTION_SKUS);
        const subs = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
        console.log('[PurchaseStore] Raw subscriptions:', JSON.stringify(subs, null, 2));
        
        const formattedSubs: Product[] = (subs || []).map((sub: any) => {
          let offerToken = undefined;
          let price = sub.localizedPrice || '€4.99';
          
          // Android: Get offer token from subscriptionOfferDetails
          if (Platform.OS === 'android') {
            const offerDetails = sub.subscriptionOfferDetails || sub.subscriptionOfferDetailsAndroid;
            if (offerDetails && offerDetails.length > 0) {
              offerToken = offerDetails[0].offerToken;
              const phases = offerDetails[0].pricingPhases?.pricingPhaseList;
              if (phases && phases.length > 0) {
                price = phases[0].formattedPrice || price;
              }
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
        
        console.log('[PurchaseStore] Formatted subscriptions:', formattedSubs);
        set({ subscriptions: formattedSubs });
      } catch (subError: any) {
        console.log('[PurchaseStore] Subscriptions error:', subError.message || subError);
      }
      
      // Fetch one-time products
      try {
        console.log('[PurchaseStore] Getting products:', PRODUCT_SKUS);
        const products = await RNIap.getProducts({ skus: PRODUCT_SKUS });
        console.log('[PurchaseStore] Raw products:', JSON.stringify(products, null, 2));
        
        const formattedProducts: Product[] = (products || []).map((prod: any) => ({
          productId: prod.productId,
          title: prod.title || prod.productId,
          description: prod.description || '',
          price: prod.price || '0',
          localizedPrice: prod.localizedPrice || prod.oneTimePurchaseOfferDetails?.formattedPrice || '€4.99',
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

  // Purchase ONE-TIME product (like Remove Ads)
  purchaseProduct: async (productId: string) => {
    if (Platform.OS === 'web') {
      set({ error: 'Not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing product:', productId);
    set({ isLoading: true, error: null });
    
    try {
      const RNIap = require('react-native-iap');
      
      // For react-native-iap v14+, we need to use the correct format
      // Android requires nested 'android' key
      let purchaseParams: any;
      
      if (Platform.OS === 'android') {
        purchaseParams = {
          android: {
            skus: [productId],
          },
        };
      } else {
        purchaseParams = {
          sku: productId,
        };
      }
      
      console.log('[PurchaseStore] requestPurchase params:', JSON.stringify(purchaseParams));
      
      const purchase = await RNIap.requestPurchase(purchaseParams);
      
      console.log('[PurchaseStore] Purchase result:', JSON.stringify(purchase, null, 2));
      
      if (purchase) {
        // Acknowledge purchase on Android
        if (Platform.OS === 'android' && purchase.purchaseToken) {
          try {
            await RNIap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
            console.log('[PurchaseStore] Purchase acknowledged');
          } catch (ackError) {
            console.log('[PurchaseStore] Acknowledge error:', ackError);
          }
        }
        
        // Finish transaction on iOS
        if (Platform.OS === 'ios') {
          try {
            await RNIap.finishTransaction({ purchase, isConsumable: false });
            console.log('[PurchaseStore] Transaction finished');
          } catch (finishError) {
            console.log('[PurchaseStore] Finish error:', finishError);
          }
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
      }
      
      set({ isLoading: false });
      return false;
    } catch (error: any) {
      console.error('[PurchaseStore] Purchase error:', error);
      
      // User cancelled - don't show error
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancelled')) {
        set({ isLoading: false });
        return false;
      }
      
      set({ isLoading: false, error: error.message || 'Purchase failed' });
      return false;
    }
  },

  // Purchase SUBSCRIPTION (uses same requestPurchase on modern react-native-iap)
  purchaseSubscription: async (productId: string) => {
    if (Platform.OS === 'web') {
      set({ error: 'Not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing subscription:', productId);
    set({ isLoading: true, error: null });
    
    try {
      const RNIap = require('react-native-iap');
      
      let purchase;
      
      if (Platform.OS === 'android') {
        // CRITICAL: Fetch fresh subscription data to get the offerToken
        console.log('[PurchaseStore] === ANDROID SUBSCRIPTION PURCHASE ===');
        console.log('[PurchaseStore] Step 1: Fetching fresh subscription data for:', productId);
        
        const freshSubs = await RNIap.getSubscriptions({ skus: [productId] });
        console.log('[PurchaseStore] Step 2: Got fresh subs count:', freshSubs?.length);
        
        if (!freshSubs || freshSubs.length === 0) {
          throw new Error('Subscription not found in store');
        }
        
        const sub = freshSubs[0];
        console.log('[PurchaseStore] Step 3: Sub keys:', Object.keys(sub));
        
        // Try multiple property names for offer details
        const offerDetails = sub.subscriptionOfferDetailsAndroid 
          || sub.subscriptionOfferDetails 
          || sub.offerDetails;
        
        console.log('[PurchaseStore] Step 4: offerDetails found:', !!offerDetails, 'length:', offerDetails?.length);
        
        if (offerDetails && offerDetails.length > 0) {
          console.log('[PurchaseStore] Step 5: First offer keys:', Object.keys(offerDetails[0]));
        }
        
        const offerToken = offerDetails?.[0]?.offerToken;
        console.log('[PurchaseStore] Step 6: offerToken found:', !!offerToken, 'value:', offerToken?.substring(0, 30) + '...');
        
        if (!offerToken) {
          console.log('[PurchaseStore] ERROR: No offerToken! Full sub object:', JSON.stringify(sub, null, 2));
          throw new Error('No offer token available - check Play Console subscription configuration');
        }
        
        // For react-native-iap v14+, Android subscriptions need this format
        const purchaseParams = {
          android: {
            skus: [productId],
            subscriptionOffers: [{
              sku: productId,
              offerToken: offerToken,
            }],
          },
        };
        
        console.log('[PurchaseStore] Step 7: Calling requestPurchase with:', JSON.stringify(purchaseParams));
        purchase = await RNIap.requestPurchase(purchaseParams);
        console.log('[PurchaseStore] Step 8: Purchase result received');
      } else {
        // iOS: Simple request
        purchase = await RNIap.requestPurchase({
          sku: productId,
        });
      }
      
      console.log('[PurchaseStore] Subscription result:', JSON.stringify(purchase, null, 2));
      
      if (purchase) {
        // Acknowledge on Android
        if (Platform.OS === 'android' && purchase.purchaseToken) {
          try {
            await iap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
            console.log('[PurchaseStore] Subscription acknowledged');
          } catch (ackError) {
            console.log('[PurchaseStore] Acknowledge error:', ackError);
          }
        }
        
        // Finish on iOS
        if (Platform.OS === 'ios') {
          try {
            await iap.finishTransaction({ purchase, isConsumable: false });
          } catch (finishError) {
            console.log('[PurchaseStore] Finish error:', finishError);
          }
        }
        
        // Update state
        await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, 'true');
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, productId);
        set({ isPremium: true, activeSubscription: productId, isLoading: false });
        
        // Sync with backend and remove watermarks
        // Get auth token from authStore
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
    if (Platform.OS === 'web') return;
    
    console.log('[PurchaseStore] Restoring purchases...');
    set({ isLoading: true, error: null });
    
    try {
      const iap = require('react-native-iap');
      
      const purchases = await iap.getAvailablePurchases();
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

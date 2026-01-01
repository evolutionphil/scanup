import { create } from 'zustand';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Product IDs - These must match what you create in Google Play Console / App Store Connect
export const PRODUCT_IDS = {
  // Subscriptions
  PREMIUM_MONTHLY: 'scanup_premium_monthly',
  PREMIUM_YEARLY: 'scanup_premium_yearly',
  // One-time purchases
  REMOVE_ADS: 'scanup_remove_ads',
};

// Subscription SKUs for fetching
export const SUBSCRIPTION_SKUS = Platform.select({
  ios: [PRODUCT_IDS.PREMIUM_MONTHLY, PRODUCT_IDS.PREMIUM_YEARLY],
  android: [PRODUCT_IDS.PREMIUM_MONTHLY, PRODUCT_IDS.PREMIUM_YEARLY],
  default: [],
}) as string[];

// One-time purchase SKUs
export const PRODUCT_SKUS = Platform.select({
  ios: [PRODUCT_IDS.REMOVE_ADS],
  android: [PRODUCT_IDS.REMOVE_ADS],
  default: [],
}) as string[];

interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
  offerToken?: string; // For Android subscriptions
}

interface PurchaseState {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  hasRemovedAds: boolean;
  products: Product[];
  subscriptions: Product[];
  activeSubscription: string | null;
  error: string | null;
  
  // Actions
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

// Storage keys
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
      // Load saved state from AsyncStorage
      const [isPremiumStr, hasRemovedAdsStr, activeSubscription] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM),
        AsyncStorage.getItem(STORAGE_KEYS.HAS_REMOVED_ADS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION),
      ]);
      
      const isPremium = isPremiumStr === 'true';
      const hasRemovedAds = hasRemovedAdsStr === 'true';
      
      set({
        isPremium,
        hasRemovedAds,
        activeSubscription,
      });
      
      // Initialize IAP connection (only on native)
      if (Platform.OS !== 'web') {
        try {
          const { initConnection, flushFailedPurchasesCachedAsPendingAndroid } = require('react-native-iap');
          
          const result = await initConnection();
          console.log('[PurchaseStore] IAP connection result:', result);
          
          // Clear any pending purchases on Android
          if (Platform.OS === 'android') {
            try {
              await flushFailedPurchasesCachedAsPendingAndroid();
            } catch (e) {
              console.log('[PurchaseStore] Flush failed purchases:', e);
            }
          }
          
          // Fetch products
          await get().fetchProducts();
          
        } catch (iapError: any) {
          console.error('[PurchaseStore] IAP init error:', iapError);
          set({ error: iapError.message || 'Failed to connect to store' });
        }
      }
      
      set({ isInitialized: true, isLoading: false });
      console.log('[PurchaseStore] Initialized successfully');
    } catch (error: any) {
      console.error('[PurchaseStore] Initialization error:', error);
      set({ isInitialized: true, isLoading: false, error: 'Failed to initialize purchases' });
    }
  },

  fetchProducts: async () => {
    if (Platform.OS === 'web') return;
    
    console.log('[PurchaseStore] Fetching products...');
    set({ isLoading: true, error: null });
    
    try {
      const { getSubscriptions, getProducts } = require('react-native-iap');
      
      // Fetch subscriptions
      if (SUBSCRIPTION_SKUS.length > 0) {
        try {
          console.log('[PurchaseStore] Fetching subscriptions:', SUBSCRIPTION_SKUS);
          const subs = await getSubscriptions({ skus: SUBSCRIPTION_SKUS });
          console.log('[PurchaseStore] Raw subscriptions:', JSON.stringify(subs, null, 2));
          
          const formattedSubs: Product[] = subs.map((sub: any) => {
            // For Android, get offer token from subscriptionOfferDetails
            let offerToken = undefined;
            let price = sub.localizedPrice || sub.price || '0';
            
            if (Platform.OS === 'android' && sub.subscriptionOfferDetails?.length > 0) {
              offerToken = sub.subscriptionOfferDetails[0].offerToken;
              // Get price from pricing phases
              const pricingPhases = sub.subscriptionOfferDetails[0].pricingPhases?.pricingPhaseList;
              if (pricingPhases?.length > 0) {
                price = pricingPhases[0].formattedPrice || price;
              }
            }
            
            return {
              productId: sub.productId,
              title: sub.title || sub.name || sub.productId,
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
          console.log('[PurchaseStore] Subscriptions error:', subError.message);
        }
      }
      
      // Fetch one-time products
      if (PRODUCT_SKUS.length > 0) {
        try {
          console.log('[PurchaseStore] Fetching products:', PRODUCT_SKUS);
          const products = await getProducts({ skus: PRODUCT_SKUS });
          console.log('[PurchaseStore] Raw products:', JSON.stringify(products, null, 2));
          
          const formattedProducts: Product[] = products.map((prod: any) => ({
            productId: prod.productId,
            title: prod.title || prod.name || prod.productId,
            description: prod.description || '',
            price: prod.price || '0',
            localizedPrice: prod.localizedPrice || prod.oneTimePurchaseOfferDetails?.formattedPrice || prod.price || '0',
            currency: prod.currency || 'EUR',
          }));
          
          console.log('[PurchaseStore] Formatted products:', formattedProducts);
          set({ products: formattedProducts });
        } catch (prodError: any) {
          console.log('[PurchaseStore] Products error:', prodError.message);
        }
      }
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('[PurchaseStore] Fetch products error:', error);
      set({ isLoading: false, error: error.message || 'Failed to load products' });
    }
  },

  purchaseProduct: async (productId: string) => {
    if (Platform.OS === 'web') {
      set({ error: 'Purchases not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing product:', productId);
    set({ isLoading: true, error: null });
    
    try {
      const { requestPurchase, finishTransaction } = require('react-native-iap');
      
      // Request purchase
      const purchase = await requestPurchase({
        skus: [productId],
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      });
      
      console.log('[PurchaseStore] Purchase result:', JSON.stringify(purchase, null, 2));
      
      if (purchase) {
        // Finish the transaction
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch (finishError) {
          console.log('[PurchaseStore] Finish transaction error:', finishError);
        }
        
        // Update state based on what was purchased
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
      
      // Handle user cancellation
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
      set({ error: 'Subscriptions not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing subscription:', productId);
    set({ isLoading: true, error: null });
    
    try {
      const { requestSubscription, finishTransaction, getSubscriptions } = require('react-native-iap');
      
      let purchase;
      
      if (Platform.OS === 'android') {
        // Android requires subscription offer token
        const subs = await getSubscriptions({ skus: [productId] });
        console.log('[PurchaseStore] Fetched sub for purchase:', JSON.stringify(subs, null, 2));
        
        if (subs.length === 0) {
          throw new Error('Subscription not found');
        }
        
        const sub = subs[0];
        const offerToken = sub.subscriptionOfferDetails?.[0]?.offerToken;
        
        if (!offerToken) {
          throw new Error('No offer token found for subscription');
        }
        
        console.log('[PurchaseStore] Using offer token:', offerToken);
        
        purchase = await requestSubscription({
          sku: productId,
          subscriptionOffers: [{ sku: productId, offerToken }],
        });
      } else {
        // iOS
        purchase = await requestSubscription({
          sku: productId,
        });
      }
      
      console.log('[PurchaseStore] Subscription result:', JSON.stringify(purchase, null, 2));
      
      if (purchase) {
        // Finish the transaction
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch (finishError) {
          console.log('[PurchaseStore] Finish transaction error:', finishError);
        }
        
        // Update premium status
        await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, 'true');
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, productId);
        set({ isPremium: true, activeSubscription: productId });
        
        set({ isLoading: false });
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error: any) {
      console.error('[PurchaseStore] Subscription error:', error);
      
      // Handle user cancellation
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
      set({ error: 'Restore not available on web' });
      return;
    }
    
    console.log('[PurchaseStore] Restoring purchases...');
    set({ isLoading: true, error: null });
    
    try {
      const { getAvailablePurchases } = require('react-native-iap');
      
      const purchases = await getAvailablePurchases();
      console.log('[PurchaseStore] Available purchases:', JSON.stringify(purchases, null, 2));
      
      let isPremium = false;
      let hasRemovedAds = false;
      let activeSubscription: string | null = null;
      
      for (const purchase of purchases) {
        if (purchase.productId === PRODUCT_IDS.REMOVE_ADS) {
          hasRemovedAds = true;
        }
        if (
          purchase.productId === PRODUCT_IDS.PREMIUM_MONTHLY ||
          purchase.productId === PRODUCT_IDS.PREMIUM_YEARLY
        ) {
          isPremium = true;
          activeSubscription = purchase.productId;
        }
      }
      
      // Save to storage
      await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, isPremium.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, hasRemovedAds.toString());
      if (activeSubscription) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, activeSubscription);
      }
      
      set({
        isPremium,
        hasRemovedAds,
        activeSubscription,
        isLoading: false,
      });
      
      console.log('[PurchaseStore] Restore complete:', { isPremium, hasRemovedAds, activeSubscription });
    } catch (error: any) {
      console.error('[PurchaseStore] Restore error:', error);
      set({ isLoading: false, error: error.message || 'Failed to restore purchases' });
    }
  },

  checkPremiumStatus: async () => {
    // Just read from storage - actual validation happens during restore
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
}));

// Helper hook to check if user should see ads
export const useShouldShowAds = () => {
  const { isPremium, hasRemovedAds } = usePurchaseStore();
  return !isPremium && !hasRemovedAds;
};

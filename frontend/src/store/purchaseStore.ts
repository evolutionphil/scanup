import { create } from 'zustand';
import { Platform } from 'react-native';
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
}

interface Purchase {
  productId: string;
  transactionId: string;
  transactionDate: number;
  transactionReceipt: string;
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
          const RNIap = require('react-native-iap');
          await RNIap.initConnection();
          console.log('[PurchaseStore] IAP connection established');
          
          // Fetch products
          await get().fetchProducts();
          
          // Check for existing purchases
          await get().checkPremiumStatus();
        } catch (iapError) {
          console.error('[PurchaseStore] IAP init error:', iapError);
          // Don't fail initialization if IAP fails - user can still use the app
        }
      }
      
      set({ isInitialized: true, isLoading: false });
      console.log('[PurchaseStore] Initialized successfully');
    } catch (error) {
      console.error('[PurchaseStore] Initialization error:', error);
      set({ isInitialized: true, isLoading: false, error: 'Failed to initialize purchases' });
    }
  },

  fetchProducts: async () => {
    if (Platform.OS === 'web') return;
    
    console.log('[PurchaseStore] Fetching products...');
    set({ isLoading: true });
    
    try {
      const RNIap = require('react-native-iap');
      
      // Fetch subscriptions
      if (SUBSCRIPTION_SKUS.length > 0) {
        try {
          const subs = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
          console.log('[PurchaseStore] Subscriptions:', subs);
          
          const formattedSubs: Product[] = subs.map((sub: any) => ({
            productId: sub.productId,
            title: sub.title || sub.name || sub.productId,
            description: sub.description || '',
            price: sub.price || '0',
            localizedPrice: sub.localizedPrice || sub.price || '0',
            currency: sub.currency || 'EUR',
          }));
          
          set({ subscriptions: formattedSubs });
        } catch (subError) {
          console.log('[PurchaseStore] No subscriptions found or error:', subError);
        }
      }
      
      // Fetch one-time products
      if (PRODUCT_SKUS.length > 0) {
        try {
          const products = await RNIap.getProducts({ skus: PRODUCT_SKUS });
          console.log('[PurchaseStore] Products:', products);
          
          const formattedProducts: Product[] = products.map((prod: any) => ({
            productId: prod.productId,
            title: prod.title || prod.name || prod.productId,
            description: prod.description || '',
            price: prod.price || '0',
            localizedPrice: prod.localizedPrice || prod.price || '0',
            currency: prod.currency || 'EUR',
          }));
          
          set({ products: formattedProducts });
        } catch (prodError) {
          console.log('[PurchaseStore] No products found or error:', prodError);
        }
      }
      
      set({ isLoading: false });
    } catch (error) {
      console.error('[PurchaseStore] Fetch products error:', error);
      set({ isLoading: false, error: 'Failed to load products' });
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
      const RNIap = require('react-native-iap');
      
      const purchase = await RNIap.requestPurchase({ sku: productId });
      console.log('[PurchaseStore] Purchase result:', purchase);
      
      if (purchase) {
        // Acknowledge the purchase (required for Android)
        if (Platform.OS === 'android' && purchase.purchaseToken) {
          await RNIap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
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
      if (error.code === 'E_USER_CANCELLED') {
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
      const RNIap = require('react-native-iap');
      
      let purchase;
      if (Platform.OS === 'android') {
        // Android requires subscription offer token
        const subscriptions = await RNIap.getSubscriptions({ skus: [productId] });
        if (subscriptions.length > 0) {
          const sub = subscriptions[0];
          const offerToken = sub.subscriptionOfferDetails?.[0]?.offerToken;
          
          purchase = await RNIap.requestSubscription({
            sku: productId,
            subscriptionOffers: offerToken ? [{ sku: productId, offerToken }] : undefined,
          });
        }
      } else {
        // iOS
        purchase = await RNIap.requestSubscription({ sku: productId });
      }
      
      console.log('[PurchaseStore] Subscription result:', purchase);
      
      if (purchase) {
        // Acknowledge the purchase (required for Android)
        if (Platform.OS === 'android' && purchase.purchaseToken) {
          await RNIap.acknowledgePurchaseAndroid({ token: purchase.purchaseToken });
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
      if (error.code === 'E_USER_CANCELLED') {
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
      const RNIap = require('react-native-iap');
      
      const purchases = await RNIap.getAvailablePurchases();
      console.log('[PurchaseStore] Available purchases:', purchases);
      
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
    if (Platform.OS === 'web') return;
    
    try {
      const RNIap = require('react-native-iap');
      
      // Check for active subscriptions
      const purchases = await RNIap.getAvailablePurchases();
      
      let isPremium = false;
      let hasRemovedAds = false;
      
      for (const purchase of purchases) {
        if (purchase.productId === PRODUCT_IDS.REMOVE_ADS) {
          hasRemovedAds = true;
        }
        if (
          purchase.productId === PRODUCT_IDS.PREMIUM_MONTHLY ||
          purchase.productId === PRODUCT_IDS.PREMIUM_YEARLY
        ) {
          isPremium = true;
        }
      }
      
      // Update state if different
      const currentState = get();
      if (currentState.isPremium !== isPremium || currentState.hasRemovedAds !== hasRemovedAds) {
        await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, isPremium.toString());
        await AsyncStorage.setItem(STORAGE_KEYS.HAS_REMOVED_ADS, hasRemovedAds.toString());
        set({ isPremium, hasRemovedAds });
      }
    } catch (error) {
      console.error('[PurchaseStore] Check premium error:', error);
    }
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

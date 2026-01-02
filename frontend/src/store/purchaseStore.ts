import { create } from 'zustand';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import react-native-iap conditionally for native platforms
let RNIap: any = null;
if (Platform.OS !== 'web') {
  try {
    RNIap = require('react-native-iap');
  } catch (e) {
    console.log('[PurchaseStore] react-native-iap not available');
  }
}

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
      if (Platform.OS !== 'web' && RNIap) {
        try {
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
    if (Platform.OS === 'web' || !RNIap) return;
    
    console.log('[PurchaseStore] Fetching products...');
    set({ isLoading: true, error: null });
    
    try {
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
    if (Platform.OS === 'web' || !RNIap) {
      set({ error: 'Not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing product:', productId);
    set({ isLoading: true, error: null });
    
    try {
      // v14 API: request object with platform-specific params and type
      const purchaseParams = {
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: 'inapp' as const,
      };
      
      console.log('[PurchaseStore] requestPurchase params:', JSON.stringify(purchaseParams));
      const purchase = await RNIap.requestPurchase(purchaseParams);
      
      console.log('[PurchaseStore] Purchase result:', JSON.stringify(purchase, null, 2));
      
      // CRITICAL: Check if purchase is valid (not empty, not cancelled)
      const isValidPurchase = purchase && 
        (Array.isArray(purchase) ? purchase.length > 0 : true) &&
        (purchase.purchaseToken || purchase.transactionId || purchase.productId);
      
      console.log('[PurchaseStore] Is valid purchase:', isValidPurchase);
      
      if (!isValidPurchase) {
        console.log('[PurchaseStore] Purchase cancelled or invalid');
        set({ isLoading: false });
        return false;
      }
      
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
      
      // Update state ONLY after valid purchase
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
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancelled')) {
        set({ isLoading: false });
        return false;
      }
      
      set({ isLoading: false, error: error.message || 'Purchase failed' });
      return false;
    }
  },

  // Purchase SUBSCRIPTION (uses requestSubscription for subscriptions)
  purchaseSubscription: async (productId: string) => {
    if (Platform.OS === 'web' || !RNIap) {
      set({ error: 'Not available on web' });
      return false;
    }
    
    console.log('[PurchaseStore] Purchasing subscription:', productId);
    set({ isLoading: true, error: null });
    
    try {
      console.log('[PurchaseStore] === SUBSCRIPTION PURCHASE ===');
      
      // For Android, we MUST get the offerToken
      if (Platform.OS === 'android') {
        console.log('[PurchaseStore] Step 1: Getting subscription details');
        
        let offerToken: string | undefined;
        
        // Try to get from cached subscriptions first
        const cachedSub = get().subscriptions.find(s => s.productId === productId);
        if (cachedSub?.offerToken) {
          offerToken = cachedSub.offerToken;
          console.log('[PurchaseStore] Step 2: Got offerToken from cache');
        }
        
        // If no cached offerToken, fetch fresh
        if (!offerToken) {
          console.log('[PurchaseStore] Step 2: Fetching fresh subscription data');
          try {
            const subs = await RNIap.getSubscriptions({ skus: [productId] });
            console.log('[PurchaseStore] Got', subs?.length, 'subscriptions');
            
            if (subs && subs.length > 0) {
              const sub = subs[0];
              console.log('[PurchaseStore] Subscription data:', JSON.stringify(sub, null, 2));
              
              const offerDetails = sub.subscriptionOfferDetails;
              if (offerDetails && offerDetails.length > 0) {
                offerToken = offerDetails[0].offerToken;
                console.log('[PurchaseStore] Got offerToken:', offerToken?.substring(0, 50) + '...');
              }
            }
          } catch (fetchError: any) {
            console.log('[PurchaseStore] Error fetching subscriptions:', fetchError.message);
          }
        }
        
        if (!offerToken) {
          console.error('[PurchaseStore] No offerToken found - cannot purchase subscription');
          set({ isLoading: false, error: 'Could not load subscription details. Please try again.' });
          return false;
        }
        
        // Use requestSubscription with subscriptionOffers (required for Android)
        console.log('[PurchaseStore] Step 3: Calling requestSubscription');
        const purchaseParams = {
          subscriptionOffers: [{
            sku: productId,
            offerToken: offerToken,
          }],
        };
        
        console.log('[PurchaseStore] Purchase params:', JSON.stringify(purchaseParams));
        
        const purchase = await RNIap.requestSubscription(purchaseParams);
        
        console.log('[PurchaseStore] Step 4: Purchase result:', JSON.stringify(purchase, null, 2));
        
        // CRITICAL: Validate purchase result
        // If purchase is array, check if it has items
        // If cancelled, purchase will be null or empty array
        const purchaseData = Array.isArray(purchase) ? purchase[0] : purchase;
        const isValidPurchase = purchaseData && 
          (purchaseData.purchaseToken || purchaseData.transactionId || purchaseData.productId);
        
        console.log('[PurchaseStore] Is valid purchase:', isValidPurchase);
        
        if (!isValidPurchase) {
          console.log('[PurchaseStore] Subscription cancelled or invalid');
          set({ isLoading: false });
          return false;
        }
        
        // Acknowledge on Android
        if (purchaseData.purchaseToken) {
          try {
            await RNIap.acknowledgePurchaseAndroid({ token: purchaseData.purchaseToken });
            console.log('[PurchaseStore] Subscription acknowledged');
          } catch (ackError) {
            console.log('[PurchaseStore] Acknowledge error:', ackError);
          }
        }
        
        // Update state ONLY after valid purchase
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
        
      } else {
        // iOS - use requestSubscription with sku
        console.log('[PurchaseStore] Step 1: iOS subscription purchase');
        
        const purchase = await RNIap.requestSubscription({ sku: productId });
        
        console.log('[PurchaseStore] Step 2: Purchase result:', JSON.stringify(purchase, null, 2));
        
        const purchaseData = Array.isArray(purchase) ? purchase[0] : purchase;
        const isValidPurchase = purchaseData && 
          (purchaseData.transactionId || purchaseData.productId);
        
        if (!isValidPurchase) {
          set({ isLoading: false });
          return false;
        }
        
        // Finish transaction on iOS
        try {
          await RNIap.finishTransaction({ purchase: purchaseData, isConsumable: false });
        } catch (finishError) {
          console.log('[PurchaseStore] Finish error:', finishError);
        }
        
        await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, 'true');
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SUBSCRIPTION, productId);
        set({ isPremium: true, activeSubscription: productId, isLoading: false });
        
        // Sync with backend
        try {
          const { useAuthStore } = require('./authStore');
          const { token, user } = useAuthStore.getState();
          if (token && user?.user_id) {
            await get().syncWithBackend(token, user.user_id);
          }
        } catch (syncError) {
          console.log('[PurchaseStore] Sync after purchase error:', syncError);
        }
        
        return true;
      }
      
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
      
      if (error.code === 'E_USER_CANCELLED' || error.message?.includes('cancelled')) {
        set({ isLoading: false });
        return false;
      }
      
      set({ isLoading: false, error: error.message || 'Subscription failed' });
      return false;
    }
  },

  restorePurchases: async () => {
    if (Platform.OS === 'web' || !RNIap) return;
    
    console.log('[PurchaseStore] Restoring purchases...');
    set({ isLoading: true, error: null });
    
    try {
      const purchases = await RNIap.getAvailablePurchases();
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

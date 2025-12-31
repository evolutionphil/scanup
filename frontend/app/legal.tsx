/**
 * Legal Page Component - Renders Terms, Privacy, or Support pages
 * Fetches content from backend and caches locally
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../src/store/i18nStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Markdown from 'react-native-markdown-display';

const BRAND_BLUE = '#3E51FB';

// Get backend URL
const getBackendUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
    || process.env.EXPO_PUBLIC_BACKEND_URL 
    || '';
  // Remove trailing slash if present
  const cleanUrl = backendUrl.replace(/\/$/, '');
  console.log('[Legal] Backend URL:', cleanUrl);
  return cleanUrl;
};

export default function LegalPageScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { currentLanguage, t } = useI18n();
  
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Page titles
  const pageTitles: Record<string, string> = {
    terms: t('terms_conditions', 'Terms & Conditions'),
    privacy: t('privacy_policy', 'Privacy Policy'),
    support: t('help_support', 'Help & Support'),
  };

  useEffect(() => {
    const loadContent = async () => {
      // Validate page type
      if (!type || !['terms', 'privacy', 'support'].includes(type)) {
        console.log('[Legal] Invalid or missing page type:', type);
        setError('Invalid page type');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        const pageType = type as 'terms' | 'privacy' | 'support';
        console.log('[Legal] Loading page type:', pageType, 'language:', currentLanguage);
        
        // Check cache first
        const cacheKey = `@scanup_legal_${pageType}_${currentLanguage}`;
        
        // Fetch from backend
        const backendUrl = getBackendUrl();
        
        // If no backend URL, try relative path
        const fetchUrl = backendUrl 
          ? `${backendUrl}/api/content/legal/${pageType}?language_code=${currentLanguage}`
          : `/api/content/legal/${pageType}?language_code=${currentLanguage}`;
        console.log('[Legal] Fetching from:', fetchUrl);
        
        const response = await fetch(fetchUrl);
        console.log('[Legal] Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Legal] Got content length:', data.content?.length || 0);
          const pageContent = data.content || '';
          setContent(pageContent);
          
          // Cache the content
          await AsyncStorage.setItem(cacheKey, pageContent);
        } else {
          // Try cache
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            console.log('[Legal] Using cached content');
            setContent(cached);
          } else {
            throw new Error(`HTTP ${response.status}: Failed to load content`);
          }
        }
      } catch (err) {
        console.error('[Legal] Error loading legal page:', err);
        setError(t('error', 'Failed to load content. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    };

    if (type) {
      loadContent();
    }
  }, [type, currentLanguage]);

  const markdownStyles = {
    body: {
      color: '#333',
      fontSize: 16,
      lineHeight: 24,
    },
    heading1: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: '#111',
      marginTop: 20,
      marginBottom: 12,
    },
    heading2: {
      fontSize: 20,
      fontWeight: '600' as const,
      color: '#111',
      marginTop: 16,
      marginBottom: 8,
    },
    heading3: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: '#333',
      marginTop: 12,
      marginBottom: 6,
    },
    paragraph: {
      marginBottom: 12,
    },
    listItem: {
      marginBottom: 6,
    },
    bullet_list: {
      marginBottom: 12,
    },
    strong: {
      fontWeight: '600' as const,
    },
    link: {
      color: BRAND_BLUE,
    },
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: pageTitles[type || 'terms'] || 'Legal',
          headerStyle: { backgroundColor: BRAND_BLUE },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: '600' },
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_BLUE} />
          <Text style={styles.loadingText}>{t('loading', 'Loading...')}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Markdown style={markdownStyles}>{content}</Markdown>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

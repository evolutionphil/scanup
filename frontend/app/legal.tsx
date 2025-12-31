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
import { useLegalContent, useTranslation } from '../src/store/translationStore';
import Markdown from 'react-native-markdown-display';

const BRAND_BLUE = '#3E51FB';

export default function LegalPageScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { fetchLegalPage } = useLegalContent();
  const { t } = useTranslation();
  
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Page titles
  const pageTitles: Record<string, string> = {
    terms: t('terms_conditions'),
    privacy: t('privacy_policy'),
    support: t('help_support'),
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const pageType = type as 'terms' | 'privacy' | 'support';
        const pageContent = await fetchLegalPage(pageType);
        setContent(pageContent);
      } catch (err) {
        console.error('Error loading legal page:', err);
        setError('Failed to load content. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (type) {
      loadContent();
    }
  }, [type]);

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
          <Text style={styles.loadingText}>{t('loading')}</Text>
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

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useDocumentStore, Document } from '../../src/store/documentStore';
import DocumentCard from '../../src/components/DocumentCard';
import LoadingScreen from '../../src/components/LoadingScreen';

export default function DocumentsScreen() {
  const { user, token } = useAuthStore();
  const { documents, isLoading, fetchDocuments, deleteDocument } = useDocumentStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = async () => {
    if (token) {
      try {
        await fetchDocuments(token);
      } catch (e) {
        console.error('Failed to load documents:', e);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [token])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const handleDocumentPress = (doc: Document) => {
    router.push(`/document/${doc.document_id}`);
  };

  const handleDocumentLongPress = (doc: Document) => {
    Alert.alert(
      doc.name,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (token) {
              try {
                await deleteDocument(token, doc.document_id);
              } catch (e) {
                Alert.alert('Error', 'Failed to delete document');
              }
            }
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrapper}>
        <Ionicons name="documents-outline" size={60} color="#475569" />
      </View>
      <Text style={styles.emptyTitle}>No Documents Yet</Text>
      <Text style={styles.emptyText}>
        Tap the scan button below to scan your first document
      </Text>
    </View>
  );

  if (isLoading && documents.length === 0) {
    return <LoadingScreen message="Loading documents..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'User'}</Text>
          <Text style={styles.title}>Your Documents</Text>
        </View>
        {!user?.is_premium && (
          <TouchableOpacity
            style={styles.premiumBadge}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.premiumText}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>

      {user && !user.is_premium && (
        <View style={styles.ocrBanner}>
          <Ionicons name="text" size={18} color="#3B82F6" />
          <Text style={styles.ocrBannerText}>
            {user.ocr_remaining_today} OCR scans remaining today
          </Text>
        </View>
      )}

      <FlatList
        data={documents}
        keyExtractor={(item) => item.document_id}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => handleDocumentPress(item)}
            onLongPress={() => handleDocumentLongPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  ocrBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  ocrBannerText: {
    fontSize: 13,
    color: '#3B82F6',
  },
  listContent: {
    padding: 12,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});

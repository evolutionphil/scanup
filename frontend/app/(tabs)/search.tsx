import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { useDocumentStore, Document } from '../../src/store/documentStore';
import DocumentCard from '../../src/components/DocumentCard';

export default function SearchScreen() {
  const { token } = useAuthStore();
  const { theme } = useThemeStore();
  const { documents, fetchDocuments } = useDocumentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchDocuments(token);
      }
    }, [token])
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = documents.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query.toLowerCase()) ||
          doc.ocr_full_text?.toLowerCase().includes(query.toLowerCase()) ||
          doc.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredDocs(filtered);
    } else {
      setFilteredDocs([]);
    }
  };

  const handleDocumentPress = (doc: Document) => {
    router.push(`/document/${doc.document_id}`);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconWrapper, { backgroundColor: theme.surface }]}>
        <Ionicons name="search-outline" size={60} color={theme.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {searchQuery ? 'No Results Found' : 'Search Documents'}
      </Text>
      <Text style={[styles.emptyText, { color: theme.textMuted }]}>
        {searchQuery
          ? 'Try different keywords or check the spelling'
          : 'Search by name, tags, or OCR text'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Search</Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search documents, tags, or text..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={searchQuery ? filteredDocs : []}
        keyExtractor={(item) => item.document_id}
        renderItem={({ item }) => (
          <DocumentCard document={item} onPress={() => handleDocumentPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

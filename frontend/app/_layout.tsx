import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useThemeStore } from '../src/store/themeStore';
import { useI18n } from '../src/store/i18nStore';

export default function RootLayout() {
  const { theme, mode, loadTheme } = useThemeStore();
  const initializeI18n = useI18n((state) => state.initialize);

  useEffect(() => {
    loadTheme();
    // Initialize i18n - detect device language and fetch translations
    initializeI18n();
  }, []);

  return (
    <SafeAreaProvider style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="document/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="folder/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="edit-page" options={{ presentation: 'modal' }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';

// This is a placeholder screen - the scan button redirects to /scanner
export default function ScanScreen() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});

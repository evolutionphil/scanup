/**
 * PendingBadge Component
 * 
 * Shows a visual indicator for documents with pending operations
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PendingBadgeProps {
  size?: 'small' | 'medium';
  showText?: boolean;
}

export default function PendingBadge({ size = 'small', showText = false }: PendingBadgeProps) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const isSmall = size === 'small';

  return (
    <Animated.View 
      style={[
        styles.container,
        isSmall ? styles.containerSmall : styles.containerMedium,
        { opacity: pulseAnim }
      ]}
    >
      <Ionicons 
        name="time-outline" 
        size={isSmall ? 10 : 14} 
        color="#FFFFFF" 
      />
      {showText && (
        <Text style={[styles.text, isSmall ? styles.textSmall : styles.textMedium]}>
          Pending
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    gap: 4,
  },
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  containerMedium: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 9,
  },
  textMedium: {
    fontSize: 12,
  },
});

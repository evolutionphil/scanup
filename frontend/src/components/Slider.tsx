import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import RNSlider from '@react-native-community/slider';
import { useThemeStore } from '../store/themeStore';

interface SliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}

export default function Slider({
  label,
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  showValue = true,
  valueFormatter = (v) => `${Math.round(v)}`,
}: SliderProps) {
  const { theme } = useThemeStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {showValue && (
          <Text style={[styles.value, { color: theme.primary }]}>
            {valueFormatter(value)}
          </Text>
        )}
      </View>
      <RNSlider
        style={styles.slider}
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';

export default function OfflineIndicator() {
  const { theme } = useThemeStore();
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      
      if (offline) {
        setShowBanner(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowBanner(false);
        });
      }
    });

    // Check initial state
    NetInfo.fetch().then((state) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);
      if (offline) {
        setShowBanner(true);
        slideAnim.setValue(0);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!showBanner) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: isOffline ? '#EF4444' : '#10B981',
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <Ionicons 
        name={isOffline ? 'cloud-offline' : 'cloud-done'} 
        size={18} 
        color="#FFF" 
      />
      <Text style={styles.text}>
        {isOffline 
          ? 'You are offline. Changes will sync when connected.' 
          : 'Back online! Syncing...'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 9999,
  },
  text: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

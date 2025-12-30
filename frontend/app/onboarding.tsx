import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@scanup_onboarding_complete';
const SWIPE_THRESHOLD = 50;

// Brand colors from Figma
const BRAND_BLUE = '#3E51FB';
const BRAND_BLUE_DARK = '#2035F0';
const MAIN_TEXT = '#1B1B1B';
const SUB_TEXT = '#8A8A8A';
const DOT_INACTIVE = '#D5D5D5';

interface GuideSlide {
  id: string;
  title: string;
  description: string;
  image: any;
}

const SLIDES: GuideSlide[] = [
  {
    id: '1',
    title: 'Scan',
    description: 'Use your phone camera easily to scan your documents',
    image: require('../assets/images/onboarding-scan.png'),
  },
  {
    id: '2',
    title: 'Save',
    description: 'Save your document as PDF, create and share encrypted files',
    image: require('../assets/images/onboarding-save.png'),
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        gestureX.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        gestureX.current = gestureState.dx;
        const newTranslateX = -currentIndex * SCREEN_WIDTH + gestureState.dx;
        translateX.setValue(newTranslateX);
      },
      onPanResponderRelease: () => {
        let newIndex = currentIndex;
        
        if (gestureX.current < -SWIPE_THRESHOLD && currentIndex < SLIDES.length - 1) {
          newIndex = currentIndex + 1;
        } else if (gestureX.current > SWIPE_THRESHOLD && currentIndex > 0) {
          newIndex = currentIndex - 1;
        }
        
        Animated.spring(translateX, {
          toValue: -newIndex * SCREEN_WIDTH,
          useNativeDriver: true,
          friction: 10,
          tension: 50,
        }).start();
        
        setCurrentIndex(newIndex);
      },
    })
  ).current;

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/premium');
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      router.replace('/premium');
    }
  };

  const handleDotPress = (index: number) => {
    Animated.spring(translateX, {
      toValue: -index * SCREEN_WIDTH,
      useNativeDriver: true,
      friction: 10,
      tension: 50,
    }).start();
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Main Content Area with Pan Responder */}
      <View style={styles.contentArea} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.slidesContainer,
            {
              width: SCREEN_WIDTH * SLIDES.length,
              transform: [{ translateX }],
            },
          ]}
        >
          {SLIDES.map((item) => (
            <View key={item.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
              {/* Image Container with decorative elements */}
              <View style={styles.imageContainer}>
                {/* Blue gradient bar at top of image container */}
                <LinearGradient
                  colors={[BRAND_BLUE, BRAND_BLUE_DARK]}
                  style={styles.topBar}
                />
                
                {/* Gradient shadow below bar */}
                <LinearGradient
                  colors={['rgba(76, 94, 255, 0.186)', 'rgba(76, 94, 255, 0)']}
                  style={styles.gradientShadow}
                />
                
                {/* Main illustration image */}
                <Image
                  source={item.image}
                  style={styles.slideImage}
                  resizeMode="contain"
                />
              </View>

              {/* Text Content */}
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom Fixed Area */}
      <View style={styles.bottomArea}>
        {/* Pagination dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleDotPress(index)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentIndex ? BRAND_BLUE : DOT_INACTIVE,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedText}>Get started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  slidesContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  imageContainer: {
    width: 209,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 10,
    width: 189,
    height: 7,
    borderRadius: 20,
    zIndex: 2,
  },
  gradientShadow: {
    position: 'absolute',
    top: 63,
    left: 24,
    width: 161,
    height: 145,
    zIndex: 1,
  },
  slideImage: {
    width: 142,
    height: 166,
    zIndex: 3,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
    color: MAIN_TEXT,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 19,
    textAlign: 'center',
    color: SUB_TEXT,
    maxWidth: 209,
  },
  bottomArea: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  getStartedButton: {
    width: 172,
    height: 60,
    backgroundColor: BRAND_BLUE,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 27,
    textAlign: 'center',
    color: '#FFFFFF',
  },
});

// Helper function to check onboarding status
export async function checkOnboardingStatus(): Promise<boolean> {
  try {
    const status = await AsyncStorage.getItem(ONBOARDING_KEY);
    return status === 'true';
  } catch {
    return false;
  }
}

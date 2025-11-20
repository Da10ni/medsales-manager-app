import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { Title, Text, Button, useTheme } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
  backgroundColor: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Manage Sales Team',
    description: 'Oversee your sales representatives, track their performance, and manage their availability.',
    image: require('../../assets/images/manageSales.jpg'),
    backgroundColor: '#000001ff',
  },
  {
    id: '2',
    title: 'Assign Routes',
    description: 'Create and assign optimized routes to your sales reps with multiple locations and tasks.',
    image: require('../../assets/images/Assign-routes.jpg'),
    backgroundColor: '#000000ff',
  },
  {
    id: '3',
    title: 'Track Performance',
    description: 'Monitor real-time progress, view analytics, and make data-driven decisions.',
    image: require('../../assets/images/track-perfomance.jpg'),
    backgroundColor: '#000000ff',
  },
];

const OnboardingScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index || 0);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    navigation.replace('Login');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View
      style={[styles.slide, { backgroundColor: item.backgroundColor }]}
    >
      <View style={styles.slideContent}>
        <Image source={item.image} style={styles.slideImage} resizeMode="contain" />
        <Title style={styles.slideTitle}>{item.title}</Title>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                currentIndex === index && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          <Button
            mode="text"
            onPress={handleSkip}
            textColor={slides[currentIndex].backgroundColor}
          >
            Skip
          </Button>
          <Button
            mode="contained"
            onPress={handleNext}
            buttonColor={slides[currentIndex].backgroundColor}
          >
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  slide: {
    width,
    height: height * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    padding: 40,
  },
  slideImage: {
    width: width * 0.9,
    height: height * 0.4,
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#bda6a6ff',
    marginBottom: 16,
    textAlign: 'center',
  },
  slideDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#2196F3',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default OnboardingScreen;

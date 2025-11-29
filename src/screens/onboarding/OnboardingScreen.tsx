import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Manage Your Team",
    description:
      "Add, monitor, and manage your sales reps easily. Stay in control of your field team performance.",
    image: require("../../../assets/images/manageYourTeam.png"),
  },
  {
    id: "2",
    title: "Assign Routes Quickly",
    description:
      "Assign daily or weekly routes to your sales reps with just one tap. Keep everything organized.",
    image: require("../../../assets/images/assignRouteQuickly.png"),
  },
  {
    id: "3",
    title: "Track Sales Activity",
    description:
      "Assign daily or weekly routes to your sales reps with just one tap. Keep everything organized.",
    image: require("../../../assets/images/trackActivity.png"),
  },
];

const OnboardingScreen = ({ navigation }: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.replace("Login");
    }
  };

  const handleSkip = () => {
    navigation.replace("Login");
  };

  const renderSlide = ({ item }: { item: (typeof slides)[0] }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.content]}>
        <Image
          source={item.image}
          style={styles.slideImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Bottom Buttons */}
      <View style={styles.footer}>
        {currentIndex < slides.length - 1 ? (
          <>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={[styles.nextButton, { backgroundColor: '#ceedff' }]}>
              <LinearGradient
                colors={["#ceedff", "#ceedff"]}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextText}>Next</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.getStartedButton}
            contentStyle={styles.getStartedContent}
            labelStyle={styles.getStartedLabel}
            buttonColor="#ceedff"
            textColor="#35a6e2"
          >
            Get Started
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4CAF50",
  },
  slide: {
    flex: 1,
  },
  gradient: {},
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#fff",
  },
  emoji: {
    fontSize: 120,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "rgba(0, 0, 0, 0.9)",
    textAlign: "center",
    lineHeight: 24,
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  dotActive: {
    backgroundColor: "#35a6e2",
    width: 24,
  },
  dotInactive: {
    backgroundColor: "#E8F5E9"
  },
  slideImage: {
    width: width * 0.9,
    height: height * 0.4,
    marginBottom: 40,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 50,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: "#35a6e2",
  },
  skipText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  nextButton: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ceedffs",
  },
  nextButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  nextText: {
    color: "#35a6e2",
    fontSize: 16,
    fontWeight: "600",
  },
  getStartedButton: {
    flex: 1,
    borderRadius: 12,
    elevation: 4,
  },
  getStartedContent: {
    paddingVertical: 8,
  },
  getStartedLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
});

export default OnboardingScreen;

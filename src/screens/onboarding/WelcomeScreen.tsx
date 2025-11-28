import React from "react";
import { View, StyleSheet } from "react-native";
import { Title, Text, Button, useTheme } from "react-native-paper";

const WelcomeScreen = ({ navigation }: any) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>MS</Text>
          </View>
          <Title style={styles.title}>MedSales Manager</Title>
          <Text style={styles.subtitle}>Your Medical Sales Companion</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate("Onboarding")}
          style={styles.getStartedButton}
          contentStyle={styles.buttonContent}
          buttonColor="#fff"
          textColor={theme.colors.primary}
        >
          Get Started
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate("Login")}
          style={styles.loginButton}
          textColor="#fff"
        >
          Already have an account? Login
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#2196F3",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
  getStartedButton: {
    marginBottom: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginButton: {
    marginTop: 8,
  },
});

export default WelcomeScreen;

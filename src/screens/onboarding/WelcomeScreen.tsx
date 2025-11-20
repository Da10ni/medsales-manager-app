import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, Text, Button, useTheme } from 'react-native-paper';

const WelcomeScreen = ({ navigation }: any) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>MM</Text>
          </View>
          <Title style={styles.title}>MedSales Manager</Title>
          <Text style={styles.subtitle}>Manage Your Sales Team</Text>
        </View>

        <View style={styles.features}>
          <FeatureItem
            icon="👥"
            text="Manage sales representatives"
          />
          <FeatureItem
            icon="🗺️"
            text="Assign optimized routes"
          />
          <FeatureItem
            icon="📊"
            text="Track team performance"
          />
          <FeatureItem
            icon="📈"
            text="View detailed analytics"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Onboarding')}
          style={styles.getStartedButton}
          contentStyle={styles.buttonContent}
          buttonColor="#fff"
          textColor={theme.colors.primary}
        >
          Get Started
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.loginButton}
          textColor="#fff"
        >
          Already have an account? Login
        </Button>
      </View>
    </View>
  );
};

const FeatureItem = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  features: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
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

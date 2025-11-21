import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Onboarding Screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

// Auth Screens
import PhoneSignUpScreen from '../screens/auth/PhoneSignUpScreen';
import ModernProfileSetupScreen from '../screens/auth/ModernProfileSetupScreen';

// Main Screens
import ModernDashboardScreen from '../screens/main/ModernDashboardScreen';
import ModernProfileScreen from '../screens/main/ModernProfileScreen';
import SalesRepsScreen from '../screens/SalesRepsScreen';
import LocationsScreen from '../screens/LocationsScreen';
import RoutesScreen from '../screens/RoutesScreen';
import AssignRouteScreen from '../screens/AssignRouteScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tabs Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ModernDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SalesReps"
        component={SalesRepsScreen}
        options={{
          tabBarLabel: 'Sales Reps',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Locations"
        component={LocationsScreen}
        options={{
          tabBarLabel: 'Locations',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RoutesTab"
        component={RoutesScreen}
        options={{
          tabBarLabel: 'Routes',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-path" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ModernProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator
const AppNavigator = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Login"
              component={PhoneSignUpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProfileSetup"
              component={ModernProfileSetupScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AssignRoute"
              component={AssignRouteScreen}
              options={{
                headerShown: true,
                title: 'Assign Route',
                headerStyle: {
                  backgroundColor: '#2196F3',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';

// Custom Blue & White Theme
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2196F3', // Blue
    secondary: '#2196F3', // Blue (instead of purple)
    tertiary: '#64B5F6', // Light Blue
    primaryContainer: '#BBDEFB', // Very Light Blue
    secondaryContainer: '#E3F2FD', // Extra Light Blue
    onPrimary: '#FFFFFF', // White text on primary
    onSecondary: '#FFFFFF', // White text on secondary
    background: '#FFFFFF', // White background
    surface: '#FFFFFF', // White surface
    surfaceVariant: '#F5F5F5', // Light gray
    outline: '#2196F3', // Blue outline
  },
};

export default function App() {
  return (
    <ReduxProvider store={store}>
      <PaperProvider theme={theme}>
        <AppNavigator />
        <StatusBar style="auto" />
      </PaperProvider>
    </ReduxProvider>
  );
}

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';

import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Allow screen capture/sharing to prevent "content hidden for security reason" message
    const enableScreenCapture = async () => {
      try {
        await ScreenCapture.allowScreenCaptureAsync();
        console.log('Screen capture enabled successfully');
      } catch (error) {
        console.warn('Failed to enable screen capture:', error);
      }
    };

    enableScreenCapture();

    // Cleanup function (optional)
    return () => {
      // Could revert to default behavior if needed in the future
      // ScreenCapture.preventScreenCaptureAsync();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

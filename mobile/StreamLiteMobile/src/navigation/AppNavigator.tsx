import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { VideoPlayerScreen } from '../screens/VideoPlayerScreen';
import { VideoUploadScreen } from '../screens/VideoUploadScreen';
import { TestUploadScreen } from '../screens/TestUploadScreen';
import { PlaylistsScreen } from '../screens/PlaylistsScreen';
import { PlaylistDetailScreen } from '../screens/PlaylistDetailScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Loading component
const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007bff" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Auth Stack Navigator (for unauthenticated users)
const AuthStackNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Profile Stack Navigator (for profile-related screens)
const ProfileStackNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

// Main Tab Navigator (for authenticated users)
const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  // Calculate tab bar height and padding based on safe area
  const tabBarHeight = Platform.OS === 'android' ? 60 + Math.max(insets.bottom, 0) : 60;
  const tabBarPaddingBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 5) : 5;
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#a0a3bd',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopWidth: 0,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 5,
          height: tabBarHeight,
          // Ensure tab bar is positioned correctly on Android
          ...(Platform.OS === 'android' && {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginBottom: Platform.OS === 'android' ? 2 : 0,
        },
        headerStyle: {
          backgroundColor: '#1a1a2e',
        },
        headerTintColor: '#f5f7fa',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={({ navigation }) => ({
        headerShown: false,
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons 
            name="home-outline" 
            size={20} 
            color={focused ? '#e94560' : '#a0a3bd'} 
          />
        ),
      })}
    />
    <Tab.Screen
      name="Subscriptions"
      component={SubscriptionScreen}
      options={{
        headerShown: false,
        tabBarLabel: 'Subscriptions',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons 
            name="people-outline" 
            size={20} 
            color={focused ? '#e94560' : '#a0a3bd'} 
          />
        ),
      }}
    />
    <Tab.Screen
      name="Upload"
      component={VideoUploadScreen}
      options={{
        headerShown: false,
        tabBarLabel: 'Upload',
        tabBarIcon: ({ color, focused }) => (
          <View style={styles.uploadButton}>
            <Ionicons 
              name="add" 
              size={16} 
              color="#ffffff" 
            />
          </View>
        ),
      }}
    />
    <Tab.Screen
      name="Playlists"
      component={PlaylistsScreen}
      options={{
        headerShown: false,
        tabBarLabel: 'Playlists',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons 
            name="list-outline" 
            size={20} 
            color={focused ? '#e94560' : '#a0a3bd'} 
          />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileStackNavigator}
      options={{
        headerShown: false,
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons 
            name="person-outline" 
            size={20} 
            color={focused ? '#e94560' : '#a0a3bd'} 
          />
        ),
      }}
    />
  </Tab.Navigator>
  );
};

// Main Stack Navigator (includes tabs and modal screens)
const MainStackNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen 
        name="VideoPlayer" 
        component={VideoPlayerScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="VideoUpload" 
        component={VideoUploadScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Playlists" 
        component={PlaylistsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="PlaylistDetail" 
        component={PlaylistDetailScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

// Main App Navigator
export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  // Show loading screen while auth is loading
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconText: {
    fontSize: 18,
  },
  uploadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButton: {
    marginRight: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

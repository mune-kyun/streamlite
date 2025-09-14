import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth';
import { getApiEndpoint, getTimeout, config } from '../config/environment';

// Auth Service base URL from configuration
const AUTH_SERVICE_URL = getApiEndpoint('auth');

// Create axios instance with base configuration
const authApi = axios.create({
  baseURL: AUTH_SERVICE_URL,
  timeout: getTimeout('auth'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
authApi.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
authApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Don't try to refresh token for login/register requests
    const isAuthRequest = error.config?.url?.includes('/auth/login') || 
                         error.config?.url?.includes('/auth/register');
    
    if (error.response?.status === 401 && !isAuthRequest) {
      // Token expired, try to refresh
      try {
        await refreshAuthToken();
        // Retry the original request
        return authApi.request(error.config);
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
        throw new Error('Session expired. Please login again.');
      }
    }
    throw error;
  }
);

export const authService = {
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await authApi.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },

  // User registration
  async register(email: string, password: string): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await authApi.post('/auth/register', {
        email,
        password,
      });
      
      // Map access_token to token for frontend compatibility
      const token = response.data.access_token || response.data.token;
      if (!token) {
        throw new Error('No token received from server');
      }
      
      const authData = {
        ...response.data,
        token
      };
      
      await AsyncStorage.multiSet([
        ['auth_token', token],
        ['refresh_token', response.data.refresh_token],
        ['user_data', JSON.stringify(response.data.user)],
      ]);
      
      return authData;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      throw new Error(message);
    }
  },

  // User login
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Use direct fetch to avoid axios interceptor issues
      const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.log('Login failed with response:', responseData);
        // Handle structured error response
        if (responseData.code) {
          const errorWithCode = new Error(responseData.message);
          (errorWithCode as any).code = responseData.code;
          throw errorWithCode;
        }
        throw new Error(responseData.error || responseData.message || 'Login failed');
      }
      
      // Map access_token to token for frontend compatibility
      const token = responseData.access_token || responseData.token;
      if (!token) {
        throw new Error('No token received from server');
      }
      
      const authData = {
        ...responseData,
        token
      };
      
      // Store tokens and user data
      await AsyncStorage.multiSet([
        ['auth_token', token],
        ['refresh_token', responseData.refresh_token],
        ['user_data', JSON.stringify(responseData.user)],
      ]);
      
      return authData;
    } catch (error: any) {
      console.log('Login error:', error.message, 'Code:', error.code);
      throw error;
    }
  },

  // Validate token
  async validateToken(): Promise<User> {
    try {
      const response: AxiosResponse<{ user: User }> = await authApi.get('/auth/validate');
      return response.data.user;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Token validation failed';
      throw new Error(message);
    }
  },

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response: AxiosResponse<AuthResponse> = await authApi.post('/auth/refresh', {
        refresh_token: refreshToken,
      });
      
      // Map access_token to token for frontend compatibility
      const token = response.data.access_token || response.data.token;
      if (!token) {
        throw new Error('No token received from server');
      }
      
      const authData = {
        ...response.data,
        token
      };
      
      // Update stored tokens
      await AsyncStorage.multiSet([
        ['auth_token', token],
        ['refresh_token', response.data.refresh_token],
      ]);
      
      return authData;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Token refresh failed';
      throw new Error(message);
    }
  },

  // Logout (clear local storage)
  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Get stored user data
  async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  },

  // Get stored token
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  },
};

// Helper function for token refresh
async function refreshAuthToken(): Promise<void> {
  const refreshToken = await AsyncStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(`${AUTH_SERVICE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });

  await AsyncStorage.multiSet([
    ['auth_token', response.data.token],
    ['refresh_token', response.data.refresh_token],
  ]);
}

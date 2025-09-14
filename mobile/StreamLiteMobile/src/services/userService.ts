import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiEndpoint, getTimeout } from '../config/environment';

// User Service base URL from configuration
const USER_SERVICE_URL = getApiEndpoint('user');

// Types for User Service
export interface Profile {
  id: number;
  user_id: number;
  display_name: string;
  avatar: string;
  bio: string;
  created_at: string;
  updated_at: string;
}


export interface UserPreference {
  id: number;
  user_id: number;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
  avatar?: string;
  bio?: string;
}


export interface UserPreferenceRequest {
  key: string;
  value: string;
}

export interface UserPreferencesRequest {
  preferences: UserPreferenceRequest[];
}

// Create axios instance with base configuration
const userApi = axios.create({
  baseURL: USER_SERVICE_URL,
  timeout: getTimeout('default'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
userApi.interceptors.request.use(
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
userApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
      throw new Error('Session expired. Please login again.');
    }
    throw error;
  }
);

export const userService = {
  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await userApi.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('User service health check failed:', error);
      return false;
    }
  },

  // Profile Management
  async getProfile(userId: number): Promise<Profile> {
    try {
      const response: AxiosResponse<Profile> = await userApi.get(`/api/v1/profiles/${userId}`);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to get profile';
      throw new Error(message);
    }
  },

  async updateProfile(userId: number, profileData: UpdateProfileRequest): Promise<Profile> {
    try {
      const response: AxiosResponse<Profile> = await userApi.put(`/api/v1/profiles/${userId}`, profileData);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update profile';
      throw new Error(message);
    }
  },


  // User Preferences Management
  async getUserPreferences(userId: number): Promise<UserPreference[]> {
    try {
      const response: AxiosResponse<UserPreference[]> = await userApi.get(`/api/v1/preferences/${userId}`);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to get user preferences';
      throw new Error(message);
    }
  },

  async updateUserPreferences(userId: number, preferences: UserPreferencesRequest): Promise<UserPreference[]> {
    try {
      const response: AxiosResponse<UserPreference[]> = await userApi.put(`/api/v1/preferences/${userId}`, preferences);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update user preferences';
      throw new Error(message);
    }
  },

  async getUserPreference(userId: number, key: string): Promise<UserPreference> {
    try {
      const response: AxiosResponse<UserPreference> = await userApi.get(`/api/v1/preferences/${userId}/${key}`);
      return response.data;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to get user preference';
      throw new Error(message);
    }
  },

  async deleteUserPreference(userId: number, key: string): Promise<void> {
    try {
      await userApi.delete(`/api/v1/preferences/${userId}/${key}`);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete user preference';
      throw new Error(message);
    }
  },
};

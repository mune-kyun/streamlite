import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiEndpoint } from '../config/environment';

export interface Subscription {
  id: number;
  follower_id: number;
  following_id: number;
  display_name: string;
  avatar: string;
  created_at: string;
}

export interface SubscriptionStats {
  subscriber_count: number;
  subscription_count: number;
}

export interface SubscriptionResponse {
  subscriptions: Subscription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface SubscribersResponse {
  subscribers: Subscription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface CreateSubscriptionRequest {
  following_id: number;
}

class SubscriptionService {
  private baseURL: string;

  constructor() {
    this.baseURL = `${getApiEndpoint('user')}/api/v1`;
  }

  // Helper method to get authorization headers
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }

    return headers;
  }

  // Subscribe to a user
  async subscribe(followerID: number, followingID: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          following_id: followingID,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to subscribe',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Subscribe error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // Unsubscribe from a user
  async unsubscribe(followerID: number, followingID: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/subscriptions/${followerID}/${followingID}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to unsubscribe',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // Get user's subscriptions (users they follow)
  async getUserSubscriptions(userID: number, page: number = 1, limit: number = 10): Promise<{ success: boolean; data?: SubscriptionResponse; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/subscriptions/user/${userID}?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch subscriptions',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Get subscriptions error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // Get user's subscribers (users who follow them)
  async getUserSubscribers(userID: number, page: number = 1, limit: number = 10): Promise<{ success: boolean; data?: SubscribersResponse; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/subscribers/user/${userID}?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch subscribers',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Get subscribers error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // Get subscription statistics
  async getSubscriptionStats(userID: number): Promise<{ success: boolean; data?: SubscriptionStats; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/subscriptions/stats/${userID}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to fetch subscription stats',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Get subscription stats error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // Check if user is subscribed to another user
  async checkSubscriptionStatus(followerID: number, followingID: number): Promise<{ success: boolean; data?: { is_subscribed: boolean }; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/subscriptions/status/${followerID}/${followingID}`, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to check subscription status',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Check subscription status error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }
}

export const subscriptionService = new SubscriptionService();

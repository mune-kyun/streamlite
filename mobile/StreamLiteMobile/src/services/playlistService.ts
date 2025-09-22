import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiEndpoint, getTimeout } from '../config/environment';
import { 
  Playlist, 
  PlaylistListResponse, 
  PlaylistVideosResponse,
  CreatePlaylistRequest,
  UpdatePlaylistRequest,
  AddVideoToPlaylistRequest,
  ReorderPlaylistVideosRequest,
  PlaylistListParams,
  PlaylistVideosParams
} from '../types/playlist';

const API_BASE_URL = `${getApiEndpoint('user')}/api/v1`;

// Create axios instance with interceptors for authentication
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: getTimeout('default'),
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    console.log('=== PLAYLIST SERVICE REQUEST ===');
    console.log('Request URL:', config.url);
    console.log('Request Method:', config.method?.toUpperCase());
    
    const token = await AsyncStorage.getItem('auth_token');
    console.log('Auth Token Found:', token ? 'YES' : 'NO');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Authorization Header Set:', `Bearer ${token.substring(0, 20)}...`);
    } else {
      console.log('❌ No auth token found in AsyncStorage');
    }
    
    console.log('Final Headers:', config.headers);
    console.log('=== REQUEST SENT ===');
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
  }
  return config;
});

// Handle response errors with detailed logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error logging
    console.error('=== PLAYLIST API ERROR ===');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Request URL:', error.config?.url);
    console.error('Request Method:', error.config?.method?.toUpperCase());
    console.error('Request Headers:', error.config?.headers);
    
    if (error.response) {
      // Server responded with error status
      console.error('Response Status:', error.response.status);
      console.error('Response Headers:', error.response.headers);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No Response Received');
      console.error('Request Details:', error.request);
    } else {
      // Something else happened
      console.error('Request Setup Error:', error.message);
    }
    console.error('=== END ERROR LOG ===');
    
    return Promise.reject(error);
  }
);

export class PlaylistService {
  /**
   * Health check for the User Service
   */
  static async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      const userServiceUrl = getApiEndpoint('user');
      console.log('=== PLAYLIST SERVICE HEALTH CHECK ===');
      console.log('Checking User Service at:', userServiceUrl);
      
      // Try health endpoint first (without /api/v1 prefix)
      const response = await axios.get(`${userServiceUrl}/health`, { timeout: 5000 });
      console.log('Health check response:', response.data);
      console.log('=== HEALTH CHECK SUCCESS ===');
      
      return { status: 'healthy', message: 'User Service is running' };
    } catch (error: any) {
      console.error('=== HEALTH CHECK FAILED ===');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Code:', error.code);
      
      if (error.response) {
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
        return { 
          status: 'unhealthy', 
          message: `User Service responded with status ${error.response.status}` 
        };
      } else if (error.request) {
        console.error('No response received from User Service');
        return { 
          status: 'unreachable', 
          message: 'Cannot connect to User Service - check if it\'s running' 
        };
      } else {
        return { 
          status: 'error', 
          message: `Health check failed: ${error.message}` 
        };
      }
    }
  }

  /**
   * Test basic connectivity to User Service
   */
  static async testConnection(): Promise<{ status: string; message: string; details: any }> {
    console.log('=== TESTING USER SERVICE CONNECTION ===');
    
    const userServiceUrl = getApiEndpoint('user');
    const tests = [
      {
        name: 'Health Check',
        url: `${userServiceUrl}/health`,
        method: 'GET'
      },
      {
        name: 'API Base Check',
        url: `${userServiceUrl}/api/v1`,
        method: 'GET'
      },
      {
        name: 'Swagger Docs',
        url: `${userServiceUrl}/swagger/index.html`,
        method: 'GET'
      }
    ];

    const results: any[] = [];

    for (const test of tests) {
      try {
        console.log(`Testing ${test.name} at ${test.url}...`);
        const response = await axios.get(test.url, { timeout: 3000 });
        results.push({
          test: test.name,
          status: 'success',
          statusCode: response.status,
          data: response.data
        });
        console.log(`✅ ${test.name}: SUCCESS (${response.status})`);
      } catch (error: any) {
        results.push({
          test: test.name,
          status: 'failed',
          error: error.message,
          code: error.code,
          statusCode: error.response?.status
        });
        console.log(`❌ ${test.name}: FAILED - ${error.message}`);
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const status = successCount > 0 ? 'partial' : 'failed';
    const message = `${successCount}/${tests.length} tests passed`;

    console.log('=== CONNECTION TEST RESULTS ===');
    console.log('Results:', results);
    console.log(`Status: ${status}, Message: ${message}`);

    return { status, message, details: results };
  }

  /**
   * Get detailed error information from axios error
   */
  static getErrorDetails(error: any): {
    type: string;
    message: string;
    details: string;
    suggestion: string;
  } {
    if (error.response) {
      // Server responded with error status
      return {
        type: 'Server Error',
        message: `HTTP ${error.response.status}: ${error.response.statusText}`,
        details: JSON.stringify(error.response.data, null, 2),
        suggestion: 'Check if the User Service is running and the endpoint exists'
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        type: 'Network Error',
        message: 'No response received from server',
        details: `Request to ${error.config?.url} failed - ${error.message}`,
        suggestion: 'Check if User Service is running on port 8002 and network connectivity'
      };
    } else if (error.code === 'ECONNREFUSED') {
      return {
        type: 'Connection Refused',
        message: 'Connection refused by server',
        details: 'The User Service is not accepting connections',
        suggestion: 'Start the User Service on port 8002'
      };
    } else if (error.code === 'ENOTFOUND') {
      return {
        type: 'Host Not Found',
        message: 'Cannot resolve hostname',
        details: 'localhost could not be resolved',
        suggestion: 'Check network configuration'
      };
    } else if (error.code === 'ETIMEDOUT') {
      return {
        type: 'Timeout',
        message: 'Request timed out',
        details: 'Server did not respond within 10 seconds',
        suggestion: 'Check if User Service is running and responsive'
      };
    } else {
      return {
        type: 'Unknown Error',
        message: error.message || 'An unknown error occurred',
        details: JSON.stringify(error, null, 2),
        suggestion: 'Check console logs for more details'
      };
    }
  }

  /**
   * Get user's playlists with pagination
   */
  static async getUserPlaylists(userId: number, params?: PlaylistListParams): Promise<PlaylistListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/playlists/${userId}?${queryParams.toString()}`;
      const fullUrl = `${API_BASE_URL}${url}`;
      console.log('🔗 [PLAYLIST API] GET User Playlists:', fullUrl);
      console.log('📋 [PLAYLIST API] Parameters:', { userId, params });

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching user playlists:', error);
      throw error;
    }
  }

  /**
   * Create a new playlist
   */
  static async createPlaylist(userId: number, playlistData: CreatePlaylistRequest): Promise<Playlist> {
    try {
      const url = `/playlists/${userId}`;
      const fullUrl = `${API_BASE_URL}${url}`;
      console.log('🔗 [PLAYLIST API] POST Create Playlist:', fullUrl);
      console.log('📋 [PLAYLIST API] Data:', playlistData);

      const response = await api.post(url, playlistData);
      return response.data;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  /**
   * Update an existing playlist
   */
  static async updatePlaylist(playlistId: number, playlistData: UpdatePlaylistRequest): Promise<Playlist> {
    try {
      const response = await api.put(`/playlists/update/${playlistId}`, playlistData);
      return response.data;
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  }

  /**
   * Delete a playlist
   */
  static async deletePlaylist(playlistId: number): Promise<void> {
    try {
      await api.delete(`/playlists/${playlistId}`);
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  /**
   * Get playlist videos with metadata
   */
  static async getPlaylistVideos(playlistId: number, params?: PlaylistVideosParams): Promise<PlaylistVideosResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await api.get(`/playlists/${playlistId}/videos?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      throw error;
    }
  }

  /**
   * Add a video to a playlist
   */
  static async addVideoToPlaylist(playlistId: number, videoData: AddVideoToPlaylistRequest): Promise<void> {
    try {
      await api.post(`/playlists/${playlistId}/videos`, videoData);
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      throw error;
    }
  }

  /**
   * Remove a video from a playlist
   */
  static async removeVideoFromPlaylist(playlistId: number, videoId: number): Promise<void> {
    try {
      await api.delete(`/playlists/${playlistId}/videos/${videoId}`);
    } catch (error) {
      console.error('Error removing video from playlist:', error);
      throw error;
    }
  }

  /**
   * Reorder videos in a playlist
   */
  static async reorderPlaylistVideos(playlistId: number, reorderData: ReorderPlaylistVideosRequest): Promise<void> {
    try {
      await api.put(`/playlists/${playlistId}/reorder`, reorderData);
    } catch (error) {
      console.error('Error reordering playlist videos:', error);
      throw error;
    }
  }

  /**
   * Get playlists that contain a specific video
   */
  static async getPlaylistsContainingVideo(userId: number, videoId: number): Promise<Playlist[]> {
    try {
      // Get all user playlists
      const playlistsResponse = await this.getUserPlaylists(userId, { limit: 100 });
      const playlists: Playlist[] = [];

      // Check each playlist for the video
      for (const playlist of playlistsResponse.playlists) {
        try {
          const videosResponse = await this.getPlaylistVideos(playlist.id, { limit: 100 });
          const hasVideo = videosResponse.playlist.videos.some(pv => pv.video_id === videoId);
          if (hasVideo) {
            playlists.push(playlist);
          }
        } catch (error) {
          console.warn(`Error checking playlist ${playlist.id} for video ${videoId}:`, error);
        }
      }

      return playlists;
    } catch (error) {
      console.error('Error getting playlists containing video:', error);
      throw error;
    }
  }

  /**
   * Check if a video exists in a specific playlist
   */
  static async isVideoInPlaylist(playlistId: number, videoId: number): Promise<boolean> {
    try {
      const response = await this.getPlaylistVideos(playlistId, { limit: 100 });
      return response.playlist.videos.some(pv => pv.video_id === videoId);
    } catch (error) {
      console.error('Error checking if video is in playlist:', error);
      return false;
    }
  }

  /**
   * Get playlist statistics for a user
   */
  static async getPlaylistStats(userId: number): Promise<{
    totalPlaylists: number;
    totalVideos: number;
    averageVideosPerPlaylist: number;
  }> {
    try {
      const response = await this.getUserPlaylists(userId, { limit: 100 });
      const playlists = response.playlists;
      
      const totalPlaylists = playlists.length;
      const totalVideos = playlists.reduce((sum, playlist) => sum + playlist.video_count, 0);
      const averageVideosPerPlaylist = totalPlaylists > 0 ? totalVideos / totalPlaylists : 0;

      return {
        totalPlaylists,
        totalVideos,
        averageVideosPerPlaylist: Math.round(averageVideosPerPlaylist * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting playlist stats:', error);
      throw error;
    }
  }

  /**
   * Search playlists by name
   */
  static async searchPlaylists(userId: number, searchTerm: string): Promise<Playlist[]> {
    try {
      const response = await this.getUserPlaylists(userId, { limit: 100 });
      return response.playlists.filter(playlist => 
        playlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        playlist.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching playlists:', error);
      throw error;
    }
  }

  /**
   * Duplicate a playlist
   */
  static async duplicatePlaylist(userId: number, sourcePlaylistId: number, newName: string): Promise<Playlist> {
    try {
      // Get source playlist with videos
      const sourceResponse = await this.getPlaylistVideos(sourcePlaylistId);
      const sourcePlaylist = sourceResponse.playlist;

      // Create new playlist
      const newPlaylist = await this.createPlaylist(userId, {
        name: newName,
        description: `Copy of ${sourcePlaylist.name}`,
        is_public: false,
      });

      // Add all videos to new playlist
      for (let i = 0; i < sourcePlaylist.videos.length; i++) {
        const video = sourcePlaylist.videos[i];
        await this.addVideoToPlaylist(newPlaylist.id, {
          video_id: video.video_id,
          position: i,
        });
      }

      return newPlaylist;
    } catch (error) {
      console.error('Error duplicating playlist:', error);
      throw error;
    }
  }
}

export default PlaylistService;

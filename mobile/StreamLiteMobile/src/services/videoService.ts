import axios, { AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Video,
  Category,
  VideoUploadRequest,
  VideoUpdateRequest,
  CategoryRequest,
  PaginatedVideoResponse,
  VideoListParams,
  VideoApiResponse,
  UploadProgress,
  Comment,
  CommentRequest,
  CommentUpdateRequest,
  PaginatedCommentResponse,
  CommentListParams,
  CommentCountResponse,
  SearchSuggestionsResponse,
  TrendingVideosResponse,
  RecommendationsResponse
} from '../types/video';
import { getApiEndpoint, getTimeout } from '../config/environment';

const VIDEO_SERVICE_URL = getApiEndpoint('video');

// Create axios instance for video service
const videoApi = axios.create({
  baseURL: VIDEO_SERVICE_URL,
  timeout: getTimeout('upload'), // Use upload timeout from config
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
videoApi.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
videoApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Video API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

class VideoService {
  // Health check
  async healthCheck(): Promise<VideoApiResponse> {
    try {
      const response: AxiosResponse = await videoApi.get('/health');
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.message || 'Health check failed' },
        success: false
      };
    }
  }

  // Video operations
  async getVideos(params: VideoListParams = {}): Promise<VideoApiResponse<PaginatedVideoResponse>> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.category) queryParams.append('category', params.category.toString());
      if (params.search) queryParams.append('search', params.search);
      
      // Advanced search filters
      if (params.duration_min) queryParams.append('duration_min', params.duration_min.toString());
      if (params.duration_max) queryParams.append('duration_max', params.duration_max.toString());
      if (params.upload_date_from) queryParams.append('upload_date_from', params.upload_date_from);
      if (params.upload_date_to) queryParams.append('upload_date_to', params.upload_date_to);
      if (params.view_count_min) queryParams.append('view_count_min', params.view_count_min.toString());
      if (params.view_count_max) queryParams.append('view_count_max', params.view_count_max.toString());
      if (params.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params.order) queryParams.append('order', params.order);

      const response: AxiosResponse<PaginatedVideoResponse> = await videoApi.get(
        `/api/v1/videos?${queryParams.toString()}`
      );
      
      // Filter out invalid videos and ensure unique IDs
      if (response.data && response.data.videos) {
        const validVideos = response.data.videos.filter((video, index, array) => 
          video && 
          video.id && 
          typeof video.id === 'number' &&
          array.findIndex(v => v.id === video.id) === index // Remove duplicates
        );
        
        response.data.videos = validVideos;
      }
      
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to fetch videos' },
        success: false
      };
    }
  }

  async getVideo(id: number): Promise<VideoApiResponse<Video>> {
    try {
      const response: AxiosResponse<Video> = await videoApi.get(`/api/v1/videos/${id}`);
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to fetch video' },
        success: false
      };
    }
  }

  async uploadVideo(
    videoData: VideoUploadRequest,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<VideoApiResponse<Video>> {
    try {
      console.log('VideoService: Starting upload with data:', {
        title: videoData.title,
        description: videoData.description,
        category_id: videoData.category_id,
        file: videoData.file,
        platform: Platform.OS
      });

      const formData = new FormData();
      
      // Handle file differently based on platform
      if (Platform.OS === 'web') {
        // For React Native Web, we need to handle File objects differently
        console.log('VideoService: Web platform detected, handling file for web...');
        
        // Check if the file has a blob or is already a File object
        if (videoData.file.uri && videoData.file.uri.startsWith('blob:')) {
          // This is a blob URL from web file picker
          try {
            const response = await fetch(videoData.file.uri);
            const blob = await response.blob();
            const file = new File([blob], videoData.file.name, { type: videoData.file.type });
            formData.append('file', file);
            console.log('VideoService: Converted blob to File object');
          } catch (blobError) {
            console.error('VideoService: Failed to convert blob to file:', blobError);
            throw new Error('Failed to process selected file');
          }
        } else {
          // Try to create a File object directly
          console.log('VideoService: Creating File object for web upload');
          const file = new File([], videoData.file.name, { type: videoData.file.type });
          formData.append('file', file);
        }
      } else {
        // For native React Native
        console.log('VideoService: Native platform detected, using React Native file format');
        formData.append('file', {
          uri: videoData.file.uri,
          type: videoData.file.type,
          name: videoData.file.name,
        } as any);
      }
      
      formData.append('title', videoData.title);
      formData.append('description', videoData.description);
      formData.append('category_id', videoData.category_id.toString());

      console.log('VideoService: FormData prepared, making request...');

      const response: AxiosResponse<Video> = await videoApi.post(
        '/api/v1/videos/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            console.log('VideoService: Upload progress:', progressEvent);
            if (onProgress && progressEvent.total) {
              const progress: UploadProgress = {
                loaded: progressEvent.loaded,
                total: progressEvent.total,
                percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
              };
              onProgress(progress);
            }
          }
        }
      );
      
      console.log('VideoService: Upload successful:', response.data);
      return { data: response.data, success: true };
    } catch (error: any) {
      console.error('VideoService: Upload failed:', error);
      console.error('VideoService: Error response:', error.response?.data);
      return {
        error: { message: error.response?.data?.error || error.message || 'Failed to upload video' },
        success: false
      };
    }
  }

  async updateVideo(id: number, videoData: VideoUpdateRequest): Promise<VideoApiResponse<Video>> {
    try {
      const response: AxiosResponse<Video> = await videoApi.put(
        `/api/v1/videos/${id}`,
        videoData
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to update video' },
        success: false
      };
    }
  }

  async deleteVideo(id: number): Promise<VideoApiResponse> {
    try {
      const response: AxiosResponse = await videoApi.delete(`/api/v1/videos/${id}`);
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to delete video' },
        success: false
      };
    }
  }

  // Category operations
  async getCategories(): Promise<VideoApiResponse<Category[]>> {
    try {
      const response: AxiosResponse<Category[]> = await videoApi.get('/api/v1/categories');
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to fetch categories' },
        success: false
      };
    }
  }

  async createCategory(categoryData: CategoryRequest): Promise<VideoApiResponse<Category>> {
    try {
      const response: AxiosResponse<Category> = await videoApi.post(
        '/api/v1/categories',
        categoryData
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to create category' },
        success: false
      };
    }
  }

  async updateCategory(id: number, categoryData: CategoryRequest): Promise<VideoApiResponse<Category>> {
    try {
      const response: AxiosResponse<Category> = await videoApi.put(
        `/api/v1/categories/${id}`,
        categoryData
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to update category' },
        success: false
      };
    }
  }

  async deleteCategory(id: number): Promise<VideoApiResponse> {
    try {
      const response: AxiosResponse = await videoApi.delete(`/api/v1/categories/${id}`);
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to delete category' },
        success: false
      };
    }
  }

  // Comment operations
  async getComments(videoId: number, params: CommentListParams = {}): Promise<VideoApiResponse<PaginatedCommentResponse>> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response: AxiosResponse<PaginatedCommentResponse> = await videoApi.get(
        `/api/v1/videos/${videoId}/comments?${queryParams.toString()}`
      );
      
      // Filter out invalid comments and ensure unique IDs
      if (response.data) {
        // Ensure comments is always an array, never null
        if (!response.data.comments || !Array.isArray(response.data.comments)) {
          response.data.comments = [];
        }
        
        const validComments = response.data.comments.filter((comment, index, array) => 
          comment && 
          comment.id && 
          typeof comment.id === 'number' &&
          comment.content &&
          array.findIndex(c => c.id === comment.id) === index // Remove duplicates
        ).map(comment => ({
          ...comment,
          // Ensure replies is always an array, never null
          replies: Array.isArray(comment.replies) ? comment.replies.filter(reply => 
            reply && reply.id && typeof reply.id === 'number'
          ) : []
        }));
        
        response.data.comments = validComments;
        
        // Ensure other pagination fields have safe defaults
        response.data.total = response.data.total || 0;
        response.data.page = response.data.page || 1;
        response.data.limit = response.data.limit || 20;
        response.data.pages = response.data.pages || 0;
      }
      
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to fetch comments' },
        success: false
      };
    }
  }

  async createComment(videoId: number, commentData: CommentRequest): Promise<VideoApiResponse<Comment>> {
    try {
      const response: AxiosResponse<Comment> = await videoApi.post(
        `/api/v1/videos/${videoId}/comments`,
        commentData
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to create comment' },
        success: false
      };
    }
  }

  async updateComment(commentId: number, commentData: CommentUpdateRequest): Promise<VideoApiResponse<Comment>> {
    try {
      const response: AxiosResponse<Comment> = await videoApi.put(
        `/api/v1/comments/${commentId}`,
        commentData
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to update comment' },
        success: false
      };
    }
  }

  async deleteComment(commentId: number): Promise<VideoApiResponse> {
    try {
      const response: AxiosResponse = await videoApi.delete(`/api/v1/comments/${commentId}`);
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to delete comment' },
        success: false
      };
    }
  }

  async getCommentCount(videoId: number): Promise<VideoApiResponse<CommentCountResponse>> {
    try {
      const response: AxiosResponse<CommentCountResponse> = await videoApi.get(
        `/api/v1/videos/${videoId}/comments/count`
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to fetch comment count' },
        success: false
      };
    }
  }

  // Search suggestions
  async getSearchSuggestions(query: string, limit: number = 10): Promise<VideoApiResponse<SearchSuggestionsResponse>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      queryParams.append('limit', limit.toString());

      const response: AxiosResponse<SearchSuggestionsResponse> = await videoApi.get(
        `/api/v1/videos/search/suggestions?${queryParams.toString()}`
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to fetch search suggestions' },
        success: false
      };
    }
  }

  // Trending videos
  async getTrendingVideos(limit: number = 20, days: number = 7): Promise<VideoApiResponse<TrendingVideosResponse>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      queryParams.append('days', days.toString());

      const response: AxiosResponse<TrendingVideosResponse> = await videoApi.get(
        `/api/v1/videos/trending?${queryParams.toString()}`
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to fetch trending videos' },
        success: false
      };
    }
  }

  // Recommendations
  async getRecommendations(userId: number, limit: number = 20): Promise<VideoApiResponse<RecommendationsResponse>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());

      const response: AxiosResponse<RecommendationsResponse> = await videoApi.get(
        `/api/v1/videos/recommendations/${userId}?${queryParams.toString()}`
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to fetch recommendations' },
        success: false
      };
    }
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  getVideoUrl(filePath: string): string {
    // For development, construct URL to video file
    // In production, this might be a CDN URL
    return `${VIDEO_SERVICE_URL}/${filePath}`;
  }

  getThumbnailUrl(thumbnailPath: string): string {
    if (!thumbnailPath) return '';
    return `${VIDEO_SERVICE_URL}/${thumbnailPath}`;
  }

  // Like/dislike operations
  async likeVideo(videoId: number, isLike: boolean): Promise<VideoApiResponse> {
    try {
      const response: AxiosResponse = await videoApi.post(
        `/api/v1/videos/${videoId}/like`,
        { is_like: isLike }
      );
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to like/dislike video' },
        success: false
      };
    }
  }

  async removeLike(videoId: number): Promise<VideoApiResponse> {
    try {
      const response: AxiosResponse = await videoApi.delete(`/api/v1/videos/${videoId}/like`);
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to remove like/dislike' },
        success: false
      };
    }
  }

  async getVideoLikeStats(videoId: number): Promise<VideoApiResponse> {
    try {
      const response: AxiosResponse = await videoApi.get(`/api/v1/videos/${videoId}/likes`);
      return { data: response.data, success: true };
    } catch (error: any) {
      return {
        error: { message: error.response?.data?.error || 'Failed to fetch like statistics' },
        success: false
      };
    }
  }
}

// Export singleton instance
export const videoService = new VideoService();
export default videoService;

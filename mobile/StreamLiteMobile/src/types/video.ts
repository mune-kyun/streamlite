// Video-related TypeScript type definitions

export interface Thumbnails {
  small: string;
  medium: string;
  large: string;
}

export interface Video {
  id: number;
  title: string;
  description: string;
  thumbnail_path: string; // Legacy field for backward compatibility
  thumbnails: Thumbnails;
  duration: number; // in seconds
  file_size: number; // in bytes
  format: string;
  category_id: number;
  category_name?: string;
  uploaded_by: number;
  view_count: number;
  tags?: string; // Comma-separated tags
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  videos?: Video[];
}

export interface VideoMetadata {
  id: number;
  video_id: number;
  resolution: string; // e.g., "1920x1080"
  bitrate: number; // in kbps
  codec: string; // e.g., "h264"
  file_path: string;
  created_at: string;
}

// Request/Response types
export interface VideoUploadRequest {
  title: string;
  description: string;
  category_id: number;
  tags?: string; // Comma-separated tags
  file: File | any; // File object for upload
}

export interface VideoUpdateRequest {
  title?: string;
  description?: string;
  category_id?: number;
}

export interface CategoryRequest {
  name: string;
  description: string;
}

export interface PaginatedVideoResponse {
  videos: Video[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// API Query parameters
export interface VideoListParams {
  page?: number;
  limit?: number;
  category?: number;
  search?: string;
  tags?: string;
  // Advanced search filters
  duration_min?: number;
  duration_max?: number;
  upload_date_from?: string; // YYYY-MM-DD format
  upload_date_to?: string; // YYYY-MM-DD format
  view_count_min?: number;
  view_count_max?: number;
  sort_by?: 'newest' | 'oldest' | 'most_viewed' | 'duration';
  order?: 'asc' | 'desc';
}

// Upload progress tracking
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Video player state
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isFullscreen: boolean;
  isLoading: boolean;
}

// Error types
export interface VideoError {
  message: string;
  code?: string;
  field?: string;
}

export interface VideoApiResponse<T = any> {
  data?: T;
  error?: VideoError;
  success: boolean;
}

// Comment-related types
export interface Comment {
  id: number;
  video_id: number;
  user_id: number;
  parent_comment_id?: number;
  content: string;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
  reply_count: number;
}

export interface CommentRequest {
  content: string;
  parent_comment_id?: number;
}

export interface CommentUpdateRequest {
  content: string;
}

export interface PaginatedCommentResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  video_id: number;
}

export interface CommentListParams {
  page?: number;
  limit?: number;
}

export interface CommentCountResponse {
  video_id: number;
  comment_count: number;
}

// Search suggestions types
export interface SearchSuggestionsResponse {
  suggestions: string[];
  query: string;
  count: number;
}

// Trending videos types
export interface TrendingVideosResponse {
  videos: Video[];
  count: number;
  days: number;
  generated_at: string;
}

// Recommendations types
export interface RecommendationsResponse {
  videos: Video[];
  user_id: number;
  count: number;
  algorithm: string;
  generated_at: string;
}

// Advanced search filter options
export interface SearchFilterOptions {
  durationRanges: Array<{
    label: string;
    min?: number;
    max?: number;
  }>;
  dateRanges: Array<{
    label: string;
    value: string;
  }>;
  viewCountRanges: Array<{
    label: string;
    min?: number;
    max?: number;
  }>;
  sortOptions: Array<{
    label: string;
    value: string;
  }>;
}

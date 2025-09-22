// Playlist-related TypeScript type definitions

export interface Playlist {
  id: number;
  user_id: number;
  name: string;
  description: string;
  is_public: boolean;
  video_count: number;
  created_at: string;
  updated_at: string;
  first_video_thumbnail?: string;
}

export interface PlaylistVideo {
  id: number;
  playlist_id: number;
  video_id: number;
  position: number;
  added_at: string;
}

export interface PlaylistVideoWithMeta {
  id: number;
  playlist_id: number;
  video_id: number;
  position: number;
  added_at: string;
  
  // Video metadata from Video Service
  video_title?: string;
  video_description?: string;
  video_duration?: number;
  video_thumbnail?: string;
  video_category_id?: number;
  video_view_count?: number;
}

export interface PlaylistWithVideos {
  id: number;
  user_id: number;
  name: string;
  description: string;
  is_public: boolean;
  video_count: number;
  created_at: string;
  updated_at: string;
  videos: PlaylistVideoWithMeta[];
}

// Request/Response types
export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  is_public?: boolean;
}

export interface UpdatePlaylistRequest {
  name?: string;
  description?: string;
  is_public?: boolean;
}

export interface AddVideoToPlaylistRequest {
  video_id: number;
  position?: number;
}

export interface VideoOrder {
  video_id: number;
  position: number;
}

export interface ReorderPlaylistVideosRequest {
  video_orders: VideoOrder[];
}

// API Response types
export interface PlaylistListResponse {
  playlists: Playlist[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PlaylistVideosResponse {
  playlist: PlaylistWithVideos;
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// API Query parameters
export interface PlaylistListParams {
  page?: number;
  limit?: number;
}

export interface PlaylistVideosParams {
  page?: number;
  limit?: number;
}

// Error types
export interface PlaylistError {
  message: string;
  code?: string;
  field?: string;
}

export interface PlaylistApiResponse<T = any> {
  data?: T;
  error?: PlaylistError;
  success: boolean;
}

// UI State types
export interface PlaylistFormData {
  name: string;
  description: string;
  isPublic: boolean;
}

export interface PlaylistModalState {
  visible: boolean;
  mode: 'create' | 'edit' | 'view';
  playlist?: Playlist;
}

export interface AddToPlaylistModalState {
  visible: boolean;
  videoId?: number;
  videoTitle?: string;
}

// Playlist player state
export interface PlaylistPlayerState {
  currentPlaylist?: PlaylistWithVideos;
  currentVideoIndex: number;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  autoPlay: boolean;
}

// Playlist management actions
export interface PlaylistAction {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADD_VIDEO' | 'REMOVE_VIDEO' | 'REORDER';
  playlistId?: number;
  videoId?: number;
  data?: any;
}

// Playlist filter and sort options
export interface PlaylistFilterOptions {
  showPublicOnly?: boolean;
  showPrivateOnly?: boolean;
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'video_count';
  sortOrder?: 'asc' | 'desc';
}

// Playlist sharing types
export interface PlaylistShareData {
  playlistId: number;
  playlistName: string;
  shareUrl: string;
  isPublic: boolean;
}

// Playlist statistics
export interface PlaylistStats {
  totalPlaylists: number;
  totalVideos: number;
  totalDuration: number; // in seconds
  averageVideosPerPlaylist: number;
  mostPopularPlaylist?: Playlist;
}

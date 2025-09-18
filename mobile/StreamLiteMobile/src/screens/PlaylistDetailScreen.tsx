import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import PlaylistService from '../services/playlistService';
import { Playlist, PlaylistWithVideos, PlaylistVideoWithMeta } from '../types/playlist';
import { darkTheme } from '../styles/theme';

export const PlaylistDetailScreen: React.FC<any> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { playlist: initialPlaylist } = route.params;
  
  const [playlist, setPlaylist] = useState<PlaylistWithVideos | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<PlaylistVideoWithMeta | null>(null);

  const loadPlaylistVideos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await PlaylistService.getPlaylistVideos(initialPlaylist.id, { limit: 100 });
      setPlaylist(response.playlist);
    } catch (error) {
      console.error('Error loading playlist videos:', error);
      Alert.alert('Error', 'Failed to load playlist videos');
    } finally {
      setLoading(false);
    }
  }, [initialPlaylist.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlaylistVideos();
    setRefreshing(false);
  }, [loadPlaylistVideos]);

  useEffect(() => {
    loadPlaylistVideos();
  }, [loadPlaylistVideos]);


  const handleShowVideoMenu = (video: PlaylistVideoWithMeta) => {
    setSelectedVideo(video);
    setShowVideoMenu(true);
  };

  const handleRemoveVideo = async () => {
    if (!selectedVideo) return;
    
    setShowVideoMenu(false);
    
    Alert.alert(
      'Remove Video',
      `Remove "${selectedVideo.video_title || 'Unknown Title'}" from this playlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await PlaylistService.removeVideoFromPlaylist(initialPlaylist.id, selectedVideo.video_id);
              await loadPlaylistVideos();
              Alert.alert('Success', 'Video removed from playlist');
            } catch (error) {
              console.error('Error removing video:', error);
              Alert.alert('Error', 'Failed to remove video from playlist');
            }
          },
        },
      ]
    );
  };

  const handlePlayNext = () => {
    if (!selectedVideo || !playlist) return;
    
    setShowVideoMenu(false);
    
    // Find current video index
    const currentIndex = playlist.videos.findIndex(v => v.video_id === selectedVideo.video_id);
    
    if (currentIndex !== -1 && currentIndex < playlist.videos.length - 1) {
      // Play next video in playlist
      const nextVideo = playlist.videos[currentIndex + 1];
      handlePlayVideo(nextVideo);
    } else {
      Alert.alert('Info', 'This is the last video in the playlist');
    }
  };

  const handlePlayVideo = (video: PlaylistVideoWithMeta, videoIndex?: number) => {
    // Create video object with all required properties
    const videoObject = {
      id: video.video_id,
      title: video.video_title || 'Unknown Title',
      description: video.video_description || '',
      duration: video.video_duration || 0,
      thumbnail_path: video.video_thumbnail || '',
      thumbnails: {
        small: video.video_thumbnail || '',
        medium: video.video_thumbnail || '',
        large: video.video_thumbnail || '',
      },
      file_size: 0, // Will be loaded from API
      format: 'mp4', // Default format
      view_count: video.video_view_count || 0,
      category_id: video.video_category_id || 0,
      uploaded_by: 0, // Will be loaded from API
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Navigate to video player with playlist context
    navigation.navigate('VideoPlayer', {
      video: videoObject,
      playlist: playlist ? {
        data: playlist,
        currentIndex: videoIndex !== undefined ? videoIndex : playlist.videos.findIndex(v => v.video_id === video.video_id),
      } : undefined,
    });
  };

  const handlePlayPlaylist = () => {
    if (!playlist || playlist.videos.length === 0) {
      Alert.alert('Error', 'No videos in this playlist');
      return;
    }

    // Play the first video in the playlist with playlist context
    handlePlayVideo(playlist.videos[0], 0);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkTheme.colors.accent} />
        <Text style={styles.loadingText}>Loading playlist...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.colors.surface} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons 
              name="arrow-back" 
              size={18} 
              color={darkTheme.colors.textSecondary} 
            />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {playlist?.name || initialPlaylist.name}
            </Text>
            <Text style={styles.headerSubtitle}>
              {playlist?.video_count || 0} video{(playlist?.video_count || 0) !== 1 ? 's' : ''} • {playlist?.is_public ? 'Public' : 'Private'}
            </Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons 
                name="search" 
                size={18} 
                color={darkTheme.colors.textSecondary} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons 
                name="ellipsis-vertical" 
                size={18} 
                color={darkTheme.colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Playlist Info Section */}
      {playlist && (
        <View style={styles.playlistInfoSection}>
          <View style={styles.playlistThumbnailContainer}>
            <View style={styles.playlistThumbnail}>
              <Ionicons 
                name="musical-notes" 
                size={24} 
                color={darkTheme.colors.textSecondary} 
              />
            </View>
            <View style={styles.playOverlay}>
              <Ionicons 
                name="play" 
                size={12} 
                color="#ffffff" 
              />
            </View>
          </View>
          
          <View style={styles.playlistActions}>
            <TouchableOpacity 
              style={styles.playAllButton} 
              onPress={handlePlayPlaylist}
              disabled={!playlist.videos.length}
            >
              <Ionicons 
                name="play" 
                size={12} 
                color="#ffffff" 
                style={styles.playButtonIcon}
              />
              <Text style={styles.playAllButtonText}>Play All</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.createdDate}>
            Created {new Date(playlist.created_at || Date.now()).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Videos List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={darkTheme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.videosContainer}>
          {playlist && playlist.videos.length > 0 ? (
            playlist.videos.map((video, index) => (
              <TouchableOpacity
                key={`video-${video.video_id}-${index}`}
                style={styles.videoCard}
                onPress={() => handlePlayVideo(video)}
              >
                <View style={styles.videoThumbnail}>
                  {video.video_thumbnail ? (
                    <Image
                      source={{ uri: `http://localhost:8083${video.video_thumbnail}` }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderThumbnail}>
                      <Ionicons 
                        name="videocam" 
                        size={16} 
                        color={darkTheme.colors.textSecondary} 
                      />
                    </View>
                  )}
                  {video.video_duration && (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>
                        {formatDuration(video.video_duration)}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.video_title || 'Unknown Title'}
                  </Text>
                  <Text style={styles.videoChannel}>
                    {video.video_description || 'No description'}
                  </Text>
                  <Text style={styles.videoViews}>
                    {video.video_view_count || 0} view{(video.video_view_count || 0) !== 1 ? 's' : ''} • {new Date().toLocaleDateString()}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.moreButton}
                  onPress={() => handleShowVideoMenu(video)}
                >
                  <Ionicons 
                    name="ellipsis-vertical" 
                    size={14} 
                    color={darkTheme.colors.textSecondary} 
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="list-outline" 
                size={48} 
                color={darkTheme.colors.textSecondary} 
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyStateTitle}>No videos yet</Text>
              <Text style={styles.emptyStateText}>
                Add videos to this playlist from the video browser or player
              </Text>
              <TouchableOpacity 
                style={styles.browseButton}
                onPress={() => navigation.navigate('Explore')}
              >
                <Text style={styles.browseButtonText}>Browse Videos</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Video Menu Modal */}
      <Modal
        visible={showVideoMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVideoMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVideoMenu(false)}
        >
          <View style={styles.videoMenuContainer}>
            <View style={styles.videoMenuHeader}>
              <Text style={styles.videoMenuTitle}>
                {selectedVideo?.video_title || 'Video Options'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handlePlayNext}
            >
              <Ionicons name="play-forward" size={20} color={darkTheme.colors.textPrimary} />
              <Text style={styles.menuItemText}>Play Next</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleRemoveVideo}
            >
              <Ionicons name="trash-outline" size={20} color={darkTheme.colors.error} />
              <Text style={[styles.menuItemText, { color: darkTheme.colors.error }]}>
                Remove from Playlist
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.background,
  },
  loadingText: {
    marginTop: darkTheme.spacing.lg,
    fontSize: darkTheme.fontSize.lg,
    color: darkTheme.colors.textSecondary,
  },
  header: {
    backgroundColor: darkTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingBottom: darkTheme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: darkTheme.spacing.sm,
    marginRight: darkTheme.spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: darkTheme.spacing.sm,
    marginLeft: darkTheme.spacing.md,
  },
  playlistInfoSection: {
    backgroundColor: darkTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
    padding: darkTheme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistThumbnailContainer: {
    position: 'relative',
    marginRight: darkTheme.spacing.lg,
  },
  playlistThumbnail: {
    width: 96,
    height: 64,
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: darkTheme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistActions: {
    flex: 1,
    marginBottom: darkTheme.spacing.md,
  },
  playAllButton: {
    backgroundColor: darkTheme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.sm,
    borderRadius: darkTheme.borderRadius.full,
    marginBottom: darkTheme.spacing.sm,
  },
  playButtonIcon: {
    marginRight: darkTheme.spacing.sm,
  },
  playAllButtonText: {
    color: '#ffffff',
    fontSize: darkTheme.fontSize.sm,
    fontWeight: '500',
  },
  createdDate: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
    position: 'absolute',
    bottom: darkTheme.spacing.lg,
    right: darkTheme.spacing.lg,
  },
  content: {
    flex: 1,
  },
  videosContainer: {
    gap: 1,
  },
  videoCard: {
    backgroundColor: darkTheme.colors.card,
    flexDirection: 'row',
    padding: darkTheme.spacing.md,
    alignItems: 'center',
  },
  videoThumbnail: {
    width: 80,
    height: 48,
    borderRadius: darkTheme.borderRadius.md,
    overflow: 'hidden',
    marginRight: darkTheme.spacing.md,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  durationText: {
    color: '#ffffff',
    fontSize: darkTheme.fontSize.xs,
    fontWeight: '500',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: darkTheme.fontSize.sm,
    fontWeight: '500',
    color: darkTheme.colors.textPrimary,
    marginBottom: 4,
    lineHeight: 18,
  },
  videoChannel: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
    marginBottom: 4,
  },
  videoViews: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
  moreButton: {
    padding: darkTheme.spacing.sm,
    marginLeft: darkTheme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: darkTheme.spacing.xxxl,
    paddingHorizontal: darkTheme.spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: darkTheme.spacing.lg,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: '500',
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.lg,
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: darkTheme.colors.accent,
    paddingHorizontal: darkTheme.spacing.xl,
    paddingVertical: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.full,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: darkTheme.fontSize.sm,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: darkTheme.spacing.lg,
  },
  videoMenuContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    minWidth: 280,
    maxWidth: 320,
    overflow: 'hidden',
  },
  videoMenuHeader: {
    padding: darkTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  videoMenuTitle: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: darkTheme.spacing.lg,
    gap: darkTheme.spacing.md,
  },
  menuItemText: {
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textPrimary,
    flex: 1,
  },
});

export default PlaylistDetailScreen;

import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from '../types/video';
import { config } from '../config/environment';
import { darkTheme } from '../styles/theme';

interface VideoThumbnailProps {
  video: Video;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
  showTitle?: boolean;
  showDuration?: boolean;
  showViewCount?: boolean;
  showChannelInfo?: boolean;
  isLive?: boolean;
  style?: any;
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  video,
  size = 'medium',
  onPress,
  showTitle = true,
  showDuration = true,
  showViewCount = true,
  showChannelInfo = true,
  isLive = false,
  style
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Get thumbnail URL based on size
  const getThumbnailUrl = () => {
    const baseUrl = `${config.API_ENDPOINTS.VIDEO_SERVICE}/api/v1/videos/${video.id}/thumbnail/${size}`;
    
    if (video.thumbnails && video.thumbnails[size]) {
      return baseUrl;
    }
    
    if (video.thumbnail_path) {
      return `${config.API_ENDPOINTS.VIDEO_SERVICE}/api/v1/videos/${video.id}/thumbnail/medium`;
    }
    
    return null;
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format view count
  const formatViewCount = (count: number) => {
    if (count < 1000) return `${count} views`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K views`;
    return `${(count / 1000000).toFixed(1)}M views`;
  };

  // Format time ago
  const formatTimeAgo = (createdAt: string) => {
    const now = new Date();
    const uploadDate = new Date(createdAt);
    const diffInSeconds = Math.floor((now.getTime() - uploadDate.getTime()) / 1000);

    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} hour${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
  };

  const thumbnailUrl = getThumbnailUrl();

  const renderThumbnail = () => {
    if (!thumbnailUrl || imageError) {
      return (
        <View style={styles.placeholder}>
          <Ionicons 
            name="videocam-outline" 
            size={32} 
            color={darkTheme.colors.textSecondary} 
          />
        </View>
      );
    }

    return (
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
        />
        
        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
        
        {/* Duration overlay */}
        {showDuration && video.duration > 0 && !isLive && (
          <View style={styles.durationOverlay}>
            <Text style={styles.durationText}>
              {formatDuration(video.duration)}
            </Text>
          </View>
        )}

        {/* Live badge */}
        {isLive && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
    );
  };

  const content = (
    <View style={[styles.container, style]}>
      {renderThumbnail()}
      
      {showTitle && (
        <View style={styles.contentContainer}>
          <View style={styles.videoInfo}>
            {showChannelInfo && (
              <View style={styles.channelAvatar}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={darkTheme.colors.textSecondary} 
                />
              </View>
            )}
            
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {video.title}
              </Text>
              
              {showChannelInfo && (
                <Text style={styles.channelName}>
                  {video.category_name || 'Unknown Channel'}
                </Text>
              )}
              
              {showViewCount && (
                <View style={styles.metaContainer}>
                  <Text style={styles.metaText}>
                    {formatViewCount(video.view_count)}
                  </Text>
                  <Text style={styles.metaText}> • </Text>
                  <Text style={styles.metaText}>
                    {formatTimeAgo(video.created_at)}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.menuButton}>
              <Ionicons 
                name="ellipsis-vertical" 
                size={16} 
                color={darkTheme.colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: darkTheme.spacing.lg,
    ...darkTheme.shadows.sm,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 192, // h-48 equivalent (12rem = 192px)
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: 192,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: darkTheme.colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationOverlay: {
    position: 'absolute',
    bottom: darkTheme.spacing.sm,
    right: darkTheme.spacing.sm,
    backgroundColor: darkTheme.colors.overlayDark,
    paddingHorizontal: darkTheme.spacing.sm,
    paddingVertical: 2,
    borderRadius: darkTheme.borderRadius.xs,
  },
  durationText: {
    color: darkTheme.colors.white,
    fontSize: darkTheme.fontSize.xs,
    fontWeight: darkTheme.fontWeight.medium,
  },
  liveBadge: {
    position: 'absolute',
    top: darkTheme.spacing.sm,
    left: darkTheme.spacing.sm,
    backgroundColor: darkTheme.colors.accent,
    paddingHorizontal: darkTheme.spacing.sm,
    paddingVertical: 2,
    borderRadius: darkTheme.borderRadius.full,
  },
  liveText: {
    color: darkTheme.colors.white,
    fontSize: darkTheme.fontSize.xs,
    fontWeight: darkTheme.fontWeight.semibold,
    letterSpacing: 0.5,
  },
  contentContainer: {
    padding: darkTheme.spacing.lg,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: darkTheme.spacing.md,
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: darkTheme.spacing.xs,
  },
  channelName: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.xs,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.md,
  },
  metaText: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
  menuButton: {
    padding: darkTheme.spacing.sm,
    marginTop: -darkTheme.spacing.xs,
  },
});

export default VideoThumbnail;

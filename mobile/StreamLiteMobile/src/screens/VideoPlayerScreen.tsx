import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
  Image,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Video as VideoType } from '../types/video';
import { PlaylistWithVideos, PlaylistVideoWithMeta } from '../types/playlist';
import { useAuth } from '../context/AuthContext';
import CommentsList from '../components/CommentsList';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import Button from '../components/Button';
import { getApiEndpoint } from '../config/environment';
import { videoService } from '../services/videoService';
import { subscriptionService } from '../services/subscriptionService';
import { darkTheme } from '../styles/theme';

type RootStackParamList = {
  VideoPlayer: {
    video: VideoType;
    playlist?: {
      data: PlaylistWithVideos;
      currentIndex: number;
    };
  };
};

type VideoPlayerScreenRouteProp = RouteProp<RootStackParamList, 'VideoPlayer'>;
type VideoPlayerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VideoPlayer'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const VideoPlayerScreen: React.FC = () => {
  const navigation = useNavigation<VideoPlayerScreenNavigationProp>();
  const route = useRoute<VideoPlayerScreenRouteProp>();
  const { video, playlist } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const videoRef = useRef<Video>(null);
  const flatListRef = useRef<FlatList>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [videoData, setVideoData] = useState<VideoType>(video);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyingToComment, setReplyingToComment] = useState<any | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [userLikeStatus, setUserLikeStatus] = useState<'like' | 'dislike' | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  // Playlist state
  const [currentPlaylist, setCurrentPlaylist] = useState<PlaylistWithVideos | null>(playlist?.data || null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(playlist?.currentIndex || 0);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  // Track watch progress and handle auto-play
  useEffect(() => {
    if (status && status.isLoaded && status.durationMillis) {
      const progress = (status.positionMillis || 0) / status.durationMillis;
      setWatchProgress(progress);

      // Check if video has ended and auto-play is enabled
      if (status.didJustFinish && autoPlayEnabled && currentPlaylist) {
        handleAutoPlayNext();
      }
    }
  }, [status, autoPlayEnabled, currentPlaylist, currentVideoIndex]);

  // Auto-play next video in playlist
  const handleAutoPlayNext = () => {
    if (!currentPlaylist || currentVideoIndex >= currentPlaylist.videos.length - 1) {
      // End of playlist
      Alert.alert('Playlist Complete', 'You have reached the end of the playlist.');
      return;
    }

    const nextVideoIndex = currentVideoIndex + 1;
    const nextPlaylistVideo = currentPlaylist.videos[nextVideoIndex];
    
    if (nextPlaylistVideo) {
      const nextVideo: VideoType = {
        id: nextPlaylistVideo.video_id,
        title: nextPlaylistVideo.video_title || 'Unknown Title',
        description: nextPlaylistVideo.video_description || '',
        duration: nextPlaylistVideo.video_duration || 0,
        thumbnail_path: nextPlaylistVideo.video_thumbnail || '',
        thumbnails: {
          small: nextPlaylistVideo.video_thumbnail || '',
          medium: nextPlaylistVideo.video_thumbnail || '',
          large: nextPlaylistVideo.video_thumbnail || '',
        },
        file_size: 0, // Will be loaded from API
        format: 'mp4', // Default format
        view_count: nextPlaylistVideo.video_view_count || 0,
        category_id: nextPlaylistVideo.video_category_id || 0,
        uploaded_by: 0, // Will be loaded from API
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Navigate to next video with updated playlist context and auto-play
      navigation.replace('VideoPlayer', {
        video: nextVideo,
        playlist: {
          data: currentPlaylist,
          currentIndex: nextVideoIndex,
        },
      });
    }
  };

  // Navigate to previous video in playlist
  const handlePlayPrevious = () => {
    if (!currentPlaylist || currentVideoIndex <= 0) {
      Alert.alert('Info', 'This is the first video in the playlist.');
      return;
    }

    const prevVideoIndex = currentVideoIndex - 1;
    const prevPlaylistVideo = currentPlaylist.videos[prevVideoIndex];
    
    if (prevPlaylistVideo) {
      const prevVideo: VideoType = {
        id: prevPlaylistVideo.video_id,
        title: prevPlaylistVideo.video_title || 'Unknown Title',
        description: prevPlaylistVideo.video_description || '',
        duration: prevPlaylistVideo.video_duration || 0,
        thumbnail_path: prevPlaylistVideo.video_thumbnail || '',
        thumbnails: {
          small: prevPlaylistVideo.video_thumbnail || '',
          medium: prevPlaylistVideo.video_thumbnail || '',
          large: prevPlaylistVideo.video_thumbnail || '',
        },
        file_size: 0, // Will be loaded from API
        format: 'mp4', // Default format
        view_count: prevPlaylistVideo.video_view_count || 0,
        category_id: prevPlaylistVideo.video_category_id || 0,
        uploaded_by: 0, // Will be loaded from API
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Navigate to previous video with updated playlist context
      navigation.replace('VideoPlayer', {
        video: prevVideo,
        playlist: {
          data: currentPlaylist,
          currentIndex: prevVideoIndex,
        },
      });
    }
  };

  // Navigate to next video manually
  const handlePlayNext = () => {
    if (!currentPlaylist || currentVideoIndex >= currentPlaylist.videos.length - 1) {
      Alert.alert('Info', 'This is the last video in the playlist.');
      return;
    }

    handleAutoPlayNext();
  };

  // Get next video for preview
  const getNextVideo = (): PlaylistVideoWithMeta | null => {
    if (!currentPlaylist || currentVideoIndex >= currentPlaylist.videos.length - 1) {
      return null;
    }
    return currentPlaylist.videos[currentVideoIndex + 1];
  };

  // Auto-play video when it loads (especially for playlist auto-play)
  useEffect(() => {
    if (videoRef.current && !isLoading && status?.isLoaded && currentPlaylist) {
      // Auto-play when coming from playlist (auto-play scenario)
      videoRef.current.playAsync().catch(console.error);
    }
  }, [status?.isLoaded, isLoading, currentPlaylist]);

  // Load comment count, video data, and comments
  useEffect(() => {
    const loadVideoData = async () => {
      try {
        // Load comment count
        const commentResponse = await videoService.getCommentCount(video.id);
        if (commentResponse.success && commentResponse.data) {
          setCommentCount(commentResponse.data.comment_count);
        }

        // Load updated video data
        const videoResponse = await videoService.getVideo(video.id);
        if (videoResponse.success && videoResponse.data) {
          setVideoData(videoResponse.data);
        }

        // Load like/dislike stats
        const likeStatsResponse = await videoService.getVideoLikeStats(video.id);
        if (likeStatsResponse.success && likeStatsResponse.data) {
          setLikeCount(likeStatsResponse.data.like_count || 0);
          setDislikeCount(likeStatsResponse.data.dislike_count || 0);
          setUserLikeStatus(likeStatsResponse.data.user_like_status || null);
        }

        // Load subscription status and stats if we have video uploader info
        if (videoResponse.success && videoResponse.data && videoResponse.data.uploaded_by && user?.id) {
          setCheckingSubscription(true);
          try {
            // Check subscription status
            const subscriptionStatusResponse = await subscriptionService.checkSubscriptionStatus(
              user.id,
              videoResponse.data.uploaded_by
            );
            if (subscriptionStatusResponse.success && subscriptionStatusResponse.data) {
              setIsSubscribed(subscriptionStatusResponse.data.is_subscribed);
            }

            // Get subscriber count for the video uploader
            const statsResponse = await subscriptionService.getSubscriptionStats(videoResponse.data.uploaded_by);
            if (statsResponse.success && statsResponse.data) {
              setSubscriberCount(statsResponse.data.subscriber_count);
            }
          } catch (error) {
            console.error('Error loading subscription data:', error);
          } finally {
            setCheckingSubscription(false);
          }
        }

        // Load comments
        setLoadingComments(true);
        const commentsResponse = await videoService.getComments(video.id, { page: 1, limit: 20 });
        if (commentsResponse.success && commentsResponse.data) {
          setComments(commentsResponse.data.comments || []);
        }
      } catch (error) {
        console.error('Error loading video data:', error);
      } finally {
        setLoadingComments(false);
      }
    };

    loadVideoData();
  }, [video.id]);

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (status?.isLoaded) {
        if (status.isPlaying) {
          await videoRef.current.pauseAsync();
        } else {
          await videoRef.current.playAsync();
        }
      }
    }
  };

  const handleSeek = async (position: number) => {
    if (videoRef.current && status?.isLoaded && status.durationMillis) {
      const seekPosition = position * status.durationMillis;
      await videoRef.current.setPositionAsync(seekPosition);
    }
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Note: Full implementation would require orientation changes
    // For now, we'll just toggle the UI state
  };

  const handleVideoTap = () => {
    setShowControls(!showControls);
  };

  const handleBack = async () => {
    navigation.goBack();
  };

  const scrollToComments = () => {
    if (flatListRef.current) {
      // Scroll to the comments section (after the header)
      flatListRef.current.scrollToOffset({ offset: 400, animated: true });
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setPostingComment(true);
    try {
      const commentData = {
        content: newComment.trim(),
        parent_comment_id: replyingTo || undefined,
      };

      const result = await videoService.createComment(video.id, commentData);

      if (result.success) {
        setNewComment('');
        setReplyingTo(null);
        setReplyingToComment(null);
        // Refresh comments to show the new comment
        const commentsResponse = await videoService.getComments(video.id, { page: 1, limit: 20 });
        if (commentsResponse.success && commentsResponse.data) {
          setComments(commentsResponse.data.comments || []);
          setCommentCount(commentsResponse.data.total || 0);
        }
        Alert.alert('Success', replyingTo ? 'Reply posted successfully!' : 'Comment posted successfully!');
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleReply = (commentId: number) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setReplyingTo(commentId);
      setReplyingToComment(comment);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyingToComment(null);
  };

  const handleLike = async () => {
    try {
      if (userLikeStatus === 'like') {
        // Remove like
        const result = await videoService.removeLike(video.id);
        if (result.success) {
          setUserLikeStatus(null);
          setLikeCount(result.data.like_count);
          setDislikeCount(result.data.dislike_count);
        } else {
          Alert.alert('Error', result.error?.message || 'Failed to remove like');
        }
      } else {
        // Add like
        const result = await videoService.likeVideo(video.id, true);
        if (result.success) {
          setUserLikeStatus('like');
          setLikeCount(result.data.like_count);
          setDislikeCount(result.data.dislike_count);
        } else {
          Alert.alert('Error', result.error?.message || 'Failed to like video');
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const handleDislike = async () => {
    try {
      if (userLikeStatus === 'dislike') {
        // Remove dislike
        const result = await videoService.removeLike(video.id);
        if (result.success) {
          setUserLikeStatus(null);
          setLikeCount(result.data.like_count);
          setDislikeCount(result.data.dislike_count);
        } else {
          Alert.alert('Error', result.error?.message || 'Failed to remove dislike');
        }
      } else {
        // Add dislike
        const result = await videoService.likeVideo(video.id, false);
        if (result.success) {
          setUserLikeStatus('dislike');
          setLikeCount(result.data.like_count);
          setDislikeCount(result.data.dislike_count);
        } else {
          Alert.alert('Error', result.error?.message || 'Failed to dislike video');
        }
      }
    } catch (error) {
      console.error('Error handling dislike:', error);
      Alert.alert('Error', 'Failed to update dislike status');
    }
  };

  const handleSubscribe = async () => {
    if (!videoData.uploaded_by) {
      Alert.alert('Error', 'Unable to subscribe - video uploader information not available');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please log in to subscribe to channels');
      return;
    }

    try {
      if (isSubscribed) {
        // Unsubscribe
        const result = await subscriptionService.unsubscribe(
          user.id,
          videoData.uploaded_by
        );
        
        if (result.success) {
          setIsSubscribed(false);
          setSubscriberCount(prev => Math.max(0, prev - 1));
          Alert.alert('Success', 'Successfully unsubscribed');
        } else {
          Alert.alert('Error', result.error || 'Failed to unsubscribe');
        }
      } else {
        // Subscribe
        const result = await subscriptionService.subscribe(
          user.id,
          videoData.uploaded_by
        );
        
        if (result.success) {
          setIsSubscribed(true);
          setSubscriberCount(prev => prev + 1);
          Alert.alert('Success', 'Successfully subscribed!');
        } else {
          Alert.alert('Error', result.error || 'Failed to subscribe');
        }
      }
    } catch (error) {
      console.error('Error handling subscription:', error);
      Alert.alert('Error', 'Failed to update subscription');
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const videoUri = `${getApiEndpoint('video')}/api/v1/videos/${video.id}/stream`;

  // Helper functions for date formatting
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return date.toLocaleDateString();
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  // Render header component for FlatList
  const renderHeader = () => (
    <View>
      {/* Video Info Section */}
      <View style={styles.videoInfoSection}>
        <Text style={styles.videoTitle}>{videoData.title || 'Untitled Video'}</Text>
        
        <View style={styles.videoMeta}>
          <View style={styles.viewsAndTime}>
            <Text style={styles.metaText}>{formatViews(videoData.view_count || 0)}</Text>
            <Text style={styles.metaText}> • </Text>
            <Text style={styles.metaText}>{formatDate(videoData.created_at || new Date().toISOString())}</Text>
          </View>
          
          <View style={styles.actionIcons}>
            <TouchableOpacity style={styles.actionIcon} onPress={handleLike}>
              <Ionicons 
                name={userLikeStatus === 'like' ? "thumbs-up" : "thumbs-up-outline"} 
                size={18} 
                color={userLikeStatus === 'like' ? darkTheme.colors.accent : darkTheme.colors.textSecondary} 
              />
              <Text style={[
                styles.actionText,
                userLikeStatus === 'like' && { color: darkTheme.colors.accent }
              ]}>
                {likeCount || (videoData as any).like_count || 0}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionIcon} onPress={handleDislike}>
              <Ionicons 
                name={userLikeStatus === 'dislike' ? "thumbs-down" : "thumbs-down-outline"} 
                size={18} 
                color={userLikeStatus === 'dislike' ? darkTheme.colors.error : darkTheme.colors.textSecondary} 
              />
              <Text style={[
                styles.actionText,
                userLikeStatus === 'dislike' && { color: darkTheme.colors.error }
              ]}>
                {dislikeCount || (videoData as any).dislike_count || 0}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionIcon} onPress={scrollToComments}>
              <Ionicons name="chatbubble-outline" size={18} color={darkTheme.colors.textSecondary} />
              <Text style={styles.actionText}>{commentCount}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionIcon} onPress={() => setShowAddToPlaylist(true)}>
              <Ionicons name="bookmark-outline" size={18} color={darkTheme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Channel Info */}
        <View style={styles.channelInfo}>
          <View style={styles.channelLeft}>
            <View style={styles.channelAvatar}>
              <Ionicons name="person-outline" size={20} color={darkTheme.colors.textSecondary} />
            </View>
            <View style={styles.channelDetails}>
              <Text style={styles.channelName}>{(videoData as any).uploader_display_name || `User ${videoData.uploaded_by}` || 'StreamLite Creator'}</Text>
              {subscriberCount > 0 && (
                <Text style={styles.subscriberCount}>{subscriberCount.toLocaleString()} subscribers</Text>
              )}
            </View>
          </View>
          <Button
            title={isSubscribed ? "Subscribed" : "Subscribe"}
            onPress={handleSubscribe}
            variant={isSubscribed ? "secondary" : "primary"}
            size="small"
            style={styles.subscribeButton}
            disabled={checkingSubscription}
          />
        </View>
      </View>

      {/* Description Section */}
      <View style={styles.descriptionSection}>
        <Text style={styles.descriptionText} numberOfLines={3}>
          {videoData.description || 'No description available.'}
        </Text>
        <TouchableOpacity>
          <Text style={styles.showMoreText}>Show more</Text>
        </TouchableOpacity>
      </View>

      {/* Playlist Controls and Next Video Preview */}
      {currentPlaylist && (
        <View style={styles.playlistSection}>
          {/* Playlist Info */}
          <View style={styles.playlistInfo}>
            <View style={styles.playlistHeader}>
              <Ionicons name="list" size={16} color={darkTheme.colors.accent} />
              <Text style={styles.playlistTitle}>{currentPlaylist.name}</Text>
              <Text style={styles.playlistProgress}>
                {currentVideoIndex + 1} of {currentPlaylist.videos.length}
              </Text>
            </View>
            
            {/* Playlist Navigation Controls */}
            <View style={styles.playlistControls}>
              <TouchableOpacity 
                style={[styles.playlistControlButton, currentVideoIndex <= 0 && styles.playlistControlButtonDisabled]}
                onPress={handlePlayPrevious}
                disabled={currentVideoIndex <= 0}
              >
                <Ionicons 
                  name="play-skip-back" 
                  size={16} 
                  color={currentVideoIndex <= 0 ? darkTheme.colors.textSecondary : darkTheme.colors.textPrimary} 
                />
                <Text style={[
                  styles.playlistControlText,
                  currentVideoIndex <= 0 && styles.playlistControlTextDisabled
                ]}>
                  Previous
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.playlistControlButton, currentVideoIndex >= currentPlaylist.videos.length - 1 && styles.playlistControlButtonDisabled]}
                onPress={handlePlayNext}
                disabled={currentVideoIndex >= currentPlaylist.videos.length - 1}
              >
                <Ionicons 
                  name="play-skip-forward" 
                  size={16} 
                  color={currentVideoIndex >= currentPlaylist.videos.length - 1 ? darkTheme.colors.textSecondary : darkTheme.colors.textPrimary} 
                />
                <Text style={[
                  styles.playlistControlText,
                  currentVideoIndex >= currentPlaylist.videos.length - 1 && styles.playlistControlTextDisabled
                ]}>
                  Next
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.autoPlayToggle}
                onPress={() => setAutoPlayEnabled(!autoPlayEnabled)}
              >
                <Ionicons 
                  name={autoPlayEnabled ? "repeat" : "repeat-outline"} 
                  size={16} 
                  color={autoPlayEnabled ? darkTheme.colors.accent : darkTheme.colors.textSecondary} 
                />
                <Text style={[
                  styles.playlistControlText,
                  autoPlayEnabled && { color: darkTheme.colors.accent }
                ]}>
                  Auto-play
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Next Video Preview */}
          {getNextVideo() && (
            <View style={styles.nextVideoSection}>
              <Text style={styles.nextVideoLabel}>Up next</Text>
              <TouchableOpacity 
                style={styles.nextVideoCard}
                onPress={handlePlayNext}
              >
                <View style={styles.nextVideoThumbnail}>
                  {getNextVideo()?.video_thumbnail ? (
                    <Image
                      source={{ uri: `http://localhost:8083${getNextVideo()?.video_thumbnail}` }}
                      style={styles.nextVideoThumbnailImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.nextVideoPlaceholder}>
                      <Ionicons name="videocam" size={20} color={darkTheme.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.nextVideoPlayOverlay}>
                    <Ionicons name="play" size={12} color="#ffffff" />
                  </View>
                </View>
                
                <View style={styles.nextVideoInfo}>
                  <Text style={styles.nextVideoTitle} numberOfLines={2}>
                    {getNextVideo()?.video_title || 'Unknown Title'}
                  </Text>
                  <Text style={styles.nextVideoMeta}>
                    {getNextVideo()?.video_duration ? formatTime((getNextVideo()?.video_duration || 0) * 1000) : '0:00'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Comments Header */}
      <View style={styles.commentsHeader}>
        <Text style={styles.commentsTitle}>Comments</Text>
        {commentCount > 0 && (
          <Text style={styles.commentsCount}>{commentCount.toLocaleString()}</Text>
        )}
      </View>
    </View>
  );

  // Render comment item with replies
  const renderComment = ({ item }: { item: any }) => (
    <View>
      <View style={styles.commentItem}>
        <View style={styles.commentAvatar}>
          <Ionicons name="person-outline" size={16} color={darkTheme.colors.textSecondary} />
        </View>
        <View style={styles.commentContent}>
          <Text style={styles.commentAuthor}>{item.author_display_name || `User ${item.user_id}` || 'Anonymous'}</Text>
          <Text style={styles.commentText}>{item.content}</Text>
          <View style={styles.commentActions}>
            <Text style={styles.commentTime}>{formatDate(item.created_at)}</Text>
            <TouchableOpacity 
              style={styles.replyButton}
              onPress={() => handleReply(item.id)}
            >
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Render replies if they exist */}
      {item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map((reply: any, index: number) => (
            <View key={`reply-${reply.id}-${index}`} style={styles.replyItem}>
              <View style={styles.replyLine} />
              <View style={styles.commentAvatar}>
                <Ionicons name="person-outline" size={14} color={darkTheme.colors.textSecondary} />
              </View>
              <View style={styles.commentContent}>
                <Text style={styles.commentAuthor}>{reply.author_display_name || `User ${reply.user_id}` || 'Anonymous'}</Text>
                <Text style={styles.commentText}>{reply.content}</Text>
                <View style={styles.commentActions}>
                  <Text style={styles.commentTime}>{formatDate(reply.created_at)}</Text>
                  <TouchableOpacity 
                    style={styles.replyButton}
                    onPress={() => handleReply(item.id)}
                  >
                    <Text style={styles.replyButtonText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, isFullscreen && styles.fullscreenContainer]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.colors.background} />
      
      {/* Header */}
      {!isFullscreen && (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={18} color={darkTheme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {video.title || 'Video Player'}
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="share-outline" size={18} color={darkTheme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="ellipsis-vertical" size={18} color={darkTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      {/* Video Player */}
      <TouchableOpacity 
        style={styles.videoContainer} 
        activeOpacity={1}
        onPress={handleVideoTap}
      >
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: videoUri }}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
          onPlaybackStatusUpdate={setStatus}
          onLoad={() => setIsLoading(false)}
          onError={(error) => {
            console.error('Video error:', error);
            
            // Check if it's an audio focus error (common during screen sharing)
            let errorMessage = '';
            try {
              if (typeof error === 'string') {
                errorMessage = error;
              } else if (error && typeof error === 'object') {
                errorMessage = (error as any).message || JSON.stringify(error);
              } else {
                errorMessage = String(error);
              }
            } catch (e) {
              errorMessage = 'Unknown error';
            }
            
            if (errorMessage.toLowerCase().includes('audio focus') || 
                errorMessage.toLowerCase().includes('audiofocus') ||
                errorMessage.toLowerCase().includes('audio session')) {
              // Ignore audio focus errors during screen sharing - just log and continue
              console.log('Audio focus error ignored during screen sharing:', errorMessage);
              setIsLoading(false);
              
              // Try to start video playback anyway (without audio)
              if (videoRef.current) {
                videoRef.current.playAsync().catch((playError) => {
                  console.log('Could not start playback after audio focus error:', playError);
                });
              }
              return;
            }
            
            // Handle real video errors normally
            setIsLoading(false);
            Alert.alert('Error', 'Failed to load video');
          }}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={darkTheme.colors.white} />
            <Text style={styles.loadingText}>Loading video...</Text>
          </View>
        )}

        {/* Controls Overlay */}
        {showControls && !isLoading && (
          <View style={styles.controlsOverlay}>
            {/* Center Controls */}
            <View style={styles.centerControls}>
              <TouchableOpacity style={styles.skipBackButton} onPress={() => handleSeek(Math.max(0, watchProgress - 0.1))}>
                <Ionicons name="play-skip-back" size={24} color={darkTheme.colors.white} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPause}>
                <Ionicons 
                  name={status?.isLoaded && status.isPlaying ? "pause" : "play"} 
                  size={32} 
                  color={darkTheme.colors.white} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.skipForwardButton} onPress={() => handleSeek(Math.min(1, watchProgress + 0.1))}>
                <Ionicons name="play-skip-forward" size={24} color={darkTheme.colors.white} />
              </TouchableOpacity>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
              <View style={styles.timeAndProgress}>
                <Text style={styles.timeText}>
                  {status?.isLoaded ? formatTime(status.positionMillis || 0) : '0:00'}
                </Text>
                
                <View style={styles.progressContainer}>
                  <TouchableOpacity 
                    style={styles.progressBar}
                    onPress={(event) => {
                      const { locationX } = event.nativeEvent;
                      const progressBarWidth = screenWidth - 120; // Account for time and controls
                      const newProgress = locationX / progressBarWidth;
                      handleSeek(Math.max(0, Math.min(1, newProgress)));
                    }}
                  >
                    <View style={styles.progressTrack} />
                    <View 
                      style={[styles.progressFill, { width: `${watchProgress * 100}%` }]} 
                    />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.timeText}>
                  {status?.isLoaded ? formatTime(status.durationMillis || 0) : '0:00'}
                </Text>
                
                <View style={styles.volumeAndFullscreen}>
                  <TouchableOpacity style={styles.controlButton}>
                    <Ionicons name="volume-high" size={18} color={darkTheme.colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlButton} onPress={handleFullscreen}>
                    <Ionicons name="expand" size={18} color={darkTheme.colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Content Section with FlatList */}
      {!isFullscreen && (
        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item, index) => `comment-${item.id || index}`}
          ListHeaderComponent={renderHeader}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsText}>
                {loadingComments ? 'Loading comments...' : 'No comments yet'}
              </Text>
            </View>
          }
        />
      )}

      {/* Comment Input Section */}
      {!isFullscreen && (
        <View style={[styles.commentInputContainer, { paddingBottom: insets.bottom + 16 }]}>
          {replyingToComment && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyIndicatorText}>
                Replying to {replyingToComment.author || 'Anonymous'}: "{replyingToComment.content.substring(0, 50)}..."
              </Text>
              <TouchableOpacity onPress={cancelReply} style={styles.cancelReplyButton}>
                <Ionicons name="close" size={16} color={darkTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.commentInputRow}>
            <View style={styles.commentUserAvatar}>
              <Ionicons name="person-outline" size={16} color={darkTheme.colors.textSecondary} />
            </View>
            <TextInput
              style={styles.commentTextInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder={replyingToComment ? "Write a reply..." : "Add a comment..."}
              placeholderTextColor={darkTheme.colors.textSecondary}
              multiline
              maxLength={1000}
              editable={!postingComment}
            />
            <TouchableOpacity
              style={[
                styles.postCommentButton,
                (!newComment.trim() || postingComment) && styles.postCommentButtonDisabled
              ]}
              onPress={handlePostComment}
              disabled={!newComment.trim() || postingComment}
            >
              {postingComment ? (
                <ActivityIndicator size="small" color={darkTheme.colors.white} />
              ) : (
                <Ionicons name="send" size={16} color={darkTheme.colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        visible={showAddToPlaylist}
        onClose={() => setShowAddToPlaylist(false)}
        videoId={video.id}
        videoTitle={video.title || 'Untitled Video'}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  // Header Styles
  header: {
    backgroundColor: darkTheme.colors.background,
    paddingHorizontal: darkTheme.spacing.md,
    paddingBottom: darkTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
    marginHorizontal: darkTheme.spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: darkTheme.spacing.sm,
    marginLeft: darkTheme.spacing.xs,
  },
  backButton: {
    padding: darkTheme.spacing.sm,
  },
  // Video Player Styles
  videoContainer: {
    height: 220,
    backgroundColor: '#000000',
    position: 'relative',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: darkTheme.colors.white,
    marginTop: darkTheme.spacing.md,
    fontSize: darkTheme.fontSize.md,
  },
  // Controls Overlay Styles
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'space-between',
  },
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: darkTheme.spacing.xl,
  },
  skipBackButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipForwardButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    paddingHorizontal: darkTheme.spacing.md,
    paddingBottom: darkTheme.spacing.md,
  },
  timeAndProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.sm,
  },
  timeText: {
    color: darkTheme.colors.white,
    fontSize: darkTheme.fontSize.sm,
    minWidth: 40,
    textAlign: 'center',
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: darkTheme.spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: darkTheme.colors.accent,
    borderRadius: 2,
  },
  volumeAndFullscreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.sm,
  },
  controlButton: {
    padding: darkTheme.spacing.xs,
  },
  // Content Styles
  content: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  videoInfoSection: {
    padding: darkTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  videoTitle: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.sm,
    lineHeight: 24,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.md,
  },
  viewsAndTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.lg,
  },
  actionIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.xs,
  },
  actionText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  // Channel Info Styles
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: darkTheme.spacing.sm,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
  },
  subscriberCount: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    marginTop: 2,
  },
  subscribeButton: {
    paddingHorizontal: darkTheme.spacing.lg,
  },
  // Description Styles
  descriptionSection: {
    padding: darkTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  descriptionText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: darkTheme.spacing.sm,
  },
  showMoreText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    fontWeight: darkTheme.fontWeight.medium,
  },
  // Comments Styles
  commentsSection: {
    padding: darkTheme.spacing.lg,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.lg,
    marginTop: darkTheme.spacing.lg,
    paddingHorizontal: darkTheme.spacing.lg,
    gap: darkTheme.spacing.sm,
  },
  commentsTitle: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
  },
  commentsCount: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  addComment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.lg,
    gap: darkTheme.spacing.sm,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    paddingVertical: darkTheme.spacing.sm,
    paddingHorizontal: darkTheme.spacing.md,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  commentPlaceholder: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  // New styles for FlatList implementation
  contentContainer: {
    paddingBottom: 100,
  },
  commentItem: {
    flexDirection: 'row',
    padding: darkTheme.spacing.lg,
    marginHorizontal: darkTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: darkTheme.spacing.sm,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: darkTheme.fontSize.sm,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.xs,
  },
  commentText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: darkTheme.spacing.xs,
  },
  commentTime: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: darkTheme.spacing.xs,
  },
  replyButton: {
    paddingVertical: darkTheme.spacing.xs,
    paddingHorizontal: darkTheme.spacing.sm,
  },
  replyButtonText: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.accent,
    fontWeight: darkTheme.fontWeight.medium,
  },
  emptyComments: {
    padding: darkTheme.spacing.xl,
    alignItems: 'center',
  },
  emptyCommentsText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  // Comment Input Styles
  commentInputContainer: {
    backgroundColor: darkTheme.colors.background,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border,
    paddingHorizontal: darkTheme.spacing.md,
    paddingTop: darkTheme.spacing.md,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: darkTheme.spacing.sm,
  },
  commentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    borderRadius: 20,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.sm,
    fontSize: darkTheme.fontSize.sm,
    maxHeight: 100,
    backgroundColor: darkTheme.colors.card,
    color: darkTheme.colors.textPrimary,
  },
  postCommentButton: {
    backgroundColor: darkTheme.colors.accent,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCommentButtonDisabled: {
    backgroundColor: darkTheme.colors.gray600,
  },
  // Reply Indicator Styles
  replyIndicator: {
    backgroundColor: darkTheme.colors.card,
    padding: darkTheme.spacing.sm,
    borderRadius: darkTheme.borderRadius.sm,
    marginBottom: darkTheme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyIndicatorText: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.accent,
    flex: 1,
    marginRight: darkTheme.spacing.sm,
  },
  cancelReplyButton: {
    padding: darkTheme.spacing.xs,
  },
  // Reply Styles
  repliesContainer: {
    marginLeft: darkTheme.spacing.xl,
    borderLeftWidth: 2,
    borderLeftColor: darkTheme.colors.border,
    paddingLeft: darkTheme.spacing.md,
  },
  replyItem: {
    flexDirection: 'row',
    padding: darkTheme.spacing.md,
    marginHorizontal: darkTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  replyLine: {
    width: 2,
    backgroundColor: darkTheme.colors.accent,
    marginRight: darkTheme.spacing.sm,
  },
  // Playlist Styles
  playlistSection: {
    backgroundColor: darkTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  playlistInfo: {
    padding: darkTheme.spacing.md,
  },
  playlistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.md,
    gap: darkTheme.spacing.sm,
  },
  playlistTitle: {
    flex: 1,
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
  },
  playlistProgress: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  playlistControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  playlistControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: darkTheme.spacing.sm,
    paddingHorizontal: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.md,
    backgroundColor: darkTheme.colors.card,
    gap: darkTheme.spacing.xs,
  },
  playlistControlButtonDisabled: {
    opacity: 0.5,
  },
  playlistControlText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textPrimary,
  },
  playlistControlTextDisabled: {
    color: darkTheme.colors.textSecondary,
  },
  autoPlayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: darkTheme.spacing.sm,
    paddingHorizontal: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.md,
    backgroundColor: darkTheme.colors.card,
    gap: darkTheme.spacing.xs,
  },
  // Next Video Styles
  nextVideoSection: {
    padding: darkTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border,
  },
  nextVideoLabel: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.sm,
    fontWeight: darkTheme.fontWeight.medium,
  },
  nextVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.md,
  },
  nextVideoThumbnail: {
    width: 80,
    height: 48,
    borderRadius: darkTheme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  nextVideoThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  nextVideoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: darkTheme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextVideoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextVideoInfo: {
    flex: 1,
  },
  nextVideoTitle: {
    fontSize: darkTheme.fontSize.sm,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.xs,
    lineHeight: 18,
  },
  nextVideoMeta: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { videoService } from '../services/videoService';
import { Video, Category } from '../types/video';
import VideoThumbnail from '../components/VideoThumbnail';
import { darkTheme } from '../styles/theme';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      // Load videos and categories in parallel
      const [videosResponse, categoriesResponse] = await Promise.all([
        videoService.getVideos({ limit: 10 }), // Get more videos for the feed
        videoService.getCategories()
      ]);

      if (videosResponse.success && videosResponse.data) {
        setVideos(videosResponse.data.videos);
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
      Alert.alert('Error', 'Failed to load content. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const navigateToVideo = (video: Video) => {
    navigation.navigate('VideoPlayer', { video });
  };


  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const navigateToNotifications = () => {
    // TODO: Implement notifications screen
    Alert.alert('Notifications', 'Notifications feature coming soon!');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkTheme.colors.accent} />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.colors.surface} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.brandContainer}>
            <Ionicons 
              name="logo-youtube" 
              size={20} 
              color={darkTheme.colors.accent} 
              style={styles.brandIcon}
            />
            <Text style={styles.brandText}>VidStream</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={navigateToNotifications}
            >
              <Ionicons 
                name="notifications-outline" 
                size={18} 
                color={darkTheme.colors.textSecondary} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.userAvatar}
              onPress={navigateToProfile}
            >
              <Ionicons 
                name="person-outline" 
                size={16} 
                color={darkTheme.colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
      </View>

      {/* Main Content */}
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
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Featured Videos</Text>
          
          {videos.length > 0 ? (
            <View style={styles.videoFeed}>
              {videos.map((video, index) => (
                <VideoThumbnail
                  key={`video-${video.id}-${index}`}
                  video={video}
                  onPress={() => navigateToVideo(video)}
                  showTitle={true}
                  showDuration={true}
                  showViewCount={true}
                  showChannelInfo={true}
                  isLive={false}
                  style={styles.videoCard}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="videocam-outline" 
                size={48} 
                color={darkTheme.colors.textSecondary} 
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyStateText}>
                No videos available yet.
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Upload some videos to get started!
              </Text>
            </View>
          )}
        </View>
        
        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingBottom: darkTheme.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.lg,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIcon: {
    fontSize: 20,
    marginRight: darkTheme.spacing.md,
  },
  brandText: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: darkTheme.spacing.sm,
    marginRight: darkTheme.spacing.lg,
  },
  headerButtonIcon: {
    fontSize: 18,
    color: darkTheme.colors.textSecondary,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: darkTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.lg,
  },
  videoFeed: {
    gap: darkTheme.spacing.lg,
  },
  videoCard: {
    marginBottom: 0, // Override default margin since we use gap
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: darkTheme.spacing.xxxl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: darkTheme.spacing.lg,
  },
  emptyStateText: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: darkTheme.fontSize.lg,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
});

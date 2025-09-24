import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { videoService } from '../services/videoService';
import { Video, Category } from '../types/video';
import VideoThumbnail from '../components/VideoThumbnail';
import { darkTheme } from '../styles/theme';

interface HomeScreenProps {
  navigation: any;
  route?: {
    params?: {
      searchQuery?: string;
    };
  };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(route?.params?.searchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const loadData = async () => {
    try {
      // Detect hashtag search
      const isHashtagSearch = searchQuery.startsWith('#');
      const searchParams: any = {
        limit: 20,
        category: selectedCategory || undefined
      };

      if (isHashtagSearch) {
        // Remove # prefix and search in tags
        searchParams.tags = searchQuery.substring(1);
      } else if (searchQuery) {
        // Regular search in title/description
        searchParams.search = searchQuery;
      }

      // Load videos and categories in parallel
      const [videosResponse, categoriesResponse] = await Promise.all([
        videoService.getVideos(searchParams),
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
  }, [searchQuery, selectedCategory]);

  // Refetch videos whenever the screen is focused (e.g., returning from upload)
  useFocusEffect(
    useCallback(() => {
      // Only refetch if we're not already loading and not in the middle of a search/category change
      if (!loading && !refreshing) {
        loadData();
      }
    }, [loading, refreshing])
  );

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
    Alert.alert('Notifications', 'Notifications feature coming soon!');
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      loadData();
    }
  };

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
  };

  const renderCategoryPill = (category: Category | null, isSelected: boolean) => {
    const isAll = category === null;
    return (
      <TouchableOpacity
        key={isAll ? 'all' : category?.id}
        style={[
          styles.categoryPill,
          isSelected ? styles.categoryPillActive : styles.categoryPillInactive
        ]}
        onPress={() => handleCategorySelect(isAll ? null : category?.id || null)}
      >
        <Text style={[
          styles.categoryPillText,
          isSelected ? styles.categoryPillTextActive : styles.categoryPillTextInactive
        ]}>
          {isAll ? 'All' : category?.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkTheme.colors.accent} />
        <Text style={styles.loadingText}>Loading content...</Text>
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

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={[
          styles.searchContainer,
          searchFocused && styles.searchContainerFocused
        ]}>
          <Ionicons 
            name="search" 
            size={16} 
            color={darkTheme.colors.textSecondary} 
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={searchQuery.startsWith('#') ? "Searching tags..." : "Search videos, channels, or use #hashtag"}
            placeholderTextColor={darkTheme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.startsWith('#') && (
            <View style={styles.hashtagIndicator}>
              <Ionicons name="pricetag" size={14} color={darkTheme.colors.accent} />
            </View>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {renderCategoryPill(null, selectedCategory === null)}
          {categories.map((category) => 
            renderCategoryPill(category, selectedCategory === category.id)
          )}
        </ScrollView>
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
          {videos.length > 0 ? (
            <View style={styles.videoFeed}>
              {videos.map((video, index) => (
                <View key={`video-${video.id}-${index}`} style={styles.videoCardContainer}>
                  <VideoThumbnail
                    video={video}
                    onPress={() => navigateToVideo(video)}
                    showTitle={true}
                    showDuration={true}
                    showViewCount={true}
                    showChannelInfo={true}
                    isLive={false}
                    style={styles.videoCard}
                  />
                </View>
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
                {searchQuery ? 'No videos found' : 'No videos available'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? 'Try a different search term' : 'Check back later for new content!'}
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
  searchSection: {
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.lg,
    backgroundColor: darkTheme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.card,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.md,
  },
  searchContainerFocused: {
    borderColor: darkTheme.colors.accent,
  },
  searchIcon: {
    marginRight: darkTheme.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textPrimary,
    padding: 0,
  },
  hashtagIndicator: {
    marginLeft: darkTheme.spacing.sm,
    padding: darkTheme.spacing.xs,
    backgroundColor: darkTheme.colors.accent + '20',
    borderRadius: 12,
  },
  categoriesSection: {
    backgroundColor: darkTheme.colors.background,
    paddingBottom: darkTheme.spacing.lg,
  },
  categoriesContainer: {
    paddingHorizontal: darkTheme.spacing.lg,
    gap: darkTheme.spacing.md,
  },
  categoryPill: {
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillActive: {
    backgroundColor: darkTheme.colors.accent,
    borderColor: darkTheme.colors.accent,
  },
  categoryPillInactive: {
    backgroundColor: darkTheme.colors.card,
    borderColor: darkTheme.colors.border,
  },
  categoryPillText: {
    fontSize: darkTheme.fontSize.sm,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  categoryPillTextInactive: {
    color: darkTheme.colors.textSecondary,
  },
  videoCardContainer: {
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    overflow: 'hidden',
  },
});

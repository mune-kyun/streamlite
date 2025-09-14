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
  TextInput,
  FlatList,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { videoService } from '../services/videoService';
import { Video, Category, VideoListParams } from '../types/video';
import VideoThumbnail from '../components/VideoThumbnail';

interface VideoBrowseScreenProps {
  navigation: any;
  route?: any;
}

export const VideoBrowseScreen: React.FC<VideoBrowseScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Separate input state
  const [selectedCategory, setSelectedCategory] = useState<number | null>(
    route?.params?.categoryId || null
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Advanced search states
  const [showFilters, setShowFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [filters, setFilters] = useState<VideoListParams>({
    sort_by: 'newest',
    order: 'desc'
  });

  const loadCategories = async () => {
    try {
      const response = await videoService.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadVideos = async (pageNum: number = 1, reset: boolean = true) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params: VideoListParams = {
        page: pageNum,
        limit: 10,
        ...(selectedCategory && { category: selectedCategory }),
        ...(searchQuery && { search: searchQuery }),
        ...filters, // Include advanced filters
      };

      const response = await videoService.getVideos(params);
      
      if (response.success && response.data) {
        const data = response.data;
        if (reset || pageNum === 1) {
          setVideos(data.videos);
        } else {
          setVideos(prev => [...prev, ...data.videos]);
        }
        
        setHasMore(pageNum < data.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      Alert.alert('Error', 'Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Search suggestions with debouncing (for input, not searchQuery)
  const loadSearchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await videoService.getSearchSuggestions(query, 5);
      if (response.success && response.data) {
        setSearchSuggestions(response.data.suggestions);
        setShowSuggestions(response.data.suggestions.length > 0 && searchInputFocused);
      }
    } catch (error) {
      console.error('Error loading search suggestions:', error);
    }
  }, [searchInputFocused]);

  // Debounced search suggestions for input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadSearchSuggestions(searchInput);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchInput, loadSearchSuggestions]);

  // Debounced search execution (longer delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 1000); // 1 second delay for actual search

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  // Load videos when search query or category changes
  useEffect(() => {
    loadCategories();
    loadVideos(1, true);
  }, [selectedCategory, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadVideos(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      loadVideos(page + 1, false);
    }
  };

  const navigateToVideo = (video: Video) => {
    navigation.navigate('VideoPlayer', { video });
  };

  const selectCategory = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setPage(1);
  };

  const selectSuggestion = (suggestion: string) => {
    setSearchInput(suggestion);
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSearchInputFocused(false);
  };

  const handleSearchFocus = () => {
    setSearchInputFocused(true);
    if (searchSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow for suggestion selection
    setTimeout(() => {
      setSearchInputFocused(false);
      setShowSuggestions(false);
    }, 150);
  };

  const handleSearchSubmit = () => {
    setSearchQuery(searchInput);
    setShowSuggestions(false);
    setSearchInputFocused(false);
  };

  const applyFilters = (newFilters: VideoListParams) => {
    setFilters(newFilters);
    setShowFilters(false);
    setPage(1);
    loadVideos(1, true);
  };

  const resetFilters = () => {
    setFilters({
      sort_by: 'newest',
      order: 'desc'
    });
    setShowFilters(false);
    setPage(1);
    loadVideos(1, true);
  };

  const renderVideoItem = ({ item }: { item: Video }) => (
    <View style={styles.videoItem}>
      <VideoThumbnail
        video={item}
        size="medium"
        onPress={() => navigateToVideo(item)}
        showTitle={false}
        showDuration={true}
        showViewCount={false}
        style={styles.videoThumbnailContainer}
      />
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title || 'Untitled Video'}
        </Text>
        <Text style={styles.videoDescription} numberOfLines={2}>
          {item.description || 'No description available'}
        </Text>
        <View style={styles.videoMetaRow}>
          <Text style={styles.videoMeta}>
            {item.category_name || 'Unknown'} • {item.view_count || 0} views
          </Text>
          <Text style={styles.videoMeta}>
            {item.file_size ? videoService.formatFileSize(item.file_size) : 'Unknown size'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#007bff" />
        <Text style={styles.loadingMoreText}>Loading more videos...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search videos..."
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onSubmitEditing={handleSearchSubmit}
              blurOnSubmit={false}
            />
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && searchInputFocused && (
              <View style={styles.suggestionsContainer}>
                {searchSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPressIn={() => selectSuggestion(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearchSubmit}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filtersButton}
            onPress={() => setShowFilters(true)}
          >
            <Text style={styles.filtersButtonText}>Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === null && styles.categoryChipActive
          ]}
          onPress={() => selectCategory(null)}
        >
          <Text style={[
            styles.categoryChipText,
            selectedCategory === null && styles.categoryChipTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive
            ]}
            onPress={() => selectCategory(category.id)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category.id && styles.categoryChipTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Videos List */}
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item, index) => `video-${item.id}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory 
                ? 'No videos found matching your criteria.'
                : 'No videos available yet.'
              }
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.videosList,
          Platform.OS === 'android' && {
            paddingBottom: Math.max(insets.bottom + 60, 80) // Tab bar height + safe area
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderTopWidth: 0,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  filtersButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesScroll: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexGrow: 0,
    flexShrink: 0,
    height: 60, // Fixed height to prevent collapsing
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
    minHeight: 44, // Ensure minimum height for touch targets
  },
  categoryChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  videosList: {
    padding: 16,
  },
  videoItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  videoThumbnailContainer: {
    marginRight: 16,
  },
  videoInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  videoDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  videoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoMeta: {
    fontSize: 12,
    color: '#999',
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { subscriptionService } from '../services/subscriptionService';
import { darkTheme } from '../styles/theme';

interface Subscription {
  id: number;
  user_id: number;
  display_name: string;
  avatar?: string;
  subscriber_count: number;
  video_count: number;
  latest_video?: {
    id: number;
    title: string;
    thumbnail_url?: string;
    created_at: string;
  };
  subscribed_at: string;
}

interface SubscriptionScreenProps {
  navigation: any;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubscriptions = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID available');
        setSubscriptions([]);
        return;
      }

      console.log('Loading subscriptions for user:', user.id);
      const result = await subscriptionService.getUserSubscriptions(user.id);
      
      if (result.success && result.data) {
        console.log('Subscriptions loaded:', result.data);
        // Transform the subscription data to match our interface
        const transformedSubscriptions = result.data.subscriptions.map(sub => ({
          id: sub.id,
          user_id: sub.following_id,
          display_name: sub.display_name || `User ${sub.following_id}`,
          avatar: sub.avatar,
          subscriber_count: 0, // TODO: Get from user stats
          video_count: 0, // TODO: Get from user stats
          subscribed_at: sub.created_at,
        }));
        setSubscriptions(transformedSubscriptions);
      } else {
        console.error('Failed to load subscriptions:', result.error);
        setSubscriptions([]);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      Alert.alert('Error', 'Failed to load subscriptions. Please try again.');
      setSubscriptions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSubscriptions();
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const navigateToNotifications = () => {
    Alert.alert('Notifications', 'Notifications feature coming soon!');
  };

  const navigateToUserProfile = (userId: number) => {
    // TODO: Navigate to user profile screen
    Alert.alert('User Profile', `Navigate to user ${userId} profile - Coming soon!`);
  };

  const navigateToVideo = (videoId: number) => {
    // TODO: Navigate to video player
    Alert.alert('Video Player', `Play video ${videoId} - Coming soon!`);
  };

  const renderSubscriptionItem = (subscription: Subscription) => (
    <TouchableOpacity
      key={subscription.id}
      style={styles.subscriptionItem}
      onPress={() => navigateToUserProfile(subscription.user_id)}
    >
      <View style={styles.subscriptionHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {subscription.avatar ? (
              <Image source={{ uri: subscription.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color={darkTheme.colors.textSecondary} />
              </View>
            )}
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.displayName}>{subscription.display_name}</Text>
            <Text style={styles.userStats}>
              {subscription.subscriber_count.toLocaleString()} subscribers • {subscription.video_count} videos
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.subscribeButton}>
          <Ionicons name="checkmark" size={16} color="#ffffff" />
          <Text style={styles.subscribeButtonText}>Subscribed</Text>
        </TouchableOpacity>
      </View>
      
      {subscription.latest_video && (
        <TouchableOpacity
          style={styles.latestVideo}
          onPress={() => navigateToVideo(subscription.latest_video!.id)}
        >
          <View style={styles.videoThumbnail}>
            {subscription.latest_video.thumbnail_url ? (
              <Image 
                source={{ uri: subscription.latest_video.thumbnail_url }} 
                style={styles.thumbnailImage} 
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="play" size={24} color={darkTheme.colors.textSecondary} />
              </View>
            )}
          </View>
          
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {subscription.latest_video.title}
            </Text>
            <Text style={styles.videoDate}>
              {new Date(subscription.latest_video.created_at).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkTheme.colors.accent} />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.colors.surface} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <Ionicons 
              name="people" 
              size={20} 
              color={darkTheme.colors.accent} 
              style={styles.titleIcon}
            />
            <Text style={styles.titleText}>Subscriptions</Text>
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
          {subscriptions.length > 0 ? (
            <View style={styles.subscriptionsList}>
              {subscriptions.map(renderSubscriptionItem)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="people-outline" 
                size={48} 
                color={darkTheme.colors.textSecondary} 
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyStateText}>
                No subscriptions yet
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Subscribe to creators to see their latest content here!
              </Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.exploreButtonText}>Explore Videos</Text>
              </TouchableOpacity>
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
    paddingBottom: darkTheme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: darkTheme.spacing.md,
  },
  titleText: {
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
    marginLeft: darkTheme.spacing.md,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: darkTheme.spacing.md,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: darkTheme.spacing.lg,
    paddingTop: darkTheme.spacing.lg,
  },
  subscriptionsList: {
    gap: darkTheme.spacing.lg,
  },
  subscriptionItem: {
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: darkTheme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.xs,
  },
  userStats: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.accent,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.sm,
    borderRadius: darkTheme.borderRadius.md,
  },
  subscribeButtonText: {
    color: '#ffffff',
    fontSize: darkTheme.fontSize.sm,
    fontWeight: '600',
    marginLeft: darkTheme.spacing.xs,
  },
  latestVideo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoThumbnail: {
    marginRight: darkTheme.spacing.md,
  },
  thumbnailImage: {
    width: 80,
    height: 45,
    borderRadius: darkTheme.borderRadius.sm,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 45,
    borderRadius: darkTheme.borderRadius.sm,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: '500',
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.xs,
  },
  videoDate: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
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
    marginBottom: darkTheme.spacing.xl,
  },
  exploreButton: {
    backgroundColor: darkTheme.colors.accent,
    paddingHorizontal: darkTheme.spacing.xl,
    paddingVertical: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.md,
  },
  exploreButtonText: {
    color: '#ffffff',
    fontSize: darkTheme.fontSize.md,
    fontWeight: '600',
  },
});

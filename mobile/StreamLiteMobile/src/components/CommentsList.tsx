import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Comment, CommentRequest } from '../types/video';
import videoService from '../services/videoService';
import CommentItem from './CommentItem';
import { darkTheme } from '../styles/theme';

interface CommentsListProps {
  videoId: number;
  visible: boolean;
}

const CommentsList: React.FC<CommentsListProps> = ({ videoId, visible }) => {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalComments, setTotalComments] = useState(0);

  const currentUserId = 1; // TODO: Get from auth context

  useEffect(() => {
    if (visible) {
      loadComments(true);
    }
  }, [visible, videoId]);

  const loadComments = async (reset = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const result = await videoService.getComments(videoId, {
        page: currentPage,
        limit: 20,
      });

      console.log('loadComments result:', result);

      if (result.success && result.data && Array.isArray(result.data.comments)) {
        const newComments = result.data.comments;

        if (reset) {
          // Filter out duplicates and invalid comments
          const validComments = newComments.filter((comment, index, array) => 
            comment && 
            comment.id && 
            typeof comment.id === 'number' &&
            array.findIndex(c => c && c.id === comment.id) === index
          );
          setComments(validComments);
          setPage(2);
        } else {
          // Merge with existing comments and remove duplicates
          setComments(prev => {
            const existingComments = prev || [];
            const allComments = [...existingComments, ...newComments];
            
            // Remove duplicates by ID
            const uniqueComments = allComments.filter((comment, index, array) => 
              comment && 
              comment.id && 
              typeof comment.id === 'number' &&
              array.findIndex(c => c && c.id === comment.id) === index
            );
            
            return uniqueComments;
          });
          setPage(prev => prev + 1);
        }

        setTotalComments(result.data.total || 0);
        setHasMore(currentPage < (result.data.pages || 0));
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to load comments');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadComments(true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setPosting(true);
    try {
      const commentData: CommentRequest = {
        content: newComment.trim(),
        parent_comment_id: replyingTo || undefined,
      };

      const result = await videoService.createComment(videoId, commentData);

      if (result.success) {
        setNewComment('');
        setReplyingTo(null);
        // Refresh comments to show the new comment
        handleRefresh();
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to post comment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleReply = (parentCommentId: number) => {
    setReplyingTo(parentCommentId);
    // Find the parent comment to show context
    const parentComment = comments.find(c => c.id === parentCommentId);
    if (parentComment) {
      Alert.alert(
        'Reply to Comment',
        `Replying to: "${parentComment.content.substring(0, 50)}${parentComment.content.length > 50 ? '...' : ''}"`,
        [
          { text: 'Cancel', onPress: () => setReplyingTo(null) },
          { text: 'OK' },
        ]
      );
    }
  };

  const handleCommentUpdate = () => {
    // Refresh comments when a comment is updated or deleted
    handleRefresh();
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <CommentItem
      comment={item}
      onReply={handleReply}
      onUpdate={handleCommentUpdate}
      onDelete={handleCommentUpdate}
      currentUserId={currentUserId}
    />
  );

  const renderFooter = () => {
    if (!loading) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#007bff" />
        <Text style={styles.loadingText}>Loading more comments...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.emptyText}>Loading comments...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No comments yet</Text>
        <Text style={styles.emptySubtext}>Be the first to comment!</Text>
      </View>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Comments ({totalComments})
        </Text>
      </View>

      {/* Comments List */}
      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item, index) => `comment-${item.id}-${index}`}
        style={styles.commentsList}
        contentContainerStyle={styles.commentsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Comment Input */}
      <View style={[
        styles.inputContainer,
        Platform.OS === 'android' && {
          paddingBottom: Math.max(insets.bottom + 16, 32) // Safe area + padding
        }
      ]}>
        {replyingTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyText}>
              Replying to comment...
            </Text>
            <TouchableOpacity
              onPress={() => setReplyingTo(null)}
              style={styles.cancelReply}
            >
              <Text style={styles.cancelReplyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputRow}>
          <TextInput
            style={styles.commentInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
            multiline
            maxLength={1000}
            editable={!posting}
          />
          
          <TouchableOpacity
            style={[
              styles.postButton,
              (!newComment.trim() || posting) && styles.postButtonDisabled
            ]}
            onPress={handlePostComment}
            disabled={!newComment.trim() || posting}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  header: {
    padding: darkTheme.spacing.lg,
    backgroundColor: darkTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  headerTitle: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: darkTheme.spacing.lg,
    paddingBottom: 100, // Space for input
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: darkTheme.spacing.lg,
  },
  loadingText: {
    marginLeft: darkTheme.spacing.sm,
    color: darkTheme.colors.textSecondary,
    fontSize: darkTheme.fontSize.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: darkTheme.spacing.huge,
  },
  emptyText: {
    fontSize: darkTheme.fontSize.lg,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.sm,
  },
  emptySubtext: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: darkTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border,
    padding: darkTheme.spacing.lg,
  },
  replyIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.card,
    padding: darkTheme.spacing.sm,
    borderRadius: darkTheme.borderRadius.sm,
    marginBottom: darkTheme.spacing.sm,
  },
  replyText: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.accent,
    fontWeight: darkTheme.fontWeight.medium,
  },
  cancelReply: {
    padding: darkTheme.spacing.xs,
  },
  cancelReplyText: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.accent,
    fontWeight: darkTheme.fontWeight.semibold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    borderRadius: 20,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.sm,
    fontSize: darkTheme.fontSize.sm,
    maxHeight: 100,
    marginRight: darkTheme.spacing.sm,
    backgroundColor: darkTheme.colors.card,
    color: darkTheme.colors.textPrimary,
  },
  postButton: {
    backgroundColor: darkTheme.colors.accent,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.sm,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: darkTheme.colors.gray600,
  },
  postButtonText: {
    color: darkTheme.colors.white,
    fontWeight: darkTheme.fontWeight.semibold,
    fontSize: darkTheme.fontSize.sm,
  },
});

export default CommentsList;

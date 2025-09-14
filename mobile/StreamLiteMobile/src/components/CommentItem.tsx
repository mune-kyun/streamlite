import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Comment } from '../types/video';
import videoService from '../services/videoService';

interface CommentItemProps {
  comment: Comment;
  onReply?: (parentCommentId: number) => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  currentUserId?: number;
  isReply?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onUpdate,
  onDelete,
  currentUserId = 1, // TODO: Get from auth context
  isReply = false,
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isEditing, setIsEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const isOwner = comment.user_id === currentUserId;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    setIsEditing(true);
    try {
      const result = await videoService.updateComment(comment.id, {
        content: editContent.trim(),
      });

      if (result.success) {
        setShowEditModal(false);
        onUpdate?.();
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to update comment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update comment');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await videoService.deleteComment(comment.id);
              if (result.success) {
                onDelete?.();
              } else {
                Alert.alert('Error', result.error?.message || 'Failed to delete comment');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const handleReply = () => {
    onReply?.(comment.id);
  };

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <View style={styles.commentHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>U{comment.user_id}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.username}>User {comment.user_id}</Text>
            <Text style={styles.timestamp}>{formatDate(comment.created_at)}</Text>
          </View>
        </View>
        
        {isOwner && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowEditModal(true)}
            >
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
            >
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.content}>{comment.content}</Text>

      <View style={styles.commentActions}>
        {!isReply && (
          <TouchableOpacity style={styles.replyButton} onPress={handleReply}>
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
        )}
        
        {comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0 && !isReply && (
          <TouchableOpacity
            style={styles.repliesToggle}
            onPress={() => setShowReplies(!showReplies)}
          >
            <Text style={styles.repliesText}>
              {showReplies ? 'Hide' : 'Show'} {comment.reply_count || comment.replies.length} {(comment.reply_count || comment.replies.length) === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Replies */}
      {showReplies && comment.replies && Array.isArray(comment.replies) && comment.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {comment.replies
            .filter((reply, index, array) => 
              reply && 
              reply.id && 
              typeof reply.id === 'number' &&
              // Remove duplicates by checking if this is the first occurrence of this ID
              array.findIndex(r => r && r.id === reply.id) === index
            )
            .map((reply, index) => (
              <CommentItem
                key={`${comment.id}-reply-${reply.id}-${index}`}
                comment={reply}
                currentUserId={currentUserId}
                isReply={true}
                onUpdate={onUpdate}
                onDelete={onUpdate}
              />
            ))}
        </View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Comment</Text>
            
            <TextInput
              style={styles.editInput}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              placeholder="Edit your comment..."
              maxLength={1000}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEditContent(comment.content);
                  setShowEditModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleEdit}
                disabled={isEditing}
              >
                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyContainer: {
    marginLeft: 20,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 12,
  },
  actionText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  deleteText: {
    color: '#dc3545',
  },
  content: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyButton: {
    marginRight: 16,
  },
  replyText: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  repliesToggle: {},
  repliesText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007bff',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default CommentItem;

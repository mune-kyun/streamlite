import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import PlaylistService from '../services/playlistService';
import { Playlist, CreatePlaylistRequest } from '../types/playlist';
import { darkTheme } from '../styles/theme';

interface AddToPlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: number;
  videoTitle: string;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  visible,
  onClose,
  videoId,
  videoTitle,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<number | null>(null);
  
  // Create playlist form state
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const loadPlaylists = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const response = await PlaylistService.getUserPlaylists(user.id, { limit: 100 });
      setPlaylists(response.playlists);
    } catch (error) {
      console.error('Error loading playlists:', error);
      Alert.alert('Error', 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadPlaylists();
    }
  }, [visible, user?.id]);

  const handleAddToPlaylist = async (playlist: Playlist) => {
    try {
      setAddingToPlaylist(playlist.id);
      
      // Check if video is already in playlist
      const isInPlaylist = await PlaylistService.isVideoInPlaylist(playlist.id, videoId);
      if (isInPlaylist) {
        Alert.alert('Already Added', `"${videoTitle}" is already in "${playlist.name}"`);
        return;
      }

      await PlaylistService.addVideoToPlaylist(playlist.id, { video_id: videoId });
      Alert.alert('Success', `Added "${videoTitle}" to "${playlist.name}"`);
      onClose();
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      Alert.alert('Error', 'Failed to add video to playlist');
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!user?.id || !newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    try {
      setCreatingPlaylist(true);
      
      const playlistData: CreatePlaylistRequest = {
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim(),
        is_public: newPlaylistIsPublic,
      };

      const newPlaylist = await PlaylistService.createPlaylist(user.id, playlistData);
      
      // Add video to the new playlist
      await PlaylistService.addVideoToPlaylist(newPlaylist.id, { video_id: videoId });
      
      Alert.alert('Success', `Created "${newPlaylist.name}" and added "${videoTitle}"`);
      
      // Reset form
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setNewPlaylistIsPublic(false);
      setShowCreateForm(false);
      
      onClose();
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handleAddToPlaylist(item)}
      disabled={addingToPlaylist === item.id}
    >
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.playlistVideoCount}>
          {item.video_count} video{item.video_count !== 1 ? 's' : ''}
        </Text>
      </View>
      
      {addingToPlaylist === item.id ? (
        <ActivityIndicator size="small" color={darkTheme.colors.accent} />
      ) : (
        <Text style={styles.addButton}>+</Text>
      )}
    </TouchableOpacity>
  );

  const renderCreateForm = () => (
    <View style={styles.createForm}>
      <Text style={styles.createFormTitle}>Create New Playlist</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Name *</Text>
        <TextInput
          style={styles.formInput}
          value={newPlaylistName}
          onChangeText={setNewPlaylistName}
          placeholder="Enter playlist name"
          maxLength={100}
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Description</Text>
        <TextInput
          style={[styles.formInput, styles.textArea]}
          value={newPlaylistDescription}
          onChangeText={setNewPlaylistDescription}
          placeholder="Enter description (optional)"
          multiline
          numberOfLines={2}
          maxLength={500}
        />
      </View>
      
      <View style={styles.formGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.formLabel}>Make Public</Text>
          <Switch
            value={newPlaylistIsPublic}
            onValueChange={setNewPlaylistIsPublic}
            trackColor={{ false: darkTheme.colors.gray500, true: darkTheme.colors.accent }}
            thumbColor={newPlaylistIsPublic ? darkTheme.colors.white : darkTheme.colors.gray100}
          />
        </View>
      </View>
      
      <View style={styles.formButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setShowCreateForm(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.createButton, creatingPlaylist && styles.disabledButton]}
          onPress={handleCreatePlaylist}
          disabled={creatingPlaylist}
        >
          <Text style={styles.createButtonText}>
            {creatingPlaylist ? 'Creating...' : 'Create & Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Playlists Yet</Text>
      <Text style={styles.emptyStateText}>
        Create your first playlist to organize your videos
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Add to Playlist</Text>
          
          <TouchableOpacity onPress={() => setShowCreateForm(true)}>
            <Text style={styles.newButton}>New</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {videoTitle}
          </Text>
        </View>

        {showCreateForm ? (
          renderCreateForm()
        ) : (
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={darkTheme.colors.accent} />
                <Text style={styles.loadingText}>Loading playlists...</Text>
              </View>
            ) : (
              <FlatList
                data={playlists}
                renderItem={renderPlaylistItem}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.md,
    backgroundColor: darkTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  title: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
  },
  cancelButton: {
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textSecondary,
  },
  newButton: {
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.accent,
    fontWeight: darkTheme.fontWeight.semibold,
  },
  videoInfo: {
    backgroundColor: darkTheme.colors.surface,
    padding: darkTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  videoTitle: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: darkTheme.spacing.lg,
  },
  playlistItem: {
    backgroundColor: darkTheme.colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: darkTheme.spacing.lg,
    marginBottom: darkTheme.spacing.sm,
    borderRadius: darkTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
    marginBottom: 4,
  },
  playlistVideoCount: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  addButton: {
    fontSize: 24,
    color: darkTheme.colors.accent,
    fontWeight: 'bold',
    marginLeft: darkTheme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: darkTheme.spacing.huge,
  },
  emptyStateTitle: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.sm,
  },
  emptyStateText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: darkTheme.spacing.lg,
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textSecondary,
  },
  createForm: {
    flex: 1,
    padding: darkTheme.spacing.lg,
  },
  createFormTitle: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.xl,
  },
  formGroup: {
    marginBottom: darkTheme.spacing.lg,
  },
  formLabel: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.sm,
  },
  formInput: {
    backgroundColor: darkTheme.colors.card,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    borderRadius: darkTheme.borderRadius.md,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.sm,
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textPrimary,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: darkTheme.spacing.xl,
  },
  cancelButtonText: {
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textSecondary,
    paddingHorizontal: darkTheme.spacing.xl,
    paddingVertical: darkTheme.spacing.md,
  },
  createButton: {
    backgroundColor: darkTheme.colors.accent,
    paddingHorizontal: darkTheme.spacing.xl,
    paddingVertical: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.md,
  },
  createButtonText: {
    color: darkTheme.colors.white,
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.semibold,
  },
  disabledButton: {
    backgroundColor: darkTheme.colors.gray600,
  },
});

export default AddToPlaylistModal;

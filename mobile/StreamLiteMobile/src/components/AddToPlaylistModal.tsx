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
        <ActivityIndicator size="small" color="#007bff" />
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
            trackColor={{ false: '#767577', true: '#007bff' }}
            thumbColor={newPlaylistIsPublic ? '#ffffff' : '#f4f3f4'}
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
                <ActivityIndicator size="large" color="#007bff" />
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  newButton: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  videoInfo: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  playlistItem: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  playlistVideoCount: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    fontSize: 24,
    color: '#007bff',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  createForm: {
    flex: 1,
    padding: 16,
  },
  createFormTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
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
    marginTop: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default AddToPlaylistModal;

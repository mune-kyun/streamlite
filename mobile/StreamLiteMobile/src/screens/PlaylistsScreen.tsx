import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import PlaylistService from '../services/playlistService';
import { Playlist, CreatePlaylistRequest, UpdatePlaylistRequest } from '../types/playlist';
import { config } from '../config/environment';
import { darkTheme } from '../styles/theme';

interface PlaylistsScreenProps {
  navigation: any;
}

export const PlaylistsScreen: React.FC<PlaylistsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  
  // Form state
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const navigateToNotifications = () => {
    Alert.alert('Notifications', 'Notifications feature coming soon!');
  };

  const loadPlaylists = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // First, test connection to User Service
      console.log('=== STARTING PLAYLIST LOAD ===');
      console.log('User ID:', user.id);
      console.log('Testing User Service connection...');
      
      const connectionTest = await PlaylistService.testConnection();
      console.log('Connection test result:', connectionTest);
      
      if (connectionTest.status === 'failed') {
        throw new Error(`Service unavailable: ${connectionTest.message}\n\nConnection Details:\n${JSON.stringify(connectionTest.details, null, 2)}`);
      }
      
      console.log('User Service connection OK, loading playlists...');
      const response = await PlaylistService.getUserPlaylists(user.id, { limit: 50 });
      console.log('Playlists loaded successfully:', response.playlists.length, 'playlists');
      setPlaylists(response.playlists);
    } catch (error: any) {
      console.error('=== PLAYLIST LOAD ERROR ===');
      console.error('Raw error:', error);
      
      const errorDetails = PlaylistService.getErrorDetails(error);
      console.error('Error details:', errorDetails);
      
      // Show detailed error to user
      Alert.alert(
        `${errorDetails.type}`,
        `${errorDetails.message}\n\nDetails: ${errorDetails.details}\n\nSuggestion: ${errorDetails.suggestion}`,
        [
          { text: 'OK' },
          { 
            text: 'Retry', 
            onPress: () => loadPlaylists() 
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlaylists();
    setRefreshing(false);
  }, [loadPlaylists]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const handleCreatePlaylist = async () => {
    if (!user?.id || !playlistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    try {
      setFormLoading(true);
      const playlistData: CreatePlaylistRequest = {
        name: playlistName.trim(),
        description: playlistDescription.trim(),
        is_public: isPublic,
      };

      await PlaylistService.createPlaylist(user.id, playlistData);
      
      // Reset form
      setPlaylistName('');
      setPlaylistDescription('');
      setIsPublic(false);
      setCreateModalVisible(false);
      
      // Reload playlists
      await loadPlaylists();
      
      Alert.alert('Success', 'Playlist created successfully');
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditPlaylist = async () => {
    if (!selectedPlaylist || !playlistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    try {
      setFormLoading(true);
      const playlistData: UpdatePlaylistRequest = {
        name: playlistName.trim(),
        description: playlistDescription.trim(),
        is_public: isPublic,
      };

      await PlaylistService.updatePlaylist(selectedPlaylist.id, playlistData);
      
      setEditModalVisible(false);
      setSelectedPlaylist(null);
      
      // Reload playlists
      await loadPlaylists();
      
      Alert.alert('Success', 'Playlist updated successfully');
    } catch (error) {
      console.error('Error updating playlist:', error);
      Alert.alert('Error', 'Failed to update playlist');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await PlaylistService.deletePlaylist(playlist.id);
              await loadPlaylists();
              Alert.alert('Success', 'Playlist deleted successfully');
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setPlaylistName(playlist.name);
    setPlaylistDescription(playlist.description);
    setIsPublic(playlist.is_public);
    setEditModalVisible(true);
  };

  const openCreateModal = () => {
    setPlaylistName('');
    setPlaylistDescription('');
    setIsPublic(false);
    setCreateModalVisible(true);
  };

  const navigateToPlaylist = (playlist: Playlist) => {
    navigation.navigate('PlaylistDetail', { playlist });
  };


  const renderModal = (visible: boolean, onClose: () => void, onSubmit: () => void, title: string) => (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onSubmit} disabled={formLoading}>
            <Text style={[styles.modalSaveButton, formLoading && styles.disabledButton]}>
              {formLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Name *</Text>
            <TextInput
              style={styles.formInput}
              value={playlistName}
              onChangeText={setPlaylistName}
              placeholder="Enter playlist name"
              placeholderTextColor={darkTheme.colors.accent}
              maxLength={100}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={playlistDescription}
              onChangeText={setPlaylistDescription}
              placeholder="Enter playlist description (optional)"
              placeholderTextColor={darkTheme.colors.accent}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>
          
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>Make Public</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#767577', true: '#007bff' }}
                thumbColor={isPublic ? '#ffffff' : '#f4f3f4'}
              />
            </View>
            <Text style={styles.switchDescription}>
              Public playlists can be viewed by other users
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkTheme.colors.accent} />
        <Text style={styles.loadingText}>Loading playlists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.colors.surface} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Ionicons 
              name="list" 
              size={20} 
              color={darkTheme.colors.accent} 
              style={styles.titleIcon}
            />
            <Text style={styles.headerTitle}>My Playlists</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Explore')}
            >
              <Ionicons 
                name="add" 
                size={20} 
                color={darkTheme.colors.accent} 
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
        {/* Create New Playlist Section */}
        <View style={styles.createSection}>
          <TouchableOpacity 
            style={styles.createPlaylistCard}
            onPress={openCreateModal}
          >
            <View style={styles.createIconContainer}>
              <Ionicons 
                name="add" 
                size={20} 
                color={darkTheme.colors.accent} 
              />
            </View>
            <View style={styles.createTextContainer}>
              <Text style={styles.createTitle}>Create New Playlist</Text>
              <Text style={styles.createSubtitle}>Organize your favorite videos</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Playlists List */}
        <View style={styles.playlistsContainer}>
          {playlists.length > 0 ? (
            playlists.map((playlist, index) => (
              <TouchableOpacity
                key={`playlist-${playlist.id}-${index}`}
                style={styles.playlistCard}
                onPress={() => navigateToPlaylist(playlist)}
              >
                <View style={styles.playlistThumbnail}>
                  {playlist.first_video_thumbnail ? (
                    <Image 
                      source={{ uri: `${config.API_ENDPOINTS.VIDEO_SERVICE}${playlist.first_video_thumbnail}` }} 
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                      onError={() => console.log('Thumbnail load error for playlist:', playlist.id)}
                    />
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Ionicons 
                        name="musical-notes" 
                        size={24} 
                        color={darkTheme.colors.textSecondary} 
                      />
                    </View>
                  )}
                  <View style={styles.playOverlay}>
                    <Ionicons 
                      name="play" 
                      size={12} 
                      color="#ffffff" 
                    />
                  </View>
                  <View style={styles.videoCountBadge}>
                    <Text style={styles.videoCountText}>{playlist.video_count}</Text>
                  </View>
                </View>
                
                <View style={styles.playlistInfo}>
                  <View style={styles.playlistDetails}>
                    <Text style={styles.playlistName} numberOfLines={1}>
                      {playlist.name}
                    </Text>
                    <Text style={styles.playlistMeta}>
                      {playlist.video_count} video{playlist.video_count !== 1 ? 's' : ''} • {playlist.is_public ? 'Public' : 'Private'}
                    </Text>
                    <Text style={styles.playlistDate}>
                      Created {new Date(playlist.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => openEditModal(playlist)}
                  >
                    <Ionicons 
                      name="ellipsis-vertical" 
                      size={14} 
                      color={darkTheme.colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="list-outline" 
                size={48} 
                color={darkTheme.colors.textSecondary} 
                style={styles.emptyStateIcon}
              />
              <Text style={styles.emptyStateTitle}>No playlists yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first playlist to organize your favorite videos
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
                <Text style={styles.createButtonText}>Create Playlist</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {renderModal(
        createModalVisible,
        () => setCreateModalVisible(false),
        handleCreatePlaylist,
        'Create Playlist'
      )}

      {renderModal(
        editModalVisible,
        () => setEditModalVisible(false),
        handleEditPlaylist,
        'Edit Playlist'
      )}
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
  headerContent: {
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
  headerTitle: {
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
  content: {
    flex: 1,
  },
  createSection: {
    padding: darkTheme.spacing.lg,
  },
  createPlaylistCard: {
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.lg,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
  },
  createIconContainer: {
    backgroundColor: `${darkTheme.colors.accent}20`,
    borderRadius: 24,
    padding: 12,
    marginRight: darkTheme.spacing.md,
  },
  createTextContainer: {
    flex: 1,
  },
  createTitle: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: '500',
    color: darkTheme.colors.textPrimary,
    marginBottom: 2,
  },
  createSubtitle: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  playlistsContainer: {
    paddingHorizontal: darkTheme.spacing.lg,
    gap: darkTheme.spacing.md,
  },
  playlistCard: {
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: darkTheme.spacing.md,
  },
  playlistThumbnail: {
    width: 96,
    height: 64,
    position: 'relative',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCountBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  videoCountText: {
    fontSize: darkTheme.fontSize.xs,
    color: '#ffffff',
    fontWeight: '500',
  },
  playlistInfo: {
    flex: 1,
    padding: darkTheme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playlistDetails: {
    flex: 1,
  },
  playlistName: {
    fontSize: darkTheme.fontSize.sm,
    fontWeight: '500',
    color: darkTheme.colors.textPrimary,
    marginBottom: 4,
  },
  playlistMeta: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
    marginBottom: 4,
  },
  playlistDate: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
  moreButton: {
    padding: darkTheme.spacing.sm,
    marginLeft: darkTheme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: darkTheme.spacing.xxxl,
    paddingHorizontal: darkTheme.spacing.lg,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: darkTheme.spacing.lg,
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: '500',
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: darkTheme.spacing.lg,
  },
  createButton: {
    backgroundColor: darkTheme.colors.accent,
    paddingHorizontal: darkTheme.spacing.xl,
    paddingVertical: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.full,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: darkTheme.fontSize.sm,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.md,
    backgroundColor: darkTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  modalTitle: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
  },
  modalCancelButton: {
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textSecondary,
  },
  modalSaveButton: {
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.accent,
    fontWeight: '600',
  },
  disabledButton: {
    color: darkTheme.colors.textSecondary,
    opacity: 0.5,
  },
  modalContent: {
    padding: darkTheme.spacing.lg,
  },
  formGroup: {
    marginBottom: darkTheme.spacing.xl,
  },
  formLabel: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: '500',
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
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.xs,
  },
  switchDescription: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
});

export default PlaylistsScreen;

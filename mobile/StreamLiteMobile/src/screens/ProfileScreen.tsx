import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { userService, Profile, UpdateProfileRequest } from '../services/userService';
import { videoService } from '../services/videoService';
import { Video } from '../types/video';
import Button from '../components/Button';
import { darkTheme } from '../styles/theme';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'playlists'>('videos');
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    avatar: '',
  });

  // Load user profile on component mount
  useEffect(() => {
    if (user?.id) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const userProfile = await userService.getProfile(user.id);
      setProfile(userProfile);
      setEditForm({
        display_name: userProfile.display_name || '',
        bio: userProfile.bio || '',
        avatar: userProfile.avatar || '',
      });
    } catch (error: any) {
      // Profile might not exist yet, that's okay
      console.log('Profile not found, will create on first edit:', error.message);
      setProfile(null);
      setEditForm({
        display_name: '',
        bio: '',
        avatar: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const updateData: UpdateProfileRequest = {};
      
      if (editForm.display_name.trim()) {
        updateData.display_name = editForm.display_name.trim();
      }
      if (editForm.bio.trim()) {
        updateData.bio = editForm.bio.trim();
      }
      if (editForm.avatar.trim()) {
        updateData.avatar = editForm.avatar.trim();
      }

      const updatedProfile = await userService.updateProfile(user.id, updateData);
      setProfile(updatedProfile);
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log('ProfileScreen: Logout button pressed');
    
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('ProfileScreen: Logout cancelled')
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('ProfileScreen: User confirmed logout');
            try {
              await logout();
              console.log('ProfileScreen: Logout completed successfully');
            } catch (error: any) {
              console.error('ProfileScreen: Logout failed:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const navigateToSettings = () => {
    navigation.navigate('Settings');
  };

  if (authLoading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User information not available</Text>
      </View>
    );
  }

  const displayName = profile?.display_name || user.email;
  const avatarText = profile?.display_name 
    ? profile.display_name.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  console.log('ProfileScreen: Rendering profile screen for user:', user?.email);
  console.log('ProfileScreen: Profile data:', profile);
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.colors.background} />
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        {/* Profile Header Section */}
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {profile?.avatar ? (
                  <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{avatarText}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.cameraButton} onPress={handleEditProfile}>
                <Ionicons name="camera" size={14} color={darkTheme.colors.white} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userHandle}>@{user.email.split('@')[0]}</Text>
              <Text style={styles.joinDate}>
                Joined {new Date(user.created_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>2.1M</Text>
                <Text style={styles.statLabel}>Subscribers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>156</Text>
                <Text style={styles.statLabel}>Videos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>45.2M</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsSection}>
          <View style={styles.actionButtonsRow}>
            <Button
              title="Edit Profile"
              onPress={handleEditProfile}
              variant="primary"
              icon="create-outline"
              style={styles.editButton}
            />
            <Button
              title="Share"
              onPress={() => Alert.alert('Share', 'Share feature coming soon!')}
              variant="outline"
              icon="share-outline"
              style={styles.shareButton}
            />
          </View>
          
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="primary"
            icon="log-out-outline"
            loading={authLoading}
            style={[styles.logoutButton, { backgroundColor: darkTheme.colors.error }]}
            fullWidth
          />
        </View>

        {/* Tabs Section */}
        <View style={styles.tabsSection}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'videos' && styles.activeTab
              ]}
              onPress={() => setActiveTab('videos')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'videos' && styles.activeTabText
              ]}>
                Videos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'playlists' && styles.activeTab
              ]}
              onPress={() => setActiveTab('playlists')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'playlists' && styles.activeTabText
              ]}>
                Playlists
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {activeTab === 'videos' ? (
            <View style={styles.videosGrid}>
              {/* Mock video grid - replace with actual user videos */}
              {Array.from({ length: 6 }).map((_, index) => (
                <View key={index} style={styles.videoGridItem}>
                  <View style={styles.videoThumbnail}>
                    <Ionicons 
                      name="videocam-outline" 
                      size={24} 
                      color={darkTheme.colors.textSecondary} 
                    />
                    <View style={styles.videoDuration}>
                      <Text style={styles.videoDurationText}>12:34</Text>
                    </View>
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      Ultimate Gaming Setup Tour 2024
                    </Text>
                    <Text style={styles.videoViews}>2.1M views</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.playlistsContainer}>
              <TouchableOpacity 
                style={styles.playlistItem}
                onPress={() => navigation.navigate('Playlists')}
              >
                <Ionicons 
                  name="list-outline" 
                  size={24} 
                  color={darkTheme.colors.accent} 
                />
                <View style={styles.playlistInfo}>
                  <Text style={styles.playlistTitle}>My Playlists</Text>
                  <Text style={styles.playlistSubtitle}>Manage your video collections</Text>
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={darkTheme.colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Load More Button */}
        {activeTab === 'videos' && (
          <View style={styles.loadMoreSection}>
            <Button
              title="Load More Videos"
              onPress={() => Alert.alert('Load More', 'Load more feature coming soon!')}
              variant="outline"
              style={styles.loadMoreButton}
            />
          </View>
        )}
        
        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSaveProfile}
              style={styles.modalSaveButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#007bff" />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Display Name</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.display_name}
                onChangeText={(text) => setEditForm({ ...editForm, display_name: text })}
                placeholder="Enter your display name"
                maxLength={100}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Bio</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={editForm.bio}
                onChangeText={(text) => setEditForm({ ...editForm, bio: text })}
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {editForm.bio.length}/500 characters
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Avatar URL (Optional)</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.avatar}
                onChangeText={(text) => setEditForm({ ...editForm, avatar: text })}
                placeholder="https://example.com/avatar.jpg"
                keyboardType="url"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: darkTheme.colors.surface,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  profileInfo: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: darkTheme.spacing.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: darkTheme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: darkTheme.colors.accent,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarText: {
    fontSize: darkTheme.fontSize.massive,
    fontWeight: darkTheme.fontWeight.bold,
    color: darkTheme.colors.white,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: darkTheme.colors.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: darkTheme.spacing.lg,
  },
  userName: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: darkTheme.fontWeight.bold,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.xs,
  },
  userHandle: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.xs,
  },
  joinDate: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: darkTheme.spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: darkTheme.fontWeight.bold,
    color: darkTheme.colors.textPrimary,
  },
  statLabel: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
  actionButtonsSection: {
    backgroundColor: darkTheme.colors.surface,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: darkTheme.spacing.md,
    marginBottom: darkTheme.spacing.md,
  },
  editButton: {
    flex: 1,
  },
  shareButton: {
    flex: 1,
  },
  logoutButton: {
    marginTop: darkTheme.spacing.sm,
  },
  tabsSection: {
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.lg,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: darkTheme.spacing.sm,
    paddingHorizontal: darkTheme.spacing.md,
    borderRadius: darkTheme.borderRadius.md,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: darkTheme.colors.accent,
  },
  tabText: {
    fontSize: darkTheme.fontSize.sm,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textSecondary,
  },
  activeTabText: {
    color: darkTheme.colors.white,
  },
  contentSection: {
    paddingHorizontal: darkTheme.spacing.lg,
    paddingBottom: darkTheme.spacing.lg,
  },
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: darkTheme.spacing.md,
  },
  videoGridItem: {
    width: '48%',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  videoThumbnail: {
    position: 'relative',
    width: '100%',
    height: 96,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoDuration: {
    position: 'absolute',
    bottom: darkTheme.spacing.xs,
    right: darkTheme.spacing.xs,
    backgroundColor: darkTheme.colors.overlayDark,
    paddingHorizontal: darkTheme.spacing.xs,
    paddingVertical: 2,
    borderRadius: darkTheme.borderRadius.xs,
  },
  videoDurationText: {
    color: darkTheme.colors.white,
    fontSize: darkTheme.fontSize.xs,
    fontWeight: darkTheme.fontWeight.medium,
  },
  videoInfo: {
    padding: darkTheme.spacing.sm,
  },
  videoTitle: {
    fontSize: darkTheme.fontSize.xs,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
    lineHeight: 16,
    marginBottom: darkTheme.spacing.xs,
  },
  videoViews: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
  playlistsContainer: {
    gap: darkTheme.spacing.md,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.card,
    padding: darkTheme.spacing.lg,
    borderRadius: darkTheme.borderRadius.lg,
    gap: darkTheme.spacing.md,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.xs,
  },
  playlistSubtitle: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  loadMoreSection: {
    paddingHorizontal: darkTheme.spacing.lg,
    paddingTop: darkTheme.spacing.xl,
    alignItems: 'center',
  },
  loadMoreButton: {
    paddingHorizontal: darkTheme.spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
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
  errorText: {
    fontSize: darkTheme.fontSize.lg,
    color: darkTheme.colors.error,
    textAlign: 'center',
    marginTop: darkTheme.spacing.xxxl,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCancelButton: {
    padding: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
});

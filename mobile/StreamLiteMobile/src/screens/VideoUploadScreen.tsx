import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useForm, Controller } from 'react-hook-form';
import { videoService } from '../services/videoService';
import { Category, UploadProgress, Video } from '../types/video';
import { darkTheme } from '../styles/theme';
import Button from '../components/Button';
import { CustomHeader } from '../components/CustomHeader';

interface VideoUploadScreenProps {
  navigation: any;
}

interface UploadFormData {
  title: string;
  description: string;
  category_id: number;
}

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}


export const VideoUploadScreen: React.FC<VideoUploadScreenProps> = ({ navigation }) => {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [tags, setTags] = useState('');
  const [titleLength, setTitleLength] = useState(0);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState<Video | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UploadFormData>();

  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await videoService.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    }
  };

  const selectVideoFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        console.log('Selected file:', file);
        
        // Validate file size (limit to 100MB for mobile)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size && file.size > maxSize) {
          Alert.alert(
            'File Too Large',
            'Please select a video file smaller than 100MB'
          );
          return;
        }

        setSelectedFile({
          uri: file.uri,
          name: file.name,
          size: file.size || 0,
          mimeType: file.mimeType || 'video/mp4',
        });
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      Alert.alert('Error', 'Failed to select video file');
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
  };

  const selectCategory = (category: Category) => {
    setSelectedCategory(category);
    setValue('category_id', category.id);
    setShowCategoryModal(false);
  };

  // Helper function to format tags with proper comma separation
  const formatTags = (tagString: string): string => {
    if (!tagString.trim()) return '';
    
    // Split by comma, trim whitespace, filter empty strings, and rejoin
    return tagString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .join(', ');
  };

  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a video file');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    setUploading(true);
    setUploadProgress({ loaded: 0, total: selectedFile.size, percentage: 0 });

    try {
      // Format tags with proper comma separation
      const formattedTags = formatTags(tags);
      
      console.log('Starting upload with file:', selectedFile);
      console.log('Upload data:', { 
        title: data.title, 
        description: data.description, 
        category_id: data.category_id,
        tags: formattedTags
      });

      // Create a proper File object for React Native FormData
      const fileData = {
        uri: selectedFile.uri,
        type: selectedFile.mimeType,
        name: selectedFile.name,
      };

      const uploadData = {
        file: fileData,
        title: data.title,
        description: data.description || '',
        category_id: data.category_id,
        tags: formattedTags,
      };

      const response = await videoService.uploadVideo(
        uploadData,
        (progress: UploadProgress) => {
          console.log('Upload progress:', progress);
          setUploadProgress(progress);
        }
      );

      console.log('Upload response:', response);

      if (response.success && response.data) {
        setUploadProgress(null);
        setUploading(false);
        setUploadedVideo(response.data);
        setShowSuccessModal(true);
      } else {
        throw new Error(response.error?.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      console.error('Error details:', error.response?.data);
      setUploading(false);
      setUploadProgress(null);
      
      let errorMessage = 'Failed to upload video';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Upload Failed', errorMessage);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedCategory(null);
    setUploadProgress(null);
    setTags('');
    setTitleLength(0);
    setDescriptionLength(0);
    setShowSuccessModal(false);
    setUploadedVideo(null);
    reset();
  };

  const handleBackToHomepage = () => {
    setShowSuccessModal(false);
    // Navigate to Home tab and trigger refresh
    navigation.navigate('Home', { refresh: true });
  };

  const handleViewVideo = () => {
    if (uploadedVideo) {
      setShowSuccessModal(false);
      navigation.navigate('VideoPlayer', { video: uploadedVideo });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  return (
    <View style={styles.container}>
      <CustomHeader
        title="Upload Video"
        leftIcon="arrow-back"
        onLeftPress={() => navigation.goBack()}
        rightIcons={[]}
        rightComponent={
          <Button
            title="Publish"
            onPress={handleSubmit(onSubmit)}
            variant="primary"
            size="small"
            disabled={!selectedFile || uploading || !selectedCategory}
            style={styles.publishButton}
          />
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video Upload Section */}
        <View style={styles.section}>
          {!selectedFile ? (
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={selectVideoFile}
              disabled={uploading}
            >
              <View style={styles.uploadPlaceholder}>
                <View style={styles.uploadIcon}>
                  <Ionicons name="cloud-upload-outline" size={32} color={darkTheme.colors.white} />
                </View>
                <Text style={styles.uploadTitle}>Select video to upload</Text>
                <Text style={styles.uploadSubtext}>Drag and drop or click to browse</Text>
                <Button
                  title="Choose File"
                  onPress={selectVideoFile}
                  variant="primary"
                  size="small"
                  style={styles.chooseFileButton}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.videoPreview}>
              <View style={styles.videoContainer}>
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="play" size={32} color={darkTheme.colors.white} />
                </View>
                <TouchableOpacity style={styles.removeVideoButton} onPress={removeSelectedFile}>
                  <Ionicons name="close" size={16} color={darkTheme.colors.white} />
                </TouchableOpacity>
              </View>
              <View style={styles.fileDetails}>
                <View style={styles.fileNameRow}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                </View>
                {uploading && uploadProgress && (
                  <>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${uploadProgress.percentage}%` }]} />
                    </View>
                    <Text style={styles.progressText}>Uploading... {uploadProgress.percentage}%</Text>
                  </>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Video Details Section */}
        {selectedFile && (
          <View style={styles.videoDetailsSection}>
            {/* Title Input */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Title</Text>
              <Controller
                control={control}
                name="title"
                rules={{
                  required: 'Title is required',
                  minLength: {
                    value: 3,
                    message: 'Title must be at least 3 characters',
                  },
                  maxLength: {
                    value: 100,
                    message: 'Title must be less than 100 characters',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.textInput, errors.title && styles.inputError]}
                    placeholder="Enter video title..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      setTitleLength(text.length);
                    }}
                    onBlur={onBlur}
                    editable={!uploading}
                    maxLength={100}
                  />
                )}
              />
              <Text style={styles.characterCount}>{titleLength}/100</Text>
              {errors.title && (
                <Text style={styles.errorText}>{errors.title.message}</Text>
              )}
            </View>

            {/* Description Input */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Description</Text>
              <Controller
                control={control}
                name="description"
                rules={{
                  maxLength: {
                    value: 500,
                    message: 'Description must be less than 500 characters',
                  },
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.textInput, styles.textArea, errors.description && styles.inputError]}
                    placeholder="Tell viewers about your video..."
                    placeholderTextColor={darkTheme.colors.textSecondary}
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      setDescriptionLength(text.length);
                    }}
                    onBlur={onBlur}
                    multiline
                    numberOfLines={4}
                    editable={!uploading}
                    maxLength={500}
                  />
                )}
              />
              <Text style={styles.characterCount}>{descriptionLength}/500</Text>
              {errors.description && (
                <Text style={styles.errorText}>{errors.description.message}</Text>
              )}
            </View>


            {/* Category Section */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.categoryButton}
                onPress={() => setShowCategoryModal(true)}
                disabled={uploading}
              >
                <Text style={[styles.categoryButtonText, !selectedCategory && styles.categoryButtonPlaceholder]}>
                  {selectedCategory ? selectedCategory.name : 'Select category'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={darkTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tags Section */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Tags</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Add tags separated by commas..."
                placeholderTextColor={darkTheme.colors.textSecondary}
                value={tags}
                onChangeText={setTags}
                editable={!uploading}
              />
              <Text style={styles.helperText}>Help people find your video</Text>
            </View>
          </View>
        )}

        {/* Bottom padding for safe area */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCategoryModal(false)}
              >
                <Ionicons name="close" size={16} color={darkTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory?.id === category.id && styles.categoryItemSelected,
                  ]}
                  onPress={() => selectCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      selectedCategory?.id === category.id && styles.categoryItemTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                  <Text style={styles.categoryItemDescription}>
                    {category.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Upload Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
            </View>
            
            {/* Success Message */}
            <Text style={styles.successTitle}>Upload Successful!</Text>
            <Text style={styles.successMessage}>
              Your video has been uploaded successfully and is now available for viewing.
            </Text>
            
            {/* Action Buttons */}
            <View style={styles.successButtonContainer}>
              <Button
                title="Back to Homepage"
                onPress={handleBackToHomepage}
                variant="primary"
                style={[styles.successButton, styles.successButtonPrimary]}
              />
              <Button
                title="View Video"
                onPress={handleViewVideo}
                variant="outline"
                style={styles.successButton}
              />
            </View>
          </View>
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
  // Publish Button Container
  publishButtonContainer: {
    backgroundColor: darkTheme.colors.surface,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
    alignItems: 'flex-end',
  },
  publishButton: {
    paddingHorizontal: darkTheme.spacing.md,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Content Styles
  content: {
    flex: 1,
    padding: darkTheme.spacing.md,
  },
  section: {
    marginBottom: darkTheme.spacing.lg,
  },
  // Upload Area Styles
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: darkTheme.colors.border,
    borderRadius: darkTheme.borderRadius.lg,
    backgroundColor: darkTheme.colors.card,
    padding: darkTheme.spacing.xxxl,
    alignItems: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: darkTheme.spacing.md,
  },
  uploadIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: darkTheme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.md,
  },
  uploadTitle: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.sm,
  },
  uploadSubtext: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    marginBottom: darkTheme.spacing.md,
  },
  chooseFileButton: {
    paddingHorizontal: darkTheme.spacing.xl,
  },
  // Video Preview Styles
  videoPreview: {
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  videoContainer: {
    height: 192,
    backgroundColor: '#000000',
    borderRadius: darkTheme.borderRadius.lg,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeVideoButton: {
    position: 'absolute',
    top: darkTheme.spacing.sm,
    right: darkTheme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDetails: {
    padding: darkTheme.spacing.md,
  },
  fileNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.sm,
  },
  fileName: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    flex: 1,
  },
  fileSize: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: darkTheme.colors.border,
    borderRadius: 4,
    marginBottom: darkTheme.spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: darkTheme.colors.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  // Video Details Section
  videoDetailsSection: {
    gap: darkTheme.spacing.lg,
  },
  inputSection: {
    gap: darkTheme.spacing.sm,
  },
  label: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
  },
  textInput: {
    backgroundColor: darkTheme.colors.card,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    borderRadius: darkTheme.borderRadius.lg,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.md,
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: darkTheme.colors.error,
  },
  characterCount: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
    textAlign: 'right',
  },
  errorText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.error,
  },
  helperText: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
  },
  // Category Styles
  categoryButton: {
    backgroundColor: darkTheme.colors.card,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    borderRadius: darkTheme.borderRadius.lg,
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryButtonText: {
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textPrimary,
  },
  categoryButtonPlaceholder: {
    color: darkTheme.colors.textSecondary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: darkTheme.colors.surface,
    borderTopLeftRadius: darkTheme.borderRadius.xl,
    borderTopRightRadius: darkTheme.borderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: darkTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  modalTitle: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
  },
  modalCloseButton: {
    backgroundColor: darkTheme.colors.card,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryList: {
    padding: darkTheme.spacing.lg,
  },
  categoryItem: {
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.md,
    marginBottom: darkTheme.spacing.md,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  categoryItemSelected: {
    backgroundColor: darkTheme.colors.accent,
    borderColor: darkTheme.colors.accent,
  },
  categoryItemText: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.xs,
  },
  categoryItemTextSelected: {
    color: darkTheme.colors.white,
  },
  categoryItemDescription: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: darkTheme.spacing.lg,
  },
  successModalContent: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.xl,
    padding: darkTheme.spacing.xxxl,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successIconContainer: {
    marginBottom: darkTheme.spacing.lg,
    padding: darkTheme.spacing.md,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 50,
  },
  successTitle: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: darkTheme.fontWeight.bold,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.md,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: darkTheme.spacing.xl,
  },
  successButtonContainer: {
    width: '100%',
    gap: darkTheme.spacing.md,
  },
  successButton: {
    width: '100%',
    paddingVertical: darkTheme.spacing.md,
  },
  successButtonPrimary: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
});

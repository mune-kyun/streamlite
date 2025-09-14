import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { videoService } from '../services/videoService';

interface TestUploadScreenProps {
  navigation: any;
}

export const TestUploadScreen: React.FC<TestUploadScreenProps> = ({ navigation }) => {
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('Test Upload from Web');
  const [description, setDescription] = useState('Testing video upload functionality');

  const testUpload = async () => {
    setUploading(true);
    
    try {
      // Create a simple test file for web
      const testContent = 'This is a test video file content';
      const blob = new Blob([testContent], { type: 'video/mp4' });
      const file = new File([blob], 'test-video.mp4', { type: 'video/mp4' });
      
      // Create upload data
      const uploadData = {
        file: {
          uri: URL.createObjectURL(blob),
          type: 'video/mp4',
          name: 'test-video.mp4',
        },
        title: title,
        description: description,
        category_id: 1, // Entertainment category
      };

      console.log('TestUpload: Starting test upload...');
      
      const response = await videoService.uploadVideo(uploadData);
      
      console.log('TestUpload: Response:', response);
      
      if (response.success) {
        Alert.alert('Success!', 'Test upload completed successfully');
      } else {
        Alert.alert('Upload Failed', response.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      console.error('TestUpload: Error:', error);
      Alert.alert('Upload Failed', error.message || 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Upload</Text>
      <Text style={styles.subtitle}>Test video upload functionality</Text>
      
      <View style={styles.form}>
        <Text style={styles.label}>Title:</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter title"
        />
        
        <Text style={styles.label}>Description:</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          multiline
        />
        
        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={testUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Test Upload</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

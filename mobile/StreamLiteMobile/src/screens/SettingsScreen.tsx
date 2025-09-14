import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { userService, UserPreference, UserPreferencesRequest } from '../services/userService';

interface SettingsScreenProps {
  navigation: any;
}

interface PreferenceSettings {
  theme: string;
  language: string;
  autoplay: boolean;
  notifications: boolean;
  quality: string;
  subtitles: boolean;
  volume: string;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreference[]>([]);
  const [settings, setSettings] = useState<PreferenceSettings>({
    theme: 'light',
    language: 'en',
    autoplay: false,
    notifications: true,
    quality: 'auto',
    subtitles: false,
    volume: '50',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUserPreferences();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const userPrefs = await userService.getUserPreferences(user.id);
      setPreferences(userPrefs);
      
      // Convert preferences array to settings object
      const settingsObj: PreferenceSettings = {
        theme: 'light',
        language: 'en',
        autoplay: false,
        notifications: true,
        quality: 'auto',
        subtitles: false,
        volume: '50',
      };

      userPrefs.forEach(pref => {
        switch (pref.key) {
          case 'theme':
            settingsObj.theme = pref.value;
            break;
          case 'language':
            settingsObj.language = pref.value;
            break;
          case 'autoplay':
            settingsObj.autoplay = pref.value === 'true';
            break;
          case 'notifications':
            settingsObj.notifications = pref.value === 'true';
            break;
          case 'quality':
            settingsObj.quality = pref.value;
            break;
          case 'subtitles':
            settingsObj.subtitles = pref.value === 'true';
            break;
          case 'volume':
            settingsObj.volume = pref.value;
            break;
        }
      });

      setSettings(settingsObj);
    } catch (error: any) {
      console.log('User preferences not found or error:', error.message);
      // Keep default settings if no preferences found
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserPreferences = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const preferencesArray: UserPreferencesRequest = {
        preferences: [
          { key: 'theme', value: settings.theme },
          { key: 'language', value: settings.language },
          { key: 'autoplay', value: settings.autoplay.toString() },
          { key: 'notifications', value: settings.notifications.toString() },
          { key: 'quality', value: settings.quality },
          { key: 'subtitles', value: settings.subtitles.toString() },
          { key: 'volume', value: settings.volume },
        ],
      };

      await userService.updateUserPreferences(user.id, preferencesArray);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof PreferenceSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings({
              theme: 'light',
              language: 'en',
              autoplay: false,
              notifications: true,
              quality: 'auto',
              subtitles: false,
              volume: '50',
            });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveUserPreferences}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#007bff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Theme</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  settings.theme === 'light' && styles.segmentButtonActive,
                ]}
                onPress={() => updateSetting('theme', 'light')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.theme === 'light' && styles.segmentTextActive,
                  ]}
                >
                  Light
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  settings.theme === 'dark' && styles.segmentButtonActive,
                ]}
                onPress={() => updateSetting('theme', 'dark')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.theme === 'dark' && styles.segmentTextActive,
                  ]}
                >
                  Dark
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Language</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  settings.language === 'en' && styles.segmentButtonActive,
                ]}
                onPress={() => updateSetting('language', 'en')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.language === 'en' && styles.segmentTextActive,
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  settings.language === 'id' && styles.segmentButtonActive,
                ]}
                onPress={() => updateSetting('language', 'id')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.language === 'id' && styles.segmentTextActive,
                  ]}
                >
                  Indonesian
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Playback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Autoplay Next Video</Text>
            <Switch
              value={settings.autoplay}
              onValueChange={(value) => updateSetting('autoplay', value)}
              trackColor={{ false: '#e0e0e0', true: '#007bff' }}
              thumbColor={settings.autoplay ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Video Quality</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  settings.quality === 'auto' && styles.segmentButtonActive,
                ]}
                onPress={() => updateSetting('quality', 'auto')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.quality === 'auto' && styles.segmentTextActive,
                  ]}
                >
                  Auto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  settings.quality === '720p' && styles.segmentButtonActive,
                ]}
                onPress={() => updateSetting('quality', '720p')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.quality === '720p' && styles.segmentTextActive,
                  ]}
                >
                  720p
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  settings.quality === '1080p' && styles.segmentButtonActive,
                ]}
                onPress={() => updateSetting('quality', '1080p')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    settings.quality === '1080p' && styles.segmentTextActive,
                  ]}
                >
                  1080p
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Subtitles</Text>
            <Switch
              value={settings.subtitles}
              onValueChange={(value) => updateSetting('subtitles', value)}
              trackColor={{ false: '#e0e0e0', true: '#007bff' }}
              thumbColor={settings.subtitles ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Default Volume</Text>
            <View style={styles.volumeContainer}>
              <TextInput
                style={styles.volumeInput}
                value={settings.volume}
                onChangeText={(value) => {
                  const numValue = parseInt(value) || 0;
                  if (numValue >= 0 && numValue <= 100) {
                    updateSetting('volume', value);
                  }
                }}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.volumeLabel}>%</Text>
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={settings.notifications}
              onValueChange={(value) => updateSetting('notifications', value)}
              trackColor={{ false: '#e0e0e0', true: '#007bff' }}
              thumbColor={settings.notifications ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={resetToDefaults}>
            <Text style={styles.actionButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Settings are automatically synced across your devices
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  segmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#007bff',
  },
  segmentText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    minWidth: 50,
  },
  volumeLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../styles/theme';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000); // 3 second delay

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={styles.container.backgroundColor} />
      
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="play" size={32} color="#ffffff" style={styles.playIcon} />
          </View>
          <View style={styles.starBadge}>
            <Ionicons name="star" size={12} color="#ffffff" />
          </View>
        </View>
        
        <Text style={styles.brandTitle}>VidLite</Text>
        <Text style={styles.brandSubtitle}>Discover Amazing Videos</Text>
      </View>

      {/* Features Preview */}
      <View style={styles.featuresPreview}>
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="videocam" size={16} color={darkTheme.colors.accent} />
            </View>
            <Text style={styles.featureText}>Watch</Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="cloud-upload" size={16} color={darkTheme.colors.accent} />
            </View>
            <Text style={styles.featureText}>Upload</Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="list" size={16} color={darkTheme.colors.accent} />
            </View>
            <Text style={styles.featureText}>Playlist</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23', // Dark gradient background base
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 64,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logoIcon: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playIcon: {
    marginLeft: 4, // Slight offset to center the play icon visually
  },
  starBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f0f23',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f5f7fa',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#a0a3bd',
    textAlign: 'center',
  },
  featuresPreview: {
    paddingHorizontal: 32,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  featureText: {
    fontSize: 12,
    color: '#a0a3bd',
    textAlign: 'center',
  },
});

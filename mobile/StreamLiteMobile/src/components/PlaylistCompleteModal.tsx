import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../styles/theme';

interface PlaylistCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  onBrowseMore?: () => void;
}

export const PlaylistCompleteModal: React.FC<PlaylistCompleteModalProps> = ({
  visible,
  onClose,
  onBrowseMore,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={48} color={darkTheme.colors.accent} />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Playlist Complete</Text>
            <Text style={styles.message}>
              You have reached the end of the playlist.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onClose}
            >
              <Text style={styles.primaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: darkTheme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: darkTheme.spacing.xl,
  },
  container: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    ...darkTheme.shadows.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: darkTheme.spacing.lg,
  },
  iconContainer: {
    backgroundColor: darkTheme.colors.background,
    borderRadius: 50,
    padding: darkTheme.spacing.md,
    marginBottom: darkTheme.spacing.sm,
  },
  content: {
    alignItems: 'center',
    marginBottom: darkTheme.spacing.xl,
  },
  title: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: darkTheme.spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: darkTheme.spacing.md,
    paddingHorizontal: darkTheme.spacing.lg,
    borderRadius: darkTheme.borderRadius.md,
    gap: darkTheme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: darkTheme.colors.accent,
  },
  primaryButtonText: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.semibold,
    color: darkTheme.colors.white,
  },
  secondaryButton: {
    backgroundColor: darkTheme.colors.card,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  secondaryButtonText: {
    fontSize: darkTheme.fontSize.md,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textSecondary,
  },
});

export default PlaylistCompleteModal;

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../styles/theme';

interface CustomHeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  onLeftPress?: () => void;
  rightIcons?: Array<{
    name: string;
    onPress: () => void;
  }>;
  rightComponent?: React.ReactNode;
  showBorder?: boolean;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  subtitle,
  leftIcon,
  onLeftPress,
  rightIcons = [],
  rightComponent,
  showBorder = true,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top + 10 },
      showBorder && styles.withBorder
    ]}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.colors.surface} />
      
      <View style={styles.content}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {leftIcon && onLeftPress && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={onLeftPress}
            >
              <Ionicons 
                name={leftIcon as any}
                size={18} 
                color={darkTheme.colors.textSecondary} 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center Section */}
        <View style={styles.centerSection}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {rightComponent ? (
            rightComponent
          ) : (
            rightIcons.map((icon, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.iconButton}
                onPress={icon.onPress}
              >
                <Ionicons 
                  name={icon.name as any}
                  size={18} 
                  color={darkTheme.colors.textSecondary} 
                />
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: darkTheme.colors.surface,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingBottom: darkTheme.spacing.lg,
  },
  withBorder: {
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // Standard header height
  },
  leftSection: {
    width: 60,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconButton: {
    padding: darkTheme.spacing.sm,
    marginHorizontal: darkTheme.spacing.xs,
  },
  title: {
    fontSize: darkTheme.fontSize.lg,
    fontWeight: '600',
    color: darkTheme.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});

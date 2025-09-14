import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: any;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style
}) => {
  const getButtonStyle = () => {
    const baseStyles: any[] = [styles.button];
    
    // Size styles
    switch (size) {
      case 'small':
        baseStyles.push(styles.buttonSmall);
        break;
      case 'large':
        baseStyles.push(styles.buttonLarge);
        break;
      default:
        baseStyles.push(styles.buttonMedium);
    }
    
    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyles.push(styles.buttonSecondary);
        break;
      case 'outline':
        baseStyles.push(styles.buttonOutline);
        break;
      case 'ghost':
        baseStyles.push(styles.buttonGhost);
        break;
      default:
        baseStyles.push(styles.buttonPrimary);
    }
    
    // State styles
    if (disabled || loading) {
      baseStyles.push(styles.buttonDisabled);
    }
    
    if (fullWidth) {
      baseStyles.push(styles.buttonFullWidth);
    }
    
    return baseStyles;
  };
  
  const getTextStyle = () => {
    const baseStyles: any[] = [styles.buttonText];
    
    // Size styles
    switch (size) {
      case 'small':
        baseStyles.push(styles.buttonTextSmall);
        break;
      case 'large':
        baseStyles.push(styles.buttonTextLarge);
        break;
      default:
        baseStyles.push(styles.buttonTextMedium);
    }
    
    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyles.push(styles.buttonTextSecondary);
        break;
      case 'outline':
        baseStyles.push(styles.buttonTextOutline);
        break;
      case 'ghost':
        baseStyles.push(styles.buttonTextGhost);
        break;
      default:
        baseStyles.push(styles.buttonTextPrimary);
    }
    
    if (disabled || loading) {
      baseStyles.push(styles.buttonTextDisabled);
    }
    
    return baseStyles;
  };
  
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 20;
      default:
        return 16;
    }
  };
  
  const getIconColor = () => {
    if (disabled || loading) {
      return darkTheme.colors.textSecondary;
    }
    
    switch (variant) {
      case 'secondary':
      case 'outline':
      case 'ghost':
        return darkTheme.colors.textPrimary;
      default:
        return darkTheme.colors.white;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator 
            size="small" 
            color={getIconColor()} 
            style={styles.loadingIndicator}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <Ionicons 
                name={icon} 
                size={getIconSize()} 
                color={getIconColor()} 
                style={styles.iconLeft}
              />
            )}
            <Text style={getTextStyle()}>{title}</Text>
            {icon && iconPosition === 'right' && (
              <Ionicons 
                name={icon} 
                size={getIconSize()} 
                color={getIconColor()} 
                style={styles.iconRight}
              />
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: darkTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Size styles
  buttonSmall: {
    paddingHorizontal: darkTheme.spacing.md,
    paddingVertical: darkTheme.spacing.sm,
    minHeight: 32,
  },
  buttonMedium: {
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.md,
    minHeight: 44,
  },
  buttonLarge: {
    paddingHorizontal: darkTheme.spacing.xl,
    paddingVertical: darkTheme.spacing.lg,
    minHeight: 52,
  },
  
  // Variant styles
  buttonPrimary: {
    backgroundColor: darkTheme.colors.accent,
    ...darkTheme.shadows.sm,
  },
  buttonSecondary: {
    backgroundColor: darkTheme.colors.card,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  
  // State styles
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonFullWidth: {
    width: '100%',
  },
  
  // Text styles
  buttonText: {
    fontWeight: darkTheme.fontWeight.semibold,
    textAlign: 'center',
  },
  buttonTextSmall: {
    fontSize: darkTheme.fontSize.sm,
  },
  buttonTextMedium: {
    fontSize: darkTheme.fontSize.lg,
  },
  buttonTextLarge: {
    fontSize: darkTheme.fontSize.xl,
  },
  
  // Text variant styles
  buttonTextPrimary: {
    color: darkTheme.colors.white,
  },
  buttonTextSecondary: {
    color: darkTheme.colors.textPrimary,
  },
  buttonTextOutline: {
    color: darkTheme.colors.textPrimary,
  },
  buttonTextGhost: {
    color: darkTheme.colors.accent,
  },
  buttonTextDisabled: {
    color: darkTheme.colors.textSecondary,
  },
  
  // Icon styles
  iconLeft: {
    marginRight: darkTheme.spacing.sm,
  },
  iconRight: {
    marginLeft: darkTheme.spacing.sm,
  },
  loadingIndicator: {
    marginRight: darkTheme.spacing.sm,
  },
});

export default Button;

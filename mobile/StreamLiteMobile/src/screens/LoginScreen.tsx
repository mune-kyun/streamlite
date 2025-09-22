import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { darkTheme } from '../styles/theme';
import Button from '../components/Button';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, isLoading, authError, clearAuthError } = useAuth();
  const insets = useSafeAreaInsets();

  // Monitor authError state changes
  useEffect(() => {
    console.log('authError state changed:', authError);
  }, [authError]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    // The login function now handles errors internally and stores them in authError
    await login(email.trim(), password);
    // Navigation will be handled by the auth state change
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password functionality
    console.log('Forgot password clicked');
  };

  const renderErrorSection = () => {
    console.log('renderErrorSection called, authError:', authError);
    if (!authError) {
      console.log('No authError, returning null');
      return null;
    }

    console.log('Rendering error section with:', authError);
    return (
      <View style={styles.errorSection}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={20} color={darkTheme.colors.error} />
          <Text style={styles.errorMessage}>{authError.message}</Text>
        </View>
        
        {/* Contextual action buttons based on error code */}
        <View style={styles.errorActions}>
          {authError.code === 'USER_NOT_FOUND' && (
            <Button
              title="Create Account Instead"
              onPress={navigateToRegister}
              variant="primary"
              size="small"
            />
          )}
          
          {authError.code === 'INVALID_PASSWORD' && (
            <Button
              title="Forgot Password?"
              onPress={handleForgotPassword}
              variant="outline"
              size="small"
            />
          )}
          
          <Button
            title="Try Again"
            onPress={clearAuthError}
            variant="ghost"
            size="small"
          />
        </View>
      </View>
    );
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <View style={styles.brandContainer}>
            <Ionicons name="logo-youtube" size={24} color={darkTheme.colors.accent} />
            <Text style={styles.brandText}>VidStream</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + darkTheme.spacing.xxxl }]} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons name="person" size={24} color={darkTheme.colors.accent} />
            </View>
            <Text style={styles.heroTitle}>Welcome Back</Text>
            <Text style={styles.heroSubtitle}>Sign in to your VidStream account to continue</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color={darkTheme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor={darkTheme.colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color={darkTheme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, errors.password && styles.inputError]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={darkTheme.colors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={darkTheme.colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Error section - shows contextual error messages and actions */}
            {renderErrorSection()}

            {/* Sign In Button */}
            <Button
              title="Sign In"
              onPress={handleLogin}
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
              style={styles.signInButton}
            />
          </View>


          {/* Sign Up Link */}
          <View style={styles.signUpSection}>
            <View style={styles.signUpTextContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={navigateToRegister} disabled={isLoading}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  // Header Styles
  header: {
    backgroundColor: darkTheme.colors.surface,
    paddingHorizontal: darkTheme.spacing.md,
    paddingBottom: darkTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.sm,
  },
  brandText: {
    fontSize: darkTheme.fontSize.xl,
    fontWeight: darkTheme.fontWeight.bold,
    color: darkTheme.colors.textPrimary,
  },
  closeButton: {
    padding: darkTheme.spacing.sm,
  },
  // Content Styles
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: darkTheme.spacing.xl,
    paddingVertical: darkTheme.spacing.xxxl,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: darkTheme.spacing.xxxl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${darkTheme.colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: darkTheme.spacing.md,
  },
  heroTitle: {
    fontSize: darkTheme.fontSize.xxxl,
    fontWeight: darkTheme.fontWeight.bold,
    color: darkTheme.colors.textPrimary,
    marginBottom: darkTheme.spacing.sm,
  },
  heroSubtitle: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  // Form Styles
  form: {
    gap: darkTheme.spacing.xl,
    marginBottom: darkTheme.spacing.xxxl,
  },
  inputContainer: {
    gap: darkTheme.spacing.sm,
  },
  label: {
    fontSize: darkTheme.fontSize.sm,
    fontWeight: darkTheme.fontWeight.medium,
    color: darkTheme.colors.textPrimary,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: darkTheme.colors.card,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    borderRadius: darkTheme.borderRadius.lg,
    paddingHorizontal: darkTheme.spacing.huge,
    paddingVertical: darkTheme.spacing.md,
    fontSize: darkTheme.fontSize.md,
    color: darkTheme.colors.textPrimary,
  },
  inputIcon: {
    position: 'absolute',
    left: darkTheme.spacing.md,
    zIndex: 1,
  },
  passwordToggle: {
    position: 'absolute',
    right: darkTheme.spacing.md,
    padding: darkTheme.spacing.xs,
  },
  inputError: {
    borderColor: darkTheme.colors.error,
  },
  errorText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.error,
  },
  signInButton: {
    marginTop: darkTheme.spacing.sm,
  },
  // Error Section
  errorSection: {
    backgroundColor: `${darkTheme.colors.error}10`,
    borderRadius: darkTheme.borderRadius.lg,
    padding: darkTheme.spacing.md,
    borderWidth: 1,
    borderColor: `${darkTheme.colors.error}30`,
    gap: darkTheme.spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: darkTheme.spacing.sm,
  },
  errorMessage: {
    flex: 1,
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.error,
    fontWeight: darkTheme.fontWeight.medium,
  },
  errorActions: {
    gap: darkTheme.spacing.sm,
  },
  // Sign Up Section
  signUpSection: {
    alignItems: 'center',
  },
  signUpTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  signUpLink: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.accent,
    fontWeight: darkTheme.fontWeight.medium,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
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

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const { register } = useAuth();
  const insets = useSafeAreaInsets();

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 2) return darkTheme.colors.error;
    if (strength <= 3) return darkTheme.colors.warning;
    return darkTheme.colors.success;
  };

  const validateForm = (): boolean => {
    const newErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number & symbol';
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!acceptTerms) {
      newErrors.terms = 'You must accept the Terms of Service and Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      await register(email.trim(), password);
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthColor = getPasswordStrengthColor(passwordStrength);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={darkTheme.colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerContent}>
          <View style={styles.brandContainer}>
            <Ionicons name="logo-youtube" size={24} color={darkTheme.colors.accent} />
            <Text style={styles.brandText}>VidLite</Text>
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
              <Ionicons name="person-add" size={24} color={darkTheme.colors.accent} />
            </View>
            <Text style={styles.heroTitle}>Join VidLite</Text>
            <Text style={styles.heroSubtitle}>Create your account to start sharing and discovering amazing videos</Text>
          </View>

          {/* Registration Form */}
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
                  placeholder="Create a password"
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
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.passwordStrength}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4].map((bar) => (
                      <View
                        key={bar}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor: bar <= passwordStrength 
                              ? strengthColor 
                              : darkTheme.colors.border
                          }
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}
              
              <Text style={styles.passwordRequirements}>
                Use 8+ characters with letters, numbers & symbols
              </Text>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color={darkTheme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, errors.confirmPassword && styles.inputError]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor={darkTheme.colors.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Terms Checkbox */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                <View style={[styles.checkboxBox, acceptTerms && styles.checkboxChecked]}>
                  {acceptTerms && (
                    <Ionicons name="checkmark" size={16} color={darkTheme.colors.white} />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>
              {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
            </View>

            {/* Create Account Button */}
            <Button
              title="Create Account"
              onPress={handleRegister}
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
              style={styles.createAccountButton}
            />
          </View>


          {/* Sign In Link */}
          <View style={styles.signInSection}>
            <View style={styles.signInTextContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
                <Text style={styles.signInLink}>Sign In</Text>
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
  // Password Strength
  passwordStrength: {
    marginTop: darkTheme.spacing.sm,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: darkTheme.spacing.xs,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  passwordRequirements: {
    fontSize: darkTheme.fontSize.xs,
    color: darkTheme.colors.textSecondary,
    marginTop: darkTheme.spacing.sm,
  },
  // Terms Checkbox
  termsContainer: {
    gap: darkTheme.spacing.sm,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: darkTheme.spacing.md,
  },
  checkboxBox: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: darkTheme.colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: darkTheme.colors.accent,
    borderColor: darkTheme.colors.accent,
  },
  termsText: {
    flex: 1,
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
    lineHeight: 20,
  },
  termsLink: {
    color: darkTheme.colors.accent,
    fontWeight: darkTheme.fontWeight.medium,
  },
  createAccountButton: {
    marginTop: darkTheme.spacing.sm,
  },
  // Sign In Section
  signInSection: {
    alignItems: 'center',
  },
  signInTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  signInText: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.textSecondary,
  },
  signInLink: {
    fontSize: darkTheme.fontSize.sm,
    color: darkTheme.colors.accent,
    fontWeight: darkTheme.fontWeight.medium,
  },
});

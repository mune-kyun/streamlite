import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../styles/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: any;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = "Search videos...",
  autoFocus = false,
  style
}) => {
  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
  };

  const handleClear = () => {
    onChangeText('');
    if (onClear) {
      onClear();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchBar}>
        <Ionicons 
          name="search-outline" 
          size={16} 
          color={darkTheme.colors.textSecondary} 
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={darkTheme.colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={handleSubmit}
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="never" // We'll handle clear manually
        />
        {value.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClear}
          >
            <Ionicons 
              name="close-circle" 
              size={16} 
              color={darkTheme.colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.card,
    borderRadius: darkTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    paddingHorizontal: darkTheme.spacing.lg,
    paddingVertical: darkTheme.spacing.md,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: darkTheme.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: darkTheme.fontSize.lg,
    color: darkTheme.colors.textPrimary,
    padding: 0, // Remove default padding
  },
  clearButton: {
    marginLeft: darkTheme.spacing.sm,
    padding: darkTheme.spacing.xs,
  },
});

export default SearchBar;

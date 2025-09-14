import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthContextType, User } from '../types/auth';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<{ message: string; code?: string } | null>(null);

  const isAuthenticated = !!user && !!token;

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check if we have stored credentials
      const storedToken = await authService.getStoredToken();
      const storedUser = await authService.getStoredUser();
      
      if (storedToken && storedUser) {
        // Validate the stored token with the server
        try {
          const validatedUser = await authService.validateToken();
          setToken(storedToken);
          setUser(validatedUser);
        } catch (error) {
          // Token is invalid, clear stored data
          console.log('Stored token is invalid, clearing auth data');
          await authService.logout();
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Clear any corrupted data
      await authService.logout();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setAuthError(null); // Clear previous errors
      const authResponse = await authService.login(email, password);
      
      setUser(authResponse.user);
      setToken(authResponse.token || null);
    } catch (error: any) {
      console.error('Login error:', error);
      // Store error in context instead of throwing
      setAuthError({
        message: error.message || 'Login failed',
        code: error.code
      });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const authResponse = await authService.register(email, password);
      
      setUser(authResponse.user);
      setToken(authResponse.token || null);
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('AuthContext: Starting logout process...');
      setIsLoading(true);
      
      // Clear auth error state
      setAuthError(null);
      
      // Call auth service to clear stored data
      await authService.logout();
      console.log('AuthContext: AuthService logout completed');
      
      // Clear context state
      setUser(null);
      setToken(null);
      console.log('AuthContext: State cleared, user should be redirected to login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear the local state
      setUser(null);
      setToken(null);
      setAuthError(null);
    } finally {
      setIsLoading(false);
      console.log('AuthContext: Logout process completed');
    }
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const authResponse = await authService.refreshToken();
      setToken(authResponse.token || null);
      // User data should remain the same, but update if provided
      if (authResponse.user) {
        setUser(authResponse.user);
      }
    } catch (error: any) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout the user
      await logout();
      throw new Error(error.message || 'Token refresh failed');
    }
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    authError,
    login,
    register,
    logout,
    refreshToken,
    clearAuthError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC for components that require authentication
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      // You can replace this with a proper loading component
      return null;
    }
    
    if (!isAuthenticated) {
      // You can replace this with a redirect to login
      return null;
    }
    
    return <Component {...props} />;
  };
};

import { Platform } from 'react-native';
import { AppConfig, EnvironmentVariables } from './types';

// Get environment variables (Expo automatically loads .env files)
const env = process.env as EnvironmentVariables;

// Detect current environment
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  if (env.EXPO_PUBLIC_ENVIRONMENT) {
    return env.EXPO_PUBLIC_ENVIRONMENT as 'development' | 'staging' | 'production';
  }
  
  // Auto-detect based on __DEV__ flag
  if (__DEV__) {
    return 'development';
  }
  
  return 'production';
};

// Get default host IP based on environment
const getDefaultHost = (): string => {
  const environment = getEnvironment();
  
  switch (environment) {
    case 'development':
      // Use the new IP address provided by user
      return '192.168.2.195';
    case 'staging':
      return 'staging-api.streamlite.com'; // Example staging domain
    case 'production':
      return 'api.streamlite.com'; // Example production domain
    default:
      return '192.168.2.195';
  }
};

// Parse boolean environment variables
const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Parse number environment variables
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Build configuration object
const createConfig = (): AppConfig => {
  const environment = getEnvironment();
  const defaultHost = getDefaultHost();
  
  return {
    ENVIRONMENT: environment,
    VERSION: '1.0.0',
    
    API_ENDPOINTS: {
      AUTH_SERVICE: env.EXPO_PUBLIC_AUTH_SERVICE_URL || `http://${defaultHost}:8001`,
      USER_SERVICE: env.EXPO_PUBLIC_USER_SERVICE_URL || `http://${defaultHost}:8002`,
      VIDEO_SERVICE: env.EXPO_PUBLIC_VIDEO_SERVICE_URL || `http://${defaultHost}:8003`,
      STREAMING_SERVICE: env.EXPO_PUBLIC_STREAMING_SERVICE_URL || `http://${defaultHost}:8004`,
    },
    
    TIMEOUTS: {
      DEFAULT: parseNumber(env.EXPO_PUBLIC_API_TIMEOUT, 10000), // 10 seconds
      UPLOAD: parseNumber(env.EXPO_PUBLIC_UPLOAD_TIMEOUT, 30000), // 30 seconds
      AUTH: parseNumber(env.EXPO_PUBLIC_API_TIMEOUT, 10000), // 10 seconds
    },
    
    DEBUG: {
      API_LOGGING: parseBoolean(env.EXPO_PUBLIC_DEBUG_API, environment === 'development'),
      CONSOLE_LOGS: parseBoolean(env.EXPO_PUBLIC_DEBUG_CONSOLE, environment === 'development'),
      SHOW_NETWORK_ERRORS: environment !== 'production',
    },
  };
};

// Create and export the configuration
export const config = createConfig();

// Configuration validation
const validateConfig = (config: AppConfig): void => {
  const requiredEndpoints = ['AUTH_SERVICE', 'USER_SERVICE', 'VIDEO_SERVICE'];
  
  for (const endpoint of requiredEndpoints) {
    const url = config.API_ENDPOINTS[endpoint as keyof typeof config.API_ENDPOINTS];
    if (!url || !url.startsWith('http')) {
      throw new Error(`Invalid ${endpoint} URL: ${url}. Must be a valid HTTP/HTTPS URL.`);
    }
  }
  
  // Always log backend service URLs on app startup
  console.log('🚀 StreamLite Backend Services:');
  console.log(`   📡 Auth Service: ${config.API_ENDPOINTS.AUTH_SERVICE}`);
  console.log(`   👤 User Service: ${config.API_ENDPOINTS.USER_SERVICE}`);
  console.log(`   🎥 Video Service: ${config.API_ENDPOINTS.VIDEO_SERVICE}`);
  console.log(`   🌍 Environment: ${config.ENVIRONMENT}`);
  console.log(`   📱 Platform: ${Platform.OS}`);
  
  // Additional debug info if debug mode is enabled
  if (config.DEBUG.CONSOLE_LOGS) {
    console.log('🔧 StreamLite Debug Configuration:', {
      timeouts: config.TIMEOUTS,
      debug: config.DEBUG,
    });
  }
};

// Validate configuration on load
try {
  validateConfig(config);
} catch (error) {
  console.error('❌ Configuration Error:', error);
  throw error;
}

// Utility functions for configuration access
export const getApiEndpoint = (service: 'auth' | 'user' | 'video' | 'streaming'): string => {
  switch (service) {
    case 'auth':
      return config.API_ENDPOINTS.AUTH_SERVICE;
    case 'user':
      return config.API_ENDPOINTS.USER_SERVICE;
    case 'video':
      return config.API_ENDPOINTS.VIDEO_SERVICE;
    case 'streaming':
      return config.API_ENDPOINTS.STREAMING_SERVICE;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
};

export const getTimeout = (type: 'default' | 'upload' | 'auth'): number => {
  switch (type) {
    case 'default':
      return config.TIMEOUTS.DEFAULT;
    case 'upload':
      return config.TIMEOUTS.UPLOAD;
    case 'auth':
      return config.TIMEOUTS.AUTH;
    default:
      return config.TIMEOUTS.DEFAULT;
  }
};

export const isDebugMode = (): boolean => {
  return config.DEBUG.API_LOGGING || config.DEBUG.CONSOLE_LOGS;
};

export const isDevelopment = (): boolean => {
  return config.ENVIRONMENT === 'development';
};

export const isProduction = (): boolean => {
  return config.ENVIRONMENT === 'production';
};

// Export default configuration
export default config;

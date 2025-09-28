// Configuration type definitions for StreamLite app

export interface ApiEndpoints {
  AUTH_SERVICE: string;
  USER_SERVICE: string;
  VIDEO_SERVICE: string;
}

export interface Timeouts {
  DEFAULT: number;
  UPLOAD: number;
  AUTH: number;
}

export interface DebugConfig {
  API_LOGGING: boolean;
  CONSOLE_LOGS: boolean;
  SHOW_NETWORK_ERRORS: boolean;
}

export interface AppConfig {
  API_ENDPOINTS: ApiEndpoints;
  TIMEOUTS: Timeouts;
  DEBUG: DebugConfig;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  VERSION: string;
}

export interface EnvironmentVariables {
  EXPO_PUBLIC_ENVIRONMENT?: 'development' | 'staging' | 'production';
  EXPO_PUBLIC_AUTH_SERVICE_URL?: string;
  EXPO_PUBLIC_USER_SERVICE_URL?: string;
  EXPO_PUBLIC_VIDEO_SERVICE_URL?: string;
  EXPO_PUBLIC_API_TIMEOUT?: string;
  EXPO_PUBLIC_UPLOAD_TIMEOUT?: string;
  EXPO_PUBLIC_DEBUG_API?: string;
  EXPO_PUBLIC_DEBUG_CONSOLE?: string;
}

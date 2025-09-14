export interface User {
  id: number;
  email: string;
  role: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token?: string; // For frontend compatibility
  access_token?: string; // Backend returns this
  refresh_token: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: { message: string; code?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearAuthError: () => void;
}

export interface ApiError {
  message: string;
  status?: number;
}

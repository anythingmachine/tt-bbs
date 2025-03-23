/**
 * Types for auth operations
 */
export interface LoginRequest {
  username: string;
  password: string;
  sessionId: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  displayName: string;
  email?: string;
  sessionId: string;
}

export interface UserData {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: string;
  joinDate: string;
  lastLogin?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: UserData;
  isLoggedIn?: boolean;
}

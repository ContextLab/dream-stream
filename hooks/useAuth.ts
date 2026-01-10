import { useContext, createContext, useCallback } from 'react';
import type { User } from '@/types/database';

interface AuthContextValue {
  user: User | null;
  session: null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (credentials: { email: string; password: string; displayName?: string }) => Promise<void>;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; avatarUrl?: string }) => Promise<void>;
}

const MOCK_USER: User = {
  id: 'local-user',
  email: 'dreamer@local',
  display_name: 'Dreamer',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthState(): AuthContextValue {
  const handleSignUp = useCallback(async () => {}, []);
  const handleSignIn = useCallback(async () => {}, []);
  const handleSignOut = useCallback(async () => {}, []);
  const handleUpdateProfile = useCallback(async () => {}, []);

  return {
    user: MOCK_USER,
    session: null,
    isLoading: false,
    isAuthenticated: true,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    updateProfile: handleUpdateProfile,
  };
}

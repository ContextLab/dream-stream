import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  signUp,
  signIn,
  signOut,
  getCurrentSession,
  updateProfile,
  onAuthStateChange,
  type SignUpCredentials,
  type SignInCredentials,
} from '@/services/auth';
import type { User } from '@/types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; avatarUrl?: string }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { user: currentUser, session: currentSession } = await getCurrentSession();
        if (mounted) {
          setUser(currentUser);
          setSession(currentSession);
        }
      } catch (err) {
        console.warn('Failed to load session:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSession();

    const unsubscribe = onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      } else if (newSession?.user) {
        const { user: updatedUser } = await getCurrentSession();
        setUser(updatedUser);
        setSession(newSession);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleSignUp = useCallback(async (credentials: SignUpCredentials) => {
    setIsLoading(true);
    try {
      const newUser = await signUp(credentials);
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignIn = useCallback(async (credentials: SignInCredentials) => {
    setIsLoading(true);
    try {
      const newUser = await signIn(credentials);
      setUser(newUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdateProfile = useCallback(async (updates: { displayName?: string; avatarUrl?: string }) => {
    const updatedUser = await updateProfile(updates);
    setUser(updatedUser);
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    updateProfile: handleUpdateProfile,
  };
}

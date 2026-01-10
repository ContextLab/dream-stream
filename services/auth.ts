import type { User } from '@/types/database';

export interface AuthState {
  user: User | null;
  session: null;
  isLoading: boolean;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

const LOCAL_USER: User = {
  id: 'local-user',
  email: 'dreamer@local',
  display_name: 'Dreamer',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function signUp({ displayName }: SignUpCredentials): Promise<User> {
  return { ...LOCAL_USER, display_name: displayName || 'Dreamer' };
}

export async function signIn(_credentials: SignInCredentials): Promise<User> {
  return LOCAL_USER;
}

export async function signOut(): Promise<void> {
  // No-op for local mode
}

export async function getCurrentSession(): Promise<{ user: User | null; session: null }> {
  return { user: LOCAL_USER, session: null };
}

export async function getCurrentUser(): Promise<User | null> {
  return LOCAL_USER;
}

export async function updateProfile(updates: { displayName?: string; avatarUrl?: string }): Promise<User> {
  return {
    ...LOCAL_USER,
    display_name: updates.displayName || LOCAL_USER.display_name,
    avatar_url: updates.avatarUrl || LOCAL_USER.avatar_url,
  };
}

export async function resetPassword(_email: string): Promise<void> {
  // No-op for local mode
}

export function onAuthStateChange(
  callback: (event: string, session: null) => void
): () => void {
  callback('SIGNED_IN', null);
  return () => {};
}

export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  if (name && name.length > 50) {
    return 'Display name must be 50 characters or less';
  }
  return null;
}

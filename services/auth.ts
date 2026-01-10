import { supabase } from './supabase';
import { storage } from '@/lib/storage';
import { syncLocalProgressToServer } from './playback';
import type { User } from '@/types/database';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
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

function mapSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    display_name: supabaseUser.user_metadata?.display_name || null,
    avatar_url: supabaseUser.user_metadata?.avatar_url || null,
    created_at: supabaseUser.created_at || new Date().toISOString(),
    updated_at: supabaseUser.updated_at || new Date().toISOString(),
  };
}

export async function signUp({ email, password, displayName }: SignUpCredentials): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || null,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Registration failed. Please try again.');
  }

  const user = mapSupabaseUser(data.user);
  if (!user) {
    throw new Error('Failed to process user data');
  }

  if (data.session) {
    await syncLocalProgressToServer(user.id);
  }

  return user;
}

export async function signIn({ email, password }: SignInCredentials): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  const user = mapSupabaseUser(data.user);
  if (!user) {
    throw new Error('Failed to sign in');
  }

  await syncLocalProgressToServer(user.id);

  return user;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentSession(): Promise<{ user: User | null; session: Session | null }> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.warn('Error getting session:', error.message);
    return { user: null, session: null };
  }

  return {
    user: mapSupabaseUser(data.session?.user || null),
    session: data.session,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data.user) {
    return null;
  }

  return mapSupabaseUser(data.user);
}

export async function updateProfile(updates: { displayName?: string; avatarUrl?: string }): Promise<User> {
  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: updates.displayName,
      avatar_url: updates.avatarUrl,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const user = mapSupabaseUser(data.user);
  if (!user) {
    throw new Error('Failed to update profile');
  }

  return user;
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  
  if (error) {
    throw new Error(error.message);
  }
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
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

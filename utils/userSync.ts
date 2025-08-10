import { supabase } from '@/lib/supabase';

/**
 * Get the current authenticated user's ID
 */
export function getCurrentUserId(): string | null {
  const { data: { user } } = supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Check if the current user is authenticated
 */
export function isAuthenticated(): boolean {
  const { data: { user } } = supabase.auth.getUser();
  return !!user;
}

/**
 * Get the current user's email
 */
export function getCurrentUserEmail(): string | null {
  const { data: { user } } = supabase.auth.getUser();
  return user?.email || null;
}

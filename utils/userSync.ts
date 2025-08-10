import { supabase } from '@/lib/supabase';

/**
 * Get the current authenticated user's ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Get the current user's email
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return Promise.resolve(user?.email || null);
}

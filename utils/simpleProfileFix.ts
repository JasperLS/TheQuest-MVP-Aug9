import { supabase } from '@/lib/supabase';

/**
 * Simple function to update display name without complex profile creation
 * This is a minimal fix that should work with your existing Supabase setup
 */
export async function simpleUpdateDisplayName(userId: string, displayName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Simple update - if profile doesn't exist, this will fail gracefully
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', userId);

    if (error) {
      console.error('Error updating display name:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating display name:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Check if user has a profile
 */
export async function checkProfileExists(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  } catch (error) {
    return false;
  }
}

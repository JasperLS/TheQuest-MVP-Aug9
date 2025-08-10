import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  profile_image_url: string | null;
  points: number;
  bio: string | null;
  created_at: string;
}

/**
 * Ensures a profile exists for the current user
 * Creates one if it doesn't exist
 */
export async function ensureProfileExists(userId: string, email: string): Promise<Profile | null> {
  try {
    // First, try to get the existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return existingProfile;
    }

    // If no profile exists, create one
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: `user_${userId.substring(0, 8)}`,
        display_name: 'New User',
        email: email,
        points: 0,
        bio: null,
        profile_image_url: null
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return null;
    }

    return newProfile;
  } catch (error) {
    console.error('Error ensuring profile exists:', error);
    return null;
  }
}

/**
 * Updates the display name for the current user
 */
export async function updateDisplayName(userId: string, displayName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First ensure profile exists
    const profile = await ensureProfileExists(userId, '');
    if (!profile) {
      return { success: false, error: 'Failed to create profile' };
    }

    // Update the display name
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
 * Gets the user profile
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

/**
 * Updates multiple profile fields
 */
export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> {
  try {
    // First ensure profile exists
    const profile = await ensureProfileExists(userId, '');
    if (!profile) {
      return { success: false, error: 'Failed to create profile' };
    }

    // Remove id and created_at from updates as they shouldn't be modified
    const { id, created_at, ...updateData } = updates;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Updates the profile image URL in the database
 * @param userId - The user's ID
 * @param imageUrl - The new profile image URL
 * @returns Object with success status and error if any
 */
export async function updateProfileImageUrl(
  userId: string, 
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ profile_image_url: imageUrl })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile image URL:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateProfileImageUrl:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

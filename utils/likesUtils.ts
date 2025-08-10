import { supabase } from '@/lib/supabase';

export interface Like {
  post_id: string;
  user_id: string;
  created_at: string;
}

/**
 * Check if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Add a like to a post
 */
export async function addLike(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  // Validate that postId is a UUID
  if (!isValidUUID(postId)) {
    return { 
      success: false, 
      error: `Invalid post ID format. Expected UUID, got: ${postId}` 
    };
  }

  try {
    const { error } = await supabase
      .from('likes')
      .insert({
        post_id: postId,
        user_id: userId,
      });

    if (error) {
      console.error('Error adding like:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in addLike:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Remove a like from a post
 */
export async function removeLike(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  // Validate that postId is a UUID
  if (!isValidUUID(postId)) {
    return { 
      success: false, 
      error: `Invalid post ID format. Expected UUID, got: ${postId}` 
    };
  }

  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing like:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeLike:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Toggle a like (add if not exists, remove if exists)
 */
export async function toggleLike(postId: string, userId: string): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
  // Validate that postId is a UUID
  if (!isValidUUID(postId)) {
    return { 
      success: false, 
      isLiked: false, 
      error: `Invalid post ID format. Expected UUID, got: ${postId}` 
    };
  }

  try {
    // Check if like already exists
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking like status:', checkError);
      return { success: false, isLiked: false, error: checkError.message };
    }

    if (existingLike) {
      // Like exists, remove it
      const result = await removeLike(postId, userId);
      return { ...result, isLiked: false };
    } else {
      // Like doesn't exist, add it
      const result = await addLike(postId, userId);
      return { ...result, isLiked: true };
    }
  } catch (error) {
    console.error('Error in toggleLike:', error);
    return {
      success: false,
      isLiked: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get like count for a post
 */
export async function getLikeCount(postId: string): Promise<{ count: number; error?: string }> {
  // Validate that postId is a UUID
  if (!isValidUUID(postId)) {
    return { 
      count: 0, 
      error: `Invalid post ID format. Expected UUID, got: ${postId}` 
    };
  }

  try {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('Error getting like count:', error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0 };
  } catch (error) {
    console.error('Error in getLikeCount:', error);
    return {
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if a user has liked a specific post
 */
export async function isPostLikedByUser(postId: string, userId: string): Promise<{ isLiked: boolean; error?: string }> {
  // Validate that postId is a UUID
  if (!isValidUUID(postId)) {
    return { 
      isLiked: false, 
      error: `Invalid post ID format. Expected UUID, got: ${postId}` 
    };
  }

  try {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking if post is liked:', error);
      return { isLiked: false, error: error.message };
    }

    return { isLiked: !!data };
  } catch (error) {
    console.error('Error in isPostLikedByUser:', error);
    return {
      isLiked: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get all likes for a post with user information
 */
export async function getPostLikes(postId: string): Promise<{ likes: Like[]; error?: string }> {
  // Validate that postId is a UUID
  if (!isValidUUID(postId)) {
    return { 
      likes: [], 
      error: `Invalid post ID format. Expected UUID, got: ${postId}` 
    };
  }

  try {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting post likes:', error);
      return { likes: [], error: error.message };
    }

    return { likes: data || [] };
  } catch (error) {
    console.error('Error in getPostLikes:', error);
    return {
      likes: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

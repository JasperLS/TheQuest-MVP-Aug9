import { supabase } from '@/lib/supabase';

/**
 * Convert numeric rarity level (1-10) to string rarity
 */
function getRarityFromLevel(level: number): string {
  if (level >= 8) return 'legendary';
  if (level >= 6) return 'rare';
  if (level >= 4) return 'uncommon';
  return 'common';
}

export interface Post {
  id: string;
  user_id: string;
  animal_id: string | null;
  image_url: string;
  location: string | null;
  quality: number;
  caption: string | null;
  created_at: string;
  animal?: {
    id: string;
    species: string;
    common_names: string[];
    kingdom: string | null;
    class: string | null;
    fun_facts: string | null;
    rarity_level: number;
  } | null;
}

export interface DiscoveryPostMapping {
  discoveryId: string; // The local discovery ID (timestamp string)
  postId: string;      // The actual database post ID (UUID)
  imageUrl: string;    // The image URL from the database
}

export interface FeedPost {
  id: string;
  user_id: string;
  animal_id: string | null;
  image_url: string;
  location: string | null;
  quality: number;
  caption: string | null;
  created_at: string;
  user: {
    name: string;
    avatar: string;
  };
  animal: {
    id: string;
    name: string;
    scientificName: string;
    rarity: string;
    kingdom: string | null;
    class: string | null;
    fun_facts: string | null;
    rarity_level: number;
  } | null;
}

export interface DetailedPost extends Post {
  animal: {
    id: string;
    species: string;
    common_names: string[];
    kingdom: string | null;
    class: string | null;
    fun_facts: string | null;
    rarity_level: number;
  } | null;
  user: {
    name: string;
    avatar: string;
  };
}

/**
 * Create a new post in the database
 */
export async function createPost(postData: {
  user_id: string;
  animal_id?: string | null;
  image_url: string;
  location?: string | null;
  quality: number;
  caption?: string | null;
}): Promise<{ post: Post | null; error?: string }> {
  try {
    // Check if a post with the same image URL already exists for this user
    const { data: existingPost, error: checkError } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', postData.user_id)
      .eq('image_url', postData.image_url)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for existing post:', checkError);
      return { post: null, error: checkError.message };
    }

    // If a post already exists, return it instead of creating a duplicate
    if (existingPost) {
      console.log('Post already exists for this image, returning existing post:', existingPost.id);
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', existingPost.id)
        .single();

      if (fetchError) {
        console.error('Error fetching existing post:', fetchError);
        return { post: null, error: fetchError.message };
      }

      return { post };
    }

    // Create new post if none exists
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return { post: null, error: error.message };
    }

    console.log('New post created successfully:', data.id);
    return { post: data };
  } catch (error) {
    console.error('Error in createPost:', error);
    return {
      post: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check for duplicate posts in the database
 */
export async function checkForDuplicatePosts(): Promise<{ duplicates: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { duplicates: [], error: error.message };
    }

    // Group posts by image_url and user_id to find duplicates
    const grouped: Record<string, any[]> = data.reduce((acc, post) => {
      const key = `${post.user_id}-${post.image_url}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(post);
      return acc;
    }, {} as Record<string, any[]>);

    // Find groups with more than one post
    const duplicates = Object.values(grouped).filter(group => group.length > 1);
    
    if (duplicates.length > 0) {
      console.warn('Found duplicate posts:', duplicates);
    }

    return { duplicates };
  } catch (error) {
    return {
      duplicates: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch the latest posts for the feed (last 4 based on created_at)
 */
export async function getLatestPosts(): Promise<{ posts: FeedPost[]; error?: string }> {
  try {
    console.log('getLatestPosts: Fetching posts from database...');
    
    // First check for duplicates
    const { duplicates } = await checkForDuplicatePosts();
    if (duplicates.length > 0) {
      console.warn('getLatestPosts: Found duplicate posts, this might cause issues');
    }
    
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user:profiles!posts_user_id_fkey(display_name, profile_image_url),
        animal:animals!posts_animal_id_fkey(
          id,
          species,
          common_names,
          kingdom,
          class,
          fun_facts,
          rarity_level
        )
      `)
      .order('created_at', { ascending: false })
      .limit(4);

    if (error) {
      console.error('Error fetching latest posts:', error);
      return { posts: [], error: error.message };
    }

    console.log('getLatestPosts: Raw data from database:', data?.length, 'posts');
    if (data) {
      data.forEach((post, index) => {
        console.log(`Post ${index + 1}:`, {
          id: post.id,
          user_id: post.user_id,
          image_url: post.image_url,
          created_at: post.created_at,
          animal_id: post.animal_id
        });
      });
    }

    // Transform the data to match our FeedPost interface
    const transformedPosts: FeedPost[] = (data || []).map(post => ({
      ...post,
      user: {
        name: post.user?.display_name || 'Unknown User',
        avatar: post.user?.profile_image_url || 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?q=80&w=200&auto=format&fit=crop',
      },
      animal: post.animal ? {
        id: post.animal.id,
        name: post.animal.common_names?.[0] || post.animal.species || 'Unknown Species',
        scientificName: post.animal.species || 'Unknown',
        rarity: getRarityFromLevel(post.animal.rarity_level),
        kingdom: post.animal.kingdom,
        class: post.animal.class,
        fun_facts: post.animal.fun_facts,
        rarity_level: post.animal.rarity_level,
      } : null,
    }));

    console.log('getLatestPosts: Returning', transformedPosts.length, 'transformed posts');
    return { posts: transformedPosts };
  } catch (error) {
    console.error('Error in getLatestPosts:', error);
    return {
      posts: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch all posts for a specific user
 */
export async function getUserPosts(userId: string): Promise<{ posts: Post[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        animal:animals!posts_animal_id_fkey(
          id,
          species,
          common_names,
          kingdom,
          class,
          fun_facts,
          rarity_level
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user posts:', error);
      return { posts: [], error: error.message };
    }

    return { posts: data || [] };
  } catch (error) {
    console.error('Error in getUserPosts:', error);
    return {
      posts: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch a specific post by ID with detailed animal and user information
 */
export async function getPostById(postId: string): Promise<{ post: DetailedPost | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        animal:animals!posts_animal_id_fkey(
          id,
          species,
          common_names,
          kingdom,
          class,
          fun_facts,
          rarity_level
        ),
        user:profiles!posts_user_id_fkey(
          display_name,
          profile_image_url
        )
      `)
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      return { post: null, error: error.message };
    }

    // Transform the data to match our DetailedPost interface
    const detailedPost: DetailedPost = {
      ...data,
      animal: data.animal ? {
        id: data.animal.id,
        species: data.animal.species,
        common_names: data.animal.common_names || [],
        kingdom: data.animal.kingdom,
        class: data.animal.class,
        fun_facts: data.animal.fun_facts,
        rarity_level: data.animal.rarity_level,
      } : null,
      user: {
        name: data.user?.display_name || 'Unknown User',
        avatar: data.user?.profile_image_url || 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?q=80&w=200&auto=format&fit=crop',
      },
    };

    return { post: detailedPost };
  } catch (error) {
    console.error('Error in getPostById:', error);
    return {
      post: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create a mapping between local discoveries and database posts
 * This function tries to match discoveries with posts based on image URL and creation time
 */
export async function mapDiscoveriesToPosts(
  discoveries: Array<{ id: string; imageUri: string; discoveredAt: string }>,
  userId: string
): Promise<{ mappings: DiscoveryPostMapping[]; error?: string }> {
  try {
    // Fetch all posts for the user
    const { posts, error: postsError } = await getUserPosts(userId);
    if (postsError) {
      return { mappings: [], error: postsError };
    }

    const mappings: DiscoveryPostMapping[] = [];

    for (const discovery of discoveries) {
      // Try to find a matching post based on image URL
      const matchingPost = posts.find(post => {
        // Match by image URL (most reliable)
        if (post.image_url === discovery.imageUri) {
          return true;
        }
        
        // Fallback: match by creation time (within 5 minutes)
        const discoveryTime = new Date(discovery.discoveredAt).getTime();
        const postTime = new Date(post.created_at).getTime();
        const timeDiff = Math.abs(discoveryTime - postTime);
        return timeDiff < 5 * 60 * 1000; // 5 minutes
      });

      if (matchingPost) {
        mappings.push({
          discoveryId: discovery.id,
          postId: matchingPost.id,
          imageUrl: matchingPost.image_url,
        });
      }
    }

    return { mappings };
  } catch (error) {
    console.error('Error in mapDiscoveriesToPosts:', error);
    return {
      mappings: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get the database post ID for a discovery
 * Returns null if no mapping exists
 */
export async function getPostIdForDiscovery(
  discoveryId: string,
  imageUri: string,
  userId: string
): Promise<{ postId: string | null; error?: string }> {
  try {
    // First try to find by image URL
    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .eq('image_url', imageUri)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error finding post by image URL:', error);
      return { postId: null, error: error.message };
    }

    if (data) {
      return { postId: data.id };
    }

    // If no match found, return null
    return { postId: null };
  } catch (error) {
    console.error('Error in getPostIdForDiscovery:', error);
    return {
      postId: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get all posts and check for duplicates
 * This is useful for debugging duplicate post issues
 */
export async function getAllPostsWithDuplicates(): Promise<{ posts: Post[]; duplicates: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { posts: [], duplicates: [], error: error.message };
    }

    // Group by image_url and user_id to find duplicates
    const grouped: Record<string, Post[]> = {};
    data.forEach(post => {
      const key = `${post.user_id}-${post.image_url}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(post);
    });

    // Find duplicates
    const duplicates = Object.values(grouped).filter(group => group.length > 1);
    
    console.log('Database contains', data.length, 'total posts');
    console.log('Found', duplicates.length, 'groups with duplicates');
    
    if (duplicates.length > 0) {
      duplicates.forEach((group, index) => {
        console.log(`Duplicate group ${index + 1}:`, group.length, 'posts with same image and user');
        group.forEach(post => {
          console.log('  - Post ID:', post.id, 'Created:', post.created_at);
        });
      });
    }

    return { posts: data, duplicates };
  } catch (error) {
    return {
      posts: [],
      duplicates: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Delete a post by ID
 */
export async function deletePost(postId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First verify the post belongs to the user
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('Error fetching post for deletion:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    if (post.user_id !== userId) {
      return { success: false, error: 'Unauthorized to delete this post' };
    }

    // Delete the post
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deletePost:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

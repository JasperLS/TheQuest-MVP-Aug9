import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Image, RefreshControl, Platform, Alert } from 'react-native';
import { Heart, MessageCircle, Share } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { getRarityColor, getRarityLabel } from '@/utils/rarityUtils';
import * as Haptics from 'expo-haptics';
import { toggleLike, getLikeCount, isPostLikedByUser } from '@/utils/likesUtils';
import { getLatestPosts, FeedPost as DatabaseFeedPost, getAllPostsWithDuplicates } from '@/utils/postsUtils';

interface FeedPost {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  discovery: {
    id: string;
    name: string;
    scientificName: string;
    imageUri: string;
    rarity: string;
    discoveredAt: string;
    location?: string;
  };
  likes: number;
  comments: number;
  isLiked: boolean;
  caption?: string;
}

export default function FeedScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { user } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const [feedPosts, setFeedPosts] = useState<DatabaseFeedPost[]>([]);
  const [postLikes, setPostLikes] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load posts from database and likes data
  useEffect(() => {
    const loadData = async () => {
      if (!authUser?.id) return;
      
      setIsLoading(true);
      try {
        // Check for duplicates first
        const { duplicates } = await getAllPostsWithDuplicates();
        if (duplicates.length > 0) {
          console.warn('Feed: Found duplicate posts in database:', duplicates.length, 'groups');
        }
        
        // Fetch latest posts from database
        const { posts, error: postsError } = await getLatestPosts();
        if (postsError) {
          console.error('Error fetching posts:', postsError);
          return;
        }
        
        console.log('Feed: Setting posts in state:', posts.length, 'posts');
        posts.forEach((post, index) => {
          console.log(`Feed Post ${index + 1}:`, {
            id: post.id,
            image_url: post.image_url,
            created_at: post.created_at
          });
        });
        
        setFeedPosts(posts);
        
        // Load likes data for all posts
        const newPostLikes: Record<string, { count: number; isLiked: boolean }> = {};
        
        for (const post of posts) {
          try {
            // Get like count
            const { count, error: countError } = await getLikeCount(post.id);
            if (countError) {
              console.error(`Error getting like count for ${post.id}:`, countError);
              continue;
            }
            
            // Check if current user liked this post
            const { isLiked, error: likeError } = await isPostLikedByUser(post.id, authUser.id);
            if (likeError) {
              console.error(`Error checking if post is liked for ${post.id}:`, likeError);
              continue;
            }
            
            newPostLikes[post.id] = { count, isLiked };
          } catch (error) {
            console.error(`Error processing post ${post.id}:`, error);
            continue;
          }
        }
        
        setPostLikes(newPostLikes);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [authUser?.id]);

  const handleLike = async (postId: string) => {
    if (!authUser?.id) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Toggle the like in the database
      const result = await toggleLike(postId, authUser.id);
      
      if (result.success) {
        // Update local state
        setPostLikes(prev => ({
          ...prev,
          [postId]: {
            count: prev[postId]?.count || 0,
            isLiked: result.isLiked,
          }
        }));
        
        // Update the like count
        if (result.isLiked) {
          setPostLikes(prev => ({
            ...prev,
            [postId]: {
              ...prev[postId]!,
              count: (prev[postId]?.count || 0) + 1,
            }
          }));
        } else {
          setPostLikes(prev => ({
            ...prev,
            [postId]: {
              ...prev[postId]!,
              count: Math.max(0, (prev[postId]?.count || 0) - 1),
            }
          }));
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to update like');
      }
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };

  const handlePostPress = (postId: string) => {
    // For now, just show an alert since we don't have individual post screens yet
    Alert.alert('Post Details', 'Individual post view coming soon!');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Refresh posts and likes data
    if (authUser?.id) {
      try {
        // Fetch latest posts from database
        const { posts, error: postsError } = await getLatestPosts();
        if (postsError) {
          console.error('Error fetching posts during refresh:', postsError);
        } else {
          setFeedPosts(posts);
        }
        
        // Refresh likes data
        const newPostLikes: Record<string, { count: number; isLiked: boolean }> = {};
        
        for (const post of posts) {
          try {
            // Get like count
            const { count, error: countError } = await getLikeCount(post.id);
            if (countError) {
              console.error(`Error getting like count for ${post.id} during refresh:`, countError);
              continue;
            }
            
            // Check if current user liked this post
            const { isLiked, error: likeError } = await isPostLikedByUser(post.id, authUser.id);
            if (likeError) {
              console.error(`Error checking if post is liked for ${post.id} during refresh:`, likeError);
              continue;
            }
              
            newPostLikes[post.id] = { count, isLiked };
          } catch (error) {
            console.error(`Error processing post ${post.id} during refresh:`, error);
            continue;
          }
        }
        
        setPostLikes(newPostLikes);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }
    
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderPost = ({ item }: { item: DatabaseFeedPost }) => {
    const isLiked = postLikes[item.id]?.isLiked || false;
    const likeCount = postLikes[item.id]?.count || 0;
    const timeAgo = getTimeAgo(item.created_at);

    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <Image source={{ uri: item.user.avatar }} style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.user.name}</Text>
            <Text style={styles.postTime}>{timeAgo} • {item.location || 'Unknown location'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => handlePostPress(item.id)}
          activeOpacity={0.95}
        >
          <Image source={{ uri: item.image_url }} style={styles.postImage} />
          {item.animal && (
            <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.animal.rarity) }]}>
              <Text style={styles.rarityText}>{getRarityLabel(item.animal.rarity)}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
            testID={`like-${item.id}`}
          >
            <Heart 
              color={isLiked ? '#F44336' : '#8D6E63'} 
              size={24} 
              fill={isLiked ? '#F44336' : 'none'}
            />
            <Text style={[styles.actionText, isLiked && styles.likedText]}>
              {likeCount}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <MessageCircle color="#8D6E63" size={24} />
            <Text style={styles.actionText}>0</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Share color="#8D6E63" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.postContent}>
          {item.animal && (
            <>
              <Text style={styles.animalName}>{item.animal.name}</Text>
              <Text style={styles.scientificName}>{item.animal.scientificName}</Text>
            </>
          )}
          {item.caption && (
            <Text style={styles.caption}>
              <Text style={styles.captionUser}>{item.user.name}</Text> {item.caption}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={feedPosts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No posts yet</Text>
            <Text style={styles.emptyStateSubtext}>Take a photo of an animal to get started!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDE7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDE7', padding: 24 },
  loadingText: { color: '#8D6E63', fontSize: 16 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyStateText: { fontSize: 18, fontWeight: 'bold', color: '#8D6E63', marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: '#8D6E63', textAlign: 'center' },
  feedContent: { paddingBottom: 24 },
  postContainer: { backgroundColor: '#fff', marginBottom: 16, borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#424242', marginBottom: 2 },
  postTime: { fontSize: 12, color: '#8D6E63' },
  postImage: { width: '100%', height: 300, backgroundColor: '#eee' },
  rarityBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  rarityText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  postActions: { flexDirection: 'row', padding: 16, paddingTop: 12, paddingBottom: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionText: { marginLeft: 6, fontSize: 14, color: '#8D6E63' },
  likedText: { color: '#F44336', fontWeight: 'bold' },
  postContent: { padding: 16, paddingTop: 0 },
  animalName: { fontSize: 18, fontWeight: 'bold', color: '#424242', marginBottom: 2 },
  scientificName: { fontSize: 14, color: '#8D6E63', fontStyle: 'italic', marginBottom: 8 },
  caption: { fontSize: 14, color: '#424242', lineHeight: 20 },
  captionUser: { fontWeight: 'bold' },
});
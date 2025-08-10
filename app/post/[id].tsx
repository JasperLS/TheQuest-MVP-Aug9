import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Trash2, ArrowLeft, Heart, MessageCircle, Share, Info } from 'lucide-react-native';
import { getPostById, deletePost, DetailedPost } from '@/utils/postsUtils';
import { getLikeCount, isPostLikedByUser, toggleLike } from '@/utils/likesUtils';
import { getRarityColor, getRarityLabel } from '@/utils/rarityUtils';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import PostCard from '@/components/PostCard';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [post, setPost] = useState<DetailedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { post: postData, error } = await getPostById(id);
      if (error) {
        Alert.alert('Error', 'Failed to load post');
        return;
      }
      
      if (!postData) {
        Alert.alert('Error', 'Post not found');
        return;
      }
      
      setPost(postData);
      
      // Load like data
      if (authUser?.id) {
        const { count } = await getLikeCount(id);
        const { isLiked: liked } = await isPostLikedByUser(id, authUser.id);
        setLikeCount(count);
        setIsLiked(liked);
      }
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!authUser?.id || !id) return;
    
    try {
      const result = await toggleLike(id, authUser.id);
      if (result.success) {
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async () => {
    if (!authUser?.id || !post) return;
    
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: async () => {
            setDeleting(true);
            try {
              const result = await deletePost(post.id, authUser.id);
              if (result.success) {
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                
                Alert.alert('Success', 'Post deleted successfully!', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                Alert.alert('Error', result.error || 'Failed to delete post');
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            } finally {
              setDeleting(false);
            }
          }, 
          style: "destructive" 
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = authUser?.id === post.user_id;

  // Helper function to get rarity from level
  const getRarityFromLevel = (level: number): string => {
    if (level >= 8) return 'legendary';
    if (level >= 6) return 'rare';
    if (level >= 4) return 'uncommon';
    return 'common';
  };

  // Helper function to parse fun facts
  const parseFunFacts = (funFacts: string | null): string[] => {
    if (!funFacts) return [];
    return funFacts.split('\n').filter(fact => fact.trim().length > 0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#424242" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Unified PostCard Display */}
        <View style={styles.postCardContainer}>
          <PostCard
            post={post}
            onPress={() => {}} // No action needed in detail view
            onDelete={isOwner ? handleDelete : undefined}
            showDeleteButton={isOwner}
            variant="full"
          />
        </View>
        
        {/* Animal Information Section */}
        {post.animal ? (
          <View style={styles.animalInfo}>
            <Text style={styles.animalName}>
              {post.animal.common_names?.[0] || post.animal.species}
            </Text>
            {post.animal.common_names && post.animal.common_names.length > 0 && (
              <Text style={styles.commonNames}>
                Scientific name: {post.animal.species}
              </Text>
            )}
            
            <View style={styles.animalMeta}>
              <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(getRarityFromLevel(post.animal.rarity_level)) }]}>
                <Text style={styles.rarityText}>{getRarityLabel(getRarityFromLevel(post.animal.rarity_level))}</Text>
              </View>
              <Text style={styles.quality}>Quality: {post.quality}/10</Text>
            </View>

            {post.animal.kingdom && (
              <View style={styles.infoRow}>
                <Info color="#8D6E63" size={16} />
                <Text style={styles.infoText}>Kingdom: {post.animal.kingdom}</Text>
              </View>
            )}
            
            {post.animal.class && (
              <View style={styles.infoRow}>
                <Info color="#8D6E63" size={16} />
                <Text style={styles.infoText}>Class: {post.animal.class}</Text>
              </View>
            )}

            {/* Fun Facts Section */}
            {post.animal.fun_facts && parseFunFacts(post.animal.fun_facts).length > 0 && (
              <View style={styles.funFactsSection}>
                <Text style={styles.sectionTitle}>Fun Facts</Text>
                {parseFunFacts(post.animal.fun_facts).map((fact, index) => (
                  <View key={index} style={styles.factItem}>
                    <View style={styles.factBullet} />
                    <Text style={styles.factText}>{fact}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* Fallback for posts without animal data */
          <View style={styles.basicInfo}>
            <Text style={styles.basicInfoTitle}>Wildlife Discovery</Text>
            <Text style={styles.basicInfoText}>
              This post captures a moment in nature. The animal identification and details will be available once the image is processed.
            </Text>
            <View style={styles.basicInfoMeta}>
              <Text style={styles.quality}>Quality: {post.quality}/10</Text>
            </View>
          </View>
        )}
        
        <View style={styles.postInfo}>
          <Text style={styles.caption}>
            {post.caption || 'Wildlife Discovery'}
          </Text>
          
          <View style={styles.metaInfo}>
            <Text style={styles.date}>
              {new Date(post.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.userName}>by {post.user.name}</Text>
          </View>

          {post.location && (
            <View style={styles.locationContainer}>
              <MapPin color="#2E7D32" size={16} />
              <Text style={styles.location}>{post.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDE7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDE7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8D6E63',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDE7',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#8D6E63',
    marginBottom: 24,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFDE7',
    borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  postCardContainer: {
    padding: 16,
  },

  animalInfo: {
    padding: 16,
    backgroundColor: '#E8F5E9',
    margin: 16,
    borderRadius: 12,
  },
  animalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  commonNames: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 8,
  },
  animalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rarityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  rarityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  quality: {
    fontSize: 14,
    color: '#8D6E63',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#8D6E63',
  },
  funFactsSection: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  factItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  factBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8D6E63',
    marginRight: 8,
    marginTop: 4,
  },
  factText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  basicInfo: {
    padding: 16,
    backgroundColor: '#E8F5E9',
    margin: 16,
    borderRadius: 12,
  },
  basicInfoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  basicInfoText: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 12,
    lineHeight: 20,
  },
  basicInfoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postInfo: {
    padding: 16,
  },
  caption: {
    fontSize: 18,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 12,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    color: '#8D6E63',
  },
  userName: {
    fontSize: 14,
    color: '#8D6E63',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  location: {
    fontSize: 14,
    color: '#8D6E63',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    color: '#8D6E63',
  },
  likedText: {
    color: '#F44336',
    fontWeight: '600',
  },
});

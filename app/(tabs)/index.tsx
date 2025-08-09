import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Image, RefreshControl, Platform } from 'react-native';
import { Heart, MessageCircle, Share } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { getRarityColor, getRarityLabel } from '@/utils/rarityUtils';
import * as Haptics from 'expo-haptics';

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
  const { discoveries, user } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Build feed purely from the user's own discoveries
  const feedPosts = useMemo<FeedPost[]>(() => {
    const posts = discoveries.map((discovery) => ({
      id: `own-${discovery.id}`,
      user: {
        name: user.name,
        avatar: user.profilePicture || 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?q=80&w=200&auto=format&fit=crop',
      },
      discovery: {
        id: discovery.id,
        name: discovery.name,
        scientificName: discovery.scientificName,
        imageUri: discovery.imageUri,
        rarity: discovery.rarity,
        discoveredAt: discovery.discoveredAt,
      },
      likes: 0,
      comments: 0,
      isLiked: false,
    }));

    return posts.sort((a, b) =>
      new Date(b.discovery.discoveredAt).getTime() - new Date(a.discovery.discoveredAt).getTime()
    );
  }, [discoveries, user]);

  const handleLike = (postId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handlePostPress = (discoveryId: string) => {
    router.push(`/identification/${discoveryId}`);
  };

  // Camera entry handled elsewhere (tabs)

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderPost = ({ item }: { item: FeedPost }) => {
    const isLiked = likedPosts.has(item.id) || item.isLiked;
    const timeAgo = getTimeAgo(item.discovery.discoveredAt);

    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <Image source={{ uri: item.user.avatar }} style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.user.name}</Text>
            <Text style={styles.postTime}>{timeAgo} • {item.discovery.location}</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => handlePostPress(item.discovery.id)}
          activeOpacity={0.95}
        >
          <Image source={{ uri: item.discovery.imageUri }} style={styles.postImage} />
          <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.discovery.rarity) }]}>
            <Text style={styles.rarityText}>{getRarityLabel(item.discovery.rarity)}</Text>
          </View>
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
              {item.likes + (likedPosts.has(item.id) && !item.isLiked ? 1 : 0)}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <MessageCircle color="#8D6E63" size={24} />
            <Text style={styles.actionText}>{item.comments}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Share color="#8D6E63" size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.postContent}>
          <Text style={styles.animalName}>{item.discovery.name}</Text>
          <Text style={styles.scientificName}>{item.discovery.scientificName}</Text>
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
      />
      

    </View>
  );


}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDE7',
  },
  feedContent: {
    paddingBottom: 100,
  },
  postContainer: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 0,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  postTime: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 2,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  rarityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rarityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 14,
    color: '#8D6E63',
    marginLeft: 6,
    fontWeight: '500',
  },
  likedText: {
    color: '#F44336',
  },
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  animalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 2,
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#8D6E63',
    marginBottom: 8,
  },
  caption: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  captionUser: {
    fontWeight: 'bold',
  },

});
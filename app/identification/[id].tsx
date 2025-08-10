import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Image, ScrollView, TouchableOpacity, Animated, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { Camera, Heart, Info, MapPin, Save, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { getRarityColor, getRarityLabel } from '@/utils/rarityUtils';
import { toggleLike, getLikeCount, isPostLikedByUser } from '@/utils/likesUtils';



// Helper function to check if a string is a valid UUID
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export default function IdentificationScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const { discoveries, addToFavorites, user } = useAppContext();
  const router = useRouter();
  const discovery = discoveries.find(d => d.id === id);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  // Load likes data when component mounts
  useEffect(() => {
    const loadLikesData = async () => {
      if (!discovery?.id || !user?.id) return;
      
      // Only load likes for discoveries with valid UUIDs
      if (!isValidUUID(discovery.id)) {
        console.log(`Skipping likes loading for discovery with invalid UUID: ${discovery.id}`);
        return;
      }
      
      try {
        // Get like count
        const { count, error: countError } = await getLikeCount(discovery.id);
        if (countError) {
          console.error(`Error getting like count for ${discovery.id}:`, countError);
          return;
        }
        setLikes(count);
        
        // Check if current user liked this post
        const { isLiked: userLiked, error: likeError } = await isPostLikedByUser(discovery.id, user.id);
        if (likeError) {
          console.error(`Error checking if post is liked for ${discovery.id}:`, likeError);
          return;
        }
        setIsLiked(userLiked);
      } catch (error) {
        console.error('Error loading likes data:', error);
      }
    };

    loadLikesData();
  }, [discovery?.id, user?.id]);
  
  if (!discovery) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Animal not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const handleAddToFavorites = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    addToFavorites(discovery.id);
  };
  
  const handleSave = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setIsSaved(!isSaved);
    Alert.alert(
      isSaved ? "Removed from Saved" : "Saved!",
      isSaved ? "Discovery removed from your saved items." : "Discovery saved to your collection!",
      [{ 
        text: "OK", 
        onPress: () => {
          if (!isSaved) {
            router.push('/(tabs)/camera');
          }
        }
      }]
    );
  };

  const handleLike = async () => {
    if (!user?.id || !discovery?.id) {
      Alert.alert('Error', 'You must be logged in to like posts');
      return;
    }

    // Check if the discovery ID is a valid UUID
    if (!isValidUUID(discovery.id)) {
      Alert.alert('Error', 'This post cannot be liked. It may be an older post that needs to be re-uploaded.');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Toggle the like in the database
      const result = await toggleLike(discovery.id, user.id);
      
      if (result.success) {
        // Update local state
        setIsLiked(result.isLiked);
        
        // Update the like count
        if (result.isLiked) {
          setLikes(prev => prev + 1);
        } else {
          setLikes(prev => Math.max(0, prev - 1));
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to update like');
      }
    } catch (error) {
      console.error('Error handling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: discovery.imageUri }} 
          style={styles.image}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        />
        <View style={styles.imageOverlay}>
          <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(discovery.rarity) }]}>
            <Text style={styles.rarityText}>{getRarityLabel(discovery.rarity)}</Text>
          </View>
        </View>
      </View>
      
      <Animated.View 
        style={[
          styles.contentContainer,
          { 
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          }
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{discovery.name}</Text>
            <Text style={styles.scientificName}>{discovery.scientificName}</Text>
          </View>
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsValue}>+{discovery.points}</Text>
            <Text style={styles.pointsLabel}>points</Text>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <MapPin color="#8D6E63" size={16} />
            <Text style={styles.infoText}>{discovery.habitat}</Text>
          </View>
          <View style={styles.infoItem}>
            <Info color="#8D6E63" size={16} />
            <Text style={styles.infoText}>{discovery.category}</Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{discovery.description}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fun Facts</Text>
          {discovery.funFacts.map((fact, index) => (
            <View key={index} style={styles.factItem}>
              <View style={styles.factBullet} />
              <Text style={styles.factText}>{fact}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery Details</Text>
          <View style={styles.mapContainer}>
            <View style={styles.mockMap}>
              <MapPin color="#2E7D32" size={24} />
              <Text style={styles.mapText}>Location: {discovery.habitat}</Text>
            </View>
            <View style={styles.discoveryMeta}>
              <View style={styles.metaItem}>
                <Clock color="#8D6E63" size={16} />
                <Text style={styles.metaText}>
                  {new Date(discovery.discoveredAt).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.socialActions}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={handleLike}
            testID="like-button"
          >
            <Heart 
              color={isLiked ? '#F44336' : '#8D6E63'} 
              size={24} 
              fill={isLiked ? '#F44336' : 'none'}
            />
            <Text style={[styles.socialText, isLiked && styles.likedText]}>
              {likes}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialText}>0</Text>
          </TouchableOpacity>
          
          {source === 'camera' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleSave}
              testID="save-button"
            >
              <Save color="#fff" size={20} />
              <Text style={styles.primaryButtonText}>
                {isSaved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.cameraButton}
          onPress={() => router.push('/')}
          testID="back-to-camera"
        >
          <Camera color="#fff" size={20} />
          <Text style={styles.cameraButtonText}>Discover More Animals</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDE7',
  },
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  imageOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  rarityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rarityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFDE7',
    marginTop: -20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#424242',
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#8D6E63',
    marginTop: 4,
  },
  pointsContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#2E7D32',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#8D6E63',
    marginLeft: 6,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 24,
  },
  factItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  factBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
    marginTop: 6,
    marginRight: 8,
  },
  factText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
  },
  socialActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  socialText: {
    fontSize: 14,
    color: '#8D6E63',
    marginLeft: 6,
    fontWeight: '500',
  },
  likedText: {
    color: '#F44336',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    flex: 1,
    marginLeft: 'auto',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#424242',
  },
  primaryButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  discoveryInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  discoveryText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
  },
  cameraButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  mockMap: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 12,
  },
  mapText: {
    fontSize: 14,
    color: '#2E7D32',
    marginTop: 8,
    fontWeight: '500',
  },
  discoveryMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#8D6E63',
    marginLeft: 8,
  },
  commentsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
    maxHeight: 80,
  },
  sendButton: {
    padding: 4,
    marginLeft: 8,
  },
  commentsList: {
    gap: 16,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#8D6E63',
  },
  commentText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentLikeText: {
    fontSize: 12,
    color: '#8D6E63',
    marginLeft: 4,
  },
});
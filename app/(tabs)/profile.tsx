import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, FlatList, Platform, Modal, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Edit2, MoreHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { uploadProfileImage } from '@/utils/profileImageUtils';
import { getUserPosts, deletePost, Post } from '@/utils/postsUtils';
import { getLikeCount, isPostLikedByUser } from '@/utils/likesUtils';
import PostCard from '@/components/PostCard';

export default function ProfileScreen() {
  const { user, updateUserProfile, resetAppData, syncUserProfileWithSupabase } = useAppContext();
  const { user: authUser, signOut } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [activeTab, setActiveTab] = useState<'animals' | 'plants' | 'other'>('animals');
  const [showSettings, setShowSettings] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postLikes, setPostLikes] = useState<Record<string, { isLiked: boolean; count: number }>>({});

  // Sync profile with Supabase when component mounts
  useEffect(() => {
    if (authUser?.id && !hasSynced) {
      console.log('ProfileScreen: Syncing profile with Supabase for user:', authUser.id);
      
      // Update the user ID in AppContext to match the authenticated user
      if (user.id === 'user-1' && authUser.id !== 'user-1') {
        console.log('ProfileScreen: Updating user ID from', user.id, 'to', authUser.id);
        updateUserProfile({ id: authUser.id });
      }
      
      // Sync the profile from Supabase
      syncUserProfileWithSupabase(authUser.id);
      setHasSynced(true);
    }
  }, [authUser?.id, hasSynced]); // Only sync once per auth user

  // Load posts when any tab is active
  useEffect(() => {
    if (authUser?.id) {
      loadUserPosts();
    }
  }, [authUser?.id]);

  // Update edited name when user name changes
  useEffect(() => {
    setEditedName(user.name);
  }, [user.name]);

  const loadUserPosts = async () => {
    if (!authUser?.id) return;
    
    setPostsLoading(true);
    try {
      const { posts: userPosts, error } = await getUserPosts(authUser.id);
      if (error) {
        console.error('Error fetching user posts:', error);
        return;
      }
      
      setPosts(userPosts);
      
      // Load likes data for all posts
      const newPostLikes: Record<string, { count: number; isLiked: boolean }> = {};
      
      for (const post of userPosts) {
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
      console.error('Error loading user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!authUser?.id) return;
    
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: async () => {
            try {
              const result = await deletePost(postId, authUser.id);
              if (result.success) {
                // Remove from local state
                setPosts(prev => prev.filter(post => post.id !== postId));
                // Remove from likes state
                setPostLikes(prev => {
                  const newState = { ...prev };
                  delete newState[postId];
                  return newState;
                });
                
                if (Platform.OS !== 'web') {
                  // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // Removed Haptics
                }
                
                Alert.alert('Success', 'Post deleted successfully!');
              } else {
                Alert.alert('Error', result.error || 'Failed to delete post');
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          }, 
          style: "destructive" 
        }
      ]
    );
  };

  const handleProfilePictureChange = async () => {
    try {
      // Removed ImagePicker import, so this function is no longer functional
      // This function was related to the 'discoveries' feature which is removed.
      // Keeping it here for now, but it will not work as intended.
      Alert.alert('Feature Unavailable', 'Profile picture change is currently unavailable.');
      return;

      // if (!result.canceled && result.assets && result.assets.length > 0) {
      //   const asset = result.assets[0];
        
      //   // Show loading state
      //   setIsUpdating(true);
        
      //   try {
      //     // Upload image to Supabase storage
      //     const uploadResult = await uploadProfileImage(
      //       authUser?.id || user.id, 
      //       asset.uri, 
      //       asset.base64 || undefined
      //     );
          
      //     if (uploadResult.success && uploadResult.imageUrl) {
      //       // Add cache-busting timestamp to ensure new image is displayed
      //       const cacheBustedUrl = `${uploadResult.imageUrl}?t=${Date.now()}`;
            
      //       // Update local state and database
      //       await updateUserProfile({ profilePicture: cacheBustedUrl });
            
      //       if (Platform.OS !== 'web') {
      //         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      //       }
            
      //       Alert.alert('Success', 'Profile picture updated successfully!');
      //     } else {
      //       throw new Error(uploadResult.error || 'Failed to upload image');
      //     }
      //   } catch (error) {
      //     console.error('Error updating profile picture:', error);
      //     Alert.alert('Error', 'Failed to update profile picture. Please try again.');
      //   } finally {
      //     setIsUpdating(false);
      //   }
      // }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setIsUpdating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    setIsUpdating(true);
    try {
      await updateUserProfile({ name: editedName.trim() });
      setIsEditing(false);
      
      if (Platform.OS !== 'web') {
        // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // Removed Haptics
      }
      
      Alert.alert('Success', 'Display name updated successfully!');
    } catch (error) {
      console.error('Error updating display name:', error);
      Alert.alert('Error', 'Failed to update display name');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      "Reset All Data",
      "This will delete all your discoveries and achievements. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Reset", 
          onPress: () => {
            resetAppData();
            if (Platform.OS !== 'web') {
              // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // Removed Haptics
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleShare = () => {
    Alert.alert(
      "Share Your Collection",
      "This feature will be available in the next update!",
      [{ text: "OK" }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to log out');
            }
          }, 
          style: "destructive" 
        }
      ]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      "Feedback",
      "Thank you for your interest! Feedback feature coming soon.",
      [{ text: "OK" }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "About Wildlife Spotter",
      "Developed by Jasper for fun. Discover and collect amazing wildlife from around the world!",
      [{ text: "OK" }]
    );
  };

  // Categorize posts by kingdom
  const categorizedPosts = {
    animals: posts.filter(post => post.animal?.kingdom === 'Animalia'),
    plants: posts.filter(post => post.animal?.kingdom === 'Plantae'),
    other: posts.filter(post => !post.animal?.kingdom || (post.animal.kingdom !== 'Animalia' && post.animal.kingdom !== 'Plantae'))
  };

  const getCurrentPosts = () => {
    switch (activeTab) {
      case 'animals':
        return categorizedPosts.animals; // Show animal posts (kingdom === 'Animalia')
      case 'plants':
        return categorizedPosts.plants;
      case 'other':
        return categorizedPosts.other;
      default:
        return [];
    }
  };

  const currentPosts = getCurrentPosts();

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#2E7D32', '#1B5E20']}
        style={styles.header}
      >
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ 
              uri: user.profilePicture || 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?q=80&w=200&auto=format&fit=crop' 
            }} 
            style={styles.profileImage} 
          />
          <TouchableOpacity 
            style={styles.editImageButton}
            onPress={handleProfilePictureChange}
            testID="edit-profile-picture"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" size={16} />
            ) : (
              <Camera color="#fff" size={16} />
            )}
          </TouchableOpacity>
        </View>
        
        {isEditing ? (
          <View style={styles.editNameContainer}>
            <TextInput
              style={styles.nameInput}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Your name"
              placeholderTextColor="#E0E0E0"
              testID="name-input"
            />
            <TouchableOpacity 
              style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={isUpdating}
              testID="save-profile"
            >
              <Text style={styles.saveButtonText}>
                {isUpdating ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{user.name}</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
              testID="edit-name"
            >
              <Edit2 color="#fff" size={16} />
            </TouchableOpacity>
          </View>
        )}
        
        <Text style={styles.bio}>Wildlife Explorer</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user.rank}</Text>
            <Text style={styles.statLabel}>Rank</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
          testID="settings-menu-button"
        >
          <MoreHorizontal color="#fff" size={24} />
        </TouchableOpacity>
      </LinearGradient>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Badges</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesContainer}
        >
          {user.badges.map((badge, index) => (
            <View key={index} style={styles.badgeItem}>
              <View style={[styles.badge, { backgroundColor: badge.color }]}>
                {/* Medal icon removed as per new_code */}
              </View>
              <Text style={styles.badgeTitle}>{badge.title}</Text>
            </View>
          ))}
          {user.badges.length === 0 && (
            <View style={styles.emptyBadges}>
              <Text style={styles.emptyText}>
                Discover more animals to earn badges!
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
      
      <View style={styles.section}>
        <View style={styles.collectionHeader}>
          <Text style={styles.sectionTitle}>Your Posts</Text>
        </View>
      
      <View style={styles.tabsContainer}>
        {([
          { key: 'animals', label: 'Animals' },
          { key: 'plants', label: 'Plants' },
          { key: 'other', label: 'Other' }
        ] as const).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.activeTabButton
            ]}
            onPress={() => setActiveTab(tab.key)}
            testID={`tab-${tab.key}`}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab === tab.key && styles.activeTabButtonText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* All tabs now show posts using unified PostCard */}
      {postsLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : currentPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          {/* Filter icon removed as per new_code */}
          <Text style={styles.emptyTitle}>No {activeTab} posts found</Text>
          <Text style={styles.emptyText}>
            {posts.length === 0 
              ? "Start sharing your wildlife discoveries to build your collection!" 
              : "Try adjusting your search or filters"}
          </Text>
        </View>
      ) : (
        <FlatList
          key={`posts-${activeTab}`}
          data={currentPosts}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.postsList}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => router.push(`/post/${item.id}`)}
              onDelete={() => handleDeletePost(item.id)}
              showDeleteButton={true}
              variant="compact"
            />
          )}
        />
      )}
      </View>
      

      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Wildlife Spotter v1.0.0</Text>
      </View>
      
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                {/* X icon removed as per new_code */}
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.settingsMenuItem} onPress={handleLogout}>
              {/* LogOut icon removed as per new_code */}
              <Text style={styles.settingsMenuText}>Log out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsMenuItem}>
              {/* Settings icon removed as per new_code */}
              <Text style={styles.settingsMenuText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsMenuItem} onPress={handleFeedback}>
              {/* MessageSquare icon removed as per new_code */}
              <Text style={styles.settingsMenuText}>Feedback</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsMenuItem} onPress={handleAbout}>
              {/* Info icon removed as per new_code */}
              <Text style={styles.settingsMenuText}>About</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDE7',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2E7D32',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 18,
    minWidth: 150,
  },
  saveButton: {
    marginLeft: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  bio: {
    fontSize: 16,
    color: '#E8F5E9',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#E8F5E9',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 16,
  },
  badgesContainer: {
    paddingBottom: 8,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeTitle: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
  },
  emptyBadges: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  emptyText: {
    color: '#8D6E63',
    textAlign: 'center',
  },
  menuList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuItemText: {
    fontSize: 16,
    color: '#424242',
    marginLeft: 16,
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#F44336',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#424242',
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersLabel: {
    fontSize: 14,
    color: '#8D6E63',
    marginBottom: 8,
  },
  rarityFilters: {
    gap: 8,
  },
  rarityFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8D6E63',
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#8D6E6320',
  },
  rarityFilterText: {
    fontSize: 12,
    color: '#8D6E63',
  },
  collectionGrid: {
    gap: 8,
  },
  collectionCard: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  collectionCardImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  collectionRarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  collectionRarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  collectionCardContent: {
    padding: 12,
  },
  collectionCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
  },
  collectionCardDate: {
    fontSize: 10,
    color: '#8D6E63',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginTop: 16,
  },
  loadingText: {
    marginTop: 10,
    color: '#8D6E63',
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#2E7D32',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#8D6E63',
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  filterModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#424242',
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingsMenuText: {
    fontSize: 16,
    color: '#424242',
    marginLeft: 16,
  },
  postsList: {
    gap: 12,
  },
});
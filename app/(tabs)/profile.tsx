import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, Alert, Platform, TextInput, FlatList, Modal } from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Camera, Edit2, LogOut, Medal, Settings, Share2, Search, Filter, MoreHorizontal, MessageSquare, Info, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getRarityColor, getRarityLabel } from '@/utils/rarityUtils';

export default function ProfileScreen() {
  const { user, updateUserProfile, resetAppData, discoveries, syncUserProfileWithSupabase } = useAppContext();
  const { user: authUser, signOut } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user.name);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRarity, setFilterRarity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'animals' | 'plants' | 'others'>('animals');
  const [showSettings, setShowSettings] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

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

  // Update edited name when user name changes
  useEffect(() => {
    setEditedName(user.name);
  }, [user.name]);

  const handleProfilePictureChange = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      updateUserProfile({ profilePicture: result.assets[0].uri });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

  const filteredDiscoveries = discoveries.filter(discovery => {
    const matchesSearch = discovery.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRarity = filterRarity ? discovery.rarity === filterRarity : true;
    const matchesTab = activeTab === 'animals'; // For now, only show animals
    return matchesSearch && matchesRarity && matchesTab;
  });

  const rarityOptions = ['common', 'uncommon', 'rare', 'legendary'];

  const handleDiscoveryPress = (id: string) => {
    router.push(`/identification/${id}`);
  };

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
          >
            <Camera color="#fff" size={16} />
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
                <Medal color="#fff" size={24} />
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
          <Text style={styles.sectionTitle}>Your Collection ({discoveries.length})</Text>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
            testID="filter-button"
          >
            <Filter color="#2E7D32" size={20} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.tabsContainer}>
          {(['animals', 'plants', 'others'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.activeTabButton
              ]}
              onPress={() => setActiveTab(tab)}
              testID={`tab-${tab}`}
            >
              <Text style={[
                styles.tabButtonText,
                activeTab === tab && styles.activeTabButtonText
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        

        
        {filteredDiscoveries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Filter color="#8D6E63" size={60} />
            <Text style={styles.emptyTitle}>No animals found</Text>
            <Text style={styles.emptyText}>
              {discoveries.length === 0 
                ? "Start capturing animals to build your collection!" 
                : "Try adjusting your search or filters"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredDiscoveries}
            keyExtractor={item => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.collectionGrid}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.collectionCard}
                onPress={() => handleDiscoveryPress(item.id)}
                testID={`animal-card-${item.id}`}
              >
                <Image source={{ uri: item.imageUri }} style={styles.collectionCardImage} />
                <View style={[styles.collectionRarityBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
                  <Text style={styles.collectionRarityText}>{getRarityLabel(item.rarity)}</Text>
                </View>
                <View style={styles.collectionCardContent}>
                  <Text style={styles.collectionCardTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.collectionCardDate}>{new Date(item.discoveredAt).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
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
                <X color="#424242" size={24} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.settingsMenuItem} onPress={handleLogout}>
              <LogOut color="#8D6E63" size={20} />
              <Text style={styles.settingsMenuText}>Log out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsMenuItem}>
              <Settings color="#8D6E63" size={20} />
              <Text style={styles.settingsMenuText}>Settings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsMenuItem} onPress={handleFeedback}>
              <MessageSquare color="#8D6E63" size={20} />
              <Text style={styles.settingsMenuText}>Feedback</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingsMenuItem} onPress={handleAbout}>
              <Info color="#8D6E63" size={20} />
              <Text style={styles.settingsMenuText}>About</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Search</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X color="#424242" size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search color="#8D6E63" size={20} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search animals..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  testID="search-input"
                />
              </View>
            </View>
            
            <View style={styles.filtersContainer}>
              <Text style={styles.filtersLabel}>Filter by rarity:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rarityFilters}
              >
                <TouchableOpacity
                  style={[
                    styles.rarityFilter,
                    filterRarity === null && styles.activeFilter
                  ]}
                  onPress={() => setFilterRarity(null)}
                  testID="filter-all"
                >
                  <Text style={styles.rarityFilterText}>All</Text>
                </TouchableOpacity>
                
                {rarityOptions.map(rarity => (
                  <TouchableOpacity
                    key={rarity}
                    style={[
                      styles.rarityFilter,
                      { borderColor: getRarityColor(rarity) },
                      filterRarity === rarity && styles.activeFilter,
                      filterRarity === rarity && { backgroundColor: getRarityColor(rarity) + '20' }
                    ]}
                    onPress={() => setFilterRarity(rarity)}
                    testID={`filter-${rarity}`}
                  >
                    <Text 
                      style={[
                        styles.rarityFilterText, 
                        { color: filterRarity === rarity ? '#424242' : getRarityColor(rarity) }
                      ]}
                    >
                      {getRarityLabel(rarity)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
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
});
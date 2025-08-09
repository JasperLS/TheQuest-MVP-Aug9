import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Search, X, Users, Compass, UserPlus, UserCheck } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { useRouter } from 'expo-router';
import { getRarityColor, getRarityLabel } from '@/utils/rarityUtils';
import { User, Discovery } from '@/types/app';

type SearchTab = 'all' | 'discoveries' | 'people';

export default function SearchScreen() {
  const { discoveries, friends, toggleFollowUser } = useAppContext();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');

  const filteredDiscoveries = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return discoveries.filter(discovery => 
      discovery.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      discovery.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [discoveries, searchQuery]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    return friends.filter(friend => 
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (friend.bio && friend.bio.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [friends, searchQuery]);

  const handleDiscoveryPress = (id: string) => {
    router.push(`/identification/${id}`);
  };

  const handleFollowPress = (userId: string) => {
    toggleFollowUser(userId);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const renderSearchTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
        onPress={() => setActiveTab('all')}
        testID="tab-all"
      >
        <Compass size={16} color={activeTab === 'all' ? '#8D6E63' : '#999'} />
        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'discoveries' && styles.activeTab]}
        onPress={() => setActiveTab('discoveries')}
        testID="tab-discoveries"
      >
        <Search size={16} color={activeTab === 'discoveries' ? '#8D6E63' : '#999'} />
        <Text style={[styles.tabText, activeTab === 'discoveries' && styles.activeTabText]}>Discoveries</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'people' && styles.activeTab]}
        onPress={() => setActiveTab('people')}
        testID="tab-people"
      >
        <Users size={16} color={activeTab === 'people' ? '#8D6E63' : '#999'} />
        <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>People</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDiscoveryItem = ({ item }: { item: Discovery }) => (
    <TouchableOpacity 
      style={styles.discoveryCard}
      onPress={() => handleDiscoveryPress(item.id)}
      testID={`discovery-${item.id}`}
    >
      <Image source={{ uri: item.imageUri }} style={styles.discoveryImage} />
      <View style={styles.discoveryContent}>
        <Text style={styles.discoveryTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.discoveryScientific} numberOfLines={1}>{item.scientificName}</Text>
        <View style={styles.discoveryMeta}>
          <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
            <Text style={styles.rarityText}>{getRarityLabel(item.rarity)}</Text>
          </View>
          <Text style={styles.discoveryDate}>
            {new Date(item.discoveredAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPersonItem = ({ item }: { item: User }) => (
    <View style={styles.personCard} testID={`person-${item.id}`}>
      <Image source={{ uri: item.profilePicture }} style={styles.personAvatar} />
      <View style={styles.personContent}>
        <View style={styles.personInfo}>
          <Text style={styles.personName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.personUsername} numberOfLines={1}>@{item.username}</Text>
          {item.bio && (
            <Text style={styles.personBio} numberOfLines={2}>{item.bio}</Text>
          )}
          <View style={styles.personStats}>
            <Text style={styles.personStat}>{item.followers} followers</Text>
            <Text style={styles.personStat}>Level {item.level}</Text>
            <Text style={styles.personRank}>{item.rank}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.followButton, item.isFollowing && styles.followingButton]}
          onPress={() => handleFollowPress(item.id)}
          testID={`follow-${item.id}`}
        >
          {item.isFollowing ? (
            <UserCheck size={16} color="#8D6E63" />
          ) : (
            <UserPlus size={16} color="#fff" />
          )}
          <Text style={[styles.followButtonText, item.isFollowing && styles.followingButtonText]}>
            {item.isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if (!searchQuery.trim()) {
      if (activeTab === 'people') {
        return (
          <FlatList
            data={friends}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
            renderItem={renderPersonItem}
          />
        );
      }
      
      return (
        <View style={styles.emptyContainer}>
          <Search color="#8D6E63" size={60} />
          <Text style={styles.emptyTitle}>Search & Discover</Text>
          <Text style={styles.emptyText}>
            Find your discoveries, explore new animals, or connect with fellow wildlife enthusiasts
          </Text>
        </View>
      );
    }

    const hasDiscoveries = filteredDiscoveries.length > 0;
    const hasPeople = filteredFriends.length > 0;

    if (!hasDiscoveries && !hasPeople) {
      return (
        <View style={styles.emptyContainer}>
          <Search color="#8D6E63" size={60} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>
            Try different keywords or explore other categories
          </Text>
        </View>
      );
    }

    if (activeTab === 'discoveries') {
      return (
        <FlatList
          data={filteredDiscoveries}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
          renderItem={renderDiscoveryItem}
        />
      );
    }

    if (activeTab === 'people') {
      return (
        <FlatList
          data={filteredFriends}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
          renderItem={renderPersonItem}
        />
      );
    }

    // All tab - show both discoveries and people
    return (
      <ScrollView style={styles.allResultsContainer} showsVerticalScrollIndicator={false}>
        {hasDiscoveries && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Discoveries ({filteredDiscoveries.length})</Text>
            {filteredDiscoveries.slice(0, 3).map(item => (
              <View key={item.id}>
                {renderDiscoveryItem({ item })}
              </View>
            ))}
            {filteredDiscoveries.length > 3 && (
              <TouchableOpacity 
                style={styles.seeMoreButton}
                onPress={() => setActiveTab('discoveries')}
              >
                <Text style={styles.seeMoreText}>See all {filteredDiscoveries.length} discoveries</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {hasPeople && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>People ({filteredFriends.length})</Text>
            {filteredFriends.slice(0, 3).map(item => (
              <View key={item.id}>
                {renderPersonItem({ item })}
              </View>
            ))}
            {filteredFriends.length > 3 && (
              <TouchableOpacity 
                style={styles.seeMoreButton}
                onPress={() => setActiveTab('people')}
              >
                <Text style={styles.seeMoreText}>See all {filteredFriends.length} people</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color="#8D6E63" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search discoveries, people..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <X color="#8D6E63" size={20} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderSearchTabs()}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDE7',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#424242',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#8D6E63',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#8D6E63',
  },
  resultsList: {
    padding: 16,
  },
  allResultsContainer: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  seeMoreButton: {
    marginHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  seeMoreText: {
    fontSize: 14,
    color: '#8D6E63',
    fontWeight: '500',
  },
  discoveryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  discoveryImage: {
    width: 80,
    height: 80,
    resizeMode: 'cover',
  },
  discoveryContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  discoveryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 4,
  },
  discoveryScientific: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#8D6E63',
    marginBottom: 8,
  },
  discoveryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  discoveryDate: {
    fontSize: 12,
    color: '#8D6E63',
  },
  personCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  personAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  personContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 2,
  },
  personUsername: {
    fontSize: 14,
    color: '#8D6E63',
    marginBottom: 4,
  },
  personBio: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  personStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personStat: {
    fontSize: 12,
    color: '#8D6E63',
    marginRight: 12,
  },
  personRank: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '500',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8D6E63',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  followingButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#8D6E63',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  followingButtonText: {
    color: '#8D6E63',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#424242',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8D6E63',
    textAlign: 'center',
    lineHeight: 24,
  },
});
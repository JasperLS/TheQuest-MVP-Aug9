import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Filter } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { TextInput } from 'react-native-gesture-handler';
import { getRarityColor, getRarityLabel } from '@/utils/rarityUtils';

export default function CollectionScreen() {
  const { discoveries } = useAppContext();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRarity, setFilterRarity] = useState<string | null>(null);

  const filteredDiscoveries = discoveries.filter(discovery => {
    const matchesSearch = discovery.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRarity = filterRarity ? discovery.rarity === filterRarity : true;
    return matchesSearch && matchesRarity;
  });

  const rarityOptions = ['common', 'uncommon', 'rare', 'legendary'];

  const handleDiscoveryPress = (id: string) => {
    router.push(`/identification/${id}`);
  };

  return (
    <View style={styles.container}>
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
        <View style={styles.rarityFilters}>
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
        </View>
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
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => handleDiscoveryPress(item.id)}
              testID={`animal-card-${item.id}`}
            >
              <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
              <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(item.rarity) }]}>
                <Text style={styles.rarityText}>{getRarityLabel(item.rarity)}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardDate}>{new Date(item.discoveredAt).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
    backgroundColor: '#2E7D32',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    padding: 16,
    backgroundColor: '#FFFDE7',
  },
  filtersLabel: {
    fontSize: 14,
    color: '#8D6E63',
    marginBottom: 8,
  },
  rarityFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rarityFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8D6E63',
  },
  activeFilter: {
    backgroundColor: '#8D6E6320',
  },
  rarityFilterText: {
    fontSize: 12,
    color: '#8D6E63',
  },
  listContent: {
    padding: 8,
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  cardImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  cardDate: {
    fontSize: 12,
    color: '#8D6E63',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#424242',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 8,
  },
});
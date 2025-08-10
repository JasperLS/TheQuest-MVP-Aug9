import createContextHook from '@nkzw/create-context-hook';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAnimalData } from '@/utils/animalGenerator';
import { Animal, Discovery, Achievement, User, Badge } from '@/types/app';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { getUserProfile, updateProfile, updateProfileImageUrl } from '@/utils/profileUtils';
import { createPost } from '@/utils/postsUtils';

// Result returned by Supabase Edge Function identify-species
export type EdgeIdentificationResult = {
  post_id: string;
  image_url: string;
  animal_id: string;
  identified: {
    species: string;
    rarity: number | string;
    quality: number | string;
    kingdom?: string;
    class?: string;
    common_names?: string[];
    fun_facts?: string[];
  };
};

// Initial user data
const initialUser: User = {
  id: 'user-1',
  name: 'Wildlife Explorer',
  username: 'wildlife_explorer',
  profilePicture: 'https://images.unsplash.com/photo-1535083783855-76ae62b2914e?q=80&w=200&auto=format&fit=crop',
  points: 0,
  level: 1,
  rank: 'Beginner',
  badges: [],
  followers: 0,
  following: 0,
  bio: 'Passionate about wildlife discovery and conservation',
};

// Mock friends data
const mockFriends: User[] = [
  {
    id: 'user-2',
    name: 'Sarah Johnson',
    username: 'sarah_wildlife',
    profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=200&auto=format&fit=crop',
    points: 850,
    level: 9,
    rank: 'Advanced',
    badges: [],
    isFollowing: true,
    followers: 234,
    following: 189,
    bio: 'Marine biologist exploring ocean life',
  },
  {
    id: 'user-3',
    name: 'Mike Chen',
    username: 'nature_mike',
    profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    points: 1250,
    level: 13,
    rank: 'Expert',
    badges: [],
    isFollowing: false,
    followers: 567,
    following: 123,
    bio: 'Wildlife photographer and conservationist',
  },
  {
    id: 'user-4',
    name: 'Emma Davis',
    username: 'bird_watcher_em',
    profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
    points: 650,
    level: 7,
    rank: 'Intermediate',
    badges: [],
    isFollowing: true,
    followers: 145,
    following: 298,
    bio: 'Avian enthusiast and bird migration researcher',
  },
  {
    id: 'user-5',
    name: 'Alex Rodriguez',
    username: 'jungle_alex',
    profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop',
    points: 420,
    level: 5,
    rank: 'Intermediate',
    badges: [],
    isFollowing: false,
    followers: 89,
    following: 156,
    bio: 'Rainforest explorer and primate specialist',
  },
  {
    id: 'user-6',
    name: 'Lisa Park',
    username: 'lisa_naturalist',
    profilePicture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    points: 980,
    level: 10,
    rank: 'Advanced',
    badges: [],
    isFollowing: true,
    followers: 312,
    following: 201,
    bio: 'Field naturalist and ecosystem researcher',
  },
];

// Initial achievements
const initialAchievements: Achievement[] = [
  {
    id: 'first-discovery',
    title: 'First Discovery',
    description: 'Identify your first animal',
    unlocked: false,
    rewardPoints: 50,
    rewardClaimed: false,
  },
  {
    id: 'rare-finder',
    title: 'Rare Finder',
    description: 'Discover your first rare animal',
    unlocked: false,
    rewardPoints: 100,
    rewardClaimed: false,
  },
  {
    id: 'collection-starter',
    title: 'Collection Starter',
    description: 'Discover 5 different animals',
    unlocked: false,
    rewardPoints: 150,
    rewardClaimed: false,
    progress: 0,
  },
  {
    id: 'wildlife-enthusiast',
    title: 'Wildlife Enthusiast',
    description: 'Discover 10 different animals',
    unlocked: false,
    rewardPoints: 300,
    rewardClaimed: false,
    progress: 0,
  },
  {
    id: 'legendary-hunter',
    title: 'Legendary Hunter',
    description: 'Discover a legendary animal',
    unlocked: false,
    rewardPoints: 500,
    rewardClaimed: false,
  },
];

export const [AppContext, useAppContext] = createContextHook(() => {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const [user, setUser] = useState<User>(initialUser);
  const [friends, setFriends] = useState<User[]>(mockFriends);
  const [isLoading, setIsLoading] = useState(true);
  const [lastIdentificationResult, setLastIdentificationResult] = useState<EdgeIdentificationResult | null>(null);



  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedDiscoveries = await AsyncStorage.getItem('discoveries');
        const storedAchievements = await AsyncStorage.getItem('achievements');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedDiscoveries) {
          setDiscoveries(JSON.parse(storedDiscoveries));
        }
        if (storedAchievements) {
          setAchievements(JSON.parse(storedAchievements));
        }
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // If this is a real user (not the default), sync with Supabase
          if (parsedUser.id !== 'user-1') {
            syncUserProfileWithSupabase(parsedUser.id);
          }
        }
      } catch (error) {
        console.error('Error loading data from AsyncStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save data to AsyncStorage whenever it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem('discoveries', JSON.stringify(discoveries));
        await AsyncStorage.setItem('achievements', JSON.stringify(achievements));
        await AsyncStorage.setItem('user', JSON.stringify(user));
      } catch (error) {
        console.error('Error saving data to AsyncStorage:', error);
      }
    };

    if (!isLoading) {
      saveData();
    }
  }, [discoveries, achievements, user, isLoading]);

  // Check achievements whenever discoveries change
  useEffect(() => {
    if (isLoading) return;

    const updatedAchievements = [...achievements];
    let pointsToAdd = 0;
    let shouldUpdateBadges = false;

    // First Discovery
    if (discoveries.length > 0 && !achievements[0].unlocked) {
      updatedAchievements[0].unlocked = true;
      pointsToAdd += updatedAchievements[0].rewardPoints;
      shouldUpdateBadges = true;
    }

    // Rare Finder
    if (discoveries.some(d => d.rarity === 'rare') && !achievements[1].unlocked) {
      updatedAchievements[1].unlocked = true;
      pointsToAdd += updatedAchievements[1].rewardPoints;
      shouldUpdateBadges = true;
    }

    // Collection Starter
    const uniqueAnimals = new Set(discoveries.map(d => d.name)).size;
    const collectionStarterProgress = Math.min(100, (uniqueAnimals / 5) * 100);
    updatedAchievements[2].progress = collectionStarterProgress;
    
    if (uniqueAnimals >= 5 && !achievements[2].unlocked) {
      updatedAchievements[2].unlocked = true;
      pointsToAdd += updatedAchievements[2].rewardPoints;
      shouldUpdateBadges = true;
    }

    // Wildlife Enthusiast
    const wildlifeEnthusiastProgress = Math.min(100, (uniqueAnimals / 10) * 100);
    updatedAchievements[3].progress = wildlifeEnthusiastProgress;
    
    if (uniqueAnimals >= 10 && !achievements[3].unlocked) {
      updatedAchievements[3].unlocked = true;
      pointsToAdd += updatedAchievements[3].rewardPoints;
      shouldUpdateBadges = true;
    }

    // Legendary Hunter
    if (discoveries.some(d => d.rarity === 'legendary') && !achievements[4].unlocked) {
      updatedAchievements[4].unlocked = true;
      pointsToAdd += updatedAchievements[4].rewardPoints;
      shouldUpdateBadges = true;
    }

    // Update achievements if changed
    if (JSON.stringify(updatedAchievements) !== JSON.stringify(achievements)) {
      setAchievements(updatedAchievements);
    }

    // Update user points and level if needed
    if (pointsToAdd > 0) {
      setUser(prev => {
        const newPoints = prev.points + pointsToAdd;
        const newLevel = Math.floor(newPoints / 100) + 1;
        
        let newRank = 'Beginner';
        if (newPoints >= 1000) newRank = 'Expert';
        else if (newPoints >= 500) newRank = 'Advanced';
        else if (newPoints >= 200) newRank = 'Intermediate';
        
        return {
          ...prev,
          points: newPoints,
          level: newLevel,
          rank: newRank,
        };
      });
    }

    // Update badges if needed
    if (shouldUpdateBadges) {
      const newBadges: Badge[] = [];
      
      if (updatedAchievements[0]?.unlocked) {
        newBadges.push({
          title: 'First Discovery',
          color: '#8D6E63',
        });
      }
      
      if (updatedAchievements[1]?.unlocked) {
        newBadges.push({
          title: 'Rare Finder',
          color: '#5C6BC0',
        });
      }
      
      if (updatedAchievements[2]?.unlocked) {
        newBadges.push({
          title: 'Collection Starter',
          color: '#26A69A',
        });
      }
      
      if (updatedAchievements[3]?.unlocked) {
        newBadges.push({
          title: 'Wildlife Enthusiast',
          color: '#FFA000',
        });
      }
      
      if (updatedAchievements[4]?.unlocked) {
        newBadges.push({
          title: 'Legendary Hunter',
          color: '#D81B60',
        });
      }
      
      setUser(prev => ({
        ...prev,
        badges: newBadges,
      }));
    }
  }, [discoveries, achievements, isLoading]);

  // Identify animal using AI (simulated for now)
  const identifyAnimal = async (imageUri: string): Promise<string> => {
    try {
      console.log('Identifying animal from image:', imageUri);
      
      // In a real app, this would call an AI service
      // For now, we'll generate random animal data
      const animalData = generateAnimalData();
      
      // Create a new discovery
      const discovery: Discovery = {
        id: Date.now().toString(),
        imageUri,
        name: animalData.name,
        scientificName: animalData.scientificName,
        description: animalData.description,
        category: animalData.category,
        habitat: animalData.habitat,
        rarity: animalData.rarity,
        funFacts: animalData.funFacts,
        points: calculatePoints(animalData.rarity),
        discoveredAt: new Date().toISOString(),
        isFavorite: false,
      };
      
      // Add to discoveries
      setDiscoveries(prev => [discovery, ...prev]);
      
      // Add points to user
      setUser(prev => {
        const newPoints = prev.points + discovery.points;
        const newLevel = Math.floor(newPoints / 100) + 1;
        
        let newRank = 'Beginner';
        if (newPoints >= 1000) newRank = 'Expert';
        else if (newPoints >= 500) newRank = 'Advanced';
        else if (newPoints >= 200) newRank = 'Intermediate';
        
        return {
          ...prev,
          points: newPoints,
          level: newLevel,
          rank: newRank,
        };
      });
      
      return discovery.id;
    } catch (error) {
      console.error('Error identifying animal:', error);
      throw error;
    }
  };

  function edgeRarityToLabel(rarity: number | string | undefined): 'common' | 'uncommon' | 'rare' | 'legendary' {
    if (typeof rarity === 'string') {
      const r = rarity.toLowerCase();
      if (r === 'common' || r === 'uncommon' || r === 'rare' || r === 'legendary') return r;
      // best-effort mapping from text
      if (r.includes('legend')) return 'legendary';
      if (r.includes('rare')) return 'rare';
      if (r.includes('uncommon') || r.includes('un-usual')) return 'uncommon';
      return 'common';
    }
    // numeric mapping fallback
    const n = Number(rarity ?? 1);
    if (n >= 4) return 'legendary';
    if (n >= 3) return 'rare';
    if (n >= 2) return 'uncommon';
    return 'common';
  }

  // Add a discovery from an Edge Function result into local profile
  const addDiscoveryFromEdgeResult = async (result: EdgeIdentificationResult) => {
    try {
      console.log('addDiscoveryFromEdgeResult called with:', {
        post_id: result.post_id,
        animal_id: result.animal_id,
        image_url: result.image_url
      });

      const rarityLabel = edgeRarityToLabel(result?.identified?.rarity);
      const funFacts = Array.isArray(result?.identified?.fun_facts) ? result.identified.fun_facts : [];

      const discovery: Discovery = {
        id: result.post_id || result.animal_id || Date.now().toString(),
        imageUri: result.image_url,
        name: result.identified?.species || 'Unknown species',
        scientificName: result.identified?.species || 'Unknown',
        description: funFacts.length > 0 ? funFacts.join(' ') : 'Identified via AI',
        category: result.identified?.class || 'Unknown',
        habitat: result.identified?.kingdom || 'Unknown habitat',
        rarity: rarityLabel,
        funFacts,
        points: calculatePoints(rarityLabel),
        discoveredAt: new Date().toISOString(),
        isFavorite: false,
      };

      setDiscoveries(prev => [discovery, ...prev]);

      // Add points to user similar to mock flow
      setUser(prev => {
        const newPoints = prev.points + discovery.points;
        const newLevel = Math.floor(newPoints / 100) + 1;
        let newRank = 'Beginner';
        if (newPoints >= 1000) newRank = 'Expert';
        else if (newPoints >= 500) newRank = 'Advanced';
        else if (newPoints >= 200) newRank = 'Intermediate';
        return { ...prev, points: newPoints, level: newLevel, rank: newRank };
      });

      // Create post in database if user is authenticated
      if (user.id !== 'user-1' && user.id) {
        console.log('Creating database post for user:', user.id);
        try {
          const quality = typeof result.identified.quality === 'number' 
            ? result.identified.quality 
            : parseInt(result.identified.quality as string, 10) || 5;

          const { post, error } = await createPost({
            user_id: user.id,
            animal_id: result.animal_id || null,
            image_url: result.image_url,
            location: null, // TODO: Add location support
            quality: Math.max(1, Math.min(10, quality)), // Ensure quality is between 1-10
            caption: null, // TODO: Add caption support
          });

          if (error) {
            console.error('Failed to create post in database:', error);
          } else {
            console.log('Post created successfully in database:', post?.id);
          }
        } catch (dbError) {
          console.error('Error creating post in database:', dbError);
        }
      } else {
        console.log('Skipping database post creation - user not authenticated or is mock user');
      }
    } catch (error) {
      console.error('Failed to add discovery from edge result:', error);
    }
  };

  // Calculate points based on rarity
  const calculatePoints = (rarity: string): number => {
    switch (rarity) {
      case 'common': return 10;
      case 'uncommon': return 25;
      case 'rare': return 50;
      case 'legendary': return 100;
      default: return 5;
    }
  };



  // Add discovery to favorites
  const addToFavorites = (discoveryId: string) => {
    setDiscoveries(prev => 
      prev.map(discovery => 
        discovery.id === discoveryId 
          ? { ...discovery, isFavorite: !discovery.isFavorite } 
          : discovery
      )
    );
  };

  // Claim achievement reward
  const claimAchievementReward = (achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement || !achievement.unlocked || achievement.rewardClaimed) return;
    
    // Mark as claimed
    setAchievements(prev => 
      prev.map(a => 
        a.id === achievementId 
          ? { ...a, rewardClaimed: true } 
          : a
      )
    );
    
    // Add points to user
    setUser(prev => {
      const newPoints = prev.points + achievement.rewardPoints;
      const newLevel = Math.floor(newPoints / 100) + 1;
      
      let newRank = 'Beginner';
      if (newPoints >= 1000) newRank = 'Expert';
      else if (newPoints >= 500) newRank = 'Advanced';
      else if (newPoints >= 200) newRank = 'Intermediate';
      
      return {
        ...prev,
        points: newPoints,
        level: newLevel,
        rank: newRank,
      };
    });
  };

  // Sync user profile with Supabase
  const syncUserProfileWithSupabase = async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      if (profile) { // Check for profile existence
        setUser(prev => ({
          ...prev,
          name: profile.display_name || prev.name, // Use prev.name as fallback
          username: profile.username || prev.username, // Use prev.username as fallback
          points: profile.points || prev.points, // Use prev.points as fallback
          bio: profile.bio || prev.bio,
          profilePicture: profile.profile_image_url || prev.profilePicture, // Sync profile image
        }));
      }
    } catch (error) {
      console.error('Error syncing profile with Supabase:', error);
    }
  };

  // Update user profile (both local and Supabase)
  const updateUserProfile = async (updates: Partial<User>) => {
    // Update local state immediately
    setUser(prev => ({
      ...prev,
      ...updates,
    }));

    // If we have a user ID and are updating the name, sync with Supabase
    if (updates.name && user.id !== 'user-1') {
      try {
        const result = await updateProfile(user.id, { display_name: updates.name });
        if (!result.success) {
          console.error('Failed to update profile in Supabase:', result.error);
          // Optionally revert local state if Supabase update fails
          // setUser(prev => ({ ...prev, name: prev.name }));
        }
      } catch (error) {
        console.error('Error updating profile in Supabase:', error);
      }
    }

    // If we have a user ID and are updating the profile picture, sync with Supabase
    if (updates.profilePicture && user.id !== 'user-1') {
      try {
        const result = await updateProfileImageUrl(user.id, updates.profilePicture);
        if (!result.success) {
          console.error('Failed to update profile image URL in Supabase:', result.error);
          // Optionally revert local state if Supabase update fails
          // setUser(prev => ({ ...prev, profilePicture: prev.profilePicture }));
        }
      } catch (error) {
        console.error('Error updating profile image URL in Supabase:', error);
      }
    }
  };

  // Follow/unfollow user
  const toggleFollowUser = (userId: string) => {
    setFriends(prev => 
      prev.map(friend => 
        friend.id === userId 
          ? { ...friend, isFollowing: !friend.isFollowing } 
          : friend
      )
    );
  };

  // Reset all app data
  const resetAppData = () => {
    setDiscoveries([]);
    setAchievements(initialAchievements);
    setUser(initialUser);
    setFriends(mockFriends);
  };

  return {
    discoveries,
    achievements,
    user,
    friends,
    isLoading,
    lastIdentificationResult,
    setLastIdentificationResult,
    addDiscoveryFromEdgeResult,
    identifyAnimal,
    addToFavorites,
    claimAchievementReward,
    updateUserProfile,
    syncUserProfileWithSupabase,
    toggleFollowUser,
    resetAppData,
  };
});
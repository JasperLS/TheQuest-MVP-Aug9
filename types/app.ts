export interface Animal {
  name: string;
  scientificName: string;
  description: string;
  category: string;
  habitat: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  funFacts: string[];
}

export interface Discovery extends Animal {
  id: string;
  imageUri: string;
  points: number;
  discoveredAt: string;
  isFavorite: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  rewardPoints: number;
  rewardClaimed: boolean;
  progress?: number;
}

export interface Badge {
  title: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  profilePicture: string;
  points: number;
  level: number;
  rank: string;
  badges: Badge[];
  isFollowing?: boolean;
  followers?: number;
  following?: number;
  bio?: string;
}
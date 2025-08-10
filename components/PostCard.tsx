import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Trash2, MapPin, Calendar, Star } from 'lucide-react-native';
import { Post } from '@/utils/postsUtils';
import { getRarityColor, getRarityLabel } from '@/utils/rarityUtils';

interface PostCardProps {
  post: Post;
  onPress: () => void;
  onDelete?: () => void;
  showDeleteButton?: boolean;
  variant?: 'compact' | 'full';
}

export default function PostCard({ 
  post, 
  onPress, 
  onDelete, 
  showDeleteButton = false,
  variant = 'full'
}: PostCardProps) {
  const handleDelete = (e: any) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  const getRarityFromLevel = (level: number): string => {
    if (level >= 8) return 'legendary';
    if (level >= 6) return 'rare';
    if (level >= 4) return 'uncommon';
    return 'common';
  };

  return (
    <TouchableOpacity 
      style={[styles.postCard, variant === 'compact' && styles.postCardCompact]} 
      onPress={onPress}
      activeOpacity={0.95}
    >
      <Image source={{ uri: post.image_url }} style={styles.postCardImage} />
      
      {/* Rarity Badge */}
      {post.animal?.rarity_level && (
        <View style={[
          styles.rarityBadge, 
          { backgroundColor: getRarityColor(getRarityFromLevel(post.animal.rarity_level)) }
        ]}>
          <Text style={styles.rarityText}>
            {getRarityLabel(getRarityFromLevel(post.animal.rarity_level))}
          </Text>
        </View>
      )}

      <View style={styles.postCardContent}>
        {/* Header with title and delete button */}
        <View style={styles.postCardHeader}>
          <Text style={styles.postCardTitle} numberOfLines={2}>
            {post.caption || (post.animal?.common_names?.[0] || post.animal?.species || 'Wildlife Discovery')}
          </Text>
          {showDeleteButton && onDelete && (
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDelete}
              testID={`delete-post-${post.id}`}
            >
              <Trash2 color="#F44336" size={16} />
            </TouchableOpacity>
          )}
        </View>

        {/* Meta information */}
        <View style={styles.postCardMeta}>
          <View style={styles.metaItem}>
            <Calendar color="#8D6E63" size={14} />
            <Text style={styles.metaText}>
              {new Date(post.created_at).toLocaleDateString()}
            </Text>
          </View>
          {post.location && (
            <View style={styles.metaItem}>
              <MapPin color="#8D6E63" size={14} />
              <Text style={styles.metaText} numberOfLines={1}>
                {post.location}
              </Text>
            </View>
          )}
        </View>

        {/* Stats and species info */}
        <View style={styles.postCardStats}>
          <View style={styles.statsRow}>
            <View style={styles.qualityContainer}>
              <Star color="#2E7D32" size={14} />
              <Text style={styles.qualityText}>
                Quality: {post.quality}/10
              </Text>
            </View>
            {post.animal?.rarity_level && (
              <View style={styles.rarityContainer}>
                <View style={[
                  styles.rarityIndicator, 
                  { backgroundColor: getRarityColor(getRarityFromLevel(post.animal.rarity_level)) }
                ]} />
                <Text style={styles.rarityTextInline}>
                  {getRarityLabel(getRarityFromLevel(post.animal.rarity_level))}
                </Text>
              </View>
            )}
          </View>
          {post.animal && (
            <Text style={styles.speciesText} numberOfLines={1}>
              {post.animal.common_names?.[0] ? 
                `Scientific name: ${post.animal.species}` : 
                post.animal.species
              }
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  postCardCompact: {
    marginBottom: 12,
  },
  postCardImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  rarityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  postCardContent: {
    padding: 16,
  },
  postCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  deleteButton: {
    padding: 4,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  postCardMeta: {
    marginBottom: 12,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#8D6E63',
  },
  postCardStats: {
    marginBottom: 16,
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qualityText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  rarityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rarityIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rarityTextInline: {
    fontSize: 12,
    color: '#8D6E63',
  },
  speciesText: {
    fontSize: 12,
    color: '#8D6E63',
    fontStyle: 'italic',
  },
});

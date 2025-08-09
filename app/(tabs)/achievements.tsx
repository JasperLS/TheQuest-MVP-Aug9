import React from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Platform } from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, Check, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function AchievementsScreen() {
  const { discoveries, achievements, claimAchievementReward } = useAppContext();
  
  const handleClaimReward = (achievementId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    claimAchievementReward(achievementId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={['#2E7D32', '#1B5E20']}
          style={styles.statsGradient}
        >
          <Text style={styles.statsTitle}>Your Wildlife Journey</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{discoveries.length}</Text>
              <Text style={styles.statLabel}>Animals Discovered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {achievements.filter(a => a.unlocked).length}/{achievements.length}
              </Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {discoveries.filter(d => d.rarity === 'rare' || d.rarity === 'legendary').length}
              </Text>
              <Text style={styles.statLabel}>Rare Finds</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <FlatList
        data={achievements}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[
            styles.achievementCard,
            !item.unlocked && styles.lockedAchievement
          ]}>
            <View style={styles.achievementIcon}>
              {item.unlocked ? (
                <Award color="#FF9800" size={24} />
              ) : (
                <Lock color="#8D6E63" size={24} />
              )}
            </View>
            <View style={styles.achievementContent}>
              <Text style={[
                styles.achievementTitle,
                !item.unlocked && styles.lockedText
              ]}>
                {item.title}
              </Text>
              <Text style={[
                styles.achievementDescription,
                !item.unlocked && styles.lockedText
              ]}>
                {item.description}
              </Text>
              {item.progress !== undefined && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(100, item.progress)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {item.progress}%
                  </Text>
                </View>
              )}
            </View>
            {item.unlocked && !item.rewardClaimed && (
              <TouchableOpacity 
                style={styles.claimButton}
                onPress={() => handleClaimReward(item.id)}
                testID={`claim-achievement-${item.id}`}
              >
                <Text style={styles.claimButtonText}>Claim</Text>
              </TouchableOpacity>
            )}
            {item.unlocked && item.rewardClaimed && (
              <View style={styles.claimedBadge}>
                <Check color="#2E7D32" size={16} />
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDE7',
  },
  statsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statsGradient: {
    padding: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  listContent: {
    padding: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  lockedAchievement: {
    backgroundColor: '#f5f5f5',
    opacity: 0.8,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#8D6E63',
    marginTop: 4,
  },
  lockedText: {
    color: '#9E9E9E',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
  },
  progressText: {
    fontSize: 12,
    color: '#8D6E63',
    width: 40,
    textAlign: 'right',
  },
  claimButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  claimedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
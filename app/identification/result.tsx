import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { MapPin, Save } from 'lucide-react-native';

export default function IdentificationResultScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const router = useRouter();
  const { lastIdentificationResult, addDiscoveryFromEdgeResult } = useAppContext();

  if (!lastIdentificationResult) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No result to display.</Text>
        <TouchableOpacity style={styles.primary} onPress={() => router.replace('/')}> 
          <Text style={styles.primaryText}>Go to Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { image_url, identified } = lastIdentificationResult;

  const handleSave = () => {
    if (lastIdentificationResult) {
      addDiscoveryFromEdgeResult(lastIdentificationResult);
    }
    Alert.alert('Saved', 'Your discovery has been saved!', [
      { text: 'OK', onPress: () => router.replace('/') },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Image source={{ uri: image_url }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.title}>{identified.species}</Text>
        <Text style={styles.meta}>Rarity: {identified.rarity} • Quality: {identified.quality}</Text>

        {identified.common_names && identified.common_names.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Also known as</Text>
            <Text style={styles.sectionText}>{identified.common_names.join(', ')}</Text>
          </View>
        )}

        {identified.fun_facts && identified.fun_facts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fun Facts</Text>
            {identified.fun_facts.map((fact, idx) => (
              <Text key={idx} style={styles.listItem}>• {fact}</Text>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Where & When</Text>
          <View style={styles.mockMap}>
            <MapPin color="#2E7D32" size={24} />
            <Text style={styles.mapText}>Location captured near you</Text>
          </View>
          <Text style={styles.sectionText}>{new Date().toLocaleString()}</Text>
        </View>

        {source === 'camera' && (
          <TouchableOpacity style={[styles.primary, { marginTop: 12 }]} onPress={handleSave}>
            <Save color="#fff" size={18} />
            <Text style={styles.primaryText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDE7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDE7', padding: 24 },
  error: { color: '#8D6E63', fontSize: 16, marginBottom: 12 },
  image: { width: '100%', height: 280, backgroundColor: '#eee' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#424242', marginBottom: 4 },
  meta: { fontSize: 14, color: '#8D6E63', marginBottom: 12 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#424242', marginBottom: 6 },
  sectionText: { fontSize: 14, color: '#424242' },
  listItem: { fontSize: 14, color: '#424242', marginBottom: 4 },
  mockMap: { marginTop: 6, marginBottom: 6, padding: 16, alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 8 },
  mapText: { marginTop: 6, color: '#2E7D32', fontWeight: '600' },
  primary: { backgroundColor: '#2E7D32', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  primaryText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});



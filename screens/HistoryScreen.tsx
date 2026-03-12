import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSubnetStore } from '../store/useSubnetStore';

export default function HistoryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { recentCalculations, toggleFavorite, deleteHistoryItem, clearHistory, restoreCalculation } = useSubnetStore();
  const [filterFav, setFilterFav] = useState(false);

  const data = filterFav ? recentCalculations.filter(i => i.favorite) : recentCalculations;

  const handleRestore = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    restoreCalculation(item);
    navigation.navigate('Calculator');
  };

  const confirmClear = () => {
    Alert.alert('Clear History', 'Delete all un-starred history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearHistory();
      }}
    ]);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030810', '#06101f', '#040812']} style={StyleSheet.absoluteFillObject} />
      
      <View style={[s.header, { paddingTop: Math.max(insets.top + 8, 28) }]}>
        <View>
          <Text style={s.eyebrow}>AUDIT LOG</Text>
          <Text style={s.title}>Calculation History</Text>
        </View>
        <Pressable onPress={confirmClear} style={s.clearBtn}>
          <Ionicons name="trash-outline" size={18} color="#ff7b80" />
        </Pressable>
      </View>

      <View style={s.filterRow}>
        <Pressable onPress={() => { Haptics.selectionAsync(); setFilterFav(false); }} style={[s.filterTab, !filterFav && s.filterTabActive]}>
          <Text style={[s.filterText, !filterFav && s.filterTextActive]}>All Logs</Text>
        </Pressable>
        <Pressable onPress={() => { Haptics.selectionAsync(); setFilterFav(true); }} style={[s.filterTab, filterFav && s.filterTabActive]}>
          <Text style={[s.filterText, filterFav && s.filterTextActive]}>Starred</Text>
        </Pressable>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={<Text style={s.emptyText}>No history records found.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.badge}><Text style={s.badgeText}>{item.version.toUpperCase()}</Text></View>
              <Text style={s.timeAgo}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </View>
            
            <View style={s.ipRow}>
              <Text style={s.ipText}>{item.input}</Text>
              <Text style={s.scopeText}>{item.scope}</Text>
            </View>
            
            <View style={s.divider} />
            
            <View style={s.actionRow}>
              <Pressable onPress={() => { Haptics.selectionAsync(); toggleFavorite(item.id); }} style={s.iconBtn}>
                <Ionicons name={item.favorite ? "star" : "star-outline"} size={22} color={item.favorite ? "#fcc419" : "rgba(255,255,255,0.4)"} />
              </Pressable>
              
              <View style={s.rightActions}>
                <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); deleteHistoryItem(item.id); }} style={s.iconBtn}>
                  <Ionicons name="close-circle" size={22} color="rgba(255,123,128,0.5)" />
                </Pressable>
                
                <Pressable onPress={() => handleRestore(item)} style={s.restoreBtn}>
                  <Text style={s.restoreText}>Restore</Text>
                  <Ionicons name="arrow-forward" size={14} color="#020408" />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020408' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 16 },
  eyebrow: { color: 'rgba(90,200,250,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginBottom: 2 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  clearBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,123,128,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,123,128,0.2)' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  filterTabActive: { backgroundColor: 'rgba(90,200,250,0.15)', borderColor: 'rgba(90,200,250,0.3)' },
  filterText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800' },
  filterTextActive: { color: '#5ac8fa' },
  listContent: { paddingHorizontal: 20, gap: 12 },
  emptyText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: 'rgba(10,25,60,0.25)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  timeAgo: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '600' },
  ipRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  ipText: { color: '#fff', fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  scopeText: { color: '#5ac8fa', fontSize: 12, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 14 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#5ac8fa', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 6 },
  restoreText: { color: '#020408', fontSize: 13, fontWeight: '800' },
});
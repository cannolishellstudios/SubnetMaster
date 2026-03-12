import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Alert, DeviceEventEmitter } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useSubnetStore, type RecentCalculation } from '../store/useSubnetStore';
import { useNavigation } from '@react-navigation/native';

/* ── History Item ── */
function HistoryItem({ item, onRestore, onToggleFavorite, onDelete }: {
  item: RecentCalculation; onRestore: () => void; onToggleFavorite: () => void; onDelete: () => void;
}) {
  const date = new Date(item.createdAt);
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isIPv6 = item.version === 'ipv6';
  const accent = isIPv6 ? '#8B7CFF' : '#5ac8fa';

  const handleCopy = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Clipboard.setStringAsync(item.input); };

  return (
    <View style={[hi.card, item.favorite && { borderColor: 'rgba(252,196,25,0.15)' }]}>
      <Pressable onPress={onRestore} style={hi.mainArea}>
        <View style={hi.left}>
          <View style={[hi.vBadge, { backgroundColor: `${accent}15`, borderColor: `${accent}30` }]}>
            <Text style={[hi.vText, { color: accent }]}>{item.version.toUpperCase()}</Text>
          </View>
          <View style={hi.textWrap}>
            <Text style={hi.inputText} numberOfLines={1}>{item.input}</Text>
            <View style={hi.metaRow}>
              <Text style={hi.networkText}>{item.network}</Text>
              <View style={hi.dot} />
              <Text style={[hi.scopeText, { color: accent }]}>{item.scope}</Text>
            </View>
          </View>
        </View>
        <Text style={hi.dateText}>{dateStr}{'\n'}{timeStr}</Text>
      </Pressable>
      <View style={hi.actions}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleFavorite(); }} style={hi.actionBtn}>
          <Ionicons name={item.favorite ? 'star' : 'star-outline'} size={18} color={item.favorite ? '#fcc419' : 'rgba(255,255,255,0.3)'} />
        </Pressable>
        <Pressable onPress={handleCopy} style={hi.actionBtn}>
          <Ionicons name="copy-outline" size={16} color="rgba(90,200,250,0.5)" />
        </Pressable>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDelete(); }} style={hi.actionBtn}>
          <Ionicons name="trash-outline" size={16} color="rgba(255,90,95,0.5)" />
        </Pressable>
      </View>
    </View>
  );
}
const hi = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  mainArea: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, gap: 10 },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  vBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1 },
  vText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  textWrap: { flex: 1, gap: 3 },
  inputText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  networkText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.2)' },
  scopeText: { fontSize: 12, fontWeight: '600' },
  dateText: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600', textAlign: 'right', lineHeight: 15 },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
});

/* ── Main Screen ── */
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const scrollRef = React.useRef<ScrollView>(null);
  const { recentCalculations, showFavoritesOnly, setShowFavoritesOnly, toggleFavorite, deleteHistoryItem, clearHistory, loadHistory, restoreCalculation } = useSubnetStore();

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollToTop', (tabName: string) => {
      if (tabName === 'History') scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => sub.remove();
  }, []);

  const filtered = useMemo(() => showFavoritesOnly ? recentCalculations.filter(i => i.favorite) : recentCalculations, [recentCalculations, showFavoritesOnly]);
  const favCount = useMemo(() => recentCalculations.filter(i => i.favorite).length, [recentCalculations]);

  const handleClear = () => {
    Alert.alert('Clear History', 'Remove all non-favorited calculations?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); clearHistory(); } },
    ]);
  };

  const handleRestore = (item: RecentCalculation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    restoreCalculation(item);
    nav.navigate('Calculator');
  };

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: RecentCalculation[] }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    let curLabel = ''; let curItems: RecentCalculation[] = [];
    for (const item of filtered) {
      const d = new Date(item.createdAt);
      const dayTs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const label = dayTs >= today ? 'Today' : dayTs >= yesterday ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      if (label !== curLabel) { if (curItems.length) groups.push({ label: curLabel, items: curItems }); curLabel = label; curItems = [item]; }
      else curItems.push(item);
    }
    if (curItems.length) groups.push({ label: curLabel, items: curItems });
    return groups;
  }, [filtered]);

  const v4Count = recentCalculations.filter(i => i.version === 'ipv4').length;
  const v6Count = recentCalculations.filter(i => i.version === 'ipv6').length;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030810', '#06101f', '#040812', '#020408']} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFillObject} />
      <ScrollView ref={scrollRef} style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: Math.max(insets.top + 8, 28), paddingBottom: 120 + Math.max(insets.bottom, 16) }]}
        showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <View><Text style={s.eyebrow}>SAVED</Text><Text style={s.pageTitle}>History</Text></View>
          {recentCalculations.length > 0 && (
            <Pressable onPress={handleClear} style={s.clearBtn}>
              <Ionicons name="trash-outline" size={14} color="#ff7b80" /><Text style={s.clearText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Filter */}
        <View style={s.filterRow}>
          <Pressable onPress={() => { Haptics.selectionAsync(); setShowFavoritesOnly(false); }}
            style={[s.filterBtn, !showFavoritesOnly && s.filterBtnActive]}>
            <Ionicons name="time-outline" size={16} color={!showFavoritesOnly ? '#5ac8fa' : 'rgba(255,255,255,0.4)'} />
            <Text style={[s.filterText, !showFavoritesOnly && s.filterTextActive]}>All ({recentCalculations.length})</Text>
          </Pressable>
          <Pressable onPress={() => { Haptics.selectionAsync(); setShowFavoritesOnly(true); }}
            style={[s.filterBtn, showFavoritesOnly && s.filterBtnActive]}>
            <Ionicons name="star" size={16} color={showFavoritesOnly ? '#fcc419' : 'rgba(255,255,255,0.4)'} />
            <Text style={[s.filterText, showFavoritesOnly && s.filterTextActive]}>Favorites ({favCount})</Text>
          </Pressable>
        </View>

        {/* Stats */}
        {recentCalculations.length > 0 && (
          <View style={s.statsCard}>
            <View style={s.statItem}>
              <View style={[s.statIcon, { backgroundColor: 'rgba(90,200,250,0.1)' }]}><Ionicons name="globe-outline" size={16} color="#5ac8fa" /></View>
              <View><Text style={s.statLabel}>IPv4</Text><Text style={s.statValue}>{v4Count}</Text></View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statIcon, { backgroundColor: 'rgba(139,124,255,0.1)' }]}><Ionicons name="globe-outline" size={16} color="#8B7CFF" /></View>
              <View><Text style={s.statLabel}>IPv6</Text><Text style={s.statValue}>{v6Count}</Text></View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <View style={[s.statIcon, { backgroundColor: 'rgba(252,196,25,0.1)' }]}><Ionicons name="star" size={16} color="#fcc419" /></View>
              <View><Text style={s.statLabel}>Saved</Text><Text style={[s.statValue, { color: '#fcc419' }]}>{favCount}</Text></View>
            </View>
          </View>
        )}

        {/* Grouped list */}
        {grouped.map((group) => (
          <View key={group.label} style={s.group}>
            <Text style={s.groupLabel}>{group.label}</Text>
            <View style={s.groupList}>
              {group.items.map((item) => (
                <HistoryItem key={item.id} item={item}
                  onRestore={() => handleRestore(item)}
                  onToggleFavorite={() => toggleFavorite(item.id)}
                  onDelete={() => deleteHistoryItem(item.id)} />
              ))}
            </View>
          </View>
        ))}

        {/* Empty */}
        {filtered.length === 0 && (
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}><Ionicons name={showFavoritesOnly ? 'star-outline' : 'time-outline'} size={36} color="rgba(90,200,250,0.3)" /></View>
            <Text style={s.emptyTitle}>{showFavoritesOnly ? 'No Favorites Yet' : 'No History Yet'}</Text>
            <Text style={s.emptyText}>
              {showFavoritesOnly ? 'Star calculations to save them here for quick access.' : 'Your subnet calculations will appear here automatically.'}
            </Text>
            {!showFavoritesOnly && (
              <Pressable onPress={() => nav.navigate('Calculator')} style={s.emptyBtn}>
                <Ionicons name="calculator-outline" size={16} color="#5ac8fa" /><Text style={s.emptyBtnText}>Open Calculator</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020408' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: 'rgba(90,200,250,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginBottom: 2 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,90,95,0.08)', borderWidth: 1, borderColor: 'rgba(255,90,95,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  clearText: { color: '#ff7b80', fontSize: 13, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  filterBtnActive: { backgroundColor: 'rgba(90,200,250,0.08)', borderColor: 'rgba(90,200,250,0.2)' },
  filterText: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: '#5ac8fa' },
  statsCard: { flexDirection: 'row', backgroundColor: 'rgba(10,25,60,0.25)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.06)' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  group: { gap: 8 },
  groupLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, paddingLeft: 4 },
  groupList: { gap: 8 },
  emptyWrap: { alignItems: 'center', paddingVertical: 50, gap: 12 },
  emptyIcon: { width: 70, height: 70, borderRadius: 22, backgroundColor: 'rgba(90,200,250,0.06)', borderWidth: 1, borderColor: 'rgba(90,200,250,0.1)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '800' },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: '75%' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(90,200,250,0.08)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(90,200,250,0.15)', marginTop: 8 },
  emptyBtnText: { color: '#5ac8fa', fontSize: 14, fontWeight: '800' },
});
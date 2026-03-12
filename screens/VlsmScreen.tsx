import React, { useMemo, useRef, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Share,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useSubnetStore, type VlsmResult } from '../store/useSubnetStore';

const { width: SW } = Dimensions.get('window');

/* ── Pie Chart (RN Views instead of SVG Text for reliability) ── */
function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function VlsmPieChart({ results, totalSpace }: { results: VlsmResult[]; totalSpace: number }) {
  const size = Math.min(SW - 80, 260);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const innerR = r * 0.55;

  let usedTotal = 0;
  for (const res of results) usedTotal += Math.pow(2, 32 - res.cidr);
  const freeSpace = totalSpace - usedTotal;
  const freePct = totalSpace > 0 ? (freeSpace / totalSpace) * 100 : 0;

  const slices: { color: string; startDeg: number; endDeg: number }[] = [];
  let currentDeg = 0;
  for (const res of results) {
    const pct = (Math.pow(2, 32 - res.cidr) / totalSpace) * 100;
    const sweep = (pct / 100) * 360;
    slices.push({ color: res.color, startDeg: currentDeg, endDeg: currentDeg + Math.max(sweep, 0.5) });
    currentDeg += sweep;
  }
  if (freeSpace > 0) slices.push({ color: 'rgba(255,255,255,0.06)', startDeg: currentDeg, endDeg: 360 });

  return (
    <View style={pie.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.03)" />
          {slices.map((sl, i) => {
            if (sl.endDeg - sl.startDeg < 0.3) return null;
            const path = sl.endDeg - sl.startDeg >= 359.9
              ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
              : describeArc(cx, cy, r, sl.startDeg, sl.endDeg);
            return <Path key={i} d={path} fill={sl.color} stroke="#020408" strokeWidth={1.5} />;
          })}
          <Circle cx={cx} cy={cy} r={innerR} fill="#020408" />
        </Svg>
        {/* Center label as RN Views (not SVG Text) */}
        <View style={[pie.centerLabel, { width: innerR * 2, height: innerR * 2 }]}>
          <Text style={pie.centerCount}>{results.length} subnets</Text>
          <Text style={pie.centerFree}>{freePct.toFixed(1)}% free</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={pie.legend}>
        {results.map((res, i) => (
          <View key={i} style={pie.legendItem}>
            <View style={[pie.legendDot, { backgroundColor: res.color }]} />
            <Text style={pie.legendLabel} numberOfLines={1}>{res.label}</Text>
            <Text style={[pie.legendPct, { color: res.color }]}>/{res.cidr}</Text>
            <Text style={pie.legendPct}>{res.percentage.toFixed(1)}%</Text>
          </View>
        ))}
        {freeSpace > 0 && (
          <View style={pie.legendItem}>
            <View style={[pie.legendDot, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <Text style={pie.legendLabel}>Unallocated</Text>
            <Text style={pie.legendPct}>{freePct.toFixed(1)}%</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const pie = StyleSheet.create({
  container: { alignItems: 'center', gap: 14 },
  centerLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerCount: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  centerFree: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '700' },
  legend: { width: '100%', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendLabel: { flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
  legendPct: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
});

/* ── Utilization Bar ── */
function UtilizationBar({ results, totalSpace }: { results: VlsmResult[]; totalSpace: number }) {
  if (totalSpace === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 }}>ADDRESS SPACE UTILIZATION</Text>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.04)', flexDirection: 'row', overflow: 'hidden' }}>
        {results.map((res, i) => (
          <View key={i} style={{ width: `${(Math.pow(2, 32 - res.cidr) / totalSpace) * 100}%`, height: '100%', backgroundColor: res.color }} />
        ))}
      </View>
    </View>
  );
}

/* ── Export Functions ── */
function buildCsvContent(results: VlsmResult[], baseInput: string): string {
  const lines = [`VLSM Layout for ${baseInput}`, ''];
  lines.push('Subnet,Label,CIDR,Network,First Host,Last Host,Broadcast,Requested,Allocated,Efficiency');
  results.forEach((r, i) => {
    const eff = r.allocatedHosts > 0 ? Math.round((r.requestedHosts / r.allocatedHosts) * 100) : 0;
    lines.push(`${i + 1},${r.label},/${r.cidr},${r.network},${r.firstHost},${r.lastHost},${r.broadcast},${r.requestedHosts},${r.allocatedHosts},${eff}%`);
  });
  return lines.join('\n');
}

function buildTextReport(results: VlsmResult[], baseInput: string): string {
  const lines = [`━━━ VLSM Layout Report ━━━`, `Base Network: ${baseInput}`, `Generated: ${new Date().toLocaleString()}`, `Subnets: ${results.length}`, ''];
  results.forEach((r, i) => {
    const eff = r.allocatedHosts > 0 ? Math.round((r.requestedHosts / r.allocatedHosts) * 100) : 0;
    lines.push(`── Subnet ${i + 1}: ${r.label} ──`);
    lines.push(`  Network:    ${r.network}/${r.cidr}`);
    lines.push(`  Range:      ${r.firstHost} → ${r.lastHost}`);
    lines.push(`  Broadcast:  ${r.broadcast}`);
    lines.push(`  Hosts:      ${r.requestedHosts} requested / ${r.allocatedHosts} allocated (${eff}%)`);
    lines.push('');
  });
  return lines.join('\n');
}

/* ── Result Card ── */
function VlsmResultCard({ item, index }: { item: VlsmResult; index: number }) {
  return (
    <View style={[rc.card, { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
      <View style={rc.top}>
        <View><Text style={rc.overline}>Subnet {index + 1}</Text><Text style={rc.label}>{item.label}</Text></View>
        <View style={[rc.cidrPill, { backgroundColor: `${item.color}20`, borderColor: `${item.color}40` }]}>
          <Text style={[rc.cidrText, { color: item.color }]}>/{item.cidr}</Text>
        </View>
      </View>
      <Text style={[rc.network, { color: item.color }]}>{item.network}</Text>
      <View style={rc.statsRow}>
        <View style={rc.stat}><Text style={rc.statLabel}>REQUESTED</Text><Text style={rc.statValue}>{item.requestedHosts}</Text></View>
        <View style={rc.stat}><Text style={rc.statLabel}>ALLOCATED</Text><Text style={[rc.statValue, { color: item.color }]}>{item.allocatedHosts}</Text></View>
        <View style={rc.stat}><Text style={rc.statLabel}>EFFICIENCY</Text><Text style={rc.statValue}>{item.allocatedHosts > 0 ? Math.round((item.requestedHosts / item.allocatedHosts) * 100) : 0}%</Text></View>
      </View>
      <View style={rc.rangeBox}><Text style={rc.rangeLabel}>USABLE RANGE</Text><Text style={rc.rangeValue}>{item.firstHost}  →  {item.lastHost}</Text></View>
      <View style={rc.rangeBox}><Text style={rc.rangeLabel}>BROADCAST</Text><Text style={rc.rangeValue}>{item.broadcast}</Text></View>
    </View>
  );
}
const rc = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overline: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  label: { color: '#fff', fontSize: 18, fontWeight: '900' },
  cidrPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  cidrText: { fontSize: 15, fontWeight: '900' },
  network: { fontSize: 20, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 },
  statValue: { color: '#fff', fontSize: 15, fontWeight: '900' },
  rangeBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  rangeLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 },
  rangeValue: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

/* ── Main Screen ── */
export default function VlsmScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const {
    vlsmBaseInput, vlsmRequests, vlsmResults, vlsmTotalSpace, error,
    setVlsmBaseInput, addVlsmRequest, updateVlsmRequest, removeVlsmRequest, calculateVlsmLayout,
  } = useSubnetStore();

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollToTop', (tabName: string) => {
      if (tabName === 'VLSM') scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => sub.remove();
  }, []);

  const totalRequestedHosts = useMemo(() => vlsmRequests.reduce((sum, item) => sum + (parseInt(item.hosts || '0', 10) || 0), 0), [vlsmRequests]);

  const handleShareCSV = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const csv = buildCsvContent(vlsmResults, vlsmBaseInput);
    try { await Share.share({ message: csv, title: 'VLSM Layout' }); } catch {}
  };

  const handleCopyText = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = buildTextReport(vlsmResults, vlsmBaseInput);
    await Clipboard.setStringAsync(text);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030810', '#06101f', '#040812', '#020408']} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFillObject} />
      <ScrollView ref={scrollRef} style={s.scroll}
        contentContainerStyle={[s.content, { paddingTop: Math.max(insets.top + 8, 28), paddingBottom: 120 + Math.max(insets.bottom, 16) }]}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <View><Text style={s.eyebrow}>NETWORK DESIGN</Text><Text style={s.pageTitle}>VLSM Calculator</Text></View>
          <View style={s.badgePill}><Ionicons name="git-network" size={16} color="#5ac8fa" /></View>
        </View>

        {/* Base network */}
        <View style={s.card}>
          <Text style={s.cardLabel}>MAJOR NETWORK</Text>
          <View style={s.inputShell}>
            <TextInput value={vlsmBaseInput} onChangeText={setVlsmBaseInput}
              placeholder="192.168.10.0/24" placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="none" autoCorrect={false} keyboardType="numbers-and-punctuation"
              style={s.input} selectionColor="#5ac8fa" />
          </View>
          <View style={s.statsRow}>
            <View style={s.statBox}><Text style={s.statLabel}>HOSTS REQUESTED</Text><Text style={s.statValue}>{totalRequestedHosts.toLocaleString()}</Text></View>
            <View style={s.statBox}><Text style={s.statLabel}>SUBNETS</Text><Text style={s.statValue}>{vlsmRequests.length}</Text></View>
          </View>
        </View>

        {/* Requests */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Subnet Requests</Text>
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); addVlsmRequest(); }} style={s.addBtn}>
              <Ionicons name="add" size={18} color="#5ac8fa" /><Text style={s.addBtnText}>Add</Text>
            </Pressable>
          </View>
          <View style={s.requestList}>
            {vlsmRequests.map((item) => (
              <View key={item.id} style={[s.requestRow, { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
                <View style={s.requestLeft}>
                  <View style={[s.colorDot, { backgroundColor: item.color }]} />
                  <TextInput value={item.label} onChangeText={(t) => updateVlsmRequest(item.id, { label: t })}
                    placeholder="Name" placeholderTextColor="rgba(255,255,255,0.2)" style={s.nameInput} />
                  <TextInput value={item.hosts} onChangeText={(t) => updateVlsmRequest(item.id, { hosts: t.replace(/[^\d]/g, '') })}
                    placeholder="Hosts" placeholderTextColor="rgba(255,255,255,0.2)" keyboardType="number-pad" style={s.hostsInput} />
                </View>
                <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); removeVlsmRequest(item.id); }} style={s.removeBtn}>
                  <Ionicons name="close" size={16} color="#ff7b80" />
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); calculateVlsmLayout(); }} style={s.generateBtn}>
            <LinearGradient colors={['#5ac8fa', '#3aa8e0']} style={s.generateGrad}>
              <Ionicons name="flash" size={18} color="#020408" /><Text style={s.generateText}>Generate Layout</Text>
            </LinearGradient>
          </Pressable>
          {error ? <Text style={s.error}>{error}</Text> : null}
        </View>

        {/* Results */}
        {vlsmResults.length > 0 && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Address Space Allocation</Text>
              <VlsmPieChart results={vlsmResults} totalSpace={vlsmTotalSpace} />
              <UtilizationBar results={vlsmResults} totalSpace={vlsmTotalSpace} />
            </View>

            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Calculated Layout</Text>
                <View style={s.readyPill}><Text style={s.readyText}>{vlsmResults.length} subnets</Text></View>
              </View>
              <View style={s.resultsList}>
                {vlsmResults.map((item, i) => <VlsmResultCard key={`${item.label}-${item.network}`} item={item} index={i} />)}
              </View>
            </View>

            {/* Export buttons */}
            <View style={s.exportRow}>
              <Pressable onPress={handleShareCSV} style={s.exportBtn}>
                <Ionicons name="share-outline" size={18} color="#5ac8fa" />
                <Text style={s.exportText}>Share CSV</Text>
              </Pressable>
              <Pressable onPress={handleCopyText} style={s.exportBtn}>
                <Ionicons name="copy-outline" size={18} color="#5ac8fa" />
                <Text style={s.exportText}>Copy Report</Text>
              </Pressable>
            </View>
          </>
        )}

        {vlsmResults.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="git-network-outline" size={40} color="rgba(255,255,255,0.15)" />
            <Text style={s.emptyTitle}>No Layout Generated</Text>
            <Text style={s.emptyText}>Add subnet requirements above, then tap Generate Layout to create an efficient VLSM allocation plan.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020408' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: 'rgba(90,200,250,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginBottom: 2 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  badgePill: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(90,200,250,0.1)', borderWidth: 1, borderColor: 'rgba(90,200,250,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: 'rgba(10,25,60,0.25)', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  cardLabel: { color: 'rgba(90,200,250,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  inputShell: { backgroundColor: 'rgba(2,8,20,0.9)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(90,200,250,0.18)' },
  input: { color: '#fff', fontSize: 20, fontWeight: '800', paddingHorizontal: 16, paddingVertical: 14, fontVariant: ['tabular-nums'] },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: 'rgba(90,200,250,0.06)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(90,200,250,0.12)' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 },
  statValue: { color: '#5ac8fa', fontSize: 18, fontWeight: '900' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(90,200,250,0.1)', borderWidth: 1, borderColor: 'rgba(90,200,250,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: '#5ac8fa', fontSize: 14, fontWeight: '800' },
  requestList: { gap: 8 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  requestLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  nameInput: { flex: 1.2, backgroundColor: 'rgba(6,10,20,0.9)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 15, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 10 },
  hostsInput: { width: 70, backgroundColor: 'rgba(6,10,20,0.9)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 15, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center' },
  removeBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,90,95,0.08)', borderWidth: 1, borderColor: 'rgba(255,90,95,0.15)', alignItems: 'center', justifyContent: 'center' },
  generateBtn: { borderRadius: 18, overflow: 'hidden' },
  generateGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  generateText: { color: '#020408', fontSize: 17, fontWeight: '900' },
  error: { color: '#ff7b80', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  readyPill: { backgroundColor: 'rgba(90,200,250,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  readyText: { color: '#5ac8fa', fontSize: 12, fontWeight: '800' },
  resultsList: { gap: 10 },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(90,200,250,0.06)', borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(90,200,250,0.12)' },
  exportText: { color: '#5ac8fa', fontSize: 14, fontWeight: '800' },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '800' },
  emptyText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: '80%' },
});
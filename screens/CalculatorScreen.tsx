import React, { useRef, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useSubnetStore } from '../store/useSubnetStore';

const { width: SW } = Dimensions.get('window');

/* ── Compact v4/v6 Toggle ── */
function VersionToggle() {
  const { ipVersion, setIpVersion } = useSubnetStore();
  return (
    <View style={tgl.container}>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIpVersion('ipv4'); }}
        style={[tgl.pill, ipVersion === 'ipv4' && tgl.pillActive]}
      >
        <Text style={[tgl.pillText, ipVersion === 'ipv4' && tgl.pillTextActive]}>v4</Text>
      </Pressable>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIpVersion('ipv6'); }}
        style={[tgl.pill, ipVersion === 'ipv6' && tgl.pillActive]}
      >
        <Text style={[tgl.pillText, ipVersion === 'ipv6' && tgl.pillTextActive]}>v6</Text>
      </Pressable>
    </View>
  );
}
const tgl = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 3, gap: 2 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  pillActive: { backgroundColor: 'rgba(90,200,250,0.2)' },
  pillText: { color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: '800' },
  pillTextActive: { color: '#5ac8fa' },
});

/* ── IP Input ── */
function IpInput() {
  const { input, result, ipVersion, setInput } = useSubnetStore();
  const ipOnly = input.includes('/') ? input.split('/')[0] : input;
  const handleChange = (text: string) => {
    const cleaned = text.trim();
    if (cleaned.includes('/')) { setInput(cleaned); return; }
    if (!cleaned) { setInput(`/${result.cidr}`); return; }
    setInput(`${cleaned}/${result.cidr}`);
  };
  return (
    <View style={inp.container}>
      <View style={inp.labelRow}>
        <Text style={inp.label}>{ipVersion === 'ipv4' ? 'IP ADDRESS' : 'IPv6 ADDRESS'}</Text>
        <View style={inp.vBadge}><Text style={inp.vBadgeText}>{ipVersion.toUpperCase()}</Text></View>
      </View>
      <View style={inp.shell}>
        <TextInput value={ipOnly} onChangeText={handleChange}
          placeholder={ipVersion === 'ipv4' ? '192.168.1.50' : '2001:db8::1'}
          placeholderTextColor="rgba(90,200,250,0.2)" autoCapitalize="none" autoCorrect={false}
          keyboardType={ipVersion === 'ipv4' ? 'numbers-and-punctuation' : 'default'}
          style={inp.input} returnKeyType="done" selectionColor="#5ac8fa" />
      </View>
      <View style={inp.scopeRow}>
        <View style={[inp.scopeDot, { backgroundColor: result.scopeColor }]} />
        <Text style={inp.scopeText}>{result.ipClass} · {result.ipScope}</Text>
        <View style={inp.meaningPill}><Text style={inp.meaningText}>{result.subnetMeaning}</Text></View>
      </View>
    </View>
  );
}
const inp = StyleSheet.create({
  container: { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: 'rgba(90,200,250,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  vBadge: { backgroundColor: 'rgba(90,200,250,0.08)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  vBadgeText: { color: 'rgba(90,200,250,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  shell: { backgroundColor: 'rgba(2,8,20,0.9)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(90,200,250,0.18)' },
  input: { color: '#fff', fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'], paddingHorizontal: 16, paddingVertical: 14, letterSpacing: 0.5 },
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scopeDot: { width: 8, height: 8, borderRadius: 4 },
  scopeText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
  meaningPill: { backgroundColor: 'rgba(90,200,250,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 'auto' },
  meaningText: { color: 'rgba(90,200,250,0.7)', fontSize: 11, fontWeight: '700' },
});

/* ── CIDR Slider ── */
function CompactCidrSlider() {
  const { result, setCidr, ipVersion } = useSubnetStore();
  const max = ipVersion === 'ipv6' ? 128 : 32;
  const quickSelects = ipVersion === 'ipv6' ? [48, 56, 64, 112, 128] : [8, 16, 24, 27, 30];
  return (
    <View style={csl.container}>
      <View style={csl.headerRow}>
        <Text style={csl.label}>CIDR PREFIX</Text>
        <View style={csl.cidrBadge}>
          <Text style={csl.cidrSlash}>/</Text><Text style={csl.cidrValue}>{result.cidr}</Text>
        </View>
      </View>
      <View style={csl.chipRow}>
        {quickSelects.map((v) => (
          <Pressable key={v} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCidr(v); }}
            style={[csl.chip, result.cidr === v && csl.chipActive]}>
            <Text style={[csl.chipText, result.cidr === v && csl.chipTextActive]}>/{v}</Text>
          </Pressable>
        ))}
      </View>
      <View style={csl.stepperRow}>
        <Pressable onPress={() => { Haptics.selectionAsync(); if (result.cidr > 0) setCidr(result.cidr - 1); }} style={csl.stepBtn}>
          <Ionicons name="remove" size={20} color="#5ac8fa" />
        </Pressable>
        <View style={csl.sliderTrack}>
          <View style={[csl.sliderFill, { width: `${(result.cidr / max) * 100}%` }]} />
          <Text style={csl.sliderLabel}>{result.cidr} / {max}</Text>
        </View>
        <Pressable onPress={() => { Haptics.selectionAsync(); if (result.cidr < max) setCidr(result.cidr + 1); }} style={csl.stepBtn}>
          <Ionicons name="add" size={20} color="#5ac8fa" />
        </Pressable>
      </View>
      <View style={csl.bitRow}>
        <View style={csl.bitPill}><Text style={csl.bitLabel}>NETWORK</Text><Text style={csl.bitValue}>{result.cidr} bits</Text></View>
        <View style={csl.bitPill}><Text style={csl.bitLabel}>HOST</Text><Text style={csl.bitValue}>{(ipVersion === 'ipv6' ? 128 : 32) - result.cidr} bits</Text></View>
      </View>
    </View>
  );
}
const csl = StyleSheet.create({
  container: { gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: 'rgba(90,200,250,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  cidrBadge: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: 'rgba(90,200,250,0.12)', borderWidth: 1, borderColor: 'rgba(90,200,250,0.25)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  cidrSlash: { color: 'rgba(90,200,250,0.6)', fontSize: 16, fontWeight: '700' },
  cidrValue: { color: '#5ac8fa', fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  chipActive: { backgroundColor: 'rgba(90,200,250,0.15)', borderColor: 'rgba(90,200,250,0.35)' },
  chipText: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '800' },
  chipTextActive: { color: '#5ac8fa' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(90,200,250,0.1)', borderWidth: 1, borderColor: 'rgba(90,200,250,0.2)', alignItems: 'center', justifyContent: 'center' },
  sliderTrack: { flex: 1, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(90,200,250,0.12)', borderRadius: 12 },
  sliderLabel: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  bitRow: { flexDirection: 'row', gap: 8 },
  bitPill: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bitLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  bitValue: { color: '#fff', fontSize: 13, fontWeight: '800' },
});

/* ── Result Tiles ── */
function CopyTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Clipboard.setStringAsync(value); }}
      style={[rt.tile, accent && rt.tileAccent]}>
      <Text style={rt.tileLabel}>{label}</Text>
      <Text style={[rt.tileValue, accent && rt.tileValueAccent]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </Pressable>
  );
}
function CompactResults() {
  const { result } = useSubnetStore();
  if (result.version === 'ipv6') {
    return (
      <View style={rt.container}>
        <View style={rt.sectionHeader}><View style={rt.sectionLine} /><Text style={rt.sectionTitle}>IPv6 RESULTS</Text><View style={rt.sectionLine} /></View>
        <View style={rt.row}><CopyTile label="NETWORK" value={result.network} accent /></View>
        <View style={rt.row}><CopyTile label="FIRST ADDR" value={result.firstAddress} /><CopyTile label="LAST ADDR" value={result.lastAddress} /></View>
        <View style={rt.row}><CopyTile label="ADDRESS COUNT" value={result.addressCount} accent /><CopyTile label="SCOPE" value={result.ipScope} /></View>
      </View>
    );
  }
  return (
    <View style={rt.container}>
      <View style={rt.sectionHeader}><View style={rt.sectionLine} /><Text style={rt.sectionTitle}>SUBNET RESULTS</Text><View style={rt.sectionLine} /></View>
      <View style={rt.row}><CopyTile label="NETWORK ID" value={result.network} accent /><CopyTile label="BROADCAST" value={result.broadcast} accent /></View>
      <View style={rt.row}><CopyTile label="FIRST HOST" value={result.firstHost} /><CopyTile label="LAST HOST" value={result.lastHost} /></View>
      <View style={rt.row}><CopyTile label="SUBNET MASK" value={result.mask} /><CopyTile label="USABLE IPs" value={result.usableHosts} accent /></View>
      <View style={rt.row}><CopyTile label="WILDCARD" value={result.wildcardMask} /><CopyTile label="CLASS" value={`Class ${result.ipClass}`} /></View>
    </View>
  );
}
const rt = StyleSheet.create({
  container: { gap: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(90,200,250,0.12)' },
  sectionTitle: { color: 'rgba(90,200,250,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  row: { flexDirection: 'row', gap: 6 },
  tile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tileAccent: { backgroundColor: 'rgba(90,200,250,0.06)', borderColor: 'rgba(90,200,250,0.15)' },
  tileLabel: { color: 'rgba(255,255,255,0.38)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  tileValue: { color: '#fff', fontSize: 14, fontWeight: '800' },
  tileValueAccent: { color: '#5ac8fa' },
});

/* ── Advanced Diagnostics ── */
function BinaryAnalysis() {
  const { result } = useSubnetStore();
  if (result.version !== 'ipv4') return null;
  const octets = result.network.split('.').map(o => parseInt(o, 10).toString(2).padStart(8, '0'));
  return (
    <View style={adv.section}>
      <Text style={adv.sectionTitle}>Binary Analysis</Text>
      <View style={adv.binaryGrid}>
        {octets.map((binary, i) => (
          <View key={i} style={adv.octetCard}>
            <View style={adv.octetHeader}><Text style={adv.octetNum}>Octet {i + 1}</Text><Text style={adv.octetDec}>{result.network.split('.')[i]}</Text></View>
            <View style={adv.bitsRow}>
              {binary.split('').map((bit, j) => (
                <View key={j} style={[adv.bit, bit === '1' && adv.bitOne]}><Text style={[adv.bitText, bit === '1' && adv.bitTextOne]}>{bit}</Text></View>
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={adv.fullBinaryBox}><Text style={adv.fullBinaryLabel}>FULL BINARY</Text><Text style={adv.fullBinaryValue}>{octets.join('.')}</Text></View>
    </View>
  );
}
function BitStructure() {
  const { result } = useSubnetStore();
  if (result.version !== 'ipv4') return null;
  const nBits = result.cidr; const hBits = 32 - result.cidr; const pct = (nBits / 32) * 100;
  return (
    <View style={adv.section}>
      <Text style={adv.sectionTitle}>Bit Structure</Text>
      <View style={adv.ratioBar}><View style={[adv.ratioFill, { width: `${pct}%` }]} /></View>
      <View style={adv.ratioLabels}><Text style={adv.ratioNet}>Network {pct.toFixed(0)}%</Text><Text style={adv.ratioHost}>Host {(100 - pct).toFixed(0)}%</Text></View>
      <View style={adv.blockGrid}>
        {Array.from({ length: 32 }).map((_, i) => {
          const isNet = i < nBits; const isOctetEnd = (i + 1) % 8 === 0 && i !== 31;
          return (<React.Fragment key={i}><View style={[adv.block, isNet ? adv.blockNet : adv.blockHost]} />{isOctetEnd && <View style={adv.octetSpacer} />}</React.Fragment>);
        })}
      </View>
      <View style={adv.infoRow}>
        <View style={adv.infoBox}><Text style={adv.infoLabel}>TOTAL ADDRESSES</Text><Text style={adv.infoValue}>{Math.pow(2, hBits).toLocaleString()}</Text></View>
        <View style={adv.infoBox}><Text style={adv.infoLabel}>NETWORK ADDRESS</Text><Text style={adv.infoValue}>{result.network}</Text></View>
      </View>
    </View>
  );
}
function IPv6Advanced() {
  const { result } = useSubnetStore();
  if (result.version !== 'ipv6') return null;
  const nBits = result.cidr; const hBits = 128 - result.cidr; const pct = (nBits / 128) * 100;
  return (
    <View style={adv.section}>
      <Text style={adv.sectionTitle}>IPv6 Bit Structure</Text>
      <View style={adv.ratioBar}><View style={[adv.ratioFill, { width: `${pct}%`, backgroundColor: '#8B7CFF' }]} /></View>
      <View style={adv.ratioLabels}><Text style={adv.ratioNet}>Prefix {nBits} bits</Text><Text style={adv.ratioHost}>Interface ID {hBits} bits</Text></View>
      <View style={adv.infoRow}><View style={adv.infoBox}><Text style={adv.infoLabel}>ADDRESS COUNT</Text><Text style={adv.infoValue} numberOfLines={1} adjustsFontSizeToFit>2^{hBits}</Text></View><View style={adv.infoBox}><Text style={adv.infoLabel}>SCOPE</Text><Text style={adv.infoValue}>{result.ipScope}</Text></View></View>
      <View style={adv.infoRow}><View style={[adv.infoBox, { flex: 1 }]}><Text style={adv.infoLabel}>NETWORK</Text><Text style={adv.infoValue} numberOfLines={1} adjustsFontSizeToFit>{result.network}</Text></View></View>
      <View style={adv.infoRow}><View style={[adv.infoBox, { flex: 1 }]}><Text style={adv.infoLabel}>LAST ADDRESS</Text><Text style={adv.infoValue} numberOfLines={1} adjustsFontSizeToFit>{result.lastAddress}</Text></View></View>
    </View>
  );
}
function NetworkClassCard() {
  const { result } = useSubnetStore();
  if (result.version !== 'ipv4') return null;
  const info: Record<string, { range: string; mask: string; color: string }> = {
    A: { range: '1.0.0.0 – 126.255.255.255', mask: '255.0.0.0', color: '#5ac8fa' },
    B: { range: '128.0.0.0 – 191.255.255.255', mask: '255.255.0.0', color: '#7c9cff' },
    C: { range: '192.0.0.0 – 223.255.255.255', mask: '255.255.255.0', color: '#66e0c2' },
    D: { range: '224.0.0.0 – 239.255.255.255', mask: 'Multicast', color: '#c792ea' },
    E: { range: '240.0.0.0 – 255.255.255.255', mask: 'Reserved', color: '#ff7b80' },
  };
  const cur = info[result.ipClass] ?? info.C;
  return (
    <View style={adv.section}>
      <Text style={adv.sectionTitle}>Network Class</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {(['A', 'B', 'C', 'D', 'E'] as const).map((cls) => {
          const active = cls === result.ipClass;
          return (<View key={cls} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: active ? `${info[cls].color}22` : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: active ? info[cls].color : 'rgba(255,255,255,0.06)' }}>
            <Text style={{ color: active ? info[cls].color : 'rgba(255,255,255,0.5)', fontWeight: '800', fontSize: 14 }}>{cls}</Text>
          </View>);
        })}
      </View>
      <View style={adv.infoRow}><View style={[adv.infoBox, { flex: 1 }]}><Text style={adv.infoLabel}>RANGE</Text><Text style={[adv.infoValue, { color: cur.color }]} numberOfLines={1} adjustsFontSizeToFit>{cur.range}</Text></View></View>
      <View style={adv.infoRow}><View style={[adv.infoBox, { flex: 1 }]}><Text style={adv.infoLabel}>DEFAULT MASK</Text><Text style={[adv.infoValue, { color: cur.color }]}>{cur.mask}</Text></View></View>
    </View>
  );
}
const adv = StyleSheet.create({
  section: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 10 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  binaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  octetCard: { width: (SW - 36 - 14 - 8) / 2, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: 'rgba(90,200,250,0.08)' },
  octetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  octetNum: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700' },
  octetDec: { color: '#fff', fontSize: 12, fontWeight: '800' },
  bitsRow: { flexDirection: 'row', gap: 2 },
  bit: { flex: 1, aspectRatio: 1, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  bitOne: { backgroundColor: 'rgba(90,200,250,0.2)', borderColor: 'rgba(90,200,250,0.4)' },
  bitText: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '800' },
  bitTextOne: { color: '#5ac8fa' },
  fullBinaryBox: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(90,200,250,0.08)' },
  fullBinaryLabel: { color: 'rgba(90,200,250,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  fullBinaryValue: { color: '#5ac8fa', fontSize: 12, fontWeight: '700', fontFamily: 'Courier' },
  ratioBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(58,69,96,0.4)', overflow: 'hidden' },
  ratioFill: { height: '100%', borderRadius: 3, backgroundColor: '#5ac8fa' },
  ratioLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  ratioNet: { color: '#5ac8fa', fontSize: 10, fontWeight: '800' },
  ratioHost: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800' },
  blockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  block: { width: 14, height: 14, borderRadius: 3 },
  blockNet: { backgroundColor: '#5ac8fa' },
  blockHost: { backgroundColor: 'rgba(58,69,96,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  octetSpacer: { width: 6 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  infoValue: { color: '#5ac8fa', fontSize: 13, fontWeight: '900' },
});

/* ── Main Screen ── */
export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const advancedY = useRef(0);
  const { result } = useSubnetStore();

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollToTop', (tabName: string) => {
      if (tabName === 'Calculator') scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030810', '#06101f', '#040812', '#020408']} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={s.scroll}
          contentContainerStyle={[s.content, { paddingTop: Math.max(insets.top + 8, 28), paddingBottom: 120 + Math.max(insets.bottom, 16) }]}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}><Text style={s.eyebrow}>SUBNETPRO™</Text><Text style={s.pageTitle}>Subnet Calculator</Text></View>
            <VersionToggle />
          </View>
          <View style={s.mainCard}><IpInput /><View style={s.divider} /><CompactCidrSlider /></View>
          <CompactResults />
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); scrollRef.current?.scrollTo({ y: advancedY.current, animated: true }); }} style={s.moreBtn}>
            <Text style={s.moreBtnText}>Advanced Diagnostics</Text><Ionicons name="chevron-down" size={16} color="#5ac8fa" />
          </Pressable>
          <View onLayout={(e) => { advancedY.current = e.nativeEvent.layout.y; }} style={s.advancedSection}>
            {result.version === 'ipv4' ? (<><BinaryAnalysis /><BitStructure /><NetworkClassCard /></>) : (<IPv6Advanced />)}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020408' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  eyebrow: { color: 'rgba(90,200,250,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 2.5, marginBottom: 2 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  mainCard: { backgroundColor: 'rgba(10,25,60,0.35)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(90,200,250,0.1)', gap: 14 },
  divider: { height: 1, backgroundColor: 'rgba(90,200,250,0.08)' },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: 'rgba(90,200,250,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(90,200,250,0.12)' },
  moreBtnText: { color: '#5ac8fa', fontSize: 13, fontWeight: '800' },
  advancedSection: { gap: 12 },
});
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ScrollView, StyleSheet, Text, View, Pressable, TextInput,
  Dimensions, KeyboardAvoidingView, Platform, DeviceEventEmitter, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useSubnetStore } from '../store/useSubnetStore';

const { width: SW } = Dimensions.get('window');

/* ── v4/v6 Toggle ── */
function VersionToggle() {
  const { ipVersion, setIpVersion } = useSubnetStore();
  return (
    <View style={tgl.container}>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIpVersion('ipv4'); }} style={[tgl.pill, ipVersion==='ipv4'&&tgl.pillActive]}>
        <Text style={[tgl.pillText, ipVersion==='ipv4'&&tgl.pillTextActive]}>IPv4</Text>
      </Pressable>
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIpVersion('ipv6'); }} style={[tgl.pill, ipVersion==='ipv6'&&tgl.pillActive]}>
        <Text style={[tgl.pillText, ipVersion==='ipv6'&&tgl.pillTextActive]}>IPv6</Text>
      </Pressable>
    </View>
  );
}
const tgl = StyleSheet.create({
  container: { flexDirection:'row', backgroundColor:'rgba(255,255,255,0.05)', borderRadius:14, padding:3, gap:2 },
  pill: { paddingHorizontal:12, paddingVertical:7, borderRadius:11 },
  pillActive: { backgroundColor:'rgba(90,200,250,0.2)' },
  pillText: { color:'rgba(255,255,255,0.35)', fontSize:13, fontWeight:'800' },
  pillTextActive: { color:'#5ac8fa' },
});

/* ── Segmented IPv4 Input ── */
function SegmentedIPv4Input() {
  const { input, result, setInput, error } = useSubnetStore();
  const ipOnly = input.includes('/') ? input.split('/')[0] : input;
  const parts = ipOnly.split('.');
  const refs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  const updateOctet = (index: number, value: string) => {
    Haptics.selectionAsync();
    const digits = value.replace(/[^0-9]/g, '').slice(0, 3);
    const current = ipOnly.split('.');
    while (current.length < 4) current.push('0');
    current[index] = digits;
    const newIp = current.join('.');
    setInput(`${newIp}/${result.cidr}`);
    // Auto-advance
    if (digits.length === 3 || (digits.length > 0 && parseInt(digits) > 25 && digits.length === 2) || value.endsWith('.')) {
      refs[index + 1]?.current?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && (parts[index] === '' || parts[index] === undefined) && index > 0) {
      refs[index - 1]?.current?.focus();
    }
    if (key === '.') {
      refs[index + 1]?.current?.focus();
    }
  };

  return (
    <View style={sip.container}>
      <View style={sip.labelRow}>
        <Text style={sip.label}>IP ADDRESS</Text>
        {error ? <Text style={sip.errorLabel}>INVALID</Text> : <Text style={sip.scopeText}>{result.ipClass} · {result.ipScope}</Text>}
      </View>
      <View style={[sip.shell, error && { borderColor:'#ff453a', borderWidth:1.5 }]}>
        {([0,1,2,3] as const).map((i) => (
          <React.Fragment key={i}>
            <TextInput
              ref={refs[i]}
              value={parts[i] ?? ''}
              onChangeText={(t) => updateOctet(i, t)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={3}
              style={[sip.octetInput, error && { color:'#ff453a' }]}
              placeholderTextColor="rgba(90,200,250,0.2)"
              placeholder={['192','168','1','50'][i]}
              selectionColor="#5ac8fa"
              returnKeyType={i < 3 ? 'next' : 'done'}
              onSubmitEditing={() => refs[i + 1]?.current?.focus()}
            />
            {i < 3 && <Text style={[sip.dot, error && { color:'#ff453a55' }]}>.</Text>}
          </React.Fragment>
        ))}
      </View>
      <View style={sip.metaRow}>
        <View style={[sip.scopeDot, { backgroundColor: error ? '#ff453a' : result.scopeColor }]} />
        <Text style={sip.scopeLabel}>{error ? 'Invalid Format' : result.subnetMeaning}</Text>
      </View>
    </View>
  );
}

function IPv6Input() {
  const { input, result, setInput, error } = useSubnetStore();
  const ipOnly = input.includes('/') ? input.split('/')[0] : input;

  const handleChange = (text: string) => {
    const cleaned = text.trim();
    if (cleaned.includes('/')) { setInput(cleaned); return; }
    if (!cleaned) { setInput(`::1/${result.cidr}`); return; }
    setInput(`${cleaned}/${result.cidr}`);
  };

  return (
    <View style={sip.container}>
      <View style={sip.labelRow}>
        <Text style={sip.label}>IPv6 ADDRESS</Text>
        {error ? <Text style={sip.errorLabel}>INVALID</Text> : <Text style={sip.scopeText}>{result.ipScope}</Text>}
      </View>
      <View style={[sip.v6Shell, error && { borderColor:'#ff453a', borderWidth:1.5 }]}>
        <TextInput
          value={ipOnly}
          onChangeText={handleChange}
          placeholder="2001:db8::1"
          placeholderTextColor="rgba(90,200,250,0.2)"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          style={[sip.v6Input, error && { color:'#ff453a' }]}
          returnKeyType="done"
          selectionColor="#5ac8fa"
        />
        {ipOnly.length > 0 && (
          <Pressable onPress={() => { Haptics.selectionAsync(); handleChange(''); }} style={sip.clearBtn} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={error ? 'rgba(255,69,58,0.5)' : 'rgba(90,200,250,0.3)'} />
          </Pressable>
        )}
      </View>
      <View style={sip.metaRow}>
        <View style={[sip.scopeDot, { backgroundColor: error ? '#ff453a' : result.scopeColor }]} />
        <Text style={sip.scopeLabel}>{error ? 'Invalid Format' : result.subnetMeaning}</Text>
      </View>
    </View>
  );
}

const sip = StyleSheet.create({
  container: { gap:8 },
  labelRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  label: { color:'rgba(90,200,250,0.6)', fontSize:10, fontWeight:'800', letterSpacing:2 },
  errorLabel: { color:'#ff453a', fontSize:10, fontWeight:'800', letterSpacing:1.5 },
  scopeText: { color:'rgba(255,255,255,0.45)', fontSize:11, fontWeight:'700' },
  shell: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(2,8,20,0.9)', borderRadius:18, borderWidth:1, borderColor:'rgba(90,200,250,0.18)', paddingHorizontal:14, paddingVertical:8 },
  octetInput: { width:(SW-32-56-28-28)/4, textAlign:'center', color:'#fff', fontSize:22, fontWeight:'900', fontVariant:['tabular-nums'], paddingVertical:8 },
  dot: { color:'rgba(90,200,250,0.5)', fontSize:26, fontWeight:'300', marginHorizontal:2 },
  v6Shell: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(2,8,20,0.9)', borderRadius:18, borderWidth:1, borderColor:'rgba(90,200,250,0.18)' },
  v6Input: { flex:1, color:'#fff', fontSize:18, fontWeight:'800', fontVariant:['tabular-nums'], paddingHorizontal:16, paddingVertical:14 },
  clearBtn: { paddingRight:16 },
  metaRow: { flexDirection:'row', alignItems:'center', gap:8 },
  scopeDot: { width:8, height:8, borderRadius:4 },
  scopeLabel: { color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:'700' },
});

/* ── CIDR Slider with tappable badge ── */
function CompactCidrSlider() {
  const { result, setCidr, ipVersion } = useSubnetStore();
  const max = ipVersion === 'ipv6' ? 128 : 32;
  const quickSelects = ipVersion === 'ipv6' ? [48, 56, 64, 112, 128] : [8, 16, 24, 27, 30];
  const lastCidr = useRef(result.cidr);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const handleSlide = (val: number) => {
    const intVal = Math.round(val);
    if (intVal !== lastCidr.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      lastCidr.current = intVal;
      setCidr(intVal);
    }
  };

  const handleStep = (dir: 1 | -1) => {
    const next = result.cidr + dir;
    if (next >= 0 && next <= max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCidr(next);
    }
  };

  const openEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditVal(String(result.cidr));
    setEditing(true);
  };

  const commitEdit = () => {
    const n = parseInt(editVal, 10);
    if (!isNaN(n) && n >= 0 && n <= max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setCidr(n);
    }
    setEditing(false);
  };

  return (
    <View style={csl.container}>
      <View style={csl.headerRow}>
        <Text style={csl.label}>CIDR PREFIX</Text>
        {/* Tappable CIDR badge */}
        <Pressable onPress={openEdit} style={csl.cidrBadge} hitSlop={8}>
          <Text style={csl.cidrSlash}>/</Text>
          <Text style={csl.cidrValue}>{result.cidr}</Text>
          <Ionicons name="pencil" size={13} color="rgba(90,200,250,0.5)" style={{ marginLeft:4 }} />
        </Pressable>
      </View>

      <View style={csl.chipRow}>
        {quickSelects.map((v) => (
          <Pressable key={v} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setCidr(v); }}
            style={[csl.chip, result.cidr===v && csl.chipActive]}>
            <Text style={[csl.chipText, result.cidr===v && csl.chipTextActive]}>/{v}</Text>
          </Pressable>
        ))}
      </View>

      <View style={csl.stepperRow}>
        <Pressable onPress={() => handleStep(-1)} style={({ pressed }) => [csl.stepBtn, pressed && { transform:[{scale:0.85}], opacity:0.8 }]}>
          <Ionicons name="remove" size={20} color="#5ac8fa" />
        </Pressable>
        <View style={csl.sliderTrack}>
          <Slider
            style={{ flex:1, height:40 }}
            minimumValue={0} maximumValue={max} step={1}
            value={result.cidr}
            onValueChange={handleSlide}
            minimumTrackTintColor="#5ac8fa"
            maximumTrackTintColor="rgba(255,255,255,0.15)"
            thumbTintColor="#ffffff"
          />
        </View>
        <Pressable onPress={() => handleStep(1)} style={({ pressed }) => [csl.stepBtn, pressed && { transform:[{scale:0.85}], opacity:0.8 }]}>
          <Ionicons name="add" size={20} color="#5ac8fa" />
        </Pressable>
      </View>

      <View style={csl.bitRow}>
        <View style={csl.bitPill}><Text style={csl.bitLabel}>NETWORK</Text><Text style={csl.bitValue}>{result.cidr} bits</Text></View>
        <View style={csl.bitPill}><Text style={csl.bitLabel}>HOST</Text><Text style={csl.bitValue}>{(ipVersion==='ipv6'?128:32)-result.cidr} bits</Text></View>
      </View>

      {/* CIDR edit modal */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={csl.modalOverlay} onPress={() => setEditing(false)}>
          <View style={csl.modalCard}>
            <Text style={csl.modalTitle}>Enter CIDR Prefix</Text>
            <Text style={csl.modalSubtitle}>0 – {max}</Text>
            <View style={csl.modalInputRow}>
              <Text style={csl.modalSlash}>/</Text>
              <TextInput
                value={editVal}
                onChangeText={setEditVal}
                keyboardType="number-pad"
                maxLength={3}
                style={csl.modalInput}
                autoFocus
                selectionColor="#5ac8fa"
                onSubmitEditing={commitEdit}
              />
            </View>
            <Pressable onPress={commitEdit} style={csl.modalConfirm}>
              <Text style={csl.modalConfirmText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
const csl = StyleSheet.create({
  container: { gap:10 },
  headerRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  label: { color:'rgba(90,200,250,0.6)', fontSize:10, fontWeight:'800', letterSpacing:2 },
  cidrBadge: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(90,200,250,0.12)', borderWidth:1, borderColor:'rgba(90,200,250,0.25)', borderRadius:12, paddingHorizontal:12, paddingVertical:6 },
  cidrSlash: { color:'rgba(90,200,250,0.6)', fontSize:16, fontWeight:'700' },
  cidrValue: { color:'#5ac8fa', fontSize:22, fontWeight:'900', fontVariant:['tabular-nums'] },
  chipRow: { flexDirection:'row', gap:6 },
  chip: { flex:1, alignItems:'center', paddingVertical:8, borderRadius:12, backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  chipActive: { backgroundColor:'rgba(90,200,250,0.15)', borderColor:'rgba(90,200,250,0.35)' },
  chipText: { color:'rgba(255,255,255,0.45)', fontSize:13, fontWeight:'800' },
  chipTextActive: { color:'#5ac8fa' },
  stepperRow: { flexDirection:'row', alignItems:'center', gap:10 },
  stepBtn: { width:44, height:44, borderRadius:14, backgroundColor:'rgba(90,200,250,0.1)', borderWidth:1, borderColor:'rgba(90,200,250,0.2)', alignItems:'center', justifyContent:'center' },
  sliderTrack: { flex:1, height:44, borderRadius:12, backgroundColor:'rgba(255,255,255,0.03)', borderWidth:1, borderColor:'rgba(255,255,255,0.06)', justifyContent:'center', paddingHorizontal:8 },
  bitRow: { flexDirection:'row', gap:8 },
  bitPill: { flex:1, flexDirection:'row', justifyContent:'space-between', alignItems:'center', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:10, paddingHorizontal:10, paddingVertical:8, borderWidth:1, borderColor:'rgba(255,255,255,0.05)' },
  bitLabel: { color:'rgba(255,255,255,0.35)', fontSize:9, fontWeight:'800', letterSpacing:1 },
  bitValue: { color:'#fff', fontSize:13, fontWeight:'800' },
  // Modal
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.7)', alignItems:'center', justifyContent:'center' },
  modalCard: { backgroundColor:'#0d1f40', borderRadius:24, padding:28, alignItems:'center', gap:14, borderWidth:1, borderColor:'rgba(90,200,250,0.2)', minWidth:240 },
  modalTitle: { color:'#fff', fontSize:18, fontWeight:'900' },
  modalSubtitle: { color:'rgba(255,255,255,0.35)', fontSize:13, fontWeight:'700', marginTop:-8 },
  modalInputRow: { flexDirection:'row', alignItems:'center', gap:4 },
  modalSlash: { color:'rgba(90,200,250,0.6)', fontSize:36, fontWeight:'300' },
  modalInput: { color:'#5ac8fa', fontSize:48, fontWeight:'900', fontVariant:['tabular-nums'], minWidth:90, textAlign:'center' },
  modalConfirm: { backgroundColor:'rgba(90,200,250,0.18)', borderWidth:1, borderColor:'rgba(90,200,250,0.3)', borderRadius:14, paddingHorizontal:32, paddingVertical:12, width:'100%', alignItems:'center' },
  modalConfirmText: { color:'#5ac8fa', fontSize:16, fontWeight:'900' },
});

/* ── Copy Tiles ── */
function CopyTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Pressable onPress={handleCopy} style={[rt.tile, accent && rt.tileAccent]}>
      <View style={rt.tileTop}>
        <Text style={rt.tileLabel}>{label}</Text>
        {copied && <Ionicons name="checkmark" size={11} color="#5ac8fa" />}
      </View>
      <Text style={[rt.tileValue, accent && rt.tileValueAccent]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </Pressable>
  );
}
function CompactResults() {
  const { result } = useSubnetStore();
  if (result.version === 'ipv6') {
    return (
      <View style={rt.container}>
        <SectionHeader title="IPv6 RESULTS" />
        <View style={rt.row}><CopyTile label="NETWORK" value={result.network} accent /></View>
        <View style={rt.row}><CopyTile label="FIRST ADDR" value={result.firstAddress} /><CopyTile label="LAST ADDR" value={result.lastAddress} /></View>
        <View style={rt.row}><CopyTile label="ADDRESS COUNT" value={result.addressCount} accent /><CopyTile label="SCOPE" value={result.ipScope} /></View>
      </View>
    );
  }
  return (
    <View style={rt.container}>
      <SectionHeader title="SUBNET RESULTS" />
      <View style={rt.row}><CopyTile label="NETWORK ID" value={result.network} accent /><CopyTile label="BROADCAST" value={result.broadcast} accent /></View>
      <View style={rt.row}><CopyTile label="FIRST HOST" value={result.firstHost} /><CopyTile label="LAST HOST" value={result.lastHost} /></View>
      <View style={rt.row}><CopyTile label="SUBNET MASK" value={result.mask} /><CopyTile label="USABLE IPs" value={result.usableHosts} accent /></View>
      <View style={rt.row}><CopyTile label="WILDCARD MASK" value={result.wildcardMask} /><CopyTile label="CLASS" value={`Class ${result.ipClass}`} /></View>
    </View>
  );
}
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={rt.sectionHeader}>
      <View style={rt.sectionLine} />
      <Text style={rt.sectionTitle}>{title}</Text>
      <View style={rt.sectionLine} />
    </View>
  );
}
const rt = StyleSheet.create({
  container: { gap:6 },
  sectionHeader: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:4 },
  sectionLine: { flex:1, height:1, backgroundColor:'rgba(90,200,250,0.12)' },
  sectionTitle: { color:'rgba(90,200,250,0.5)', fontSize:10, fontWeight:'800', letterSpacing:2 },
  row: { flexDirection:'row', gap:6 },
  tile: { flex:1, backgroundColor:'rgba(255,255,255,0.03)', borderRadius:14, paddingHorizontal:10, paddingVertical:8, borderWidth:1, borderColor:'rgba(255,255,255,0.06)' },
  tileAccent: { backgroundColor:'rgba(90,200,250,0.06)', borderColor:'rgba(90,200,250,0.15)' },
  tileTop: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:2 },
  tileLabel: { color:'rgba(255,255,255,0.38)', fontSize:9, fontWeight:'800', letterSpacing:1 },
  tileValue: { color:'#fff', fontSize:14, fontWeight:'800' },
  tileValueAccent: { color:'#5ac8fa' },
});

/* ── Enhanced Binary Analysis ── */
function BinaryRow({ label, ip, cidr, highlightNet, color }: { label: string; ip: string; cidr: number; highlightNet: boolean; color: string }) {
  const octets = ip.split('.').map(o => parseInt(o, 10).toString(2).padStart(8, '0'));
  const fullBinary = octets.join('');
  return (
    <View style={bin.rowWrap}>
      <View style={bin.rowLabel}><Text style={[bin.rowLabelText, {color}]}>{label}</Text></View>
      <View style={bin.bitsWrap}>
        {fullBinary.split('').map((bit, i) => {
          const isNet = i < cidr;
          const isOctetBound = i > 0 && i % 8 === 0;
          return (
            <React.Fragment key={i}>
              {isOctetBound && <View style={bin.octetGap} />}
              <View style={[bin.bitCell,
                highlightNet
                  ? isNet ? [bin.bitNet, {borderColor:color+'60', backgroundColor:color+'22'}] : bin.bitHost
                  : { backgroundColor:bit==='1'?color+'22':'rgba(255,255,255,0.03)', borderColor:bit==='1'?color+'40':'rgba(255,255,255,0.06)' }
              ]}>
                <Text style={[bin.bitText, { color: highlightNet
                  ? isNet ? color : 'rgba(255,255,255,0.25)'
                  : bit==='1' ? color : 'rgba(255,255,255,0.18)' }]}>{bit}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
      <Text style={[bin.decText, {color}]}>{ip}</Text>
    </View>
  );
}

function BinaryAnalysis() {
  const { result } = useSubnetStore();
  if (result.version !== 'ipv4') return null;
  const { ip, cidr, network, broadcast, mask } = result;

  return (
    <View style={adv.section}>
      <View style={adv.sectionTitleRow}>
        <Text style={adv.sectionTitle}>Binary Analysis</Text>
        <View style={adv.sectionBadge}><Text style={adv.sectionBadgeText}>/{cidr}</Text></View>
      </View>
      <View style={adv.legendRow}>
        <View style={adv.legendDot1}/><Text style={adv.legendText}>Network bits</Text>
        <View style={[adv.legendDot1,{backgroundColor:'rgba(255,255,255,0.2)',marginLeft:12}]}/><Text style={adv.legendText}>Host bits</Text>
      </View>
      <View style={bin.table}>
        <BinaryRow label="IP" ip={ip} cidr={cidr} highlightNet color="#5ac8fa" />
        <View style={bin.divider}/>
        <BinaryRow label="MASK" ip={mask} cidr={cidr} highlightNet={false} color="#c792ea" />
        <View style={bin.divider}/>
        <BinaryRow label="NET" ip={network} cidr={cidr} highlightNet color="#51cf66" />
        <View style={bin.divider}/>
        <BinaryRow label="BCAST" ip={broadcast} cidr={cidr} highlightNet={false} color="#fcc419" />
      </View>

      {/* Octet decimal breakdown */}
      <View style={bin.octetRow}>
        {ip.split('.').map((oct, i) => (
          <View key={i} style={bin.octetBox}>
            <Text style={bin.octetDec}>{oct}</Text>
            <Text style={bin.octetBin}>{parseInt(oct,10).toString(2).padStart(8,'0')}</Text>
            <Text style={bin.octetLabel}>Octet {i+1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── Enhanced Bit Structure ── */
function BitStructure() {
  const { result } = useSubnetStore();
  if (result.version !== 'ipv4') return null;
  const { cidr, usableHosts, mask, wildcardMask } = result;
  const hBits = 32 - cidr;
  const pct = (cidr / 32) * 100;
  const totalAddresses = Math.pow(2, hBits);

  return (
    <View style={adv.section}>
      <View style={adv.sectionTitleRow}>
        <Text style={adv.sectionTitle}>Bit Structure</Text>
        <View style={[adv.sectionBadge, {backgroundColor:'rgba(81,207,102,0.1)', borderColor:'rgba(81,207,102,0.3)'}]}>
          <Text style={[adv.sectionBadgeText, {color:'#51cf66'}]}>{usableHosts} hosts</Text>
        </View>
      </View>

      {/* Visual bit bar — 32 blocks */}
      <View style={bs.barWrap}>
        {Array.from({length:32}).map((_,i) => {
          const isNet = i < cidr;
          const isOctetEnd = (i+1) % 8 === 0 && i !== 31;
          return (
            <React.Fragment key={i}>
              <View style={[bs.block,
                isNet
                  ? { backgroundColor:'#5ac8fa', borderColor:'rgba(90,200,250,0.7)' }
                  : { backgroundColor:'rgba(255,255,255,0.07)', borderColor:'rgba(255,255,255,0.1)' }
              ]} />
              {isOctetEnd && <View style={bs.gap}/>}
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels below bar */}
      <View style={bs.barLabels}>
        <View style={{flex:cidr}}><Text style={bs.netLabel}>Network ({cidr} bits)</Text></View>
        <View style={{flex:hBits, alignItems:'flex-end'}}><Text style={bs.hostLabel}>Host ({hBits} bits)</Text></View>
      </View>

      {/* Stats grid */}
      <View style={bs.statsGrid}>
        <View style={bs.stat}><Text style={bs.statLabel}>TOTAL ADDRESSES</Text><Text style={bs.statValue}>{totalAddresses.toLocaleString()}</Text></View>
        <View style={bs.stat}><Text style={bs.statLabel}>USABLE HOSTS</Text><Text style={[bs.statValue,{color:'#51cf66'}]}>{usableHosts}</Text></View>
        <View style={bs.stat}><Text style={bs.statLabel}>SUBNET MASK</Text><Text style={bs.statValue} numberOfLines={1} adjustsFontSizeToFit>{mask}</Text></View>
        <View style={bs.stat}><Text style={bs.statLabel}>WILDCARD</Text><Text style={bs.statValue} numberOfLines={1} adjustsFontSizeToFit>{wildcardMask}</Text></View>
      </View>
    </View>
  );
}

const bin = StyleSheet.create({
  table: { gap:6 },
  rowWrap: { gap:4 },
  rowLabel: { marginBottom:2 },
  rowLabelText: { fontSize:9, fontWeight:'800', letterSpacing:1.5 },
  bitsWrap: { flexDirection:'row', alignItems:'center' },
  bitCell: { width:(SW-72)/36, height:(SW-72)/36+2, borderRadius:3, borderWidth:1, alignItems:'center', justifyContent:'center' },
  bitNet: { },
  bitHost: { backgroundColor:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.08)' },
  bitText: { fontSize:7, fontWeight:'800' },
  octetGap: { width:5 },
  divider: { height:1, backgroundColor:'rgba(255,255,255,0.05)' },
  decText: { fontSize:11, fontWeight:'800', marginTop:2, fontVariant:['tabular-nums'] },
  octetRow: { flexDirection:'row', gap:6, marginTop:4 },
  octetBox: { flex:1, backgroundColor:'rgba(0,0,0,0.3)', borderRadius:10, padding:8, borderWidth:1, borderColor:'rgba(90,200,250,0.08)', alignItems:'center', gap:2 },
  octetDec: { color:'#fff', fontSize:15, fontWeight:'900' },
  octetBin: { color:'#5ac8fa', fontSize:9, fontWeight:'700', fontFamily:'Courier', letterSpacing:1 },
  octetLabel: { color:'rgba(255,255,255,0.3)', fontSize:9, fontWeight:'700' },
});
const bs = StyleSheet.create({
  barWrap: { flexDirection:'row', alignItems:'center', gap:2, flexWrap:'nowrap' },
  block: { flex:1, height:20, borderRadius:3, borderWidth:1 },
  gap: { width:6 },
  barLabels: { flexDirection:'row', marginTop:4 },
  netLabel: { color:'#5ac8fa', fontSize:10, fontWeight:'800' },
  hostLabel: { color:'rgba(255,255,255,0.35)', fontSize:10, fontWeight:'800' },
  statsGrid: { flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:4 },
  stat: { width:'47%', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:12, padding:10, borderWidth:1, borderColor:'rgba(255,255,255,0.05)' },
  statLabel: { color:'rgba(255,255,255,0.35)', fontSize:9, fontWeight:'800', letterSpacing:1, marginBottom:4 },
  statValue: { color:'#5ac8fa', fontSize:14, fontWeight:'900' },
});

function IPv6Advanced() {
  const { result } = useSubnetStore();
  if (result.version !== 'ipv6') return null;
  const nBits = result.cidr; const hBits = 128 - result.cidr; const pct = (nBits / 128) * 100;
  return (
    <View style={adv.section}>
      <Text style={adv.sectionTitle}>IPv6 Bit Structure</Text>
      <View style={adv.ratioBar}><View style={[adv.ratioFill, { width:`${pct}%`, backgroundColor:'#8B7CFF' }]} /></View>
      <View style={adv.ratioLabels}><Text style={adv.ratioNet}>Prefix {nBits} bits</Text><Text style={adv.ratioHost}>Interface ID {hBits} bits</Text></View>
      <View style={adv.infoRow}>
        <View style={adv.infoBox}><Text style={adv.infoLabel}>ADDRESS COUNT</Text><Text style={adv.infoValue} numberOfLines={1} adjustsFontSizeToFit>2^{hBits}</Text></View>
        <View style={adv.infoBox}><Text style={adv.infoLabel}>SCOPE</Text><Text style={adv.infoValue}>{result.ipScope}</Text></View>
      </View>
      <View style={adv.infoRow}><View style={[adv.infoBox,{flex:1}]}><Text style={adv.infoLabel}>NETWORK</Text><Text style={adv.infoValue} numberOfLines={1} adjustsFontSizeToFit>{result.network}</Text></View></View>
    </View>
  );
}

function NetworkClassCard() {
  const { result } = useSubnetStore();
  if (result.version !== 'ipv4') return null;
  const info: Record<string, { range: string; mask: string; color: string }> = {
    A: { range:'1.0.0.0 – 126.255.255.255', mask:'255.0.0.0', color:'#5ac8fa' },
    B: { range:'128.0.0.0 – 191.255.255.255', mask:'255.255.0.0', color:'#7c9cff' },
    C: { range:'192.0.0.0 – 223.255.255.255', mask:'255.255.255.0', color:'#66e0c2' },
    D: { range:'224.0.0.0 – 239.255.255.255', mask:'Multicast', color:'#c792ea' },
    E: { range:'240.0.0.0 – 255.255.255.255', mask:'Reserved', color:'#ff7b80' },
  };
  const cur = info[result.ipClass] ?? info.C;
  return (
    <View style={adv.section}>
      <Text style={adv.sectionTitle}>Network Class</Text>
      <View style={{ flexDirection:'row', gap:6 }}>
        {(['A','B','C','D','E'] as const).map((cls) => {
          const active = cls === result.ipClass;
          return (<View key={cls} style={{ flex:1, alignItems:'center', paddingVertical:8, borderRadius:10, backgroundColor:active?`${info[cls].color}22`:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:active?info[cls].color:'rgba(255,255,255,0.06)' }}>
            <Text style={{ color:active?info[cls].color:'rgba(255,255,255,0.5)', fontWeight:'800', fontSize:14 }}>{cls}</Text>
          </View>);
        })}
      </View>
      <View style={adv.infoRow}><View style={[adv.infoBox,{flex:1}]}><Text style={adv.infoLabel}>RANGE</Text><Text style={[adv.infoValue,{color:cur.color}]} numberOfLines={1} adjustsFontSizeToFit>{cur.range}</Text></View></View>
      <View style={adv.infoRow}><View style={[adv.infoBox,{flex:1}]}><Text style={adv.infoLabel}>DEFAULT MASK</Text><Text style={[adv.infoValue,{color:cur.color}]}>{cur.mask}</Text></View></View>
    </View>
  );
}

const adv = StyleSheet.create({
  section: { backgroundColor:'rgba(255,255,255,0.02)', borderRadius:20, padding:14, borderWidth:1, borderColor:'rgba(255,255,255,0.06)', gap:10 },
  sectionTitleRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  sectionTitle: { color:'#fff', fontSize:15, fontWeight:'900' },
  sectionBadge: { backgroundColor:'rgba(90,200,250,0.1)', borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:'rgba(90,200,250,0.25)' },
  sectionBadgeText: { color:'#5ac8fa', fontSize:11, fontWeight:'800' },
  legendRow: { flexDirection:'row', alignItems:'center', gap:6 },
  legendDot1: { width:10, height:10, borderRadius:3, backgroundColor:'rgba(90,200,250,0.4)' },
  legendText: { color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:'700' },
  ratioBar: { height:6, borderRadius:3, backgroundColor:'rgba(58,69,96,0.4)', overflow:'hidden' },
  ratioFill: { height:'100%', borderRadius:3, backgroundColor:'#5ac8fa' },
  ratioLabels: { flexDirection:'row', justifyContent:'space-between' },
  ratioNet: { color:'#5ac8fa', fontSize:10, fontWeight:'800' },
  ratioHost: { color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:'800' },
  infoRow: { flexDirection:'row', gap:8 },
  infoBox: { flex:1, backgroundColor:'rgba(255,255,255,0.03)', borderRadius:12, paddingHorizontal:10, paddingVertical:8, borderWidth:1, borderColor:'rgba(255,255,255,0.05)' },
  infoLabel: { color:'rgba(255,255,255,0.35)', fontSize:9, fontWeight:'800', letterSpacing:1, marginBottom:3 },
  infoValue: { color:'#5ac8fa', fontSize:13, fontWeight:'900' },
});

/* ── Scroll Hint ── */
function ScrollHint() {
  return (
    <View style={sh.wrap}>
      <Ionicons name="chevron-down" size={14} color="rgba(90,200,250,0.4)" />
      <Text style={sh.text}>Scroll for Advanced Diagnostics</Text>
      <Ionicons name="chevron-down" size={14} color="rgba(90,200,250,0.4)" />
    </View>
  );
}
const sh = StyleSheet.create({
  wrap: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, paddingVertical:6 },
  text: { color:'rgba(90,200,250,0.4)', fontSize:11, fontWeight:'700', letterSpacing:0.5 },
});

/* ── Main Screen ── */
export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const advancedY = useRef(0);
  const { result, ipVersion } = useSubnetStore();

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollToTop', (tabName: string) => {
      if (tabName === 'Calculator') scrollRef.current?.scrollTo({ y:0, animated:true });
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030810','#06101f','#040812','#020408']} locations={[0,0.3,0.7,1]} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView ref={scrollRef} style={s.scroll}
          contentContainerStyle={[s.content, { paddingTop:Math.max(insets.top+8,28), paddingBottom:120+Math.max(insets.bottom,16) }]}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.headerRow}>
            <View style={{flex:1}}>
              <Text style={s.eyebrow}>SUBNETPRO™</Text>
              <Text style={s.pageTitle}>Subnet Calculator</Text>
            </View>
            <VersionToggle />
          </View>

          <View style={s.mainCard}>
            {ipVersion === 'ipv4' ? <SegmentedIPv4Input /> : <IPv6Input />}
            <View style={s.divider} />
            <CompactCidrSlider />
          </View>

          <CompactResults />

          <ScrollHint />

          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); scrollRef.current?.scrollTo({ y:advancedY.current, animated:true }); }} style={s.moreBtn}>
            <Ionicons name="flask" size={16} color="#5ac8fa" />
            <Text style={s.moreBtnText}>Advanced Diagnostics</Text>
            <Ionicons name="chevron-down" size={16} color="#5ac8fa" />
          </Pressable>

          <View onLayout={(e) => { advancedY.current = e.nativeEvent.layout.y; }} style={s.advancedSection}>
            {result.version === 'ipv4'
              ? (<><BinaryAnalysis /><BitStructure /><NetworkClassCard /></>)
              : (<IPv6Advanced />)
            }
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:'#020408' },
  scroll: { flex:1 },
  content: { paddingHorizontal:16, gap:12 },
  headerRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', gap:12 },
  eyebrow: { color:'rgba(90,200,250,0.7)', fontSize:10, fontWeight:'800', letterSpacing:2.5, marginBottom:2 },
  pageTitle: { color:'#fff', fontSize:24, fontWeight:'900', letterSpacing:-0.5 },
  mainCard: { backgroundColor:'rgba(10,25,60,0.35)', borderRadius:24, padding:16, borderWidth:1, borderColor:'rgba(90,200,250,0.1)', gap:14 },
  divider: { height:1, backgroundColor:'rgba(90,200,250,0.08)' },
  moreBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:12, backgroundColor:'rgba(90,200,250,0.06)', borderRadius:16, borderWidth:1, borderColor:'rgba(90,200,250,0.12)' },
  moreBtnText: { color:'#5ac8fa', fontSize:13, fontWeight:'800' },
  advancedSection: { gap:12 },
});
import React, { useRef, useEffect, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, View, Pressable, TextInput,
  Dimensions, Share, DeviceEventEmitter, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { useSubnetStore, type FlsmResult } from '../store/useSubnetStore';

const { width: SW } = Dimensions.get('window');
const CIDR_COLORS = ['#5ac8fa','#7c9cff','#51cf66','#fcc419','#cc5de8','#ff922b','#20c997','#ff6b6b'];

/* ── Segmented IPv4 Input ── */
function FlsmIpInput() {
  const { flsmBaseInput, setFlsmBaseInput } = useSubnetStore();
  const refs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const rawIp = flsmBaseInput.includes('/') ? flsmBaseInput.split('/')[0] : flsmBaseInput;
  const parts = rawIp.split('.');

  const updateOctet = (index: number, value: string) => {
    const digits = value.replace(/[^0-9]/g,'').slice(0,3);
    const current = rawIp.split('.');
    while(current.length<4) current.push('0');
    current[index]=digits;
    const cidr = flsmBaseInput.includes('/') ? '/'+flsmBaseInput.split('/')[1] : '';
    setFlsmBaseInput(current.join('.')+cidr);
    if(digits.length===3||(digits.length>0&&parseInt(digits)>25&&digits.length===2)||value.endsWith('.')){
      refs[index+1]?.current?.focus();
    }
  };

  return (
    <View style={ip.container}>
      <Text style={ip.label}>BASE NETWORK ADDRESS</Text>
      <View style={ip.shell}>
        {([0,1,2,3] as const).map((i)=>(
          <React.Fragment key={i}>
            <TextInput
              ref={refs[i]}
              value={parts[i]??''}
              onChangeText={(t)=>updateOctet(i,t)}
              onKeyPress={({nativeEvent})=>{
                if(nativeEvent.key==='Backspace'&&(parts[i]===''||parts[i]===undefined)&&i>0)refs[i-1]?.current?.focus();
              }}
              keyboardType="number-pad" maxLength={3}
              style={ip.octet}
              placeholder={['192','168','1','0'][i]}
              placeholderTextColor="rgba(90,200,250,0.2)"
              selectionColor="#5ac8fa"
            />
            {i<3&&<Text style={ip.dot}>.</Text>}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
const ip = StyleSheet.create({
  container:{gap:8},
  label:{color:'rgba(90,200,250,0.6)',fontSize:10,fontWeight:'800',letterSpacing:2},
  shell:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(2,8,20,0.9)',borderRadius:18,borderWidth:1,borderColor:'rgba(90,200,250,0.18)',paddingHorizontal:14,paddingVertical:8},
  octet:{flex:1,textAlign:'center',color:'#fff',fontSize:22,fontWeight:'900',fontVariant:['tabular-nums'],paddingVertical:8},
  dot:{color:'rgba(90,200,250,0.5)',fontSize:26,fontWeight:'300',marginHorizontal:2},
});

/* ── CIDR Selector (base network) ── */
function BaseCidrSelector() {
  const { flsmBaseInput, setFlsmBaseInput } = useSubnetStore();
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const rawCidr = flsmBaseInput.includes('/') ? parseInt(flsmBaseInput.split('/')[1],10) : 24;
  const common = [8,16,24,25,26,27];

  const setCidr = (c: number) => {
    const rawIp = flsmBaseInput.includes('/') ? flsmBaseInput.split('/')[0] : flsmBaseInput;
    setFlsmBaseInput(`${rawIp}/${c}`);
  };

  return (
    <View style={bc.container}>
      <View style={bc.headerRow}>
        <Text style={bc.label}>BASE CIDR PREFIX</Text>
        <Pressable onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);setEditVal(String(rawCidr));setEditing(true);}} style={bc.badge}>
          <Text style={bc.badgeSlash}>/</Text>
          <Text style={bc.badgeVal}>{rawCidr}</Text>
          <Ionicons name="pencil" size={12} color="rgba(90,200,250,0.5)" style={{marginLeft:4}}/>
        </Pressable>
      </View>
      <View style={bc.chipRow}>
        {common.map((v)=>(
          <Pressable key={v} onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);setCidr(v);}} style={[bc.chip,rawCidr===v&&bc.chipActive]}>
            <Text style={[bc.chipText,rawCidr===v&&bc.chipTextActive]}>/{v}</Text>
          </Pressable>
        ))}
      </View>
      <Modal visible={editing} transparent animationType="fade" onRequestClose={()=>setEditing(false)}>
        <Pressable style={bc.overlay} onPress={()=>setEditing(false)}>
          <View style={bc.editCard}>
            <Text style={bc.editTitle}>Base CIDR</Text>
            <Text style={bc.editSub}>1 – 30</Text>
            <View style={bc.editRow}>
              <Text style={bc.editSlash}>/</Text>
              <TextInput value={editVal} onChangeText={setEditVal} keyboardType="number-pad" maxLength={2} style={bc.editInput} autoFocus selectionColor="#5ac8fa"
                onSubmitEditing={()=>{const n=parseInt(editVal,10);if(!isNaN(n)&&n>=1&&n<=30)setCidr(n);setEditing(false);}}/>
            </View>
            <Pressable onPress={()=>{const n=parseInt(editVal,10);if(!isNaN(n)&&n>=1&&n<=30){Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);setCidr(n);}setEditing(false);}} style={bc.editConfirm}>
              <Text style={bc.editConfirmText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
const bc = StyleSheet.create({
  container:{gap:8},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  label:{color:'rgba(90,200,250,0.6)',fontSize:10,fontWeight:'800',letterSpacing:2},
  badge:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(90,200,250,0.12)',borderWidth:1,borderColor:'rgba(90,200,250,0.25)',borderRadius:12,paddingHorizontal:12,paddingVertical:6},
  badgeSlash:{color:'rgba(90,200,250,0.6)',fontSize:16,fontWeight:'700'},
  badgeVal:{color:'#5ac8fa',fontSize:22,fontWeight:'900',fontVariant:['tabular-nums']},
  chipRow:{flexDirection:'row',gap:6},
  chip:{flex:1,alignItems:'center',paddingVertical:8,borderRadius:12,backgroundColor:'rgba(255,255,255,0.04)',borderWidth:1,borderColor:'rgba(255,255,255,0.06)'},
  chipActive:{backgroundColor:'rgba(90,200,250,0.15)',borderColor:'rgba(90,200,250,0.35)'},
  chipText:{color:'rgba(255,255,255,0.45)',fontSize:13,fontWeight:'800'},
  chipTextActive:{color:'#5ac8fa'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',alignItems:'center',justifyContent:'center'},
  editCard:{backgroundColor:'#0d1f40',borderRadius:24,padding:28,alignItems:'center',gap:14,borderWidth:1,borderColor:'rgba(90,200,250,0.2)',minWidth:220},
  editTitle:{color:'#fff',fontSize:18,fontWeight:'900'},
  editSub:{color:'rgba(255,255,255,0.35)',fontSize:13,fontWeight:'700',marginTop:-8},
  editRow:{flexDirection:'row',alignItems:'center',gap:4},
  editSlash:{color:'rgba(90,200,250,0.6)',fontSize:36,fontWeight:'300'},
  editInput:{color:'#5ac8fa',fontSize:48,fontWeight:'900',fontVariant:['tabular-nums'],minWidth:80,textAlign:'center'},
  editConfirm:{backgroundColor:'rgba(90,200,250,0.18)',borderWidth:1,borderColor:'rgba(90,200,250,0.3)',borderRadius:14,paddingHorizontal:32,paddingVertical:12,width:'100%',alignItems:'center'},
  editConfirmText:{color:'#5ac8fa',fontSize:16,fontWeight:'900'},
});

/* ── Subnet Count Picker ── */
function SubnetCountPicker() {
  const { flsmSubnetCount, setFlsmSubnetCount } = useSubnetStore();
  const count = parseInt(flsmSubnetCount,10) || 4;
  const presets = [2,4,8,16,32];

  return (
    <View style={sc.container}>
      <View style={sc.headerRow}>
        <Text style={sc.label}>NUMBER OF SUBNETS</Text>
        <View style={sc.badge}>
          <Text style={sc.badgeVal}>{count}</Text>
        </View>
      </View>
      <View style={sc.presetRow}>
        {presets.map((v)=>(
          <Pressable key={v} onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);setFlsmSubnetCount(String(v));}} style={[sc.preset,count===v&&sc.presetActive]}>
            <Text style={[sc.presetText,count===v&&sc.presetTextActive]}>{v}</Text>
          </Pressable>
        ))}
      </View>
      <View style={sc.stepRow}>
        <Pressable onPress={()=>{if(count>1){Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);setFlsmSubnetCount(String(count-1));}}} style={sc.stepBtn}>
          <Ionicons name="remove" size={20} color="#5ac8fa"/>
        </Pressable>
        <TextInput
          value={flsmSubnetCount}
          onChangeText={(t)=>setFlsmSubnetCount(t.replace(/[^\d]/g,'').slice(0,3))}
          keyboardType="number-pad" maxLength={3}
          style={sc.customInput}
          placeholder="4" placeholderTextColor="rgba(90,200,250,0.2)"
          selectionColor="#5ac8fa"
        />
        <Pressable onPress={()=>{if(count<512){Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);setFlsmSubnetCount(String(count+1));}}} style={sc.stepBtn}>
          <Ionicons name="add" size={20} color="#5ac8fa"/>
        </Pressable>
      </View>
    </View>
  );
}
const sc = StyleSheet.create({
  container:{gap:10},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  label:{color:'rgba(90,200,250,0.6)',fontSize:10,fontWeight:'800',letterSpacing:2},
  badge:{backgroundColor:'rgba(90,200,250,0.12)',borderWidth:1,borderColor:'rgba(90,200,250,0.25)',borderRadius:12,paddingHorizontal:14,paddingVertical:6},
  badgeVal:{color:'#5ac8fa',fontSize:20,fontWeight:'900',fontVariant:['tabular-nums']},
  presetRow:{flexDirection:'row',gap:6},
  preset:{flex:1,alignItems:'center',paddingVertical:9,borderRadius:12,backgroundColor:'rgba(255,255,255,0.04)',borderWidth:1,borderColor:'rgba(255,255,255,0.06)'},
  presetActive:{backgroundColor:'rgba(90,200,250,0.15)',borderColor:'rgba(90,200,250,0.35)'},
  presetText:{color:'rgba(255,255,255,0.45)',fontSize:14,fontWeight:'800'},
  presetTextActive:{color:'#5ac8fa'},
  stepRow:{flexDirection:'row',alignItems:'center',gap:10},
  stepBtn:{width:44,height:44,borderRadius:14,backgroundColor:'rgba(90,200,250,0.1)',borderWidth:1,borderColor:'rgba(90,200,250,0.2)',alignItems:'center',justifyContent:'center'},
  customInput:{flex:1,textAlign:'center',color:'#fff',fontSize:26,fontWeight:'900',fontVariant:['tabular-nums'],backgroundColor:'rgba(255,255,255,0.04)',borderRadius:14,paddingVertical:10,borderWidth:1,borderColor:'rgba(255,255,255,0.08)'},
});

/* ── Result Card ── */
function FlsmResultCard({ item }: { item: FlsmResult }) {
  const color = CIDR_COLORS[(item.index - 1) % CIDR_COLORS.length];
  const copyValue = (val: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Clipboard.setStringAsync(val);
  };
  return (
    <View style={[frc.card,{borderLeftColor:color,borderLeftWidth:3}]}>
      <View style={frc.top}>
        <View style={frc.topLeft}>
          <Text style={frc.overline}>Subnet {item.index}</Text>
          <Text style={[frc.network,{color}]}>{item.network}/{item.cidr}</Text>
        </View>
        <View style={[frc.cidrPill,{backgroundColor:`${color}20`,borderColor:`${color}40`}]}>
          <Text style={[frc.cidrText,{color}]}>/{item.cidr}</Text>
        </View>
      </View>
      <View style={frc.statsRow}>
        <Pressable onPress={()=>copyValue(item.firstHost)} style={frc.stat}>
          <Text style={frc.statLabel}>FIRST HOST</Text>
          <Text style={frc.statValue}>{item.firstHost}</Text>
        </Pressable>
        <Pressable onPress={()=>copyValue(item.lastHost)} style={frc.stat}>
          <Text style={frc.statLabel}>LAST HOST</Text>
          <Text style={frc.statValue}>{item.lastHost}</Text>
        </Pressable>
      </View>
      <View style={frc.statsRow}>
        <Pressable onPress={()=>copyValue(item.broadcast)} style={frc.stat}>
          <Text style={frc.statLabel}>BROADCAST</Text>
          <Text style={frc.statValue}>{item.broadcast}</Text>
        </Pressable>
        <View style={frc.stat}>
          <Text style={frc.statLabel}>USABLE HOSTS</Text>
          <Text style={[frc.statValue,{color:'#51cf66'}]}>{item.usableHosts.toLocaleString()}</Text>
        </View>
      </View>
      <View style={frc.maskBox}>
        <Text style={frc.maskLabel}>SUBNET MASK</Text>
        <Text style={frc.maskValue}>{item.mask}</Text>
      </View>
    </View>
  );
}
const frc = StyleSheet.create({
  card:{backgroundColor:'rgba(255,255,255,0.03)',borderRadius:20,padding:14,borderWidth:1,borderColor:'rgba(255,255,255,0.06)',gap:10},
  top:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  topLeft:{gap:2},
  overline:{color:'rgba(255,255,255,0.4)',fontSize:10,fontWeight:'700',textTransform:'uppercase',letterSpacing:0.8},
  network:{fontSize:18,fontWeight:'900',fontVariant:['tabular-nums']},
  cidrPill:{borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:6},
  cidrText:{fontSize:15,fontWeight:'900'},
  statsRow:{flexDirection:'row',gap:8},
  stat:{flex:1,backgroundColor:'rgba(255,255,255,0.03)',borderRadius:12,paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderColor:'rgba(255,255,255,0.05)',gap:3},
  statLabel:{color:'rgba(255,255,255,0.35)',fontSize:8,fontWeight:'800',letterSpacing:0.8},
  statValue:{color:'#fff',fontSize:14,fontWeight:'800',fontVariant:['tabular-nums']},
  maskBox:{backgroundColor:'rgba(255,255,255,0.03)',borderRadius:12,paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderColor:'rgba(255,255,255,0.05)',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  maskLabel:{color:'rgba(255,255,255,0.35)',fontSize:9,fontWeight:'800',letterSpacing:0.8},
  maskValue:{color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:'700',fontVariant:['tabular-nums']},
});

/* ── Block Diagram ── */
function FlsmBlockDiagram({ results }: { results: FlsmResult[] }) {
  if(results.length===0)return null;
  return (
    <View style={bd.container}>
      <Text style={bd.title}>Address Block Visualization</Text>
      <View style={bd.grid}>
        {results.map((r,i)=>{
          const color = CIDR_COLORS[i%CIDR_COLORS.length];
          return (
            <View key={i} style={[bd.block,{borderColor:`${color}40`,backgroundColor:`${color}12`}]}>
              <Text style={[bd.blockLabel,{color}]}>#{r.index}</Text>
              <Text style={[bd.blockNet,{color}]}>{r.network}</Text>
              <Text style={bd.blockHosts}>{r.usableHosts} hosts</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const bd = StyleSheet.create({
  container:{gap:10},
  title:{color:'rgba(255,255,255,0.4)',fontSize:10,fontWeight:'800',letterSpacing:1.5},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  block:{width:(SW-64)/2,borderRadius:14,padding:12,borderWidth:1,gap:4},
  blockLabel:{fontSize:10,fontWeight:'800',letterSpacing:1},
  blockNet:{fontSize:14,fontWeight:'900',fontVariant:['tabular-nums']},
  blockHosts:{color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:'700'},
});

/* ── Export Sheet ── */
function FlsmExportSheet({ visible, onClose, results, baseInput }: { visible:boolean; onClose:()=>void; results:FlsmResult[]; baseInput:string }) {
  const [copied, setCopied] = useState<string|null>(null);

  const buildText = () => {
    const lines=[`━━━ SubnetPro FLSM Report ━━━`,`Base Network: ${baseInput}`,`Generated: ${new Date().toLocaleString()}`,`Subnets: ${results.length}`,``];
    results.forEach(r=>{
      lines.push(`── Subnet ${r.index} ──`);
      lines.push(`  Network:    ${r.network}/${r.cidr}`);
      lines.push(`  Range:      ${r.firstHost} → ${r.lastHost}`);
      lines.push(`  Broadcast:  ${r.broadcast}`);
      lines.push(`  Mask:       ${r.mask}`);
      lines.push(`  Usable:     ${r.usableHosts} hosts`);
      lines.push('');
    });
    return lines.join('\n');
  };
  const buildCsv = () => {
    const lines=[`FLSM Layout for ${baseInput}`,'','Subnet,CIDR,Network,First Host,Last Host,Broadcast,Mask,Usable Hosts'];
    results.forEach(r=>lines.push(`${r.index},/${r.cidr},${r.network},${r.firstHost},${r.lastHost},${r.broadcast},${r.mask},${r.usableHosts}`));
    return lines.join('\n');
  };
  const buildJson = () => JSON.stringify({base:baseInput,generatedAt:new Date().toISOString(),subnets:results},null,2);

  const copyWith = (content: string, key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Clipboard.setStringAsync(content);
    setCopied(key);
    setTimeout(()=>setCopied(null),2000);
  };
  const share = async (content: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try { await Share.share({message:content,title:`FLSM Layout (${label})`}); } catch {}
  };

  const formats = [
    {key:'text',label:'Plain Text',icon:'document-text-outline' as const,desc:'Human-readable summary',content:buildText()},
    {key:'csv',label:'CSV Spreadsheet',icon:'grid-outline' as const,desc:'Excel / Google Sheets',content:buildCsv()},
    {key:'json',label:'JSON',icon:'code-slash-outline' as const,desc:'For developers',content:buildJson()},
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={xp.overlay} onPress={onClose}>
        <View style={xp.sheet}>
          <View style={xp.handle}/>
          <Text style={xp.title}>Export FLSM Layout</Text>
          <Text style={xp.subtitle}>{results.length} equal subnets · {baseInput}</Text>
          {formats.map(fmt=>(
            <View key={fmt.key} style={xp.fmtCard}>
              <View style={xp.fmtLeft}>
                <View style={xp.fmtIcon}><Ionicons name={fmt.icon} size={20} color="#5ac8fa"/></View>
                <View>
                  <Text style={xp.fmtLabel}>{fmt.label}</Text>
                  <Text style={xp.fmtDesc}>{fmt.desc}</Text>
                </View>
              </View>
              <View style={xp.fmtActions}>
                <Pressable onPress={()=>copyWith(fmt.content,fmt.key)} style={xp.actionBtn}>
                  <Ionicons name={copied===fmt.key?'checkmark':'copy-outline'} size={16} color={copied===fmt.key?'#51cf66':'#5ac8fa'}/>
                </Pressable>
                <Pressable onPress={()=>share(fmt.content,fmt.label)} style={xp.actionBtn}>
                  <Ionicons name="share-outline" size={16} color="#5ac8fa"/>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable onPress={onClose} style={xp.closeBtn}><Text style={xp.closeBtnText}>Done</Text></Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
const xp = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  sheet:{backgroundColor:'#0d1f40',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,paddingBottom:40,gap:14,borderWidth:1,borderColor:'rgba(90,200,250,0.15)'},
  handle:{width:40,height:4,borderRadius:2,backgroundColor:'rgba(255,255,255,0.15)',alignSelf:'center',marginBottom:4},
  title:{color:'#fff',fontSize:20,fontWeight:'900'},
  subtitle:{color:'rgba(255,255,255,0.4)',fontSize:13,fontWeight:'700',marginTop:-6},
  fmtCard:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:'rgba(255,255,255,0.04)',borderRadius:16,padding:14,borderWidth:1,borderColor:'rgba(255,255,255,0.06)'},
  fmtLeft:{flexDirection:'row',alignItems:'center',gap:12,flex:1},
  fmtIcon:{width:40,height:40,borderRadius:12,backgroundColor:'rgba(90,200,250,0.1)',borderWidth:1,borderColor:'rgba(90,200,250,0.2)',alignItems:'center',justifyContent:'center'},
  fmtLabel:{color:'#fff',fontSize:14,fontWeight:'800'},
  fmtDesc:{color:'rgba(255,255,255,0.4)',fontSize:12,fontWeight:'600',marginTop:2},
  fmtActions:{flexDirection:'row',gap:6},
  actionBtn:{width:36,height:36,borderRadius:10,backgroundColor:'rgba(90,200,250,0.1)',borderWidth:1,borderColor:'rgba(90,200,250,0.2)',alignItems:'center',justifyContent:'center'},
  closeBtn:{backgroundColor:'rgba(90,200,250,0.15)',borderRadius:16,paddingVertical:14,alignItems:'center',borderWidth:1,borderColor:'rgba(90,200,250,0.25)'},
  closeBtnText:{color:'#5ac8fa',fontSize:16,fontWeight:'900'},
});

/* ── Main Screen ── */
export default function FlsmScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [showExport, setShowExport] = useState(false);

  const {
    flsmBaseInput, flsmSubnetCount, flsmResults, flsmError,
    calculateFlsm, clearFlsm, isPremium, hasUsedFreeFlsm,
  } = useSubnetStore();

  // Gate: free users get 1 calculation. After that, Pro required.
  const isGated = !isPremium && hasUsedFreeFlsm;

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollToTop', (tabName: string) => {
      if(tabName==='FLSM') scrollRef.current?.scrollTo({y:0,animated:true});
    });
    return ()=>sub.remove();
  }, []);

  const handleCalculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isGated) {
      navigation.navigate('Paywall');
      return;
    }
    calculateFlsm();
  };

  // Derived info
  const rawIp = flsmBaseInput.includes('/') ? flsmBaseInput.split('/')[0] : flsmBaseInput;
  const rawCidr = flsmBaseInput.includes('/') ? parseInt(flsmBaseInput.split('/')[1],10) : 24;
  const count = parseInt(flsmSubnetCount,10)||4;
  const bits = Math.ceil(Math.log2(Math.max(count,2)));
  const newCidr = rawCidr + bits;
  const subnetSize = newCidr <= 32 ? Math.pow(2, 32-newCidr) : 0;
  const usable = subnetSize > 2 ? subnetSize - 2 : subnetSize;

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030810','#06101f','#040812','#020408']} locations={[0,0.3,0.7,1]} style={StyleSheet.absoluteFillObject}/>

      <ScrollView ref={scrollRef} style={s.scroll}
        contentContainerStyle={[s.content,{paddingTop:Math.max(insets.top+8,28),paddingBottom:120+Math.max(insets.bottom,16)}]}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.headerRow}>
          <View style={{flex:1}}>
            <Text style={s.eyebrow}>EQUAL DIVISION</Text>
            <Text style={s.pageTitle}>FLSM Calculator</Text>
          </View>
          <View style={s.badge}><Ionicons name="layers" size={16} color="#5ac8fa"/></View>
        </View>

        <Text style={s.pageDesc}>
          Fixed-Length Subnet Masking splits a network into equal-sized subnets — perfect for uniform deployments.
        </Text>

        {/* Pro gate banner — shown after free calc is used */}
        {isGated && (
          <Pressable onPress={()=>navigation.navigate('Paywall')} style={s.gateBanner}>
            <Ionicons name="lock-closed" size={16} color="#fcc419"/>
            <View style={{flex:1}}>
              <Text style={s.gateBannerTitle}>Unlock Unlimited Calculations</Text>
              <Text style={s.gateBannerSub}>You've used your free FLSM calculation. Upgrade to Pro for unlimited access.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#fcc419"/>
          </Pressable>
        )}

        {/* Input Card */}
        <View style={s.card}>
          <Text style={s.cardLabel}>NETWORK CONFIGURATION</Text>
          <FlsmIpInput/>
          <View style={s.divider}/>
          <BaseCidrSelector/>
          <View style={s.divider}/>
          <SubnetCountPicker/>
        </View>

        {/* Live Preview */}
        {newCidr <= 30 && subnetSize > 0 && (
          <View style={s.previewCard}>
            <Text style={s.previewLabel}>PREVIEW · {rawIp}/{rawCidr} → {count} × /{newCidr}</Text>
            <View style={s.previewRow}>
              <View style={s.previewStat}><Text style={s.previewStatLabel}>NEW CIDR</Text><Text style={s.previewStatVal}>/{newCidr}</Text></View>
              <View style={s.previewStat}><Text style={s.previewStatLabel}>TOTAL ADDRS</Text><Text style={s.previewStatVal}>{subnetSize.toLocaleString()}</Text></View>
              <View style={s.previewStat}><Text style={s.previewStatLabel}>USABLE/SUBNET</Text><Text style={[s.previewStatVal,{color:'#51cf66'}]}>{usable.toLocaleString()}</Text></View>
            </View>
          </View>
        )}
        {newCidr > 30 && (
          <View style={s.warnCard}>
            <Ionicons name="warning" size={16} color="#fcc419"/>
            <Text style={s.warnText}>/{newCidr} would be too small. Reduce subnet count or use a larger base network.</Text>
          </View>
        )}

        {/* Generate button */}
        <View style={s.actionRow}>
          <Pressable onPress={handleCalculate} style={s.generateBtn}>
            <LinearGradient
              colors={isGated ? ['rgba(252,196,25,0.2)','rgba(252,196,25,0.1)'] : ['#5ac8fa','#3aa8e0']}
              style={s.generateGrad}
            >
              <Ionicons name={isGated ? 'lock-closed' : 'flash'} size={18} color={isGated ? '#fcc419' : '#020408'}/>
              <Text style={[s.generateText, isGated && {color:'#fcc419'}]}>
                {isGated ? 'Pro Required — Upgrade' : 'Calculate Equal Subnets'}
              </Text>
            </LinearGradient>
          </Pressable>
          {flsmResults.length>0&&(
            <Pressable onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);clearFlsm();}} style={s.clearBtn}>
              <Ionicons name="trash-outline" size={20} color="#ff7b80"/>
            </Pressable>
          )}
        </View>

        {!!flsmError && (
          <View style={s.errorCard}>
            <Ionicons name="alert-circle" size={16} color="#ff453a"/>
            <Text style={s.errorText}>{flsmError}</Text>
          </View>
        )}

        {/* Results */}
        {flsmResults.length>0&&(
          <>
            <View style={s.resultsHeader}>
              <Text style={s.resultsTitle}>Equal Subnet Layout</Text>
              <View style={s.resultsBadge}>
                <Text style={s.resultsBadgeText}>{flsmResults.length} × /{flsmResults[0].cidr}</Text>
              </View>
            </View>

            <View style={s.card}>
              <FlsmBlockDiagram results={flsmResults}/>
            </View>

            <View style={s.card}>
              <Text style={s.sectionLabel}>SUBNET DETAILS</Text>
              <Text style={s.tapHint}>Tap First/Last Host or Broadcast to copy</Text>
              <View style={s.resultList}>
                {flsmResults.map(r=><FlsmResultCard key={r.index} item={r}/>)}
              </View>
            </View>

            <Pressable onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (!isPremium) { navigation.navigate('Paywall'); return; }
              setShowExport(true);
            }} style={s.exportBtn}>
              <LinearGradient
                colors={!isPremium ? ['rgba(255,255,255,0.05)','rgba(255,255,255,0.02)'] : ['rgba(90,200,250,0.15)','rgba(90,200,250,0.08)']}
                style={[s.exportGrad, !isPremium && {borderColor:'rgba(255,255,255,0.1)'}]}
              >
                <Ionicons name={isPremium ? 'share-outline' : 'lock-closed'} size={20} color={isPremium ? '#5ac8fa' : 'rgba(255,255,255,0.4)'}/>
                <Text style={[s.exportText, !isPremium && {color:'rgba(255,255,255,0.4)'}]}>
                  {isPremium ? 'Export / Share Results' : 'Pro Feature: Export Results'}
                </Text>
                {isPremium && <Ionicons name="chevron-up" size={16} color="rgba(90,200,250,0.5)"/>}
              </LinearGradient>
            </Pressable>
          </>
        )}

        {flsmResults.length===0&&!flsmError&&(
          <View style={s.empty}>
            <Ionicons name="layers-outline" size={40} color="rgba(255,255,255,0.15)"/>
            <Text style={s.emptyTitle}>No Results Yet</Text>
            <Text style={s.emptyText}>Configure the base network and number of equal subnets, then tap Calculate.</Text>
            {!isPremium && !hasUsedFreeFlsm && (
              <View style={s.freeTrialPill}>
                <Ionicons name="gift-outline" size={14} color="#51cf66"/>
                <Text style={s.freeTrialText}>1 free calculation available</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <FlsmExportSheet visible={showExport} onClose={()=>setShowExport(false)} results={flsmResults} baseInput={flsmBaseInput}/>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#020408'},
  scroll:{flex:1},
  content:{paddingHorizontal:16,gap:12},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},
  eyebrow:{color:'rgba(90,200,250,0.7)',fontSize:10,fontWeight:'800',letterSpacing:2.5,marginBottom:2},
  pageTitle:{color:'#fff',fontSize:24,fontWeight:'900',letterSpacing:-0.5},
  badge:{width:40,height:40,borderRadius:14,backgroundColor:'rgba(90,200,250,0.1)',borderWidth:1,borderColor:'rgba(90,200,250,0.2)',alignItems:'center',justifyContent:'center'},
  pageDesc:{color:'rgba(255,255,255,0.4)',fontSize:13,lineHeight:20,fontWeight:'600',marginTop:-4},
  gateBanner:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'rgba(252,196,25,0.08)',borderRadius:16,padding:14,borderWidth:1,borderColor:'rgba(252,196,25,0.2)'},
  gateBannerTitle:{color:'#fcc419',fontSize:13,fontWeight:'800'},
  gateBannerSub:{color:'rgba(252,196,25,0.7)',fontSize:12,fontWeight:'600',marginTop:2,lineHeight:16},
  card:{backgroundColor:'rgba(10,25,60,0.25)',borderRadius:22,padding:16,borderWidth:1,borderColor:'rgba(255,255,255,0.06)',gap:14},
  cardLabel:{color:'rgba(90,200,250,0.6)',fontSize:10,fontWeight:'800',letterSpacing:2},
  divider:{height:1,backgroundColor:'rgba(90,200,250,0.08)'},
  previewCard:{backgroundColor:'rgba(90,200,250,0.05)',borderRadius:18,padding:14,borderWidth:1,borderColor:'rgba(90,200,250,0.15)',gap:10},
  previewLabel:{color:'rgba(90,200,250,0.6)',fontSize:10,fontWeight:'800',letterSpacing:1.5},
  previewRow:{flexDirection:'row',gap:8},
  previewStat:{flex:1,gap:4},
  previewStatLabel:{color:'rgba(255,255,255,0.35)',fontSize:9,fontWeight:'800',letterSpacing:0.8},
  previewStatVal:{color:'#5ac8fa',fontSize:18,fontWeight:'900'},
  warnCard:{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:'rgba(252,196,25,0.08)',borderRadius:14,padding:12,borderWidth:1,borderColor:'rgba(252,196,25,0.2)'},
  warnText:{color:'#fcc419',fontSize:13,fontWeight:'700',flex:1,lineHeight:18},
  actionRow:{flexDirection:'row',gap:10},
  generateBtn:{flex:1,borderRadius:18,overflow:'hidden'},
  generateGrad:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:16,borderRadius:18,borderWidth:1,borderColor:'transparent'},
  generateText:{color:'#020408',fontSize:17,fontWeight:'900'},
  clearBtn:{width:52,borderRadius:18,backgroundColor:'rgba(255,123,128,0.1)',borderWidth:1,borderColor:'rgba(255,123,128,0.2)',alignItems:'center',justifyContent:'center'},
  errorCard:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'rgba(255,69,58,0.08)',borderRadius:14,padding:12,borderWidth:1,borderColor:'rgba(255,69,58,0.2)'},
  errorText:{color:'#ff453a',fontSize:13,fontWeight:'700',flex:1},
  resultsHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  resultsTitle:{color:'#fff',fontSize:18,fontWeight:'900'},
  resultsBadge:{backgroundColor:'rgba(90,200,250,0.1)',borderRadius:10,paddingHorizontal:12,paddingVertical:5,borderWidth:1,borderColor:'rgba(90,200,250,0.2)'},
  resultsBadgeText:{color:'#5ac8fa',fontSize:13,fontWeight:'800'},
  sectionLabel:{color:'rgba(90,200,250,0.6)',fontSize:10,fontWeight:'800',letterSpacing:2},
  tapHint:{color:'rgba(255,255,255,0.25)',fontSize:11,fontWeight:'600',marginTop:-8},
  resultList:{gap:10},
  exportBtn:{borderRadius:20,overflow:'hidden'},
  exportGrad:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,paddingVertical:16,borderRadius:20,borderWidth:1},
  exportText:{fontSize:16,fontWeight:'900',flex:1,textAlign:'center'},
  empty:{alignItems:'center',gap:8,paddingVertical:48},
  emptyTitle:{color:'rgba(255,255,255,0.5)',fontSize:16,fontWeight:'800'},
  emptyText:{color:'rgba(255,255,255,0.35)',fontSize:13,textAlign:'center',lineHeight:20,maxWidth:'80%'},
  freeTrialPill:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(81,207,102,0.1)',borderRadius:20,paddingHorizontal:14,paddingVertical:7,borderWidth:1,borderColor:'rgba(81,207,102,0.2)',marginTop:4},
  freeTrialText:{color:'#51cf66',fontSize:12,fontWeight:'800'},
});
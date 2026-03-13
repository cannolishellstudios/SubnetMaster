import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View, Dimensions,
  Share, DeviceEventEmitter, Modal, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useSubnetStore, type VlsmResult } from '../store/useSubnetStore';

const { width: SW } = Dimensions.get('window');

/* ── Pie Chart ── */
function polarToCartesian(cx:number,cy:number,r:number,deg:number){const rad=((deg-90)*Math.PI)/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};}
function describeArc(cx:number,cy:number,r:number,startDeg:number,endDeg:number){const start=polarToCartesian(cx,cy,r,endDeg);const end=polarToCartesian(cx,cy,r,startDeg);const largeArc=endDeg-startDeg>180?1:0;return`M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;}

function VlsmPieChart({ results, totalSpace }: { results: VlsmResult[]; totalSpace: number }) {
  const size = Math.min(SW - 80, 240);
  const cx = size/2, cy = size/2, r = size/2-6, innerR = r*0.55;
  let usedTotal = 0;
  for(const res of results) usedTotal += Math.pow(2, 32-res.cidr);
  const freeSpace = totalSpace - usedTotal;
  const freePct = totalSpace > 0 ? (freeSpace/totalSpace)*100 : 0;
  const slices: {color:string;startDeg:number;endDeg:number}[] = [];
  let currentDeg = 0;
  for(const res of results){
    const pct=(Math.pow(2,32-res.cidr)/totalSpace)*100;
    const sweep=(pct/100)*360;
    slices.push({color:res.color,startDeg:currentDeg,endDeg:currentDeg+Math.max(sweep,0.5)});
    currentDeg+=sweep;
  }
  if(freeSpace>0) slices.push({color:'rgba(255,255,255,0.06)',startDeg:currentDeg,endDeg:360});
  return (
    <View style={pie.container}>
      <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.03)"/>
          {slices.map((sl,i)=>{
            if(sl.endDeg-sl.startDeg<0.3)return null;
            const path=sl.endDeg-sl.startDeg>=359.9?`M ${cx} ${cy-r} A ${r} ${r} 0 1 1 ${cx-0.01} ${cy-r} Z`:describeArc(cx,cy,r,sl.startDeg,sl.endDeg);
            return<Path key={i} d={path} fill={sl.color} stroke="#020408" strokeWidth={1.5}/>;
          })}
          <Circle cx={cx} cy={cy} r={innerR} fill="#020408"/>
        </Svg>
        <View style={[pie.centerLabel,{width:innerR*2,height:innerR*2}]}>
          <Text style={pie.centerCount}>{results.length} subnets</Text>
          <Text style={pie.centerFree}>{freeSpace.toLocaleString()} free</Text>
        </View>
      </View>
      <View style={pie.legend}>
        {results.map((res,i)=>(
          <View key={i} style={pie.legendItem}>
            <View style={[pie.legendDot,{backgroundColor:res.color}]}/>
            <Text style={pie.legendLabel} numberOfLines={1}>{res.label}</Text>
            <Text style={[pie.legendPct,{color:res.color}]}>/{res.cidr}</Text>
            <Text style={pie.legendPct}>{res.percentage.toFixed(1)}%</Text>
          </View>
        ))}
        {freeSpace>0&&(<View style={pie.legendItem}><View style={[pie.legendDot,{backgroundColor:'rgba(255,255,255,0.15)'}]}/><Text style={pie.legendLabel}>Unallocated</Text><Text style={pie.legendPct}>{freePct.toFixed(1)}%</Text></View>)}
      </View>
    </View>
  );
}
const pie = StyleSheet.create({
  container:{alignItems:'center',gap:14},
  centerLabel:{position:'absolute',alignItems:'center',justifyContent:'center'},
  centerCount:{color:'#ffffff',fontSize:14,fontWeight:'900'},
  centerFree:{color:'#5ac8fa',fontSize:13,fontWeight:'800',marginTop:2},
  legend:{width:'100%',gap:6},
  legendItem:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:4},
  legendDot:{width:12,height:12,borderRadius:4},
  legendLabel:{flex:1,color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:'700'},
  legendPct:{color:'rgba(255,255,255,0.5)',fontSize:13,fontWeight:'800',fontVariant:['tabular-nums']},
});

/* ── Utilization Bar ── */
function UtilizationBar({ results, totalSpace }: { results: VlsmResult[]; totalSpace: number }) {
  if(totalSpace===0)return null;
  const usedPct = results.reduce((s,r)=>s+(Math.pow(2,32-r.cidr)/totalSpace)*100,0);
  return (
    <View style={{gap:6}}>
      <View style={{flexDirection:'row',justifyContent:'space-between'}}>
        <Text style={{color:'rgba(255,255,255,0.35)',fontSize:9,fontWeight:'800',letterSpacing:1.5}}>ADDRESS SPACE UTILIZATION</Text>
        <Text style={{color:'#5ac8fa',fontSize:9,fontWeight:'800'}}>{usedPct.toFixed(1)}% used</Text>
      </View>
      <View style={{height:10,borderRadius:5,backgroundColor:'rgba(255,255,255,0.04)',flexDirection:'row',overflow:'hidden'}}>
        {results.map((res,i)=>(
          <View key={i} style={{width:`${(Math.pow(2,32-res.cidr)/totalSpace)*100}%`,height:'100%',backgroundColor:res.color}}/>
        ))}
      </View>
    </View>
  );
}

/* ── Free Space Analysis ── */
function FreeSpaceAnalysis({ freeSpace }: { freeSpace: number }) {
  if(freeSpace<=0)return null;
  const blocks:{cidr:number;hosts:number}[]=[];
  let remaining=freeSpace;
  for(let cidr=0;cidr<=32;cidr++){
    const blockSize=Math.pow(2,32-cidr);
    while(remaining>=blockSize){blocks.push({cidr,hosts:blockSize});remaining-=blockSize;}
  }
  const grouped: Record<number,{count:number;hosts:number}>={};
  blocks.forEach(b=>{if(!grouped[b.cidr])grouped[b.cidr]={count:0,hosts:b.hosts};grouped[b.cidr].count++;});
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>Available Capacity</Text>
      <Text style={s.capacityDesc}>You have {freeSpace.toLocaleString()} unused addresses that fit these subnets:</Text>
      <View style={s.capacityList}>
        {Object.keys(grouped).map(cidrStr=>{
          const cidr=Number(cidrStr); const item=grouped[cidr];
          return (
            <View key={cidr} style={s.capacityRow}>
              <View style={{flexDirection:'row',gap:6,alignItems:'center'}}>
                <View style={s.capacityBadge}><Text style={s.capacityBadgeText}>{item.count}×</Text></View>
                <Text style={s.capacityCidr}>/{cidr} Subnet{item.count>1?'s':''}</Text>
              </View>
              <Text style={s.capacityHosts}>{item.hosts.toLocaleString()} addrs</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ── Result Card ── */
function VlsmResultCard({ item, index }: { item: VlsmResult; index: number }) {
  const eff = item.allocatedHosts > 0 ? Math.round((item.requestedHosts/item.allocatedHosts)*100) : 0;
  const effColor = eff >= 90 ? '#51cf66' : eff >= 60 ? '#fcc419' : '#ff7b80';
  return (
    <View style={[rc.card,{borderLeftColor:item.color,borderLeftWidth:3}]}>
      <View style={rc.top}>
        <View><Text style={rc.overline}>Subnet {index+1}</Text><Text style={rc.label}>{item.label}</Text></View>
        <View style={[rc.cidrPill,{backgroundColor:`${item.color}20`,borderColor:`${item.color}40`}]}>
          <Text style={[rc.cidrText,{color:item.color}]}>/{item.cidr}</Text>
        </View>
      </View>
      <Text style={[rc.network,{color:item.color}]}>{item.network}</Text>
      <View style={rc.statsRow}>
        <View style={rc.stat}><Text style={rc.statLabel}>HOSTS NEEDED</Text><Text style={rc.statValue}>{item.requestedHosts}</Text></View>
        <View style={rc.stat}><Text style={rc.statLabel}>ALLOCATED</Text><Text style={[rc.statValue,{color:item.color}]}>{item.allocatedHosts}</Text></View>
        <View style={rc.stat}><Text style={rc.statLabel}>EFFICIENCY</Text><Text style={[rc.statValue,{color:effColor}]}>{eff}%</Text></View>
      </View>
      <View style={rc.rangeBox}><Text style={rc.rangeLabel}>USABLE RANGE</Text><Text style={rc.rangeValue}>{item.firstHost}  →  {item.lastHost}</Text></View>
      <View style={rc.rangeBox}><Text style={rc.rangeLabel}>BROADCAST</Text><Text style={rc.rangeValue}>{item.broadcast}</Text></View>
    </View>
  );
}
const rc = StyleSheet.create({
  card:{backgroundColor:'rgba(255,255,255,0.03)',borderRadius:20,padding:14,borderWidth:1,borderColor:'rgba(255,255,255,0.06)',gap:10},
  top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  overline:{color:'rgba(255,255,255,0.4)',fontSize:10,fontWeight:'700',textTransform:'uppercase',letterSpacing:0.8},
  label:{color:'#fff',fontSize:18,fontWeight:'900'},
  cidrPill:{borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:6},
  cidrText:{fontSize:15,fontWeight:'900'},
  network:{fontSize:20,fontWeight:'900'},
  statsRow:{flexDirection:'row',gap:8},
  stat:{flex:1,backgroundColor:'rgba(255,255,255,0.03)',borderRadius:12,paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderColor:'rgba(255,255,255,0.05)'},
  statLabel:{color:'rgba(255,255,255,0.35)',fontSize:8,fontWeight:'800',letterSpacing:0.8,marginBottom:3},
  statValue:{color:'#fff',fontSize:15,fontWeight:'900'},
  rangeBox:{backgroundColor:'rgba(255,255,255,0.03)',borderRadius:12,paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderColor:'rgba(255,255,255,0.05)'},
  rangeLabel:{color:'rgba(255,255,255,0.35)',fontSize:9,fontWeight:'800',letterSpacing:0.8,marginBottom:3},
  rangeValue:{color:'#fff',fontSize:13,fontWeight:'700'},
});

/* ── Export Helpers ── */
function buildCsvContent(results: VlsmResult[], baseInput: string, cidr: string): string {
  const lines=[`VLSM Layout for ${baseInput}/${cidr}`,''];
  lines.push('Subnet,Label,CIDR,Network,First Host,Last Host,Broadcast,Hosts Needed,Allocated,Efficiency');
  results.forEach((r,i)=>{
    const eff=r.allocatedHosts>0?Math.round((r.requestedHosts/r.allocatedHosts)*100):0;
    lines.push(`${i+1},${r.label},/${r.cidr},${r.network},${r.firstHost},${r.lastHost},${r.broadcast},${r.requestedHosts},${r.allocatedHosts},${eff}%`);
  });
  return lines.join('\n');
}
function buildTextReport(results: VlsmResult[], baseInput: string, cidr: string): string {
  const lines=[`━━━ SubnetPro VLSM Report ━━━`,`Base Network: ${baseInput}/${cidr}`,`Generated: ${new Date().toLocaleString()}`,`Subnets: ${results.length}`,``];
  results.forEach((r,i)=>{
    const eff=r.allocatedHosts>0?Math.round((r.requestedHosts/r.allocatedHosts)*100):0;
    lines.push(`── Subnet ${i+1}: ${r.label} ──`);
    lines.push(`  CIDR:       ${r.network}/${r.cidr}`);
    lines.push(`  Usable:     ${r.firstHost} → ${r.lastHost}`);
    lines.push(`  Broadcast:  ${r.broadcast}`);
    lines.push(`  Hosts:      ${r.requestedHosts} needed / ${r.allocatedHosts} allocated (${eff}% efficiency)`);
    lines.push('');
  });
  return lines.join('\n');
}
function buildJsonContent(results: VlsmResult[], baseInput: string, cidr: string): string {
  return JSON.stringify({
    base:`${baseInput}/${cidr}`,
    generatedAt:new Date().toISOString(),
    subnets:results.map((r,i)=>({
      index:i+1,label:r.label,cidr:r.cidr,network:r.network,
      firstHost:r.firstHost,lastHost:r.lastHost,broadcast:r.broadcast,
      hostsNeeded:r.requestedHosts,hostsAllocated:r.allocatedHosts,
      efficiency:`${r.allocatedHosts>0?Math.round((r.requestedHosts/r.allocatedHosts)*100):0}%`,
    })),
  },null,2);
}

/* ── Export Sheet ── */
function ExportSheet({ visible, onClose, results, baseInput, cidr }: { visible:boolean; onClose:()=>void; results:VlsmResult[]; baseInput:string; cidr:string }) {
  const [copied, setCopied] = useState<string|null>(null);
  const copyWith = (content: string, type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Clipboard.setStringAsync(content);
    setCopied(type);
    setTimeout(()=>setCopied(null),2000);
  };
  const share = async (content: string, type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try { await Share.share({ message:content, title:`VLSM Layout (${type})` }); } catch {}
  };

  const csv = buildCsvContent(results, baseInput, cidr);
  const text = buildTextReport(results, baseInput, cidr);
  const json = buildJsonContent(results, baseInput, cidr);

  const formats = [
    { key:'text', label:'Plain Text Report', icon:'document-text-outline' as const, desc:'Human-readable summary', content:text },
    { key:'csv', label:'CSV Spreadsheet', icon:'grid-outline' as const, desc:'Import into Excel / Sheets', content:csv },
    { key:'json', label:'JSON Data', icon:'code-slash-outline' as const, desc:'For developers & automation', content:json },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={exp.overlay} onPress={onClose}>
        <View style={exp.sheet}>
          <View style={exp.handle}/>
          <Text style={exp.title}>Export Layout</Text>
          <Text style={exp.subtitle}>{results.length} subnets · {baseInput}/{cidr}</Text>
          <View style={exp.formatList}>
            {formats.map(fmt=>(
              <View key={fmt.key} style={exp.fmtCard}>
                <View style={exp.fmtLeft}>
                  <View style={exp.fmtIcon}><Ionicons name={fmt.icon} size={20} color="#5ac8fa"/></View>
                  <View>
                    <Text style={exp.fmtLabel}>{fmt.label}</Text>
                    <Text style={exp.fmtDesc}>{fmt.desc}</Text>
                  </View>
                </View>
                <View style={exp.fmtActions}>
                  <Pressable onPress={()=>copyWith(fmt.content, fmt.key)} style={exp.actionBtn}>
                    <Ionicons name={copied===fmt.key?'checkmark':'copy-outline'} size={16} color={copied===fmt.key?'#51cf66':'#5ac8fa'}/>
                  </Pressable>
                  <Pressable onPress={()=>share(fmt.content, fmt.label)} style={exp.actionBtn}>
                    <Ionicons name="share-outline" size={16} color="#5ac8fa"/>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          <Pressable onPress={onClose} style={exp.closeBtn}><Text style={exp.closeBtnText}>Done</Text></Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
const exp = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  sheet:{backgroundColor:'#0d1f40',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,paddingBottom:40,gap:16,borderWidth:1,borderColor:'rgba(90,200,250,0.15)'},
  handle:{width:40,height:4,borderRadius:2,backgroundColor:'rgba(255,255,255,0.15)',alignSelf:'center',marginBottom:4},
  title:{color:'#fff',fontSize:20,fontWeight:'900'},
  subtitle:{color:'rgba(255,255,255,0.4)',fontSize:13,fontWeight:'700',marginTop:-8},
  formatList:{gap:10},
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

/* ── Segmented IPv4 for VLSM base ── */
function VlsmBaseInput() {
  const { vlsmBaseInput, vlsmCidrInput, setVlsmBaseInput, setVlsmCidr, error } = useSubnetStore();
  const refs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const [editingCidr, setEditingCidr] = useState(false);
  const [cidrEdit, setCidrEdit] = useState('');

  const ipParts = vlsmBaseInput.split('.');

  const updateOctet = (index: number, value: string) => {
    const digits = value.replace(/[^0-9]/g,'').slice(0,3);
    const current = vlsmBaseInput.split('.');
    while(current.length<4) current.push('0');
    current[index]=digits;
    setVlsmBaseInput(current.join('.'));
    if(digits.length===3||(digits.length>0&&parseInt(digits)>25&&digits.length===2)||value.endsWith('.')){
      refs[index+1]?.current?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if(key==='Backspace'&&(ipParts[index]===''||ipParts[index]===undefined)&&index>0){
      refs[index-1]?.current?.focus();
    }
  };

  const openCidrEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCidrEdit(vlsmCidrInput);
    setEditingCidr(true);
  };

  return (
    <View style={vbi.container}>
      <View style={vbi.row}>
        <View style={vbi.ipWrap}>
          <Text style={vbi.fieldLabel}>BASE NETWORK IP</Text>
          <View style={[vbi.shell, error && {borderColor:'#ff453a'}]}>
            {([0,1,2,3] as const).map((i)=>(
              <React.Fragment key={i}>
                <TextInput
                  ref={refs[i]}
                  value={ipParts[i]??''}
                  onChangeText={(t)=>updateOctet(i,t)}
                  onKeyPress={({nativeEvent})=>handleKeyPress(i,nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={vbi.octetInput}
                  placeholderTextColor="rgba(90,200,250,0.2)"
                  placeholder={['192','168','10','0'][i]}
                  selectionColor="#5ac8fa"
                />
                {i<3&&<Text style={vbi.dot}>.</Text>}
              </React.Fragment>
            ))}
          </View>
        </View>
        <View style={vbi.cidrWrap}>
          <Text style={vbi.fieldLabel}>CIDR</Text>
          <Pressable onPress={openCidrEdit} style={vbi.cidrBadge}>
            <Text style={vbi.cidrSlash}>/</Text>
            <Text style={vbi.cidrVal}>{vlsmCidrInput}</Text>
            <Ionicons name="pencil" size={12} color="rgba(90,200,250,0.5)" style={{marginLeft:3}}/>
          </Pressable>
        </View>
      </View>
      <Modal visible={editingCidr} transparent animationType="fade" onRequestClose={()=>setEditingCidr(false)}>
        <Pressable style={vbi.overlay} onPress={()=>setEditingCidr(false)}>
          <View style={vbi.editCard}>
            <Text style={vbi.editTitle}>Base Network CIDR</Text>
            <Text style={vbi.editSub}>1 – 30</Text>
            <View style={vbi.editRow}>
              <Text style={vbi.editSlash}>/</Text>
              <TextInput value={cidrEdit} onChangeText={setCidrEdit} keyboardType="number-pad" maxLength={2} style={vbi.editInput} autoFocus selectionColor="#5ac8fa" onSubmitEditing={()=>{const n=parseInt(cidrEdit,10);if(!isNaN(n)&&n>=1&&n<=30){setVlsmCidr(String(n));}setEditingCidr(false);}}/>
            </View>
            <Pressable onPress={()=>{const n=parseInt(cidrEdit,10);if(!isNaN(n)&&n>=1&&n<=30){Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);setVlsmCidr(String(n));}setEditingCidr(false);}} style={vbi.editConfirm}>
              <Text style={vbi.editConfirmText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
const vbi = StyleSheet.create({
  container:{gap:8},
  row:{flexDirection:'row',gap:10,alignItems:'flex-end'},
  ipWrap:{flex:1,gap:6},
  cidrWrap:{gap:6,alignItems:'center'},
  fieldLabel:{color:'rgba(90,200,250,0.6)',fontSize:10,fontWeight:'800',letterSpacing:2},
  shell:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(2,8,20,0.9)',borderRadius:16,borderWidth:1,borderColor:'rgba(90,200,250,0.18)',paddingHorizontal:10,paddingVertical:6},
  octetInput:{flex:1,textAlign:'center',color:'#fff',fontSize:17,fontWeight:'900',fontVariant:['tabular-nums'],paddingVertical:8},
  dot:{color:'rgba(90,200,250,0.5)',fontSize:20,fontWeight:'300',marginHorizontal:1},
  cidrBadge:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(90,200,250,0.12)',borderWidth:1,borderColor:'rgba(90,200,250,0.25)',borderRadius:14,paddingHorizontal:12,paddingVertical:12},
  cidrSlash:{color:'rgba(90,200,250,0.6)',fontSize:14,fontWeight:'700'},
  cidrVal:{color:'#5ac8fa',fontSize:20,fontWeight:'900',fontVariant:['tabular-nums']},
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

/* ── Main Screen ── */
export default function VlsmScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [showExport, setShowExport] = useState(false);

  const {
    vlsmBaseInput, vlsmCidrInput, vlsmRequests, vlsmResults, vlsmTotalSpace, vlsmUsedSpace, error,
    addVlsmRequest, updateVlsmRequest, removeVlsmRequest, calculateVlsmLayout, clearVlsm,
    isPremium, hasUsedFreeVlsm,
  } = useSubnetStore();

  // Gate: free users get 1 calculation. After that, Pro required.
  const isGated = !isPremium && hasUsedFreeVlsm;

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('scrollToTop', (tabName: string) => {
      if(tabName==='VLSM') scrollRef.current?.scrollTo({y:0,animated:true});
    });
    return ()=>sub.remove();
  }, []);

  const handleGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (isGated) {
      navigation.navigate('Paywall');
      return;
    }
    calculateVlsmLayout();
  };

  const totalRequestedHosts = useMemo(()=>vlsmRequests.reduce((sum,item)=>sum+(parseInt(item.hosts||'0',10)||0),0),[vlsmRequests]);
  const hostsAvailableLive = useMemo(()=>{
    const baseCidr=parseInt(vlsmCidrInput||'24',10);
    const total=Math.pow(2,32-(isNaN(baseCidr)?24:baseCidr));
    return Math.max(0,total-totalRequestedHosts);
  },[vlsmCidrInput,totalRequestedHosts]);

  return (
    <View style={s.container}>
      <LinearGradient colors={['#030810','#06101f','#040812','#020408']} locations={[0,0.3,0.7,1]} style={StyleSheet.absoluteFillObject}/>
      <ScrollView ref={scrollRef} style={s.scroll}
        contentContainerStyle={[s.content,{paddingTop:Math.max(insets.top+8,28),paddingBottom:120+Math.max(insets.bottom,16)}]}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={s.headerRow}>
          <View><Text style={s.eyebrow}>NETWORK DESIGN</Text><Text style={s.pageTitle}>VLSM Calculator</Text></View>
          <View style={s.badgePill}><Ionicons name="git-network" size={16} color="#5ac8fa"/></View>
        </View>

        {/* Pro gate banner — shown after free calc is used */}
        {isGated && (
          <Pressable onPress={()=>navigation.navigate('Paywall')} style={s.gateBanner}>
            <Ionicons name="lock-closed" size={16} color="#fcc419"/>
            <View style={{flex:1}}>
              <Text style={s.gateBannerTitle}>Unlock Unlimited Calculations</Text>
              <Text style={s.gateBannerSub}>You've used your free VLSM calculation. Upgrade to Pro for unlimited access.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#fcc419"/>
          </Pressable>
        )}

        {/* Base network */}
        <View style={s.card}>
          <Text style={s.cardLabel}>MAJOR NETWORK</Text>
          <VlsmBaseInput/>
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>HOSTS NEEDED</Text>
              <Text style={s.statValue}>{totalRequestedHosts.toLocaleString()}</Text>
            </View>
            <View style={s.statBox}>
              <Text style={s.statLabel}>REMAINING</Text>
              <Text style={[s.statValue,{color:hostsAvailableLive<0?'#ff7b80':'#5ac8fa'}]}>{hostsAvailableLive.toLocaleString()}</Text>
            </View>
          </View>
          {hostsAvailableLive < 0 && (
            <View style={s.warningRow}>
              <Ionicons name="warning" size={14} color="#fcc419"/>
              <Text style={s.warningText}>Requested hosts exceed the base network capacity</Text>
            </View>
          )}
        </View>

        {/* Requests */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Subnet Requirements</Text>
            <Pressable onPress={()=>{
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // FREEMIUM CHECK: Limit to 3 subnets if not pro
              if (!isPremium && vlsmRequests.length >= 3) {
                navigation.navigate('Paywall');
                return;
              }
              addVlsmRequest();
            }} style={s.addBtn}>
              {!isPremium && vlsmRequests.length >= 3 ? (
                <Ionicons name="lock-closed" size={14} color="#fcc419"/>
              ) : (
                <Ionicons name="add" size={18} color="#5ac8fa"/>
              )}
              <Text style={[s.addBtnText, !isPremium && vlsmRequests.length >= 3 && {color: '#fcc419'}]}>
                Add
              </Text>
            </Pressable>
          </View>

          {/* Header labels */}
          <View style={s.reqHeader}>
            <Text style={[s.reqHeaderLabel,{flex:1.4}]}>NAME</Text>
            <Text style={[s.reqHeaderLabel,{width:90,textAlign:'center'}]}>HOSTS NEEDED</Text>
            <View style={{width:34}}/>
          </View>

          <View style={s.requestList}>
            {vlsmRequests.map((item)=>(
              <View key={item.id} style={[s.requestRow,{borderLeftColor:item.color,borderLeftWidth:3}]}>
                <View style={s.requestLeft}>
                  <View style={[s.colorDot,{backgroundColor:item.color}]}/>
                  <View style={s.nameWrapper}>
                    <TextInput value={item.label} onChangeText={(t)=>updateVlsmRequest(item.id,{label:t})}
                      placeholder="Name" placeholderTextColor="rgba(255,255,255,0.2)" style={s.nameInput}/>
                  </View>
                  <View style={s.hostsWrapper}>
                    <TextInput value={item.hosts}
                      onChangeText={(t)=>updateVlsmRequest(item.id,{hosts:t.replace(/[^\d]/g,'')})}
                      placeholder="Hosts" placeholderTextColor="rgba(255,255,255,0.2)"
                      keyboardType="number-pad" style={s.hostsInput}/>
                  </View>
                </View>
                <Pressable onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);removeVlsmRequest(item.id);}} style={s.removeBtn}>
                  <Ionicons name="close" size={16} color="#ff7b80"/>
                </Pressable>
              </View>
            ))}
          </View>

          <View style={s.actionRow}>
            <Pressable onPress={handleGenerate} style={s.generateBtn}>
              <LinearGradient
                colors={isGated ? ['rgba(252,196,25,0.2)','rgba(252,196,25,0.1)'] : ['#5ac8fa','#3aa8e0']}
                style={s.generateGrad}
              >
                <Ionicons name={isGated ? 'lock-closed' : 'flash'} size={18} color={isGated ? '#fcc419' : '#020408'}/>
                <Text style={[s.generateText, isGated && {color:'#fcc419'}]}>
                  {isGated ? 'Pro Required — Upgrade' : 'Generate Layout'}
                </Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={()=>{Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);clearVlsm();}} style={s.clearBtn}>
              <Ionicons name="trash-outline" size={20} color="#ff7b80"/>
            </Pressable>
          </View>
          {error?<Text style={s.error}>{error}</Text>:null}

          {!isPremium && !hasUsedFreeVlsm && (
            <View style={s.freeTrialPill}>
              <Ionicons name="gift-outline" size={14} color="#51cf66"/>
              <Text style={s.freeTrialText}>1 free calculation available</Text>
            </View>
          )}
        </View>

        {/* Results */}
        {vlsmResults.length > 0 && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Address Space Allocation</Text>
              <VlsmPieChart results={vlsmResults} totalSpace={vlsmTotalSpace}/>
              <UtilizationBar results={vlsmResults} totalSpace={vlsmTotalSpace}/>
            </View>

            <FreeSpaceAnalysis freeSpace={vlsmTotalSpace-vlsmUsedSpace}/>

            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Calculated Layout</Text>
                <View style={s.readyPill}><Text style={s.readyText}>{vlsmResults.length} subnets</Text></View>
              </View>
              <View style={s.resultsList}>
                {vlsmResults.map((item,i)=><VlsmResultCard key={`${item.label}-${item.network}`} item={item} index={i}/>)}
              </View>
            </View>

            <Pressable onPress={()=>{
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // FREEMIUM CHECK: Lock Exports
              if (!isPremium) {
                navigation.navigate('Paywall');
                return;
              }
              setShowExport(true);
            }} style={s.exportMainBtn}>
              <LinearGradient colors={!isPremium ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['rgba(90,200,250,0.15)','rgba(90,200,250,0.08)']} style={[s.exportMainGrad, !isPremium && { borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name={isPremium ? "share-outline" : "lock-closed"} size={20} color={isPremium ? "#5ac8fa" : "rgba(255,255,255,0.4)"}/>
                <Text style={[s.exportMainText, !isPremium && { color: 'rgba(255,255,255,0.4)' }]}>
                  {isPremium ? 'Export / Share Results' : 'Pro Feature: Export Results'}
                </Text>
                {isPremium && <Ionicons name="chevron-up" size={16} color="rgba(90,200,250,0.5)"/>}
              </LinearGradient>
            </Pressable>
          </>
        )}

        {vlsmResults.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="git-network-outline" size={40} color="rgba(255,255,255,0.15)"/>
            <Text style={s.emptyTitle}>No Layout Generated</Text>
            <Text style={s.emptyText}>Add subnet requirements above, then tap Generate Layout to create an efficient VLSM allocation plan.</Text>
          </View>
        )}
      </ScrollView>

      <ExportSheet visible={showExport} onClose={()=>setShowExport(false)} results={vlsmResults} baseInput={vlsmBaseInput} cidr={vlsmCidrInput}/>
    </View>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#020408'},
  scroll:{flex:1},
  content:{paddingHorizontal:16,gap:12},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  eyebrow:{color:'rgba(90,200,250,0.7)',fontSize:10,fontWeight:'800',letterSpacing:2.5,marginBottom:2},
  pageTitle:{color:'#fff',fontSize:24,fontWeight:'900',letterSpacing:-0.5},
  badgePill:{width:40,height:40,borderRadius:14,backgroundColor:'rgba(90,200,250,0.1)',borderWidth:1,borderColor:'rgba(90,200,250,0.2)',alignItems:'center',justifyContent:'center'},
  gateBanner:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'rgba(252,196,25,0.08)',borderRadius:16,padding:14,borderWidth:1,borderColor:'rgba(252,196,25,0.2)'},
  gateBannerTitle:{color:'#fcc419',fontSize:13,fontWeight:'800'},
  gateBannerSub:{color:'rgba(252,196,25,0.7)',fontSize:12,fontWeight:'600',marginTop:2,lineHeight:16},
  card:{backgroundColor:'rgba(10,25,60,0.25)',borderRadius:22,padding:16,borderWidth:1,borderColor:'rgba(255,255,255,0.06)',gap:12},
  cardLabel:{color:'rgba(90,200,250,0.6)',fontSize:10,fontWeight:'800',letterSpacing:2},
  cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  cardTitle:{color:'#fff',fontSize:17,fontWeight:'900'},
  statsRow:{flexDirection:'row',gap:8},
  statBox:{flex:1,backgroundColor:'rgba(90,200,250,0.06)',borderRadius:14,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:'rgba(90,200,250,0.12)'},
  statLabel:{color:'rgba(255,255,255,0.4)',fontSize:9,fontWeight:'800',letterSpacing:0.8,marginBottom:3},
  statValue:{color:'#5ac8fa',fontSize:18,fontWeight:'900'},
  warningRow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(252,196,25,0.08)',borderRadius:10,padding:10,borderWidth:1,borderColor:'rgba(252,196,25,0.2)'},
  warningText:{color:'#fcc419',fontSize:12,fontWeight:'700',flex:1},
  reqHeader:{flexDirection:'row',alignItems:'center',paddingHorizontal:6,marginBottom:-4},
  reqHeaderLabel:{color:'rgba(255,255,255,0.3)',fontSize:9,fontWeight:'800',letterSpacing:1},
  addBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'rgba(90,200,250,0.1)',borderWidth:1,borderColor:'rgba(90,200,250,0.2)',borderRadius:12,paddingHorizontal:12,paddingVertical:8},
  addBtnText:{color:'#5ac8fa',fontSize:14,fontWeight:'800'},
  requestList:{gap:8},
  requestRow:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(255,255,255,0.025)',borderRadius:16,paddingVertical:6,paddingHorizontal:10,borderWidth:1,borderColor:'rgba(255,255,255,0.04)'},
  requestLeft:{flex:1,flexDirection:'row',alignItems:'center',gap:8},
  colorDot:{width:10,height:10,borderRadius:5},
  nameWrapper:{flex:1.2},
  hostsWrapper:{width:88},
  nameInput:{backgroundColor:'rgba(6,10,20,0.9)',borderRadius:12,borderWidth:1,borderColor:'rgba(255,255,255,0.06)',color:'#fff',fontSize:15,fontWeight:'700',paddingHorizontal:12,paddingVertical:10},
  hostsInput:{backgroundColor:'rgba(6,10,20,0.9)',borderRadius:12,borderWidth:1,borderColor:'rgba(255,255,255,0.06)',color:'#fff',fontSize:15,fontWeight:'700',paddingHorizontal:8,paddingVertical:10,textAlign:'center'},
  removeBtn:{width:34,height:34,borderRadius:12,backgroundColor:'rgba(255,90,95,0.08)',borderWidth:1,borderColor:'rgba(255,90,95,0.15)',alignItems:'center',justifyContent:'center'},
  actionRow:{flexDirection:'row',gap:10,marginTop:4},
  generateBtn:{flex:1,borderRadius:18,overflow:'hidden'},
  generateGrad:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:16},
  generateText:{color:'#020408',fontSize:17,fontWeight:'900'},
  clearBtn:{width:52,borderRadius:18,backgroundColor:'rgba(255,123,128,0.1)',borderWidth:1,borderColor:'rgba(255,123,128,0.2)',alignItems:'center',justifyContent:'center'},
  freeTrialPill:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(81,207,102,0.1)',borderRadius:20,paddingHorizontal:14,paddingVertical:7,borderWidth:1,borderColor:'rgba(81,207,102,0.2)',alignSelf:'center'},
  freeTrialText:{color:'#51cf66',fontSize:12,fontWeight:'800'},
  capacityDesc:{color:'rgba(255,255,255,0.5)',fontSize:13,lineHeight:18},
  capacityList:{gap:6},
  capacityRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'rgba(255,255,255,0.03)',paddingHorizontal:12,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:'rgba(255,255,255,0.05)'},
  capacityBadge:{backgroundColor:'rgba(90,200,250,0.15)',borderRadius:6,paddingHorizontal:6,paddingVertical:2},
  capacityBadgeText:{color:'#5ac8fa',fontSize:11,fontWeight:'800'},
  capacityCidr:{color:'#fff',fontSize:15,fontWeight:'700'},
  capacityHosts:{color:'rgba(255,255,255,0.4)',fontSize:13,fontWeight:'600',fontVariant:['tabular-nums']},
  error:{color:'#ff453a',fontSize:13,fontWeight:'800',textAlign:'center'},
  readyPill:{backgroundColor:'rgba(90,200,250,0.1)',borderRadius:10,paddingHorizontal:10,paddingVertical:5},
  readyText:{color:'#5ac8fa',fontSize:12,fontWeight:'800'},
  resultsList:{gap:10},
  exportMainBtn:{borderRadius:20,overflow:'hidden'},
  exportMainGrad:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,paddingVertical:16,borderRadius:20,borderWidth:1},
  exportMainText:{fontSize:16,fontWeight:'900',flex:1,textAlign:'center'},
  emptyCard:{alignItems:'center',gap:8,paddingVertical:40},
  emptyTitle:{color:'rgba(255,255,255,0.5)',fontSize:16,fontWeight:'800'},
  emptyText:{color:'rgba(255,255,255,0.35)',fontSize:13,textAlign:'center',lineHeight:20,maxWidth:'80%'},
});
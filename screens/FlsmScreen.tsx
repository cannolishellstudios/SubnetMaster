import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calculateSubnet, intToIp, ipToInt } from '../lib/subnet';

export default function FlsmScreen() {
  const insets = useSafeAreaInsets();
  const [base, setBase] = useState('192.168.1.0/24');
  const [num, setNum] = useState('4');
  const [results, setResults] = useState<any[]>([]);

  const split = () => {
    try {
      const [ip, cidr] = base.split('/');
      const bits = Math.ceil(Math.log2(parseInt(num)));
      const newCidr = parseInt(cidr) + bits;
      const step = Math.pow(2, 32 - newCidr);
      const start = ipToInt(ip);
      const res = [];
      for(let i=0; i < parseInt(num); i++) {
        res.push(calculateSubnet(intToIp(start + (i * step)), String(newCidr)));
      }
      setResults(res);
    } catch { alert("Invalid input"); }
  };

  return (
    <View style={{flex: 1}}>
      <LinearGradient colors={['#030810', '#06101f', '#020408']} style={StyleSheet.absoluteFillObject} />
      <ScrollView contentContainerStyle={{padding: 20, paddingTop: insets.top + 20}}>
        <Text style={s.title}>FLSM Splitter</Text>
        <TextInput style={s.input} value={base} onChangeText={setBase} placeholder="192.168.1.0/24" placeholderTextColor="#333" />
        <TextInput style={s.input} value={num} onChangeText={setNum} keyboardType="numeric" placeholder="Subnets needed" placeholderTextColor="#333" />
        <Pressable style={s.btn} onPress={split}><Text style={s.btnText}>Split Equally</Text></Pressable>
        {results.map((r, i) => (
          <View key={i} style={s.resItem}>
            <Text style={s.resNet}>{r.network}/{r.cidr}</Text>
            <Text style={s.resRange}>{r.firstHost} - {r.lastHost}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  title: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 20 },
  input: { backgroundColor: '#0a0d14', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1a1f2e' },
  btn: { backgroundColor: '#5ac8fa', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  btnText: { fontWeight: '900' },
  resItem: { backgroundColor: '#0a0d14', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#1a1f2e' },
  resNet: { color: '#5ac8fa', fontWeight: '800' }, resRange: { color: '#fff', fontSize: 12 }
});
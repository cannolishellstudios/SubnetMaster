import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSubnetStore } from '../store/useSubnetStore';

export function RangeTable() {
  const { result } = useSubnetStore();

  if (!result || result.version !== 'ipv4') return null;

  const rows = [
    { label: 'Network ID', value: result.network },
    { label: 'Broadcast', value: result.broadcast },
    { label: 'First Host', value: result.firstHost },
    { label: 'Last Host', value: result.lastHost },
    { label: 'Subnet Mask', value: result.mask },
    { label: 'Wildcard', value: result.wildcardMask },
    { label: 'Usable Hosts', value: result.usableHosts },
    { label: 'Scope', value: result.ipScope },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Subnet Range Table</Text>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0c0c0f',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  label: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSubnetStore } from '../store/useSubnetStore';

export function NetworkClassVisualization() {
  const { result } = useSubnetStore();

  if (!result || result.version !== 'ipv4') return null;

  const classInfo: Record<string, { range: string; defaultMask: string; color: string }> = {
    A: { range: '1.0.0.0 – 126.255.255.255', defaultMask: '255.0.0.0', color: '#5ac8fa' },
    B: { range: '128.0.0.0 – 191.255.255.255', defaultMask: '255.255.0.0', color: '#7c9cff' },
    C: { range: '192.0.0.0 – 223.255.255.255', defaultMask: '255.255.255.0', color: '#66e0c2' },
    D: { range: '224.0.0.0 – 239.255.255.255', defaultMask: 'Multicast', color: '#c792ea' },
    E: { range: '240.0.0.0 – 255.255.255.255', defaultMask: 'Reserved', color: '#ff7b80' },
  };

  const current = classInfo[result.ipClass] ?? classInfo.C;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Network Class Visualization</Text>

      <View style={styles.classRow}>
        {(['A', 'B', 'C', 'D', 'E'] as const).map((cls) => {
          const active = cls === result.ipClass;
          return (
            <View
              key={cls}
              style={[
                styles.classChip,
                active && {
                  backgroundColor: `${classInfo[cls].color}22`,
                  borderColor: classInfo[cls].color,
                },
              ]}
            >
              <Text
                style={[
                  styles.classChipText,
                  active && { color: classInfo[cls].color },
                ]}
              >
                {cls}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Current Class</Text>
        <Text style={[styles.infoValue, { color: current.color }]}>
          Class {result.ipClass}
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Traditional Range</Text>
        <Text style={styles.infoValue}>{current.range}</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>Default Mask</Text>
        <Text style={styles.infoValue}>{current.defaultMask}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(0,0,0,.45)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.06)',
  },

  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },

  classRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  classChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.06)',
  },

  classChipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '800',
  },

  infoBox: {
    backgroundColor: 'rgba(255,255,255,.04)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.05)',
    marginBottom: 10,
  },

  infoLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
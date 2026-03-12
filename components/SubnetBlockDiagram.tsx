import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useSubnetStore } from '../store/useSubnetStore';

// Animated individual bit block
function BitBlock({ 
  isNetwork, 
  index,
  total,
}: { 
  isNetwork: boolean; 
  index: number;
  total: number;
}) {
  const scale = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance animation
    scale.value = withDelay(
      index * 15,
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) })
    );

    // Subtle pulse for network bits
    if (isNetwork) {
      glow.value = withDelay(
        index * 15 + 200,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1500 }),
            withTiming(0.5, { duration: 1500 })
          ),
          -1,
          true
        )
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isNetwork ? 0.5 + glow.value * 0.5 : 1,
  }));

  return (
    <Animated.View 
      style={[
        styles.bit,
        isNetwork ? styles.networkBit : styles.hostBit,
        animatedStyle,
      ]}
    />
  );
}

// Legend item with animated indicator
function LegendItem({ 
  color, 
  gradientColors,
  label, 
  count 
}: { 
  color: string;
  gradientColors: [string, string];
  label: string; 
  count: number;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.3 + pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * 0.05 }],
  }));

  return (
    <View style={styles.legendItem}>
      <Animated.View style={[styles.legendDot, { backgroundColor: color, shadowColor: color }, pulseStyle]} />
      <View style={styles.legendContent}>
        <Text style={styles.legendLabel}>{label}</Text>
        <Text style={[styles.legendCount, { color }]}>{count} bits</Text>
      </View>
    </View>
  );
}

// Progress bar showing network vs host ratio
function RatioBar({ networkBits, hostBits }: { networkBits: number; hostBits: number }) {
  const total = networkBits + hostBits;
  const networkPercent = (networkBits / total) * 100;
  
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(300, withTiming(networkPercent, { duration: 800 }));
  }, [networkPercent]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.ratioContainer}>
      <View style={styles.ratioBar}>
        <Animated.View style={[styles.ratioFill, animatedStyle]}>
          <LinearGradient
            colors={['#5ac8fa', '#3aa8e0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>
      
      <View style={styles.ratioLabels}>
        <Text style={styles.ratioLabelNetwork}>
          Network {networkPercent.toFixed(0)}%
        </Text>
        <Text style={styles.ratioLabelHost}>
          Host {(100 - networkPercent).toFixed(0)}%
        </Text>
      </View>
    </View>
  );
}

export function SubnetBlockDiagram() {
  const { result } = useSubnetStore();

  if (!result || result.version !== 'ipv4') return null;

  const networkBits = result.cidr;
  const hostBits = 32 - result.cidr;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bit Structure</Text>
          <Text style={styles.subtitle}>32-bit IPv4 address allocation</Text>
        </View>
        
        <View style={styles.cidrBadge}>
          <Text style={styles.cidrText}>/{result.cidr}</Text>
        </View>
      </View>

      {/* Ratio bar */}
      <RatioBar networkBits={networkBits} hostBits={hostBits} />

      {/* Bit grid */}
      <BlurView intensity={12} tint="dark" style={styles.bitGridWrapper}>
        <LinearGradient
          colors={['rgba(255,255,255,0.03)', 'rgba(10,20,40,0.6)']}
          style={styles.bitGrid}
        >
          <View style={styles.bitRow}>
            {Array.from({ length: 32 }).map((_, index) => {
              const isNetwork = index < networkBits;
              const isOctetEnd = (index + 1) % 8 === 0 && index !== 31;
              
              return (
                <React.Fragment key={index}>
                  <BitBlock 
                    isNetwork={isNetwork} 
                    index={index}
                    total={32}
                  />
                  {isOctetEnd && <View style={styles.octetSpacer} />}
                </React.Fragment>
              );
            })}
          </View>

          {/* Octet labels */}
          <View style={styles.octetLabels}>
            {[1, 2, 3, 4].map((num) => (
              <Text key={num} style={styles.octetLabel}>Octet {num}</Text>
            ))}
          </View>
        </LinearGradient>
      </BlurView>

      {/* Legend */}
      <View style={styles.legendRow}>
        <LegendItem 
          color="#5ac8fa"
          gradientColors={['#5ac8fa', '#3aa8e0']}
          label="Network" 
          count={networkBits} 
        />
        <LegendItem 
          color="#3a4560"
          gradientColors={['#3a4560', '#2b3240']}
          label="Host" 
          count={hostBits} 
        />
      </View>

      {/* Address info */}
      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>NETWORK ADDRESS</Text>
          <Text style={styles.infoValue}>{result.network}</Text>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>TOTAL ADDRESSES</Text>
          <Text style={styles.infoValueHighlight}>
            {Math.pow(2, hostBits).toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  cidrBadge: {
    backgroundColor: 'rgba(90,200,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cidrText: {
    color: '#5ac8fa',
    fontSize: 16,
    fontWeight: '900',
  },

  // Ratio bar
  ratioContainer: {
    gap: 8,
  },
  ratioBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(58,69,96,0.4)',
    overflow: 'hidden',
  },
  ratioFill: {
    height: '100%',
    borderRadius: 4,
  },
  ratioLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratioLabelNetwork: {
    color: '#5ac8fa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ratioLabelHost: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Bit grid
  bitGridWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  bitGrid: {
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.1)',
    borderRadius: 18,
  },
  bitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  bit: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  networkBit: {
    backgroundColor: '#5ac8fa',
    shadowColor: '#5ac8fa',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  hostBit: {
    backgroundColor: 'rgba(58,69,96,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  octetSpacer: {
    width: 8,
  },
  octetLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  octetLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  legendContent: {
    flex: 1,
  },
  legendLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  legendCount: {
    fontSize: 14,
    fontWeight: '900',
  },

  // Info boxes
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  infoValueHighlight: {
    color: '#5ac8fa',
    fontSize: 15,
    fontWeight: '900',
  },
});
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
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

function ipToBinary(ip: string) {
  return ip
    .split('.')
    .map((octet) => parseInt(octet, 10).toString(2).padStart(8, '0'));
}

// Individual bit with animation
function Bit({ 
  value, 
  index, 
  octetIndex 
}: { 
  value: string; 
  index: number;
  octetIndex: number;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    const delay = (octetIndex * 8 + index) * 25;
    
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    scale.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const isOne = value === '1';

  return (
    <Animated.View style={animatedStyle}>
      <View style={[styles.bit, isOne && styles.bitOne]}>
        <Text style={[styles.bitText, isOne && styles.bitTextOne]}>{value}</Text>
      </View>
    </Animated.View>
  );
}

// Octet card with animated reveal
function OctetCard({ 
  index, 
  decimal, 
  binary 
}: { 
  index: number; 
  decimal: string;
  binary: string;
}) {
  const scale = useSharedValue(1);

  const handleCopy = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(binary);
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(300).delay(index * 100)}
      style={styles.octetWrapper}
    >
      <Pressable onPress={handleCopy}>
        <BlurView intensity={15} tint="dark" style={styles.octetBlur}>
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'rgba(10,20,40,0.8)']}
            style={styles.octetCard}
          >
            {/* Header */}
            <View style={styles.octetHeader}>
              <View style={styles.octetBadge}>
                <Text style={styles.octetBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.octetLabel}>OCTET</Text>
              <View style={styles.decimalBadge}>
                <Text style={styles.decimalText}>{decimal}</Text>
              </View>
            </View>

            {/* Binary bits */}
            <View style={styles.bitsRow}>
              {binary.split('').map((bit, i) => (
                <Bit key={i} value={bit} index={i} octetIndex={index} />
              ))}
            </View>

            {/* Bit position indicators */}
            <View style={styles.positionsRow}>
              {[128, 64, 32, 16, 8, 4, 2, 1].map((pos, i) => (
                <Text key={i} style={styles.positionText}>{pos}</Text>
              ))}
            </View>
          </LinearGradient>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

// Scanning line animation
function ScanLine() {
  const position = useSharedValue(0);

  useEffect(() => {
    position.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    top: `${position.value * 100}%`,
  }));

  return (
    <Animated.View style={[styles.scanLine, animatedStyle]}>
      <LinearGradient
        colors={['transparent', 'rgba(90,200,250,0.2)', 'transparent']}
        style={styles.scanLineGradient}
      />
    </Animated.View>
  );
}

export function BinaryPreview() {
  const { result } = useSubnetStore();

  if (!result?.network || result.version !== 'ipv4') return null;

  const octets = ipToBinary(result.network);
  const decimals = result.network.split('.');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Binary Analysis</Text>
          <Text style={styles.subtitle}>Network address in binary representation</Text>
        </View>
        
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>32-BIT</Text>
        </View>
      </View>

      {/* Grid of octets */}
      <View style={styles.grid}>
        <View style={styles.row}>
          <OctetCard index={0} decimal={decimals[0]} binary={octets[0]} />
          <OctetCard index={1} decimal={decimals[1]} binary={octets[1]} />
        </View>
        <View style={styles.row}>
          <OctetCard index={2} decimal={decimals[2]} binary={octets[2]} />
          <OctetCard index={3} decimal={decimals[3]} binary={octets[3]} />
        </View>
      </View>

      {/* Full binary string */}
      <View style={styles.fullBinaryContainer}>
        <ScanLine />
        <Text style={styles.fullBinaryLabel}>COMPLETE BINARY STRING</Text>
        <Text style={styles.fullBinaryValue}>
          {octets.join('.')}
        </Text>
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
  headerLeft: {
    flex: 1,
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
  headerBadge: {
    backgroundColor: 'rgba(90,200,250,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerBadgeText: {
    color: '#5ac8fa',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Grid
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },

  // Octet card
  octetWrapper: {
    flex: 1,
  },
  octetBlur: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  octetCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.1)',
    borderRadius: 18,
  },
  octetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  octetBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: 'rgba(90,200,250,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  octetBadgeText: {
    color: '#5ac8fa',
    fontSize: 12,
    fontWeight: '900',
  },
  octetLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    flex: 1,
  },
  decimalBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  decimalText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Bits
  bitsRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 6,
  },
  bit: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bitOne: {
    backgroundColor: 'rgba(90,200,250,0.2)',
    borderColor: 'rgba(90,200,250,0.4)',
  },
  bitText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '800',
  },
  bitTextOne: {
    color: '#5ac8fa',
  },

  // Positions
  positionsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  positionText: {
    flex: 1,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 7,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Full binary
  fullBinaryContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.1)',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 30,
  },
  scanLineGradient: {
    flex: 1,
  },
  fullBinaryLabel: {
    color: 'rgba(90,200,250,0.5)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  fullBinaryValue: {
    color: '#5ac8fa',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Courier',
    letterSpacing: 0.5,
  },
});
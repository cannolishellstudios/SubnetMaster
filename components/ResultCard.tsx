import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { useSubnetStore } from '../store/useSubnetStore';

// Animated glow effect for tiles
function TileGlow({ color, delay = 0 }: { color: string; delay?: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.tileGlow, glowStyle]}>
      <LinearGradient
        colors={[color, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

// Interactive tile with copy functionality
function Tile({
  label,
  value,
  accent = false,
  compact = false,
  delay = 0,
}: {
  label: string;
  value: string;
  accent?: boolean;
  compact?: boolean;
  delay?: number;
}) {
  const scale = useSharedValue(1);

  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withSpring(0.95, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );
    
    await Clipboard.setStringAsync(value);
    // Could show toast here
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View 
      entering={FadeInDown.duration(400).delay(delay)}
      style={[styles.tileWrapper, animatedStyle]}
    >
      <Pressable onPress={handlePress} style={{ flex: 1 }}>
        <BlurView intensity={20} tint="dark" style={styles.tileBlur}>
          <LinearGradient
            colors={
              accent
                ? ['rgba(40,100,220,0.3)', 'rgba(15,30,70,0.9)']
                : ['rgba(255,255,255,0.06)', 'rgba(10,15,30,0.9)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.tile,
              compact && styles.tileCompact,
            ]}
          >
            {accent && <TileGlow color="rgba(90,200,250,0.15)" delay={delay} />}
            
            {/* Corner accent */}
            <View style={[styles.cornerAccent, accent && styles.cornerAccentActive]} />
            
            <Text style={styles.tileLabel}>{label}</Text>
            
            <View style={styles.tileValueRow}>
              <Text
                style={[styles.tileValue, compact && styles.tileValueCompact]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {value}
              </Text>
              
              <View style={styles.copyHint}>
                <Text style={styles.copyHintText}>TAP</Text>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

// Compact stat pill
function StatPill({ 
  label, 
  value, 
  highlight = false,
  delay = 0,
}: { 
  label: string; 
  value: string;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <Animated.View 
      entering={FadeInDown.duration(400).delay(delay)}
      style={styles.statPillWrapper}
    >
      <LinearGradient
        colors={
          highlight
            ? ['rgba(90,200,250,0.12)', 'rgba(60,140,220,0.08)']
            : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']
        }
        style={[styles.statPill, highlight && styles.statPillHighlight]}
      >
        <Text style={styles.statPillLabel}>{label}</Text>
        <Text style={[styles.statPillValue, highlight && styles.statPillValueHighlight]}>
          {value}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

export function ResultCard() {
  const { result } = useSubnetStore();

  if (!result) return null;

  if (result.version === 'ipv6') {
    return (
      <View style={styles.wrapper}>
        <SectionHeader title="IPv6 Results" />
        
        <View style={styles.row}>
          <Tile label="Network ID" value={result.network} accent delay={0} />
        </View>

        <View style={styles.row}>
          <Tile label="First Address" value={result.firstAddress} delay={100} />
          <Tile label="Last Address" value={result.lastAddress} delay={150} />
        </View>

        <View style={styles.statsRow}>
          <StatPill label="ADDRESS COUNT" value={result.addressCount} highlight delay={200} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <SectionHeader title="Subnet Results" />
      
      {/* Primary row */}
      <View style={styles.row}>
        <Tile label="Network ID" value={result.network} accent delay={0} />
        <Tile label="Broadcast" value={result.broadcast} accent delay={50} />
      </View>

      {/* Host range row */}
      <View style={styles.row}>
        <Tile label="First Host" value={result.firstHost} delay={100} />
        <Tile label="Last Host" value={result.lastHost} delay={150} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatPill label="SUBNET MASK" value={result.mask} delay={200} />
        <StatPill label="USABLE IPS" value={result.usableHosts} highlight delay={250} />
      </View>

      {/* Extra info */}
      <View style={styles.statsRow}>
        <StatPill label="WILDCARD" value={result.wildcardMask} delay={300} />
      </View>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(90,200,250,0.15)',
  },
  sectionTitle: {
    color: 'rgba(90,200,250,0.6)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Rows
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },

  // Tile
  tileWrapper: {
    flex: 1,
    minHeight: 100,
  },
  tileBlur: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  tile: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.12)',
    borderRadius: 22,
    overflow: 'hidden',
  },
  tileCompact: {
    minHeight: 85,
  },
  tileGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  cornerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomRightRadius: 2,
  },
  cornerAccentActive: {
    backgroundColor: '#5ac8fa',
    shadowColor: '#5ac8fa',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  tileLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  tileValue: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tileValueCompact: {
    fontSize: 16,
  },
  copyHint: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  copyHintText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Stat pill
  statPillWrapper: {
    flex: 1,
  },
  statPill: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statPillHighlight: {
    borderColor: 'rgba(90,200,250,0.2)',
  },
  statPillLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statPillValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  statPillValueHighlight: {
    color: '#5ac8fa',
  },
});
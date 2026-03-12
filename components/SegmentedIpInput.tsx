import React, { useEffect } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useSubnetStore } from '../store/useSubnetStore';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Pulsing glow ring around the input
function GlowRing() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + pulse.value * 0.4,
    transform: [{ scale: 1 + pulse.value * 0.02 }],
  }));

  return (
    <Animated.View style={[styles.glowRing, glowStyle]}>
      <LinearGradient
        colors={['rgba(90,200,250,0.3)', 'rgba(90,200,250,0)', 'rgba(90,200,250,0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}

// Animated data stream effect
function DataStream() {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const streamStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -200 + offset.value * 400 }],
  }));

  return (
    <View style={styles.dataStreamContainer} pointerEvents="none">
      <Animated.View style={[styles.dataStream, streamStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(90,200,250,0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.dataStreamGradient}
        />
      </Animated.View>
    </View>
  );
}

// Scope indicator with animated glow
function ScopeIndicator({ color, label }: { color: string; label: string }) {
  const glow = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.4 + glow.value * 0.6,
    transform: [{ scale: 1 + glow.value * 0.1 }],
  }));

  return (
    <View style={styles.scopeIndicator}>
      <Animated.View 
        style={[
          styles.scopeDot, 
          { backgroundColor: color, shadowColor: color },
          glowStyle
        ]} 
      />
      <Text style={styles.scopeText}>{label}</Text>
    </View>
  );
}

export function SegmentedIpInput() {
  const { input, result, setInput } = useSubnetStore();
  const borderGlow = useSharedValue(0);

  const ipOnly = input.includes('/') ? input.split('/')[0] : input;

  useEffect(() => {
    borderGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const handleChange = (text: string) => {
    Haptics.selectionAsync();
    const cleaned = text.trim();

    if (cleaned.includes('/')) {
      setInput(cleaned);
      return;
    }

    if (!cleaned) {
      setInput(`/${result.cidr}`);
      return;
    }

    setInput(`${cleaned}/${result.cidr}`);
  };

  const handleFocus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      borderGlow.value,
      [0, 1],
      ['rgba(90,200,250,0.15)', 'rgba(90,200,250,0.35)']
    ),
  }));

  return (
    <Animated.View style={[styles.cardWrapper, borderStyle]}>
      <BlurView intensity={25} tint="dark" style={styles.blurContainer}>
        <LinearGradient
          colors={['rgba(20,60,140,0.35)', 'rgba(8,16,36,0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Ambient glow orb */}
          <View style={styles.glowOrb} />
          <View style={styles.glowOrbSecondary} />

          {/* Data stream effect */}
          <DataStream />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>SUBNETPRO™</Text>
              <Text style={styles.title}>Network Input</Text>
            </View>
            
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>{result.version.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            Enter an IP address or paste a complete CIDR notation
          </Text>

          {/* Input section */}
          <Text style={styles.inputLabel}>IP ADDRESS</Text>

          <View style={styles.inputContainer}>
            <GlowRing />
            
            <LinearGradient
              colors={['rgba(2,8,20,0.98)', 'rgba(8,16,32,0.98)']}
              style={styles.inputShell}
            >
              <TextInput
                value={ipOnly}
                onChangeText={handleChange}
                onFocus={handleFocus}
                placeholder="192.168.1.50"
                placeholderTextColor="rgba(90,200,250,0.25)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                style={styles.input}
                returnKeyType="done"
                selectionColor="#5ac8fa"
              />
            </LinearGradient>
          </View>

          {/* Meta info */}
          <View style={styles.metaRow}>
            <ScopeIndicator 
              color={result.scopeColor} 
              label={`${result.ipClass} • ${result.ipScope}`} 
            />
          </View>

          {/* Subnet meaning badge */}
          <View style={styles.meaningBadge}>
            <View style={styles.meaningIcon}>
              <Text style={styles.meaningIconText}>◈</Text>
            </View>
            <View style={styles.meaningContent}>
              <Text style={styles.meaningLabel}>SUBNET CLASSIFICATION</Text>
              <Text style={styles.meaningText}>{result.subnetMeaning}</Text>
            </View>
          </View>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
  },
  blurContainer: {
    overflow: 'hidden',
  },
  card: {
    padding: 18,
    overflow: 'hidden',
  },

  // Glow orbs
  glowOrb: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(90,200,250,0.12)',
  },
  glowOrbSecondary: {
    position: 'absolute',
    bottom: -60,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(120,80,255,0.08)',
  },

  // Data stream
  dataStreamContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    overflow: 'hidden',
  },
  dataStream: {
    width: 200,
    height: 60,
  },
  dataStreamGradient: {
    width: 200,
    height: 60,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eyebrow: {
    color: '#5ac8fa',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  versionBadge: {
    backgroundColor: 'rgba(90,200,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  versionText: {
    color: '#5ac8fa',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: '90%',
  },

  // Input
  inputLabel: {
    color: 'rgba(90,200,250,0.6)',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 2,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  glowRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 25,
    overflow: 'hidden',
  },
  inputShell: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.2)',
  },
  input: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    letterSpacing: 1,
  },

  // Meta row
  metaRow: {
    marginBottom: 12,
  },
  scopeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'flex-start',
  },
  scopeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  scopeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Meaning badge
  meaningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(90,200,250,0.06)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.12)',
    gap: 12,
  },
  meaningIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(90,200,250,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.2)',
  },
  meaningIconText: {
    color: '#5ac8fa',
    fontSize: 18,
  },
  meaningContent: {
    flex: 1,
  },
  meaningLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  meaningText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
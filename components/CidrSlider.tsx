import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useSubnetStore } from '../store/useSubnetStore';

// Animated CIDR badge with pulsing glow
function CidrBadge({ value }: { value: number }) {
  const glow = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.1, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
  }, [value]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.3 + glow.value * 0.5,
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.cidrBadge, glowStyle, scaleStyle]}>
      <LinearGradient
        colors={['rgba(90,200,250,0.2)', 'rgba(60,140,220,0.15)']}
        style={styles.cidrBadgeGradient}
      >
        <Text style={styles.cidrSlash}>/</Text>
        <Text style={styles.cidrValue}>{value}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// Animated slider track indicator
function TrackGlow() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -100 + shimmer.value * 400 }],
  }));

  return (
    <View style={styles.trackGlowContainer} pointerEvents="none">
      <Animated.View style={[styles.trackGlow, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(90,200,250,0.15)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.trackGlowGradient}
        />
      </Animated.View>
    </View>
  );
}

export function CidrSlider() {
  const { result, setCidr } = useSubnetStore();
  const lastValue = React.useRef(result.cidr);

  const max = result.version === 'ipv6' ? 128 : 32;

  const handleSliderChange = (value: number) => {
    const intVal = Math.round(value);
    if (intVal !== lastValue.current) {
      Haptics.selectionAsync();
      lastValue.current = intVal;
      setCidr(intVal);
    }
  };

  const handleSliderComplete = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCidr(Math.round(value));
  };

  return (
    <BlurView intensity={15} tint="dark" style={styles.cardWrapper}>
      <LinearGradient
        colors={['rgba(255,255,255,0.04)', 'rgba(10,20,40,0.6)']}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.label}>SUBNET MASK</Text>
            <Text style={styles.title}>CIDR Prefix</Text>
          </View>

          <CidrBadge value={result.cidr} />
        </View>

        {/* Slider container */}
        <View style={styles.sliderContainer}>
          <TrackGlow />

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={max}
            step={1}
            value={result.cidr}
            minimumTrackTintColor="#5ac8fa"
            maximumTrackTintColor="rgba(90,200,250,0.12)"
            thumbTintColor="#ffffff"
            onValueChange={handleSliderChange}
            onSlidingComplete={handleSliderComplete}
          />

          {/* Scale markers */}
          <View style={styles.scaleRow}>
            <Text style={styles.scaleText}>0</Text>
            <Text style={styles.scaleText}>{max / 4}</Text>
            <Text style={styles.scaleText}>{max / 2}</Text>
            <Text style={styles.scaleText}>{(max * 3) / 4}</Text>
            <Text style={styles.scaleText}>{max}</Text>
          </View>
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoPill}>
            <Text style={styles.infoLabel}>NETWORK BITS</Text>
            <Text style={styles.infoValue}>{result.cidr}</Text>
          </View>

          <View style={styles.infoPill}>
            <Text style={styles.infoLabel}>HOST BITS</Text>
            <Text style={styles.infoValue}>
              {result.version === 'ipv6' ? 128 - result.cidr : 32 - result.cidr}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.1)',
  },
  card: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: 'rgba(90,200,250,0.6)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },

  // CIDR Badge
  cidrBadge: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#5ac8fa',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cidrBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.3)',
    borderRadius: 14,
  },
  cidrSlash: {
    color: 'rgba(90,200,250,0.6)',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 2,
  },
  cidrValue: {
    color: '#5ac8fa',
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },

  // Slider
  sliderContainer: {
    marginBottom: 10,
    position: 'relative',
  },
  trackGlowContainer: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 24,
    overflow: 'hidden',
    borderRadius: 12,
  },
  trackGlow: {
    width: 100,
    height: 24,
  },
  trackGlowGradient: {
    width: 100,
    height: 24,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: -4,
  },
  scaleText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useSubnetStore } from '../store/useSubnetStore';

const PRESETS = [
  { cidr: 8, label: 'Class A', hosts: '16M' },
  { cidr: 16, label: 'Class B', hosts: '65K' },
  { cidr: 20, label: 'Large', hosts: '4K' },
  { cidr: 24, label: 'Class C', hosts: '254' },
  { cidr: 26, label: 'Med', hosts: '62' },
  { cidr: 27, label: 'Small', hosts: '30' },
  { cidr: 28, label: 'Tiny', hosts: '14' },
  { cidr: 29, label: 'Micro', hosts: '6' },
  { cidr: 30, label: 'P2P', hosts: '2' },
];

function PresetChip({ 
  cidr, 
  label, 
  hosts,
  isActive, 
  onPress,
  index,
}: { 
  cidr: number;
  label: string;
  hosts: string;
  isActive: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      glow.value = withTiming(0, { duration: 200 });
    }
  }, [isActive]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withSpring(0.92, { damping: 10 }),
      withSpring(1, { damping: 8 })
    );
    onPress();
  };

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: isActive ? 0.3 + glow.value * 0.4 : 0,
  }));

  return (
    <Animated.View 
      entering={FadeIn.duration(300).delay(index * 50)}
      style={scaleStyle}
    >
      <Pressable onPress={handlePress}>
        <Animated.View style={[styles.chipWrapper, glowStyle]}>
          <LinearGradient
            colors={
              isActive
                ? ['rgba(90,200,250,0.25)', 'rgba(60,140,220,0.18)']
                : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            {/* Top row: CIDR */}
            <Text style={[styles.cidrText, isActive && styles.cidrTextActive]}>
              /{cidr}
            </Text>
            
            {/* Bottom row: label and hosts */}
            <View style={styles.chipMeta}>
              <Text style={[styles.labelText, isActive && styles.labelTextActive]}>
                {label}
              </Text>
              <View style={[styles.hostsBadge, isActive && styles.hostsBadgeActive]}>
                <Text style={[styles.hostsText, isActive && styles.hostsTextActive]}>
                  {hosts}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function CidrPresetRow() {
  const { result, setCidr } = useSubnetStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Presets</Text>
        <Text style={styles.subtitle}>Common subnet sizes</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {PRESETS.map((preset, index) => (
          <PresetChip
            key={preset.cidr}
            cidr={preset.cidr}
            label={preset.label}
            hosts={preset.hosts}
            isActive={result?.cidr === preset.cidr}
            onPress={() => setCidr(preset.cidr)}
            index={index}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chipWrapper: {
    borderRadius: 18,
    shadowColor: '#5ac8fa',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    minWidth: 72,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: 'rgba(90,200,250,0.4)',
  },
  cidrText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  cidrTextActive: {
    color: '#5ac8fa',
  },
  chipMeta: {
    alignItems: 'center',
    gap: 4,
  },
  labelText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelTextActive: {
    color: 'rgba(90,200,250,0.8)',
  },
  hostsBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hostsBadgeActive: {
    backgroundColor: 'rgba(90,200,250,0.15)',
  },
  hostsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '800',
  },
  hostsTextActive: {
    color: '#5ac8fa',
  },
});
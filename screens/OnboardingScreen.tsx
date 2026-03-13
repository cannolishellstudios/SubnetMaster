import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubnetStore } from '../store/useSubnetStore';
import * as Haptics from 'expo-haptics';

export default function OnboardingScreen() {
  const setHasSeenOnboarding = useSubnetStore(state => state.setHasSeenOnboarding);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setHasSeenOnboarding(true);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030810', '#0a1930', '#020408']} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.content}>
        <Ionicons name="git-network" size={80} color="#5ac8fa" style={{ marginBottom: 30 }} />
        <Text style={styles.title}>Welcome to{'\n'}SubnetMaster</Text>
        <Text style={styles.subtitle}>The ultimate network toolkit.</Text>

        <View style={styles.features}>
          <FeatureItem icon="calculator" title="Subnet Calculator" desc="Instant math, wildcards, and broadcast IDs." />
          <FeatureItem icon="layers" title="VLSM & FLSM Design" desc="Plan massive networks with zero wasted IP space." />
          <FeatureItem icon="school" title="Interactive Training" desc="Master subnetting for your CCNA or Network+ exams." />
        </View>
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleStart}>
        <LinearGradient colors={['#5ac8fa', '#3aa8e0']} style={styles.btnGrad}>
          <Text style={styles.btnText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#020408" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function FeatureItem({ icon, title, desc }: any) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={24} color="#5ac8fa" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: 24, paddingTop: 80, paddingBottom: 50 },
  content: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 40, fontWeight: '900', color: '#fff', lineHeight: 46, marginBottom: 12 },
  subtitle: { fontSize: 18, color: 'rgba(90,200,250,0.8)', fontWeight: '600', marginBottom: 50 },
  features: { gap: 28 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(90,200,250,0.1)', borderWidth: 1, borderColor: 'rgba(90,200,250,0.2)', alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  featureDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20 },
  btn: { borderRadius: 20, overflow: 'hidden', marginTop: 20 },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  btnText: { color: '#020408', fontSize: 18, fontWeight: '900' }
});
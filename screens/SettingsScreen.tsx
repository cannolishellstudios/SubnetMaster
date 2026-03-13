import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubnetStore } from '../store/useSubnetStore';

export default function SettingsScreen({ navigation }: any) {
  const { showFavoritesOnly, setShowFavoritesOnly, isPremium } = useSubnetStore();

  const openEmail = () => Linking.openURL('mailto:cannolishellstudios@gmail.com?subject=SubnetMaster Support');
  const openPrivacy = () => Linking.openURL('https://cannolishell.github.io/SubnetMaster/privacy-policy');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Settings</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* PRO STATUS BANNER */}
        <TouchableOpacity 
          style={[styles.proBanner, isPremium && styles.proBannerActive]} 
          onPress={() => !isPremium && navigation.navigate('Paywall')}
        >
          <View>
            <Text style={styles.proTitle}>{isPremium ? 'Pro Activated' : 'Unlock SubnetMaster Pro'}</Text>
            <Text style={styles.proSubtitle}>
              {isPremium ? 'Thank you for your support!' : 'Get VLSM, FLSM & Advanced Training'}
            </Text>
          </View>
          <Ionicons name={isPremium ? "checkmark-circle" : "chevron-forward"} size={24} color="#fff" />
        </TouchableOpacity>

        {/* APP PREFERENCES */}
        <Text style={styles.sectionHeader}>PREFERENCES</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="star" size={20} color="#5ac8fa" />
              <Text style={styles.rowText}>Show Favorites Only in History</Text>
            </View>
            <Switch 
              value={showFavoritesOnly} 
              onValueChange={setShowFavoritesOnly} 
              trackColor={{ false: '#333', true: '#5ac8fa' }}
            />
          </View>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('History')}>
            <View style={styles.rowLeft}>
              <Ionicons name="time" size={20} color="#5ac8fa" />
              <Text style={styles.rowText}>View Calculation History</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* ABOUT & SUPPORT */}
        <Text style={styles.sectionHeader}>SUPPORT</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={openEmail}>
            <View style={styles.rowLeft}>
              <Ionicons name="mail" size={20} color="#51cf66" />
              <Text style={styles.rowText}>Contact Developer</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={openPrivacy}>
            <View style={styles.rowLeft}>
              <Ionicons name="shield-checkmark" size={20} color="#51cf66" />
              <Text style={styles.rowText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>SubnetMaster v1.0.1{"\n"}© 2026 Cannoli Shell Studios</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070b' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
  proBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a2235', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(90,200,250,0.3)' },
  proBannerActive: { backgroundColor: 'rgba(81, 207, 102, 0.15)', borderColor: 'rgba(81, 207, 102, 0.4)' },
  proTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  proSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  sectionHeader: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold', marginLeft: 12, marginBottom: 8, marginTop: 10 },
  card: { backgroundColor: '#08111f', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowText: { color: '#fff', fontSize: 16, marginLeft: 12 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 48 },
  versionText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontSize: 12, marginTop: 20, lineHeight: 18 },
});
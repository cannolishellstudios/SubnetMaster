import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useSubnetStore } from '../store/useSubnetStore';

export default function PaywallScreen({ navigation }: any) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { checkProStatus } = useSubnetStore();

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.log('Error fetching offerings', e);
      }
    };
    fetchOfferings();
  }, []);

  const handlePurchase = async (pack: PurchasesPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsPurchasing(true);
    try {
      await Purchases.purchasePackage(pack);
      await checkProStatus();
      navigation.goBack();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Error', e.message);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const restorePurchases = async () => {
    setIsPurchasing(true);
    try {
      await Purchases.restorePurchases();
      await checkProStatus();
      navigation.goBack();
      Alert.alert('Success', 'Purchases restored successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030810', '#0a1930', '#020408']} style={StyleSheet.absoluteFillObject} />
      
      <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={28} color="rgba(255,255,255,0.5)" />
      </Pressable>

      <View style={styles.header}>
        <View style={styles.iconGlow}>
          <Ionicons name="shield-checkmark" size={50} color="#5ac8fa" />
        </View>
        <Text style={styles.title}>SubnetMaster <Text style={{color: '#5ac8fa'}}>PRO</Text></Text>
        <Text style={styles.subtitle}>Stop guessing. Start engineering.</Text>
      </View>

      <View style={styles.features}>
        <FeatureItem icon="cloud-download-outline" text="Export CSV, JSON & PDF Layouts" />
        <FeatureItem icon="hardware-chip-outline" text="Unlock IPv6 Subnetting Engine" />
        <FeatureItem icon="infinite-outline" text="Unlimited History & Favorites" />
        <FeatureItem icon="school-outline" text="Advanced IT Training Mode" />
      </View>

      <View style={styles.packages}>
        {packages.length === 0 && !isPurchasing && (
          <ActivityIndicator size="small" color="#5ac8fa" />
        )}
        {packages.map((pkg) => (
          <Pressable 
            key={pkg.identifier} 
            style={[styles.pkgCard, pkg.identifier === '$rc_annual' && styles.pkgCardPopular]}
            onPress={() => handlePurchase(pkg)}
            disabled={isPurchasing}
          >
            {pkg.identifier === '$rc_annual' && (
              <View style={styles.popularBadge}><Text style={styles.popularText}>BEST VALUE</Text></View>
            )}
            <View>
              <Text style={styles.pkgTitle}>
                {pkg.identifier === '$rc_annual' ? 'Yearly' : pkg.identifier === '$rc_monthly' ? 'Monthly' : 'Lifetime'}
              </Text>
              <Text style={styles.pkgDesc}>{pkg.product.description}</Text>
            </View>
            <Text style={styles.pkgPrice}>{pkg.product.priceString}</Text>
          </Pressable>
        ))}
      </View>

      {isPurchasing && <ActivityIndicator size="large" color="#5ac8fa" style={{marginTop: 20}} />}

      <View style={styles.footer}>
        <Pressable onPress={restorePurchases}>
          <Text style={styles.footerLink}>Restore Purchases</Text>
        </Pressable>
      </View>
    </View>
  );
}

const FeatureItem = ({ icon, text }: { icon: any, text: string }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon} size={20} color="#5ac8fa" style={{marginRight: 12}} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  iconGlow: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(90,200,250,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(90,200,250,0.3)', marginBottom: 20 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600', marginTop: 8 },
  features: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 30 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  packages: { gap: 12 },
  pkgCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pkgCardPopular: { backgroundColor: 'rgba(90,200,250,0.1)', borderColor: '#5ac8fa' },
  popularBadge: { position: 'absolute', top: -10, left: 20, backgroundColor: '#5ac8fa', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  popularText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  pkgTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  pkgDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  pkgPrice: { color: '#5ac8fa', fontSize: 22, fontWeight: '900' },
  footer: { marginTop: 'auto', alignItems: 'center', paddingBottom: 20 },
  footerLink: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' }
});
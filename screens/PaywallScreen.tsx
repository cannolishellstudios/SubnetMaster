import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useSubnetStore } from '../store/useSubnetStore';

export default function PaywallScreen({ navigation }: any) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const setIsPremium = useSubnetStore((state) => state.setIsPremium);

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
          setPackages(offerings.current.availablePackages);
          // Default to the first package
          setSelectedPkg(offerings.current.availablePackages[0]);
        }
      } catch (e) {
        console.warn("Error fetching offerings", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOfferings();
  }, []);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPkg);
      if (typeof customerInfo.entitlements.active['pro'] !== 'undefined') {
        setIsPremium(true);
        navigation.goBack();
      }
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert('Purchase Failed', e.message);
    } finally {
      setPurchasing(false);
    }
  };

  const restorePurchases = async () => {
    setPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active['pro'] !== 'undefined') {
        setIsPremium(true);
        Alert.alert('Success', 'Purchases restored successfully!');
        navigation.goBack();
      } else {
        Alert.alert('No Purchases', 'No previous pro purchases found.');
      }
    } catch (e: any) { Alert.alert('Restore Failed', e.message); } 
    finally { setPurchasing(false); }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030810', '#0a1930', '#020408']} style={StyleSheet.absoluteFillObject} />
      
      <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} disabled={purchasing}>
        <Ionicons name="close" size={28} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconWrap}><Ionicons name="diamond" size={48} color="#5ac8fa" /></View>
          <Text style={styles.title}>SubnetMaster <Text style={{color: '#5ac8fa'}}>Pro</Text></Text>
          <Text style={styles.subtitle}>Unlock the ultimate networking toolkit.</Text>
        </View>

        <View style={styles.featureBox}>
          <Feature text="Unlimited VLSM & FLSM Designs" />
          <Feature text="Export & Share PDF/CSV Reports" />
          <Feature text="Advanced IPv6 & Training Modes" />
          <Feature text="Priority Developer Support" />
        </View>

        <View style={styles.packagesContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#5ac8fa" style={{ marginVertical: 40 }} />
          ) : (
            packages.map((pkg) => {
              const isSelected = selectedPkg?.identifier === pkg.identifier;
              return (
                <TouchableOpacity 
                  key={pkg.identifier} 
                  style={[styles.packageCard, isSelected && styles.packageCardSelected]} 
                  onPress={() => setSelectedPkg(pkg)} 
                  disabled={purchasing}
                >
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.packageLeft}>
                    <Text style={styles.packageTitle}>
                      {pkg.packageType === 'LIFETIME' ? 'Lifetime' : pkg.packageType === 'ANNUAL' ? 'Yearly' : 'Monthly'}
                    </Text>
                    <Text style={styles.packageDesc}>
                      {pkg.packageType === 'LIFETIME' ? 'Pay once, yours forever' : `Cancel anytime`}
                    </Text>
                  </View>
                  <View style={styles.packageRight}>
                    <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <TouchableOpacity onPress={restorePurchases} disabled={purchasing} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Checkout Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.buyBtn, purchasing && {opacity: 0.7}]} onPress={handlePurchase} disabled={purchasing || !selectedPkg}>
          <LinearGradient colors={['#5ac8fa', '#3aa8e0']} style={styles.buyGrad}>
            {purchasing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buyText}>
                Continue with {selectedPkg?.packageType === 'LIFETIME' ? 'Lifetime' : selectedPkg?.packageType === 'ANNUAL' ? 'Yearly' : 'Monthly'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={20} color="#51cf66" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070b' },
  scrollContent: { padding: 24, paddingTop: 60, paddingBottom: 120 }, // Extra padding for footer
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  header: { alignItems: 'center', marginBottom: 30 },
  iconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(90,200,250,0.1)', borderWidth: 1, borderColor: 'rgba(90,200,250,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  featureBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 30, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  packagesContainer: { gap: 12, marginBottom: 20 },
  packageCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 18, borderWidth: 2, borderColor: 'transparent' },
  packageCardSelected: { backgroundColor: 'rgba(90,200,250,0.08)', borderColor: '#5ac8fa' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#5ac8fa' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#5ac8fa' },
  packageLeft: { flex: 1 },
  packageTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  packageDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  packageRight: { alignItems: 'flex-end', marginLeft: 10 },
  packagePrice: { color: '#fff', fontSize: 18, fontWeight: '900' },
  restoreBtn: { padding: 16, alignItems: 'center' },
  restoreText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, backgroundColor: '#05070b', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  buyBtn: { borderRadius: 18, overflow: 'hidden' },
  buyGrad: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  buyText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
});
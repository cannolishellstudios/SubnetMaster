import React, { useEffect, useState } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSubnetStore } from './store/useSubnetStore';

// Screens
import CalculatorScreen from './screens/CalculatorScreen';
import VlsmScreen from './screens/VlsmScreen';
import FlsmScreen from './screens/FlsmScreen';
import TrainingScreen from './screens/TrainingScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import PaywallScreen from './screens/PaywallScreen';
import OnboardingScreen from './screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#05070b', card: '#08111f', border: 'rgba(255,255,255,0.06)', text: '#ffffff', primary: '#5ac8fa' },
};

function TabIcon({ focused, color, size, routeName }: { focused: boolean; color: string; size: number; routeName: string }) {
  let iconName: keyof typeof Ionicons.glyphMap = 'grid-outline';
  if (routeName === 'Calculator') iconName = focused ? 'calculator' : 'calculator-outline';
  else if (routeName === 'VLSM') iconName = focused ? 'git-network' : 'git-network-outline';
  else if (routeName === 'FLSM') iconName = focused ? 'layers' : 'layers-outline';
  else if (routeName === 'Training') iconName = focused ? 'school' : 'school-outline';
  else if (routeName === 'Settings') iconName = focused ? 'settings' : 'settings-outline';

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Ionicons name={iconName} size={size} color={color} />
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, tabBarShowLabel: true, tabBarActiveTintColor: '#5ac8fa', tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarStyle: styles.tabBar, tabBarLabelStyle: styles.tabLabel, tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused, color, size }) => <TabIcon focused={focused} color={color} size={20} routeName={route.name} />,
      })}
      screenListeners={({ route }) => ({ tabPress: () => { DeviceEventEmitter.emit('scrollToTop', route.name); } })}
    >
      <Tab.Screen name="Calculator" component={CalculatorScreen} />
      <Tab.Screen name="VLSM" component={VlsmScreen} />
      <Tab.Screen name="FLSM" component={FlsmScreen} />
      <Tab.Screen name="Training" component={TrainingScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const initRevenueCat = useSubnetStore((state) => state.initRevenueCat);
  const hasSeenOnboarding = useSubnetStore((state) => state.hasSeenOnboarding);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    initRevenueCat();
    // Wait for Zustand to finish loading local storage before rendering navigation
    const unsub = useSubnetStore.persist.onFinishHydration(() => setIsHydrated(true));
    setIsHydrated(useSubnetStore.persist.hasHydrated());
    return () => unsub();
  }, []);

  if (!isHydrated) return null; // Prevents the flicker!

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasSeenOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'fullScreenModal' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', left: 10, right: 10, bottom: 10, height: 68, borderTopWidth: 0, borderRadius: 22, backgroundColor: 'rgba(8,17,31,0.96)', paddingTop: 6, paddingBottom: 6, paddingHorizontal: 4 },
  tabItem: { borderRadius: 16 },
  tabLabel: { fontSize: 10, fontWeight: '700', marginTop: -2 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconWrapFocused: { backgroundColor: 'rgba(90,200,250,0.12)', borderWidth: 1, borderColor: 'rgba(90,200,250,0.22)' },
});
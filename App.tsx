import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import CalculatorScreen from './screens/CalculatorScreen';
import VlsmScreen from './screens/VlsmScreen';
import TrainingScreen from './screens/TrainingScreen';
import HistoryScreen from './screens/HistoryScreen';

const Tab = createBottomTabNavigator();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#05070b',
    card: '#08111f',
    border: 'rgba(255,255,255,0.06)',
    text: '#ffffff',
    primary: '#5ac8fa',
  },
};

function TabIcon({
  focused,
  color,
  size,
  routeName,
}: {
  focused: boolean;
  color: string;
  size: number;
  routeName: string;
}) {
  let iconName: keyof typeof Ionicons.glyphMap = 'grid-outline';

  if (routeName === 'Calculator') {
    iconName = focused ? 'calculator' : 'calculator-outline';
  } else if (routeName === 'VLSM') {
    iconName = focused ? 'git-network' : 'git-network-outline';
  } else if (routeName === 'Training') {
    iconName = focused ? 'school' : 'school-outline';
  } else if (routeName === 'History') {
    iconName = focused ? 'time' : 'time-outline';
  }

  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Ionicons name={iconName} size={size} color={color} />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={theme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: '#5ac8fa',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              color={color}
              size={20}
              routeName={route.name}
            />
          ),
        })}
        screenListeners={({ route }) => ({
          tabPress: () => {
            // Emit scroll-to-top event for the active tab
            DeviceEventEmitter.emit('scrollToTop', route.name);
          },
        })}
      >
        <Tab.Screen name="Calculator" component={CalculatorScreen} />
        <Tab.Screen name="VLSM" component={VlsmScreen} />
        <Tab.Screen name="Training" component={TrainingScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    height: 72,
    borderTopWidth: 0,
    borderRadius: 24,
    backgroundColor: 'rgba(8,17,31,0.94)',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    borderRadius: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: -2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapFocused: {
    backgroundColor: 'rgba(90,200,250,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(90,200,250,0.22)',
  },
});
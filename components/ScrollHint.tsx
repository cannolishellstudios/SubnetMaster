import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function ScrollHint() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Scroll for subnet visuals</Text>
      <Text style={styles.arrow}>⌄</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  text: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  arrow: {
    color: '#5ac8fa',
    fontSize: 22,
    fontWeight: '900',
  },
});
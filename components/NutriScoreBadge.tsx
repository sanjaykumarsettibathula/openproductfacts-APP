import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface Props {
  score: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const scoreColors: Record<string, string> = {
  A: Colors.nutriA,
  B: Colors.nutriB,
  C: Colors.nutriC,
  D: Colors.nutriD,
  E: Colors.nutriE,
};

export default function NutriScoreBadge({ score, size = 'md', showLabel = true }: Props) {
  const upper = score?.toUpperCase() || 'E';
  const color = scoreColors[upper] || '#6B7280';
  const dimensions = size === 'sm' ? 32 : size === 'md' ? 44 : 64;
  const fontSize = size === 'sm' ? 14 : size === 'md' ? 18 : 28;

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { width: dimensions, height: dimensions, borderRadius: dimensions * 0.25, backgroundColor: color }]}>
        <Text style={[styles.text, { fontSize }]}>{upper !== 'UNKNOWN' ? upper : '?'}</Text>
      </View>
      {showLabel && size !== 'sm' && (
        <Text style={styles.label}>Nutri-Score</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' as const },
  label: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500' as const },
});

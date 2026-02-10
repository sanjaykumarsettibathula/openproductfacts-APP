import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import NutriScoreBadge from './NutriScoreBadge';
import EcoScoreBadge from './EcoScoreBadge';
import { ScannedProduct } from '@/lib/storage';

interface Props {
  product: ScannedProduct;
  compact?: boolean;
}

export default function ProductCard({ product, compact = false }: Props) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[barcode]', params: { barcode: product.barcode } })}
      style={({ pressed }) => [styles.card, compact && styles.cardCompact, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.imageContainer, compact && styles.imageCompact]}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="leaf" size={compact ? 24 : 36} color={Colors.textMuted} />
          </View>
        )}
        {!compact && (
          <View style={styles.badges}>
            {product.nutri_score && product.nutri_score !== 'unknown' && (
              <NutriScoreBadge score={product.nutri_score} size="sm" showLabel={false} />
            )}
            {product.eco_score && product.eco_score !== 'unknown' && (
              <EcoScoreBadge score={product.eco_score} size="sm" showLabel={false} />
            )}
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
        {compact && product.nutri_score && product.nutri_score !== 'unknown' && (
          <View style={styles.compactBadges}>
            <NutriScoreBadge score={product.nutri_score} size="sm" showLabel={false} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: Colors.bgElevated,
  },
  imageCompact: {
    width: 70,
    height: 70,
    aspectRatio: undefined,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  info: {
    padding: 12,
    flex: 1,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  nameCompact: {
    fontSize: 14,
  },
  brand: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  compactBadges: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
});

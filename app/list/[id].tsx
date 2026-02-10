import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useData } from '@/lib/DataContext';
import ProductCard from '@/components/ProductCard';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lists, removeProductFromList } = useData();

  const list = lists.find(l => l.id === id);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (!list) {
    return (
      <View style={styles.emptyContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>List not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleRemove = (productId: string, productName: string) => {
    Alert.alert('Remove Product', `Remove "${productName}" from this list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeProductFromList(list.id, productId) },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <View style={[styles.colorDot, { backgroundColor: list.color }]} />
          <Text style={styles.title} numberOfLines={1}>{list.name}</Text>
        </View>
        <Text style={styles.count}>{list.products.length}</Text>
      </View>

      {list.description ? (
        <Text style={styles.description}>{list.description}</Text>
      ) : null}

      <FlatList
        data={list.products}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="basket-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Empty list</Text>
            <Text style={styles.emptyText}>Add products from the product detail screen</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <View style={styles.listItemCard}>
              <ProductCard product={item} compact />
            </View>
            <Pressable onPress={() => handleRemove(item.id, item.name)} hitSlop={8} style={styles.removeBtn}>
              <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  emptyContainer: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { color: Colors.textSecondary, fontSize: 16 },
  backButton: { backgroundColor: Colors.emerald, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  title: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' as const, flex: 1 },
  count: { color: Colors.textMuted, fontSize: 14 },
  description: { color: Colors.textSecondary, fontSize: 14, paddingHorizontal: 20, marginBottom: 12 },
  list: { paddingHorizontal: 20, gap: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listItemCard: { flex: 1 },
  removeBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' as const },
  emptyText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
});

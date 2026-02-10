import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, Alert, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useData } from '@/lib/DataContext';
import { fetchProductByBarcode } from '@/lib/api';
import { ScannedProduct } from '@/lib/storage';
import NutriScoreBadge from '@/components/NutriScoreBadge';
import EcoScoreBadge from '@/components/EcoScoreBadge';

export default function CompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { history } = useData();
  const [productA, setProductA] = useState<ScannedProduct | null>(null);
  const [productB, setProductB] = useState<ScannedProduct | null>(null);
  const [barcodeA, setBarcodeA] = useState('');
  const [barcodeB, setBarcodeB] = useState('');
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [showHistoryFor, setShowHistoryFor] = useState<'A' | 'B' | null>(null);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const lookupProduct = async (barcode: string, slot: 'A' | 'B') => {
    const setLoading = slot === 'A' ? setLoadingA : setLoadingB;
    const setProduct = slot === 'A' ? setProductA : setProductB;
    setLoading(true);
    const cached = history.find(p => p.barcode === barcode);
    if (cached) { setProduct(cached); setLoading(false); return; }
    const result = await fetchProductByBarcode(barcode);
    if (result) setProduct(result);
    else Alert.alert('Not Found', `No product found for barcode: ${barcode}`);
    setLoading(false);
  };

  const selectFromHistory = (product: ScannedProduct, slot: 'A' | 'B') => {
    if (slot === 'A') setProductA(product);
    else setProductB(product);
    setShowHistoryFor(null);
  };

  const renderSlot = (product: ScannedProduct | null, barcode: string, setBarcode: (v: string) => void, loading: boolean, slot: 'A' | 'B') => (
    <View style={styles.slot}>
      {product ? (
        <View style={styles.selectedProduct}>
          <Pressable onPress={() => slot === 'A' ? setProductA(null) : setProductB(null)} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
          </Pressable>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="leaf" size={28} color={Colors.textMuted} />
            </View>
          )}
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productBrand} numberOfLines={1}>{product.brand}</Text>
          <View style={styles.scoreMini}>
            {product.nutri_score !== 'unknown' && <NutriScoreBadge score={product.nutri_score} size="sm" showLabel={false} />}
            {product.eco_score !== 'unknown' && <EcoScoreBadge score={product.eco_score} size="sm" showLabel={false} />}
          </View>
        </View>
      ) : (
        <View style={styles.emptySlot}>
          {loading ? (
            <ActivityIndicator color={Colors.emerald} />
          ) : (
            <>
              <TextInput
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Barcode"
                placeholderTextColor={Colors.textMuted}
                style={styles.slotInput}
                keyboardType="number-pad"
                onSubmitEditing={() => barcode.trim().length >= 8 && lookupProduct(barcode.trim(), slot)}
              />
              <View style={styles.slotActions}>
                <Pressable
                  onPress={() => barcode.trim().length >= 8 && lookupProduct(barcode.trim(), slot)}
                  disabled={barcode.trim().length < 8}
                  style={[styles.lookupBtn, barcode.trim().length < 8 && { opacity: 0.4 }]}
                >
                  <Ionicons name="search" size={16} color="#fff" />
                </Pressable>
                <Pressable onPress={() => setShowHistoryFor(slot)} style={styles.historyBtn}>
                  <Ionicons name="time" size={16} color={Colors.emerald} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );

  const both = productA && productB;

  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      <Stack.Screen options={{ title: 'Compare', headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Compare Products</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.slotsRow}>
          {renderSlot(productA, barcodeA, setBarcodeA, loadingA, 'A')}
          <View style={styles.vsCircle}><Text style={styles.vsText}>VS</Text></View>
          {renderSlot(productB, barcodeB, setBarcodeB, loadingB, 'B')}
        </View>

        {both && (
          <View style={styles.comparisonSection}>
            <Text style={styles.sectionTitle}>Nutritional Comparison</Text>
            <Text style={styles.sectionSub}>Per 100g</Text>
            <View style={styles.comparisonCard}>
              <CompareRow label="Energy" valueA={`${Math.round(productA!.nutrition.energy_kcal)} kcal`} valueB={`${Math.round(productB!.nutrition.energy_kcal)} kcal`} lowerBetter numA={productA!.nutrition.energy_kcal} numB={productB!.nutrition.energy_kcal} />
              <CompareRow label="Fat" valueA={`${productA!.nutrition.fat.toFixed(1)}g`} valueB={`${productB!.nutrition.fat.toFixed(1)}g`} lowerBetter numA={productA!.nutrition.fat} numB={productB!.nutrition.fat} />
              <CompareRow label="Sat. Fat" valueA={`${productA!.nutrition.saturated_fat.toFixed(1)}g`} valueB={`${productB!.nutrition.saturated_fat.toFixed(1)}g`} lowerBetter numA={productA!.nutrition.saturated_fat} numB={productB!.nutrition.saturated_fat} />
              <CompareRow label="Carbs" valueA={`${productA!.nutrition.carbohydrates.toFixed(1)}g`} valueB={`${productB!.nutrition.carbohydrates.toFixed(1)}g`} numA={productA!.nutrition.carbohydrates} numB={productB!.nutrition.carbohydrates} />
              <CompareRow label="Sugars" valueA={`${productA!.nutrition.sugars.toFixed(1)}g`} valueB={`${productB!.nutrition.sugars.toFixed(1)}g`} lowerBetter numA={productA!.nutrition.sugars} numB={productB!.nutrition.sugars} />
              <CompareRow label="Fiber" valueA={`${productA!.nutrition.fiber.toFixed(1)}g`} valueB={`${productB!.nutrition.fiber.toFixed(1)}g`} higherBetter numA={productA!.nutrition.fiber} numB={productB!.nutrition.fiber} />
              <CompareRow label="Protein" valueA={`${productA!.nutrition.protein.toFixed(1)}g`} valueB={`${productB!.nutrition.protein.toFixed(1)}g`} higherBetter numA={productA!.nutrition.protein} numB={productB!.nutrition.protein} />
              <CompareRow label="Salt" valueA={`${productA!.nutrition.salt.toFixed(2)}g`} valueB={`${productB!.nutrition.salt.toFixed(2)}g`} lowerBetter numA={productA!.nutrition.salt} numB={productB!.nutrition.salt} last />
            </View>
          </View>
        )}
      </ScrollView>

      {showHistoryFor && (
        <View style={styles.historyOverlay}>
          <View style={styles.historyModal}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Select from History</Text>
              <Pressable onPress={() => setShowHistoryFor(null)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.historyList}>
              {history.length === 0 ? (
                <Text style={styles.historyEmpty}>No products in history</Text>
              ) : (
                history.map(p => (
                  <Pressable key={p.id} onPress={() => selectFromHistory(p, showHistoryFor)} style={styles.historyItem}>
                    <Text style={styles.historyItemName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.historyItemBrand} numberOfLines={1}>{p.brand}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

function CompareRow({ label, valueA, valueB, lowerBetter, higherBetter, numA, numB, last }: {
  label: string; valueA: string; valueB: string;
  lowerBetter?: boolean; higherBetter?: boolean;
  numA: number; numB: number; last?: boolean;
}) {
  let colorA = Colors.textPrimary;
  let colorB = Colors.textPrimary;
  if (numA !== numB) {
    if (lowerBetter) {
      colorA = numA < numB ? Colors.green : Colors.red;
      colorB = numB < numA ? Colors.green : Colors.red;
    } else if (higherBetter) {
      colorA = numA > numB ? Colors.green : Colors.red;
      colorB = numB > numA ? Colors.green : Colors.red;
    }
  }

  return (
    <View style={[styles.compareRow, !last && styles.compareBorder]}>
      <Text style={[styles.compareValue, { color: colorA }]}>{valueA}</Text>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={[styles.compareValue, { color: colorB }]}>{valueB}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  title: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' as const },
  slotsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, alignItems: 'center', marginBottom: 20 },
  slot: { flex: 1 },
  selectedProduct: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.border,
    minHeight: 200,
  },
  clearBtn: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
  productImage: { width: 80, height: 80 },
  productImagePlaceholder: { width: 80, height: 80, borderRadius: 12, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  productName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' as const, textAlign: 'center' },
  productBrand: { color: Colors.textSecondary, fontSize: 11, textAlign: 'center' },
  scoreMini: { flexDirection: 'row', gap: 8 },
  emptySlot: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.border,
    borderStyle: 'dashed', minHeight: 200, justifyContent: 'center',
  },
  slotInput: {
    width: '100%', backgroundColor: Colors.bgInput, borderRadius: 10, padding: 10,
    fontSize: 14, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
    textAlign: 'center',
  },
  slotActions: { flexDirection: 'row', gap: 8 },
  lookupBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.emerald, alignItems: 'center', justifyContent: 'center' },
  historyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.emeraldMuted, alignItems: 'center', justifyContent: 'center',
  },
  vsCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  vsText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' as const },
  comparisonSection: { paddingHorizontal: 20 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' as const, marginBottom: 4 },
  sectionSub: { color: Colors.textMuted, fontSize: 12, marginBottom: 12 },
  comparisonCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  compareBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  compareLabel: { flex: 1, textAlign: 'center', color: Colors.textMuted, fontSize: 12, fontWeight: '600' as const },
  compareValue: { width: 80, textAlign: 'center', fontSize: 13, fontWeight: '600' as const },
  historyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  historyModal: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '60%', padding: 20,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  historyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' as const },
  historyList: { flex: 1 },
  historyEmpty: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  historyItem: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  historyItemName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '500' as const },
  historyItemBrand: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
});

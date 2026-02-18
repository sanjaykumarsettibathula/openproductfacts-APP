import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useData } from "@/lib/DataContext";
import { fetchProductByBarcode } from "@/lib/api";
import { ScannedProduct } from "@/lib/storage";
import NutriScoreBadge from "@/components/NutriScoreBadge";
import EcoScoreBadge from "@/components/EcoScoreBadge";
import FloatingAIChat from "@/components/FloatingAIChat";
import AIHealthInsights from "@/components/AIHealthInsights";
import NutritionBarChart from "@/components/NutritionBarChart";

export default function ProductDetailScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    history,
    addScan,
    toggleFavorite,
    isFavorite,
    lists,
    addProductToList,
  } = useData();
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [showListModal, setShowListModal] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [barcode]);

  const loadProduct = async () => {
    setLoading(true);
    const cached = history.find((p) => p.barcode === barcode);
    if (cached) {
      setProduct(cached);
      setLoading(false);
      return;
    }
    const fetched = await fetchProductByBarcode(barcode || "");
    if (fetched) {
      setProduct(fetched);
      await addScan(fetched);
    }
    setLoading(false);
  };

  const handleAddToList = () => {
    if (!product) return;
    if (lists.length === 0) {
      Alert.alert(
        "No Lists Available",
        "Create a list first from the Lists tab to organize your products.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Lists",
            onPress: () => router.push("/(tabs)/lists"),
          },
        ],
      );
      return;
    }
    setShowListModal(true);
  };

  const selectList = (listId: string, listName: string) => {
    if (!product) return;
    addProductToList(listId, product);
    setShowListModal(false);
    // Show success feedback
    Alert.alert("✓ Added", `"${product.name}" added to "${listName}"`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={Colors.emerald} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons
          name="alert-circle-outline"
          size={56}
          color={Colors.textMuted}
        />
        <Text style={styles.errorText}>Product not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const fav = isFavorite(product.barcode);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.topBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.topActions}>
          <Pressable
            onPress={() => toggleFavorite(product.barcode)}
            style={styles.topBtn}
          >
            <Ionicons
              name={fav ? "heart" : "heart-outline"}
              size={22}
              color={fav ? Colors.red : Colors.textPrimary}
            />
          </Pressable>
          <Pressable onPress={handleAddToList} style={styles.topBtn}>
            <Ionicons
              name="add-circle-outline"
              size={22}
              color={Colors.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {product.image_url ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: product.image_url }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={[styles.imageContainer, styles.placeholderImage]}>
            <Ionicons name="leaf" size={64} color={Colors.textMuted} />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productBrand}>{product.brand}</Text>
          {product.quantity ? (
            <Text style={styles.quantity}>{product.quantity}</Text>
          ) : null}

          <View style={styles.scoreRow}>
            {product.nutri_score && product.nutri_score !== "unknown" && (
              <NutriScoreBadge score={product.nutri_score} size="lg" />
            )}
            {product.eco_score && product.eco_score !== "unknown" && (
              <EcoScoreBadge score={product.eco_score} size="lg" />
            )}
            {product.nova_group > 0 && (
              <View style={styles.novaContainer}>
                <View style={styles.novaBadge}>
                  <Text style={styles.novaText}>{product.nova_group}</Text>
                </View>
                <Text style={styles.novaLabel}>NOVA</Text>
              </View>
            )}
          </View>

          <AIHealthInsights product={product} />

          <Text style={styles.sectionTitle}>Nutrition Facts</Text>
          <Text style={styles.sectionSub}>
            Per 100g
            {product.serving_size ? ` / Serving: ${product.serving_size}` : ""}
          </Text>
          <NutritionBarChart product={product} />

          {product.ingredients_text ? (
            <>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.infoCard}>
                <Text style={styles.ingredientsText}>
                  {product.ingredients_text}
                </Text>
              </View>
            </>
          ) : null}

          {product.allergens.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Allergens</Text>
              <View style={styles.allergenRow}>
                {product.allergens.map((a) => (
                  <View key={a} style={styles.allergenChip}>
                    <Ionicons name="warning" size={14} color={Colors.orange} />
                    <Text style={styles.allergenText}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {product.labels.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Labels & Certifications</Text>
              <View style={styles.labelRow}>
                {product.labels.map((l) => (
                  <View key={l} style={styles.labelChip}>
                    <Text style={styles.labelText}>{l}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {(product.origins ||
            product.packaging ||
            product.stores ||
            product.countries) && (
            <>
              <Text style={styles.sectionTitle}>Additional Info</Text>
              <View style={styles.infoCard}>
                {product.origins ? (
                  <InfoRow
                    icon="globe-outline"
                    label="Origins"
                    value={product.origins}
                  />
                ) : null}
                {product.packaging ? (
                  <InfoRow
                    icon="cube-outline"
                    label="Packaging"
                    value={product.packaging}
                  />
                ) : null}
                {product.stores ? (
                  <InfoRow
                    icon="storefront-outline"
                    label="Stores"
                    value={product.stores}
                  />
                ) : null}
                {product.countries ? (
                  <InfoRow
                    icon="flag-outline"
                    label="Countries"
                    value={product.countries}
                  />
                ) : null}
              </View>
            </>
          )}

          <View style={styles.barcodeInfo}>
            <Ionicons
              name="barcode-outline"
              size={18}
              color={Colors.textMuted}
            />
            <Text style={styles.barcodeText}>{product.barcode}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Custom Add to List Modal */}
      <Modal
        visible={showListModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowListModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowListModal(false)}
        >
          <Pressable
            style={styles.listModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="list" size={24} color={Colors.emerald} />
                </View>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Add to List</Text>
                  <Text style={styles.modalSubtitle}>
                    Choose a list for "{product.name}"
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowListModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.listScroll}
              showsVerticalScrollIndicator={false}
            >
              {lists.map((list) => (
                <Pressable
                  key={list.id}
                  onPress={() => selectList(list.id, list.name)}
                  style={styles.listOption}
                >
                  <View style={styles.listOptionLeft}>
                    <View
                      style={[
                        styles.listColorDot,
                        { backgroundColor: list.color || Colors.emerald },
                      ]}
                    />
                    <View style={styles.listOptionInfo}>
                      <Text style={styles.listOptionName}>{list.name}</Text>
                      {list.description && (
                        <Text style={styles.listOptionDesc} numberOfLines={1}>
                          {list.description}
                        </Text>
                      )}
                      <Text style={styles.listOptionCount}>
                        {list.products?.length || 0} items
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Colors.textMuted}
                  />
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  setShowListModal(false);
                  router.push("/(tabs)/lists");
                }}
                style={styles.createListBtn}
              >
                <Ionicons name="add" size={20} color={Colors.emerald} />
                <Text style={styles.createListBtnText}>Create New List</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {product && (
        <FloatingAIChat
          visible={true}
          productContext={{
            barcode: product.barcode,
            name: product.name,
            brand: product.brand,
          }}
        />
      )}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={Colors.textMuted} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: { color: Colors.textSecondary, fontSize: 16 },
  backButton: {
    backgroundColor: Colors.emerald,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" as const },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: Colors.bg,
    zIndex: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topActions: { flexDirection: "row", gap: 10 },
  scroll: { flex: 1 },
  imageContainer: {
    height: 280,
    backgroundColor: Colors.bgElevated,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
  },
  placeholderImage: { alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  content: { paddingHorizontal: 20 },
  productName: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  productBrand: { color: Colors.textSecondary, fontSize: 16, marginBottom: 4 },
  quantity: { color: Colors.textMuted, fontSize: 14, marginBottom: 16 },
  scoreRow: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
    paddingVertical: 20,
    marginBottom: 8,
  },
  novaContainer: { alignItems: "center", gap: 4 },
  novaBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  novaText: { color: "#fff", fontSize: 28, fontWeight: "700" as const },
  novaLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "700" as const,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionSub: { color: Colors.textMuted, fontSize: 12, marginBottom: 10 },
  nutritionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  ingredientsText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  allergenRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  allergenChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(249,115,22,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.3)",
  },
  allergenText: {
    color: Colors.orange,
    fontSize: 13,
    fontWeight: "500" as const,
  },
  labelRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  labelChip: {
    backgroundColor: Colors.emeraldMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  labelText: {
    color: Colors.emerald,
    fontSize: 13,
    fontWeight: "500" as const,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  infoLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  infoValue: { color: Colors.textSecondary, fontSize: 13, flex: 1 },
  barcodeInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
  },
  barcodeText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  listModal: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalHeaderContent: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.emeraldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  listScroll: {
    maxHeight: 400,
    paddingTop: 8,
  },
  listOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listOptionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  listOptionInfo: {
    flex: 1,
  },
  listOptionName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 2,
  },
  listOptionDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  listOptionCount: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  createListBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.emeraldMuted,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.emerald,
  },
  createListBtnText: {
    color: Colors.emerald,
    fontSize: 16,
    fontWeight: "600" as const,
  },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useData } from "@/lib/DataContext";
import { fetchProductByBarcode } from "@/lib/api";
import { ScannedProduct } from "@/lib/storage";
import NutriScoreBadge from "@/components/NutriScoreBadge";
import EcoScoreBadge from "@/components/EcoScoreBadge";

export default function CompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { history } = useData();
  const [productA, setProductA] = useState<ScannedProduct | null>(null);
  const [productB, setProductB] = useState<ScannedProduct | null>(null);
  const [barcodeA, setBarcodeA] = useState("");
  const [barcodeB, setBarcodeB] = useState("");
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [showHistoryFor, setShowHistoryFor] = useState<"A" | "B" | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  // Debug: Log history when component mounts or history changes
  useEffect(() => {
    console.log("History data:", history);
    console.log("History length:", history?.length || 0);
  }, [history]);

  const lookupProduct = async (barcode: string, slot: "A" | "B") => {
    const setLoading = slot === "A" ? setLoadingA : setLoadingB;
    const setProduct = slot === "A" ? setProductA : setProductB;
    setLoading(true);
    const cached = history.find((p) => p.barcode === barcode);
    if (cached) {
      console.log("Found in cache:", cached.name);
      setProduct(cached);
      setLoading(false);
      return;
    }
    const result = await fetchProductByBarcode(barcode);
    if (result) {
      console.log("Fetched from API:", result.name);
      setProduct(result);
    } else {
      Alert.alert("Not Found", `No product found for barcode: ${barcode}`);
    }
    setLoading(false);
  };

  const selectFromHistory = (product: ScannedProduct, slot: "A" | "B") => {
    console.log("Selecting from history:", product.name, "for slot", slot);
    if (slot === "A") {
      setProductA(product);
      setBarcodeA(product.barcode);
    } else {
      setProductB(product);
      setBarcodeB(product.barcode);
    }
    setShowHistoryFor(null);
  };

  const openHistoryModal = (slot: "A" | "B") => {
    console.log("Opening history for slot:", slot);
    console.log("Current history:", history);
    console.log("History items count:", history?.length);
    if (history && history.length > 0) {
      console.log("First item:", history[0]);
    }
    setShowHistoryFor(slot);
  };

  const renderSlot = (
    product: ScannedProduct | null,
    barcode: string,
    setBarcode: (v: string) => void,
    loading: boolean,
    slot: "A" | "B",
  ) => (
    <View style={styles.slot}>
      {product ? (
        <View style={styles.selectedProduct}>
          <Pressable
            onPress={() => {
              if (slot === "A") {
                setProductA(null);
                setBarcodeA("");
              } else {
                setProductB(null);
                setBarcodeB("");
              }
            }}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
          </Pressable>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="leaf" size={28} color={Colors.textMuted} />
            </View>
          )}
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.productBrand} numberOfLines={1}>
            {product.brand}
          </Text>
          <View style={styles.scoreMini}>
            {product.nutri_score !== "unknown" && (
              <NutriScoreBadge
                score={product.nutri_score}
                size="sm"
                showLabel={false}
              />
            )}
            {product.eco_score !== "unknown" && (
              <EcoScoreBadge
                score={product.eco_score}
                size="sm"
                showLabel={false}
              />
            )}
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
                placeholder="Enter barcode"
                placeholderTextColor={Colors.textMuted}
                style={styles.slotInput}
                keyboardType="number-pad"
                onSubmitEditing={() =>
                  barcode.trim().length >= 8 &&
                  lookupProduct(barcode.trim(), slot)
                }
              />
              <View style={styles.slotActions}>
                <Pressable
                  onPress={() =>
                    barcode.trim().length >= 8 &&
                    lookupProduct(barcode.trim(), slot)
                  }
                  disabled={barcode.trim().length < 8}
                  style={[
                    styles.lookupBtn,
                    barcode.trim().length < 8 && { opacity: 0.4 },
                  ]}
                >
                  <Ionicons name="search" size={16} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => openHistoryModal(slot)}
                  style={styles.historyBtn}
                >
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

  // Calculate winner
  const getWinner = () => {
    if (!both) return null;

    let scoreA = 0;
    let scoreB = 0;

    // Nutri-score (lower letter = better)
    const nutriScoreMap: Record<string, number> = {
      a: 5,
      b: 4,
      c: 3,
      d: 2,
      e: 1,
      unknown: 0,
    };
    scoreA += nutriScoreMap[productA.nutri_score.toLowerCase()] || 0;
    scoreB += nutriScoreMap[productB.nutri_score.toLowerCase()] || 0;

    // Eco-score (lower letter = better)
    scoreA += nutriScoreMap[productA.eco_score.toLowerCase()] || 0;
    scoreB += nutriScoreMap[productB.eco_score.toLowerCase()] || 0;

    // Nutrition (lower is better for most)
    if (productA.nutrition.energy_kcal < productB.nutrition.energy_kcal)
      scoreA++;
    else if (productB.nutrition.energy_kcal < productA.nutrition.energy_kcal)
      scoreB++;

    if (productA.nutrition.fat < productB.nutrition.fat) scoreA++;
    else if (productB.nutrition.fat < productA.nutrition.fat) scoreB++;

    if (productA.nutrition.saturated_fat < productB.nutrition.saturated_fat)
      scoreA++;
    else if (
      productB.nutrition.saturated_fat < productA.nutrition.saturated_fat
    )
      scoreB++;

    if (productA.nutrition.sugars < productB.nutrition.sugars) scoreA++;
    else if (productB.nutrition.sugars < productA.nutrition.sugars) scoreB++;

    if (productA.nutrition.salt < productB.nutrition.salt) scoreA++;
    else if (productB.nutrition.salt < productA.nutrition.salt) scoreB++;

    // Higher is better
    if (productA.nutrition.fiber > productB.nutrition.fiber) scoreA++;
    else if (productB.nutrition.fiber > productA.nutrition.fiber) scoreB++;

    if (productA.nutrition.protein > productB.nutrition.protein) scoreA++;
    else if (productB.nutrition.protein > productA.nutrition.protein) scoreB++;

    if (scoreA > scoreB) return "A";
    if (scoreB > scoreA) return "B";
    return "tie";
  };

  const winner = getWinner();

  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      <Stack.Screen options={{ title: "Compare", headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Compare Products</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.slotsRow}>
          {renderSlot(productA, barcodeA, setBarcodeA, loadingA, "A")}
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          {renderSlot(productB, barcodeB, setBarcodeB, loadingB, "B")}
        </View>

        {both && (
          <>
            {/* Winner Banner */}
            {winner && winner !== "tie" && (
              <View style={styles.winnerBanner}>
                <Ionicons name="trophy" size={20} color={Colors.emerald} />
                <Text style={styles.winnerText}>
                  {winner === "A" ? productA.name : productB.name} is the
                  healthier choice!
                </Text>
              </View>
            )}
            {winner === "tie" && (
              <View
                style={[
                  styles.winnerBanner,
                  { backgroundColor: Colors.bgCard },
                ]}
              >
                <Ionicons name="scale" size={20} color={Colors.textMuted} />
                <Text
                  style={[styles.winnerText, { color: Colors.textPrimary }]}
                >
                  Both products are nutritionally similar
                </Text>
              </View>
            )}

            {/* Scores Comparison */}
            <View style={styles.comparisonSection}>
              <Text style={styles.sectionTitle}>Health Scores</Text>
              <View style={styles.scoresRow}>
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreCardLabel}>Nutri-Score</Text>
                  <View style={styles.scoreCardValues}>
                    <NutriScoreBadge
                      score={productA.nutri_score}
                      size="lg"
                      showLabel={false}
                    />
                    <Text style={styles.scoreVs}>vs</Text>
                    <NutriScoreBadge
                      score={productB.nutri_score}
                      size="lg"
                      showLabel={false}
                    />
                  </View>
                </View>
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreCardLabel}>Eco-Score</Text>
                  <View style={styles.scoreCardValues}>
                    <EcoScoreBadge
                      score={productA.eco_score}
                      size="lg"
                      showLabel={false}
                    />
                    <Text style={styles.scoreVs}>vs</Text>
                    <EcoScoreBadge
                      score={productB.eco_score}
                      size="lg"
                      showLabel={false}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Nutritional Comparison */}
            <View style={styles.comparisonSection}>
              <Text style={styles.sectionTitle}>Nutritional Comparison</Text>
              <Text style={styles.sectionSub}>Per 100g</Text>
              <View style={styles.comparisonCard}>
                <CompareRow
                  label="Energy"
                  valueA={`${Math.round(productA.nutrition.energy_kcal)} kcal`}
                  valueB={`${Math.round(productB.nutrition.energy_kcal)} kcal`}
                  lowerBetter
                  numA={productA.nutrition.energy_kcal}
                  numB={productB.nutrition.energy_kcal}
                />
                <CompareRow
                  label="Fat"
                  valueA={`${productA.nutrition.fat.toFixed(1)}g`}
                  valueB={`${productB.nutrition.fat.toFixed(1)}g`}
                  lowerBetter
                  numA={productA.nutrition.fat}
                  numB={productB.nutrition.fat}
                />
                <CompareRow
                  label="Sat. Fat"
                  valueA={`${productA.nutrition.saturated_fat.toFixed(1)}g`}
                  valueB={`${productB.nutrition.saturated_fat.toFixed(1)}g`}
                  lowerBetter
                  numA={productA.nutrition.saturated_fat}
                  numB={productB.nutrition.saturated_fat}
                />
                <CompareRow
                  label="Carbs"
                  valueA={`${productA.nutrition.carbohydrates.toFixed(1)}g`}
                  valueB={`${productB.nutrition.carbohydrates.toFixed(1)}g`}
                  numA={productA.nutrition.carbohydrates}
                  numB={productB.nutrition.carbohydrates}
                />
                <CompareRow
                  label="Sugars"
                  valueA={`${productA.nutrition.sugars.toFixed(1)}g`}
                  valueB={`${productB.nutrition.sugars.toFixed(1)}g`}
                  lowerBetter
                  numA={productA.nutrition.sugars}
                  numB={productB.nutrition.sugars}
                />
                <CompareRow
                  label="Fiber"
                  valueA={`${productA.nutrition.fiber.toFixed(1)}g`}
                  valueB={`${productB.nutrition.fiber.toFixed(1)}g`}
                  higherBetter
                  numA={productA.nutrition.fiber}
                  numB={productB.nutrition.fiber}
                />
                <CompareRow
                  label="Protein"
                  valueA={`${productA.nutrition.protein.toFixed(1)}g`}
                  valueB={`${productB.nutrition.protein.toFixed(1)}g`}
                  higherBetter
                  numA={productA.nutrition.protein}
                  numB={productB.nutrition.protein}
                />
                <CompareRow
                  label="Salt"
                  valueA={`${productA.nutrition.salt.toFixed(2)}g`}
                  valueB={`${productB.nutrition.salt.toFixed(2)}g`}
                  lowerBetter
                  numA={productA.nutrition.salt}
                  numB={productB.nutrition.salt}
                  last
                />
              </View>
            </View>

            {/* Ingredients & Allergens */}
            <View style={styles.comparisonSection}>
              <Text style={styles.sectionTitle}>Ingredients & Allergens</Text>
              <View style={styles.ingredientsCard}>
                <View style={styles.ingredientColumn}>
                  <Text style={styles.ingredientHeader}>{productA.name}</Text>
                  {productA.allergens && productA.allergens.length > 0 && (
                    <View style={styles.allergenSection}>
                      <View style={styles.allergenHeader}>
                        <Ionicons
                          name="warning"
                          size={14}
                          color={Colors.orange}
                        />
                        <Text style={styles.allergenTitle}>Allergens</Text>
                      </View>
                      {productA.allergens.map((allergen, idx) => (
                        <Text key={idx} style={styles.allergenText}>
                          • {allergen}
                        </Text>
                      ))}
                    </View>
                  )}
                  {(!productA.allergens || productA.allergens.length === 0) && (
                    <Text style={styles.noAllergens}>No common allergens</Text>
                  )}
                </View>
                <View style={styles.divider} />
                <View style={styles.ingredientColumn}>
                  <Text style={styles.ingredientHeader}>{productB.name}</Text>
                  {productB.allergens && productB.allergens.length > 0 && (
                    <View style={styles.allergenSection}>
                      <View style={styles.allergenHeader}>
                        <Ionicons
                          name="warning"
                          size={14}
                          color={Colors.orange}
                        />
                        <Text style={styles.allergenTitle}>Allergens</Text>
                      </View>
                      {productB.allergens.map((allergen, idx) => (
                        <Text key={idx} style={styles.allergenText}>
                          • {allergen}
                        </Text>
                      ))}
                    </View>
                  )}
                  {(!productB.allergens || productB.allergens.length === 0) && (
                    <Text style={styles.noAllergens}>No common allergens</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Processing Level (NOVA) */}
            <View style={styles.comparisonSection}>
              <Text style={styles.sectionTitle}>Processing Level</Text>
              <View style={styles.processingCard}>
                <View style={styles.processingColumn}>
                  <Text style={styles.processingLabel}>NOVA Group</Text>
                  <View
                    style={[
                      styles.novaBadge,
                      { backgroundColor: getNovaColor(productA.nova_group) },
                    ]}
                  >
                    <Text style={styles.novaText}>{productA.nova_group}</Text>
                  </View>
                  <Text style={styles.novaDesc}>
                    {getNovaDescription(productA.nova_group)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.processingColumn}>
                  <Text style={styles.processingLabel}>NOVA Group</Text>
                  <View
                    style={[
                      styles.novaBadge,
                      { backgroundColor: getNovaColor(productB.nova_group) },
                    ]}
                  >
                    <Text style={styles.novaText}>{productB.nova_group}</Text>
                  </View>
                  <Text style={styles.novaDesc}>
                    {getNovaDescription(productB.nova_group)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Key Insights */}
            <View style={styles.comparisonSection}>
              <Text style={styles.sectionTitle}>Key Insights</Text>
              <View style={styles.insightsCard}>
                {generateInsights(productA, productB).map((insight, idx) => (
                  <View key={idx} style={styles.insightRow}>
                    <Ionicons
                      name={
                        insight.type === "good"
                          ? "checkmark-circle"
                          : insight.type === "bad"
                            ? "alert-circle"
                            : "information-circle"
                      }
                      size={18}
                      color={
                        insight.type === "good"
                          ? Colors.green
                          : insight.type === "bad"
                            ? Colors.orange
                            : Colors.blue
                      }
                    />
                    <Text style={styles.insightText}>{insight.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* History Modal - FIXED */}
      {showHistoryFor && (
        <Pressable
          style={styles.historyOverlay}
          onPress={() => setShowHistoryFor(null)}
        >
          <Pressable
            style={styles.historyModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Select from History</Text>
              <Pressable onPress={() => setShowHistoryFor(null)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.historyList}
              showsVerticalScrollIndicator={false}
            >
              {!history || history.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <Ionicons
                    name="time-outline"
                    size={48}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.historyEmpty}>
                    No products in history
                  </Text>
                  <Text style={styles.historyEmptySub}>
                    Scan some products first!
                  </Text>
                </View>
              ) : (
                <>
                  {history.map((p, index) => {
                    console.log(
                      "Rendering history item:",
                      p.name,
                      "at index",
                      index,
                    );
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          console.log("Selected product:", p.name);
                          selectFromHistory(p, showHistoryFor);
                        }}
                        style={styles.historyItem}
                      >
                        <View style={styles.historyItemContent}>
                          {p.image_url ? (
                            <Image
                              source={{ uri: p.image_url }}
                              style={styles.historyItemImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.historyItemImagePlaceholder}>
                              <Ionicons
                                name="leaf"
                                size={20}
                                color={Colors.textMuted}
                              />
                            </View>
                          )}
                          <View style={styles.historyItemInfo}>
                            <Text
                              style={styles.historyItemName}
                              numberOfLines={1}
                            >
                              {p.name}
                            </Text>
                            <Text
                              style={styles.historyItemBrand}
                              numberOfLines={1}
                            >
                              {p.brand}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={Colors.textMuted}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}

function CompareRow({
  label,
  valueA,
  valueB,
  lowerBetter,
  higherBetter,
  numA,
  numB,
  last,
}: {
  label: string;
  valueA: string;
  valueB: string;
  lowerBetter?: boolean;
  higherBetter?: boolean;
  numA: number;
  numB: number;
  last?: boolean;
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
      <Text
        style={[
          styles.compareValue,
          {
            color: colorA,
            fontWeight:
              numA !== numB &&
              ((lowerBetter && numA < numB) || (higherBetter && numA > numB))
                ? ("700" as const)
                : ("400" as const),
          },
        ]}
      >
        {valueA}
      </Text>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text
        style={[
          styles.compareValue,
          {
            color: colorB,
            fontWeight:
              numA !== numB &&
              ((lowerBetter && numB < numA) || (higherBetter && numB > numA))
                ? ("700" as const)
                : ("400" as const),
          },
        ]}
      >
        {valueB}
      </Text>
    </View>
  );
}

function getNovaColor(group: number): string {
  if (group === 1) return Colors.green;
  if (group === 2) return Colors.yellow;
  if (group === 3) return Colors.orange;
  return Colors.red;
}

function getNovaDescription(group: number): string {
  if (group === 1) return "Unprocessed or minimally processed";
  if (group === 2) return "Processed culinary ingredients";
  if (group === 3) return "Processed foods";
  return "Ultra-processed foods";
}

function generateInsights(
  productA: ScannedProduct,
  productB: ScannedProduct,
): Array<{ type: "good" | "bad" | "info"; text: string }> {
  const insights: Array<{ type: "good" | "bad" | "info"; text: string }> = [];

  // Sugar comparison
  const sugarDiff = Math.abs(
    productA.nutrition.sugars - productB.nutrition.sugars,
  );
  if (sugarDiff > 5) {
    const lower =
      productA.nutrition.sugars < productB.nutrition.sugars
        ? productA
        : productB;
    insights.push({
      type: "good",
      text: `${lower.name} has ${sugarDiff.toFixed(1)}g less sugar per 100g`,
    });
  }

  // Salt comparison
  const saltDiff = Math.abs(productA.nutrition.salt - productB.nutrition.salt);
  if (saltDiff > 0.5) {
    const lower =
      productA.nutrition.salt < productB.nutrition.salt ? productA : productB;
    insights.push({
      type: "good",
      text: `${lower.name} has ${saltDiff.toFixed(1)}g less salt per 100g`,
    });
  }

  // Protein comparison
  const proteinDiff = Math.abs(
    productA.nutrition.protein - productB.nutrition.protein,
  );
  if (proteinDiff > 3) {
    const higher =
      productA.nutrition.protein > productB.nutrition.protein
        ? productA
        : productB;
    insights.push({
      type: "good",
      text: `${higher.name} has ${proteinDiff.toFixed(1)}g more protein per 100g`,
    });
  }

  // NOVA comparison
  if (productA.nova_group !== productB.nova_group) {
    const lessProcessed =
      productA.nova_group < productB.nova_group ? productA : productB;
    insights.push({
      type: "info",
      text: `${lessProcessed.name} is less processed (NOVA ${lessProcessed.nova_group})`,
    });
  }

  // Allergen warning
  const allergenA = productA.allergens?.length || 0;
  const allergenB = productB.allergens?.length || 0;
  if (allergenA > 0 || allergenB > 0) {
    const moreAllergens = allergenA > allergenB ? productA : productB;
    const count = Math.max(allergenA, allergenB);
    if (count > 2) {
      insights.push({
        type: "bad",
        text: `${moreAllergens.name} contains ${count} common allergens`,
      });
    }
  }

  return insights;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: "700" as const,
  },
  slotsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  slot: { flex: 1 },
  selectedProduct: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 200,
  },
  clearBtn: { position: "absolute", top: 8, right: 8, zIndex: 1 },
  productImage: { width: 80, height: 80 },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  productBrand: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
  },
  scoreMini: { flexDirection: "row", gap: 8 },
  emptySlot: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    minHeight: 200,
    justifyContent: "center",
  },
  slotInput: {
    width: "100%",
    backgroundColor: Colors.bgInput,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: "center",
  },
  slotActions: { flexDirection: "row", gap: 8 },
  lookupBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  historyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.emeraldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  vsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vsText: { color: Colors.textMuted, fontSize: 12, fontWeight: "700" as const },
  winnerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.emeraldMuted,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  winnerText: {
    flex: 1,
    color: Colors.emerald,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  comparisonSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  sectionSub: { color: Colors.textMuted, fontSize: 12, marginBottom: 12 },
  scoresRow: { flexDirection: "row", gap: 12 },
  scoreCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreCardLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600" as const,
    marginBottom: 10,
    textAlign: "center",
  },
  scoreCardValues: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scoreVs: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600" as const,
  },
  comparisonCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  compareBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  compareLabel: {
    flex: 1,
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  compareValue: { width: 80, textAlign: "center", fontSize: 13 },
  ingredientsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
  },
  ingredientColumn: { flex: 1 },
  ingredientHeader: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "600" as const,
    marginBottom: 12,
  },
  allergenSection: { gap: 6 },
  allergenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  allergenTitle: {
    color: Colors.orange,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  allergenText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  noAllergens: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: "italic",
  },
  divider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  processingCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
  },
  processingColumn: {
    flex: 1,
    alignItems: "center",
  },
  processingLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600" as const,
    marginBottom: 10,
  },
  novaBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  novaText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700" as const,
  },
  novaDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
  },
  insightsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  insightText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  historyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  historyModal: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "70%", // Changed from maxHeight to height
    padding: 20,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  historyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "700" as const,
  },
  historyList: {
    flex: 1,
  },
  emptyHistoryContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  historyEmpty: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: "600" as const,
    textAlign: "center",
  },
  historyEmptySub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  historyItemImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "500" as const,
  },
  historyItemBrand: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});

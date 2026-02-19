import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { ScannedProduct } from "@/lib/storage";
import {
  searchHealthierAlternatives,
  AlternativeProduct,
} from "@/lib/alternatives";
import { searchProducts } from "@/lib/api";
import { useData } from "@/lib/DataContext";

interface HealthierAlternativesProps {
  product: ScannedProduct;
  showAlternatives: boolean;
}

export default function HealthierAlternatives({
  product,
  showAlternatives,
}: HealthierAlternativesProps) {
  const router = useRouter();
  const { addScan } = useData();
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  // Track which card is currently being navigated to (shows per-card spinner)
  const [navigatingIndex, setNavigatingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (showAlternatives) {
      loadAlternatives();
    }
  }, [showAlternatives, product.barcode]);

  const loadAlternatives = async () => {
    setLoading(true);
    try {
      const results = await searchHealthierAlternatives(product);
      setAlternatives(results);
    } catch (err) {
      console.error("Failed to load alternatives:", err);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // HANDLE TAP ON ALTERNATIVE CARD
  // Flow:
  //   1. Has real barcode → navigate directly (product detail fetches data)
  //   2. No barcode (AI-only result) → search by name → navigate
  // ------------------------------------------------------------------
  const handleAlternativeTap = async (
    alt: AlternativeProduct,
    index: number,
  ) => {
    if (navigatingIndex !== null) return; // prevent double-tap
    setNavigatingIndex(index);

    try {
      // Case 1: We have a real OFF barcode — go straight to product detail
      if (alt.barcode && alt.barcode.trim().length > 0) {
        router.push({
          pathname: "/product/[barcode]",
          params: { barcode: alt.barcode },
        });
        return;
      }

      // Case 2: No barcode (AI suggested, OFF didn't find it)
      // Search by name to get a real product with barcode
      console.log(`🔍 No barcode for "${alt.name}" — searching by name...`);
      const searchResult = await searchProducts(alt.name, 1);

      if (searchResult.products.length > 0) {
        const found = searchResult.products[0];
        // Save to history so product detail screen can find it instantly
        await addScan(found);
        router.push({
          pathname: "/product/[barcode]",
          params: { barcode: found.barcode },
        });
      } else {
        // Last resort: create a stub barcode from name for navigation,
        // product detail will use AI to fill in the data
        const stubBarcode = `ALT-${alt.name.replace(/\s+/g, "-").slice(0, 30)}-${Date.now()}`;
        const stubProduct: ScannedProduct = {
          id: stubBarcode,
          barcode: stubBarcode,
          name: alt.name,
          brand: alt.brand,
          image_url: alt.image_url || "",
          nutri_score: alt.nutri_score,
          eco_score: "unknown",
          nova_group: alt.nova_group,
          categories: "",
          ingredients_text: "",
          allergens: [],
          nutrition: {
            energy_kcal: 0,
            energy_kj: 0,
            fat: 0,
            saturated_fat: 0,
            carbohydrates: 0,
            sugars: 0,
            fiber: 0,
            protein: 0,
            salt: 0,
            sodium: 0,
          },
          serving_size: "",
          quantity: "",
          packaging: "",
          origins: "",
          labels: [],
          stores: "",
          countries: "",
          scanned_at: new Date().toISOString(),
        };
        await addScan(stubProduct as any);
        router.push({
          pathname: "/product/[barcode]",
          params: { barcode: stubBarcode },
        });
      }
    } catch (err) {
      console.error("❌ Alternative navigation failed:", err);
    } finally {
      setNavigatingIndex(null);
    }
  };

  if (!showAlternatives) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="swap-horizontal" size={24} color={Colors.emerald} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Healthier Alternatives</Text>
          <Text style={styles.subtitle}>
            Same type, better nutrition profile
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.emerald} size="small" />
          <Text style={styles.loadingText}>Finding healthier options...</Text>
        </View>
      ) : alternatives.length > 0 ? (
        <View style={styles.alternativesList}>
          {alternatives.map((alt, index) => (
            <Pressable
              key={`${alt.name}-${index}`}
              style={({ pressed }) => [
                styles.alternativeCard,
                pressed && styles.alternativeCardPressed,
                navigatingIndex === index && styles.alternativeCardLoading,
              ]}
              onPress={() => handleAlternativeTap(alt, index)}
              disabled={navigatingIndex !== null}
            >
              {/* Product image */}
              <View style={styles.imageContainer}>
                {alt.image_url ? (
                  <Image
                    source={{ uri: alt.image_url }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="leaf" size={28} color={Colors.textMuted} />
                  </View>
                )}
              </View>

              {/* Product info */}
              <View style={styles.infoContainer}>
                <Text style={styles.alternativeName} numberOfLines={2}>
                  {alt.name}
                </Text>
                {alt.brand ? (
                  <Text style={styles.alternativeBrand} numberOfLines={1}>
                    {alt.brand}
                  </Text>
                ) : null}

                <View style={styles.benefitBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={13}
                    color={Colors.emerald}
                  />
                  <Text style={styles.benefitText} numberOfLines={2}>
                    {alt.reason}
                  </Text>
                </View>

                <View style={styles.scoresRow}>
                  {alt.nutri_score && alt.nutri_score !== "unknown" && (
                    <View
                      style={[
                        styles.miniScore,
                        { backgroundColor: getScoreColor(alt.nutri_score) },
                      ]}
                    >
                      <Text style={styles.miniScoreText}>
                        {alt.nutri_score}
                      </Text>
                    </View>
                  )}
                  {alt.nova_group > 0 && (
                    <View style={[styles.miniScore, styles.novaScore]}>
                      <Text style={styles.miniScoreText}>{alt.nova_group}</Text>
                    </View>
                  )}
                  {!alt.barcode && (
                    <View style={styles.aiChip}>
                      <Text style={styles.aiChipText}>AI</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Right: chevron or spinner */}
              {navigatingIndex === index ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.emerald}
                  style={{ marginLeft: 4 }}
                />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={Colors.textMuted}
                />
              )}
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="information-circle-outline"
            size={32}
            color={Colors.textMuted}
          />
          <Text style={styles.emptyText}>
            No healthier alternatives found for this product type.
          </Text>
        </View>
      )}

      <View style={styles.infoFooter}>
        <Ionicons name="bulb-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.infoFooterText}>
          Tap any product to view full nutritional details
        </Text>
      </View>
    </View>
  );
}

function getScoreColor(score: string): string {
  switch (score.toUpperCase()) {
    case "A":
      return Colors.nutriA;
    case "B":
      return Colors.nutriB;
    case "C":
      return Colors.nutriC;
    case "D":
      return Colors.nutriD;
    case "E":
      return Colors.nutriE;
    default:
      return Colors.textMuted;
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.emeraldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 32,
  },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  alternativesList: { gap: 12 },
  alternativeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alternativeCardPressed: {
    backgroundColor: Colors.bgElevated,
    transform: [{ scale: 0.98 }],
  },
  alternativeCardLoading: {
    opacity: 0.7,
  },
  imageContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    overflow: "hidden",
    flexShrink: 0,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: { flex: 1, gap: 3 },
  alternativeName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 19,
  },
  alternativeBrand: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  benefitBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 3,
  },
  benefitText: {
    color: Colors.emerald,
    fontSize: 11,
    fontWeight: "500" as const,
    flexShrink: 1,
    lineHeight: 15,
  },
  scoresRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 5,
    alignItems: "center",
    flexWrap: "wrap",
  },
  miniScore: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  novaScore: { backgroundColor: Colors.blue },
  miniScoreText: { color: "#fff", fontSize: 11, fontWeight: "700" as const },
  aiChip: {
    backgroundColor: "rgba(99,102,241,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiChipText: {
    color: Colors.blue,
    fontSize: 10,
    fontWeight: "700" as const,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  infoFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoFooterText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: "italic",
  },
});

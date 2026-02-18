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

interface HealthierAlternativesProps {
  product: ScannedProduct;
  showAlternatives: boolean;
}

export default function HealthierAlternatives({
  product,
  showAlternatives,
}: HealthierAlternativesProps) {
  const router = useRouter();
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (!showAlternatives) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="swap-horizontal" size={24} color={Colors.emerald} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Healthier Alternatives</Text>
          <Text style={styles.subtitle}>
            Better options with improved nutritional profile
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.emerald} size="small" />
          <Text style={styles.loadingText}>Finding healthier options...</Text>
        </View>
      ) : alternatives.length > 0 ? (
        <View style={styles.alternativesList}>
          {alternatives.map((alt, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.alternativeCard,
                pressed && styles.alternativeCardPressed,
              ]}
              onPress={() => {
                router.push({
                  pathname: "/product/[barcode]",
                  params: { barcode: alt.barcode },
                });
              }}
            >
              <View style={styles.imageContainer}>
                {alt.image_url ? (
                  <Image
                    source={{ uri: alt.image_url }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="leaf" size={32} color={Colors.textMuted} />
                  </View>
                )}
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.alternativeName} numberOfLines={2}>
                  {alt.name}
                </Text>
                {alt.brand && (
                  <Text style={styles.alternativeBrand} numberOfLines={1}>
                    {alt.brand}
                  </Text>
                )}

                <View style={styles.benefitBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={Colors.emerald}
                  />
                  <Text style={styles.benefitText}>{alt.reason}</Text>
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
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.textMuted}
              />
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
            No healthier alternatives found in the database for this product
            category.
          </Text>
        </View>
      )}

      <View style={styles.infoFooter}>
        <Ionicons name="bulb-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.infoFooterText}>
          Tap any product to view full nutritional details
        </Text>
      </View>
    </View>
  );
}

function getScoreColor(score: string): string {
  const upper = score.toUpperCase();
  switch (upper) {
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
  headerText: {
    flex: 1,
  },
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
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  alternativesList: {
    gap: 12,
  },
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
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  alternativeName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "600" as const,
    lineHeight: 20,
  },
  alternativeBrand: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  benefitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  benefitText: {
    color: Colors.emerald,
    fontSize: 11,
    fontWeight: "600" as const,
  },
  scoresRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  miniScore: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  novaScore: {
    backgroundColor: Colors.blue,
  },
  miniScoreText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
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

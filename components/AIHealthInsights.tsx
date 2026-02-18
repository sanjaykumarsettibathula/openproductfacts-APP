import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useData } from "@/lib/DataContext";
import { ScannedProduct } from "@/lib/storage";

interface AIHealthInsightsProps {
  product: ScannedProduct;
}

export default function AIHealthInsights({ product }: AIHealthInsightsProps) {
  const { profile } = useData();

  const generateHealthInsights = () => {
    const insights: {
      icon: string;
      text: string;
      type: "info" | "success" | "warning" | "danger";
    }[] = [];
    const warnings: {
      icon: string;
      text: string;
      type: "info" | "success" | "warning" | "danger";
    }[] = [];
    const recommendations: {
      icon: string;
      text: string;
      type: "info" | "success" | "warning" | "danger";
    }[] = [];

    // Check for allergen conflicts
    const conflictingAllergens = product.allergens.filter((allergen) =>
      profile.allergies.includes(allergen),
    );

    if (conflictingAllergens.length > 0) {
      warnings.push({
        icon: "warning",
        text: `⚠️ Contains ${conflictingAllergens.join(", ")} which you're allergic to. Avoid this product.`,
        type: "danger",
      });
    }

    // Check for health conditions
    if (profile.conditions.includes("Diabetes")) {
      const sugarContent = product.nutrition.sugars;
      if (sugarContent > 15) {
        warnings.push({
          icon: "alert-circle",
          text: `High sugar content (${sugarContent.toFixed(1)}g per 100g). Not suitable for diabetes management.`,
          type: "warning",
        });
      } else {
        recommendations.push({
          icon: "checkmark-circle",
          text: `Moderate sugar content (${sugarContent.toFixed(1)}g per 100g). Suitable in moderation.`,
          type: "success",
        });
      }
    }

    if (profile.conditions.includes("Hypertension")) {
      const sodiumContent = product.nutrition.sodium * 1000; // Convert to mg
      if (sodiumContent > 400) {
        warnings.push({
          icon: "alert-circle",
          text: `High sodium content (${sodiumContent.toFixed(0)}mg per 100g). May affect blood pressure.`,
          type: "warning",
        });
      } else {
        recommendations.push({
          icon: "checkmark-circle",
          text: `Low sodium content (${sodiumContent.toFixed(0)}mg per 100g). Good for blood pressure management.`,
          type: "success",
        });
      }
    }

    // Check dietary restrictions
    if (profile.dietary_restrictions.includes("Vegetarian")) {
      if (
        product.ingredients_text.toLowerCase().includes("meat") ||
        product.ingredients_text.toLowerCase().includes("fish") ||
        product.ingredients_text.toLowerCase().includes("chicken")
      ) {
        warnings.push({
          icon: "warning",
          text: "Contains meat/fish ingredients. Not suitable for vegetarian diet.",
          type: "danger",
        });
      }
    }

    if (profile.dietary_restrictions.includes("Vegan")) {
      if (
        product.ingredients_text.toLowerCase().includes("milk") ||
        product.ingredients_text.toLowerCase().includes("eggs") ||
        product.ingredients_text.toLowerCase().includes("dairy")
      ) {
        warnings.push({
          icon: "warning",
          text: "Contains animal-derived ingredients. Not suitable for vegan diet.",
          type: "danger",
        });
      }
    }

    // General health insights based on nutrition
    const { nutrition } = product;

    if (nutrition.fiber > 6) {
      recommendations.push({
        icon: "checkmark-circle",
        text: `High in fiber (${nutrition.fiber.toFixed(1)}g per 100g). Good for digestive health.`,
        type: "success",
      });
    }

    if (nutrition.protein > 15) {
      recommendations.push({
        icon: "checkmark-circle",
        text: `Good protein source (${nutrition.protein.toFixed(1)}g per 100g). Supports muscle health.`,
        type: "success",
      });
    }

    if (nutrition.saturated_fat > 5) {
      warnings.push({
        icon: "alert-circle",
        text: `High saturated fat (${nutrition.saturated_fat.toFixed(1)}g per 100g). Limit consumption.`,
        type: "warning",
      });
    }

    // Overall assessment
    let overallAssessment = "";
    let assessmentType = "neutral";

    if (warnings.length > 0 && warnings.some((w) => w.type === "danger")) {
      overallAssessment =
        "This product is not recommended for you due to serious health conflicts.";
      assessmentType = "danger";
    } else if (warnings.length > 2) {
      overallAssessment =
        "This product has several concerns for your health profile. Consider alternatives.";
      assessmentType = "warning";
    } else if (recommendations.length > warnings.length) {
      overallAssessment =
        "This product appears to be a good choice for your health profile.";
      assessmentType = "success";
    } else {
      overallAssessment =
        "This product can be consumed in moderation with your health profile.";
      assessmentType = "neutral";
    }

    return {
      insights,
      warnings,
      recommendations,
      overallAssessment,
      assessmentType,
    };
  };

  const { warnings, recommendations, overallAssessment, assessmentType } =
    generateHealthInsights();

  const getAssessmentColor = () => {
    switch (assessmentType) {
      case "danger":
        return Colors.red;
      case "warning":
        return Colors.orange;
      case "success":
        return Colors.emerald;
      default:
        return Colors.textSecondary;
    }
  };

  const getAssessmentIcon = () => {
    switch (assessmentType) {
      case "danger":
        return "warning";
      case "warning":
        return "alert-circle";
      case "success":
        return "checkmark-circle";
      default:
        return "information-circle";
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>AI Health Insights</Text>

      {/* Overall Assessment */}
      <View
        style={[styles.assessmentCard, { borderColor: getAssessmentColor() }]}
      >
        <View style={styles.assessmentHeader}>
          <Ionicons
            name={getAssessmentIcon() as any}
            size={24}
            color={getAssessmentColor()}
          />
          <Text
            style={[styles.assessmentTitle, { color: getAssessmentColor() }]}
          >
            Overall Assessment
          </Text>
        </View>
        <Text style={styles.assessmentText}>{overallAssessment}</Text>
      </View>

      {/* Warnings */}
      {warnings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>⚠️ Health Concerns</Text>
          {warnings.map((warning, index) => (
            <View key={index} style={[styles.insightCard, styles.warningCard]}>
              <Ionicons
                name={warning.icon as any}
                size={20}
                color={warning.type === "danger" ? Colors.red : Colors.orange}
              />
              <Text style={styles.insightText}>{warning.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>✅ Health Benefits</Text>
          {recommendations.map((rec, index) => (
            <View key={index} style={[styles.insightCard, styles.successCard]}>
              <Ionicons
                name={rec.icon as any}
                size={20}
                color={Colors.emerald}
              />
              <Text style={styles.insightText}>{rec.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  assessmentCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  assessmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  assessmentText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  subsectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  warningCard: {
    borderColor: Colors.orange,
    backgroundColor: "rgba(249,115,22,0.05)",
  },
  successCard: {
    borderColor: Colors.emerald,
    backgroundColor: "rgba(16,185,129,0.05)",
  },
  insightText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});

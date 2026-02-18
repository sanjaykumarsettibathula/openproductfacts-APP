import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useData } from "@/lib/DataContext";
import { ScannedProduct } from "@/lib/storage";

interface AIHealthInsightsProps {
  product: ScannedProduct;
}

type InsightItem = {
  icon: string;
  text: string;
  type: "info" | "success" | "warning" | "danger";
};

type AssessmentType = "danger" | "warning" | "caution" | "neutral" | "success";

export default function AIHealthInsights({ product }: AIHealthInsightsProps) {
  const { profile } = useData();

  const generateHealthInsights = () => {
    const warnings: InsightItem[] = [];
    const recommendations: InsightItem[] = [];

    // Scoring system: lower is worse
    // Range: -100 (dangerous) to +100 (excellent)
    let healthScore = 0;

    // ========================================================================
    // CRITICAL CHECKS — Instant Disqualification
    // ========================================================================

    // 1. ALLERGEN CONFLICTS (CRITICAL — instant red flag)
    const conflictingAllergens = product.allergens.filter((allergen) =>
      profile.allergies.some(
        (a) =>
          a.toLowerCase().includes(allergen.toLowerCase()) ||
          allergen.toLowerCase().includes(a.toLowerCase()),
      ),
    );

    if (conflictingAllergens.length > 0) {
      warnings.push({
        icon: "warning",
        text: `⚠️ DANGER: Contains ${conflictingAllergens.join(", ")} — you have a known allergy. Do not consume this product.`,
        type: "danger",
      });
      healthScore -= 1000; // Instant disqualification
    }

    // ========================================================================
    // NUTRI-SCORE EVALUATION (Heavy weight — official nutritional quality grade)
    // ========================================================================
    const nutriScore = product.nutri_score?.toUpperCase();

    if (nutriScore === "E") {
      warnings.push({
        icon: "alert-circle",
        text: `Nutri-Score E (worst grade): Very poor nutritional quality. High in calories, sugar, saturated fat, or sodium with minimal nutritional benefits.`,
        type: "warning",
      });
      healthScore -= 40;
    } else if (nutriScore === "D") {
      warnings.push({
        icon: "alert-circle",
        text: `Nutri-Score D: Below-average nutritional quality. Should be consumed sparingly.`,
        type: "warning",
      });
      healthScore -= 25;
    } else if (nutriScore === "C") {
      healthScore -= 10; // Neutral-negative, no message
    } else if (nutriScore === "B") {
      recommendations.push({
        icon: "checkmark-circle",
        text: `Nutri-Score B: Good nutritional quality. Balanced composition.`,
        type: "success",
      });
      healthScore += 20;
    } else if (nutriScore === "A") {
      recommendations.push({
        icon: "checkmark-circle",
        text: `Nutri-Score A (best grade): Excellent nutritional quality. Rich in beneficial nutrients.`,
        type: "success",
      });
      healthScore += 35;
    }

    // ========================================================================
    // NOVA GROUP EVALUATION (Processing level)
    // ========================================================================
    const nova = product.nova_group;

    if (nova === 4) {
      warnings.push({
        icon: "alert-circle",
        text: `NOVA Group 4: Ultra-processed food with industrial formulations. May contain additives, preservatives, and altered ingredients. Linked to health risks when consumed frequently.`,
        type: "warning",
      });
      healthScore -= 20;
    } else if (nova === 3) {
      healthScore -= 5; // Processed but not ultra
    } else if (nova === 2) {
      healthScore += 5; // Processed culinary ingredients
    } else if (nova === 1) {
      recommendations.push({
        icon: "checkmark-circle",
        text: `NOVA Group 1: Unprocessed or minimally processed food. Excellent choice.`,
        type: "success",
      });
      healthScore += 15;
    }

    // ========================================================================
    // USER HEALTH CONDITIONS — Personalized Analysis
    // ========================================================================

    // DIABETES + Sugar content
    if (
      profile.conditions.includes("Diabetes") ||
      profile.dietary_restrictions.includes("Low Sugar")
    ) {
      const sugar = product.nutrition.sugars;

      if (sugar > 15) {
        warnings.push({
          icon: "alert-circle",
          text: `❌ High sugar (${sugar.toFixed(1)}g/100g): NOT suitable for diabetes or low-sugar diet. Can cause dangerous blood glucose spikes.`,
          type: "danger",
        });
        healthScore -= 35;
      } else if (sugar > 10) {
        warnings.push({
          icon: "alert-circle",
          text: `⚠️ Elevated sugar (${sugar.toFixed(1)}g/100g): Concerning for diabetes management. Limit portions strictly.`,
          type: "warning",
        });
        healthScore -= 20;
      } else if (sugar > 5) {
        warnings.push({
          icon: "alert-circle",
          text: `Moderate sugar (${sugar.toFixed(1)}g/100g): Acceptable in small portions for diabetes, but monitor blood glucose.`,
          type: "warning",
        });
        healthScore -= 10;
      } else {
        recommendations.push({
          icon: "checkmark-circle",
          text: `✅ Low sugar (${sugar.toFixed(1)}g/100g): Safe for diabetes management.`,
          type: "success",
        });
        healthScore += 15;
      }
    }

    // HYPERTENSION + Sodium content
    if (
      profile.conditions.includes("Hypertension") ||
      profile.dietary_restrictions.includes("Low Sodium")
    ) {
      const sodiumMg = product.nutrition.sodium * 1000;

      if (sodiumMg > 600) {
        warnings.push({
          icon: "alert-circle",
          text: `❌ Very high sodium (${sodiumMg.toFixed(0)}mg/100g): Can elevate blood pressure. Not recommended for hypertension.`,
          type: "danger",
        });
        healthScore -= 30;
      } else if (sodiumMg > 400) {
        warnings.push({
          icon: "alert-circle",
          text: `⚠️ High sodium (${sodiumMg.toFixed(0)}mg/100g): May affect blood pressure. Limit consumption.`,
          type: "warning",
        });
        healthScore -= 15;
      } else if (sodiumMg > 200) {
        warnings.push({
          icon: "alert-circle",
          text: `Moderate sodium (${sodiumMg.toFixed(0)}mg/100g): Acceptable in moderation for hypertension.`,
          type: "warning",
        });
        healthScore -= 5;
      } else {
        recommendations.push({
          icon: "checkmark-circle",
          text: `✅ Low sodium (${sodiumMg.toFixed(0)}mg/100g): Good for blood pressure management.`,
          type: "success",
        });
        healthScore += 15;
      }
    }

    // HIGH CHOLESTEROL + Saturated Fat
    if (
      profile.conditions.includes("High Cholesterol") ||
      profile.conditions.includes("Heart Disease")
    ) {
      const satFat = product.nutrition.saturated_fat;

      if (satFat > 10) {
        warnings.push({
          icon: "alert-circle",
          text: `❌ Very high saturated fat (${satFat.toFixed(1)}g/100g): Can raise LDL cholesterol. Avoid if managing heart health.`,
          type: "danger",
        });
        healthScore -= 30;
      } else if (satFat > 5) {
        warnings.push({
          icon: "alert-circle",
          text: `⚠️ High saturated fat (${satFat.toFixed(1)}g/100g): May impact cholesterol levels. Limit intake.`,
          type: "warning",
        });
        healthScore -= 15;
      } else if (satFat > 2) {
        healthScore -= 5;
      } else {
        recommendations.push({
          icon: "checkmark-circle",
          text: `✅ Low saturated fat (${satFat.toFixed(1)}g/100g): Heart-healthy choice.`,
          type: "success",
        });
        healthScore += 10;
      }
    }

    // CELIAC DISEASE / Gluten allergy
    if (
      profile.conditions.includes("Celiac Disease") ||
      profile.allergies.some((a) => a.toLowerCase().includes("gluten"))
    ) {
      const hasGluten =
        product.ingredients_text.toLowerCase().includes("wheat") ||
        product.ingredients_text.toLowerCase().includes("barley") ||
        product.ingredients_text.toLowerCase().includes("rye") ||
        product.ingredients_text.toLowerCase().includes("gluten") ||
        product.allergens.some((a) => a.toLowerCase().includes("gluten"));

      if (hasGluten) {
        warnings.push({
          icon: "warning",
          text: `⚠️ DANGER: Contains gluten (wheat/barley/rye). Strictly avoid with Celiac disease.`,
          type: "danger",
        });
        healthScore -= 1000;
      }
    }

    // ========================================================================
    // DIETARY RESTRICTIONS
    // ========================================================================

    if (profile.dietary_restrictions.includes("Vegetarian")) {
      const hasMeat =
        product.ingredients_text.toLowerCase().includes("meat") ||
        product.ingredients_text.toLowerCase().includes("fish") ||
        product.ingredients_text.toLowerCase().includes("chicken") ||
        product.ingredients_text.toLowerCase().includes("pork") ||
        product.ingredients_text.toLowerCase().includes("beef") ||
        product.ingredients_text.toLowerCase().includes("gelatin");

      if (hasMeat) {
        warnings.push({
          icon: "warning",
          text: `⚠️ Contains animal meat/fish ingredients. Not suitable for vegetarian diet.`,
          type: "danger",
        });
        healthScore -= 1000;
      }
    }

    if (profile.dietary_restrictions.includes("Vegan")) {
      const hasAnimal =
        product.ingredients_text.toLowerCase().includes("milk") ||
        product.ingredients_text.toLowerCase().includes("egg") ||
        product.ingredients_text.toLowerCase().includes("dairy") ||
        product.ingredients_text.toLowerCase().includes("cream") ||
        product.ingredients_text.toLowerCase().includes("butter") ||
        product.ingredients_text.toLowerCase().includes("honey") ||
        product.ingredients_text.toLowerCase().includes("gelatin") ||
        product.allergens.some((a) =>
          ["milk", "egg", "dairy"].some((d) => a.toLowerCase().includes(d)),
        );

      if (hasAnimal) {
        warnings.push({
          icon: "warning",
          text: `⚠️ Contains animal-derived ingredients (dairy/eggs/honey). Not suitable for vegan diet.`,
          type: "danger",
        });
        healthScore -= 1000;
      }
    }

    if (profile.dietary_restrictions.includes("Halal")) {
      const hasPork =
        product.ingredients_text.toLowerCase().includes("pork") ||
        product.ingredients_text.toLowerCase().includes("bacon") ||
        product.ingredients_text.toLowerCase().includes("lard") ||
        product.ingredients_text.toLowerCase().includes("ham");

      if (hasPork) {
        warnings.push({
          icon: "warning",
          text: `⚠️ Contains pork or pork-derived ingredients. Not Halal.`,
          type: "danger",
        });
        healthScore -= 1000;
      }
    }

    if (profile.dietary_restrictions.includes("Kosher")) {
      const hasPork =
        product.ingredients_text.toLowerCase().includes("pork") ||
        product.ingredients_text.toLowerCase().includes("shellfish");

      if (hasPork) {
        warnings.push({
          icon: "warning",
          text: `⚠️ Contains pork or shellfish. Not Kosher.`,
          type: "danger",
        });
        healthScore -= 1000;
      }
    }

    // ========================================================================
    // POSITIVE NUTRITIONAL FACTORS
    // ========================================================================

    if (product.nutrition.fiber > 6) {
      recommendations.push({
        icon: "checkmark-circle",
        text: `✅ High fiber (${product.nutrition.fiber.toFixed(1)}g/100g): Excellent for digestive health and blood sugar control.`,
        type: "success",
      });
      healthScore += 15;
    } else if (product.nutrition.fiber > 3) {
      recommendations.push({
        icon: "checkmark-circle",
        text: `Good fiber content (${product.nutrition.fiber.toFixed(1)}g/100g): Supports digestion.`,
        type: "success",
      });
      healthScore += 8;
    }

    if (product.nutrition.protein > 20) {
      recommendations.push({
        icon: "checkmark-circle",
        text: `✅ High protein (${product.nutrition.protein.toFixed(1)}g/100g): Excellent for muscle health and satiety.`,
        type: "success",
      });
      healthScore += 15;
    } else if (product.nutrition.protein > 10) {
      recommendations.push({
        icon: "checkmark-circle",
        text: `Good protein source (${product.nutrition.protein.toFixed(1)}g/100g): Supports muscle maintenance.`,
        type: "success",
      });
      healthScore += 8;
    }

    // ========================================================================
    // OVERALL ASSESSMENT DETERMINATION
    // Uses weighted health score + warning severity
    // ========================================================================

    let overallAssessment = "";
    let assessmentType: AssessmentType = "neutral";

    // Critical disqualifiers override everything
    const hasCriticalWarning = warnings.some((w) => w.type === "danger");
    const warningCount = warnings.length;
    const severeWarningCount = warnings.filter(
      (w) => w.type === "danger" || w.type === "warning",
    ).length;

    if (hasCriticalWarning) {
      overallAssessment =
        "⛔ DO NOT CONSUME: This product contains ingredients that are dangerous for your health profile (allergens, dietary violations, or severe health conflicts). Avoid completely.";
      assessmentType = "danger";
    } else if (healthScore < -50) {
      overallAssessment =
        "❌ NOT RECOMMENDED: This product has very poor nutritional quality and/or multiple concerns for your health conditions. Choose healthier alternatives.";
      assessmentType = "danger";
    } else if (healthScore < -20 || severeWarningCount >= 3) {
      overallAssessment =
        "⚠️ POOR CHOICE: This product has significant nutritional concerns for your health profile. If consumed, limit portions strictly and choose better options when possible.";
      assessmentType = "warning";
    } else if (healthScore < 0 || warningCount > recommendations.length) {
      overallAssessment =
        "⚠️ CONSUME WITH CAUTION: This product has some health concerns. Can be consumed occasionally in small portions, but better alternatives exist.";
      assessmentType = "caution";
    } else if (healthScore >= 30) {
      overallAssessment =
        "✅ EXCELLENT CHOICE: This product has high nutritional quality and aligns well with your health profile. Safe to consume regularly.";
      assessmentType = "success";
    } else if (healthScore >= 10) {
      overallAssessment =
        "✓ GOOD CHOICE: This product appears suitable for your health profile. Can be consumed regularly as part of a balanced diet.";
      assessmentType = "success";
    } else {
      overallAssessment =
        "ACCEPTABLE: This product can be consumed in moderation as part of your diet. No major concerns, but also no standout benefits.";
      assessmentType = "neutral";
    }

    return {
      warnings,
      recommendations,
      overallAssessment,
      assessmentType,
      healthScore, // For debugging
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
      case "caution":
        return "#F59E0B";
      case "success":
        return Colors.emerald;
      default:
        return Colors.textSecondary;
    }
  };

  const getAssessmentIcon = () => {
    switch (assessmentType) {
      case "danger":
        return "close-circle";
      case "warning":
        return "alert-circle";
      case "caution":
        return "alert";
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
  container: { marginBottom: 20 },
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
  assessmentTitle: { fontSize: 16, fontWeight: "600" },
  assessmentText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  section: { marginBottom: 16 },
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

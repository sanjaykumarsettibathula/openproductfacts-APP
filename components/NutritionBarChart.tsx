import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "@/constants/colors";
import { ScannedProduct } from "@/lib/storage";

interface NutritionBarChartProps {
  product: ScannedProduct;
}

interface NutritionItem {
  label: string;
  value: number;
  unit: string;
  color: string;
  max: number;
  recommendation?: string;
}

export default function NutritionBarChart({ product }: NutritionBarChartProps) {
  const { nutrition } = product;

  const nutritionData: NutritionItem[] = [
    {
      label: "Energy",
      value: nutrition.energy_kcal,
      unit: "kcal",
      color: Colors.blue,
      max: 2000,
      recommendation: "Daily intake: ~2000 kcal",
    },
    {
      label: "Fat",
      value: nutrition.fat,
      unit: "g",
      color: Colors.orange,
      max: 70,
      recommendation: "Limit: <70g per day",
    },
    {
      label: "Saturated Fat",
      value: nutrition.saturated_fat,
      unit: "g",
      color: Colors.red,
      max: 20,
      recommendation: "Limit: <20g per day",
    },
    {
      label: "Carbohydrates",
      value: nutrition.carbohydrates,
      unit: "g",
      color: Colors.emerald,
      max: 300,
      recommendation: "Daily intake: ~300g",
    },
    {
      label: "Sugars",
      value: nutrition.sugars,
      unit: "g",
      color: Colors.yellow,
      max: 50,
      recommendation: "Limit: <50g per day",
    },
    {
      label: "Fiber",
      value: nutrition.fiber,
      unit: "g",
      color: Colors.lime,
      max: 30,
      recommendation: "Target: >25g per day",
    },
    {
      label: "Protein",
      value: nutrition.protein,
      unit: "g",
      color: Colors.blue,
      max: 50,
      recommendation: "Target: ~50g per day",
    },
    {
      label: "Salt",
      value: nutrition.salt,
      unit: "g",
      color: Colors.orange,
      max: 6,
      recommendation: "Limit: <6g per day",
    },
  ];

  const getBarWidth = (value: number, max: number) => {
    const percentage = Math.min((value / max) * 100, 100);
    return percentage;
  };

  const getBarColor = (value: number, max: number, baseColor: string) => {
    const percentage = (value / max) * 100;
    if (percentage > 80) return Colors.red; // High - concerning
    if (percentage > 60) return Colors.orange; // Medium-high - caution
    if (percentage > 30) return baseColor; // Medium - acceptable
    return Colors.emerald; // Low - good
  };

  const getHealthStatus = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage > 80) return "High";
    if (percentage > 60) return "Medium-High";
    if (percentage > 30) return "Medium";
    return "Low";
  };

  const getHealthStatusColor = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage > 80) return Colors.red;
    if (percentage > 60) return Colors.orange;
    if (percentage > 30) return Colors.textSecondary;
    return Colors.emerald;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Nutrition Analysis</Text>
      <Text style={styles.sectionSub}>Per 100g serving</Text>

      {nutritionData.map((item, index) => {
        const barWidth = getBarWidth(item.value, item.max);
        const barColor = getBarColor(item.value, item.max, item.color);
        const healthStatus = getHealthStatus(item.value, item.max);
        const healthColor = getHealthStatusColor(item.value, item.max);

        return (
          <View key={index} style={styles.nutritionItem}>
            <View style={styles.nutritionHeader}>
              <View style={styles.nutritionLabelRow}>
                <Text style={styles.nutritionLabel}>{item.label}</Text>
                <Text style={[styles.healthStatus, { color: healthColor }]}>
                  {healthStatus}
                </Text>
              </View>
              <Text style={styles.nutritionValue}>
                {item.value.toFixed(1)}
                {item.unit}
              </Text>
            </View>

            <View style={styles.barContainer}>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.percentageText}>
                {barWidth.toFixed(0)}% of daily limit
              </Text>
            </View>

            {item.recommendation && (
              <Text style={styles.recommendation}>{item.recommendation}</Text>
            )}
          </View>
        );
      })}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendColor, { backgroundColor: Colors.emerald }]}
          />
          <Text style={styles.legendText}>Low (Good)</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendColor,
              { backgroundColor: Colors.textSecondary },
            ]}
          />
          <Text style={styles.legendText}>Medium</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendColor, { backgroundColor: Colors.orange }]}
          />
          <Text style={styles.legendText}>Medium-High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: Colors.red }]} />
          <Text style={styles.legendText}>High (Limit)</Text>
        </View>
      </View>
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
    marginBottom: 4,
  },
  sectionSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 16,
  },
  nutritionItem: {
    marginBottom: 16,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  nutritionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nutritionLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  healthStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  nutritionValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  barContainer: {
    marginBottom: 4,
  },
  barBackground: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    minWidth: 2,
  },
  percentageText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  recommendation: {
    color: Colors.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
});

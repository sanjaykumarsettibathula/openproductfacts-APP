import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { useData } from "@/lib/DataContext";
import { UserProfile } from "@/lib/storage";
import { logoutUser } from "@/lib/auth";

const ALLERGEN_OPTIONS = [
  "Gluten",
  "Milk",
  "Eggs",
  "Fish",
  "Peanuts",
  "Soy",
  "Tree Nuts",
  "Shellfish",
  "Sesame",
  "Celery",
  "Mustard",
  "Lupin",
];
const CONDITION_OPTIONS = [
  "Diabetes",
  "Hypertension",
  "Heart Disease",
  "Celiac Disease",
  "High Cholesterol",
  "Obesity",
  "Anemia",
  "Kidney Disease",
];
const DIET_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Low Sodium",
  "Low Sugar",
  "Keto",
  "Paleo",
  "Gluten Free",
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, updateProfile, history, favorites } = useData();
  const [form, setForm] = useState<UserProfile>(profile);
  const [dirty, setDirty] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const update = (key: keyof UserProfile, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const toggleArrayItem = (
    key: "allergies" | "conditions" | "dietary_restrictions",
    item: string,
  ) => {
    const arr = form[key] as string[];
    const updated = arr.includes(item)
      ? arr.filter((a) => a !== item)
      : [...arr, item];
    update(key, updated);
  };

  const handleSave = () => {
    updateProfile(form);
    setDirty(false);
    Alert.alert("Saved", "Your profile has been updated.");
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logoutUser();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 12 }}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Profile</Text>
            <View style={styles.headerActions}>
              {dirty && (
                <Pressable onPress={handleSave} style={styles.saveBtn}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </Pressable>
              )}
              <Pressable onPress={handleLogout} style={styles.logoutBtn}>
                <Ionicons
                  name="log-out"
                  size={20}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{history.length}</Text>
              <Text style={styles.statLabel}>Scanned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{favorites.length}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Personal Info</Text>
          <View style={styles.card}>
            <FieldRow
              label="Name"
              value={form.name}
              onChangeText={(v) => update("name", v)}
              placeholder="Your name"
            />
            <View style={styles.fieldRow}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput
                  value={form.age}
                  onChangeText={(v) => update("age", v)}
                  placeholder="--"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.fieldInput}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <TextInput
                  value={form.gender}
                  onChangeText={(v) => update("gender", v)}
                  placeholder="--"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.fieldInput}
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Height (cm)</Text>
                <TextInput
                  value={form.height}
                  onChangeText={(v) => update("height", v)}
                  placeholder="--"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.fieldInput}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Weight (kg)</Text>
                <TextInput
                  value={form.weight}
                  onChangeText={(v) => update("weight", v)}
                  placeholder="--"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.fieldInput}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Allergies</Text>
          <View style={styles.chipGrid}>
            {ALLERGEN_OPTIONS.map((a) => (
              <Pressable
                key={a}
                onPress={() => toggleArrayItem("allergies", a)}
                style={[
                  styles.chip,
                  form.allergies.includes(a) && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.allergies.includes(a) && styles.chipTextActive,
                  ]}
                >
                  {a}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Health Conditions</Text>
          <View style={styles.chipGrid}>
            {CONDITION_OPTIONS.map((c) => (
              <Pressable
                key={c}
                onPress={() => toggleArrayItem("conditions", c)}
                style={[
                  styles.chip,
                  form.conditions.includes(c) && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.conditions.includes(c) && styles.chipTextActive,
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Dietary Preferences</Text>
          <View style={styles.chipGrid}>
            {DIET_OPTIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => toggleArrayItem("dietary_restrictions", d)}
                style={[
                  styles.chip,
                  form.dietary_restrictions.includes(d) && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.dietary_restrictions.includes(d) &&
                      styles.chipTextActive,
                  ]}
                >
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            value={form.notes}
            onChangeText={(v) => update("notes", v)}
            placeholder="Any additional health notes..."
            placeholderTextColor={Colors.textMuted}
            style={styles.notesInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {dirty && (
            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function FieldRow({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.fieldInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: "700" as const,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: "700" as const,
  },
  statLabel: { color: Colors.textSecondary, fontSize: 12 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: "700" as const,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  field: { gap: 6 },
  fieldRow: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1, gap: 6 },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  fieldInput: {
    backgroundColor: Colors.bgInput,
    borderRadius: 10,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.emeraldMuted,
    borderColor: Colors.emerald,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "500" as const,
  },
  chipTextActive: { color: Colors.emerald },
  notesInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 100,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.emerald,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" as const },
});

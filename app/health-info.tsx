import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import {
  updateUserProfile,
  getCurrentUser,
  completeOnboarding,
} from "@/lib/auth";
import { UserProfile } from "@/lib/storage";

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
];

const CONDITION_OPTIONS = [
  "Diabetes",
  "Hypertension",
  "Heart Disease",
  "Celiac Disease",
  "High Cholesterol",
];

const DIET_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Low Sodium",
  "Low Sugar",
];

export default function HealthInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [customInputVisible, setCustomInputVisible] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [modalType, setModalType] = useState<
    "allergies" | "conditions" | "dietary_restrictions"
  >("allergies");

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    allergies: [],
    conditions: [],
    dietary_restrictions: [],
    notes: "",
  });

  // Load existing profile data on component mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { getProfile } = require("@/lib/storage");
        const existingProfile = await getProfile();
        setProfile(existingProfile);
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };

    loadProfile();
  }, []);

  const toggleArrayItem = (
    key: "allergies" | "conditions" | "dietary_restrictions",
    item: string,
  ) => {
    const arr = (profile[key] as string[]) || [];
    const updated = arr.includes(item)
      ? arr.filter((a) => a !== item)
      : [...arr, item];
    setProfile((prev) => ({ ...prev, [key]: updated }));
  };

  const openAddModal = (
    type: "allergies" | "conditions" | "dietary_restrictions",
  ) => {
    setModalType(type);
    setModalVisible(true);
  };

  const addNewItem = (item: string) => {
    toggleArrayItem(modalType, item);
  };

  const handleAddCustom = () => {
    if (customInput.trim()) {
      toggleArrayItem(modalType, customInput.trim());
      setCustomInput("");
      setCustomInputVisible(false);
      setModalVisible(false);
    }
  };

  const handleComplete = async () => {
    if (!profile.age || !profile.gender) {
      Alert.alert("Required Fields", "Please fill in age and gender");
      return;
    }

    setLoading(true);
    try {
      // Get current user data to merge with health profile
      const currentUser = await getCurrentUser();
      const updatedProfile = {
        ...profile,
        name: currentUser?.name || profile.name,
      };

      await updateUserProfile(updatedProfile as UserProfile);
      await completeOnboarding(); // Mark onboarding as complete
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (
    title: string,
    data: string[],
    type: "allergies" | "conditions" | "dietary_restrictions",
  ) => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openAddModal(type)}
          >
            <Ionicons name="add" size={16} color={Colors.emerald} />
          </TouchableOpacity>
        </View>

        {data.length === 0 ? (
          <Text style={styles.emptyText}>
            Tap + to add {title.toLowerCase()}
          </Text>
        ) : (
          <View style={styles.itemList}>
            {data.map((item, index) => (
              <View key={index} style={styles.item}>
                <Text style={styles.itemText}>{item}</Text>
                <TouchableOpacity
                  onPress={() => toggleArrayItem(type, item)}
                  style={styles.removeItem}
                >
                  <Ionicons name="close" size={16} color={Colors.red} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const getModalOptions = () => {
    switch (modalType) {
      case "allergies":
        return ALLERGEN_OPTIONS;
      case "conditions":
        return CONDITION_OPTIONS;
      case "dietary_restrictions":
        return DIET_OPTIONS;
      default:
        return [];
    }
  };

  const getModalTitle = () => {
    switch (modalType) {
      case "allergies":
        return "Add Allergy";
      case "conditions":
        return "Add Health Condition";
      case "dietary_restrictions":
        return "Add Dietary Preference";
      default:
        return "";
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.innerContainer, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Health Information</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                value={profile.name || ""}
                onChangeText={(v) =>
                  setProfile((prev) => ({ ...prev, name: v }))
                }
                style={styles.fieldInput}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Age *</Text>
                <TextInput
                  value={profile.age || ""}
                  onChangeText={(v) =>
                    setProfile((prev) => ({ ...prev, age: v }))
                  }
                  style={styles.fieldInput}
                  placeholder="Age"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Height (cm)</Text>
                <TextInput
                  value={profile.height || ""}
                  onChangeText={(v) =>
                    setProfile((prev) => ({ ...prev, height: v }))
                  }
                  style={styles.fieldInput}
                  placeholder="Height"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Gender *</Text>
              <View style={styles.genderContainer}>
                {["Male", "Female", "Other"].map((gender) => (
                  <Pressable
                    key={gender}
                    onPress={() => setProfile((prev) => ({ ...prev, gender }))}
                    style={[
                      styles.genderOption,
                      profile.gender === gender && styles.genderOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        profile.gender === gender && styles.genderTextSelected,
                      ]}
                    >
                      {gender}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput
                value={profile.weight || ""}
                onChangeText={(v) =>
                  setProfile((prev) => ({ ...prev, weight: v }))
                }
                style={styles.fieldInput}
                placeholder="Weight"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {renderSection("Allergies", profile.allergies || [], "allergies")}
          {renderSection(
            "Health Conditions",
            profile.conditions || [],
            "conditions",
          )}
          {renderSection(
            "Dietary Preferences",
            profile.dietary_restrictions || [],
            "dietary_restrictions",
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <View style={styles.notesContainer}>
              <TextInput
                value={profile.notes || ""}
                onChangeText={(v) =>
                  setProfile((prev) => ({ ...prev, notes: v }))
                }
                placeholder="Any additional health notes..."
                placeholderTextColor={Colors.textMuted}
                style={styles.notesInput}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <Pressable
            onPress={handleComplete}
            style={styles.button}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Complete Setup</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>

      {/* Add Item Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setCustomInputVisible(false);
          setCustomInput("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setCustomInputVisible(false);
                  setCustomInput("");
                }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {!customInputVisible ? (
              <>
                <ScrollView style={styles.modalScroll}>
                  {getModalOptions().map((option) => {
                    const isSelected = (
                      profile[modalType] as string[]
                    )?.includes(option);
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.modalOption,
                          isSelected && styles.modalOptionSelected,
                        ]}
                        onPress={() => addNewItem(option)}
                      >
                        <Text
                          style={[
                            styles.modalOptionText,
                            isSelected && styles.modalOptionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={Colors.emerald}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <TouchableOpacity
                  style={styles.customButton}
                  onPress={() => setCustomInputVisible(true)}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={Colors.emerald}
                  />
                  <Text style={styles.customButtonText}>Add Custom Item</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.customInputContainer}>
                <TextInput
                  value={customInput}
                  onChangeText={setCustomInput}
                  style={styles.customInputField}
                  placeholder={`Enter custom ${modalType === "allergies" ? "allergy" : modalType === "conditions" ? "condition" : "preference"}`}
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
                <View style={styles.customInputButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setCustomInputVisible(false);
                      setCustomInput("");
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addCustomButton}
                    onPress={handleAddCustom}
                  >
                    <Text style={styles.addCustomButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  innerContainer: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgCard,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.emeraldMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 4,
  },
  itemList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 92, 0.3)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    gap: 6,
  },
  itemText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  removeItem: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
    marginBottom: 16,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  genderContainer: {
    flexDirection: "row",
    gap: 8,
  },
  genderOption: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.bgCard,
  },
  genderOptionSelected: {
    backgroundColor: Colors.emeraldMuted,
    borderColor: Colors.emerald,
  },
  genderText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  genderTextSelected: {
    color: Colors.emerald,
  },
  notesContainer: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
  },
  notesInput: {
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: Colors.emerald,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalOptionSelected: {
    backgroundColor: Colors.emeraldMuted,
  },
  modalOptionText: {
    color: Colors.textPrimary,
    fontSize: 16,
  },
  modalOptionTextSelected: {
    color: Colors.emerald,
    fontWeight: "600",
  },
  customButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  customButtonText: {
    color: Colors.emerald,
    fontSize: 16,
    fontWeight: "600",
  },
  customInputContainer: {
    padding: 20,
  },
  customInputField: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: 16,
  },
  customInputButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  addCustomButton: {
    flex: 1,
    backgroundColor: Colors.emerald,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  addCustomButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

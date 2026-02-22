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
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, updateProfile } = useData();
  const [form, setForm] = useState<UserProfile>(profile);
  const [dirty, setDirty] = useState(false);
  const [healthReport, setHealthReport] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [customInputVisible, setCustomInputVisible] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [modalType, setModalType] = useState<
    "allergies" | "conditions" | "dietary_restrictions"
  >("allergies");

  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadDialogType, setUploadDialogType] = useState<"success" | "error">(
    "success",
  );

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    // Load profile from context whenever it changes
    console.log("Profile from context:", profile);
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
    const arr = (form[key] as string[]) || [];
    const updated = arr.includes(item)
      ? arr.filter((a) => a !== item)
      : [...arr, item];
    update(key, updated);
  };

  const handleSave = () => {
    updateProfile(form);
    setDirty(false);
    setShowSaveDialog(true);
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const pickHealthReport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setHealthReport(asset.name);
        setUploadDialogType("success");
        setShowUploadDialog(true);
      }
    } catch (error) {
      setUploadDialogType("error");
      setShowUploadDialog(true);
    }
  };

  const openAddModal = (
    type: "allergies" | "conditions" | "dietary_restrictions",
  ) => {
    Keyboard.dismiss();
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
        return "Manage Allergies";
      case "conditions":
        return "Manage Health Conditions";
      case "dietary_restrictions":
        return "Manage Dietary Preferences";
      default:
        return "";
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
          <Text style={styles.emptyText}>No {title.toLowerCase()} added</Text>
        ) : (
          <View style={styles.pillContainer}>
            {data.map((item, index) => (
              <View key={index} style={styles.pill}>
                <Text style={styles.pillText}>{item}</Text>
                <TouchableOpacity
                  onPress={() => toggleArrayItem(type, item)}
                  style={styles.pillClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close"
                    size={14}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 200 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={{ paddingTop: insets.top + 16 }}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.greeting}>Welcome back</Text>
                <Text style={styles.title}>Profile</Text>
              </View>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <Ionicons name="log-out" size={20} color={Colors.red} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.fieldRow}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    value={form.name || ""}
                    onChangeText={(v) => update("name", v)}
                    style={styles.fieldInput}
                    placeholder="Enter your name"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <TextInput
                    value={form.age || ""}
                    onChangeText={(v) => update("age", v)}
                    style={styles.fieldInput}
                    placeholder="Age"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <TextInput
                    value={form.gender || ""}
                    onChangeText={(v) => update("gender", v)}
                    style={styles.fieldInput}
                    placeholder="Gender"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Height (cm)</Text>
                  <TextInput
                    value={form.height || ""}
                    onChangeText={(v) => update("height", v)}
                    style={styles.fieldInput}
                    placeholder="Height"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Weight (kg)</Text>
                <TextInput
                  value={form.weight || ""}
                  onChangeText={(v) => update("weight", v)}
                  style={styles.fieldInput}
                  placeholder="Weight"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {renderSection("Allergies", form.allergies || [], "allergies")}
            {renderSection(
              "Health Conditions",
              form.conditions || [],
              "conditions",
            )}
            {renderSection(
              "Dietary Preferences",
              form.dietary_restrictions || [],
              "dietary_restrictions",
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesContainer}>
                <TextInput
                  value={form.notes || ""}
                  onChangeText={(v) => update("notes", v)}
                  placeholder="Any additional health notes..."
                  placeholderTextColor={Colors.textMuted}
                  style={styles.notesInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health Report</Text>
              <TouchableOpacity
                onPress={pickHealthReport}
                style={styles.uploadButton}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={Colors.emerald}
                />
                <Text style={styles.uploadButtonText}>
                  Upload Health Report
                </Text>
              </TouchableOpacity>
              {healthReport && (
                <View style={styles.uploadedFile}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.emerald}
                  />
                  <Text style={styles.uploadedFileName}>{healthReport}</Text>
                </View>
              )}
            </View>

            {dirty && (
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add/Manage Item Modal - FIXED WITH KEYBOARDAVOIDINGVIEW */}
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
        <KeyboardAvoidingView
          style={styles.modalKeyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setModalVisible(false);
              setCustomInputVisible(false);
              setCustomInput("");
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{getModalTitle()}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    setCustomInputVisible(false);
                    setCustomInput("");
                  }}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {!customInputVisible ? (
                <>
                  <ScrollView
                    style={styles.modalScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.modalSubtitle}>Common Options</Text>
                    {getModalOptions().map((option) => {
                      const isSelected = (
                        form[modalType] as string[]
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
                              name="checkmark-circle"
                              size={20}
                              color={Colors.emerald}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Show custom items that aren't in the predefined list */}
                    {(form[modalType] as string[])
                      ?.filter((item) => !getModalOptions().includes(item))
                      .map((customItem, index) => (
                        <TouchableOpacity
                          key={`custom-${index}`}
                          style={[
                            styles.modalOption,
                            styles.modalOptionSelected,
                          ]}
                          onPress={() => addNewItem(customItem)}
                        >
                          <View style={styles.customItemContainer}>
                            <Text
                              style={[
                                styles.modalOptionText,
                                styles.modalOptionTextSelected,
                              ]}
                            >
                              {customItem}
                            </Text>
                            <Text style={styles.customLabel}>Custom</Text>
                          </View>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={Colors.emerald}
                          />
                        </TouchableOpacity>
                      ))}
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
                  <Text style={styles.customInputLabel}>
                    Enter your custom{" "}
                    {modalType === "allergies"
                      ? "allergy"
                      : modalType === "conditions"
                        ? "health condition"
                        : "dietary preference"}
                  </Text>
                  <TextInput
                    value={customInput}
                    onChangeText={setCustomInput}
                    style={styles.customInputField}
                    placeholder={`e.g., ${modalType === "allergies" ? "Latex" : modalType === "conditions" ? "Thyroid issues" : "Paleo"}`}
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
                      style={[
                        styles.addCustomButton,
                        !customInput.trim() && styles.addCustomButtonDisabled,
                      ]}
                      onPress={handleAddCustom}
                      disabled={!customInput.trim()}
                    >
                      <Text style={styles.addCustomButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Save Success Dialog */}
      <Modal visible={showSaveDialog} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Saved</Text>
            </View>
            <View style={styles.dialogMessage}>
              <Text style={styles.dialogMessageText}>
                Your profile has been updated.
              </Text>
            </View>
            <Pressable
              style={styles.dialogButton}
              onPress={() => setShowSaveDialog(false)}
            >
              <Text style={styles.dialogButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Dialog */}
      <Modal visible={showLogoutDialog} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Logout</Text>
            </View>
            <View style={styles.dialogMessage}>
              <Text style={styles.dialogMessageText}>
                Are you sure you want to logout?
              </Text>
            </View>
            <View style={styles.dialogButtonRow}>
              <Pressable
                style={[styles.dialogButton, styles.dialogCancelButton]}
                onPress={() => setShowLogoutDialog(false)}
              >
                <Text style={styles.dialogCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.dialogButton, styles.dialogDestructiveButton]}
                onPress={async () => {
                  await logoutUser();
                  setShowLogoutDialog(false);
                  router.replace("/login-new");
                }}
              >
                <Text style={styles.dialogDestructiveButtonText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Status Dialog */}
      <Modal visible={showUploadDialog} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>
                {uploadDialogType === "success" ? "Success" : "Error"}
              </Text>
            </View>
            <View style={styles.dialogMessage}>
              <Text style={styles.dialogMessageText}>
                {uploadDialogType === "success"
                  ? "Health report uploaded successfully!"
                  : "Failed to upload health report"}
              </Text>
            </View>
            <Pressable
              style={styles.dialogButton}
              onPress={() => setShowUploadDialog(false)}
            >
              <Text style={styles.dialogButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { color: Colors.textSecondary, fontSize: 14, marginBottom: 2 },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: "700" as const,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },
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
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 92, 0.3)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    gap: 6,
  },
  pillText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  pillClose: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldRow: { flexDirection: "row", gap: 12 },
  field: { flex: 1, marginBottom: 16 },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "500",
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
  notesContainer: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
  },
  notesInput: {
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.emerald,
    borderRadius: 10,
    padding: 12,
    justifyContent: "center",
  },
  uploadButtonText: {
    color: Colors.emerald,
    fontSize: 14,
    fontWeight: "600",
  },
  uploadedFile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.emeraldMuted,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  uploadedFileName: {
    color: Colors.emerald,
    fontSize: 12,
    fontWeight: "500",
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
  modalKeyboardView: {
    flex: 1,
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
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg,
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
  customItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customLabel: {
    fontSize: 10,
    color: Colors.emerald,
    backgroundColor: Colors.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  customButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  customButtonText: {
    color: Colors.emerald,
    fontSize: 16,
    fontWeight: "600",
  },
  customInputContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  customInputLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
    fontWeight: "500",
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
  addCustomButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
  addCustomButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Dialog styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  dialogContainer: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    width: "90%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  dialogMessage: {
    padding: 20,
    paddingTop: 16,
  },
  dialogMessageText: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: "center",
  },
  dialogButton: {
    backgroundColor: Colors.emerald,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  dialogButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
  dialogButtonRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dialogCancelButton: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
  },
  dialogDestructiveButton: {
    backgroundColor: Colors.red,
    flex: 1,
  },
  dialogCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  dialogDestructiveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.white,
  },
});

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  Modal,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useData } from "@/lib/DataContext";
import {
  fetchProductByBarcode,
  searchProducts,
  extractProductFromImage,
  ProductWithMeta,
} from "@/lib/api";

type ScanMode = "barcode" | "image" | "manual";

// --------------------------------------------------------------------------
// RESULT MODAL — replaces all Alert.alert calls with themed UI
// --------------------------------------------------------------------------
interface ResultModalProps {
  visible: boolean;
  type: "found" | "not_found" | "error" | "low_confidence";
  product?: ProductWithMeta;
  message?: string;
  onViewProduct?: () => void;
  onTryAgain?: () => void;
  onSearchByName?: () => void;
  onScanBarcode?: () => void;
  onDismiss: () => void;
}

function ResultModal({
  visible,
  type,
  product,
  message,
  onViewProduct,
  onTryAgain,
  onSearchByName,
  onScanBarcode,
  onDismiss,
}: ResultModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
    }
  }, [visible]);

  const iconName =
    type === "found"
      ? "checkmark-circle"
      : type === "not_found"
        ? "search-outline"
        : type === "low_confidence"
          ? "help-circle-outline"
          : "alert-circle-outline";

  const iconColor =
    type === "found"
      ? Colors.emerald
      : type === "not_found"
        ? Colors.textMuted
        : type === "low_confidence"
          ? "#F59E0B"
          : "#EF4444";

  const sourceLabel =
    product?.data_source === "off"
      ? "✅ Verified Database"
      : product?.data_source === "image"
        ? "📸 Image + Database"
        : product?.data_source === "history"
          ? "⚡ From History"
          : product?.data_source === "ai"
            ? "🤖 AI Generated"
            : product?.data_source === "ai_partial"
              ? `⚠️ AI Estimated (${Math.round((product.ai_confidence ?? 0) * 100)}%)`
              : "";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <Animated.View
          style={[styles.modalCard, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Ionicons name={iconName as any} size={28} color={iconColor} />
            <Text style={[styles.modalTitle, { color: iconColor }]}>
              {type === "found"
                ? "Product Found"
                : type === "not_found"
                  ? "Product Not Found"
                  : type === "low_confidence"
                    ? "Low Confidence"
                    : "Something went wrong"}
            </Text>
            <Pressable
              onPress={onDismiss}
              style={styles.modalClose}
              hitSlop={12}
            >
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Product preview card */}
          {product && type === "found" && (
            <View style={styles.productPreview}>
              {product.image_url ? (
                <Image
                  source={{ uri: product.image_url }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewImagePlaceholder}>
                  <Ionicons
                    name="cube-outline"
                    size={36}
                    color={Colors.textMuted}
                  />
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewName} numberOfLines={2}>
                  {product.name}
                </Text>
                {product.brand ? (
                  <Text style={styles.previewBrand}>{product.brand}</Text>
                ) : null}
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>{sourceLabel}</Text>
                </View>
                {product.nutrition.energy_kcal > 0 && (
                  <Text style={styles.previewKcal}>
                    {product.nutrition.energy_kcal} kcal / 100g
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Message for non-found states */}
          {(type === "not_found" ||
            type === "error" ||
            type === "low_confidence") && (
            <Text style={styles.modalMessage}>{message}</Text>
          )}

          {/* Action buttons */}
          <View style={styles.modalActions}>
            {type === "found" && onViewProduct && (
              <Pressable style={styles.btnPrimary} onPress={onViewProduct}>
                <Ionicons name="nutrition-outline" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>View Full Details</Text>
              </Pressable>
            )}

            {type === "not_found" && (
              <>
                {onTryAgain && (
                  <Pressable style={styles.btnPrimary} onPress={onTryAgain}>
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.btnPrimaryText}>Try Again</Text>
                  </Pressable>
                )}
                {onSearchByName && (
                  <Pressable
                    style={styles.btnSecondary}
                    onPress={onSearchByName}
                  >
                    <Ionicons
                      name="search-outline"
                      size={18}
                      color={Colors.emerald}
                    />
                    <Text style={styles.btnSecondaryText}>Search by Name</Text>
                  </Pressable>
                )}
                {onScanBarcode && (
                  <Pressable
                    style={styles.btnSecondary}
                    onPress={onScanBarcode}
                  >
                    <Ionicons
                      name="barcode-outline"
                      size={18}
                      color={Colors.emerald}
                    />
                    <Text style={styles.btnSecondaryText}>Scan Barcode</Text>
                  </Pressable>
                )}
              </>
            )}

            {type === "error" && (
              <>
                {onTryAgain && (
                  <Pressable style={styles.btnPrimary} onPress={onTryAgain}>
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.btnPrimaryText}>Try Again</Text>
                  </Pressable>
                )}
                {onSearchByName && (
                  <Pressable
                    style={styles.btnSecondary}
                    onPress={onSearchByName}
                  >
                    <Ionicons
                      name="search-outline"
                      size={18}
                      color={Colors.emerald}
                    />
                    <Text style={styles.btnSecondaryText}>
                      Search by Name Instead
                    </Text>
                  </Pressable>
                )}
              </>
            )}

            {type === "low_confidence" && (
              <>
                {onViewProduct && (
                  <Pressable
                    style={[styles.btnPrimary, { backgroundColor: "#F59E0B" }]}
                    onPress={onViewProduct}
                  >
                    <Ionicons name="eye-outline" size={18} color="#fff" />
                    <Text style={styles.btnPrimaryText}>View Anyway</Text>
                  </Pressable>
                )}
                {onTryAgain && (
                  <Pressable style={styles.btnSecondary} onPress={onTryAgain}>
                    <Ionicons name="refresh" size={18} color={Colors.emerald} />
                    <Text style={styles.btnSecondaryText}>Try Again</Text>
                  </Pressable>
                )}
              </>
            )}

            <Pressable style={styles.btnGhost} onPress={onDismiss}>
              <Text style={styles.btnGhostText}>Dismiss</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// --------------------------------------------------------------------------
// MAIN SCREEN
// --------------------------------------------------------------------------
export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addScan, history } = useData();
  // Null-safe alias — history is always an array but guard against loading state
  const scanHistory = history ?? [];
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScanMode>("image");
  const [manualBarcode, setManualBarcode] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Looking up product...");
  const [scanned, setScanned] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const scanLockRef = useRef(false);

  // Modal state
  const [modal, setModal] = useState<{
    visible: boolean;
    type: ResultModalProps["type"];
    product?: ProductWithMeta;
    message?: string;
    onTryAgain?: () => void;
    onSearchByName?: () => void;
    onScanBarcode?: () => void;
  }>({ visible: false, type: "found" });

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  // --------------------------------------------------------------------------
  // HISTORY LOOKUP — Step 1 for all input ways
  // Checks already-scanned products before hitting any API.
  // --------------------------------------------------------------------------

  /**
   * Look up by exact or near-exact barcode in scan history.
   */
  function findInHistoryByBarcode(barcode: string): ProductWithMeta | null {
    if (!scanHistory?.length) return null;
    const match = scanHistory.find((s) => s.barcode === barcode);
    if (match) {
      console.log(`⚡ History hit (barcode): ${match.name}`);
      return { ...match, data_source: "history" } as ProductWithMeta;
    }
    return null;
  }

  /**
   * Look up by product name similarity in scan history.
   * Returns a match if any scanned product name contains the query word(s).
   */
  function findInHistoryByName(query: string): ProductWithMeta | null {
    if (!scanHistory?.length) return null;
    const q = query.toLowerCase().trim();
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    if (words.length === 0) return null;

    const match = scanHistory.find((s) => {
      const name = s.name.toLowerCase();
      const brand = (s.brand || "").toLowerCase();
      const combined = `${brand} ${name}`;
      // Must match at least the first meaningful word
      return (
        words.every((w) => combined.includes(w)) ||
        combined.includes(q) ||
        name.includes(q)
      );
    });

    if (match) {
      console.log(`⚡ History hit (name): ${match.name}`);
      return { ...match, data_source: "history" } as ProductWithMeta;
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // CORE PRODUCT HANDLER — used by all input ways
  // --------------------------------------------------------------------------

  async function openProduct(product: ProductWithMeta) {
    setModal((m) => ({ ...m, visible: false }));
    await addScan(product);
    router.push({
      pathname: "/product/[barcode]",
      params: { barcode: product.barcode },
    });
  }

  function showFound(product: ProductWithMeta, onTryAgain?: () => void) {
    setModal({
      visible: true,
      type: "found",
      product,
      onTryAgain,
    });
  }

  function showNotFound(
    msg: string,
    onTryAgain?: () => void,
    onSearchByName?: () => void,
    onScanBarcode?: () => void,
  ) {
    setModal({
      visible: true,
      type: "not_found",
      message: msg,
      onTryAgain,
      onSearchByName,
      onScanBarcode,
    });
  }

  function showError(
    msg: string,
    onTryAgain?: () => void,
    onSearchByName?: () => void,
  ) {
    setModal({
      visible: true,
      type: "error",
      message: msg,
      onTryAgain,
      onSearchByName,
    });
  }

  // --------------------------------------------------------------------------
  // WAY 1 & 3 — BARCODE (scanner + manual entry)
  // Pipeline: history → OFF → prompt to search by name
  // --------------------------------------------------------------------------

  const handleBarcodeScan = async (barcode: string) => {
    if (scanLockRef.current || loading) return;
    scanLockRef.current = true;
    setScanned(true);

    if (Platform.OS !== "web") {
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {}
    }

    setLoading(true);
    setLoadingMsg("Looking up product...");

    try {
      // Step 1: Check scan history first (instant)
      const historyHit = findInHistoryByBarcode(barcode);
      if (historyHit) {
        showFound(historyHit, resetScanner);
        return;
      }

      // Step 2: Try OpenFoodFacts
      setLoadingMsg("Searching database...");
      const product = await fetchProductByBarcode(barcode);

      if (product) {
        showFound(product, resetScanner);
        return;
      }

      // Step 3: Not in OFF and can't use LLM with just a barcode.
      // Guide the user to search by name instead — that's the honest UX.
      showNotFound(
        `Barcode ${barcode} wasn't found in the product database.\n\nDo you know the product name? Search by name to get AI-powered results.`,
        resetScanner,
        () => {
          setModal((m) => ({ ...m, visible: false }));
          setMode("manual");
          setManualBarcode("");
        },
      );
    } catch (err) {
      console.error("❌ Barcode lookup error:", err);
      showError(
        "Failed to look up the product. Please check your internet connection.",
        resetScanner,
        () => {
          setModal((m) => ({ ...m, visible: false }));
          setMode("manual");
        },
      );
    } finally {
      setLoading(false);
      scanLockRef.current = false;
    }
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (!scanned && !scanLockRef.current && result.data) {
      handleBarcodeScan(result.data);
    }
  };

  const handleManualBarcodeSubmit = () => {
    const trimmed = manualBarcode.trim();
    if (trimmed.length >= 8) handleBarcodeScan(trimmed);
  };

  // --------------------------------------------------------------------------
  // WAY 4 — MANUAL NAME SEARCH
  // Pipeline: history → OFF+LLM parallel → show result
  // --------------------------------------------------------------------------

  const handleProductDescriptionSearch = async () => {
    const trimmed = productDescription.trim();
    if (trimmed.length < 2) return;

    setLoading(true);
    setLoadingMsg("Searching...");

    try {
      // Step 1: Check history first
      const historyHit = findInHistoryByName(trimmed);
      if (historyHit) {
        showFound(historyHit, () => setProductDescription(""));
        return;
      }

      // Step 2: OFF + LLM parallel
      setLoadingMsg("AI is searching...");
      const result = await searchProducts(trimmed, 1);

      if (result.products.length > 0) {
        const best = result.products[0] as ProductWithMeta;
        showFound(best, () => setProductDescription(""));
      } else {
        showNotFound(
          `Could not find "${trimmed}".\n\nTips:\n• Add the brand name (e.g. "Nestle KitKat")\n• Use the barcode scanner\n• Take a photo of the product`,
          () => setProductDescription(""),
          undefined,
          () => {
            setModal((m) => ({ ...m, visible: false }));
            setMode("barcode");
          },
        );
      }
    } catch (err) {
      console.error("Search error:", err);
      showError("Search failed. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // WAY 2 — IMAGE UPLOAD / CAMERA
  // Pipeline: Vision → history check on recognized name → OFF → LLM
  // Uploaded photo is always used as product image.
  // --------------------------------------------------------------------------

  const analyzeImage = async (base64Data: string, imageUri: string) => {
    setLoading(true);
    setLoadingMsg("Recognizing product...");

    try {
      const mimeType = imageUri.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg";
      const product = await extractProductFromImage(
        base64Data,
        mimeType,
        imageUri,
      );

      if (product) {
        // Quick history check on the recognized name
        const historyHit = findInHistoryByName(product.name);
        if (historyHit) {
          // Use history data but keep the fresh photo as image
          const merged = {
            ...historyHit,
            image_url: imageUri,
            data_source: "history" as const,
          };
          showFound(merged, clearImage);
          return;
        }
        showFound(product, clearImage);
      } else {
        showNotFound(
          "Could not identify this product with enough confidence.\n\nTips:\n• Ensure good lighting\n• Show the front label clearly",
          clearImage,
          () => {
            setModal((m) => ({ ...m, visible: false }));
            setMode("manual");
          },
        );
      }
    } catch (err: any) {
      console.error("❌ Image analysis error:", err);
      showError(
        "Could not analyze the image. Please try again.",
        clearImage,
        () => {
          setModal((m) => ({ ...m, visible: false }));
          setMode("manual");
        },
      );
    } finally {
      setLoading(false);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (!asset.base64) {
          showError("Could not read image data. Please try again.", clearImage);
          return;
        }
        setUploadedImage(asset.uri);
        analyzeImage(asset.base64, asset.uri);
      }
    } catch {
      showError("Failed to open gallery.", clearImage);
    }
  };

  const captureImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showNotFound(
          "Camera permission is required to capture product images.",
          undefined,
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (!asset.base64) {
          showError("Could not read image data.", clearImage);
          return;
        }
        setUploadedImage(asset.uri);
        analyzeImage(asset.base64, asset.uri);
      }
    } catch {
      showError("Failed to open camera.", clearImage);
    }
  };

  const clearImage = () => {
    setUploadedImage(null);
    setModal((m) => ({ ...m, visible: false }));
  };

  const resetScanner = () => {
    setScanned(false);
    scanLockRef.current = false;
    setModal((m) => ({ ...m, visible: false }));
  };

  useEffect(() => {
    return () => {
      scanLockRef.current = false;
    };
  }, []);

  // --------------------------------------------------------------------------
  // RENDER MODES
  // --------------------------------------------------------------------------

  const renderBarcodeScanner = () => {
    if (Platform.OS === "web") {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="barcode-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Mobile Only</Text>
          <Text style={styles.emptySubtitle}>
            Barcode scanning requires the mobile app. Use image or search
            instead.
          </Text>
        </View>
      );
    }
    if (!permission) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color={Colors.emerald} size="large" />
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="camera-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Camera Access Needed</Text>
          <Text style={styles.emptySubtitle}>
            Allow camera access to scan product barcodes
          </Text>
          <Pressable onPress={requestPermission} style={styles.permissionBtn}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
              "qr",
            ],
          }}
          onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanInstructions}>
            Align barcode within the frame
          </Text>
        </View>
        {loading && (
          <View style={styles.cameraLoadingOverlay}>
            <ActivityIndicator color={Colors.emerald} size="large" />
            <Text style={styles.cameraLoadingText}>{loadingMsg}</Text>
          </View>
        )}
        {scanned && !loading && (
          <Pressable onPress={resetScanner} style={styles.rescanBtn}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.rescanText}>Scan Again</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderImageUpload = () => (
    <View style={styles.imageContainer}>
      {uploadedImage ? (
        <View style={styles.uploadedImageContainer}>
          <Image
            source={{ uri: uploadedImage }}
            style={styles.uploadedImage}
            resizeMode="contain"
          />
          <Pressable onPress={clearImage} style={styles.clearImageBtn}>
            <Ionicons name="close-circle" size={32} color={Colors.red} />
          </Pressable>
          {loading && (
            <View style={styles.imageAnalyzingOverlay}>
              <ActivityIndicator color={Colors.emerald} size="large" />
              <Text style={styles.analyzingText}>
                {loadingMsg}
                {"\n"}This may take a moment
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.imageUploadPlaceholder}>
          <View style={styles.imageScanIcon}>
            <Ionicons name="scan-outline" size={56} color={Colors.emerald} />
          </View>
          <Text style={styles.imageUploadTitle}>Recognize Product</Text>
          <Text style={styles.imageInstructions}>
            Take a photo or upload an image — AI will identify the product and
            fetch full nutritional data
          </Text>

          <Pressable
            onPress={captureImageFromCamera}
            style={styles.captureBtn}
            disabled={loading}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.captureBtnText}>Take Photo</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={pickImageFromGallery}
            style={styles.galleryBtn}
            disabled={loading}
          >
            <Ionicons name="images-outline" size={20} color={Colors.emerald} />
            <Text style={styles.galleryBtnText}>Choose from Gallery</Text>
          </Pressable>

          <View style={styles.tipRow}>
            <Ionicons name="bulb-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.imageTip}>
              Works best with clear, well-lit front-of-pack photos
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderManualEntry = () => (
    <KeyboardAvoidingView
      style={styles.manualContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.manualScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Barcode Entry */}
        <View style={styles.manualSection}>
          <View style={styles.manualSectionHeader}>
            <View
              style={[
                styles.sectionIconBg,
                { backgroundColor: "rgba(16,185,129,0.12)" },
              ]}
            >
              <Ionicons
                name="barcode-outline"
                size={22}
                color={Colors.emerald}
              />
            </View>
            <View>
              <Text style={styles.manualSectionTitle}>Enter Barcode</Text>
              <Text style={styles.manualSectionSub}>
                Type the number from the product label
              </Text>
            </View>
          </View>
          <TextInput
            value={manualBarcode}
            onChangeText={setManualBarcode}
            placeholder="e.g. 8901030895876"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            keyboardType="number-pad"
            returnKeyType="search"
            onSubmitEditing={handleManualBarcodeSubmit}
          />
          <Pressable
            onPress={handleManualBarcodeSubmit}
            disabled={manualBarcode.trim().length < 8 || loading}
            style={[
              styles.searchBtn,
              (manualBarcode.trim().length < 8 || loading) &&
                styles.searchBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.searchBtnText}>Search by Barcode</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.dividerSection}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Product Name Search */}
        <View style={styles.manualSection}>
          <View style={styles.manualSectionHeader}>
            <View
              style={[
                styles.sectionIconBg,
                { backgroundColor: "rgba(99,102,241,0.12)" },
              ]}
            >
              <Ionicons name="search-outline" size={22} color={Colors.blue} />
            </View>
            <View>
              <Text style={styles.manualSectionTitle}>Search by Name</Text>
              <Text style={styles.manualSectionSub}>
                AI-powered — works even without a barcode
              </Text>
            </View>
          </View>
          <TextInput
            value={productDescription}
            onChangeText={setProductDescription}
            placeholder='e.g. "KitKat" or "Maggi noodles masala"'
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={handleProductDescriptionSearch}
          />
          <View style={styles.tipRow}>
            <Ionicons name="bulb-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.inputHint}>
              Include the brand name for more accurate results
            </Text>
          </View>
          <Pressable
            onPress={handleProductDescriptionSearch}
            disabled={productDescription.trim().length < 2 || loading}
            style={[
              styles.searchBtn,
              { backgroundColor: Colors.blue },
              (productDescription.trim().length < 2 || loading) &&
                styles.searchBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.searchBtnText}>Find Product</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------
  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Scan Product</Text>
        <Text style={styles.subtitle}>Barcode · Photo · Name search</Text>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        {(["barcode", "image", "manual"] as ScanMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
          >
            <Ionicons
              name={
                m === "barcode"
                  ? "barcode-outline"
                  : m === "image"
                    ? "camera-outline"
                    : "create-outline"
              }
              size={17}
              color={mode === m ? "#fff" : Colors.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === m && styles.modeBtnTextActive,
              ]}
            >
              {m === "barcode"
                ? "Barcode"
                : m === "image"
                  ? "AI Camera"
                  : "Search"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {mode === "barcode" && renderBarcodeScanner()}
        {mode === "image" && renderImageUpload()}
        {mode === "manual" && renderManualEntry()}
      </View>

      <View
        style={{
          paddingBottom: Platform.OS === "web" ? 84 : insets.bottom + 90,
        }}
      />

      {/* Result Modal */}
      <ResultModal
        visible={modal.visible}
        type={modal.type}
        product={modal.product}
        message={modal.message}
        onViewProduct={
          modal.product ? () => openProduct(modal.product!) : undefined
        }
        onTryAgain={modal.onTryAgain}
        onSearchByName={modal.onSearchByName}
        onScanBarcode={modal.onScanBarcode}
        onDismiss={() => setModal((m) => ({ ...m, visible: false }))}
      />
    </View>
  );
}

// --------------------------------------------------------------------------
// STYLES
// --------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerContainer: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 12 },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 2,
  },
  subtitle: { color: Colors.textSecondary, fontSize: 13 },

  modeToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: Colors.emerald },
  modeBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600" },
  modeBtnTextActive: { color: "#fff" },

  content: { flex: 1 },

  // Camera
  cameraContainer: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: { width: "80%", height: 180, position: "relative" },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: Colors.emerald,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanInstructions: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 200,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  cameraLoadingText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  rescanBtn: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.emerald,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  rescanText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Image upload
  imageContainer: { flex: 1, marginHorizontal: 20 },
  imageUploadPlaceholder: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    gap: 14,
  },
  imageScanIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(16,185,129,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageUploadTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  imageInstructions: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 280,
  },
  captureBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.emerald,
    paddingVertical: 16,
    borderRadius: 14,
  },
  captureBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 12, fontWeight: "500" },
  galleryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.emerald,
    paddingVertical: 16,
    borderRadius: 14,
  },
  galleryBtnText: { color: Colors.emerald, fontSize: 15, fontWeight: "600" },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  imageTip: { color: Colors.textMuted, fontSize: 12, fontStyle: "italic" },
  uploadedImageContainer: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  uploadedImage: { width: "100%", height: "100%" },
  clearImageBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 4,
  },
  imageAnalyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  analyzingText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },

  // Manual entry
  manualContainer: { flex: 1 },
  manualScrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  manualSection: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    gap: 12,
  },
  manualSectionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  manualSectionTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  manualSectionSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputHint: {
    color: Colors.textMuted,
    fontSize: 12,
    fontStyle: "italic",
    flex: 1,
  },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.emerald,
    paddingVertical: 14,
    borderRadius: 12,
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  dividerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },

  // Permission & empty states
  emptyState: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: "600" },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  permissionBtn: {
    backgroundColor: Colors.emerald,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // Result modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  productPreview: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.bg,
  },
  previewImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  previewInfo: { flex: 1, gap: 4 },
  previewName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  previewBrand: { color: Colors.textSecondary, fontSize: 12 },
  previewBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgCard,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewBadgeText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  previewKcal: { color: Colors.emerald, fontSize: 12, fontWeight: "600" },
  modalMessage: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalActions: { gap: 10 },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.emerald,
    paddingVertical: 15,
    borderRadius: 14,
  },
  btnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.bgElevated,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.emerald,
  },
  btnSecondaryText: { color: Colors.emerald, fontSize: 15, fontWeight: "600" },
  btnGhost: {
    alignItems: "center",
    paddingVertical: 10,
  },
  btnGhostText: { color: Colors.textMuted, fontSize: 14, fontWeight: "500" },
});

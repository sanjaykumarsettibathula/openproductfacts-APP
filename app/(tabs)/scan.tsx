import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/lib/DataContext';
import { fetchProductByBarcode } from '@/lib/api';

type ScanMode = 'camera' | 'manual';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addScan } = useData();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScanMode>('camera');
  const [manualBarcode, setManualBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scanLockRef = useRef(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleBarcodeScan = async (barcode: string) => {
    if (scanLockRef.current || loading) return;
    scanLockRef.current = true;
    setScanned(true);

    if (Platform.OS !== 'web') {
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }

    setLoading(true);
    try {
      const product = await fetchProductByBarcode(barcode);
      if (product) {
        await addScan(product);
        router.push({ pathname: '/product/[barcode]', params: { barcode: product.barcode } });
      } else {
        Alert.alert('Product Not Found', `No product found for barcode: ${barcode}. Try entering it manually or try a different product.`);
        setScanned(false);
        scanLockRef.current = false;
      }
    } catch {
      Alert.alert('Error', 'Failed to look up product. Please try again.');
      setScanned(false);
      scanLockRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (!scanned && !scanLockRef.current && result.data) {
      handleBarcodeScan(result.data);
    }
  };

  const handleManualSubmit = () => {
    const trimmed = manualBarcode.trim();
    if (trimmed.length >= 8) {
      handleBarcodeScan(trimmed);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    scanLockRef.current = false;
  };

  useEffect(() => {
    return () => {
      scanLockRef.current = false;
    };
  }, []);

  const renderCamera = () => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.webFallback}>
          <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.webFallbackText}>Camera scanning is available on mobile devices</Text>
          <Text style={styles.webFallbackSub}>Use manual entry below to look up products</Text>
        </View>
      );
    }

    if (!permission) {
      return (
        <View style={styles.permissionContainer}>
          <ActivityIndicator color={Colors.emerald} size="large" />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>Allow camera access to scan product barcodes</Text>
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
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
          onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Colors.emerald} size="large" />
            <Text style={styles.loadingText}>Looking up product...</Text>
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

  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={styles.title}>Scan Product</Text>
      </View>

      <View style={styles.modeToggle}>
        <Pressable
          onPress={() => setMode('camera')}
          style={[styles.modeBtn, mode === 'camera' && styles.modeBtnActive]}
        >
          <Ionicons name="camera" size={18} color={mode === 'camera' ? '#fff' : Colors.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'camera' && styles.modeBtnTextActive]}>Camera</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('manual')}
          style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
        >
          <Ionicons name="keypad" size={18} color={mode === 'manual' ? '#fff' : Colors.textSecondary} />
          <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>Manual</Text>
        </Pressable>
      </View>

      {mode === 'camera' ? (
        renderCamera()
      ) : (
        <KeyboardAvoidingView
          style={styles.manualContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.manualContent}>
            <View style={styles.manualIcon}>
              <Ionicons name="barcode-outline" size={56} color={Colors.emerald} />
            </View>
            <Text style={styles.manualTitle}>Enter Barcode</Text>
            <Text style={styles.manualSub}>Type the barcode number printed on the product</Text>
            <TextInput
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="e.g. 3017620422003"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              keyboardType="number-pad"
              returnKeyType="search"
              onSubmitEditing={handleManualSubmit}
            />
            <Pressable
              onPress={handleManualSubmit}
              disabled={manualBarcode.trim().length < 8 || loading}
              style={({ pressed }) => [
                styles.searchBtn,
                (manualBarcode.trim().length < 8 || loading) && styles.searchBtnDisabled,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.searchBtnText}>Look Up Product</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      <View style={{ paddingBottom: Platform.OS === 'web' ? 84 : insets.bottom + 90 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' as const },
  modeToggle: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: Colors.emerald },
  modeBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' as const },
  modeBtnTextActive: { color: '#fff' },
  cameraContainer: { flex: 1, marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  scanFrame: {
    width: '80%', height: 180, position: 'relative',
  },
  corner: {
    position: 'absolute', width: 30, height: 30,
    borderColor: Colors.emerald,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  loadingText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  rescanBtn: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.emerald, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
  },
  rescanText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  permissionContainer: {
    flex: 1, marginHorizontal: 20, borderRadius: 20,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  permissionTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' as const },
  permissionText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  permissionBtn: { backgroundColor: Colors.emerald, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  permissionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  webFallback: {
    flex: 1, marginHorizontal: 20, borderRadius: 20,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  webFallbackText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' as const, textAlign: 'center' },
  webFallbackSub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  manualContainer: { flex: 1 },
  manualContent: {
    flex: 1, marginHorizontal: 20, borderRadius: 20,
    backgroundColor: Colors.bgCard, padding: 32,
    alignItems: 'center', justifyContent: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  manualIcon: { marginBottom: 8 },
  manualTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700' as const },
  manualSub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 8 },
  input: {
    width: '100%', backgroundColor: Colors.bgInput, borderRadius: 14,
    padding: 16, fontSize: 18, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
    letterSpacing: 2,
  },
  searchBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.emerald, paddingVertical: 16, borderRadius: 14,
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
});

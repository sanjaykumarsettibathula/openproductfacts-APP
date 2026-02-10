import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useData } from '@/lib/DataContext';
import ProductCard from '@/components/ProductCard';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { history, lists, favorites } = useData();

  const recentScans = history.slice(0, 6);
  const totalScanned = history.length;
  const favCount = favorites.length;
  const safeCount = history.filter(p => p.nutri_score === 'A' || p.nutri_score === 'B').length;
  const ecoCount = history.filter(p => p.eco_score === 'A' || p.eco_score === 'B').length;

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 16 }}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.title}>FoodScan AI</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/profile')} style={styles.avatarBtn}>
              <Ionicons name="person" size={20} color={Colors.emerald} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/scan')}
            style={styles.heroCard}
          >
            <LinearGradient
              colors={[Colors.emerald, Colors.emeraldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroContent}>
                <Ionicons name="scan" size={40} color="#fff" />
                <View style={styles.heroText}>
                  <Text style={styles.heroTitle}>Scan a Product</Text>
                  <Text style={styles.heroSub}>Point your camera at any barcode</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
              </View>
            </LinearGradient>
          </Pressable>

          <View style={styles.statsGrid}>
            <StatCard icon="barcode-outline" label="Scanned" value={totalScanned.toString()} color={Colors.emerald} />
            <StatCard icon="heart" label="Favorites" value={favCount.toString()} color={Colors.red} />
            <StatCard icon="shield-checkmark" label="Safe" value={safeCount.toString()} color={Colors.green} />
            <StatCard icon="leaf" label="Eco" value={ecoCount.toString()} color={Colors.lime} />
          </View>

          <View style={styles.quickActions}>
            <Pressable
              onPress={() => router.push('/compare')}
              style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                <MaterialCommunityIcons name="scale-balance" size={22} color={Colors.blue} />
              </View>
              <Text style={styles.actionText}>Compare</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/lists')}
              style={({ pressed }) => [styles.actionCard, { opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(234,179,8,0.15)' }]}>
                <Ionicons name="list" size={22} color={Colors.yellow} />
              </View>
              <Text style={styles.actionText}>My Lists</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Pressable>
          </View>

          {recentScans.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Scans</Text>
                <Pressable onPress={() => router.push('/(tabs)/history')}>
                  <Text style={styles.seeAll}>See All</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {recentScans.map(product => (
                  <View key={product.id} style={styles.recentItem}>
                    <ProductCard product={product} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {recentScans.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="scan-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No scans yet</Text>
              <Text style={styles.emptyText}>Tap the scan button above to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { color: Colors.textSecondary, fontSize: 14, marginBottom: 2 },
  title: { color: Colors.textPrimary, fontSize: 26, fontWeight: '700' as const },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.emeraldMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  heroCard: { marginBottom: 24, borderRadius: 20, overflow: 'hidden' },
  heroGradient: { padding: 24 },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroText: { flex: 1 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '700' as const, marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 16,
    padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' as const },
  statLabel: { color: Colors.textSecondary, fontSize: 11 },
  quickActions: { gap: 10, marginBottom: 24 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1, color: Colors.textPrimary, fontSize: 16, fontWeight: '600' as const },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700' as const },
  seeAll: { color: Colors.emerald, fontSize: 14, fontWeight: '600' as const },
  horizontalList: { gap: 12 },
  recentItem: { width: 160 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' as const },
  emptyText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
});

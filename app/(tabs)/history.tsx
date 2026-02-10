import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useData } from '@/lib/DataContext';
import ProductCard from '@/components/ProductCard';

const SCORE_FILTERS = ['All', 'A', 'B', 'C', 'D', 'E'];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { history, deleteScans, clearHistory } = useData();
  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState('All');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filtered = useMemo(() => {
    let items = history;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.barcode.includes(q)
      );
    }
    if (scoreFilter !== 'All') {
      items = items.filter(p => p.nutri_score === scoreFilter);
    }
    return items;
  }, [history, search, scoreFilter]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = () => {
    Alert.alert('Delete Selected', `Delete ${selected.size} product(s) from history?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteScans(Array.from(selected));
        setSelected(new Set());
        setSelectMode(false);
      }},
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear History', 'Remove all products from your scan history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>History</Text>
          <View style={styles.headerActions}>
            {history.length > 0 && (
              <>
                <Pressable onPress={() => { setSelectMode(!selectMode); setSelected(new Set()); }}>
                  <Ionicons name={selectMode ? 'close' : 'checkmark-circle-outline'} size={24} color={Colors.textSecondary} />
                </Pressable>
                <Pressable onPress={handleClearAll}>
                  <Ionicons name="trash-outline" size={22} color={Colors.textSecondary} />
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          data={SCORE_FILTERS}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setScoreFilter(item)}
              style={[styles.filterChip, scoreFilter === item && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, scoreFilter === item && styles.filterTextActive]}>{item === 'All' ? 'All' : item}</Text>
            </Pressable>
          )}
        />
      </View>

      {selectMode && selected.size > 0 && (
        <View style={styles.selectBar}>
          <Text style={styles.selectText}>{selected.size} selected</Text>
          <Pressable onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash" size={18} color="#fff" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 84 : insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{search || scoreFilter !== 'All' ? 'No matches' : 'No scan history'}</Text>
            <Text style={styles.emptyText}>{search || scoreFilter !== 'All' ? 'Try adjusting your filters' : 'Products you scan will appear here'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => selectMode && toggleSelect(item.id)}
            style={styles.listItem}
          >
            {selectMode && (
              <Pressable onPress={() => toggleSelect(item.id)} style={styles.checkbox}>
                <Ionicons
                  name={selected.has(item.id) ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={selected.has(item.id) ? Colors.emerald : Colors.textMuted}
                />
              </Pressable>
            )}
            <View style={styles.listItemCard}>
              <ProductCard product={item} compact />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' as const },
  headerActions: { flexDirection: 'row', gap: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.bgCard, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15 },
  filterRow: { gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.emerald, borderColor: Colors.emerald },
  filterText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' as const },
  filterTextActive: { color: '#fff' },
  selectBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  selectText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' as const },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.red, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  deleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' as const },
  list: { paddingHorizontal: 20, gap: 10, paddingTop: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { padding: 4 },
  listItemCard: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' as const },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});

import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Modal, StyleSheet, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useData } from '@/lib/DataContext';

const LIST_COLORS = ['#10b981', '#3B82F6', '#EAB308', '#F97316', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function ListsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lists, createList, deleteList } = useData();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(LIST_COLORS[0]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleCreate = () => {
    if (newName.trim()) {
      createList(newName.trim(), newDesc.trim(), newColor);
      setNewName('');
      setNewDesc('');
      setNewColor(LIST_COLORS[0]);
      setShowCreate(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete List', `Delete "${name}" and all its products?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteList(id) },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: webTopInset }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>My Lists</Text>
        <Pressable onPress={() => setShowCreate(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={lists}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 84 : insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No lists yet</Text>
            <Text style={styles.emptyText}>Create a list to organize your products</Text>
            <Pressable onPress={() => setShowCreate(true)} style={styles.emptyBtn}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Create List</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/list/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.listCard, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={[styles.listColor, { backgroundColor: item.color }]} />
            <View style={styles.listInfo}>
              <Text style={styles.listName}>{item.name}</Text>
              {item.description ? <Text style={styles.listDesc} numberOfLines={1}>{item.description}</Text> : null}
              <Text style={styles.listCount}>{item.products.length} product{item.products.length !== 1 ? 's' : ''}</Text>
            </View>
            <Pressable onPress={() => handleDelete(item.id, item.name)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
            </Pressable>
          </Pressable>
        )}
      />

      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New List</Text>
              <Pressable onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="List name"
              placeholderTextColor={Colors.textMuted}
              style={styles.modalInput}
              autoFocus
            />
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Description (optional)"
              placeholderTextColor={Colors.textMuted}
              style={styles.modalInput}
            />
            <Text style={styles.colorLabel}>Color</Text>
            <View style={styles.colorRow}>
              {LIST_COLORS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, newColor === c && styles.colorDotActive]}
                />
              ))}
            </View>
            <Pressable
              onPress={handleCreate}
              disabled={!newName.trim()}
              style={[styles.createBtn, !newName.trim() && { opacity: 0.4 }]}
            >
              <Text style={styles.createBtnText}>Create List</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700' as const },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.emerald, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, gap: 10 },
  listCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  listColor: { width: 8, height: 48, borderRadius: 4 },
  listInfo: { flex: 1, gap: 2 },
  listName: { color: Colors.textPrimary, fontSize: 16, fontWeight: '600' as const },
  listDesc: { color: Colors.textSecondary, fontSize: 13 },
  listCount: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600' as const },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.emerald, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 24, gap: 14, borderWidth: 1, borderColor: Colors.borderLight },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' as const },
  modalInput: {
    backgroundColor: Colors.bgInput, borderRadius: 12, padding: 14,
    fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  colorLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' as const },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  createBtn: { backgroundColor: Colors.emerald, paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
});

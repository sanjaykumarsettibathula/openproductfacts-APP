import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { loginUser, isFirstTimeUser } from '@/lib/auth';
import { UserProfile } from '@/lib/storage';

const ALLERGEN_OPTIONS = ['Gluten', 'Milk', 'Eggs', 'Fish', 'Peanuts', 'Soy', 'Tree Nuts', 'Shellfish', 'Sesame'];
const CONDITION_OPTIONS = ['Diabetes', 'Hypertension', 'Heart Disease', 'Celiac Disease', 'High Cholesterol'];
const DIET_OPTIONS = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Low Sodium', 'Low Sugar'];

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'login' | 'profile'>('login');
  const [loading, setLoading] = useState(false);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Profile form state
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    allergies: [],
    conditions: [],
    dietary_restrictions: [],
    notes: '',
  });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUser(email, name || email.split('@')[0]);
      
      // If it's first time, show profile setup
      const isFirstTime = await isFirstTimeUser();
      if (isFirstTime) {
        setStep('profile');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Login Failed', 'Please check your credentials and try again');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    if (!profile.name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const { updateUserProfile } = await import('@/lib/auth');
      await updateUserProfile(profile as UserProfile);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (key: 'allergies' | 'conditions' | 'dietary_restrictions', item: string) => {
    const arr = profile[key] as string[] || [];
    const updated = arr.includes(item) ? arr.filter(a => a !== item) : [...arr, item];
    setProfile(prev => ({ ...prev, [key]: updated }));
  };

  if (step === 'profile') {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingTop: insets.top + 20 }}>
            <View style={styles.header}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>Help us personalize your experience</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  value={profile.name}
                  onChangeText={(v) => setProfile(prev => ({ ...prev, name: v }))}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.fieldInput}
                />
              </View>
              
              <View style={styles.fieldRow}>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <TextInput
                    value={profile.age}
                    onChangeText={(v) => setProfile(prev => ({ ...prev, age: v }))}
                    placeholder="--"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.fieldInput}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <TextInput
                    value={profile.gender}
                    onChangeText={(v) => setProfile(prev => ({ ...prev, gender: v }))}
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
                    value={profile.height}
                    onChangeText={(v) => setProfile(prev => ({ ...prev, height: v }))}
                    placeholder="--"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.fieldInput}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.fieldLabel}>Weight (kg)</Text>
                  <TextInput
                    value={profile.weight}
                    onChangeText={(v) => setProfile(prev => ({ ...prev, weight: v }))}
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
              {ALLERGEN_OPTIONS.map(allergy => (
                <Pressable
                  key={allergy}
                  onPress={() => toggleArrayItem('allergies', allergy)}
                  style={[styles.chip, profile.allergies?.includes(allergy) && styles.chipActive]}
                >
                  <Text style={[styles.chipText, profile.allergies?.includes(allergy) && styles.chipTextActive]}>
                    {allergy}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Health Conditions</Text>
            <View style={styles.chipGrid}>
              {CONDITION_OPTIONS.map(condition => (
                <Pressable
                  key={condition}
                  onPress={() => toggleArrayItem('conditions', condition)}
                  style={[styles.chip, profile.conditions?.includes(condition) && styles.chipActive]}
                >
                  <Text style={[styles.chipText, profile.conditions?.includes(condition) && styles.chipTextActive]}>
                    {condition}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Dietary Preferences</Text>
            <View style={styles.chipGrid}>
              {DIET_OPTIONS.map(diet => (
                <Pressable
                  key={diet}
                  onPress={() => toggleArrayItem('dietary_restrictions', diet)}
                  style={[styles.chip, profile.dietary_restrictions?.includes(diet) && styles.chipActive]}
                >
                  <Text style={[styles.chipText, profile.dietary_restrictions?.includes(diet) && styles.chipTextActive]}>
                    {diet}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={handleProfileSave} style={styles.button} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Complete Setup</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 60 }}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="barcode-outline" size={60} color={Colors.emerald} />
            </View>
            <Text style={styles.title}>Welcome to FoodScan AI</Text>
            <Text style={styles.subtitle}>Scan, analyze, and make informed food choices</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textMuted}
                style={styles.fieldInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name (Optional)</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textMuted}
                style={styles.fieldInput}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor={Colors.textMuted}
                style={styles.fieldInput}
                secureTextEntry
              />
            </View>

            <Pressable onPress={handleLogin} style={styles.button} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Get Started</Text>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.emeraldMuted, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { color: Colors.textPrimary, fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: Colors.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  form: { gap: 20 },
  field: { gap: 8 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  fieldInput: {
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 16,
    color: Colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: Colors.border,
  },
  fieldRow: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1, gap: 8 },
  button: {
    backgroundColor: Colors.emerald, paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  divider: {
    flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 14 },
  skipButton: {
    backgroundColor: 'transparent', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  skipButtonText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20, gap: 12,
  },
  sectionTitle: { color: Colors.textPrimary, fontSize: 17, fontWeight: '700', marginBottom: 10 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.emeraldMuted, borderColor: Colors.emerald },
  chipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: Colors.emerald },
});

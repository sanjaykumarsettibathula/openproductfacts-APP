import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { loginUser, isFirstTimeUser } from "@/lib/auth";
import { getProfile } from "@/lib/storage";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Password validation (minimum 6 characters)
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      // Check if first time BEFORE logging in
      const wasFirstTime = await isFirstTimeUser();

      // Login the user
      await loginUser(email, name || email.split("@")[0]);

      // Get the profile to check if health info is complete
      const userProfile = await getProfile();

      // Navigate based on conditions
      // First time users OR users without complete health info -> health-info
      // Users with complete profile -> home
      if (wasFirstTime || !userProfile.age || !userProfile.gender) {
        console.log(
          "Navigating to health-info - First time or incomplete profile",
        );
        router.push("/health-info");
      } else {
        console.log("Navigating to tabs - Profile complete");
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Failed",
        "Please check your credentials and try again",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={{ paddingTop: insets.top + 40 }}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="scan" size={40} color={Colors.emerald} />
          </View>
          <Text style={styles.logoText}>Open Product Facts</Text>
          <Text style={styles.logoSub}>Your Personal Nutrition Assistant</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.fieldInput}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name (Optional)</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.fieldInput}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.fieldInput}
              placeholder="Enter your password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
            />
          </View>

          <Pressable
            onPress={handleLogin}
            style={styles.button}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Get Started</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.emeraldMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  logoSub: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  form: {
    paddingHorizontal: 20,
  },
  field: { marginBottom: 20 },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  fieldInput: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.emerald,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

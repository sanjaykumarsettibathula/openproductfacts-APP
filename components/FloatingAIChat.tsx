import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";

const { width: screenWidth } = Dimensions.get("window");

interface FloatingAIChatProps {
  visible?: boolean;
  productContext?: {
    barcode: string;
    name: string;
    brand: string;
  };
}

export default function FloatingAIChat({
  visible = true,
  productContext,
}: FloatingAIChatProps) {
  const router = useRouter();
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Pass product context if available
    if (productContext) {
      router.push({
        pathname: "/chat",
        params: {
          product: JSON.stringify(productContext),
        },
      });
    } else {
      router.push("/chat");
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={styles.floatingButton}
      >
        <Animated.View
          style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    right: 20,
    zIndex: 1000,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.emerald,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0px 4px 4.65px rgba(0, 0, 0, 0.3)",
      },
    }),
  },
  iconContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});

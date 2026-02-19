import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useData } from "@/lib/DataContext";
import { AIChatService } from "@/lib/ai-chat";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  alternatives?: string[];
  analysis?: string;
}

// --------------------------------------------------------------------------
// ANIMATED MESSAGE BUBBLE
// --------------------------------------------------------------------------
function MessageBubble({
  message,
  index,
}: {
  message: Message;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(
    new Animated.Value(message.sender === "user" ? 20 : -20),
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isUser = message.sender === "user";

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAI,
        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
      ]}
    >
      {/* AI Avatar */}
      {!isUser && (
        <View style={styles.aiAvatar}>
          <LinearGradient
            colors={["#10B981", "#059669"]}
            style={styles.aiAvatarGradient}
          >
            <Ionicons name="leaf" size={14} color="#fff" />
          </LinearGradient>
        </View>
      )}

      <View
        style={[
          styles.bubbleWrapper,
          isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAI,
        ]}
      >
        {/* Main bubble */}
        {isUser ? (
          <LinearGradient
            colors={["#10B981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.bubbleUser]}
          >
            <Text style={styles.textUser}>{message.content}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleAI]}>
            <Text style={styles.textAI}>{message.content}</Text>

            {/* Alternatives */}
            {message.alternatives && message.alternatives.length > 0 && (
              <View style={styles.altSection}>
                <View style={styles.altHeader}>
                  <View style={styles.altIconWrap}>
                    <Ionicons
                      name="swap-horizontal"
                      size={13}
                      color="#10B981"
                    />
                  </View>
                  <Text style={styles.altTitle}>Healthier Alternatives</Text>
                </View>
                {message.alternatives.map((alt, i) => (
                  <TouchableOpacity key={i} style={styles.altItem}>
                    <View style={styles.altDot} />
                    <Text style={styles.altText}>{alt}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={13}
                      color="#10B981"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Analysis */}
            {message.analysis && (
              <View style={styles.analysisSection}>
                <View style={styles.altHeader}>
                  <View
                    style={[
                      styles.altIconWrap,
                      { backgroundColor: "rgba(99,102,241,0.12)" },
                    ]}
                  >
                    <Ionicons name="bar-chart" size={13} color="#6366F1" />
                  </View>
                  <Text style={[styles.altTitle, { color: "#6366F1" }]}>
                    Detailed Analysis
                  </Text>
                </View>
                <Text style={styles.analysisText}>{message.analysis}</Text>
              </View>
            )}
          </View>
        )}

        {/* Timestamp */}
        <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      {/* User Avatar */}
      {isUser && (
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={14} color="#fff" />
        </View>
      )}
    </Animated.View>
  );
}

// --------------------------------------------------------------------------
// TYPING INDICATOR
// --------------------------------------------------------------------------
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={styles.messageRow}>
      <View style={styles.aiAvatar}>
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.aiAvatarGradient}
        >
          <Ionicons name="leaf" size={14} color="#fff" />
        </LinearGradient>
      </View>
      <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

// --------------------------------------------------------------------------
// QUICK SUGGESTION CHIPS
// --------------------------------------------------------------------------
const QUICK_SUGGESTIONS = [
  "Is this healthy?",
  "Show alternatives",
  "Explain ingredients",
  "Check my allergies",
];

// --------------------------------------------------------------------------
// MAIN SCREEN
// --------------------------------------------------------------------------
export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useData();
  const params = useLocalSearchParams<{ product?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const aiServiceRef = useRef<AIChatService | null>(null);
  if (!aiServiceRef.current) {
    aiServiceRef.current = AIChatService.getInstance();
  }
  const aiService = aiServiceRef.current;
  const productContext = params.product ? JSON.parse(params.product) : null;

  useEffect(() => {
    const testAPI = async () => {
      await aiService.testConnection();
    };
    testAPI();
  }, [aiService]);

  useEffect(() => {
    let welcome = `Hi ${profile.name || "there"}! 👋 I'm your personal nutrition assistant.\n\nI can help you understand ingredients, check if a product suits your health goals, and find healthier swaps.`;
    if (productContext) {
      welcome += `\n\nI see you're viewing **${productContext.name}** by ${productContext.brand}. What would you like to know?`;
    } else {
      welcome += `\n\nWhat would you like to explore today?`;
    }

    setMessages([
      {
        id: "1",
        content: welcome,
        sender: "ai",
        timestamp: new Date(),
      },
    ]);
  }, [profile.name]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isLoading]);

  const sendMessage = async (text?: string) => {
    const content = (text || inputText).trim();
    if (!content) return;

    setShowSuggestions(false);
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage(
        content,
        profile,
        productContext,
      );

      let aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: "ai",
        timestamp: new Date(),
      };

      if (
        productContext &&
        (content.toLowerCase().includes("alternative") ||
          content.toLowerCase().includes("suggest") ||
          content.toLowerCase().includes("better") ||
          response.message.toLowerCase().includes("avoid") ||
          response.message.toLowerCase().includes("not recommended"))
      ) {
        const alternatives = await aiService.getAlternativeProducts(
          productContext,
          profile,
        );
        aiMessage.alternatives = alternatives;
      }

      if (
        productContext &&
        (content.toLowerCase().includes("detailed") ||
          content.toLowerCase().includes("analysis") ||
          content.toLowerCase().includes("explain"))
      ) {
        const analysis = await aiService.getDetailedProductAnalysis(
          productContext,
          profile,
        );
        aiMessage.analysis = analysis;
      }

      setMessages((prev) => [...prev, aiMessage]);

      if (response.profileUpdates) {
        const updatedProfile = { ...profile, ...response.profileUpdates };
        await updateProfile(updatedProfile);
        Alert.alert(
          "Profile Updated",
          "I've updated your health profile based on our conversation.",
          [{ text: "OK" }],
        );
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: "I'm having trouble responding right now. Please try again.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : 0 }]}
    >
      {/* ── HEADER ── */}
      <LinearGradient
        colors={["#064E3B", "#065F46", "#047857"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 16 : insets.top + 8 },
        ]}
      >
        {/* Decorative circles */}
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            <LinearGradient
              colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
              style={styles.headerAvatar}
            >
              <Ionicons name="nutrition" size={22} color="#fff" />
            </LinearGradient>
            {/* Online indicator */}
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Nutrition AI</Text>
            <View style={styles.headerStatusRow}>
              <View style={styles.onlineDotSmall} />
              <Text style={styles.headerStatus}>Active now</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.headerActionBtn}>
          <Ionicons
            name="ellipsis-vertical"
            size={20}
            color="rgba(255,255,255,0.9)"
          />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── PRODUCT CONTEXT BANNER ── */}
      {productContext && (
        <View style={styles.contextBanner}>
          <View style={styles.contextIconWrap}>
            <Ionicons name="cube-outline" size={16} color="#10B981" />
          </View>
          <Text style={styles.contextText} numberOfLines={1}>
            Discussing:{" "}
            <Text style={styles.contextProduct}>{productContext.name}</Text>
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── MESSAGES ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Date chip */}
          <View style={styles.dateChip}>
            <Text style={styles.dateChipText}>Today</Text>
          </View>

          {messages.map((msg, idx) => (
            <MessageBubble key={msg.id} message={msg} index={idx} />
          ))}

          {isLoading && <TypingIndicator />}

          {/* Quick suggestion chips — shown only at start */}
          {showSuggestions && messages.length <= 1 && !isLoading && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>Quick questions</Text>
              <View style={styles.suggestionsRow}>
                {QUICK_SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionChip}
                    onPress={() => sendMessage(s)}
                  >
                    <Text style={styles.suggestionChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── INPUT BAR ── */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
          ]}
        >
          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about nutrition..."
                placeholderTextColor="rgba(107,114,128,0.7)"
                style={styles.input}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage()}
              />
            </View>

            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isLoading}
              style={[
                styles.sendBtn,
                (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <LinearGradient
                  colors={
                    inputText.trim()
                      ? ["#10B981", "#059669"]
                      : ["#374151", "#374151"]
                  }
                  style={styles.sendBtnGradient}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={inputText.trim() ? "#fff" : "#6B7280"}
                  />
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.inputHint}>
            Powered by Gemini AI · Your data stays private
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// --------------------------------------------------------------------------
// STYLES
// --------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FDF4", // very light green tint — feels fresh/health
  },
  flex: { flex: 1 },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 12,
    overflow: "hidden",
  },
  headerCircle1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -60,
    right: 20,
  },
  headerCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -30,
    left: 60,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatarWrap: { position: "relative" },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#34D399",
    borderWidth: 2,
    borderColor: "#065F46",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  onlineDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  headerStatus: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "500",
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Context banner ──
  contextBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16,185,129,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(16,185,129,0.15)",
  },
  contextIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(16,185,129,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  contextText: {
    color: "#374151",
    fontSize: 12,
    flex: 1,
  },
  contextProduct: {
    color: "#10B981",
    fontWeight: "700",
  },

  // ── Messages ──
  messagesList: { flex: 1 },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 4,
  },

  dateChip: {
    alignSelf: "center",
    backgroundColor: "rgba(107,114,128,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  dateChipText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 10,
  },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAI: { justifyContent: "flex-start" },

  // Avatars
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    flexShrink: 0,
  },
  aiAvatarGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  bubbleWrapper: { maxWidth: "78%", gap: 4 },
  bubbleWrapperUser: { alignItems: "flex-end" },
  bubbleWrapperAI: { alignItems: "flex-start" },

  bubble: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 20,
  },
  bubbleUser: {
    borderBottomRightRadius: 5,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleAI: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  textUser: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },
  textAI: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 22,
  },

  timestamp: {
    fontSize: 10,
    color: "#9CA3AF",
    letterSpacing: 0.3,
  },
  timestampUser: { alignSelf: "flex-end" },

  // Typing indicator
  typingBubble: {
    flexDirection: "row",
    gap: 5,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 64,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
    opacity: 0.7,
  },

  // Alternatives inside bubble
  altSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(16,185,129,0.12)",
    gap: 7,
  },
  altHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 4,
  },
  altIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: "rgba(16,185,129,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  altTitle: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  altItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16,185,129,0.07)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.15)",
  },
  altDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  altText: {
    color: "#065F46",
    fontSize: 13,
    flex: 1,
    fontWeight: "500",
  },

  // Analysis inside bubble
  analysisSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(99,102,241,0.12)",
    gap: 7,
  },
  analysisText: {
    color: "#374151",
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Quick suggestions ──
  suggestions: { marginTop: 8, gap: 10 },
  suggestionsLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "rgba(16,185,129,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionChipText: {
    color: "#065F46",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Input bar ──
  inputBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(16,185,129,0.2)",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    minHeight: 46,
    justifyContent: "center",
  },
  input: {
    color: "#111827",
    fontSize: 15,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  inputHint: {
    color: "#9CA3AF",
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 0.3,
  },
});

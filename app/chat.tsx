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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useData();
  const params = useLocalSearchParams<{ product?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Use singleton instance - prevents multiple initializations
  const aiServiceRef = useRef<AIChatService | null>(null);

  if (!aiServiceRef.current) {
    aiServiceRef.current = AIChatService.getInstance();
  }

  const aiService = aiServiceRef.current;

  const productContext = params.product ? JSON.parse(params.product) : null;

  // Test API connection on mount
  useEffect(() => {
    const testAPI = async () => {
      console.log("🔍 Testing AI API connection...");
      const isConnected = await aiService.testConnection();
      console.log("🔌 API Connection result:", isConnected);
    };
    testAPI();
  }, [aiService]);

  useEffect(() => {
    let welcomeMessage = `Hello ${profile.name || "there"}! I'm your AI Nutrition Assistant. I can help you understand ingredients, analyze nutritional content, suggest healthier alternatives, and answer food-related questions.`;

    if (productContext) {
      welcomeMessage += `\n\nI see you're looking at ${productContext.name} by ${productContext.brand}. Feel free to ask me any questions about this product!`;
    }

    welcomeMessage += `\n\nHow can I help you today?`;

    setMessages([
      {
        id: "1",
        content: welcomeMessage,
        sender: "ai",
        timestamp: new Date(),
      },
    ]);
  }, [profile.name, productContext]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage(
        userMessage.content,
        profile,
        productContext,
      );

      let aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: "ai",
        timestamp: new Date(),
      };

      // Add alternative products if user asks for alternatives or if product is harmful
      if (
        productContext &&
        (userMessage.content.toLowerCase().includes("alternative") ||
          userMessage.content.toLowerCase().includes("suggest") ||
          userMessage.content.toLowerCase().includes("better") ||
          response.message.toLowerCase().includes("avoid") ||
          response.message.toLowerCase().includes("not recommended"))
      ) {
        const alternatives = await aiService.getAlternativeProducts(
          productContext,
          profile,
        );
        aiMessage.alternatives = alternatives;
      }

      // Add detailed analysis if user asks for detailed information
      if (
        productContext &&
        (userMessage.content.toLowerCase().includes("detailed") ||
          userMessage.content.toLowerCase().includes("analysis") ||
          userMessage.content.toLowerCase().includes("explain"))
      ) {
        const analysis = await aiService.getDetailedProductAnalysis(
          productContext,
          profile,
        );
        aiMessage.analysis = analysis;
      }

      setMessages((prev) => [...prev, aiMessage]);

      // Update profile if AI detected new health information
      if (response.profileUpdates) {
        const updatedProfile = { ...profile, ...response.profileUpdates };
        await updateProfile(updatedProfile);

        Alert.alert(
          "Profile Updated",
          "I've updated your health profile based on our conversation. Check your profile page to see the changes.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble responding right now. Please try again.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Platform.OS === "web" ? 67 : insets.top },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Nutrition Assistant</Text>
          <Text style={styles.headerSubtitle}>Personalized Mode</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.sender === "user"
                  ? styles.userMessage
                  : styles.aiMessage,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.sender === "user"
                    ? styles.userBubble
                    : styles.aiBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.sender === "user" ? styles.userText : styles.aiText,
                  ]}
                >
                  {message.content}
                </Text>

                {/* Alternative Products Section */}
                {message.alternatives && message.alternatives.length > 0 && (
                  <View style={styles.alternativesSection}>
                    <Text style={styles.alternativesTitle}>
                      🔄 Alternative Products
                    </Text>
                    {message.alternatives.map((alternative, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.alternativeItem}
                      >
                        <Ionicons
                          name="leaf"
                          size={16}
                          color={Colors.emerald}
                        />
                        <Text style={styles.alternativeText}>
                          {alternative}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Detailed Analysis Section */}
                {message.analysis && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisTitle}>
                      📊 Detailed Analysis
                    </Text>
                    <Text style={styles.analysisText}>{message.analysis}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.messageTime}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <View style={[styles.messageBubble, styles.aiBubble]}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.emerald} />
                  <Text style={[styles.messageText, styles.aiText]}>
                    Thinking...
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about nutrition, ingredients..."
              placeholderTextColor={Colors.textMuted}
              style={styles.textInput}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons
                name="send"
                size={20}
                color={
                  inputText.trim() && !isLoading ? "#fff" : Colors.textMuted
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 16,
  },
  messageContainer: {
    gap: 4,
  },
  userMessage: {
    alignItems: "flex-end",
  },
  aiMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: Colors.emerald,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
  },
  aiText: {
    color: Colors.textPrimary,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textMuted,
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    backgroundColor: Colors.bgInput,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.bgCard,
  },
  alternativesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  alternativesTitle: {
    color: Colors.emerald,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  alternativeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.emeraldMuted,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  alternativeText: {
    color: Colors.emerald,
    fontSize: 13,
    flex: 1,
  },
  analysisSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  analysisTitle: {
    color: Colors.blue,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  analysisText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});

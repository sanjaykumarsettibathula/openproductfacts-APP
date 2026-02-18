import { UserProfile } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  productContext?: {
    barcode: string;
    name: string;
    brand: string;
  };
}

export interface AIResponse {
  message: string;
  profileUpdates?: Partial<UserProfile>;
  suggestions?: string[];
}

/**
 * Gemini AI Chat Service for Nutrition Assistant
 * Features:
 * - Personalized nutrition advice based on user profile
 * - Automatic profile updates based on conversation
 * - Product analysis and alternatives
 * - Health condition and allergy awareness
 */
export class AIChatService {
  private static instance: AIChatService;
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private conversationHistory: Array<{ role: string; parts: string }> = [];

  private constructor() {
    this.initialize();
  }

  static getInstance(): AIChatService {
    if (!AIChatService.instance) {
      AIChatService.instance = new AIChatService();
    }
    return AIChatService.instance;
  }

  private initialize() {
    // Get API key from environment variable
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    console.log("🔑 Checking API key...");
    console.log("API Key exists:", !!apiKey);
    console.log("API Key length:", apiKey?.length || 0);

    if (!apiKey) {
      console.warn(
        "⚠️ Gemini API key not found. Set EXPO_PUBLIC_GEMINI_API_KEY in .env",
      );
      return;
    }

    try {
      console.log("🚀 Initializing Gemini AI...");
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use gemini-2.5-flash which is available and supports generateContent
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });
      console.log("✅ Gemini AI initialized successfully");
      console.log("📱 Model:", "gemini-2.5-flash");
    } catch (error) {
      console.error("❌ Failed to initialize Gemini AI:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
    }
  }

  /**
   * Build system prompt with user profile context
   */
  private buildSystemPrompt(userProfile: UserProfile): string {
    return `You are an expert AI Nutrition Assistant helping users make informed food choices.

USER PROFILE:
- Name: ${userProfile.name || "User"}
- Age: ${userProfile.age || "Not provided"}
- Gender: ${userProfile.gender || "Not provided"}
- Height: ${userProfile.height || "Not provided"} cm
- Weight: ${userProfile.weight || "Not provided"} kg
- Allergies: ${userProfile.allergies.length > 0 ? userProfile.allergies.join(", ") : "None"}
- Health Conditions: ${userProfile.conditions.length > 0 ? userProfile.conditions.join(", ") : "None"}
- Dietary Restrictions: ${userProfile.dietary_restrictions.length > 0 ? userProfile.dietary_restrictions.join(", ") : "None"}
- Additional Notes: ${userProfile.notes || "None"}

YOUR RESPONSIBILITIES:
1. Provide personalized nutrition advice based on the user's health profile
2. Analyze food products for allergens, health concerns, and nutritional value
3. Suggest healthier alternatives when appropriate
4. Detect new health information in conversations and flag it for profile updates
5. Be supportive, informative, and empathetic

CRITICAL RULES:
- ALWAYS check for allergen conflicts first
- Warn about high sugar if user has Diabetes
- Warn about high sodium if user has Hypertension
- Be cautious with processed foods (NOVA 4) for users with health conditions
- Recommend whole foods and natural ingredients
- Never make medical diagnoses - only provide nutrition information

PROFILE UPDATE DETECTION:
When user mentions NEW health information (allergies, conditions, dietary preferences), respond with:
[PROFILE_UPDATE: category=allergies|conditions|dietary_restrictions, value=<item>]

Example: If user says "I'm allergic to peanuts" → Include: [PROFILE_UPDATE: category=allergies, value=Peanuts]

FORMAT YOUR RESPONSES:
- Use clear, friendly language
- Structure with bullet points when listing information
- Include emojis for visual engagement (⚠️ for warnings, ✅ for good choices, 🔄 for alternatives)
- Keep responses concise but informative (2-4 paragraphs max)
`;
  }

  /**
   * Build product context for AI
   */
  private buildProductContext(
    productContext?: ChatMessage["productContext"],
  ): string {
    if (!productContext) return "";

    return `\n\nCURRENT PRODUCT CONTEXT:
- Product: ${productContext.name}
- Brand: ${productContext.brand}
- Barcode: ${productContext.barcode}

The user is asking about this specific product. Analyze it based on their health profile.`;
  }

  /**
   * Main send message function
   */
  async sendMessage(
    message: string,
    userProfile: UserProfile,
    productContext?: ChatMessage["productContext"],
  ): Promise<AIResponse> {
    // Fallback to mock if Gemini not initialized
    if (!this.model) {
      console.log("⚠️ Using mock AI (Gemini not initialized)");
      return this.mockResponse(message, userProfile, productContext);
    }

    try {
      console.log("📤 Sending message to Gemini AI...");
      console.log("📊 Model available:", !!this.model);

      // Build complete prompt
      const systemPrompt = this.buildSystemPrompt(userProfile);
      const productInfo = this.buildProductContext(productContext);
      const fullPrompt = `${systemPrompt}${productInfo}\n\nUser: ${message}\n\nAssistant:`;

      console.log("📝 Prompt length:", fullPrompt.length);

      // Use generateContent directly instead of startChat for better compatibility
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      console.log("📥 Received response from Gemini AI");
      console.log("📄 Response length:", text.length);

      // Update conversation history
      this.conversationHistory.push(
        { role: "user", parts: message },
        { role: "model", parts: text },
      );

      // Keep only last 10 messages to manage context size
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      // Parse profile updates
      const profileUpdates = this.parseProfileUpdates(text, userProfile);

      // Clean response (remove profile update markers)
      const cleanedMessage = text.replace(/\[PROFILE_UPDATE:.*?\]/g, "").trim();

      // Generate suggestions
      const suggestions = this.generateSuggestions(userProfile, productContext);

      return {
        message: cleanedMessage,
        profileUpdates,
        suggestions,
      };
    } catch (error) {
      console.error("❌ Gemini AI Error:", error);

      // Fallback to mock on error
      return this.mockResponse(message, userProfile, productContext);
    }
  }

  /**
   * Parse profile updates from AI response
   */
  private parseProfileUpdates(
    text: string,
    userProfile: UserProfile,
  ): Partial<UserProfile> | undefined {
    const updates: Partial<UserProfile> = {};
    const updateRegex =
      /\[PROFILE_UPDATE:\s*category=(\w+),\s*value=([^\]]+)\]/g;
    let match;

    while ((match = updateRegex.exec(text)) !== null) {
      const category = match[1];
      const value = match[2].trim();

      if (category === "allergies" && !userProfile.allergies.includes(value)) {
        updates.allergies = [
          ...(updates.allergies || userProfile.allergies),
          value,
        ];
      } else if (
        category === "conditions" &&
        !userProfile.conditions.includes(value)
      ) {
        updates.conditions = [
          ...(updates.conditions || userProfile.conditions),
          value,
        ];
      } else if (
        category === "dietary_restrictions" &&
        !userProfile.dietary_restrictions.includes(value)
      ) {
        updates.dietary_restrictions = [
          ...(updates.dietary_restrictions || userProfile.dietary_restrictions),
          value,
        ];
      }
    }

    return Object.keys(updates).length > 0 ? updates : undefined;
  }

  /**
   * Get alternative products using Gemini
   */
  async getAlternativeProducts(
    currentProduct: ChatMessage["productContext"],
    userProfile: UserProfile,
  ): Promise<string[]> {
    if (!this.model || !currentProduct) {
      return this.mockAlternatives(currentProduct, userProfile);
    }

    try {
      const prompt = `Based on this user profile:
Allergies: ${userProfile.allergies.join(", ") || "None"}
Health Conditions: ${userProfile.conditions.join(", ") || "None"}
Dietary Restrictions: ${userProfile.dietary_restrictions.join(", ") || "None"}

Suggest 5 HEALTHIER alternatives to: ${currentProduct.name} by ${currentProduct.brand}

Requirements:
- Must be safe for user's allergies
- Better for their health conditions
- Match their dietary restrictions
- Be realistic products available in stores
- Include specific brand names when possible

Format: Return ONLY a numbered list, one product per line.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse numbered list
      const alternatives = text
        .split("\n")
        .filter((line: string) => /^\d+\./.test(line.trim()))
        .map((line: string) => line.replace(/^\d+\.\s*/, "").trim())
        .filter((line: string) => line.length > 0)
        .slice(0, 5);

      return alternatives.length > 0
        ? alternatives
        : this.mockAlternatives(currentProduct, userProfile);
    } catch (error) {
      console.error("❌ Error getting alternatives:", error);
      return this.mockAlternatives(currentProduct, userProfile);
    }
  }

  /**
   * Get detailed product analysis using Gemini
   */
  async getDetailedProductAnalysis(
    product: ChatMessage["productContext"],
    userProfile: UserProfile,
  ): Promise<string> {
    if (!this.model || !product) {
      return "Please provide product information for detailed analysis.";
    }

    try {
      const prompt = `Analyze this product for a user with this health profile:

PRODUCT: ${product.name} by ${product.brand}
USER PROFILE:
- Allergies: ${userProfile.allergies.join(", ") || "None"}
- Health Conditions: ${userProfile.conditions.join(", ") || "None"}
- Dietary Restrictions: ${userProfile.dietary_restrictions.join(", ") || "None"}

Provide a detailed analysis covering:
1. Safety concerns (allergies, health conflicts)
2. Nutritional strengths and weaknesses
3. Specific recommendations for this user
4. When/how to consume this product
5. Long-term health implications

Use emojis for visual clarity (⚠️, ✅, 💡, 🔍).
Keep it structured with clear headings.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("❌ Error in detailed analysis:", error);
      return this.mockDetailedAnalysis(product, userProfile);
    }
  }

  /**
   * Test method to verify API connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.model) {
      console.log("❌ Model not initialized");
      return false;
    }

    try {
      console.log("🧪 Testing API connection...");
      const result = await this.model.generateContent(
        "Hello, can you respond with just 'OK'?",
      );
      const response = await result.response;
      const text = response.text();
      console.log("🧪 Test response:", text);
      return text.includes("OK");
    } catch (error) {
      console.error("❌ API connection test failed:", error);
      return false;
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  // ==================== MOCK FALLBACK METHODS ====================

  private mockResponse(
    message: string,
    userProfile: UserProfile,
    productContext?: ChatMessage["productContext"],
  ): AIResponse {
    const lowerMessage = message.toLowerCase();
    let response = "";

    if (
      lowerMessage.includes("alternative") ||
      lowerMessage.includes("better")
    ) {
      response = productContext
        ? `Looking at ${productContext.name}, I can suggest some healthier alternatives. Let me analyze your profile and find options that work for you. 🔍`
        : "I can help you find healthier alternatives once you scan or select a product!";
    } else if (
      lowerMessage.includes("allergy") ||
      lowerMessage.includes("allergic")
    ) {
      response =
        "I've noted your allergy information. I'll always check products against your allergies to keep you safe. ⚠️";
    } else {
      response =
        "I'm here to help with nutrition advice! Ask me about ingredients, nutrition facts, or healthier alternatives. 💬";
    }

    return {
      message: response,
      suggestions: this.generateSuggestions(userProfile, productContext),
    };
  }

  private mockAlternatives(
    currentProduct: ChatMessage["productContext"] | null | undefined,
    userProfile: UserProfile,
  ): string[] {
    return [
      "Fresh fruit (natural sweetness)",
      "Raw nuts and seeds (protein-rich)",
      "Greek yogurt (high protein, low sugar)",
      "Vegetable sticks with hummus",
      "Homemade energy balls (dates + nuts)",
    ];
  }

  private mockDetailedAnalysis(
    product: ChatMessage["productContext"],
    userProfile: UserProfile,
  ): string {
    return `📊 Analysis for ${product?.name || "Unknown Product"}

⚠️ Safety Check:
${userProfile.allergies.length > 0 ? `Check for: ${userProfile.allergies.join(", ")}` : "No allergen concerns detected"}

💡 Recommendations:
• Check nutrition label carefully
• Consider portion sizes
• Balance with whole foods

✅ When to Consume:
• As an occasional treat
• When it fits your daily nutrition goals`;
  }

  private generateSuggestions(
    userProfile: UserProfile,
    productContext?: ChatMessage["productContext"],
  ): string[] {
    const suggestions: string[] = [];

    if (productContext) {
      suggestions.push("Show healthier alternatives");
      suggestions.push("Analyze nutrition facts");
      suggestions.push("Is this safe for me?");
    } else {
      suggestions.push("What should I look for in labels?");
      suggestions.push("Help me understand ingredients");
    }

    if (userProfile.conditions.length > 0) {
      suggestions.push(`Managing ${userProfile.conditions[0]} tips`);
    }

    return suggestions;
  }
}

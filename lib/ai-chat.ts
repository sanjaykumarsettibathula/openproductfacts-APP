import { UserProfile } from './storage';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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

// Mock AI service - Replace with actual AI API integration
export class AIChatService {
  private static instance: AIChatService;
  
  static getInstance(): AIChatService {
    if (!AIChatService.instance) {
      AIChatService.instance = new AIChatService();
    }
    return AIChatService.instance;
  }

  async sendMessage(
    message: string,
    userProfile: UserProfile,
    productContext?: ChatMessage['productContext']
  ): Promise<AIResponse> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const lowerMessage = message.toLowerCase();
    let response = '';
    let profileUpdates: Partial<UserProfile> | undefined;

    // Check for health condition mentions
    if (this.containsHealthCondition(lowerMessage)) {
      const detectedCondition = this.extractHealthCondition(lowerMessage);
      if (detectedCondition && !userProfile.conditions.includes(detectedCondition)) {
        profileUpdates = {
          conditions: [...userProfile.conditions, detectedCondition]
        };
        response = `I notice you mentioned ${detectedCondition}. I've added this to your health profile to provide better personalized recommendations. `;
      }
    }

    // Check for allergy mentions
    if (this.containsAllergy(lowerMessage)) {
      const detectedAllergy = this.extractAllergy(lowerMessage);
      if (detectedAllergy && !userProfile.allergies.includes(detectedAllergy)) {
        profileUpdates = {
          ...profileUpdates,
          allergies: [...(profileUpdates?.allergies || userProfile.allergies), detectedAllergy]
        };
        response += `I've noted your ${detectedAllergy} allergy and will help you avoid products containing it. `;
      }
    }

    // Generate contextual response
    if (productContext) {
      response += this.generateProductAdvice(message, userProfile, productContext);
    } else {
      response += this.generateGeneralAdvice(message, userProfile);
    }

    return {
      message: response,
      profileUpdates,
      suggestions: this.generateSuggestions(userProfile, productContext)
    };
  }

  private containsHealthCondition(message: string): boolean {
    const conditions = [
      'diabetes', 'diabetic', 'hypertension', 'high blood pressure', 'heart disease',
      'cardiovascular', 'celiac', 'celiac disease', 'high cholesterol', 'obesity',
      'anemia', 'kidney disease', 'renal disease'
    ];
    return conditions.some(condition => message.includes(condition));
  }

  private extractHealthCondition(message: string): string | null {
    const conditionMap: { [key: string]: string } = {
      'diabetes': 'Diabetes',
      'diabetic': 'Diabetes',
      'hypertension': 'Hypertension',
      'high blood pressure': 'Hypertension',
      'heart disease': 'Heart Disease',
      'cardiovascular': 'Heart Disease',
      'celiac': 'Celiac Disease',
      'celiac disease': 'Celiac Disease',
      'high cholesterol': 'High Cholesterol',
      'obesity': 'Obesity',
      'anemia': 'Anemia',
      'kidney disease': 'Kidney Disease',
      'renal disease': 'Kidney Disease'
    };

    for (const [key, value] of Object.entries(conditionMap)) {
      if (message.includes(key)) {
        return value;
      }
    }
    return null;
  }

  private containsAllergy(message: string): boolean {
    const allergens = [
      'gluten', 'milk', 'dairy', 'eggs', 'fish', 'peanuts', 'soy', 
      'tree nuts', 'shellfish', 'sesame', 'celery', 'mustard', 'lupin'
    ];
    return allergens.some(allergen => message.includes(allergen));
  }

  private extractAllergy(message: string): string | null {
    const allergyMap: { [key: string]: string } = {
      'gluten': 'Gluten',
      'milk': 'Milk',
      'dairy': 'Milk',
      'eggs': 'Eggs',
      'fish': 'Fish',
      'peanuts': 'Peanuts',
      'soy': 'Soy',
      'tree nuts': 'Tree Nuts',
      'shellfish': 'Shellfish',
      'sesame': 'Sesame',
      'celery': 'Celery',
      'mustard': 'Mustard',
      'lupin': 'Lupin'
    };

    for (const [key, value] of Object.entries(allergyMap)) {
      if (message.includes(key)) {
        return value;
      }
    }
    return null;
  }

  private generateProductAdvice(
    message: string,
    userProfile: UserProfile,
    productContext: ChatMessage['productContext']
  ): string {
    const { name, brand } = productContext;
    
    let advice = `Regarding ${name} by ${brand}: `;

    // Check for allergen conflicts
    const conflictingAllergens = userProfile.allergies.filter(allergy => 
      message.toLowerCase().includes(allergy.toLowerCase())
    );
    
    if (conflictingAllergens.length > 0) {
      advice += `⚠️ This product contains ${conflictingAllergens.join(', ')} which you're allergic to. I recommend avoiding it. `;
    }

    // Check for condition-specific advice
    if (userProfile.conditions.includes('Diabetes')) {
      advice += 'For your diabetes management, check the sugar content and carbohydrate count. ';
    }
    
    if (userProfile.conditions.includes('Hypertension')) {
      advice += 'Given your hypertension, pay close attention to the sodium content. ';
    }

    // Dietary restrictions
    if (userProfile.dietary_restrictions.includes('Vegetarian') && message.includes('meat')) {
      advice += 'This product is not suitable for your vegetarian diet. ';
    }

    if (userProfile.dietary_restrictions.includes('Vegan') && (message.includes('dairy') || message.includes('eggs'))) {
      advice += 'This product contains animal-derived ingredients and is not vegan-friendly. ';
    }

    return advice;
  }

  private generateGeneralAdvice(message: string, userProfile: UserProfile): string {
    if (message.includes('recommend') || message.includes('suggest')) {
      return 'Based on your health profile, I recommend focusing on whole foods, reading nutrition labels carefully, and avoiding products with ingredients that conflict with your dietary restrictions.';
    }

    if (message.includes('healthy') || message.includes('health')) {
      return 'For your specific health needs, prioritize foods low in sodium and added sugars, rich in fiber, and always check for allergens that affect you.';
    }

    return 'I\'m here to help you make informed food choices based on your health profile. Feel free to ask about specific products or dietary concerns!';
  }

  private generateSuggestions(userProfile: UserProfile, productContext?: ChatMessage['productContext']): string[] {
    const suggestions: string[] = [];

    if (productContext) {
      suggestions.push('Show me similar products without allergens');
      suggestions.push('Compare nutrition facts with alternatives');
    } else {
      suggestions.push('What should I look for in nutrition labels?');
      suggestions.push('Recommend products for my dietary needs');
    }

    if (userProfile.conditions.length > 0) {
      suggestions.push(`Tips for managing ${userProfile.conditions[0]}`);
    }

    if (userProfile.allergies.length > 0) {
      suggestions.push(`How to avoid ${userProfile.allergies[0]} in foods`);
    }

    return suggestions;
  }
}

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ShoppingItem {
  name: string;
  category: string;
  checked: boolean;
}

export interface AIAnalysisResult {
  categoryName: string;
  priority: number;
  reasoning: string;
  dueDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:mm
  isShoppingList: boolean;
  shoppingItems?: ShoppingItem[];
}

export async function analyzeTask(
  input: string,
  categories: string[]
): Promise<AIAnalysisResult> {
  const model = "gemini-3-flash-preview";
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const prompt = `
    Analyze the following task or thought and categorize it into one of the provided categories.
    Also, assign a priority from 1 (Low) to 5 (High) based on its urgency and importance.
    
    CRITICAL: 
    1. Extract any mentioned date and time.
    2. Detect if this is a shopping list or grocery-related request (e.g., "buy milk", "need eggs", "shopping list").
    3. If it is a shopping list:
       - Set isShoppingList to true.
       - Extract specific items (e.g., "milk", "eggs", "detergent").
       - Categorize each item into groups like "신선식품" (Fresh), "공산품" (General), "생활용품" (Household), etc.
       - Set checked to false for all items.
    
    - Today's date is ${todayStr}.
    - Task/Thought: "${input}"
    - Available Categories: ${categories.join(", ")}

    Provide a brief reasoning for your choice.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          categoryName: {
            type: Type.STRING,
            description: "The name of the category that best fits the task.",
          },
          priority: {
            type: Type.NUMBER,
            description: "A priority score from 1 to 5.",
          },
          reasoning: {
            type: Type.STRING,
            description: "A brief explanation of why this category and priority were chosen.",
          },
          dueDate: {
            type: Type.STRING,
            description: "Extracted date in YYYY-MM-DD format, or null.",
            nullable: true,
          },
          reminderTime: {
            type: Type.STRING,
            description: "Extracted time in HH:mm format, or null.",
            nullable: true,
          },
          isShoppingList: {
            type: Type.BOOLEAN,
            description: "Whether the input is a shopping list.",
          },
          shoppingItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                checked: { type: Type.BOOLEAN },
              },
              required: ["name", "category", "checked"],
            },
            nullable: true,
          },
        },
        required: ["categoryName", "priority", "reasoning", "isShoppingList"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text || "{}") as AIAnalysisResult;
    return result;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("AI analysis failed to return valid JSON.");
  }
}

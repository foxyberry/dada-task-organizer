export interface ShoppingItem {
  name: string;
  category: string;
  checked: boolean;
}

export interface AIAnalysisResult {
  categoryName: string;
  priority: number;
  reasoning: string;
  dueDate?: string;
  reminderTime?: string;
  isShoppingList: boolean;
  shoppingItems?: ShoppingItem[];
}

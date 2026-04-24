import type { ShoppingItem } from "./geminiTypes.js";

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  familyId?: string | null;
  priority: number;
  status: "pending" | "completed";
  aiReasoning?: string;
  dueDate?: string | null;
  reminderTime?: string | null;
  isShoppingList?: boolean;
  shoppingItems?: ShoppingItem[];
  userId: string;
  createdAt: unknown;
}

export interface AnalyzeAndCreateTaskRequest {
  input: string;
  familyId?: string | null;
}

export type AnalyzeAndCreateTaskResponse = TaskRecord;

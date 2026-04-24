import { Timestamp } from "firebase-admin/firestore";
import type { AIAnalysisResult } from "../../shared/geminiTypes.js";
import type { TaskRecord } from "../../shared/taskTypes.js";
import { adminDb } from "../firebaseAdmin.js";
import { analyzeTaskWithGemini } from "./geminiService.js";
import { handleFirestoreError } from "../utils/errorHandlers.js";

export interface CreateTaskParams {
  title: string;
  description?: string;
  categoryId: string;
  familyId?: string;
  priority: number;
  status: "pending" | "completed";
  aiReasoning: string;
  dueDate?: string; // YYYY-MM-DD
  reminderTime?: string; // HH:mm
  isShoppingList?: boolean;
  shoppingItems?: Array<{ name: string; category: string; checked: boolean }>;
  userId: string;
}

interface AnalyzeAndCreateTaskParams {
  input: string;
  familyId?: string | null;
  userId: string;
}

interface CategoryRecord {
  id: string;
  name: string;
  userId: string;
  familyId?: string | null;
}

const ensureFamilyMembership = async (familyId: string, userId: string) => {
  const familyDoc = await adminDb.collection("familyGroups").doc(familyId).get();
  if (!familyDoc.exists) {
    throw new Error("Family group not found");
  }

  const familyData = familyDoc.data();
  if (!familyData?.members.includes(userId)) {
    throw new Error("User is not a member of this family group");
  }
};

const getCategoriesForScope = async (
  userId: string,
  familyId?: string | null
): Promise<CategoryRecord[]> => {
  const query = familyId
    ? adminDb.collection("categories").where("familyId", "==", familyId)
    : adminDb.collection("categories").where("userId", "==", userId).where("familyId", "==", null);

  const snapshot = await query.orderBy("createdAt", "desc").get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name || ""),
      userId: String(data.userId || ""),
      familyId: data.familyId ?? null,
    };
  });
};

const selectCategory = (analysis: AIAnalysisResult, categories: CategoryRecord[]) => {
  const normalizedName = analysis.categoryName.trim().toLowerCase();
  return (
    categories.find((category) => category.name.trim().toLowerCase() === normalizedName) ||
    categories[0]
  );
};

export const analyzeAndCreateTask = async (
  params: AnalyzeAndCreateTaskParams
): Promise<TaskRecord> => {
  const title = params.input.trim();

  if (!title) {
    throw new Error("Task input is required");
  }

  if (title.length > 500) {
    throw new Error("Task input must be 500 characters or fewer");
  }

  if (params.familyId && typeof params.familyId !== "string") {
    throw new Error("Family ID must be a string");
  }

  if (params.familyId) {
    await ensureFamilyMembership(params.familyId, params.userId);
  }

  const categories = await getCategoriesForScope(params.userId, params.familyId);
  if (categories.length === 0) {
    throw new Error("Create at least one category before adding tasks");
  }

  const analysis = await analyzeTaskWithGemini(
    title,
    categories.map((category) => category.name)
  );

  const category = selectCategory(analysis, categories);
  const taskRef = adminDb.collection("tasks").doc();
  const taskData: TaskRecord = {
    id: taskRef.id,
    title,
    categoryId: category.id,
    familyId: params.familyId ?? null,
    priority: analysis.priority,
    status: "pending",
    aiReasoning: analysis.reasoning,
    dueDate: analysis.dueDate ?? null,
    reminderTime: analysis.reminderTime ?? null,
    isShoppingList: analysis.isShoppingList || false,
    shoppingItems: analysis.shoppingItems || [],
    userId: params.userId,
    createdAt: Timestamp.now(),
  };

  await taskRef.set(taskData);
  return taskData;
};

export const createSharedTask = async (params: CreateTaskParams) => {
  // 1. Basic Validation
  if (!params.title || params.title.trim().length === 0) {
    throw new Error("Task title is required");
  }

  if (!params.categoryId) {
    throw new Error("Category ID is required");
  }

  // 2. AI Data Validation
  if (typeof params.priority !== "number" || params.priority < 1 || params.priority > 5) {
    throw new Error("Priority must be a number between 1 and 5");
  }

  if (!params.aiReasoning || params.aiReasoning.trim().length === 0) {
    throw new Error("AI reasoning is required for shared tasks");
  }

  // 3. Date/Time Validation (Simple regex check)
  if (params.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.dueDate)) {
    throw new Error("Invalid due date format (YYYY-MM-DD)");
  }

  if (params.reminderTime && !/^\d{2}:\d{2}$/.test(params.reminderTime)) {
    throw new Error("Invalid reminder time format (HH:mm)");
  }

  // 4. Family Membership Validation (if familyId is provided)
  if (params.familyId) {
    await ensureFamilyMembership(params.familyId, params.userId);
  }

  // 5. Create Task
  const taskRef = adminDb.collection("tasks").doc();
  const taskData = {
    ...params,
    id: taskRef.id,
    createdAt: Timestamp.now(),
  };

  await taskRef.set(taskData);
  return taskData;
};

export const getTasksByFamily = async (familyId: string, userId: string) => {
  try {
    // Verify membership
    const familyDoc = await adminDb.collection("familyGroups").doc(familyId).get();
    if (!familyDoc.exists) {
      throw new Error("Family group not found");
    }
    const familyData = familyDoc.data();
    if (!familyData?.members.includes(userId)) {
      throw new Error("Access denied: You are not a member of this group");
    }

    const snapshot = await adminDb
      .collection("tasks")
      .where("familyId", "==", familyId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => doc.data());
  } catch (error) {
    return handleFirestoreError(error, 'list', 'tasks', userId);
  }
};

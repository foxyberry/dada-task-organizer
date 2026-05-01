import { Timestamp } from "firebase-admin/firestore";
import type { AIAnalysisResult } from "../../shared/geminiTypes.js";
import type { TaskRecord, UpdateTaskRequest } from "../../shared/taskTypes.js";
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
  timezone?: string;
}

interface CategoryRecord {
  id: string;
  name: string;
  userId: string;
  familyId?: string | null;
}

const getTaskById = async (taskId: string) => {
  const taskDoc = await adminDb.collection("tasks").doc(taskId).get();
  if (!taskDoc.exists) {
    throw new Error("Task not found");
  }

  return {
    id: taskDoc.id,
    ...(taskDoc.data() as Omit<TaskRecord, "id">),
  } as TaskRecord;
};

const canUpdateTask = async (task: TaskRecord, userId: string) => {
  if (task.userId === userId) {
    return true;
  }

  if (task.familyId) {
    await ensureFamilyMembership(task.familyId, userId);
    return true;
  }

  return false;
};

const canDeleteTask = async (task: TaskRecord, userId: string) => {
  return task.userId === userId;
};

const validateShoppingItems = (shoppingItems: UpdateTaskRequest["shoppingItems"]) => {
  if (!Array.isArray(shoppingItems)) {
    throw new Error("Shopping items must be an array");
  }

  if (shoppingItems.length > 200) {
    throw new Error("Shopping items must contain 200 items or fewer");
  }

  for (const item of shoppingItems) {
    if (
      !item ||
      typeof item.name !== "string" ||
      typeof item.category !== "string" ||
      typeof item.checked !== "boolean"
    ) {
      throw new Error("Shopping items must include name, category, and checked");
    }

    if (item.name.trim().length === 0 || item.name.length > 200) {
      throw new Error("Shopping item names must be between 1 and 200 characters");
    }

    if (item.category.trim().length === 0 || item.category.length > 100) {
      throw new Error("Shopping item categories must be between 1 and 100 characters");
    }
  }
};

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
    categories.map((category) => category.name),
    params.timezone
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

export const updateTask = async (
  taskId: string,
  updates: UpdateTaskRequest,
  userId: string
): Promise<TaskRecord> => {
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  const allowedKeys = Object.keys(updates);
  if (allowedKeys.length === 0) {
    throw new Error("At least one field must be provided");
  }

  if (allowedKeys.some((key) => !["status", "shoppingItems"].includes(key))) {
    throw new Error("Only status and shoppingItems can be updated");
  }

  if (updates.status !== undefined && !["pending", "completed"].includes(updates.status)) {
    throw new Error("Status must be pending or completed");
  }

  if (updates.shoppingItems !== undefined) {
    validateShoppingItems(updates.shoppingItems);
  }

  const task = await getTaskById(taskId);
  const canUpdate = await canUpdateTask(task, userId);
  if (!canUpdate) {
    throw new Error("Access denied");
  }

  const nextTask = {
    ...task,
    ...updates,
  };

  await adminDb
    .collection("tasks")
    .doc(taskId)
    .update(updates as Partial<Pick<TaskRecord, "status" | "shoppingItems">>);
  return nextTask;
};

export const deleteTask = async (taskId: string, userId: string) => {
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  const task = await getTaskById(taskId);
  const canDelete = await canDeleteTask(task, userId);
  if (!canDelete) {
    throw new Error("Only the task owner can delete this task");
  }

  await adminDb.collection("tasks").doc(taskId).delete();
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

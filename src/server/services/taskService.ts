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
    throw new Error("할 일을 찾을 수 없습니다");
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
    throw new Error("쇼핑 목록 형식이 올바르지 않습니다");
  }

  if (shoppingItems.length > 200) {
    throw new Error("쇼핑 목록은 최대 200개까지 가능합니다");
  }

  for (const item of shoppingItems) {
    if (
      !item ||
      typeof item.name !== "string" ||
      typeof item.category !== "string" ||
      typeof item.checked !== "boolean"
    ) {
      throw new Error("쇼핑 항목에 이름, 카테고리, 체크 여부가 필요합니다");
    }

    if (item.name.trim().length === 0 || item.name.length > 200) {
      throw new Error("쇼핑 항목 이름은 1~200자여야 합니다");
    }

    if (item.category.trim().length === 0 || item.category.length > 100) {
      throw new Error("쇼핑 항목 카테고리는 1~100자여야 합니다");
    }
  }
};

const ensureFamilyMembership = async (familyId: string, userId: string) => {
  const familyDoc = await adminDb.collection("familyGroups").doc(familyId).get();
  if (!familyDoc.exists) {
    throw new Error("가족 그룹을 찾을 수 없습니다");
  }

  const familyData = familyDoc.data();
  if (!familyData?.members.includes(userId)) {
    throw new Error("해당 가족 그룹의 멤버가 아닙니다");
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
    throw new Error("할 일 내용을 입력해주세요");
  }

  if (title.length > 500) {
    throw new Error("할 일 내용은 500자 이하로 입력해주세요");
  }

  if (params.familyId && typeof params.familyId !== "string") {
    throw new Error("Family ID가 올바르지 않습니다");
  }

  if (params.familyId) {
    await ensureFamilyMembership(params.familyId, params.userId);
  }

  const categories = await getCategoriesForScope(params.userId, params.familyId);
  if (categories.length === 0) {
    throw new Error("할 일을 추가하려면 먼저 카테고리를 만들어주세요");
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
    throw new Error("할 일 ID가 필요합니다");
  }

  const allowedKeys = Object.keys(updates);
  if (allowedKeys.length === 0) {
    throw new Error("수정할 항목을 입력해주세요");
  }

  if (allowedKeys.some((key) => !["status", "shoppingItems"].includes(key))) {
    throw new Error("수정 가능한 항목은 상태와 쇼핑 목록입니다");
  }

  if (updates.status !== undefined && !["pending", "completed"].includes(updates.status)) {
    throw new Error("상태는 pending 또는 completed여야 합니다");
  }

  if (updates.shoppingItems !== undefined) {
    validateShoppingItems(updates.shoppingItems);
  }

  const task = await getTaskById(taskId);
  const canUpdate = await canUpdateTask(task, userId);
  if (!canUpdate) {
    throw new Error("접근 권한이 없습니다");
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
    throw new Error("할 일 ID가 필요합니다");
  }

  const task = await getTaskById(taskId);
  const canDelete = await canDeleteTask(task, userId);
  if (!canDelete) {
    throw new Error("할 일 삭제는 작성자만 가능합니다");
  }

  await adminDb.collection("tasks").doc(taskId).delete();
};

export const createSharedTask = async (params: CreateTaskParams) => {
  // 1. Basic Validation
  if (!params.title || params.title.trim().length === 0) {
    throw new Error("할 일 제목을 입력해주세요");
  }

  if (!params.categoryId) {
    throw new Error("카테고리 ID가 필요합니다");
  }

  // 2. AI Data Validation
  if (typeof params.priority !== "number" || params.priority < 1 || params.priority > 5) {
    throw new Error("우선순위는 1~5 사이의 숫자여야 합니다");
  }

  if (!params.aiReasoning || params.aiReasoning.trim().length === 0) {
    throw new Error("AI 분석 결과가 필요합니다");
  }

  // 3. Date/Time Validation (Simple regex check)
  if (params.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(params.dueDate)) {
    throw new Error("날짜 형식이 올바르지 않습니다 (YYYY-MM-DD)");
  }

  if (params.reminderTime && !/^\d{2}:\d{2}$/.test(params.reminderTime)) {
    throw new Error("시간 형식이 올바르지 않습니다 (HH:mm)");
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
      throw new Error("가족 그룹을 찾을 수 없습니다");
    }
    const familyData = familyDoc.data();
    if (!familyData?.members.includes(userId)) {
      throw new Error("해당 가족 그룹의 멤버가 아닙니다");
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

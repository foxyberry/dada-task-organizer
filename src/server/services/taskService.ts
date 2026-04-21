import { adminDb } from "../firebaseAdmin.js";
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
    const familyDoc = await adminDb.collection("familyGroups").doc(params.familyId).get();
    if (!familyDoc.exists) {
      throw new Error("Family group not found");
    }
    const familyData = familyDoc.data();
    if (!familyData?.members.includes(params.userId)) {
      throw new Error("User is not a member of this family group");
    }
  }

  // 5. Create Task
  const taskRef = adminDb.collection("tasks").doc();
  const taskData = {
    ...params,
    id: taskRef.id,
    createdAt: new Date().toISOString(),
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

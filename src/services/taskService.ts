import { auth } from "../firebase.js";
import type {
  AnalyzeAndCreateTaskRequest,
  AnalyzeAndCreateTaskResponse,
  TaskRecord,
  UpdateTaskRequest,
} from "../shared/taskTypes.js";

export type {
  AnalyzeAndCreateTaskRequest,
  AnalyzeAndCreateTaskResponse,
  TaskRecord,
  UpdateTaskRequest,
};

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function analyzeAndCreateTask(
  payload: AnalyzeAndCreateTaskRequest
): Promise<AnalyzeAndCreateTaskResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/tasks/analyze-and-create", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to create task");
  }

  return response.json();
}

export async function updateTask(taskId: string, payload: UpdateTaskRequest): Promise<TaskRecord> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to update task");
  }

  return response.json();
}

export async function deleteTask(taskId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to delete task");
  }
}

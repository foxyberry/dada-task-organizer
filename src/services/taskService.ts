import { auth } from "../firebase.js";
import type {
  AnalyzeAndCreateTaskRequest,
  AnalyzeAndCreateTaskResponse,
} from "../shared/taskTypes.js";

export type { AnalyzeAndCreateTaskRequest, AnalyzeAndCreateTaskResponse };

export async function analyzeAndCreateTask(
  payload: AnalyzeAndCreateTaskRequest
): Promise<AnalyzeAndCreateTaskResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();
  const response = await fetch("/api/tasks/analyze-and-create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to create task");
  }

  return response.json();
}

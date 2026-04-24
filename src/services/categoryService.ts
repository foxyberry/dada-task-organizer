import { auth } from "../firebase.js";
import type {
  CategoryRecord,
  CreateCategoryRequest,
} from "../shared/categoryTypes.js";

export type { CategoryRecord, CreateCategoryRequest };

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

export async function createCategory(payload: CreateCategoryRequest): Promise<CategoryRecord> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/categories", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to create category");
  }

  return response.json();
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/categories/${categoryId}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to delete category");
  }
}

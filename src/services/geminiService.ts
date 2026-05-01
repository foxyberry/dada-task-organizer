import { auth } from "../firebase.js";
import type { AIAnalysisResult, ShoppingItem } from "../shared/geminiTypes.js";

export type { AIAnalysisResult, ShoppingItem };

const detectTimezone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

export async function analyzeTask(
  input: string,
  categories: string[]
): Promise<AIAnalysisResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const token = await user.getIdToken();
  const response = await fetch("/api/analyze-task", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ input, categories, timezone: detectTimezone() }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "AI analysis failed");
  }

  return response.json();
}

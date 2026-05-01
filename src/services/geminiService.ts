import type { AIAnalysisResult, ShoppingItem } from "../shared/geminiTypes.js";

export type { AIAnalysisResult, ShoppingItem };

export const detectTimezone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

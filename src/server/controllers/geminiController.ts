import { Request, Response } from "express";
import { analyzeTaskWithGemini } from "../services/geminiService.js";

export const analyzeTask = async (req: Request, res: Response) => {
  try {
    const { input, categories } = req.body;

    if (typeof input !== "string" || input.trim().length === 0) {
      return res.status(400).json({ error: "Task input is required" });
    }

    const trimmedInput = input.trim();
    if (trimmedInput.length > 500) {
      return res.status(400).json({ error: "Task input must be 500 characters or fewer" });
    }

    if (!Array.isArray(categories) || categories.some((category) => typeof category !== "string")) {
      return res.status(400).json({ error: "Categories must be an array of strings" });
    }

    const normalizedCategories = categories.map((category) => category.trim()).filter(Boolean);
    if (normalizedCategories.length === 0 || normalizedCategories.length > 50) {
      return res.status(400).json({ error: "Provide between 1 and 50 categories" });
    }

    if (normalizedCategories.some((category) => category.length > 100)) {
      return res.status(400).json({ error: "Category names must be 100 characters or fewer" });
    }

    const result = await analyzeTaskWithGemini(trimmedInput, normalizedCategories);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error analyzing task:", error);
    res.status(500).json({ error: error.message || "Failed to analyze task" });
  }
};

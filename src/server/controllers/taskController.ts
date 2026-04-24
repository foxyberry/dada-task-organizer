import { Request, Response } from "express";
import type { UpdateTaskRequest } from "../../shared/taskTypes.js";
import * as taskService from "../services/taskService.js";

export const analyzeAndCreateTask = async (req: Request, res: Response) => {
  try {
    const { input, familyId } = req.body;
    // @ts-ignore
    const user = req.user;

    if (typeof input !== "string" || input.trim().length === 0) {
      return res.status(400).json({ error: "Task input is required" });
    }

    if (familyId !== undefined && familyId !== null && typeof familyId !== "string") {
      return res.status(400).json({ error: "Family ID must be a string" });
    }

    const task = await taskService.analyzeAndCreateTask({
      input,
      familyId: familyId ?? null,
      userId: user.uid,
    });

    res.status(201).json(task);
  } catch (error: any) {
    console.error("Error analyzing and creating task:", error);
    res.status(400).json({ error: error.message || "Failed to create task" });
  }
};

export const createSharedTask = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user;
    const taskData = { ...req.body, userId: user.uid };

    const task = await taskService.createSharedTask(taskData);
    res.status(201).json(task);
  } catch (error: any) {
    console.error("Error creating shared task:", error);
    res.status(400).json({ error: error.message || "Failed to create shared task" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const updates = req.body as UpdateTaskRequest;
    // @ts-ignore
    const user = req.user;

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    const task = await taskService.updateTask(taskId, updates, user.uid);
    res.status(200).json(task);
  } catch (error: any) {
    console.error("Error updating task:", error);
    const statusCode = error.message === "Task not found" ? 404 : error.message === "Access denied" ? 403 : 400;
    res.status(statusCode).json({ error: error.message || "Failed to update task" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    // @ts-ignore
    const user = req.user;

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    await taskService.deleteTask(taskId, user.uid);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting task:", error);
    const statusCode =
      error.message === "Task not found" ? 404 : error.message === "Only the task owner can delete this task" ? 403 : 400;
    res.status(statusCode).json({ error: error.message || "Failed to delete task" });
  }
};

export const getFamilyTasks = async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;
    // @ts-ignore
    const user = req.user;

    if (!familyId) {
      return res.status(400).json({ error: "Family ID is required" });
    }

    const tasks = await taskService.getTasksByFamily(familyId, user.uid);
    res.status(200).json(tasks);
  } catch (error: any) {
    console.error("Error fetching family tasks:", error);
    res.status(403).json({ error: error.message || "Failed to fetch family tasks" });
  }
};

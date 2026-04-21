import { Request, Response } from "express";
import * as taskService from "../services/taskService.js";

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

import { Request, Response } from "express";
import type { UpdateTaskRequest } from "../../shared/taskTypes.js";
import * as taskService from "../services/taskService.js";
import logger from "../utils/logger.js";

export const analyzeAndCreateTask = async (req: Request, res: Response) => {
  try {
    const { input, familyId, timezone } = req.body;
    const user = req.user;

    if (typeof input !== "string" || input.trim().length === 0) {
      return res.status(400).json({ error: "Task input is required" });
    }

    if (familyId !== undefined && familyId !== null && typeof familyId !== "string") {
      return res.status(400).json({ error: "Family ID must be a string" });
    }

    let resolvedTimezone: string | undefined;
    if (timezone !== undefined && timezone !== null) {
      if (typeof timezone !== "string" || timezone.length > 64) {
        return res.status(400).json({ error: "Timezone must be a string up to 64 characters" });
      }
      resolvedTimezone = timezone;
    }

    const task = await taskService.analyzeAndCreateTask({
      input,
      familyId: familyId ?? null,
      userId: user.uid,
      timezone: resolvedTimezone,
    });

    res.status(201).json(task);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid }, "Error analyzing and creating task");
    res.status(400).json({ error: error.message || "할 일 생성에 실패했습니다" });
  }
};

export const createSharedTask = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const taskData = { ...req.body, userId: user.uid };

    const task = await taskService.createSharedTask(taskData);
    res.status(201).json(task);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid }, "Error creating shared task");
    res.status(400).json({ error: error.message || "공유 할 일 생성에 실패했습니다" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const updates = req.body as UpdateTaskRequest;
    const user = req.user;

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    const task = await taskService.updateTask(taskId, updates, user.uid);
    res.status(200).json(task);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid, taskId: req.params.taskId }, "Error updating task");
    const statusCode = error.message === "Task not found" ? 404 : error.message === "Access denied" ? 403 : 400;
    res.status(statusCode).json({ error: error.message || "할 일 수정에 실패했습니다" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const user = req.user;

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }

    await taskService.deleteTask(taskId, user.uid);
    res.status(204).send();
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid, taskId: req.params.taskId }, "Error deleting task");
    const statusCode =
      error.message === "Task not found" ? 404 : error.message === "Only the task owner can delete this task" ? 403 : 400;
    res.status(statusCode).json({ error: error.message || "할 일 삭제에 실패했습니다" });
  }
};

export const getFamilyTasks = async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;
    const user = req.user;

    if (!familyId) {
      return res.status(400).json({ error: "Family ID is required" });
    }

    const tasks = await taskService.getTasksByFamily(familyId, user.uid);
    res.status(200).json(tasks);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid, familyId: req.params.familyId }, "Error fetching family tasks");
    res.status(403).json({ error: error.message || "가족 할 일 조회에 실패했습니다" });
  }
};

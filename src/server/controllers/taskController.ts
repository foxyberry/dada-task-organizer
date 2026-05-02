import { Request, Response } from "express";
import type { UpdateTaskRequest } from "../../shared/taskTypes.js";
import * as taskService from "../services/taskService.js";
import logger from "../utils/logger.js";

export const analyzeAndCreateTask = async (req: Request, res: Response) => {
  try {
    const { input, familyId, timezone } = req.body;
    const user = req.user;

    if (typeof input !== "string" || input.trim().length === 0) {
      return res.status(400).json({ error: "할 일 내용을 입력해주세요" });
    }

    if (familyId !== undefined && familyId !== null && typeof familyId !== "string") {
      return res.status(400).json({ error: "Family ID가 올바르지 않습니다" });
    }

    let resolvedTimezone: string | undefined;
    if (timezone !== undefined && timezone !== null) {
      if (typeof timezone !== "string" || timezone.length > 64) {
        return res.status(400).json({ error: "타임존 형식이 올바르지 않습니다" });
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
      return res.status(400).json({ error: "할 일 ID가 필요합니다" });
    }

    const task = await taskService.updateTask(taskId, updates, user.uid);
    res.status(200).json(task);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid, taskId: req.params.taskId }, "Error updating task");
    const statusCode = error.message === "할 일을 찾을 수 없습니다" ? 404 : error.message === "접근 권한이 없습니다" ? 403 : 400;
    res.status(statusCode).json({ error: error.message || "할 일 수정에 실패했습니다" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const user = req.user;

    if (!taskId) {
      return res.status(400).json({ error: "할 일 ID가 필요합니다" });
    }

    await taskService.deleteTask(taskId, user.uid);
    res.status(204).send();
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid, taskId: req.params.taskId }, "Error deleting task");
    const statusCode =
      error.message === "할 일을 찾을 수 없습니다" ? 404 : error.message === "할 일 삭제는 작성자만 가능합니다" ? 403 : 400;
    res.status(statusCode).json({ error: error.message || "할 일 삭제에 실패했습니다" });
  }
};

export const getFamilyTasks = async (req: Request, res: Response) => {
  try {
    const { familyId } = req.params;
    const user = req.user;

    if (!familyId) {
      return res.status(400).json({ error: "가족 그룹 ID가 필요합니다" });
    }

    const tasks = await taskService.getTasksByFamily(familyId, user.uid);
    res.status(200).json(tasks);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid, familyId: req.params.familyId }, "Error fetching family tasks");
    const statusCode = error.message === "가족 그룹을 찾을 수 없습니다" ? 404 : 403;
    res.status(statusCode).json({ error: error.message || "가족 할 일 조회에 실패했습니다" });
  }
};

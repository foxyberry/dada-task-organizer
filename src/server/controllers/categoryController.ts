import { Request, Response } from "express";
import * as categoryService from "../services/categoryService.js";
import logger from "../utils/logger.js";

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, familyId } = req.body;
    const user = req.user;

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "카테고리 이름을 입력해주세요" });
    }

    if (familyId !== undefined && familyId !== null && typeof familyId !== "string") {
      return res.status(400).json({ error: "Family ID가 올바르지 않습니다" });
    }

    const category = await categoryService.createCategory(name, user.uid, familyId ?? null);
    res.status(201).json(category);
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid }, "Error creating category");
    res.status(400).json({ error: error.message || "카테고리 추가에 실패했습니다" });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const user = req.user;

    if (!categoryId) {
      return res.status(400).json({ error: "카테고리 ID가 필요합니다" });
    }

    await categoryService.deleteCategory(categoryId, user.uid);
    res.status(204).send();
  } catch (error: any) {
    logger.error({ err: error, uid: req.user?.uid }, "Error deleting category");
    const statusCode =
      error.message === "카테고리를 찾을 수 없습니다"
        ? 404
        : error.message === "카테고리 삭제는 작성자만 가능합니다"
          ? 403
          : 400;
    res.status(statusCode).json({ error: error.message || "카테고리 삭제에 실패했습니다" });
  }
};

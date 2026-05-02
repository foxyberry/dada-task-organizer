import { Request, Response } from "express";
import { deleteUserAccount } from "../services/userService.js";
import logger from "../utils/logger.js";

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    res.json({
      uid: user.uid,
      email: user.email,
      name: user.name,
      picture: user.picture,
      isPremium: true,
    });
  } catch (error) {
    res.status(500).json({ error: "프로필 조회에 실패했습니다" });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  const user = req.user;
  try {
    await deleteUserAccount(user.uid);
    res.status(204).send();
  } catch (error: any) {
    logger.error({ err: error, uid: user.uid }, "Error deleting account");
    res.status(500).json({ error: error.message || "계정 삭제에 실패했습니다" });
  }
};

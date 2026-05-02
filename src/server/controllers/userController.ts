import { Request, Response } from "express";

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

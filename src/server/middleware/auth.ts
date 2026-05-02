import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../firebaseAdmin.js";
import logger from "../utils/logger.js";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "인증이 필요합니다" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  if (!idToken) {
    return res.status(401).json({ error: "인증이 필요합니다" });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.error({ err: error }, "Error verifying Firebase ID token");
    return res.status(401).json({ error: "인증 정보가 유효하지 않습니다" });
  }
};

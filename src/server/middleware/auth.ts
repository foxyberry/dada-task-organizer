import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../firebaseAdmin.js";
import logger from "../utils/logger.js";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  if (!idToken) {
    return res.status(401).json({ error: "Unauthorized: Empty token provided" });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.error({ err: error }, "Error verifying Firebase ID token");
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

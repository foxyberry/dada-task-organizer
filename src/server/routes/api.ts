import { Router } from "express";
import { getProfile } from "../controllers/userController.js";
import {
  createFamily,
  generateInvite,
  joinFamily,
  getMyFamilies,
} from "../controllers/familyController.js";
import {
  analyzeAndCreateTask,
  createSharedTask,
  getFamilyTasks,
} from "../controllers/taskController.js";
import { analyzeTask } from "../controllers/geminiController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// User routes
router.get("/profile", authMiddleware, getProfile);

// Family routes
router.get("/families", authMiddleware, getMyFamilies);
router.post("/family/create", authMiddleware, createFamily);
router.post("/family/invite", authMiddleware, generateInvite);
router.post("/family/join", authMiddleware, joinFamily);

// Task routes
router.post("/analyze-task", authMiddleware, analyzeTask);
router.post("/tasks/analyze-and-create", authMiddleware, analyzeAndCreateTask);
router.post("/tasks/shared", authMiddleware, createSharedTask);
router.get("/tasks/family/:familyId", authMiddleware, getFamilyTasks);

export default router;

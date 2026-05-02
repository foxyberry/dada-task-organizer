import { Router } from "express";
import {
  createCategory,
  deleteCategory,
} from "../controllers/categoryController.js";
import { getProfile, deleteAccount } from "../controllers/userController.js";
import {
  createFamily,
  generateInvite,
  joinFamily,
  getMyFamilies,
} from "../controllers/familyController.js";
import {
  analyzeAndCreateTask,
  createSharedTask,
  deleteTask,
  getFamilyTasks,
  updateTask,
} from "../controllers/taskController.js";
import { authMiddleware } from "../middleware/auth.js";
import { geminiRateLimit } from "../middleware/rateLimit.js";

const router = Router();

// User routes
router.get("/profile", authMiddleware, getProfile);
router.delete("/account", authMiddleware, deleteAccount);

// Family routes
router.get("/families", authMiddleware, getMyFamilies);
router.post("/family/create", authMiddleware, createFamily);
router.post("/family/invite", authMiddleware, generateInvite);
router.post("/family/join", authMiddleware, joinFamily);

// Category routes
router.post("/categories", authMiddleware, createCategory);
router.delete("/categories/:categoryId", authMiddleware, deleteCategory);

// Task routes
router.post("/tasks/analyze-and-create", authMiddleware, geminiRateLimit, analyzeAndCreateTask);
router.post("/tasks/shared", authMiddleware, createSharedTask);
router.patch("/tasks/:taskId", authMiddleware, updateTask);
router.delete("/tasks/:taskId", authMiddleware, deleteTask);
router.get("/tasks/family/:familyId", authMiddleware, getFamilyTasks);

export default router;

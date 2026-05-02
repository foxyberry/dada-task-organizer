import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";
import logger from "./utils/logger.js";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
const dbId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";

if (!projectId) {
  logger.warn("FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT should be set explicitly.");
}

if (projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIREBASE_PROJECT_ID = projectId;
}

let app: any;

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  logger.info({ projectId }, "Initializing Firebase Admin SDK");

  if (serviceAccount && serviceAccount.startsWith('{')) {
    try {
      const parsedAccount = JSON.parse(serviceAccount);
      app = initializeApp({
        credential: cert(parsedAccount),
        projectId: projectId,
      });
      logger.info("Firebase Admin initialized with Service Account JSON");
    } catch (e) {
      logger.error({ err: e }, "Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON");
      throw e;
    }
  }

  if (!app && serviceAccount && !serviceAccount.startsWith('{')) {
    if (!fs.existsSync(serviceAccount)) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT file path does not exist");
    }

    try {
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });
      logger.info("Firebase Admin initialized with Service Account File");
    } catch (e) {
      logger.error({ err: e }, "Failed to initialize Firebase Admin with SA file");
      throw e;
    }
  }

  if (!app) {
    logger.info("Firebase Admin initializing with Application Default Credentials");
    app = initializeApp({
      projectId: projectId,
    });
  }
} else {
  app = getApp();
}

export const adminAuth = getAuth(app);
logger.info({ dbId }, "Firebase Admin ready");
export const adminDb = getFirestore(app, dbId);
export default app;

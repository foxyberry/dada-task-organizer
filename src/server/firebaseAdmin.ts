import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
const dbId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";

if (!projectId) {
  console.warn("[FirebaseAdmin] FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT should be set explicitly.");
}

if (projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIREBASE_PROJECT_ID = projectId;
}

let app: any;

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  console.log(`[FirebaseAdmin] Initializing app with projectId: ${projectId}`);

  if (serviceAccount && serviceAccount.startsWith('{')) {
    try {
      const parsedAccount = JSON.parse(serviceAccount);
      app = initializeApp({
        credential: cert(parsedAccount),
        projectId: projectId,
      });
      console.log("[FirebaseAdmin] Initialized with Service Account JSON");
    } catch (e) {
      console.error("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON:", e);
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
      console.log("[FirebaseAdmin] Initialized with Service Account File");
    } catch (e) {
      console.error("[FirebaseAdmin] Failed to initialize with SA file:", e);
      throw e;
    }
  }

  if (!app) {
    console.log("[FirebaseAdmin] Initializing with Application Default Credentials");
    app = initializeApp({
      projectId: projectId,
    });
  }
} else {
  app = getApp();
}

export const adminAuth = getAuth(app);
console.log(`[FirebaseAdmin] Using Firestore database ID: ${dbId}`);
export const adminDb = getFirestore(app, dbId);
export default app;

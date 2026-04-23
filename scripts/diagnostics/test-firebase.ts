
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function test() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    console.error("Config file not found");
    process.exit(1);
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  console.log("Project ID:", firebaseConfig.projectId);
  console.log("Database ID:", firebaseConfig.firestoreDatabaseId);

  try {
    const app = initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log("Firebase Admin initialized");
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
    console.log("Firestore instance created");
    const auth = getAuth(app);
    console.log("Auth instance created");
  } catch (e) {
    console.error("Error during initialization:", e);
    process.exit(1);
  }
}

test();

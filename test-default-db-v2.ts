
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function testDefault() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  console.log("Testing (default) database in Project ID:", firebaseConfig.projectId);

  delete process.env.FIREBASE_SERVICE_ACCOUNT;

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: firebaseConfig.projectId
    });
  }

  const db = getFirestore("(default)");
  try {
    const collections = await db.listCollections();
    console.log("(default) Collections:", collections.map(c => c.id));
  } catch (e) {
    console.error("(default) Error:", e.message);
  }
}

testDefault();

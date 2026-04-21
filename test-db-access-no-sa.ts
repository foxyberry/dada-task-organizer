
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function test() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  console.log("Testing with Project ID:", firebaseConfig.projectId);
  console.log("Testing with Database ID:", firebaseConfig.firestoreDatabaseId);

  // Unset the problematic env variable
  delete process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!getApps().length) {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }

  try {
    console.log("\n--- Testing Custom Database ---");
    const dbCustom = getFirestore(firebaseConfig.firestoreDatabaseId);
    const collections = await dbCustom.listCollections();
    console.log("Successfully listed collections for custom DB:", collections.map(c => c.id));
  } catch (e) {
    console.error("Failed to list collections for custom DB:", e.message);
  }
}

test();

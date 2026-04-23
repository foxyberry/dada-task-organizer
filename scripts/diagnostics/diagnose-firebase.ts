
import { getApps, getApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function diagnose() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  console.log("Config Project ID:", firebaseConfig.projectId);
  console.log("Config Database ID:", firebaseConfig.firestoreDatabaseId);

  // Unset the problematic env variable
  delete process.env.FIREBASE_SERVICE_ACCOUNT;

  const projectId = "ai-task-organizer-3de8d";
  console.log("Testing Project ID:", projectId);

  let app;
  if (getApps().length === 0) {
    app = initializeApp({
      projectId: projectId
    });
  } else {
    app = getApp();
  }

  console.log("App Project ID:", app.options.projectId);
  
  const db = getFirestore(app, "(default)");
  console.log("Firestore Settings Project ID:", (db as any)._settings?.projectId);
  console.log("Firestore Settings Database ID:", (db as any)._settings?.databaseId);

  try {
    const testDoc = db.collection("test_access").doc("test_doc");
    await testDoc.set({ timestamp: new Date(), message: "Testing access from backend" });
    console.log("Successfully wrote test document!");
    const doc = await testDoc.get();
    console.log("Successfully read test document:", doc.data());
    await testDoc.delete();
    console.log("Successfully deleted test document!");
  } catch (e) {
    console.error("Error during document operations:", e.message);
  }

  try {
    const collections = await db.listCollections();
    console.log("Collections:", collections.map(c => c.id));
  } catch (e) {
    console.error("Error listing collections:", e.message);
  }
}

diagnose();

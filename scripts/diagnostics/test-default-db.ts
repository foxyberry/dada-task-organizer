
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function testDefault() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  let app;
  if (getApps().length === 0) {
    app = initializeApp({
      projectId: firebaseConfig.projectId
    });
  } else {
    app = getApp();
  }

  console.log("Testing (default) database in project:", app.options.projectId);
  
  const db = getFirestore(app, "(default)");
  try {
    const collections = await db.listCollections();
    console.log("Collections in (default):", collections.map(c => c.id));
  } catch (e) {
    console.error("Error listing collections in (default):", e.message);
  }
}

testDefault();

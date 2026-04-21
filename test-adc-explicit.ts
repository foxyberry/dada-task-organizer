
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function testADC() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  console.log("Testing ADC with Project ID:", firebaseConfig.projectId);
  console.log("Testing ADC with Database ID:", firebaseConfig.firestoreDatabaseId);

  // Clear service account env var to ensure ADC is used
  delete process.env.FIREBASE_SERVICE_ACCOUNT;

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault(),
      projectId: firebaseConfig.projectId
    });
  }

  const db = getFirestore(firebaseConfig.firestoreDatabaseId);
  try {
    const collections = await db.listCollections();
    console.log("Collections:", collections.map(c => c.id));
  } catch (e) {
    console.error("Error:", e.message);
    if (e.stack) console.error(e.stack);
  }
}

testADC();

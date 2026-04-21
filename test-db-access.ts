
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

async function test() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  
  console.log("Testing with Project ID:", firebaseConfig.projectId);
  console.log("Testing with Database ID:", firebaseConfig.firestoreDatabaseId);

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  let credential;
  if (serviceAccount) {
    try {
      credential = cert(JSON.parse(serviceAccount));
      console.log("Using service account from env (JSON)");
    } catch (e) {
      if (fs.existsSync(serviceAccount)) {
        credential = cert(serviceAccount);
        console.log("Using service account from file path:", serviceAccount);
      }
    }
  }

  const options: any = {
    projectId: firebaseConfig.projectId,
  };
  if (credential) {
    options.credential = credential;
  }

  if (!getApps().length) {
    initializeApp(options);
  }

  try {
    console.log("\n--- Testing Custom Database ---");
    const dbCustom = getFirestore(firebaseConfig.firestoreDatabaseId);
    const collections = await dbCustom.listCollections();
    console.log("Successfully listed collections for custom DB:", collections.map(c => c.id));
  } catch (e) {
    console.error("Failed to list collections for custom DB:", e.message);
  }

  try {
    console.log("\n--- Testing (default) Database ---");
    const dbDefault = getFirestore("(default)");
    const collections = await dbDefault.listCollections();
    console.log("Successfully listed collections for (default) DB:", collections.map(c => c.id));
  } catch (e) {
    console.error("Failed to list collections for (default) DB:", e.message);
  }
}

test();

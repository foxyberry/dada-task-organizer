
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function test() {
  if (!getApps().length) {
    initializeApp();
  }

  try {
    console.log("\n--- Testing Sandbox (default) Database ---");
    const dbDefault = getFirestore("(default)");
    const collections = await dbDefault.listCollections();
    console.log("Successfully listed collections for (default) DB:", collections.map(c => c.id));
  } catch (e) {
    console.error("Failed to list collections for (default) DB:", e.message);
  }
}

test();

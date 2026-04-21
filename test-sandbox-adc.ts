
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function testSandbox() {
  console.log("Testing Sandbox ADC...");

  if (getApps().length === 0) {
    initializeApp({
      credential: applicationDefault()
    });
  }

  const db = getFirestore();
  try {
    const collections = await db.listCollections();
    console.log("Sandbox Collections:", collections.map(c => c.id));
  } catch (e) {
    console.error("Sandbox Error:", e.message);
  }
}

testSandbox();

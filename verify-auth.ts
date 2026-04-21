
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("--- Firebase Auth Verification ---");
  
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  console.log("Config Project ID:", firebaseConfig.projectId);
  console.log("Config Database ID:", firebaseConfig.firestoreDatabaseId);
  
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  console.log("FIREBASE_SERVICE_ACCOUNT env exists:", !!sa);

  async function testAccess(label: string, config: any) {
    console.log(`\n--- Testing Group: ${label} ---`);
    try {
      // Clear existing apps to avoid conflicts
      const apps = getApps();
      for (const app of apps) {
        // Unfortunately standard admin SDK doesn't have a clean "delete" in this version easily accessible without the right types, 
        // but we can just use unique names or initialize once.
      }
      
      const appName = `app-${label}-${Date.now()}`;
      const app = initializeApp({
        projectId: firebaseConfig.projectId
      }, appName);
      
      const dbDefault = getFirestore(app); // Use (default) DB
      try {
        await dbDefault.listCollections();
        console.log("Success! Collections found in (default) DB");
      } catch (e: any) {
        console.log(`(default) DB access result: ${e.message}`);
      }
      
      const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      console.log("Project:", app.options.projectId);
      console.log("Database:", firebaseConfig.firestoreDatabaseId);
      
      const collections = await db.listCollections();
      console.log("Success! Collections found:", collections.length);
      return true;
    } catch (err: any) {
      console.error(`Access failed (${label}):`, err.message);
      return false;
    }
  }

  // Test 1: With current Env
  await testAccess("Default (with env)", firebaseConfig);

  // Test 2: Without FIREBASE_SERVICE_ACCOUNT
  const originalSA = process.env.FIREBASE_SERVICE_ACCOUNT;
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  await testAccess("Without SA Env (ADC)", firebaseConfig);
  // Test 3: With SA's own project (if guessable)
  if (sa && sa.includes("@") && sa.includes(".iam.gserviceaccount.com")) {
    const inferredProjectId = sa.split("@")[1].split(".")[0];
    console.log(`\n--- Testing Inferred Project: ${inferredProjectId} ---`);
    try {
      const appName = `app-inferred-${Date.now()}`;
      const app = initializeApp({
        projectId: inferredProjectId
      }, appName);
      const db = getFirestore(app); // Use default DB
      const collections = await db.listCollections();
      console.log("Success! Collections found in inferred project:", collections.length);
    } catch (err: any) {
      console.error(`Access failed (Inferred project ${inferredProjectId}):`, err.message);
    }
  }
}

main().catch(console.error);

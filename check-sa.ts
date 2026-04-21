
import dotenv from "dotenv";
dotenv.config();

console.log("FIREBASE_SERVICE_ACCOUNT length:", process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0);
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("Service Account Project ID:", sa.project_id);
    console.log("Service Account Client Email is set:", !!sa.client_email);
  } catch (e) {
    console.log("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
  }
} else {
  console.log("FIREBASE_SERVICE_ACCOUNT is NOT set");
}

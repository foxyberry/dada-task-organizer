
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (sa && fs.existsSync(sa)) {
  console.log("File exists at:", sa);
  const content = fs.readFileSync(sa, "utf-8");
  try {
    const parsed = JSON.parse(content);
    console.log("Project ID in file:", parsed.project_id);
    console.log("Client Email in file is set:", !!parsed.client_email);
  } catch (e) {
    console.log("File content is not valid JSON");
  }
} else {
  console.log("File does NOT exist at:", sa);
}

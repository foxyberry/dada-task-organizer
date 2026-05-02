import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./src/server/routes/api.js";
import logger from "./src/server/utils/logger.js";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 5001);

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.use("/api", apiRoutes);

  // Health check endpoint (no auth needed)
  app.get("/health", (req, res) => {
    res.json({ status: "ok", message: "Premium Backend is running" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, "Server started");
  });
}

startServer().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

import agentRoutes from "./routes/agent.routes.js";
import productsRoutes from "./routes/products.routes.js";
import projectsRoutes from "./routes/projects.routes.js";

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Routes
app.use("/api/agent", agentRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/projects", projectsRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "AI Shopping Companion Orchestrator API",
    geminiAvailable: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"),
    mockModeActive: process.env.USE_MOCK_AI === "true" || !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here"
  });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🤖 AI Engine Mode: ${process.env.USE_MOCK_AI === "true" ? "High-Fidelity MOCK AI Mode" : "Google Gemini API Mode"}`);
  });
}

export default app;

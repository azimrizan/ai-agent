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
import { shopifyService } from "./services/shopify.service.js";
import { groqService } from "./services/groq.service.js";

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Routes
app.use("/api/agent", agentRoutes);
app.use("/api/products", productsRoutes);
// Shopify Customer Auth Endpoint
app.post("/api/shopify/customer/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const result = await shopifyService.loginCustomer(email, password);
  if (result.error) {
    res.status(401).json({ error: result.error });
    return;
  }
  res.status(200).json(result);
});

import { productRepository } from "./repositories/product.repository.js";
import { analyticsTracker } from "./agent/analytics.js";

// Shopify Webhook endpoint (products/create, products/update, products/delete)
app.post("/api/webhooks/shopify", async (req, res) => {
  const topic = req.headers["x-shopify-topic"] as string;
  const body = req.body;

  if (topic === "products/delete" && body?.id) {
    productRepository.handleWebhookDelete(String(body.id));
  } else if (body && body.id) {
    const isInactive =
      body.status === "draft" ||
      body.status === "archived" ||
      body.status === "unlisted" ||
      body.published_at === null;

    if (isInactive) {
      productRepository.handleWebhookDelete(String(body.id));
    } else if (body.title) {
      const numericId = String(body.id).replace(/[^0-9]/g, "");
      const firstVariant = body.variants?.[0];
      const firstImage = body.images?.[0]?.src || body.image?.src;

      productRepository.handleWebhookUpdate({
        id: `gid://shopify/Product/${numericId}`,
        sku: firstVariant?.sku || numericId || body.handle || "SKU-MRPLUS",
        name: body.title,
        title: body.title,
        description: body.body_html || `${body.title} by MR. Plus`,
        category: body.product_type || body.vendor || "General",
        subcategory: Array.isArray(body.tags) ? body.tags[0] : (typeof body.tags === "string" ? body.tags.split(",")[0] : body.product_type || "General"),
        price: parseFloat(firstVariant?.price || "0"),
        image: firstImage || "/White.png",
        tags: typeof body.tags === "string" ? body.tags.split(",").map((t: string) => t.trim()) : (Array.isArray(body.tags) ? body.tags : []),
        useCases: [body.product_type, body.title].filter(Boolean),
        specifications: {
          vendor: body.vendor || "MR Plus",
          currency: "INR",
          handle: body.handle || "",
          shopifyId: numericId,
        },
        compatibleWith: [],
        stockStatus: firstVariant?.inventory_quantity && firstVariant.inventory_quantity > 0 ? "in_stock" : "in_stock",
      } as any);

      // Trigger background sync to ensure collections and references are up to date
      productRepository.syncShopifyProducts().catch(() => {});
    }
  }

  res.status(200).send("OK");
});

// Manual on-demand Catalog Sync endpoint
app.post("/api/products/sync", async (req, res) => {
  try {
    const synced = await productRepository.syncShopifyProducts();
    res.status(200).json({ success: true, count: synced.length, message: `Synced ${synced.length} active products from Shopify Storefront` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analytics endpoint
app.get("/api/analytics", (req, res) => {
  res.status(200).json(analyticsTracker.getSummary());
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "AI Shopping Companion Orchestrator API",
    groqAvailable: groqService.isAvailable(),
    geminiAvailable: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"),
    shopifyConnected: shopifyService.isConfigured(),
    shopifyDomain: shopifyService.getStoreDomain(),
    mockModeActive: process.env.USE_MOCK_AI === "true",
  });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
    console.log(
      `🤖 AI Engine Mode: ${
        groqService.isAvailable()
          ? `Groq ${process.env.GROQ_MODEL || "openai/gpt-oss-20b"} (Primary) -> Gemini (Secondary Fallback)`
          : "Google Gemini API Mode"
      }`
    );
  });
}

export default app;

import { toolRouter } from "./toolRouter.js";
import { groqService } from "../services/groq.service.js";
import { geminiService } from "../services/gemini.service.js";
import { productRepository } from "../repositories/product.repository.js";
import { analyticsTracker } from "./analytics.js";
import { AgentRequest, AgentResponse, ToolActivity, ChatMessage } from "../schemas/agent.schema.js";
import { ProjectState } from "../schemas/project.schema.js";

export class AgentOrchestrator {
  public async processRequest(req: AgentRequest): Promise<AgentResponse> {
    // Pass request through ToolRouter
    return await toolRouter.routeRequest(req, (req, intent, preFetchedProducts) =>
      this.invokeLlmPipeline(req, intent, preFetchedProducts)
    );
  }

  private async invokeLlmPipeline(
    req: AgentRequest,
    intent: any,
    preFetchedProducts?: any[]
  ): Promise<AgentResponse> {
    const useMock = req.useMock !== undefined ? req.useMock : process.env.USE_MOCK_AI === "true";

    // If request contains an image, use Gemini Vision specifically
    if (!useMock && req.image && geminiService.isAvailable()) {
      try {
        analyticsTracker.trackLlmCall("gemini");
        analyticsTracker.trackImageUpload();
        console.log("📷 Routing Image Analysis request to Gemini Vision AI...");
        const { replyText, updatedProjectState, toolActivity, suggestedActions } =
          await geminiService.generateResponse(
            req.message,
            req.image,
            req.history || [],
            req.projectState,
            req.customerProfile
          );

        const newMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: replyText,
          timestamp: new Date().toISOString(),
          toolActivity,
        };

        return {
          message: newMsg,
          projectState: updatedProjectState,
          suggestedActions,
          toolActivity,
        };
      } catch (error: any) {
        console.warn("⚠️ Gemini Vision failed, failing over to Groq text model:", error?.message || error);
      }
    }

    // Text Reasoning Primary Engine: Groq (Llama 3.3 70B)
    if (!useMock && groqService.isAvailable()) {
      try {
        analyticsTracker.trackLlmCall("groq");
        const { replyText, updatedProjectState, toolActivity, suggestedActions, usedModel } =
          await groqService.generateResponse(
            req.message,
            req.image,
            req.history || [],
            req.projectState,
            req.customerProfile,
            preFetchedProducts
          );

        console.log(`⚡ Groq AI successfully processed text reasoning request using model: ${usedModel}`);

        const newMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: replyText,
          timestamp: new Date().toISOString(),
          toolActivity,
        };

        return {
          message: newMsg,
          projectState: updatedProjectState,
          suggestedActions,
          toolActivity,
        };
      } catch (error: any) {
        console.warn("⚠️ Groq AI models failed or hit quota limits, failing over to Gemini text engine:", error?.message || error);
      }
    }

    // Secondary Text Engine: Gemini
    if (!useMock && geminiService.isAvailable()) {
      try {
        analyticsTracker.trackLlmCall("gemini");
        const { replyText, updatedProjectState, toolActivity, suggestedActions } =
          await geminiService.generateResponse(
            req.message,
            req.image,
            req.history || [],
            req.projectState,
            req.customerProfile
          );

        const newMsg: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: replyText,
          timestamp: new Date().toISOString(),
          toolActivity,
        };

        return {
          message: newMsg,
          projectState: updatedProjectState,
          suggestedActions,
          toolActivity,
        };
      } catch (error: any) {
        console.warn("⚠️ Gemini text API returned error, failing over to local engine:", error?.message || error);
      }
    }

    // Fallback Engine: Local Autonomous Rule Engine
    return await this.runMockEngine(req, preFetchedProducts);
  }

  private async runMockEngine(req: AgentRequest, preFetchedProducts?: any[]): Promise<AgentResponse> {
    let state = JSON.parse(JSON.stringify(req.projectState || {})) as ProjectState;
    const toolActivities: ToolActivity[] = [];
    let replyText = "";
    let suggestedActions: string[] = [];

    const found = preFetchedProducts && preFetchedProducts.length > 0
      ? preFetchedProducts
      : await productRepository.searchProductsAsync({ query: req.message, limit: 8 });

    if (found && found.length > 0) {
      toolActivities.push({
        tool: "search_products",
        status: "completed",
        displayLabel: `Found ${found.length} relevant MR.PLUS products`,
      });

      state.status = "planning";
      state.title = `MR.PLUS Curated Catalog`;
      state.goal = `Found matching products for "${req.message}"`;
      const isSingleProductQuery =
        /^(?:tell me about|details of|specs of|info on|show me the|what is|how much is)\b/i.test(req.message.trim()) ||
        /digital air fryer|coconut scraper|three burner gas stove/i.test(req.message.trim());

      const itemsToLoad = isSingleProductQuery ? found.slice(0, 1) : found.slice(0, 5);

      state.shoppingList = itemsToLoad.map((p: any) => ({
        productId: p.id,
        quantity: 1,
        priority: "essential" as const,
        reason: `Matched "${req.message.slice(0, 30)}".`
      }));

      const basket = productRepository.calculateBasket(state.shoppingList, null);
      state.budget = {
        maximum: null,
        currentTotal: basket.subtotal,
        remaining: null
      };

      const prodListMarkdown = itemsToLoad
        .map((p: any) => `- **${p.name || p.title}** — \`₹${(p.price || 0).toLocaleString()}\` (${p.stockStatus === "in_stock" ? "In Stock" : "Available"})\n  *${(p.description || "").slice(0, 100)}...*`)
        .join("\n");

      replyText = `### MR.PLUS Curated Recommendations 🛍️\n\nHere are matching items from our store catalog for **"${req.message}"**:\n\n${prodListMarkdown}\n\nSelected items are loaded in your **Workspace Plan** on the left panel!`;

      suggestedActions = [
        "Find non-stick frypans and appachatty",
        "Digital Air Fryer 5L",
        "BLDC Ceiling Fans",
        "Electric Kettles under ₹1,000"
      ];
    } else {
      replyText = `### MR.PLUS Store Catalog 🛋️\n\nNo exact items matched **"${req.message}"** in our store catalog.\n\nTry searching for in-stock MR.PLUS household items like **"appachatty"**, **"frypan"**, **"tawa"**, **"kettle"**, **"air fryer"**, or **"ceiling fan"**!`;

      suggestedActions = [
        "Find non-stick frypans and appachatty",
        "Digital Air Fryer 5L",
        "BLDC Ceiling Fans",
        "Electric Kettles under ₹1,000"
      ];
    }

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: replyText,
      timestamp: new Date().toISOString(),
      toolActivity: toolActivities
    };

    return {
      message: newMsg,
      projectState: state,
      suggestedActions,
      toolActivity: toolActivities
    };
  }
}

export const agentOrchestrator = new AgentOrchestrator();


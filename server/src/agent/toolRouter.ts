import { classifyIntent, IntentType } from "./intentClassifier.js";
import { checkPreGuardrails } from "./guardrails.js";
import { rewriteQuery, filterDomainProducts } from "./queryRewriter.js";
import { rankProducts } from "./ranker.js";
import { searchProductsTool } from "./tools/searchProducts.js";
import { queryStorePolicyTool } from "./tools/queryStorePolicy.js";
import { calculateBasketTool } from "./tools/calculateBasket.js";
import { evaluateConfidence } from "./confidenceScorer.js";
import { analyticsTracker } from "./analytics.js";
import { sessionStore } from "./sessionStore.js";
import { productRepository } from "../repositories/product.repository.js";
import { AgentRequest, AgentResponse, ChatMessage } from "../schemas/agent.schema.js";
import { ProjectState } from "../schemas/project.schema.js";

function formatCleanTitle(query: string, maxPrice?: number): string {
  const q = (query || "").trim().toLowerCase();
  let categoryName = "";

  if (/\btv\b|tvs|television|led tv|smart tv/i.test(q)) {
    categoryName = "Smart LED TVs";
  } else if (/cooker|pressure cooker/i.test(q)) {
    categoryName = "Pressure Cookers";
  } else if (/soundbar|speaker|bluetooth/i.test(q)) {
    categoryName = "Audio & Soundbars";
  } else if (/cookware|utensil|frypan|appachatty/i.test(q)) {
    categoryName = "Cookware Collection";
  } else if (/appliance|kitchen/i.test(q)) {
    categoryName = "Kitchen Appliances";
  } else if (q.length > 0) {
    categoryName = q.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  } else {
    categoryName = "Products";
  }

  const priceSuffix = maxPrice ? ` (Under ₹${maxPrice.toLocaleString()})` : "";
  return `Featured MR.PLUS ${categoryName}${priceSuffix}`;
}

export class ToolRouter {
  public async routeRequest(
    req: AgentRequest,
    invokeLlmCallback: (
      req: AgentRequest,
      intent: any,
      preFetchedProducts?: any[]
    ) => Promise<AgentResponse>
  ): Promise<AgentResponse> {
    const message = req.message || "";
    const hasImage = Boolean(req.image);
    const session = sessionStore.getOrCreateSession(req.projectState?.id || "default");

    // 1. Guardrails Check (Pre-LLM)
    const preCheck = checkPreGuardrails(message);
    if (!preCheck.passed && preCheck.suggestedReply) {
      return this.buildDirectResponse(preCheck.suggestedReply, req.projectState);
    }

    // 2. Classify Intent
    const intent = classifyIntent(message, hasImage);
    sessionStore.updateSession(session.sessionId, { lastIntent: intent.type });
    console.log(`📩 [ToolRouter] Incoming request: "${message}" | Intent: ${intent.type}`);

    // 3. Simple static intents (0 LLM Tokens, <5ms latency)
    if (intent.type === IntentType.GREETING) {
      const customerName = req.customerProfile?.firstName ? ` ${req.customerProfile.firstName}` : "";
      const text = `### Hello${customerName}! Welcome to MR.PLUS 🌿\n\nI am your AI Shopping Architect for **shop.mrplus.in** (Kerala's premier home electronics & kitchenware experience).\n\nHow can I help you today?\n- 🥘 **Cookware & Pressure Cookers**\n- 🔊 **Soundbars & Bluetooth Speakers**\n- 🍳 **Appachatty & Frypans**\n- 📦 **Shipping, Returns & Warranty**`;
      return this.buildDirectResponse(text, req.projectState);
    }

    if (intent.type === IntentType.POLICY_FAQ) {
      analyticsTracker.trackToolCall("query_store_policy");
      const policyResult = await queryStorePolicyTool.execute({ question: message });
      const bestMatch = policyResult.data.bestMatch;
      const confidenceEval = evaluateConfidence(message, policyResult.data.results);

      if (confidenceEval.topConfidence >= 0.85 && bestMatch) {
        return this.buildDirectResponse(
          `### ${bestMatch.title}\n\n${bestMatch.content}`,
          req.projectState,
          [
            "How long does delivery take in Kerala?",
            "What is your return policy?",
            "Show pressure cookers under ₹2000",
          ]
        );
      } else if (confidenceEval.shouldAskClarification) {
        const optionsText = (confidenceEval.clarifyingOptions || [])
          .map((opt) => `- **${opt}**`)
          .join("\n");
        return this.buildDirectResponse(
          `Which topic would you like to check?\n\n${optionsText}`,
          req.projectState
        );
      }
    }

    // 4. Pre-fetch relevant products using LlmBridge and delegate to LLM Pipeline (Groq / Gemini)
    // Pre-fetching gives the LLM immediate real catalog context, reducing iterations & avoiding blank searches
    const preFetchedProducts = await (await import("./llmBridge.js")).llmBridge.preFetchProducts(message, intent.extractedPrice);
    
    return await invokeLlmCallback(req, intent, preFetchedProducts);
  }

  private buildDirectResponse(
    content: string,
    state?: ProjectState,
    actions?: string[]
  ): AgentResponse {
    const defaultState: ProjectState = state || {
      id: "proj_default",
      title: "MR.PLUS AI Shopping Workspace",
      goal: "Browse kitchenware, pressure cookers, and audio equipment",
      status: "discovering",
      budget: { maximum: null, currentTotal: 0, remaining: null },
      preferences: [],
      steps: [],
      shoppingList: [],
      suggestedActions: [],
    };

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
      toolActivity: [],
    };

    return {
      message: newMsg,
      projectState: defaultState,
      suggestedActions: actions || [
        "Show pressure cookers under ₹2,000",
        "Find non-stick frypans and appachatty",
        "Check soundbar speakers",
      ],
      toolActivity: [],
    };
  }

  private updateProjectStateWithProducts(
    currentState: ProjectState = {} as any,
    products: any[],
    query: string,
    maxPrice?: number
  ): ProjectState {
    const baseState: ProjectState = JSON.parse(JSON.stringify(currentState));
    const shoppingList = products.map((p) => ({
      productId: p.id,
      quantity: 1,
      priority: "essential" as const,
      reason: "Curated for your query",
    }));

    return {
      ...baseState,
      id: baseState.id || "proj_default",
      title: query ? formatCleanTitle(query, maxPrice) : "Featured MR.PLUS Products",
      status: "planning",
      budget: {
        maximum: maxPrice || baseState.budget?.maximum || null,
        currentTotal: products.reduce((acc, p) => acc + (p.price || 0), 0),
        remaining: maxPrice ? Math.max(0, maxPrice - products.reduce((acc, p) => acc + (p.price || 0), 0)) : null,
      },
      shoppingList,
    };
  }
}

export const toolRouter = new ToolRouter();

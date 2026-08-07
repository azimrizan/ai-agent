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

    // 3. Handle Simple Intents Directly (0 LLM Tokens, <5ms latency)
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

    if (
      intent.type === IntentType.SIMPLE_SEARCH ||
      intent.type === IntentType.COLLECTION_BROWSE ||
      intent.type === IntentType.PRICE_FILTER
    ) {
      analyticsTracker.trackToolCall("search_products");
      const searchTerms = rewriteQuery(intent.query);
      analyticsTracker.trackSearch(searchTerms[0], 1);

      let foundProducts: any[] = [];
      for (const term of searchTerms) {
        const res = await searchProductsTool.execute({
          query: term,
          maxPrice: intent.extractedPrice,
          limit: 15,
        });
        if (res.products && res.products.length > 0) {
          foundProducts.push(...res.products);
        }
      }

      // Deduplicate
      const uniqueMap = new Map();
      for (const p of foundProducts) {
        if (!uniqueMap.has(p.id)) uniqueMap.set(p.id, p);
      }
      let uniqueProducts = Array.from(uniqueMap.values());

      // Global Fallback: If broad search returned 0 items, pull all catalog products matching price filter
      if (uniqueProducts.length === 0) {
        const allProds = await productRepository.searchProductsAsync({ limit: 40 });
        uniqueProducts = intent.extractedPrice
          ? allProds.filter((p: any) => p.price <= intent.extractedPrice!)
          : allProds;
      }

      // Apply strict domain filter (electronics vs cookware/utensils)
      uniqueProducts = filterDomainProducts(intent.query, uniqueProducts);

      // Score, Rank, and take Top 8 items max
      const rankingQuery = searchTerms.join(" ");
      let ranked = rankProducts(uniqueProducts, rankingQuery, intent.extractedPrice);
      if (intent.extractedPrice) {
        ranked = ranked.filter((p) => p.price <= intent.extractedPrice!);
      }
      const topProducts = ranked.slice(0, 8);

      if (topProducts.length > 0) {
        const updatedState = this.updateProjectStateWithProducts(
          req.projectState,
          topProducts,
          intent.query,
          intent.extractedPrice
        );
        const priceLabel = intent.extractedPrice ? ` under ₹${intent.extractedPrice.toLocaleString()}` : "";
        const replyText = `### Featured MR.PLUS Products (${intent.query}${priceLabel})\n\nI found **${topProducts.length}** curated MR.PLUS products matching your request. Interactive cards are loaded on the left panel!\n\n- 🛍️ **Products Found**: ${topProducts.slice(0, 3).map(p => p.name || p.title).join(", ")}${topProducts.length > 3 ? "..." : ""}\n- 💰 **Price Filter**: ${intent.extractedPrice ? `Max ₹${intent.extractedPrice.toLocaleString()}` : "All Prices"}`;
        return this.buildDirectResponse(replyText, updatedState, [
          "Compare top items",
          "Show pressure cookers under ₹2000",
          "Check non-stick frypans",
        ]);
      } else if (intent.extractedPrice) {
        const replyText = `### Budget Filter Notice\n\nNo MR.PLUS items matched **"${intent.query}"** strictly under **₹${intent.extractedPrice.toLocaleString()}**.\n\nOur kitchenware & appliance items start from **₹699** (Appachatty & Frypans) and **₹1,499** (Pressure Cookers). Try searching for items under ₹2,000 or ₹5,000!`;
        return this.buildDirectResponse(replyText, req.projectState, [
          "Show frypans under ₹1000",
          "Show pressure cookers under ₹2000",
          "Show all kitchenware",
        ]);
      }
    }

    // 4. Complex Intents -> Delegate to Orchestrator + LLM (Groq Text / Gemini Vision)
    return await invokeLlmCallback(req, intent);
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
      title: query
        ? `Featured MR.PLUS Products (${query}${maxPrice ? ` under ₹${maxPrice.toLocaleString()}` : ""})`
        : "Featured MR.PLUS Products",
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

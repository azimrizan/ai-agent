import { allTools, toolRegistry } from "../agent/tools/index.js";
import { ChatMessage, ToolActivity } from "../schemas/agent.schema.js";
import { ProjectState } from "../schemas/project.schema.js";

const DEFAULT_PROJECT_STATE: ProjectState = {
  id: "proj_default",
  title: "AI DIY & Shopping Workspace",
  goal: "Describe your home project, apartment setup, or upload a photo of a DIY problem to begin.",
  status: "discovering",
  budget: {
    maximum: null,
    currentTotal: 0,
    remaining: null,
  },
  preferences: [],
  steps: [],
  shoppingList: [],
  suggestedActions: [],
};

function normalizeSchema(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(normalizeSchema);

  const copy: any = {};
  for (const key of Object.keys(obj)) {
    if (key === "type" && typeof obj[key] === "string") {
      copy[key] = obj[key].toLowerCase();
    } else {
      copy[key] = normalizeSchema(obj[key]);
    }
  }
  return copy;
}

export class GroqService {
  private defaultModels: string[] = [
    "openai/gpt-oss-20b"
  ];

  private getModelList(): string[] {
    const envModel = process.env.GROQ_MODEL?.trim();
    if (envModel) {
      return Array.from(new Set([envModel, ...this.defaultModels]));
    }
    return this.defaultModels;
  }


  private getApiKey(): string {
    return process.env.GROQ_API_KEY || "";
  }

  public isAvailable(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim() !== "" && key !== "your_groq_api_key_here");
  }

  public async generateResponse(
    userMessage: string,
    imageAttachment?: string,
    history: ChatMessage[] = [],
    currentProjectState: ProjectState = DEFAULT_PROJECT_STATE,
    customerProfile?: any,
    preFetchedProducts?: any[]
  ): Promise<{
    replyText: string;
    updatedProjectState: ProjectState;
    toolActivity: ToolActivity[];
    suggestedActions: string[];
    usedModel: string;
  }> {
    if (!this.isAvailable()) {
      throw new Error("GROQ API key is not configured.");
    }

    let lastError: Error | null = null;

    // Cycle through all Groq models in priority order as fallbacks
    for (const model of this.getModelList()) {

      try {
        console.log(`🤖 Attempting Groq AI Model: ${model}`);
        const result = await this.tryGroqModel(
          model,
          userMessage,
          imageAttachment,
          history,
          currentProjectState,
          customerProfile,
          preFetchedProducts
        );

        return { ...result, usedModel: model };
      } catch (error: any) {
        console.warn(`⚠️ Groq Model ${model} returned error (${error?.message || error}), failing over to next Groq model...`);
        lastError = error;
      }
    }

    throw lastError || new Error("All Groq models failed or exhausted quota.");
  }

  private async tryGroqModel(
    modelName: string,
    userMessage: string,
    imageAttachment: string | undefined,
    history: ChatMessage[],
    currentProjectState: ProjectState,
    customerProfile?: any,
    preFetchedProducts?: any[]
  ): Promise<{
    replyText: string;
    updatedProjectState: ProjectState;
    toolActivity: ToolActivity[];
    suggestedActions: string[];
  }> {
    const toolActivities: ToolActivity[] = [];
    let updatedProjectState = JSON.parse(JSON.stringify(currentProjectState)) as ProjectState;

    if (preFetchedProducts && preFetchedProducts.length > 0) {
      const isSingleProductQuery =
        /^(?:tell me about|details of|specs of|info on|show me the|what is|how much is)\b/i.test(userMessage.trim()) ||
        /digital air fryer|coconut scraper|three burner gas stove/i.test(userMessage.trim());

      const itemsToUse = isSingleProductQuery ? preFetchedProducts.slice(0, 1) : preFetchedProducts.slice(0, 6);
      const shoppingListItems = itemsToUse.map((p: any) => ({
        productId: p.id,
        quantity: 1,
        priority: "essential" as const,
        reason: `Curated for "${userMessage.slice(0, 30)}"`
      }));

      const subtotal = itemsToUse.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
      updatedProjectState = {
        ...updatedProjectState,
        title: `Curated Recommendations`,
        status: "planning",
        budget: {
          maximum: updatedProjectState.budget?.maximum || null,
          currentTotal: subtotal,
          remaining: updatedProjectState.budget?.maximum ? Math.max(0, updatedProjectState.budget.maximum - subtotal) : null
        },
        shoppingList: shoppingListItems
      };
    }


    // Convert tool contracts into OpenAI function declaration format with normalized lowercase schema types
    const openAiTools = allTools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: normalizeSchema(tool.parameters),
      },
    }));

    let customerContext = "";
    if (customerProfile && (customerProfile.firstName || customerProfile.email)) {
      customerContext = ` | Customer Profile: Name: ${customerProfile.firstName || ""} ${customerProfile.lastName || ""}, Email: ${customerProfile.email || ""}`;
    }

    let preFetchedText = "";
    if (preFetchedProducts && preFetchedProducts.length > 0) {
      const formattedList = preFetchedProducts
        .map((p: any) => `- ${p.name || p.title} (ID: ${p.id}) | Price: ₹${p.price} | Category: ${p.category || "Cookware"} | Description: ${(p.description || "N/A").slice(0, 100)}`)
        .join("\n");

      const colMeta = (preFetchedProducts as any).matchedCollection;
      const colText = colMeta
        ? `\nMATCHED SHOPIFY COLLECTION: "${colMeta.title}" | EXACT VERIFIED URL: ${colMeta.url}`
        : "";

      preFetchedText = `\n\nPRE-FETCHED MATCHING CATALOG PRODUCTS FOR THIS USER QUERY:\n${formattedList}${colText}\n\nINSTRUCTION: Synthesize a friendly, expert shopping recommendation based on these products. Products are ALREADY loaded on the UI workspace. If a collection URL is provided above, include a direct link to it in markdown format: [Explore ${colMeta?.title || "Collection"}](${colMeta?.url}).`;
    }

    const stateSummary = currentProjectState && currentProjectState.title
      ? `Project Title: "${currentProjectState.title}" | Status: ${currentProjectState.status || "planning"}`
      : "No active project";

    const systemPrompt = `You are MR.PLUS AI Shopping Assistant for mrplus.in (Kerala's premier AI shopping experience).

IMPORTANT CONTEXT:
${stateSummary}${customerContext}${preFetchedText}

STRICT BEHAVIOR INSTRUCTIONS:
1. GREETINGS & CASUAL INTROS (e.g., "hi", "hello", "hey", "good morning"):
   - Greet the user warmly and professionally. Address customer by name if known.
   - Briefly ask how you can assist them today with MR.PLUS cookware, non-stick frypans, appachatty, digital air fryers, BLDC ceiling fans, or kitchen appliances.

2. PRODUCT & COLLECTION ADVICE:
   - Provide clear, helpful, expert advice polished by LLM reasoning.
   - Format prices clearly in INR (₹).
   - STRICT URL RULE: ONLY use exact collection URLs explicitly provided in the context above (e.g., https://mrplus.in/collections/home-theatre or https://mrplus.in/collections/led-tv). NEVER invent or guess collection URLs like 'home-theater'!

3. TOOL CALL PARAMETER RULE:
   - Always pass numeric parameters (e.g. maxPrice, targetPrice, limit, quantity) strictly as raw JSON numbers without quotes, e.g. maxPrice: 2000, NOT '2000'.`;


    const messages: any[] = [{ role: "system", content: systemPrompt }];

    for (const msg of history.slice(-6)) {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    }

    let userContent: any = `${userMessage}`;
    if (imageAttachment && (modelName.includes("vision") || modelName.includes("llama-3.2"))) {
      userContent = [
        { type: "text", text: userMessage || "Please analyze this image." },
        { type: "image_url", image_url: { url: imageAttachment } },
      ];
    }

    messages.push({ role: "user", content: userContent });

    const isSimpleGreeting = /^(hi|hello|hey|hey\s+there|good\s+morning|good\s+afternoon|good\s+evening|namaste|greetings|hi\s+there|hlo|hola)\s*[\.!\?]*$/i.test(userMessage.trim());
    const hasPreFetched = Boolean(preFetchedProducts && preFetchedProducts.length > 0);
    const toolsToPass = (isSimpleGreeting || hasPreFetched) ? [] : openAiTools;


    let response = await this.callGroqApi(modelName, messages, toolsToPass);
    let choice = response.choices?.[0];
    let assistantMsg = choice?.message;

    let iterations = 0;
    const maxIterations = preFetchedProducts && preFetchedProducts.length > 0 ? 1 : 2;
    const seenToolCalls = new Set<string>();

    while (assistantMsg?.tool_calls && assistantMsg.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++;
      messages.push(assistantMsg);

      let shouldBreak = false;

      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs: any = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch (e) {
          fnArgs = {};
        }

        // Coerce string numbers in fnArgs if model sent them as strings
        if (fnArgs.maxPrice !== undefined) fnArgs.maxPrice = Number(String(fnArgs.maxPrice).replace(/[^0-9.]/g, ""));
        if (fnArgs.limit !== undefined) fnArgs.limit = Number(String(fnArgs.limit).replace(/[^0-9]/g, ""));
        if (fnArgs.targetPrice !== undefined) fnArgs.targetPrice = Number(String(fnArgs.targetPrice).replace(/[^0-9.]/g, ""));

        const signature = `${fnName}:${JSON.stringify(fnArgs)}`;
        if (seenToolCalls.has(signature)) {
          console.warn(`⚠️ Model attempted duplicate tool call ${fnName}, stopping loop.`);
          shouldBreak = true;
          break;
        }
        seenToolCalls.add(signature);

        console.log(`🛠️ Groq calling tool ${fnName} with args:`, fnArgs);

        toolActivities.push({
          tool: fnName,
          status: "running",
          displayLabel: `Running ${fnName}...`,
        });

        const targetTool = toolRegistry[fnName];
        let toolOutput: any = {};

        if (targetTool) {
          try {
            if (fnName === "update_project_plan") {
              toolOutput = await targetTool.execute(fnArgs as any, updatedProjectState);
              if (toolOutput && toolOutput.project) {
                updatedProjectState = toolOutput.project;
              }
            } else {
              toolOutput = await targetTool.execute(fnArgs as any);
              if (fnName === "search_products" && toolOutput?.products && Array.isArray(toolOutput.products) && toolOutput.products.length > 0) {
                const newItems = toolOutput.products.slice(0, 12).map((p: any) => ({

                  productId: p.id,
                  quantity: 1,
                  reason: `Recommended by MR.PLUS AI`,
                }));
                updatedProjectState = {
                  ...updatedProjectState,
                  title: (fnArgs as any)?.query ? `Featured MR.PLUS Products (${(fnArgs as any).query})` : "Featured MR.PLUS Products",
                  status: "planning",
                  shoppingList: newItems,
                };
              }
            }
          } catch (err: any) {
            toolOutput = { error: err.message || "Tool execution failed" };
          }
        } else {
          toolOutput = { error: `Tool ${fnName} not found` };
        }

        const lastAct = toolActivities[toolActivities.length - 1];
        if (lastAct) {
          lastAct.status = "completed";
          if (fnName === "search_products") {
            const count = toolOutput?.products?.length || 0;
            lastAct.displayLabel = `Found ${count} relevant products`;
          } else {
            lastAct.displayLabel = `Completed ${fnName}`;
          }
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolOutput),
        });
      }

      if (shouldBreak) break;

      // On second pass, pass tools with tool_choice: "none" to force plain text output while keeping tool history schema valid
      response = await this.callGroqApi(modelName, messages, openAiTools, iterations >= 1 ? "none" : "auto");

      choice = response.choices?.[0];
      assistantMsg = choice?.message;
    }

    const replyText = assistantMsg?.content || "I have updated your recommendations and project plan.";
    const suggestedActions = updatedProjectState.suggestedActions || [
      "Find non-stick frypans and appachatty",
      "Digital Air Fryer 5L",
      "BLDC Ceiling Fans",
      "Electric Kettles under ₹1,000",
    ];

    return {
      replyText,
      updatedProjectState,
      toolActivity: toolActivities,
      suggestedActions,
    };
  }

  private async callGroqApi(model: string, messages: any[], tools: any[], toolChoice: string = "auto"): Promise<any> {
    const body: any = {
      model,
      messages,
      temperature: 0.6,
      max_tokens: 2500,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = toolChoice;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorJson: any = await response.json().catch(() => ({}));
      throw new Error(`Groq API HTTP ${response.status}: ${errorJson?.error?.message || response.statusText}`);
    }

    return await response.json();
  }
}

export const groqService = new GroqService();

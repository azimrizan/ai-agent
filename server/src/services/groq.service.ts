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
  private groqModels: string[] = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-specdec",
    "deepseek-r1-distill-llama-70b",
    "qwen-2.5-coder-32b",
    "llama-3.2-11b-vision-instruct",
    "llama-3.2-90b-vision-instruct",
    "llama-3.2-3b-preview",
    "llama-3.2-1b-preview",
  ];

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
    customerProfile?: any
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
    for (const model of this.groqModels) {
      try {
        console.log(`🤖 Attempting Groq AI Model: ${model}`);
        const result = await this.tryGroqModel(
          model,
          userMessage,
          imageAttachment,
          history,
          currentProjectState,
          customerProfile
        );

        return { ...result, usedModel: model };
      } catch (error: any) {
        console.warn(`⚠️ Groq Model ${model} returned error/quota limit (${error?.message || error}), failing over to next Groq model...`);
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
    customerProfile?: any
  ): Promise<{
    replyText: string;
    updatedProjectState: ProjectState;
    toolActivity: ToolActivity[];
    suggestedActions: string[];
  }> {
    const toolActivities: ToolActivity[] = [];
    let updatedProjectState = JSON.parse(JSON.stringify(currentProjectState)) as ProjectState;

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
      customerContext = ` | Customer Profile: Name: ${customerProfile.firstName || ""} ${customerProfile.lastName || ""}, Email: ${customerProfile.email || ""}, Orders: ${customerProfile.ordersCount || 0}`;
    }

    const systemPrompt = `You are MR.PLUS AI Shopping Assistant for shop.mrplus.in (Kerala's premier AI shopping experience).

IMPORTANT CONTEXT:
Current Project State JSON: ${JSON.stringify(currentProjectState)}${customerContext}

STRICT BEHAVIOR INSTRUCTIONS:
1. GREETINGS & CASUAL INTROS (e.g., "hi", "hello", "hey", "good morning"):
   - Greet the user warmly and professionally. If customer profile exists, address them by name (e.g. "Hello Azim!").
   - Briefly ask how you can assist them today with MR.PLUS kitchenware, pressure cookers, appachatty, frypans, cookware, soundbars, or home appliances.
   - DO NOT execute search_products or invent random search queries like 'home appliances' when the user simply greets you. Wait for a real product request.

2. SPECIFIC PRODUCT & PROJECT REQUESTS (e.g., "show pressure cookers under ₹2000", "need non-stick frypan"):
   - Execute search_products tool matching the user's specific request.
   - Format prices in ₹ (INR).`;

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
    const toolsToPass = isSimpleGreeting ? [] : openAiTools;

    let response = await this.callGroqApi(modelName, messages, toolsToPass);
    let choice = response.choices?.[0];
    let assistantMsg = choice?.message;

    let iterations = 0;
    const maxIterations = 4;

    while (assistantMsg?.tool_calls && assistantMsg.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++;
      messages.push(assistantMsg);

      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch (e) {
          fnArgs = {};
        }

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
                const newItems = toolOutput.products.slice(0, 6).map((p: any) => ({
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

      response = await this.callGroqApi(modelName, messages, openAiTools);
      choice = response.choices?.[0];
      assistantMsg = choice?.message;
    }

    const replyText = assistantMsg?.content || "I have updated your recommendations and project plan.";
    const suggestedActions = updatedProjectState.suggestedActions || [
      "Show pressure cookers under ₹2,000",
      "Find non-stick frypans and appachatty",
      "Check soundbar speakers",
    ];

    return {
      replyText,
      updatedProjectState,
      toolActivity: toolActivities,
      suggestedActions,
    };
  }

  private async callGroqApi(model: string, messages: any[], tools: any[]): Promise<any> {
    const body: any = {
      model,
      messages,
      temperature: 0.6,
      max_tokens: 1500,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
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

import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { SYSTEM_PROMPT } from "../agent/systemPrompt.js";
import { allTools, toolRegistry } from "../agent/tools/index.js";
import { ChatMessage, ToolActivity } from "../schemas/agent.schema.js";
import { ProjectState } from "../schemas/project.schema.js";

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private currentApiKey: string | undefined = undefined;

  private getAI(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return null;
    }
    if (!this.ai || this.currentApiKey !== apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      this.currentApiKey = apiKey;
    }
    return this.ai;
  }

  private getModelName(): string {
    return process.env.GEMINI_MODEL || "gemini-2.0-flash";
  }

  public isAvailable(): boolean {
    return this.getAI() !== null;
  }

  public async generateResponse(
    userMessage: string,
    imageAttachment: string | undefined,
    history: ChatMessage[],
    currentProjectState: ProjectState
  ): Promise<{
    replyText: string;
    updatedProjectState: ProjectState;
    toolActivity: ToolActivity[];
    suggestedActions: string[];
  }> {
    const aiInstance = this.getAI();
    if (!aiInstance) {
      throw new Error("Gemini API key is not configured.");
    }
    const modelName = this.getModelName();

    const toolActivities: ToolActivity[] = [];
    let updatedProjectState = JSON.parse(JSON.stringify(currentProjectState)) as ProjectState;

    // Convert tool contracts into GenAI function declarations
    const functionDeclarations = allTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as any,
    }));

    // Build conversation contents
    const contents: any[] = [];
    
    // Inject current project state context and history
    const contextIntro = `[System Context: Current Project State JSON: ${JSON.stringify(currentProjectState)}]`;
    
    for (const msg of history.slice(-6)) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }

    const userParts: any[] = [{ text: `${contextIntro}\n\nUser request: ${userMessage}` }];
    if (imageAttachment) {
      // imageAttachment could be data URL like data:image/jpeg;base64,...
      const base64Data = imageAttachment.includes(",")
        ? imageAttachment.split(",")[1]
        : imageAttachment;
      const mimeType = imageAttachment.includes(";")
        ? imageAttachment.split(";")[0].split(":")[1]
        : "image/jpeg";
      userParts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    }

    contents.push({ role: "user", parts: userParts });

    const candidateModels = Array.from(new Set([
      modelName,
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-flash-latest"
    ]));
    // Note: gemini-2.5-flash / gemini-2.5-pro require billing to be enabled on your API key.

    let lastError: any = null;
    for (const currentModel of candidateModels) {
      try {
        let currentResponse = await aiInstance.models.generateContent({
          model: currentModel,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.4,
            tools: [{ functionDeclarations }],
          },
        });

        let turnCount = 0;
        let replyText = "";

        while (turnCount < 8) {
          turnCount++;
          const functionCalls = currentResponse.functionCalls;
          
          if (!functionCalls || functionCalls.length === 0) {
            try {
              replyText = currentResponse.text || "";
            } catch (e) {
              // Ignore
            }
            break;
          }

          // Push the model's message containing all function calls requested in this turn exactly once
          const modelContent = currentResponse.candidates?.[0]?.content;
          if (modelContent) {
            contents.push(modelContent);
          } else {
            contents.push({ role: "model", parts: functionCalls.map((c: any) => ({ functionCall: c })) });
          }

          // Execute all function calls requested in this turn
          const toolResponseParts: any[] = [];
          for (const call of functionCalls) {
            if (!call.name) continue;
            const toolName = call.name;
            const toolArgs = call.args;
            const tool = toolRegistry[toolName];

            toolActivities.push({
              tool: toolName,
              status: "running",
              displayLabel: `Executing ${toolName}...`,
            });

            if (tool) {
              try {
                let result: any;
                if (toolName === "update_project_plan") {
                  result = await tool.execute(toolArgs, updatedProjectState);
                  if (result && result.project) {
                    updatedProjectState = result.project;
                  }
                } else {
                  result = await tool.execute(toolArgs);
                }

                const lastAct = toolActivities[toolActivities.length - 1];
                lastAct.status = "completed";
                if (toolName === "search_products") {
                  const count = result?.products?.length || 0;
                  lastAct.displayLabel = `Found ${count} relevant products`;
                } else if (toolName === "update_project_plan") {
                  lastAct.displayLabel = `Updated project state: ${updatedProjectState.title || "Plan"}`;
                } else if (toolName === "calculate_basket") {
                  lastAct.displayLabel = `Calculated basket subtotal: ₹${result?.subtotal || 0}`;
                } else {
                  lastAct.displayLabel = `Completed ${toolName}`;
                }

                toolResponseParts.push({
                  functionResponse: {
                    name: toolName,
                    response: result,
                  },
                });
              } catch (err: any) {
                const lastAct = toolActivities[toolActivities.length - 1];
                lastAct.status = "failed";
                lastAct.displayLabel = `Failed to execute ${toolName}`;
                console.error(`Error executing tool ${toolName}:`, err);
                toolResponseParts.push({
                  functionResponse: {
                    name: toolName,
                    response: { error: err.message || "Failed to execute tool" },
                  },
                });
              }
            } else {
              toolResponseParts.push({
                functionResponse: {
                  name: toolName,
                  response: { error: `Tool ${toolName} not found` },
                },
              });
            }
          }

          // If the model has searched products multiple times or turnCount >= 4, guide it to call update_project_plan or wrap up
          if (turnCount >= 3 && !toolActivities.some((act) => act.tool === "update_project_plan" && act.status === "completed")) {
            toolResponseParts.push({
              functionResponse: {
                name: "system_instruction_reminder",
                response: {
                  reminder: "You have searched the catalogue enough. You MUST call `update_project_plan` right now with the products found and 3 clear DIY roadmap steps, or formulate your final conversational response right away.",
                },
              },
            });
          }

          // Push all tool responses as a single 'tool' role turn
          contents.push({
            role: "tool",
            parts: toolResponseParts,
          });

          // Call generateContent again, passing tools so the model can either call more tools or formulate the final text reply
          currentResponse = await aiInstance.models.generateContent({
            model: currentModel,
            contents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.4,
              tools: [{ functionDeclarations }],
            },
          });
        }

        // Only access currentResponse.text if functionCalls is empty to prevent SDK non-text warnings
        if (!replyText && (!currentResponse.functionCalls || currentResponse.functionCalls.length === 0)) {
          try {
            replyText = currentResponse?.text || "";
          } catch (e) {
            // Ignore non-text warning
          }
        }

        if (!replyText) {
          // Do one final turn with function calling mode NONE to guarantee text summary cleanly without warnings
          try {
            const finalSummary = await aiInstance.models.generateContent({
              model: currentModel,
              contents,
              config: {
                systemInstruction: SYSTEM_PROMPT,
                temperature: 0.4,
                toolConfig: {
                  functionCallingConfig: {
                    mode: FunctionCallingConfigMode.NONE,
                  },
                },
              },
            });
            if (!finalSummary.functionCalls || finalSummary.functionCalls.length === 0) {
              replyText = finalSummary.text || "";
            }
          } catch (e) {
            // Ignore
          }
        }

        // Extract suggested actions or construct defaults
        const suggestedActions = this.extractSuggestedActions(replyText || "", updatedProjectState);

        return {
          replyText: replyText || "I've updated your project workspace with the recommendations.",
          updatedProjectState,
          toolActivity: toolActivities,
          suggestedActions,
        };
      } catch (err: any) {
        lastError = err;
        const code = err.status || err.code;
        if (code === 404) {
          console.warn(`Model ${currentModel} not available on your API key tier (404), trying next model...`);
        } else if (code === 429) {
          console.warn(`Model ${currentModel} quota exhausted (429), trying next model...`);
        } else {
          console.warn(`Model ${currentModel} failed (${code || err.message}), trying next model...`);
        }
        continue;
      }
    }

    throw lastError || new Error("All Gemini model candidates failed.");
  }

  private extractSuggestedActions(text: string, state: ProjectState): string[] {
    const actions: string[] = [];
    if (state.shoppingList.length > 0) {
      actions.push("Show cheaper options");
      actions.push("Remove optional items");
      actions.push("Find a nearby store");
    } else if (state.steps.length > 0) {
      actions.push("Build shopping list");
      actions.push("Check product compatibility");
    } else {
      actions.push("Start planning balcony garden");
      actions.push("Build apartment essentials list");
    }
    return actions.slice(0, 4);
  }
}

export const geminiService = new GeminiService();

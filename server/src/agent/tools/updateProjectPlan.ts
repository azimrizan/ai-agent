import { ProjectState } from "../../schemas/project.schema.js";

export const updateProjectPlanTool = {
  name: "update_project_plan",
  description: "Update the structured project state including title, goal, steps, budget, shopping list items, or image analysis observations. ONLY invoke when the user explicitly requests a change.",
  parameters: {
    type: "OBJECT",
    properties: {
      projectId: { type: "STRING", description: "Current active project ID" },
      updates: {
        type: "OBJECT",
        description: "Partial ProjectState object containing modifications. ONLY include fields you want to change.",
        properties: {
          title: { type: "STRING", description: "Project title" },
          goal: { type: "STRING", description: "Project goal" },
          status: { type: "STRING", description: "Status: discovering, planning, shopping, or complete" },
          preferences: { type: "ARRAY", items: { type: "STRING" }, description: "Customer preferences or constraints" },
          steps: {
            type: "ARRAY",
            description: "Array of project steps. Each step must have id, title, description, status, and relatedProductIds.",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                title: { type: "STRING" },
                description: { type: "STRING" },
                status: { type: "STRING" },
                relatedProductIds: { type: "ARRAY", items: { type: "STRING" } },
                estimatedCost: { type: "NUMBER" }
              }
            }
          },
          shoppingList: {
            type: "ARRAY",
            description: "Array of shopping list items. Each item must have productId, quantity, priority, and reason.",
            items: {
              type: "OBJECT",
              properties: {
                productId: { type: "STRING" },
                quantity: { type: "NUMBER" },
                priority: { type: "STRING" },
                reason: { type: "STRING" }
              }
            }
          }
        }
      }
    },
    required: ["projectId", "updates"]
  },
  execute: async (args: { projectId: string; updates: Partial<ProjectState> }, currentState: ProjectState) => {
    const rawUpdates = args?.updates || {};
    
    // Normalize and preserve steps safely
    let finalSteps = currentState.steps;
    if (Array.isArray(rawUpdates.steps) && rawUpdates.steps.length > 0) {
      finalSteps = rawUpdates.steps.map((s: any, idx: number) => {
        const existing = currentState.steps[idx] || {};
        const title = s.title || s.name || s.stepName || s.step || existing.title || `Step ${idx + 1}`;
        return {
          id: s.id || existing.id || `step_${idx + 1}`,
          title: title,
          description: s.description || s.desc || s.details || existing.description || "",
          status: s.status || existing.status || (idx === 0 ? "active" : "pending"),
          relatedProductIds: Array.isArray(s.relatedProductIds) ? s.relatedProductIds : (existing.relatedProductIds || []),
          estimatedCost: typeof s.estimatedCost === "number" ? s.estimatedCost : existing.estimatedCost
        };
      });
    }

    // Normalize shoppingList safely
    let finalShoppingList = currentState.shoppingList;
    if (Array.isArray(rawUpdates.shoppingList) && rawUpdates.shoppingList.length > 0) {
      finalShoppingList = rawUpdates.shoppingList.map((item: any) => ({
        productId: item.productId || item.id || "",
        quantity: typeof item.quantity === "number" ? item.quantity : 1,
        priority: item.priority || "essential",
        reason: item.reason || item.description || "Recommended item"
      })).filter((item: any) => Boolean(item.productId));
    }

    const updatedState: ProjectState = {
      ...currentState,
      ...rawUpdates,
      steps: finalSteps,
      shoppingList: finalShoppingList,
      budget: {
        ...currentState.budget,
        ...(rawUpdates.budget || {})
      }
    };
    return { project: updatedState };
  }
};

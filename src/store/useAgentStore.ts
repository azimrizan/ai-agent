import { create } from "zustand";
import type { ChatMessage } from "../types/agent.js";
import type { ProjectState, ShoppingListItem } from "../types/project.js";
import type { Product } from "../types/product.js";
import { MOCK_PRODUCTS } from "../data/mockProducts.js";

interface AgentStoreState {
  messages: ChatMessage[];
  projectState: ProjectState;
  suggestedActions: string[];
  isThinking: boolean;
  activeWorkspaceTab: "analysis" | "plan" | "budget" | "stores";
  useMockAI: boolean;
  replacementModal: {
    isOpen: boolean;
    targetItem: ShoppingListItem | null;
    alternatives: Product[];
  };

  // Actions
  sendMessage: (text: string, image?: string) => Promise<void>;
  setWorkspaceTab: (tab: "analysis" | "plan" | "budget" | "stores") => void;
  setUseMockAI: (useMock: boolean) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  openReplacementModal: (item: ShoppingListItem) => Promise<void>;
  closeReplacementModal: () => void;
  replaceItem: (oldProductId: string, newProduct: Product) => void;
  resetSession: (scenario?: "garden" | "apartment" | "hinge" | "cables" | "blank") => void;
}

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
  imageAnalysis: undefined,
  suggestedActions: [],
};

const INITIAL_MESSAGE: ChatMessage = {
  id: "msg_init_0",
  role: "assistant",
  content: `### Hi! I'm MR. Plus AI Agent, how can I help you today? ✨

I'm your dedicated digital project architect and shopping advisor. Unlike a standard search bar, I can synthesize multi-step DIY plans, diagnose broken household items from photos, and optimize your entire shopping basket to strictly respect your budget.

#### Try starting with a quick demo scenario:
- 🌿 **"I want to set up a small balcony garden. My budget is ₹8,000."**
- 🏡 **"I'm moving into my first apartment. Build me an essentials list under ₹15,000."**
- 🔧 **Upload a photo** of a broken cabinet hinge or fixture and ask: **"How can I fix this?"**
- 🔌 **"I need the thing used to organize loose charging cables, but I don't know what it's called."**

On the **left panel**, your dynamic workspace will bring your project steps, product compatibility checks, and live budget breakdown to life right before your eyes!`,
  timestamp: new Date().toISOString(),
};

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  messages: [INITIAL_MESSAGE],
  projectState: DEFAULT_PROJECT_STATE,
  suggestedActions: [
    "Set up a small balcony garden (₹8,000)",
    "First apartment essentials under ₹15,000",
    "How can I fix a loose cabinet hinge?",
    "Find cable organizer and desk tidy box",
  ],
  isThinking: false,
  activeWorkspaceTab: "plan",
  useMockAI: false,
  replacementModal: {
    isOpen: false,
    targetItem: null,
    alternatives: [],
  },

  setWorkspaceTab: (tab) => set({ activeWorkspaceTab: tab }),

  setUseMockAI: (useMock) => set({ useMockAI: useMock }),

  sendMessage: async (text: string, image?: string) => {
    if (!text.trim() && !image) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      imageAttachment: image,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isThinking: true,
    }));

    const startTime = Date.now();

    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || (image ? "Please analyze the uploaded image and advise on a repair plan." : ""),
          image,
          projectState: get().projectState,
          history: get().messages,
          useMock: get().useMockAI,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error ${response.status}`);
      }

      const data = await response.json();

      // Ensure loading animation shows for at least 2.8 seconds so user can experience the animation while agent fetches details
      const elapsed = Date.now() - startTime;
      const minLoadingDuration = 2800;
      if (elapsed < minLoadingDuration) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingDuration - elapsed));
      }

      set((state) => ({
        messages: [...state.messages, data.message],
        projectState: data.projectState || state.projectState,
        suggestedActions: data.suggestedActions || state.suggestedActions,
        isThinking: false,
        activeWorkspaceTab:
          data.projectState?.imageAnalysis && state.activeWorkspaceTab === "plan" && !state.projectState.imageAnalysis
            ? "analysis"
            : data.projectState?.shoppingList?.length > 0 && state.projectState.status === "discovering"
            ? "plan"
            : state.activeWorkspaceTab,
      }));
    } catch (error: any) {
      console.error("Error communicating with AI backend:", error);
      const elapsed = Date.now() - startTime;
      if (elapsed < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 2000 - elapsed));
      }
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Connection Note:** I ran into a temporary network hiccup connecting to the backend service. Make sure your local API server is running on port 5001 (\`npm run server\`).`,
        timestamp: new Date().toISOString(),
      };
      set((state) => ({
        messages: [...state.messages, errorMessage],
        isThinking: false,
      }));
    }
  },

  updateQuantity: (productId, delta) => {
    const state = get().projectState;
    const itemIndex = state.shoppingList.findIndex((item) => item.productId === productId);
    if (itemIndex === -1) return;

    const currentQty = state.shoppingList[itemIndex].quantity;
    const newQty = Math.max(1, currentQty + delta);

    const updatedList = [...state.shoppingList];
    updatedList[itemIndex] = { ...updatedList[itemIndex], quantity: newQty };

    // Recalculate subtotal locally or via API
    let newSubtotal = 0;
    for (const item of updatedList) {
      const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId);
      if (prod) {
        newSubtotal += prod.price * item.quantity;
      }
    }

    set({
      projectState: {
        ...state,
        shoppingList: updatedList,
        budget: {
          ...state.budget,
          currentTotal: newSubtotal,
          remaining:
            typeof state.budget.maximum === "number" && state.budget.maximum > 0
              ? state.budget.maximum - newSubtotal
              : null,
        },
      },
    });
  },

  removeItem: (productId) => {
    const state = get().projectState;
    const updatedList = state.shoppingList.filter((item) => item.productId !== productId);

    let newSubtotal = 0;
    for (const item of updatedList) {
      const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId);
      if (prod) {
        newSubtotal += prod.price * item.quantity;
      }
    }

    set({
      projectState: {
        ...state,
        shoppingList: updatedList,
        budget: {
          ...state.budget,
          currentTotal: newSubtotal,
          remaining:
            typeof state.budget.maximum === "number" && state.budget.maximum > 0
              ? state.budget.maximum - newSubtotal
              : null,
        },
      },
    });
  },

  openReplacementModal: async (item) => {
    const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId);
    if (!prod) return;

    // Find alternatives from MOCK_PRODUCTS matching category
    let alts = MOCK_PRODUCTS.filter((p) => p.id !== prod.id && p.category === prod.category);
    alts.sort((a, b) => Math.abs(a.price - prod.price) - Math.abs(b.price - prod.price));

    set({
      replacementModal: {
        isOpen: true,
        targetItem: item,
        alternatives: alts.slice(0, 4),
      },
    });
  },

  closeReplacementModal: () => {
    set({
      replacementModal: {
        isOpen: false,
        targetItem: null,
        alternatives: [],
      },
    });
  },

  replaceItem: (oldProductId, newProduct) => {
    const state = get().projectState;
    const itemIndex = state.shoppingList.findIndex((item) => item.productId === oldProductId);
    if (itemIndex === -1) return;

    const currentQty = state.shoppingList[itemIndex].quantity;
    const currentPriority = state.shoppingList[itemIndex].priority;

    const updatedList = [...state.shoppingList];
    updatedList[itemIndex] = {
      productId: newProduct.id,
      quantity: currentQty,
      priority: currentPriority,
      reason: `Swapped for ${newProduct.name} (₹${newProduct.price}) to optimize value and specifications.`,
    };

    // Update steps if they referenced the old item
    const updatedSteps = state.steps.map((s) => {
      if (s.relatedProductIds?.includes(oldProductId)) {
        return {
          ...s,
          relatedProductIds: s.relatedProductIds.map((id) => (id === oldProductId ? newProduct.id : id)),
        };
      }
      return s;
    });

    let newSubtotal = 0;
    for (const item of updatedList) {
      const prod = MOCK_PRODUCTS.find((p) => p.id === item.productId);
      if (prod) {
        newSubtotal += prod.price * item.quantity;
      }
    }

    set({
      projectState: {
        ...state,
        steps: updatedSteps,
        shoppingList: updatedList,
        budget: {
          ...state.budget,
          currentTotal: newSubtotal,
          remaining:
            typeof state.budget.maximum === "number" && state.budget.maximum > 0
              ? state.budget.maximum - newSubtotal
              : null,
        },
      },
      replacementModal: { isOpen: false, targetItem: null, alternatives: [] },
    });
  },

  resetSession: (scenario) => {
    if (!scenario || scenario === "blank") {
      set({
        messages: [INITIAL_MESSAGE],
        projectState: DEFAULT_PROJECT_STATE,
        suggestedActions: [
          "Set up a small balcony garden (₹8,000)",
          "First apartment essentials under ₹15,000",
          "How can I fix a loose cabinet hinge?",
          "Find cable organizer and desk tidy box",
        ],
        activeWorkspaceTab: "plan",
      });
      return;
    }

    // Trigger scenario via simulated first message
    let prompt = "";
    let image: string | undefined = undefined;

    if (scenario === "garden") {
      prompt = "I want to set up a small balcony garden. My budget is ₹8,000.";
    } else if (scenario === "apartment") {
      prompt = "I'm moving into my first apartment. Build me an essentials list under ₹15,000.";
    } else if (scenario === "hinge") {
      prompt = "How can I fix this loose cabinet hinge?";
      image = "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&q=80";
    } else if (scenario === "cables") {
      prompt = "I need the thing used to organize loose charging cables, but I don't know what it's called.";
    }

    set({
      messages: [INITIAL_MESSAGE],
      projectState: DEFAULT_PROJECT_STATE,
      activeWorkspaceTab: scenario === "hinge" ? "analysis" : "plan",
    });

    if (prompt) {
      get().sendMessage(prompt, image);
    }
  },
}));

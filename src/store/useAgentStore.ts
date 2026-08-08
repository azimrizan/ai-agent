import { create } from "zustand";
import type { ChatMessage } from "../types/agent.js";
import type { ProjectState, ShoppingListItem } from "../types/project.js";
import type { Product } from "../types/product.js";
import { MOCK_PRODUCTS } from "../data/mockProducts.js";

export interface CustomerProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  ordersCount?: number;
  city?: string;
  accessToken?: string;
}

interface AgentStoreState {
  messages: ChatMessage[];
  projectState: ProjectState;
  suggestedActions: string[];
  isThinking: boolean;
  activeWorkspaceTab: "analysis" | "plan" | "budget" | "stores";
  useMockAI: boolean;
  productsCatalog: Product[];
  customerProfile: CustomerProfile | null;
  isMobileChatOpen: boolean;
  hasUnreadReply: boolean;
  replacementModal: {
    isOpen: boolean;
    targetItem: ShoppingListItem | null;
    alternatives: Product[];
  };

  // Actions
  sendMessage: (text: string, image?: string) => Promise<void>;
  toggleMobileChat: (open?: boolean) => void;
  clearUnreadReply: () => void;
  setWorkspaceTab: (tab: "analysis" | "plan" | "budget" | "stores") => void;
  setUseMockAI: (useMock: boolean) => void;
  setCustomerProfile: (profile: CustomerProfile | null) => void;
  fetchProductsCatalog: () => Promise<void>;
  getProduct: (id: string) => Product | undefined;
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
  content: "Welcome to MR.PLUS. Tell me what you're looking for or building today, and I'll curate the best products for you.",
  timestamp: new Date().toISOString(),
};

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  messages: [INITIAL_MESSAGE],
  projectState: DEFAULT_PROJECT_STATE,
  suggestedActions: [
    "Pressure cookers & frypans",
    "Balcony garden setup",
    "First apartment essentials",
    "Cable management boxes",
  ],
  isThinking: false,
  activeWorkspaceTab: "plan",
  useMockAI: false,
  productsCatalog: MOCK_PRODUCTS,
  customerProfile: null,
  isMobileChatOpen: false,
  hasUnreadReply: false,
  replacementModal: {
    isOpen: false,
    targetItem: null,
    alternatives: [],
  },

  toggleMobileChat: (open?: boolean) => {
    set((state) => {
      const nextOpen = open !== undefined ? open : !state.isMobileChatOpen;
      return {
        isMobileChatOpen: nextOpen,
        hasUnreadReply: nextOpen ? false : state.hasUnreadReply,
      };
    });
  },

  clearUnreadReply: () => set({ hasUnreadReply: false }),

  setWorkspaceTab: (tab) => set({ activeWorkspaceTab: tab }),

  setUseMockAI: (useMock) => set({ useMockAI: useMock }),

  setCustomerProfile: (profile) => set({ customerProfile: profile }),

  fetchProductsCatalog: async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          set({ productsCatalog: data.products });
        }
      }
    } catch (error) {
      console.error("Error fetching products catalog from API:", error);
    }
  },

  getProduct: (id: string) => {
    const catalog = get().productsCatalog;
    let found = catalog.find((p) => p.id === id || p.sku === id || p.id.endsWith(id));
    if (!found) {
      found = MOCK_PRODUCTS.find((p) => p.id === id || p.sku === id || p.id.endsWith(id));
    }
    return found;
  },

  sendMessage: async (text: string, image?: string) => {
    if (!text.trim() && !image) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      imageAttachment: image,
    };

    // Auto-close mobile chat modal when prompt is submitted on mobile (<768px)
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    set((state) => ({
      messages: [...state.messages, userMessage],
      isThinking: true,
      isMobileChatOpen: isMobile ? false : state.isMobileChatOpen,
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
          customerProfile: get().customerProfile,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error ${response.status}`);
      }

      const data = await response.json();

      const elapsed = Date.now() - startTime;
      const minLoadingDuration = 3200; // Allow 3D robot GIF animation to complete its full 3.2s loop
      if (elapsed < minLoadingDuration) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingDuration - elapsed));
      }

      set((state) => ({
        messages: [...state.messages, data.message],
        projectState: data.projectState || state.projectState,
        suggestedActions: data.suggestedActions || state.suggestedActions,
        isThinking: false,
        hasUnreadReply: !state.isMobileChatOpen,
        activeWorkspaceTab:
          data.projectState?.imageAnalysis && state.activeWorkspaceTab === "plan" && !state.projectState.imageAnalysis
            ? "analysis"
            : data.projectState?.shoppingList?.length > 0 && state.projectState.status === "discovering"
            ? "plan"
            : state.activeWorkspaceTab,
      }));

      // Refresh products catalog after AI response
      get().fetchProductsCatalog();
    } catch (error: any) {
      console.error("Error communicating with AI backend:", error);
      const elapsed = Date.now() - startTime;
      if (elapsed < 1500) {
        await new Promise((resolve) => setTimeout(resolve, 1500 - elapsed));
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

    let newSubtotal = 0;
    for (const item of updatedList) {
      const prod = get().getProduct(item.productId);
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
      const prod = get().getProduct(item.productId);
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
    const currentProd = get().getProduct(item.productId);
    let alts: Product[] = [];

    try {
      const response = await fetch(`/api/products/${encodeURIComponent(item.productId)}/alternatives`);
      if (response.ok) {
        const data = await response.json();
        if (data.alternatives && Array.isArray(data.alternatives)) {
          alts = data.alternatives;
        }
      }
    } catch (error) {
      console.error("Error fetching alternatives from API:", error);
    }

    if (alts.length === 0 && currentProd) {
      const catalog = get().productsCatalog.length > 0 ? get().productsCatalog : MOCK_PRODUCTS;
      alts = catalog.filter((p) => p.id !== currentProd.id && p.category === currentProd.category);
      alts.sort((a, b) => Math.abs(a.price - currentProd.price) - Math.abs(b.price - currentProd.price));
    }

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
      const prod = get().getProduct(item.productId) || (item.productId === newProduct.id ? newProduct : null);
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
          "Show pressure cookers under ₹2,000",
          "Find non-stick frypans and appachatty",
          "Set up a small balcony garden (₹8,000)",
          "First apartment essentials under ₹15,000",
        ],
        activeWorkspaceTab: "plan",
      });
      return;
    }

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

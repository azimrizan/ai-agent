import { IntentType } from "./intentClassifier.js";

export interface ShoppingSession {
  sessionId: string;
  budget: number | null;
  room: string | null;
  category: string | null;
  selectedProducts: string[];
  rejectedProducts: string[];
  preferences: string[];
  language: "en" | "ml";
  conversationSummary: string;
  lastIntent: IntentType | null;
  updatedAt: number;
}

class SessionStore {
  private sessions = new Map<string, ShoppingSession>();

  public getOrCreateSession(sessionId: string = "default"): ShoppingSession {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        budget: null,
        room: null,
        category: null,
        selectedProducts: [],
        rejectedProducts: [],
        preferences: [],
        language: "en",
        conversationSummary: "",
        lastIntent: null,
        updatedAt: Date.now(),
      });
    }
    return this.sessions.get(sessionId)!;
  }

  public updateSession(sessionId: string, updates: Partial<ShoppingSession>): ShoppingSession {
    const current = this.getOrCreateSession(sessionId);
    const updated = {
      ...current,
      ...updates,
      updatedAt: Date.now(),
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }
}

export const sessionStore = new SessionStore();

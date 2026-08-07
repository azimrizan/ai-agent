import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AgentAnalyticsData {
  topSearchedTerms: Record<string, number>;
  unansweredQuestions: string[];
  mostRecommendedProducts: Record<string, number>;
  failedSearches: string[];
  imageUploads: number;
  budgetPlans: number;
  llmCalls: { groq: number; gemini: number };
  toolCalls: Record<string, number>;
  conversationsCompleted: number;
}

export class AnalyticsTracker {
  private data: AgentAnalyticsData = {
    topSearchedTerms: {},
    unansweredQuestions: [],
    mostRecommendedProducts: {},
    failedSearches: [],
    imageUploads: 0,
    budgetPlans: 0,
    llmCalls: { groq: 0, gemini: 0 },
    toolCalls: {},
    conversationsCompleted: 0,
  };

  private filePath = path.join(process.cwd(), "analytics_store.json");

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        this.data = JSON.parse(raw);
      }
    } catch (e) {
      // Ignore
    }
  }

  private saveTimeout: NodeJS.Timeout | null = null;

  public save() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      try {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
      } catch (e) {
        // Ignore
      }
    }, 5000);
  }

  public trackSearch(term: string, resultCount: number) {
    if (!term) return;
    this.data.topSearchedTerms[term] = (this.data.topSearchedTerms[term] || 0) + 1;
    if (resultCount === 0) {
      if (!this.data.failedSearches.includes(term)) {
        this.data.failedSearches.push(term);
      }
    }
    this.save();
  }

  public trackToolCall(toolName: string) {
    this.data.toolCalls[toolName] = (this.data.toolCalls[toolName] || 0) + 1;
    this.save();
  }

  public trackLlmCall(provider: "groq" | "gemini") {
    this.data.llmCalls[provider] = (this.data.llmCalls[provider] || 0) + 1;
    this.save();
  }

  public trackImageUpload() {
    this.data.imageUploads++;
    this.save();
  }

  public getSummary(): AgentAnalyticsData {
    return this.data;
  }
}

export const analyticsTracker = new AnalyticsTracker();

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RAGChunk {
  id: string;
  domain: string;
  title: string;
  content: string;
  confidence: number;
}

export class RAGService {
  private knowledgeDocs: RAGChunk[] = [];
  private isLoaded = false;

  constructor() {
    this.loadKnowledgeFiles();
  }

  private loadKnowledgeFiles() {
    try {
      const knowledgeDir = path.join(__dirname, "../data/knowledge");
      if (!fs.existsSync(knowledgeDir)) {
        return;
      }

      const files = fs.readdirSync(knowledgeDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const domain = file.replace(".json", "");
        const filePath = path.join(knowledgeDir, file);
        const raw = fs.readFileSync(filePath, "utf-8");
        const items = JSON.parse(raw);

        for (const item of items) {
          this.knowledgeDocs.push({
            id: item.id || `${domain}_${Math.random()}`,
            domain,
            title: item.question || item.topic || domain,
            content: item.answer || item.content || "",
            confidence: 0,
          });
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.warn("⚠️ RAGService knowledge files load warning:", err);
    }
  }

  public searchKnowledge(query: string, targetDomain?: string): RAGChunk[] {
    if (!this.isLoaded) {
      this.loadKnowledgeFiles();
    }

    const queryTerms = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (queryTerms.length === 0) return [];

    const scoredResults: RAGChunk[] = [];

    for (const doc of this.knowledgeDocs) {
      if (targetDomain && doc.domain !== targetDomain && targetDomain !== "all") {
        continue;
      }

      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      let matchCount = 0;
      let titleBonus = 0;

      for (const term of queryTerms) {
        if (titleLower.includes(term)) {
          matchCount++;
          titleBonus += 2;
        }
        if (contentLower.includes(term)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        // Calculate normalized confidence score (0.0 to 1.0)
        const totalMatches = matchCount + titleBonus;
        const confidence = Math.min(0.99, Number((totalMatches / (queryTerms.length * 3)).toFixed(2)));

        scoredResults.push({
          ...doc,
          confidence,
        });
      }
    }

    return scoredResults.sort((a, b) => b.confidence - a.confidence);
  }
}

export const ragService = new RAGService();

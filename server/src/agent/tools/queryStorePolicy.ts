import { ragService } from "../../services/rag.service.js";

export const queryStorePolicyTool = {
  name: "query_store_policy",
  description: "Search store knowledge base for shipping rates, Kerala delivery timelines, return policy, warranty terms, and FAQs.",
  parameters: {
    type: "OBJECT",
    properties: {
      question: { type: "STRING", description: "The policy or FAQ question to look up." },
      domain: { type: "STRING", description: "Optional policy domain: 'shipping', 'returns', 'warranty', 'faq', 'buying_guides', 'brand'." }
    },
    required: ["question"]
  },
  execute: async (args: { question: string; domain?: string }) => {
    const results = ragService.searchKnowledge(args.question, args.domain);
    const topResult = results[0];
    return {
      tool: "query_store_policy",
      success: results.length > 0,
      data: {
        results,
        bestMatch: topResult || null
      },
      confidence: topResult ? topResult.confidence : 0,
      source: "rag"
    };
  }
};

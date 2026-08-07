import { RAGChunk } from "../services/rag.service.js";

export function evaluateConfidence(
  query: string,
  ragResults: RAGChunk[]
): {
  topConfidence: number;
  shouldAskClarification: boolean;
  clarifyingOptions?: string[];
} {
  if (ragResults.length === 0) {
    return {
      topConfidence: 0.0,
      shouldAskClarification: true,
      clarifyingOptions: ["Pressure Cookers", "Non-Stick Cookware", "Soundbar Speakers", "Appachatty & Frypans"],
    };
  }

  const topConfidence = ragResults[0].confidence;

  if (topConfidence >= 0.85) {
    return { topConfidence, shouldAskClarification: false };
  } else if (topConfidence >= 0.5) {
    return { topConfidence, shouldAskClarification: false };
  } else {
    return {
      topConfidence,
      shouldAskClarification: true,
      clarifyingOptions: ["Shipping & Delivery", "Return & Refund Policy", "Product Warranty", "Payment Methods"],
    };
  }
}

export enum IntentType {
  GREETING = "GREETING",
  SIMPLE_SEARCH = "SIMPLE_SEARCH",
  PRICE_FILTER = "PRICE_FILTER",
  COLLECTION_BROWSE = "COLLECTION_BROWSE",
  POLICY_FAQ = "POLICY_FAQ",
  PRODUCT_DETAIL = "PRODUCT_DETAIL",
  BASKET_ADD = "BASKET_ADD",
  COMPARE = "COMPARE",
  PROJECT_PLAN = "PROJECT_PLAN",
  IMAGE_ANALYSIS = "IMAGE_ANALYSIS",
  CLARIFICATION = "CLARIFICATION",
}

export interface ClassifiedIntent {
  type: IntentType;
  query: string;
  extractedPrice?: number;
  extractedCategory?: string;
  isComplex: boolean;
}

export function parsePriceAndCleanQuery(text: string): { cleanQuery: string; extractedPrice?: number } {
  let extractedPrice: number | undefined = undefined;

  // Match formats like: under 2,000, under ₹5,000, under 5k, under 5.5k, below 10,000/-
  const priceRegex = /(?:under|below|less\s+than|max|within|budget|around)\s*₹?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lac|lakh)?/i;
  const match = text.match(priceRegex);

  if (match) {
    const rawNumStr = match[1].replace(/,/g, "");
    let num = parseFloat(rawNumStr);
    const unit = (match[2] || "").toLowerCase();

    if (unit === "k" || unit === "thousand") {
      num *= 1000;
    } else if (unit === "lac" || unit === "lakh") {
      num *= 100000;
    }

    if (!isNaN(num)) {
      extractedPrice = Math.round(num);
    }
  }

  // Clean prompt by removing price phrases like "under ₹2,000", "under 5k", "below 2,000"
  let cleanQuery = text
    .replace(/(?:under|below|less\s+than|max|within|budget|around)\s*₹?\s*[\d,]+(?:\.\d+)?\s*(k|thousand|lac|lakh)?/gi, "")
    .replace(/₹\s*[\d,]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Strip conversational prefix phrases
  cleanQuery = cleanQuery
    .replace(/^(?:show\s+me|find\s+me|get\s+me|give\s+me|i\s+want|looking\s+for|search\s+for)\s+/i, "")
    .trim();

  return { cleanQuery: cleanQuery || text, extractedPrice };
}

export function classifyIntent(userMessage: string, hasImage: boolean = false): ClassifiedIntent {
  const rawText = userMessage.trim();
  const textLower = rawText.toLowerCase();

  if (hasImage) {
    return { type: IntentType.IMAGE_ANALYSIS, query: textLower, isComplex: true };
  }

  // 1. GREETING
  if (/^(hi|hello|hey|hey\s+there|good\s+morning|good\s+afternoon|good\s+evening|namaste|greetings|hlo|hola)\s*[\.!\?]*$/i.test(textLower)) {
    return { type: IntentType.GREETING, query: textLower, isComplex: false };
  }

  // 2. POLICY / FAQ
  if (
    /return|refund|exchange|shipping|delivery|dispatch|courier|kerala|warranty|guarantee|payment|cod|upi|store\s+location|hours/i.test(textLower) &&
    !/buy|add\s+to\s+cart|cooker|soundbar|price/i.test(textLower)
  ) {
    return { type: IntentType.POLICY_FAQ, query: textLower, isComplex: false };
  }

  // 3. COMPARE
  if (/compare|versus|\bvs\b|difference\s+between/i.test(textLower)) {
    return { type: IntentType.COMPARE, query: textLower, isComplex: true };
  }

  const { cleanQuery, extractedPrice } = parsePriceAndCleanQuery(textLower);

  // 4. PROJECT PLAN / BUDGET PLANNER
  if (/build\s+me|set\s+up|full\s+setup|apartment|renovate|project|essential\s+kit/i.test(textLower) && textLower.length > 20) {
    return {
      type: IntentType.PROJECT_PLAN,
      query: cleanQuery,
      extractedPrice,
      isComplex: true,
    };
  }

  // 5. PRICE FILTER
  if (extractedPrice !== undefined) {
    return {
      type: IntentType.PRICE_FILTER,
      query: cleanQuery,
      extractedPrice,
      isComplex: false,
    };
  }

  // 6. COLLECTION BROWSE
  if (/cookware|appliances|speakers|soundbars|pressure\s+cooker|frypan|appachatty/i.test(cleanQuery) && cleanQuery.length < 25) {
    return { type: IntentType.COLLECTION_BROWSE, query: cleanQuery, isComplex: false };
  }

  // Default to SIMPLE_SEARCH
  return { type: IntentType.SIMPLE_SEARCH, query: cleanQuery, isComplex: false };
}

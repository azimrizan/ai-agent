import { Product } from "../schemas/product.schema.js";

export interface RankedProductScore {
  product: Product;
  score: number;
  factors: {
    exactKeywordMatch: number;
    collectionRelevance: number;
    tagMatch: number;
    availability: number;
    priceWithinBudget: number;
    recentlyAdded: number;
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rankProducts(
  products: Product[],
  query: string = "",
  maxBudget?: number
): Product[] {
  const queryLower = query.toLowerCase().trim();
  const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

  const scored: RankedProductScore[] = products.map((product) => {
    const titleLower = (product.name || product.title || "").toLowerCase();
    const descLower = (product.description || "").toLowerCase();
    const catLower = (product.category || "").toLowerCase();
    const tagsLower = (product.tags || []).map((t) => t.toLowerCase());

    // 1. Exact keyword match (0.0 to 1.0)
    let keywordHits = 0;
    const fullTextNoSpaces = `${titleLower}${descLower}${catLower}`.replace(/\s+/g, "");
    const rawQueryNoSpaces = queryLower.replace(/\s+/g, "");
    const isDirectMatch = rawQueryNoSpaces.length > 2 && fullTextNoSpaces.includes(rawQueryNoSpaces);

    for (const term of queryTerms) {
      const escaped = escapeRegex(term);
      const reg = new RegExp(`\\b${escaped}\\b`, "i");
      if (reg.test(titleLower)) keywordHits += 2;
      if (reg.test(descLower)) keywordHits += 1;
    }
    if (isDirectMatch) keywordHits += 3;

    const exactKeywordMatch = queryTerms.length > 0 ? Math.min(1.0, keywordHits / (queryTerms.length * 2)) : 0.5;

    // 2. Collection relevance (0.0 to 1.0)
    const collectionRelevance = queryTerms.some((t) => new RegExp(`\\b${escapeRegex(t)}\\b`, "i").test(catLower)) ? 1.0 : 0.0;

    // 3. Tag match (0.0 to 1.0)
    const tagMatch = queryTerms.some((t) => tagsLower.some((tag) => new RegExp(`\\b${escapeRegex(t)}\\b`, "i").test(tag))) ? 1.0 : 0.0;

    // 4. Availability (1.0 if in stock, 0.3 if out of stock)
    const availability = product.stockStatus === "in_stock" || product.inStock ? 1.0 : 0.3;

    // 5. Price within budget (1.0 if <= budget, penalized otherwise)
    let priceWithinBudget = 1.0;
    if (maxBudget && maxBudget > 0) {
      if (product.price <= maxBudget) {
        priceWithinBudget = 1.0;
      } else {
        priceWithinBudget = Math.max(0.1, 1 - (product.price - maxBudget) / maxBudget);
      }
    }

    // 6. Recently added bonus (0.5 to 1.0)
    const recentlyAdded = product.inStock ? 0.8 : 0.5;

    let score = 0;
    if (queryTerms.length > 0 && keywordHits === 0 && collectionRelevance === 0 && tagMatch === 0) {
      score = 0;
    } else {
      score =
        exactKeywordMatch * 0.45 +
        collectionRelevance * 0.2 +
        tagMatch * 0.15 +
        priceWithinBudget * 0.05 +
        recentlyAdded * 0.05;
    }
    return {
      product,
      score: Number(score.toFixed(3)),
      factors: {
        exactKeywordMatch,
        collectionRelevance,
        tagMatch,
        availability,
        priceWithinBudget,
        recentlyAdded,
      },
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.product);
}

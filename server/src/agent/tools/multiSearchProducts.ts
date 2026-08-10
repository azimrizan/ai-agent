import { productRepository } from "../../repositories/product.repository.js";

export interface SingleSearchSpec {
  query?: string;
  category?: string;
  maxPrice?: number;
  tags?: string[];
  limit?: number;
}

export const multiSearchProductsTool = {
  name: "multi_search_products",
  description: "Perform multiple catalog searches in parallel for combo/bundle requests (e.g. searching for both TV and kitchen appliances under a total budget).",
  parameters: {
    type: "OBJECT",
    properties: {
      searches: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING", description: "Search keyword (e.g. 'tv', 'air fryer', 'pressure cooker')" },
            category: { type: "STRING", description: "Filter category" },
            maxPrice: { type: "NUMBER", description: "Category specific max price budget in INR" },
            limit: { type: "NUMBER", description: "Max results to return (default 5)" }
          }
        },
        description: "List of parallel product search specifications"
      }
    },
    required: ["searches"]
  },
  execute: async (args: { searches: SingleSearchSpec[] }) => {
    const results: Record<string, any[]> = {};
    if (!args.searches || !Array.isArray(args.searches)) {
      return { searches: results };
    }

    for (const spec of args.searches) {
      const key = spec.query || spec.category || "general";
      const maxPriceNum = spec.maxPrice !== undefined && spec.maxPrice !== null && (spec.maxPrice as any) !== ""
        ? Number(String(spec.maxPrice).replace(/[^0-9.]/g, ""))
        : undefined;

      const limitNum = spec.limit !== undefined && spec.limit !== null && (spec.limit as any) !== ""
        ? Number(String(spec.limit).replace(/[^0-9]/g, ""))
        : undefined;


      const products = await productRepository.searchProductsAsync({
        query: spec.query,
        category: spec.category,
        maxPrice: isNaN(maxPriceNum as number) ? undefined : maxPriceNum,
        tags: spec.tags,
        limit: isNaN(limitNum as number) ? 5 : limitNum
      });
      results[key] = products;
    }

    return { searches: results };
  }
};


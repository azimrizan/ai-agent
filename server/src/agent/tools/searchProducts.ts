import { productRepository } from "../../repositories/product.repository.js";

export const searchProductsTool = {
  name: "search_products",
  description: "Search the retailer's product catalog by query, category, maximum price, or tags. Always use this to discover real products before making recommendations.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: { type: "STRING", description: "Search keywords matching product title, use cases, or description (e.g. 'balcony planter', 'cordless drill', 'hinge')" },
      category: { type: "STRING", description: "Filter by category (e.g. 'Gardening', 'Tools', 'Hardware', 'Storage', 'Kitchen', 'Bathroom', 'Electrical', 'Household')" },
      maxPrice: { type: "NUMBER", description: "Maximum price filter in INR (₹)" },
      tags: { type: "ARRAY", items: { type: "STRING" }, description: "Tags to match (e.g. ['balcony', 'outdoor', 'essential'])" },
      limit: { type: "NUMBER", description: "Max number of products to return (default 10)" }
    }
  },
  execute: async (args: { query?: string; category?: string; maxPrice?: number | string; tags?: string[]; limit?: number | string }) => {
    const maxPriceNum = args.maxPrice !== undefined && args.maxPrice !== null && args.maxPrice !== ""
      ? Number(String(args.maxPrice).replace(/[^0-9.]/g, ""))
      : undefined;

    const limitNum = args.limit !== undefined && args.limit !== null && args.limit !== ""
      ? Number(String(args.limit).replace(/[^0-9]/g, ""))
      : undefined;

    const products = await productRepository.searchProductsAsync({
      query: args.query,
      category: args.category,
      maxPrice: isNaN(maxPriceNum as number) ? undefined : maxPriceNum,
      tags: args.tags,
      limit: isNaN(limitNum as number) ? undefined : limitNum
    });
    return { products };
  }
};


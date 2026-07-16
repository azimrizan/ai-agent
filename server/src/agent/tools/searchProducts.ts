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
  execute: async (args: { query?: string; category?: string; maxPrice?: number; tags?: string[]; limit?: number }) => {
    const products = productRepository.searchProducts(args);
    return { products };
  }
};

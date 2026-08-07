import { productRepository } from "../../repositories/product.repository.js";

export const searchByTagsTool = {
  name: "search_by_tags",
  description: "Filter products matching specific tags (e.g. ['induction', 'non-stick', 'essential', 'bluetooth']).",
  parameters: {
    type: "OBJECT",
    properties: {
      tags: { type: "ARRAY", items: { type: "STRING" }, description: "List of tags to filter by." }
    },
    required: ["tags"]
  },
  execute: async (args: { tags: string[] }) => {
    const products = await productRepository.searchProductsAsync({ tags: args.tags, limit: 10 });
    return {
      tool: "search_by_tags",
      success: true,
      data: { products, tags: args.tags },
      count: products.length,
      source: "shopify_cache"
    };
  }
};

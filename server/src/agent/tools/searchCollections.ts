import { productRepository } from "../../repositories/product.repository.js";

export const searchCollectionsTool = {
  name: "search_collections",
  description: "Browse products grouped under a specific collection or category name.",
  parameters: {
    type: "OBJECT",
    properties: {
      collectionName: { type: "STRING", description: "Collection or category name (e.g., 'Cookware', 'Pressure Cooker', 'Soundbar Speakers', 'Appachatty & Frypans')" }
    },
    required: ["collectionName"]
  },
  execute: async (args: { collectionName: string }) => {
    const products = await productRepository.searchProductsAsync({ category: args.collectionName, limit: 12 });
    return {
      tool: "search_collections",
      success: true,
      data: { products, collectionName: args.collectionName },
      count: products.length,
      source: "shopify_cache"
    };
  }
};

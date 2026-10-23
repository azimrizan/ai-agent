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
    const colResult = await productRepository.searchCollectionsAsync(args.collectionName);
    const collectionUrl = colResult.collection?.url || `https://mrplus.in/collections/${encodeURIComponent(args.collectionName.toLowerCase().replace(/\s+/g, "-"))}`;

    return {
      tool: "search_collections",
      success: true,
      data: {
        collectionName: colResult.collection?.title || args.collectionName,
        collectionUrl,
        products: colResult.products,
      },
      count: colResult.products.length,
      source: "shopify_cache"
    };
  }
};


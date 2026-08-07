import { productRepository } from "../../repositories/product.repository.js";

import { ProductVariant } from "../../schemas/product.schema.js";

export const getVariantsTool = {
  name: "get_variants",
  description: "Get all variant options (size, capacity, color) and stock status for a given product ID.",
  parameters: {
    type: "OBJECT",
    properties: {
      productId: { type: "STRING", description: "Product GID or ID" }
    },
    required: ["productId"]
  },
  execute: async (args: { productId: string }) => {
    const product = await productRepository.getProductByIdAsync(args.productId);
    if (!product) {
      return { tool: "get_variants", success: false, data: { variants: [] }, source: "shopify_cache" };
    }
    const variants = (product.variants || []).map((v: ProductVariant) => ({
      id: v.id,
      title: v.title,
      price: v.price,
      available: v.availableForSale,
    }));
    return {
      tool: "get_variants",
      success: true,
      data: { productId: args.productId, productTitle: product.title, variants },
      source: "shopify_cache"
    };
  }
};

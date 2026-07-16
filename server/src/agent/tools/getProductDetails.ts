import { productRepository } from "../../repositories/product.repository.js";

export const getProductDetailsTool = {
  name: "get_product_details",
  description: "Get full specifications, use cases, stock status, and compatibility details for a specific product ID.",
  parameters: {
    type: "OBJECT",
    properties: {
      productId: { type: "STRING", description: "The unique product ID or SKU (e.g. 'prod_gard_001')" }
    },
    required: ["productId"]
  },
  execute: async (args: { productId: string }) => {
    const product = productRepository.getProductById(args.productId);
    return { product };
  }
};

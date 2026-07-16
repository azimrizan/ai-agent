import { productRepository } from "../../repositories/product.repository.js";

export const checkCompatibilityTool = {
  name: "check_product_compatibility",
  description: "Check if selected products are technically and practically compatible with each other for a DIY or home project.",
  parameters: {
    type: "OBJECT",
    properties: {
      productIds: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Array of product IDs to check for compatibility"
      }
    },
    required: ["productIds"]
  },
  execute: async (args: { productIds: string[] }) => {
    return productRepository.checkCompatibility(args.productIds);
  }
};

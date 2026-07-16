import { productRepository } from "../../repositories/product.repository.js";

export const findAlternativesTool = {
  name: "find_product_alternatives",
  description: "Find alternative products for a given product ID based on budget constraint ('cheaper'), upgrade target ('premium'), or functional equivalent ('similar').",
  parameters: {
    type: "OBJECT",
    properties: {
      productId: { type: "STRING", description: "The ID of the product to find alternatives for" },
      targetPrice: { type: "NUMBER", description: "Target maximum price ceiling if looking for budget options" },
      reason: { type: "STRING", enum: ["cheaper", "premium", "similar"], description: "Why alternatives are being requested" }
    },
    required: ["productId"]
  },
  execute: async (args: { productId: string; targetPrice?: number; reason?: "cheaper" | "premium" | "similar" }) => {
    const alternatives = productRepository.findAlternatives(args);
    return { alternatives };
  }
};

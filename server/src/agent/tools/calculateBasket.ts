import { productRepository } from "../../repositories/product.repository.js";

export const calculateBasketTool = {
  name: "calculate_basket",
  description: "Calculate total cost, item count, and remaining budget for a list of shopping basket items and quantities.",
  parameters: {
    type: "OBJECT",
    properties: {
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            productId: { type: "STRING" },
            quantity: { type: "NUMBER" }
          },
          required: ["productId", "quantity"]
        },
        description: "List of items with productId and quantity"
      },
      budgetMaximum: { type: "NUMBER", description: "Optional max budget ceiling in INR to calculate remaining margin" }
    },
    required: ["items"]
  },
  execute: async (args: { items: { productId: string; quantity: number }[]; budgetMaximum?: number }) => {
    return productRepository.calculateBasket(args.items, args.budgetMaximum);
  }
};

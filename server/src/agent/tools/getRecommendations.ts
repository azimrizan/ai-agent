import { productRepository } from "../../repositories/product.repository.js";
import { recommendProducts } from "../recommender.js";

export const getRecommendationsTool = {
  name: "get_recommendations",
  description: "Get smart recommendations based on a target product using category, tags, and price similarity.",
  parameters: {
    type: "OBJECT",
    properties: {
      productId: { type: "STRING", description: "Target product GID or ID to base recommendations on." }
    },
    required: ["productId"]
  },
  execute: async (args: { productId: string }) => {
    const targetProduct = await productRepository.getProductByIdAsync(args.productId);
    if (!targetProduct) {
      return { tool: "get_recommendations", success: false, data: { products: [] }, source: "recommender" };
    }

    const allProducts = await productRepository.searchProductsAsync({ limit: 40 });
    const recommendations = recommendProducts(targetProduct, allProducts, 4);

    return {
      tool: "get_recommendations",
      success: true,
      data: { targetProduct, recommendations },
      count: recommendations.length,
      source: "recommender"
    };
  }
};

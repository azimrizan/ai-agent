import { productRepository } from "../../repositories/product.repository.js";

export const findStoresTool = {
  name: "find_nearby_stores",
  description: "Find nearby physical retail stores that carry required products based on customer location or postal code.",
  parameters: {
    type: "OBJECT",
    properties: {
      location: { type: "STRING", description: "City or neighborhood name (e.g. 'Indiranagar', 'Bengaluru')" },
      postalCode: { type: "STRING", description: "6-digit postal PIN code (e.g. '560038')" },
      requiredProductIds: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "Array of product IDs needed in stock at the store"
      }
    }
  },
  execute: async (args: { location?: string; postalCode?: string; requiredProductIds?: string[] }) => {
    const stores = productRepository.findStores(args);
    return { stores };
  }
};

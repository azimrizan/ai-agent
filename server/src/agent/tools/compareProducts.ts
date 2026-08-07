import { productRepository } from "../../repositories/product.repository.js";
import { Product } from "../../schemas/product.schema.js";

export const compareProductsTool = {
  name: "compare_products",
  description: "Generate a side-by-side specification, pricing, and feature matrix for 2 or 3 products.",
  parameters: {
    type: "OBJECT",
    properties: {
      productIds: { type: "ARRAY", items: { type: "STRING" }, description: "Array of 2 to 3 product GIDs or IDs to compare." }
    },
    required: ["productIds"]
  },
  execute: async (args: { productIds: string[] }) => {
    const products: Product[] = [];
    for (const id of args.productIds.slice(0, 3)) {
      const p = await productRepository.getProductByIdAsync(id);
      if (p) products.push(p);
    }

    const specMatrix = products.map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
      inStock: p.inStock,
      tags: p.tags,
      descriptionSnippet: (p.description || "").slice(0, 120),
    }));

    return {
      tool: "compare_products",
      success: products.length > 0,
      data: { products, specMatrix },
      count: products.length,
      source: "shopify_cache"
    };
  }
};

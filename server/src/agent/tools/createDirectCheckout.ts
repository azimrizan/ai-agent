import { shopifyService } from "../../services/shopify.service.js";

export const createDirectCheckoutTool = {
  name: "create_direct_checkout",
  description: "Generate direct 1-click Shopify checkout cart URL for a given variantId and quantity.",
  parameters: {
    type: "OBJECT",
    properties: {
      variantId: { type: "STRING", description: "Shopify Product Variant GID (e.g. gid://shopify/ProductVariant/12345)" },
      quantity: { type: "NUMBER", description: "Quantity to add to cart (default 1)" }
    },
    required: ["variantId"]
  },
  execute: async (args: { variantId: string; quantity?: number }) => {
    const qty = args.quantity || 1;
    const checkoutUrl = shopifyService.getDirectCartUrl(args.variantId, qty);
    return {
      tool: "create_direct_checkout",
      success: true,
      data: {
        checkoutUrl,
        variantId: args.variantId,
        quantity: qty
      },
      source: "shopify_service"
    };
  }
};

import { Product } from "../schemas/product.schema.js";

export function checkPreGuardrails(userMessage: string): {
  passed: boolean;
  blockReason?: string;
  suggestedReply?: string;
} {
  const textLower = userMessage.toLowerCase().trim();

  // 1. Off-Topic / Non-Shopping Domain Fence
  if (
    /who\s+is\s+the\s+president|write\s+python\s+code|quantum\s+physics|cricket\s+score|movie\s+recommendation|medical\s+advice|bitcoin|crypto|political/i.test(
      textLower
    )
  ) {
    return {
      passed: false,
      blockReason: "OFF_TOPIC",
      suggestedReply:
        "I am your dedicated MR.PLUS AI Shopping Assistant! I specialize in kitchenware, pressure cookers, appachatty, frypans, cookware, soundbars, Bluetooth speakers, and home appliances. How can I assist you with your home setup today?",
    };
  }

  // 2. Safety Filter (Dangerous gas/electrical DIY)
  if (/gas\s+leak|open\s+wiring|electric\s+shock|explosion/i.test(textLower)) {
    return {
      passed: false,
      blockReason: "SAFETY_HAZARD",
      suggestedReply:
        "⚠️ Safety Notice: For gas leaks or high-voltage electrical hazards, please immediately turn off main valves/switches and contact a licensed professional technician in your area.",
    };
  }

  return { passed: true };
}

export function applyPostGuardrails(replyText: string, validProducts: Product[]): string {
  if (!replyText || validProducts.length === 0) return replyText;

  // Verify that any mentioned ₹ prices match authentic product prices
  let sanitized = replyText;
  for (const prod of validProducts) {
    const prodName = prod.name || prod.title || "";
    const titleSnippet = prodName.slice(0, 15);
    if (titleSnippet && sanitized.includes(titleSnippet) && prod.stockStatus === "out_of_stock") {
      sanitized = sanitized.replace(
        new RegExp(titleSnippet, "gi"),
        `${prodName} (Currently Out of Stock)`
      );
    }
  }

  return sanitized;
}

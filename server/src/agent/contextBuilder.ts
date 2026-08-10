import { Product } from "../schemas/product.schema.js";
import { ShoppingSession } from "./sessionStore.js";

export function buildCompressedContext(
  userMessage: string,
  products: Product[] = [],
  session: ShoppingSession,
  customerProfile?: any,
  additionalKnowledge?: string
): string {
  let customerContext = "";
  if (customerProfile && (customerProfile.firstName || customerProfile.email)) {
    customerContext = `Customer Profile: Name: ${customerProfile.firstName || ""} ${customerProfile.lastName || ""}, Email: ${customerProfile.email || ""}, Orders: ${customerProfile.ordersCount || 0}.`;
  }

  let sessionContext = "";
  if (session.budget || session.category || session.preferences.length > 0) {
    sessionContext = `Active Session: Budget: ₹${session.budget || "Unset"}, Category: ${session.category || "General"}, Preferences: [${session.preferences.join(", ")}].`;
  }

  // Compress product listings (top 6 max, 40-word max description each)
  let productsContext = "";
  if (products.length > 0) {
    const compactList = products.slice(0, 12).map((p) => {

      const shortDesc = (p.description || "").slice(0, 150).replace(/\n/g, " ");
      return `- [ID: ${p.id}] ${p.title} | Price: ₹${p.price} | Stock: ${p.inStock ? "In Stock" : "Out of Stock"} | ${shortDesc}`;
    });
    productsContext = `Available Store Catalog Items:\n${compactList.join("\n")}`;
  }

  let knowledgeContext = "";
  if (additionalKnowledge) {
    knowledgeContext = `Official Knowledge Base Info:\n${additionalKnowledge}`;
  }

  return `System Context:
You are MR.PLUS AI Shopping Assistant for shop.mrplus.in (Kerala's premier AI shopping experience).
${customerContext}
${sessionContext}

${knowledgeContext}

${productsContext}

User Prompt: "${userMessage}"
Instructions: Respond concisely, recommend real products listed above with prices in ₹ (INR), and keep advice friendly and helpful.`;
}

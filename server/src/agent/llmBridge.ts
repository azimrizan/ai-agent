import { resolveProductIntent, filterDomainProducts } from "./queryRewriter.js";
import { rankProducts } from "./ranker.js";
import { searchProductsTool } from "./tools/searchProducts.js";
import { productRepository } from "../repositories/product.repository.js";

export class LlmBridge {
  public async preFetchProducts(userMessage: string, extractedPrice?: number): Promise<any[]> {
    try {
      const searchSpecs = resolveProductIntent(userMessage, extractedPrice);
      console.log(`🔍 [LlmBridge] Pre-fetching products for specs:`, searchSpecs);
      const foundProducts: any[] = [];

      for (const spec of searchSpecs) {
        const res = await searchProductsTool.execute({
          query: spec.query,
          maxPrice: spec.maxPrice || extractedPrice,
          limit: 10
        });

        if (res.products && res.products.length > 0) {
          foundProducts.push(...res.products);
        }
      }

      // Check if user is asking for a specific store collection (e.g. "monsoon sale")
      const colResult = await productRepository.searchCollectionsAsync(userMessage);
      if (colResult.products && colResult.products.length > 0) {
        console.log(`🏷️ [LlmBridge] Matched collection "${colResult.collection?.title || userMessage}" with ${colResult.products.length} products.`);
        foundProducts.push(...colResult.products);
      }

      if (foundProducts.length === 0) {
        console.log(`ℹ️ [LlmBridge] No specific catalog products or collections matched query.`);
        return [];
      }



      // Deduplicate
      const uniqueMap = new Map<string, any>();
      for (const p of foundProducts) {
        if (!uniqueMap.has(p.id)) {
          uniqueMap.set(p.id, p);
        }
      }
      let uniqueProducts = Array.from(uniqueMap.values());

      // Domain filtering
      uniqueProducts = filterDomainProducts(userMessage, uniqueProducts);

      // Ranking & budget filtering
      let ranked = rankProducts(uniqueProducts, userMessage, extractedPrice);
      if (extractedPrice) {
        ranked = ranked.filter((p) => p.price <= extractedPrice);
      }

      const topResult: any = ranked.slice(0, 12);

      if (colResult.collection) {
        topResult.matchedCollection = {
          title: colResult.collection.title,
          handle: colResult.collection.handle,
          url: colResult.collection.url || `https://shop.mrplus.in/collections/${colResult.collection.handle}`,
        };
      }
      console.log(`📦 [LlmBridge] Pre-fetched ${topResult.length} matching products for LLM context.`);
      return topResult;
    } catch (error) {
      console.warn("⚠️ Pre-fetch products failed silently:", error);
      return [];
    }
  }
}



export const llmBridge = new LlmBridge();

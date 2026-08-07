import { Product } from "../schemas/product.schema.js";

export function recommendProducts(
  targetProduct: Product,
  allProducts: Product[],
  limit: number = 4
): Product[] {
  const targetCategory = targetProduct.category;
  const targetPrice = targetProduct.price;
  const targetTags = targetProduct.tags || [];

  const candidates = allProducts.filter((p) => p.id !== targetProduct.id);

  const scored = candidates.map((p) => {
    let score = 0;

    // 1. Same category
    if (p.category === targetCategory) score += 40;

    // 2. Matching tags
    const commonTags = (p.tags || []).filter((t) => targetTags.includes(t));
    score += commonTags.length * 15;

    // 3. Similar price range (+/- 25%)
    const priceDiffRatio = Math.abs(p.price - targetPrice) / targetPrice;
    if (priceDiffRatio <= 0.25) {
      score += 30;
    } else if (priceDiffRatio <= 0.5) {
      score += 15;
    }

    // 4. In stock bonus
    if (p.inStock) score += 10;

    return { product: p, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.product);
}

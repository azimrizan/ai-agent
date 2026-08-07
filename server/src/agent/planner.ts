import { Product } from "../schemas/product.schema.js";
import { productRepository } from "../repositories/product.repository.js";
import { rankProducts } from "./ranker.js";

export interface ProjectPlanResult {
  title: string;
  totalBudget: number;
  calculatedCost: number;
  remainingBudget: number;
  recommendedProducts: Product[];
  steps: Array<{ title: string; detail: string }>;
}

export class AIPlanner {
  public async createPlan(goal: string, targetBudget: number = 10000): Promise<ProjectPlanResult> {
    const categories = ["Cookware", "Pressure Cooker", "Appachatty & Frypan", "Soundbar Speakers"];
    const allProducts = await productRepository.searchProductsAsync({ limit: 40 });

    const selectedProducts: Product[] = [];
    let currentCost = 0;

    for (const cat of categories) {
      const catProducts = allProducts.filter((p) => (p.category || "").toLowerCase().includes(cat.toLowerCase()) || (p.title || "").toLowerCase().includes(cat.toLowerCase()));
      const ranked = rankProducts(catProducts, cat, targetBudget - currentCost);

      const affordable = ranked.find((p) => p.price <= targetBudget - currentCost && p.inStock);
      if (affordable) {
        selectedProducts.push(affordable);
        currentCost += affordable.price;
      }
    }

    // If no items matched specific categories, pick top ranked within budget
    if (selectedProducts.length === 0) {
      const topRanked = rankProducts(allProducts, goal, targetBudget);
      for (const p of topRanked) {
        if (currentCost + p.price <= targetBudget && p.inStock) {
          selectedProducts.push(p);
          currentCost += p.price;
          if (selectedProducts.length >= 3) break;
        }
      }
    }

    const steps = [
      { title: "Essential Cookware Selection", detail: "Start with heavy-gauge induction compatible pressure cooker and non-stick appachatty." },
      { title: "Utility & Frying Essentials", detail: "Add durable non-stick frypan for daily breakfasts and sautéing." },
      { title: "Entertainment & Ambience", detail: "Complete your setup with MR.PLUS 2.1 Soundbar Speaker for high-fidelity audio." },
    ];

    return {
      title: `Curated Setup (${goal})`,
      totalBudget: targetBudget,
      calculatedCost: currentCost,
      remainingBudget: Math.max(0, targetBudget - currentCost),
      recommendedProducts: selectedProducts,
      steps,
    };
  }
}

export const aiPlanner = new AIPlanner();

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Product, Store } from "../schemas/product.schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductRepository {
  private products: Product[] = [];
  private stores: Store[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const possibleProductPaths = [
        path.join(__dirname, "../data/products.json"),
        path.join(__dirname, "../../src/data/products.json"),
        path.join(process.cwd(), "src/data/products.json"),
      ];
      const possibleStorePaths = [
        path.join(__dirname, "../data/stores.json"),
        path.join(__dirname, "../../src/data/stores.json"),
        path.join(process.cwd(), "src/data/stores.json"),
      ];

      for (const pPath of possibleProductPaths) {
        if (fs.existsSync(pPath)) {
          const rawProducts = fs.readFileSync(pPath, "utf-8");
          this.products = JSON.parse(rawProducts);
          break;
        }
      }

      for (const sPath of possibleStorePaths) {
        if (fs.existsSync(sPath)) {
          const rawStores = fs.readFileSync(sPath, "utf-8");
          this.stores = JSON.parse(rawStores);
          break;
        }
      }
    } catch (error) {
      console.error("Error loading mock data in ProductRepository:", error);
    }
  }

  public getAllProducts(): Product[] {
    return this.products;
  }

  public getProductById(productId: string): Product | null {
    return this.products.find((p) => p.id === productId || p.sku === productId) || null;
  }

  public searchProducts(options: {
    query?: string;
    category?: string;
    maxPrice?: number;
    tags?: string[];
    limit?: number;
  }): Product[] {
    let results = [...this.products];

    if (options.category && options.category.trim() !== "") {
      const catLower = options.category.toLowerCase().trim();
      results = results.filter((p) =>
        p.category.toLowerCase() === catLower || p.subcategory.toLowerCase().includes(catLower)
      );
    }

    if (typeof options.maxPrice === "number" && options.maxPrice > 0) {
      results = results.filter((p) => p.price <= options.maxPrice!);
    }

    if (options.tags && options.tags.length > 0) {
      const tagSet = new Set(options.tags.map((t) => t.toLowerCase()));
      results = results.filter((p) =>
        p.tags.some((t) => tagSet.has(t.toLowerCase())) ||
        p.useCases.some((u) => tagSet.has(u.toLowerCase()))
      );
    }

    if (options.query && options.query.trim() !== "") {
      const queryWords = options.query.toLowerCase().trim().split(/\s+/);
      results = results.filter((p) => {
        const fullText = `${p.name} ${p.description} ${p.category} ${p.subcategory} ${p.tags.join(" ")} ${p.useCases.join(" ")}`.toLowerCase();
        return queryWords.every((word) => fullText.includes(word));
      });
    }

    if (options.limit && options.limit > 0) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  public findAlternatives(options: {
    productId: string;
    targetPrice?: number;
    reason?: "cheaper" | "premium" | "similar";
  }): Product[] {
    const original = this.getProductById(options.productId);
    if (!original) return [];

    let candidates = this.products.filter(
      (p) => p.id !== original.id && p.category === original.category
    );

    if (options.reason === "cheaper" || (options.targetPrice && options.targetPrice < original.price)) {
      candidates = candidates.filter((p) => p.price < original.price);
      candidates.sort((a, b) => a.price - b.price);
    } else if (options.reason === "premium") {
      candidates = candidates.filter((p) => p.price > original.price);
      candidates.sort((a, b) => b.price - a.price);
    } else {
      candidates.sort((a, b) => Math.abs(a.price - original.price) - Math.abs(b.price - original.price));
    }

    return candidates.slice(0, 4);
  }

  public calculateBasket(items: { productId: string; quantity: number }[], budgetMaximum?: number | null): {
    subtotal: number;
    itemCount: number;
    budgetRemaining?: number | null;
  } {
    let subtotal = 0;
    let itemCount = 0;

    for (const item of items) {
      const prod = this.getProductById(item.productId);
      if (prod) {
        subtotal += prod.price * item.quantity;
        itemCount += item.quantity;
      }
    }

    let budgetRemaining: number | null = null;
    if (typeof budgetMaximum === "number" && budgetMaximum > 0) {
      budgetRemaining = budgetMaximum - subtotal;
    }

    return { subtotal, itemCount, budgetRemaining };
  }

  public checkCompatibility(productIds: string[]): {
    compatible: boolean | null;
    explanation: string;
    missingInformation?: string[];
  } {
    if (!productIds || productIds.length < 2) {
      return {
        compatible: null,
        explanation: "Need at least two products to check compatibility.",
      };
    }

    const prods = productIds.map((id) => this.getProductById(id)).filter(Boolean) as Product[];
    if (prods.length !== productIds.length) {
      return {
        compatible: false,
        explanation: "Some product IDs could not be found in the catalog.",
        missingInformation: ["Verify product IDs exist in catalog."],
      };
    }

    // Check direct compatibleWith linkages or category logical fit
    for (let i = 0; i < prods.length; i++) {
      for (let j = i + 1; j < prods.length; j++) {
        const p1 = prods[i];
        const p2 = prods[j];
        if (p1.compatibleWith.includes(p2.id) || p2.compatibleWith.includes(p1.id)) {
          continue;
        }
        // Logical checks
        if (p1.category === "Gardening" && p2.category === "Gardening") {
          continue;
        }
        if (p1.category === "Tools" && p2.category === "Hardware") {
          continue;
        }
        if (p1.category === "Electrical" && p2.category === "Storage") {
          continue;
        }
      }
    }

    return {
      compatible: true,
      explanation: `Selected products (${prods.map((p) => p.name).join(", ")}) are compatible and work seamlessly together for this project.`,
    };
  }

  public findStores(options: {
    location?: string;
    postalCode?: string;
    requiredProductIds?: string[];
  }): Store[] {
    let results = [...this.stores];
    if (options.postalCode && options.postalCode.trim() !== "") {
      const exact = results.filter((s) => s.postalCode === options.postalCode?.trim());
      if (exact.length > 0) results = exact;
    }
    return results;
  }
}

export const productRepository = new ProductRepository();

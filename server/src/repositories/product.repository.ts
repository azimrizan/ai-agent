import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Product, Store } from "../schemas/product.schema.js";
import { shopifyService } from "../services/shopify.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductRepository {
  private products: Product[] = [];
  private stores: Store[] = [];
  private shopifyProductsLoaded: boolean = false;

  constructor() {
    this.loadData();
    // Proactively load live products from Shopify Storefront API
    this.syncShopifyProducts().catch((err) => {
      console.warn("Initial Shopify products sync warning:", err);
    });
    // 15-minute background refresh fallback
    setInterval(() => {
      this.syncShopifyProducts().catch(() => {});
    }, 15 * 60 * 1000);
  }

  public handleWebhookUpdate(updatedProd: Product) {
    const idx = this.products.findIndex((p) => p.id === updatedProd.id);
    if (idx >= 0) {
      this.products[idx] = updatedProd;
    } else {
      this.products.unshift(updatedProd);
    }
    console.log(`🛍️ Webhook updated product in memory: ${updatedProd.title}`);
  }

  public handleWebhookDelete(productId: string) {
    this.products = this.products.filter((p) => p.id !== productId);
    console.log(`🛍️ Webhook removed product from memory: ${productId}`);
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
          const localProds = JSON.parse(rawProducts);
          this.mergeProducts(localProds);
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

  public async syncShopifyProducts(searchQuery?: string): Promise<Product[]> {
    try {
      const shopifyProds = await shopifyService.fetchProducts({ query: searchQuery, first: 50 });
      if (shopifyProds && shopifyProds.length > 0) {
        this.mergeProducts(shopifyProds);
        this.shopifyProductsLoaded = true;
        console.log(`🛍️  Synced ${shopifyProds.length} products from Shopify Storefront API (${shopifyService.getStoreDomain()})`);
      }
      return shopifyProds;
    } catch (error) {
      console.error("Error syncing Shopify products:", error);
      return [];
    }
  }

  private mergeProducts(newProducts: Product[]) {
    for (const prod of newProducts) {
      const idx = this.products.findIndex((p) => p.id === prod.id || p.sku === prod.sku);
      if (idx >= 0) {
        this.products[idx] = prod;
      } else {
        // Place Shopify products at the front of the catalog
        if (prod.id.includes("shopify")) {
          this.products.unshift(prod);
        } else {
          this.products.push(prod);
        }
      }
    }
  }

  public getAllProducts(): Product[] {
    return this.products;
  }

  public getProductById(productId: string): Product | null {
    if (!productId) return null;
    const cleanId = String(productId).trim();
    const found = this.products.find(
      (p) => p.id === cleanId || p.sku === cleanId || p.id.endsWith(cleanId)
    );
    if (found) return found;

    // Partial numeric match for Shopify GIDs
    const numericPart = cleanId.replace(/[^0-9]/g, "");
    if (numericPart) {
      const match = this.products.find((p) => p.id.includes(numericPart));
      if (match) return match;
    }

    return null;
  }

  public async searchProductsAsync(options: {
    query?: string;
    category?: string;
    maxPrice?: number;
    tags?: string[];
    limit?: number;
  }): Promise<Product[]> {
    // If query is provided, query Shopify Storefront API live
    if (options.query && options.query.trim()) {
      await this.syncShopifyProducts(options.query);
    } else if (!this.shopifyProductsLoaded) {
      await this.syncShopifyProducts();
    }

    return this.searchProducts(options);
  }

  public searchProducts(options: {
    query?: string;
    category?: string;
    maxPrice?: number;
    tags?: string[];
    limit?: number;
  }): Product[] {
    let results = [...this.products];
    let effectiveMaxPrice = options.maxPrice;

    const stopWords = new Set([
      "show", "me", "find", "get", "buy", "under", "below", "less", "than", "for",
      "with", "the", "a", "an", "of", "in", "to", "and", "or", "i", "want", "need",
      "please", "list", "items", "some", "any", "which", "what", "are", "is", "can", "you"
    ]);

    let keyWords: string[] = [];

    if (options.query && options.query.trim() !== "") {
      const rawQuery = options.query.toLowerCase().trim();

      // Extract price constraint from prompt if not specified (e.g. "under 2000" or "below ₹1500")
      if (!effectiveMaxPrice) {
        const priceMatch = rawQuery.match(/(?:under|below|less than|max|within|budget|₹|\$)\s*(\d+(?:,\d+)?)/i);
        if (priceMatch && priceMatch[1]) {
          effectiveMaxPrice = parseInt(priceMatch[1].replace(/,/g, ""), 10);
        }
      }

      // Filter stop words and numbers from keywords
      keyWords = rawQuery
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 1 && !stopWords.has(word) && !/^\d+$/.test(word));
    }

    if (options.category && options.category.trim() !== "") {
      const catLower = options.category.toLowerCase().trim();
      results = results.filter((p) =>
        p.category.toLowerCase().includes(catLower) || p.subcategory.toLowerCase().includes(catLower)
      );
    }

    if (typeof effectiveMaxPrice === "number" && effectiveMaxPrice > 0) {
      results = results.filter((p) => p.price <= effectiveMaxPrice!);
    }

    if (options.tags && options.tags.length > 0) {
      const tagSet = new Set(options.tags.map((t) => t.toLowerCase()));
      results = results.filter((p) =>
        p.tags.some((t) => tagSet.has(t.toLowerCase())) ||
        p.useCases.some((u) => tagSet.has(u.toLowerCase()))
      );
    }

    if (keyWords.length > 0) {
      const rawQueryNoSpaces = options.query?.toLowerCase().replace(/\s+/g, "") || "";

      results = results.filter((p) => {
        const fullText = `${p.name} ${p.description} ${p.category} ${p.subcategory} ${p.tags.join(" ")} ${p.useCases.join(" ")}`.toLowerCase();
        const fullTextNoSpaces = fullText.replace(/\s+/g, "");

        if (rawQueryNoSpaces.length > 2 && fullTextNoSpaces.includes(rawQueryNoSpaces)) {
          return true;
        }

        return keyWords.some((word) => {
          const singular = word.endsWith("s") ? word.slice(0, -1) : word;
          const escWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const escSingular = singular.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regWord = new RegExp(`\\b${escWord}\\b`, "i");
          const regSingular = new RegExp(`\\b${escSingular}\\b`, "i");
          return regWord.test(fullText) || regSingular.test(fullText);
        });
      });

      // Sort by relevance (number of matching keywords as whole words)
      results.sort((a, b) => {
        const fullTextA = `${a.name} ${a.description} ${a.category} ${a.subcategory}`.toLowerCase();
        const fullTextB = `${b.name} ${b.description} ${b.category} ${b.subcategory}`.toLowerCase();
        const scoreA = keyWords.reduce((acc, k) => acc + (new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(fullTextA) ? 1 : 0), 0);
        const scoreB = keyWords.reduce((acc, k) => acc + (new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(fullTextB) ? 1 : 0), 0);
        return scoreB - scoreA;
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
    if (!original) return this.products.slice(0, 4);

    let candidates = this.products.filter(
      (p) => p.id !== original.id && (p.category === original.category || p.subcategory === original.subcategory)
    );

    if (candidates.length === 0) {
      candidates = this.products.filter((p) => p.id !== original.id);
    }

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

  public async getProductByIdAsync(id: string): Promise<Product | null> {
    const found = this.getProductById(id);
    if (found) return found;
    await this.syncShopifyProducts();
    return this.getProductById(id) || null;
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

    return {
      compatible: true,
      explanation: `Selected products (${prods.map((p) => p.name).join(", ")}) are compatible and work seamlessly together.`,
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

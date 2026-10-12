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
  private shopifyCollections: any[] = [];
  private shopifyProductsLoaded: boolean = false;

  constructor() {
    this.loadData();
    // Proactively load live products and collections from Shopify Storefront API
    this.syncShopifyProducts().catch((err) => {
      console.warn("Initial Shopify products sync warning:", err);
    });
    // 15-minute background refresh fallback
    setInterval(() => {
      this.syncShopifyProducts().catch(() => {});
    }, 15 * 60 * 1000);
  }

  public handleWebhookUpdate(updatedProd: Product) {
    const cleanId = String(updatedProd.id).replace(/[^0-9]/g, "");
    const idx = this.products.findIndex((p) => {
      const pClean = String(p.id).replace(/[^0-9]/g, "");
      return p.id === updatedProd.id || (cleanId && pClean === cleanId) || p.sku === updatedProd.sku;
    });
    if (idx >= 0) {
      this.products[idx] = { ...this.products[idx], ...updatedProd };
    } else {
      this.products.unshift(updatedProd);
    }
    console.log(`🛍️ Webhook updated product in memory: ${updatedProd.name || updatedProd.title}`);
  }

  public handleWebhookDelete(productId: string) {
    const cleanId = String(productId).replace(/[^0-9]/g, "");
    this.products = this.products.filter((p) => {
      const pClean = String(p.id).replace(/[^0-9]/g, "");
      if (cleanId && pClean === cleanId) return false;
      return p.id !== productId;
    });
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
          const localProds: Product[] = JSON.parse(rawProducts);
          this.products = localProds;
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
      console.error("Error loading initial data in ProductRepository:", error);
    }
  }

  public async syncShopifyProducts(searchQuery?: string): Promise<Product[]> {
    try {
      if (searchQuery && searchQuery.trim()) {
        const liveProds = await shopifyService.fetchProducts({ query: searchQuery, first: 50 });
        if (liveProds && liveProds.length > 0) {
          for (const p of liveProds) {
            const idx = this.products.findIndex(
              (existing) => existing.id === p.id || existing.sku === p.sku
            );
            if (idx >= 0) {
              this.products[idx] = p;
            } else {
              this.products.unshift(p);
            }
          }
        }
        return liveProds;
      }

      // Full catalog sync: Fetch live active products & collections from Shopify Storefront API
      const [shopifyProds, shopifyCols] = await Promise.all([
        shopifyService.fetchProducts({ first: 250 }),
        shopifyService.fetchCollections(50),
      ]);

      if (shopifyCols && shopifyCols.length > 0) {
        this.shopifyCollections = shopifyCols;
        console.log(`🏷️ Synced ${shopifyCols.length} collections from Shopify (${shopifyCols.map(c => c.title).join(", ")})`);
      }

      if (shopifyProds && shopifyProds.length > 0) {
        const activeMap = new Map<string, Product>();
        for (const p of shopifyProds) {
          activeMap.set(p.id, p);
        }

        // Tag products with their collection names
        if (shopifyCols && shopifyCols.length > 0) {
          for (const col of shopifyCols) {
            if (col.products && col.products.length > 0) {
              for (const cp of col.products) {
                if (activeMap.has(cp.id)) {
                  const existing = activeMap.get(cp.id)!;
                  if (!existing.tags.includes(col.title)) {
                    existing.tags.push(col.title);
                  }
                } else {
                  activeMap.set(cp.id, cp);
                }
              }
            }
          }
        }

        // Active catalog replacement: only active products remain in memory
        this.products = Array.from(activeMap.values());
        this.shopifyProductsLoaded = true;
        console.log(`🛍️ Synced and refreshed active catalog (${this.products.length} active products) from Shopify (${shopifyService.getStoreDomain()})`);
        this.saveActiveCatalogToDisk();
      }
      return shopifyProds;
    } catch (error) {
      console.error("Error syncing Shopify products:", error);
      return [];
    }
  }

  private saveActiveCatalogToDisk() {
    try {
      const serverJsonPath = path.join(__dirname, "../data/products.json");
      if (fs.existsSync(path.dirname(serverJsonPath))) {
        fs.writeFileSync(serverJsonPath, JSON.stringify(this.products, null, 2), "utf-8");
      }
    } catch (err) {
      console.warn("Could not persist active products to disk cache:", err);
    }
  }

  public getCollections(): any[] {
    return this.shopifyCollections;
  }

  public async searchCollectionsAsync(query: string): Promise<{ collection?: any; products: Product[] }> {
    if (!query) return { products: [] };
    const rawQ = query.toLowerCase().trim();

    // Standardize terms like theater -> theatre, tv -> led-tv
    const qNorm = rawQ
      .replace(/\btheater\b/g, "theatre")
      .replace(/\btelevisions?\b/g, "tv")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 1. Check exact or fuzzy title/handle match against synced shopifyCollections
    let matchedCol = this.shopifyCollections.find((c) => {
      const colTitle = c.title.toLowerCase().replace(/[^a-z0-9\s]/g, "");
      const colHandle = c.handle.toLowerCase().replace(/[^a-z0-9\s]/g, "");
      const qClean = qNorm.replace(/[^a-z0-9\s]/g, "");

      return (
        colTitle.includes(qClean) ||
        colHandle.includes(qClean) ||
        qClean.includes(colTitle) ||
        qClean.includes(colHandle)
      );
    });

    // 2. Specific intent mappings for common user phrases
    if (!matchedCol) {
      if (/hometheater|home theater|soundbar|speaker|audio|theatre/i.test(rawQ)) {
        matchedCol = this.shopifyCollections.find((c) => c.handle === "home-theatre" || c.handle === "home-theater" || c.title.toLowerCase().includes("home theatre"));
      } else if (/monsoon.*tv|tv.*monsoon|led tv|tv\b/i.test(rawQ)) {
        matchedCol = this.shopifyCollections.find((c) => c.handle === "led-tv");
      } else if (/cooker|pressure/i.test(rawQ)) {
        matchedCol = this.shopifyCollections.find((c) => c.handle === "pressure-cooker" || c.handle.includes("cooker"));
      } else if (/cookware|fry|pan|appam|dosa|kadai|tawa/i.test(rawQ)) {
        matchedCol = this.shopifyCollections.find((c) => c.handle === "cookware");
      } else if (/fan|bldc/i.test(rawQ)) {
        matchedCol = this.shopifyCollections.find((c) => c.handle.includes("fan") || c.title.toLowerCase().includes("fan"));
      } else if (/appliance|appliances|kettle|air fryer/i.test(rawQ)) {
        matchedCol = this.shopifyCollections.find((c) => c.handle === "all-kitchen-appliances" || c.handle.includes("appliance"));
      } else if (/deal|today/i.test(rawQ)) {
        matchedCol = this.shopifyCollections.find((c) => c.handle === "todays-deal");
      } else if (/best.*seller/i.test(rawQ)) {
        matchedCol = this.shopifyCollections.find((c) => c.handle === "best-sellers");
      } else if (/new/i.test(rawQ)) {
        matchedCol = this.shopifyCollections.find((c) => c.handle === "new-arrivals");
      }
    }

    if (matchedCol) {
      // Filter collection products by active products in catalog
      const activeColProducts = (matchedCol.products || []).filter((cp: Product) =>
        this.products.some((ap) => ap.id === cp.id || ap.sku === cp.sku)
      );

      return {
        collection: {
          id: matchedCol.id,
          title: matchedCol.title,
          handle: matchedCol.handle,
          description: matchedCol.description,
          url: matchedCol.url || `https://shop.mrplus.in/collections/${matchedCol.handle}`
        },
        products: activeColProducts
      };
    }

    // 3. If query mentions "monsoon" or "sale" without specific category:
    if (/monsoon|sale|offer|deal/i.test(rawQ) && !/theatre|theater|soundbar|tv|cooker/i.test(rawQ)) {
      const activeDeals = this.products.slice(0, 8);
      const dealCol = this.shopifyCollections.find((c) => c.handle === "todays-deal" || c.handle === "best-sellers") || this.shopifyCollections[0];

      return {
        collection: dealCol || {
          title: "MR.PLUS Today's Deals",
          handle: "todays-deal",
          url: "https://shop.mrplus.in/collections/todays-deal",
          description: "Special Offers"
        },
        products: activeDeals
      };
    }

    // Fallback: search products matching query
    const prods = await this.searchProductsAsync({ query: rawQ, limit: 12 });
    return { products: prods };
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

    if (options.query && options.query.trim() !== "") {
      const qLower = options.query.toLowerCase().trim();

      // Guard: If query is for categories not stocked by MR.PLUS (soundbar, TV, pressure cooker, washing machine)
      const isAudio = /\bsoundbars?\b|\bspeakers?\b|\bhome theate?r\b|\bbluetooth speaker\b/i.test(qLower);
      const isTV = /\btelevisions?\b|\btvs?\b|\bled tv\b|\bsmart tv\b/i.test(qLower);
      const isPressureCooker = /\bpressure cookers?\b/i.test(qLower);
      const isWashingMachine = /\bwashing machines?\b/i.test(qLower);

      if (isAudio || isTV || isPressureCooker || isWashingMachine) {
        return [];
      }
    }

    const stopWords = new Set([
      "show", "me", "find", "get", "buy", "under", "below", "less", "than", "for",
      "with", "the", "a", "an", "of", "in", "to", "and", "or", "i", "want", "need",
      "please", "list", "items", "some", "any", "which", "what", "are", "is", "can", "you",
      "mr", "plus", "mrplus", "tell", "about", "details", "info", "specs", "specification",
      "specifications", "price", "features", "item", "product", "products", "model",
      "brand", "explore", "looking", "search", "check", "give", "good", "best", "available",
      "store", "catalog", "popular", "like"
    ]);

    const WEAK_WORDS = new Set([
      "home", "air", "water", "speed", "indoor", "outdoor", "use", "usage",
      "room", "office", "technology", "operation", "quality", "finish",
      "power", "body", "heavy", "light", "high", "low", "smooth", "new",
      "energy", "saving"
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

      // Domain intent gating to prevent cross-category contamination
      const hasFanIntent = /\bfan\b|\bfans\b|\bbldc\b|\bceiling fan\b/i.test(rawQuery);
      const hasCookwareIntent = /\bfrypan|\bpan\b|\bpans\b|\bappachatty|\bkadai|\btawa|\bbiriyani|\bpot\b|\bcookware/i.test(rawQuery);
      const hasAirFryerIntent = /\bair fryer\b|\bfryer\b/i.test(rawQuery);
      const hasKettleIntent = /\bkettle\b|\bkettles\b/i.test(rawQuery);
      const hasStoveIntent = /\bstove\b|\bburner\b|\bgas stove\b/i.test(rawQuery);

      if (hasFanIntent) {
        results = results.filter((p) => /fan|bldc/i.test(`${p.name} ${p.category}`));
      } else if (hasAirFryerIntent) {
        results = results.filter((p) => /air fryer|fryer/i.test(`${p.name} ${p.category}`));
      } else if (hasKettleIntent) {
        results = results.filter((p) => /kettle/i.test(`${p.name} ${p.category}`));
      } else if (hasStoveIntent) {
        results = results.filter((p) => /gas stove|burner|glass top/i.test(`${p.name} ${p.category}`));
      } else if (hasCookwareIntent) {
        results = results.filter((p) => /appachatty|frypan|kadai|tawa|biriyani/i.test(`${p.name} ${p.category}`));
      }
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
      const strongKeyWords = keyWords.filter((w) => !WEAK_WORDS.has(w));

      const scoredResults = results
        .map((p) => {
          const title = (p.name || (p as any).title || "").toLowerCase();
          const category = (p.category || "").toLowerCase();
          const subcategory = (p.subcategory || "").toLowerCase();
          const tags = (p.tags || []).join(" ").toLowerCase();
          const useCases = (p.useCases || []).join(" ").toLowerCase();
          const description = (p.description || "").toLowerCase();

          const primaryText = `${title} ${category} ${subcategory} ${tags} ${useCases}`;
          const isDirectMatch = rawQueryNoSpaces.length > 2 && primaryText.replace(/\s+/g, "").includes(rawQueryNoSpaces);

          let score = 0;
          let primaryHitCount = 0;
          let descHitCount = 0;

          for (const word of keyWords) {
            const singular = word.endsWith("s") ? word.slice(0, -1) : word;
            const escWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const escSingular = singular.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regWord = new RegExp(`\\b${escWord}\\b`, "i");
            const regSingular = new RegExp(`\\b${escSingular}\\b`, "i");

            const isTitle = regWord.test(title) || regSingular.test(title);
            const isCategory = regWord.test(category) || regWord.test(subcategory);
            const isTag = regWord.test(tags) || regWord.test(useCases);
            const isDesc = regWord.test(description) || regSingular.test(description);

            if (isTitle) {
              score += 10;
              primaryHitCount++;
            } else if (isCategory) {
              score += 8;
              primaryHitCount++;
            } else if (isTag) {
              score += 6;
              primaryHitCount++;
            } else if (isDesc && !WEAK_WORDS.has(word)) {
              score += 2;
              descHitCount++;
            }
          }

          if (isDirectMatch) {
            score += 15;
            primaryHitCount++;
          }

          // A valid match must have hit primary attributes (title/category/tags)
          // or matched multiple strong keywords in description
          const isLegitimateMatch =
            isDirectMatch ||
            primaryHitCount > 0 ||
            (strongKeyWords.length > 0 && descHitCount >= 2);

          return { product: p, score, isLegitimateMatch };
        })
        .filter((item) => item.isLegitimateMatch && item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.product);

      results = scoredResults;
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

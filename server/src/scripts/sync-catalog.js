import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncShopifyCatalog() {
  console.log("Fetching real catalog from mrplus.in (bxyaz5-em.myshopify.com)...");

  const response = await fetch("https://bxyaz5-em.myshopify.com/api/2024-01/graphql.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": "7da9e9524aa411c90ca0400ef9ebd2a1",
    },
    body: JSON.stringify({
      query: `{
        products(first: 250) {
          edges {
            node {
              id
              title
              description
              handle
              productType
              vendor
              tags
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 3) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 3) {
                edges {
                  node {
                    id
                    title
                    sku
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API HTTP error ${response.status}`);
  }

  const json = await response.json();
  const edges = json?.data?.products?.edges || [];

  const realProducts = edges.map((edge) => {
    const node = edge.node;
    const rawId = node.id || "";
    const numericId = rawId.split("/").pop() || rawId;

    const firstVariant = node.variants?.edges?.[0]?.node;
    const firstImage = node.images?.edges?.[0]?.node?.url;

    const priceAmount = parseFloat(node.priceRange?.minVariantPrice?.amount || "0");
    const currencyCode = node.priceRange?.minVariantPrice?.currencyCode || "INR";

    const category = node.productType || node.vendor || "Cookware & Appliances";
    const subcategory = node.tags?.[0] || node.productType || "Kitchenware";

    const tags = Array.isArray(node.tags) && node.tags.length > 0
      ? node.tags
      : [node.productType, node.vendor, "mrplus"].filter(Boolean);

    const useCases = [
      node.productType,
      node.title,
      ...tags,
    ].filter((val, idx, self) => val && self.indexOf(val) === idx);

    const isAvailable = firstVariant ? firstVariant.availableForSale !== false : true;

    return {
      id: node.id,
      sku: firstVariant?.sku || numericId || node.handle || "SKU-MRPLUS",
      name: node.title,
      description: node.description || `${node.title} by MR. Plus`,
      category,
      subcategory,
      price: priceAmount,
      image: firstImage || "/White.png",
      tags,
      useCases,
      specifications: {
        vendor: node.vendor || "MR Plus",
        currency: currencyCode,
        handle: node.handle || "",
        shopifyId: numericId,
      },
      compatibleWith: [],
      stockStatus: isAvailable ? "in_stock" : "out_of_stock",
    };
  });

  console.log(`✅ Extracted ${realProducts.length} authentic MR.PLUS products from mrplus.in!`);

  const serverJsonPath = path.join(__dirname, "../data/products.json");
  fs.writeFileSync(serverJsonPath, JSON.stringify(realProducts, null, 2), "utf-8");
  console.log(`💾 Saved catalog to ${serverJsonPath}`);

  const clientTsPath = path.join(process.cwd(), "src/data/mockProducts.ts");
  const tsContent = `import type { Product } from "../types/product.js";\n\nexport const MOCK_PRODUCTS: Product[] = ${JSON.stringify(realProducts, null, 2)};\n`;
  fs.writeFileSync(clientTsPath, tsContent, "utf-8");
  console.log(`💾 Saved catalog to ${clientTsPath}`);
}

syncShopifyCatalog().catch(console.error);

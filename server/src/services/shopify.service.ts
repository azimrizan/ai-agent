import { Product } from "../schemas/product.schema.js";

export interface ShopifyCollectionData {

  id: string;
  title: string;
  handle: string;
  description: string;
  url: string;
  products: Product[];
}

export class ShopifyService {
  private domain: string;
  private token: string;
  private apiVersion: string = "2024-01";

  constructor() {
    this.domain = process.env.SHOPIFY_STORE_DOMAIN || "bxyaz5-em.myshopify.com";
    this.token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || "7da9e9524aa411c90ca0400ef9ebd2a1";
  }

  public isConfigured(): boolean {
    return Boolean(this.domain && this.token);
  }

  public getStoreDomain(): string {
    return this.domain;
  }

  public getDirectCartUrl(variantId: string, quantity: number = 1): string {
    const numericVariantId = String(variantId).split("/").pop() || variantId;
    return `https://shop.mrplus.in/cart/${numericVariantId}:${quantity}`;
  }

  public async fetchCollections(first: number = 50): Promise<ShopifyCollectionData[]> {
    if (!this.isConfigured()) return [];

    const graphqlQuery = `
      query getStorefrontCollections($first: Int) {
        collections(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              products(first: 100) {
                edges {
                  node {
                    id
                    title
                    description
                    productType
                    vendor
                    tags
                    handle
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
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${this.domain}/api/${this.apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.token,
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { first },
        }),
      });

      if (!response.ok) return [];
      const json: any = await response.json();
      const edges = json?.data?.collections?.edges || [];

      return edges.map((edge: any) => {
        const node = edge.node;
        const products = (node.products?.edges || []).map((pEdge: any) =>
          this.mapShopifyNodeToProduct(pEdge.node)
        );
        return {
          id: node.id,
          title: node.title,
          handle: node.handle,
          description: node.description || "",
          url: `https://shop.mrplus.in/collections/${node.handle}`,
          products,
        };
      });
    } catch (error: any) {
      if (error?.cause?.code === "ENOTFOUND" || error?.code === "ENOTFOUND") {
        console.warn(`⚠️ Shopify DNS resolution hiccup (${this.domain}). Retrying on next request...`);
      } else {
        console.error("Error fetching Shopify collections:", error?.message || error);
      }
      return [];
    }
  }


  public async fetchProducts(options: { query?: string; first?: number } = {}): Promise<Product[]> {

    if (!this.isConfigured()) return [];

    const first = options.first || 250;
    const q = options.query ? options.query.trim() : null;

    const graphqlQuery = `
      query getStorefrontProducts($q: String, $first: Int) {
        products(first: $first, query: $q) {
          edges {
            node {
              id
              title
              description
              productType
              vendor
              tags
              handle
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
      }
    `;

    try {
      const response = await fetch(`https://${this.domain}/api/${this.apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.token,
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { q, first },
        }),
      });

      if (!response.ok) {
        console.error(`Shopify API HTTP error ${response.status}: ${response.statusText}`);
        return [];
      }

      const json: any = await response.json();
      if (json.errors) {
        console.error("Shopify GraphQL errors:", json.errors);
        return [];
      }

      const edges = json?.data?.products?.edges || [];
      return edges.map((edge: any) => this.mapShopifyNodeToProduct(edge.node));
    } catch (error: any) {
      if (error?.cause?.code === "ENOTFOUND" || error?.code === "ENOTFOUND") {
        console.warn(`⚠️ Shopify DNS resolution hiccup (${this.domain}). Retrying on next request...`);
      } else {
        console.error("Error calling Shopify Storefront API:", error?.message || error);
      }
      return [];
    }

  }

  public async getProductById(id: string): Promise<Product | null> {
    if (!this.isConfigured()) return null;

    let shopifyGid = id;
    if (!id.startsWith("gid://shopify/Product/")) {
      const cleanNum = id.replace(/[^0-9]/g, "");
      if (cleanNum) {
        shopifyGid = `gid://shopify/Product/${cleanNum}`;
      }
    }

    const graphqlQuery = `
      query getProductById($id: ID!) {
        product(id: $id) {
          id
          title
          description
          productType
          vendor
          tags
          handle
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
    `;

    try {
      const response = await fetch(`https://${this.domain}/api/${this.apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.token,
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { id: shopifyGid },
        }),
      });

      if (!response.ok) return null;

      const json: any = await response.json();
      if (json?.data?.product) {
        return this.mapShopifyNodeToProduct(json.data.product);
      }
      return null;
    } catch (error) {
      console.error("Error fetching Shopify product by ID:", error);
      return null;
    }
  }

  private mapShopifyNodeToProduct(node: any): Product {
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
      : [node.productType, node.vendor, "shopify"].filter(Boolean);

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
      image: firstImage || "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=500&q=80",
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
  }

  public async fetchCustomerByAccessToken(accessToken: string): Promise<any> {
    if (!this.isConfigured()) return null;

    const query = `
      query getCustomerProfile($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          firstName
          lastName
          email
          phone
          orders(first: 5) {
            edges {
              node {
                name
                totalPriceV2 {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${this.domain}/api/${this.apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.token,
        },
        body: JSON.stringify({ query, variables: { customerAccessToken: accessToken } }),
      });
      if (!response.ok) return null;
      const json: any = await response.json();
      return json?.data?.customer || null;
    } catch (err) {
      console.error("Error fetching customer by access token:", err);
      return null;
    }
  }

  public async loginCustomer(email: string, password: string): Promise<{ accessToken?: string; customer?: any; error?: string }> {
    if (!this.isConfigured()) return { error: "Shopify Storefront API not configured" };

    const mutation = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    try {
      const response = await fetch(`https://${this.domain}/api/${this.apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": this.token,
        },
        body: JSON.stringify({
          query: mutation,
          variables: { input: { email, password } },
        }),
      });

      if (!response.ok) return { error: `Shopify HTTP error ${response.status}` };
      const json: any = await response.json();

      const userErrors = json?.data?.customerAccessTokenCreate?.customerUserErrors || [];
      if (userErrors.length > 0) {
        return { error: userErrors[0].message };
      }

      const tokenObj = json?.data?.customerAccessTokenCreate?.customerAccessToken;
      if (tokenObj?.accessToken) {
        const customer = await this.fetchCustomerByAccessToken(tokenObj.accessToken);
        return { accessToken: tokenObj.accessToken, customer: customer || { email, firstName: email.split("@")[0] } };
      }

      return { error: "Failed to obtain customer access token" };
    } catch (err: any) {
      return { error: err.message || "Login failed" };
    }
  }
}

export const shopifyService = new ShopifyService();

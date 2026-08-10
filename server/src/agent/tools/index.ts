import { searchProductsTool } from "./searchProducts.js";
import { multiSearchProductsTool } from "./multiSearchProducts.js";
import { getProductDetailsTool } from "./getProductDetails.js";
import { findAlternativesTool } from "./findAlternatives.js";
import { calculateBasketTool } from "./calculateBasket.js";
import { checkCompatibilityTool } from "./checkCompatibility.js";
import { updateProjectPlanTool } from "./updateProjectPlan.js";
import { findStoresTool } from "./findStores.js";
import { createDirectCheckoutTool } from "./createDirectCheckout.js";
import { queryStorePolicyTool } from "./queryStorePolicy.js";
import { searchCollectionsTool } from "./searchCollections.js";
import { getRecommendationsTool } from "./getRecommendations.js";
import { searchByTagsTool } from "./searchByTags.js";
import { getVariantsTool } from "./getVariants.js";
import { compareProductsTool } from "./compareProducts.js";

export const allTools = [
  searchProductsTool,
  multiSearchProductsTool,
  getProductDetailsTool,
  findAlternativesTool,
  calculateBasketTool,
  checkCompatibilityTool,
  updateProjectPlanTool,
  findStoresTool,
  createDirectCheckoutTool,
  queryStorePolicyTool,
  searchCollectionsTool,
  getRecommendationsTool,
  searchByTagsTool,
  getVariantsTool,
  compareProductsTool,
];

export const toolRegistry: Record<string, any> = {
  [searchProductsTool.name]: searchProductsTool,
  [multiSearchProductsTool.name]: multiSearchProductsTool,
  [getProductDetailsTool.name]: getProductDetailsTool,
  [findAlternativesTool.name]: findAlternativesTool,
  [calculateBasketTool.name]: calculateBasketTool,
  [checkCompatibilityTool.name]: checkCompatibilityTool,
  [updateProjectPlanTool.name]: updateProjectPlanTool,
  [findStoresTool.name]: findStoresTool,
  [createDirectCheckoutTool.name]: createDirectCheckoutTool,
  [queryStorePolicyTool.name]: queryStorePolicyTool,
  [searchCollectionsTool.name]: searchCollectionsTool,
  [getRecommendationsTool.name]: getRecommendationsTool,
  [searchByTagsTool.name]: searchByTagsTool,
  [getVariantsTool.name]: getVariantsTool,
  [compareProductsTool.name]: compareProductsTool,
};


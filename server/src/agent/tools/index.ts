import { searchProductsTool } from "./searchProducts.js";
import { getProductDetailsTool } from "./getProductDetails.js";
import { findAlternativesTool } from "./findAlternatives.js";
import { calculateBasketTool } from "./calculateBasket.js";
import { checkCompatibilityTool } from "./checkCompatibility.js";
import { updateProjectPlanTool } from "./updateProjectPlan.js";
import { findStoresTool } from "./findStores.js";

export const allTools = [
  searchProductsTool,
  getProductDetailsTool,
  findAlternativesTool,
  calculateBasketTool,
  checkCompatibilityTool,
  updateProjectPlanTool,
  findStoresTool,
];

export const toolRegistry: Record<string, any> = {
  [searchProductsTool.name]: searchProductsTool,
  [getProductDetailsTool.name]: getProductDetailsTool,
  [findAlternativesTool.name]: findAlternativesTool,
  [calculateBasketTool.name]: calculateBasketTool,
  [checkCompatibilityTool.name]: checkCompatibilityTool,
  [updateProjectPlanTool.name]: updateProjectPlanTool,
  [findStoresTool.name]: findStoresTool,
};

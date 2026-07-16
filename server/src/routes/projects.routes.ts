import { Router } from "express";
import { productRepository } from "../repositories/product.repository.js";

const router = Router();

router.post("/calculate-basket", (req, res) => {
  try {
    const { items, budgetMaximum } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "Items array is required" });
      return;
    }
    const result = productRepository.calculateBasket(items, budgetMaximum);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/compatibility", (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) {
      res.status(400).json({ error: "productIds array is required" });
      return;
    }
    const result = productRepository.checkCompatibility(productIds);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

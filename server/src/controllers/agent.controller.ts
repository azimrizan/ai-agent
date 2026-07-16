import { Request, Response } from "express";
import { agentOrchestrator } from "../agent/orchestrator.js";
import { productRepository } from "../repositories/product.repository.js";
import { AgentRequest } from "../schemas/agent.schema.js";

export class AgentController {
  public async handleChat(req: Request, res: Response): Promise<void> {
    try {
      const agentRequest: AgentRequest = req.body;
      if (!agentRequest || !agentRequest.message) {
        res.status(400).json({ error: "Message is required." });
        return;
      }

      const response = await agentOrchestrator.processRequest(agentRequest);
      res.status(200).json(response);
    } catch (error: any) {
      console.error("Error in AgentController.handleChat:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  public async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const { query, category, maxPrice, limit } = req.query;
      const products = productRepository.searchProducts({
        query: typeof query === "string" ? query : undefined,
        category: typeof category === "string" ? category : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json({ products });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({ error: "Product ID is required" });
        return;
      }
      const product = productRepository.getProductById(id);
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.status(200).json({ product });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async getAlternatives(req: Request, res: Response): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        res.status(400).json({ error: "Product ID is required" });
        return;
      }
      const { reason, targetPrice } = req.query;
      const alternatives = productRepository.findAlternatives({
        productId: id,
        reason: reason as any,
        targetPrice: targetPrice ? Number(targetPrice) : undefined,
      });
      res.status(200).json({ alternatives });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public async getStores(req: Request, res: Response): Promise<void> {
    try {
      const stores = productRepository.findStores({});
      res.status(200).json({ stores });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const agentController = new AgentController();

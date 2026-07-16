import { Router } from "express";
import { agentController } from "../controllers/agent.controller.js";

const router = Router();

router.get("/", (req, res) => agentController.getProducts(req, res));
router.get("/stores", (req, res) => agentController.getStores(req, res));
router.get("/:id", (req, res) => agentController.getProductById(req, res));
router.get("/:id/alternatives", (req, res) => agentController.getAlternatives(req, res));

export default router;

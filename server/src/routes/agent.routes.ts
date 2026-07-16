import { Router } from "express";
import { agentController } from "../controllers/agent.controller.js";

const router = Router();

router.post("/chat", (req, res) => agentController.handleChat(req, res));

export default router;

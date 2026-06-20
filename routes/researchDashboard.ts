import { Router } from "express";
import {
  getDashboardSummary,
  getParticipantSummary,
  getPromptUsageSummary,
  getRiskTrendByTimePoint,
} from "../controller/researchDashboardController";

const router = Router();

router.get("/summary", getDashboardSummary);
router.get("/participants", getParticipantSummary);
router.get("/prompts", getPromptUsageSummary);
router.get("/risk-trend", getRiskTrendByTimePoint);

export default router;

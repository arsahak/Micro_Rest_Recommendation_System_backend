import { Router } from "express";
import {
  createBaselineEntry,
  deleteBaselineEntry,
  getBaselineEntries,
  getBaselineSummaries,
  getBaselineSummaryByParticipant,
  recalculateBaselineSummary,
} from "../controller/baselineController";

const router = Router();

router.get("/entries", getBaselineEntries);
router.post("/entries", createBaselineEntry);
router.delete("/entries/:id", deleteBaselineEntry);

router.get("/summaries", getBaselineSummaries);
router.get("/summaries/:id", getBaselineSummaryByParticipant);
router.post("/summaries/:id/recalculate", recalculateBaselineSummary);

export default router;

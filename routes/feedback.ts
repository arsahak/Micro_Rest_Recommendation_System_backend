import { Router } from "express";
import { createFeedback, getFeedbackLogs, updateFeedback } from "../controller/feedbackController";

const router = Router();

router.get("/", getFeedbackLogs);
router.post("/", createFeedback);
router.put("/:id", updateFeedback);

export default router;

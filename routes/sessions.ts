import { Router } from "express";
import {
  startSession,
  getActiveSession,
  sendHeartbeat,
  recordRest,
  endSession,
  getCheckinStatus,
  snoozeCheckin,
} from "../controller/sessionController";

const router = Router();

router.post("/", startSession);
router.get("/active/:participant_id", getActiveSession);
router.put("/:id/heartbeat", sendHeartbeat);
router.put("/:id/rest", recordRest);
router.put("/:id/end", endSession);
router.get("/:id/checkin-status", getCheckinStatus);
router.put("/:id/snooze", snoozeCheckin);

export default router;

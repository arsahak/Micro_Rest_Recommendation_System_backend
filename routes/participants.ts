import { Router } from "express";
import { createParticipant, deleteParticipant, getParticipant, getParticipants, updateParticipant } from "../controller/participantController";

const router = Router();

router.get("/", getParticipants);
router.get("/:id", getParticipant);
router.post("/", createParticipant);
router.put("/:id", updateParticipant);
router.delete("/:id", deleteParticipant);

export default router;

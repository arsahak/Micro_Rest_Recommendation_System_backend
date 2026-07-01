import { Router } from "express";
import { loginParticipant } from "../controller/participantAuthController";

const router = Router();
router.post("/login", loginParticipant);

export default router;

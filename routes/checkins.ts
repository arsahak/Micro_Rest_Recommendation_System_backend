import { Router } from "express";
import { createCheckin, deleteCheckin, getCheckin, getCheckins, previewCalculation } from "../controller/checkinController";

const router = Router();

router.get("/", getCheckins);
router.get("/:id", getCheckin);
router.post("/", createCheckin);
router.post("/preview", previewCalculation);
router.delete("/:id", deleteCheckin);

export default router;

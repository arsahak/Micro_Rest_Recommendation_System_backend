import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { generateAccessToken } from "../config/jwt";
import Participant from "../modal/participant";

export const loginParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participant_id, pin } = req.body;

    if (!participant_id || !pin) {
      res.status(400).json({ success: false, message: "Participant ID and PIN are required" });
      return;
    }

    const participant = await Participant.findOne({
      participant_id: String(participant_id).toUpperCase(),
    }).select("+pin_hash");

    if (!participant) {
      res.status(401).json({ success: false, message: "Invalid participant ID or PIN" });
      return;
    }

    if (!participant.pin_hash) {
      // First login: the PIN chosen now becomes the permanent PIN
      const salt = await bcrypt.genSalt(10);
      participant.pin_hash = await bcrypt.hash(String(pin), salt);
      await participant.save();
    } else {
      const valid = await bcrypt.compare(String(pin), participant.pin_hash);
      if (!valid) {
        res.status(401).json({ success: false, message: "Invalid participant ID or PIN" });
        return;
      }
    }

    const { accessToken } = generateAccessToken({
      userId: participant.participant_id,
      email: "",
      role: "participant",
    });

    res.json({
      success: true,
      data: {
        token: accessToken,
        participant_id: participant.participant_id,
        participant_label: participant.participant_label ?? null,
        study_phase: participant.study_phase,
      },
    });
  } catch (error) {
    console.error("participantLogin error:", error);
    res.status(500).json({ success: false, message: "Login error" });
  }
};

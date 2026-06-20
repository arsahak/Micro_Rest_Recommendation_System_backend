import { Request, Response } from "express";
import Participant from "../modal/participant";

export const getParticipants = async (_req: Request, res: Response): Promise<void> => {
  try {
    const participants = await Participant.find().sort({ participant_id: 1 });
    res.status(200).json({ success: true, count: participants.length, data: participants });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching participants", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const participant = await Participant.findOne({ participant_id: req.params.id.toUpperCase() });
    if (!participant) {
      res.status(404).json({ success: false, message: "Participant not found" });
      return;
    }
    res.status(200).json({ success: true, data: participant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching participant", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const createParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participant_id, participant_label, study_phase, notes } = req.body;
    if (!participant_id) {
      res.status(400).json({ success: false, message: "participant_id is required" });
      return;
    }
    const existing = await Participant.findOne({ participant_id: participant_id.toUpperCase() });
    if (existing) {
      res.status(400).json({ success: false, message: "Participant ID already exists" });
      return;
    }
    const participant = await Participant.create({ participant_id, participant_label, study_phase, notes });
    res.status(201).json({ success: true, message: "Participant created", data: participant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating participant", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const updateParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const participant = await Participant.findOneAndUpdate(
      { participant_id: req.params.id.toUpperCase() },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!participant) {
      res.status(404).json({ success: false, message: "Participant not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Participant updated", data: participant });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating participant", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const deleteParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const participant = await Participant.findOneAndDelete({ participant_id: req.params.id.toUpperCase() });
    if (!participant) {
      res.status(404).json({ success: false, message: "Participant not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Participant deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting participant", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

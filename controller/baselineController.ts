import { Request, Response } from "express";
import BaselinePhase1 from "../modal/baselinePhase1";
import BaselineSummary from "../modal/baselineSummary";

async function recalculateSummary(participant_id: string): Promise<void> {
  const pid = participant_id.toUpperCase();
  const records = await BaselinePhase1.find({ participant_id: pid });
  if (records.length === 0) return;

  const avg = (key: keyof typeof records[0]) =>
    records.reduce((sum, r) => sum + (r[key] as number), 0) / records.length;

  await BaselineSummary.findOneAndUpdate(
    { participant_id: pid },
    {
      participant_id: pid,
      baseline_hr: avg("hr"),
      baseline_fatigue: avg("fatigue_score"),
      baseline_kss: avg("kss_score"),
      baseline_eye_strain: avg("eye_strain_score"),
      baseline_discomfort: avg("body_discomfort_score"),
      baseline_sitting_min: avg("sitting_duration_min"),
      record_count: records.length,
      last_updated: new Date(),
    },
    { upsert: true, new: true }
  );
}

export const getBaselineEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.participant_id) filter.participant_id = String(req.query.participant_id).toUpperCase();
    const entries = await BaselinePhase1.find(filter).sort({ participant_id: 1, date: 1 });
    res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching baseline entries", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const createBaselineEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participant_id, date, time_point, hr, fatigue_score, kss_score, eye_strain_score, body_discomfort_score, sitting_duration_min, rest_behavior } = req.body;

    if (!participant_id || !time_point || hr == null || fatigue_score == null || kss_score == null || eye_strain_score == null || body_discomfort_score == null || sitting_duration_min == null) {
      res.status(400).json({ success: false, message: "Missing required fields" });
      return;
    }

    const entry = await BaselinePhase1.create({
      participant_id: participant_id.toUpperCase(),
      date: date ? new Date(date) : new Date(),
      time_point,
      hr,
      fatigue_score,
      kss_score,
      eye_strain_score,
      body_discomfort_score,
      sitting_duration_min,
      rest_behavior,
    });

    recalculateSummary(participant_id).catch(console.error);

    res.status(201).json({ success: true, message: "Baseline entry created", data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating baseline entry", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const deleteBaselineEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const entry = await BaselinePhase1.findByIdAndDelete(req.params.id);
    if (!entry) {
      res.status(404).json({ success: false, message: "Entry not found" });
      return;
    }
    recalculateSummary(entry.participant_id).catch(console.error);
    res.status(200).json({ success: true, message: "Baseline entry deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting baseline entry", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getBaselineSummaries = async (_req: Request, res: Response): Promise<void> => {
  try {
    const summaries = await BaselineSummary.find().sort({ participant_id: 1 });
    res.status(200).json({ success: true, count: summaries.length, data: summaries });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching summaries", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getBaselineSummaryByParticipant = async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await BaselineSummary.findOne({ participant_id: req.params.id.toUpperCase() });
    if (!summary) {
      res.status(404).json({ success: false, message: "No baseline summary found for this participant" });
      return;
    }
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching summary", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const recalculateBaselineSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    await recalculateSummary(req.params.id);
    const summary = await BaselineSummary.findOne({ participant_id: req.params.id.toUpperCase() });
    res.status(200).json({ success: true, message: "Summary recalculated", data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error recalculating summary", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

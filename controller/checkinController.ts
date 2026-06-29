import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import BaselineSummary from "../modal/baselineSummary";
import Phase2Checkin from "../modal/phase2Checkin";
import Session from "../modal/session";
import NotificationLog from "../modal/notificationLog";
import { calculateFatigueRisk } from "../services/fatigueCalculationService";

export const getCheckins = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.participant_id) filter.participant_id = String(req.query.participant_id).toUpperCase();
    if (req.query.risk_level) filter.risk_level = String(req.query.risk_level);

    const checkins = await Phase2Checkin.find(filter).sort({ date: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: checkins.length, data: checkins });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching check-ins", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getCheckin = async (req: Request, res: Response): Promise<void> => {
  try {
    const checkin = await Phase2Checkin.findOne({ checkin_id: req.params.id });
    if (!checkin) {
      res.status(404).json({ success: false, message: "Check-in not found" });
      return;
    }
    res.status(200).json({ success: true, data: checkin });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching check-in", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const createCheckin = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      participant_id,
      date,
      time_point,
      current_hr,
      fatigue_score,
      kss_score,
      eye_strain_score,
      body_discomfort_score,
      sitting_duration_min,
      screen_exposure_min,
    } = req.body;

    if (!participant_id || !time_point || current_hr == null || fatigue_score == null || kss_score == null || eye_strain_score == null || body_discomfort_score == null || sitting_duration_min == null) {
      res.status(400).json({ success: false, message: "Missing required fields" });
      return;
    }

    const pid = participant_id.toUpperCase();

    const summary = await BaselineSummary.findOne({ participant_id: pid });
    if (!summary) {
      res.status(400).json({
        success: false,
        message: `No baseline summary found for ${pid}. Complete Phase 1 baseline entries and recalculate summary first.`,
      });
      return;
    }

    const calc = calculateFatigueRisk({
      current_hr,
      baseline_hr: summary.baseline_hr,
      eye_strain_score,
      body_discomfort_score,
      sitting_duration_min,
      screen_exposure_min,
      fatigue_score,
      kss_score,
    });

    const checkin_id = `CHK-${pid}-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Section 19.1: Baseline vs Intervention is a hard switch driven by the active session
    // (falls back to "Intervention" if no session is active, so check-ins outside a tracked
    // session still behave as before this feature was added).
    const activeSession = await Session.findOne({ participant_id: pid, status: "active" });
    const session_mode = activeSession?.session_mode ?? "Intervention";

    const checkin = await Phase2Checkin.create({
      checkin_id,
      participant_id: pid,
      session_id: activeSession?.session_id,
      session_mode,
      date: date ? new Date(date) : new Date(),
      time_point,
      current_hr,
      fatigue_score,
      kss_score,
      eye_strain_score,
      body_discomfort_score,
      sitting_duration_min,
      screen_exposure_min,
      ...calc,
    });

    if (activeSession) {
      await Session.updateOne(
        { session_id: activeSession.session_id },
        {
          $set: {
            last_checkin_time: new Date(),
            previous_risk_level: calc.risk_level,
            previous_dominant_issue: calc.dominant_issue,
            checkin_snooze_count: 0,
          },
          $inc: { total_checkins: 1, consecutive_high_risk_count: calc.risk_level === "High" ? 1 : -activeSession.consecutive_high_risk_count },
        }
      );
      await NotificationLog.updateMany(
        { session_id: activeSession.session_id, notification_type: "quick_checkin_notification", user_action: { $in: ["pending", "snoozed"] } },
        { $set: { user_action: "acted" } }
      );
    }

    res.status(201).json({
      success: true,
      message: "Check-in recorded and fatigue risk calculated",
      data: checkin,
      baseline_used: {
        baseline_hr: summary.baseline_hr,
        record_count: summary.record_count,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating check-in", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const previewCalculation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participant_id, current_hr, fatigue_score, kss_score, eye_strain_score, body_discomfort_score, sitting_duration_min, screen_exposure_min } = req.body;

    if (!participant_id || current_hr == null) {
      res.status(400).json({ success: false, message: "participant_id and current_hr are required" });
      return;
    }

    const summary = await BaselineSummary.findOne({ participant_id: participant_id.toUpperCase() });
    if (!summary) {
      res.status(400).json({ success: false, message: `No baseline found for ${participant_id}` });
      return;
    }

    const result = calculateFatigueRisk({
      current_hr,
      baseline_hr: summary.baseline_hr,
      eye_strain_score: eye_strain_score ?? 1,
      body_discomfort_score: body_discomfort_score ?? 1,
      sitting_duration_min: sitting_duration_min ?? 0,
      screen_exposure_min,
      fatigue_score: fatigue_score ?? 1,
      kss_score: kss_score ?? 1,
    });

    res.status(200).json({ success: true, data: result, baseline_hr: summary.baseline_hr });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error in preview calculation", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const deleteCheckin = async (req: Request, res: Response): Promise<void> => {
  try {
    const checkin = await Phase2Checkin.findOneAndDelete({ checkin_id: req.params.id });
    if (!checkin) {
      res.status(404).json({ success: false, message: "Check-in not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Check-in deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting check-in", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

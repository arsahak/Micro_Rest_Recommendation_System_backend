import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Session from "../modal/session";
import Participant from "../modal/participant";
import NotificationLog from "../modal/notificationLog";
import { computeCheckinStatus } from "../services/sessionService";

function deriveSessionMode(studyPhase: string | undefined): "Baseline" | "Intervention" {
  return studyPhase === "Baseline" ? "Baseline" : "Intervention";
}

export const startSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { participant_id } = req.body;
    if (!participant_id) {
      res.status(400).json({ success: false, message: "participant_id is required" });
      return;
    }

    const pid = String(participant_id).toUpperCase();
    const participant = await Participant.findOne({ participant_id: pid });
    if (!participant) {
      res.status(404).json({ success: false, message: `Participant ${pid} not found` });
      return;
    }

    // Only one active session per participant — end any stale one first.
    await Session.updateMany({ participant_id: pid, status: "active" }, { $set: { status: "ended", end_time: new Date() } });

    const session_id = `SES-${pid}-${uuidv4().slice(0, 8).toUpperCase()}`;
    const session = await Session.create({
      session_id,
      participant_id: pid,
      session_mode: deriveSessionMode(participant.study_phase),
      status: "active",
      start_time: new Date(),
    });

    res.status(201).json({ success: true, message: "Session started", data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error starting session", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getActiveSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const pid = String(req.params.participant_id).toUpperCase();
    const session = await Session.findOne({ participant_id: pid, status: "active" });
    if (!session) {
      res.status(404).json({ success: false, message: "No active session" });
      return;
    }
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching active session", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const sendHeartbeat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { active_minutes } = req.body;
    if (active_minutes == null || active_minutes < 0) {
      res.status(400).json({ success: false, message: "active_minutes is required" });
      return;
    }

    const session = await Session.findOneAndUpdate(
      { session_id: req.params.id, status: "active" },
      { $inc: { sitting_duration_min: active_minutes, screen_exposure_min: active_minutes } },
      { new: true }
    );
    if (!session) {
      res.status(404).json({ success: false, message: "Active session not found" });
      return;
    }
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error recording heartbeat", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const recordRest = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await Session.findOneAndUpdate(
      { session_id: req.params.id, status: "active" },
      {
        $set: { sitting_duration_min: 0, screen_exposure_min: 0, last_rest_time: new Date(), previous_rest_status: "completed", checkin_snooze_count: 0 },
        $inc: { total_rest_actions: 1 },
      },
      { new: true }
    );
    if (!session) {
      res.status(404).json({ success: false, message: "Active session not found" });
      return;
    }
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error recording rest", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const endSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await Session.findOneAndUpdate(
      { session_id: req.params.id, status: "active" },
      { $set: { status: "ended", end_time: new Date() } },
      { new: true }
    );
    if (!session) {
      res.status(404).json({ success: false, message: "Active session not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Session ended", data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error ending session", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// The "decision point" (Section 6.1) — called periodically by the frontend. Internally
// evaluates the adaptive trigger rules and logs a notification only when actually due.
export const getCheckinStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await Session.findOne({ session_id: req.params.id, status: "active" });
    if (!session) {
      res.status(404).json({ success: false, message: "Active session not found" });
      return;
    }

    const status = computeCheckinStatus(session);

    if (status.due) {
      const existingPending = await NotificationLog.findOne({
        session_id: session.session_id,
        notification_type: "quick_checkin_notification",
        user_action: "pending",
      });
      if (!existingPending) {
        await NotificationLog.create({
          notification_id: `NTF-${session.participant_id}-${uuidv4().slice(0, 8).toUpperCase()}`,
          session_id: session.session_id,
          participant_id: session.participant_id,
          notification_type: "quick_checkin_notification",
          trigger_reason: status.trigger_reason,
          message: "Please complete a quick fatigue check-in.",
        });
      }
    }

    if (status.escalate) {
      const existingEscalation = await NotificationLog.findOne({
        session_id: session.session_id,
        notification_type: "extended_rest_recommendation",
        user_action: "pending",
      });
      if (!existingEscalation) {
        await NotificationLog.create({
          notification_id: `NTF-${session.participant_id}-${uuidv4().slice(0, 8).toUpperCase()}`,
          session_id: session.session_id,
          participant_id: session.participant_id,
          notification_type: "extended_rest_recommendation",
          trigger_reason: ["two_consecutive_high_risk"],
          message: "Your fatigue indicators have stayed high across two check-ins. Consider a longer break or pausing work if possible.",
        });
      }
    }

    res.status(200).json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error computing check-in status", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

// Section 16.1 snooze handling for the quick-check-in notification.
export const snoozeCheckin = async (req: Request, res: Response): Promise<void> => {
  try {
    const log = await NotificationLog.findOneAndUpdate(
      { session_id: req.params.id, notification_type: "quick_checkin_notification", user_action: "pending" },
      { $set: { user_action: "snoozed" }, $inc: { snooze_status: 1 } },
      { new: true }
    );
    if (!log) {
      res.status(404).json({ success: false, message: "No pending check-in notification to snooze" });
      return;
    }

    const session = await Session.findOneAndUpdate(
      { session_id: req.params.id, status: "active" },
      { $inc: { checkin_snooze_count: 1 } },
      { new: true }
    );

    res.status(200).json({ success: true, data: { notification: log, session } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error snoozing check-in", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

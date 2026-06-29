import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import FeedbackLog from "../modal/feedbackLog";
import Phase2Checkin from "../modal/phase2Checkin";
import Session from "../modal/session";
import NotificationLog from "../modal/notificationLog";

export const getFeedbackLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.participant_id) filter.participant_id = String(req.query.participant_id).toUpperCase();
    if (req.query.checkin_id) filter.checkin_id = String(req.query.checkin_id);

    const logs = await FeedbackLog.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching feedback", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const createFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { checkin_id, completed, usefulness_rating, timing_appropriate, work_disturbance, recovered, comment } = req.body;

    if (!checkin_id || completed === undefined) {
      res.status(400).json({ success: false, message: "checkin_id and completed are required" });
      return;
    }

    const checkin = await Phase2Checkin.findOne({ checkin_id });
    if (!checkin) {
      res.status(404).json({ success: false, message: "Check-in not found. Cannot submit feedback." });
      return;
    }

    const existing = await FeedbackLog.findOne({ checkin_id });
    if (existing) {
      res.status(400).json({ success: false, message: "Feedback already submitted for this check-in" });
      return;
    }

    const feedback_id = `FB-${checkin.participant_id}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const feedback = await FeedbackLog.create({
      feedback_id,
      checkin_id,
      participant_id: checkin.participant_id,
      completed,
      usefulness_rating,
      timing_appropriate,
      work_disturbance,
      recovered,
      comment,
    });

    // Section 16/17 follow-up: rest outcome and perceived recovery drive the next
    // check-in interval via Session.previous_rest_status (read by computeCheckinStatus).
    if (checkin.session_id) {
      const feelsWorse = completed && recovered != null && recovered <= 2;
      const restStatus: "completed" | "completed_worse" | "skipped" = !completed ? "skipped" : feelsWorse ? "completed_worse" : "completed";

      const sessionUpdate: Record<string, unknown> = { previous_rest_status: restStatus };
      if (completed) {
        sessionUpdate.sitting_duration_min = 0;
        sessionUpdate.screen_exposure_min = 0;
        sessionUpdate.last_rest_time = new Date();
      }

      await Session.updateOne(
        { session_id: checkin.session_id },
        { $set: sessionUpdate, ...(completed ? { $inc: { total_rest_actions: 1 } } : {}) }
      );

      await NotificationLog.updateMany(
        { session_id: checkin.session_id, notification_type: "micro_rest_notification", user_action: { $in: ["pending", "snoozed"] } },
        { $set: { user_action: completed ? "acted" : "dismissed" } }
      );
    }

    res.status(201).json({ success: true, message: "Feedback recorded", data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating feedback", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const updateFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    const feedback = await FeedbackLog.findOneAndUpdate(
      { feedback_id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!feedback) {
      res.status(404).json({ success: false, message: "Feedback not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Feedback updated", data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating feedback", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

import { Request, Response } from "express";
import FeedbackLog from "../modal/feedbackLog";
import Participant from "../modal/participant";
import Phase2Checkin from "../modal/phase2Checkin";

export const getDashboardSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalCheckins, riskBreakdown, feedbackStats, participantCount, recentCheckins] = await Promise.all([
      Phase2Checkin.countDocuments(),
      Phase2Checkin.aggregate([
        { $group: { _id: "$risk_level", count: { $sum: 1 } } },
      ]),
      FeedbackLog.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: ["$completed", 1, 0] } },
            avg_usefulness: { $avg: "$usefulness_rating" },
            avg_timing: { $avg: "$timing_appropriate" },
            avg_disturbance: { $avg: "$work_disturbance" },
            avg_recovered: { $avg: "$recovered" },
          },
        },
      ]),
      Participant.countDocuments(),
      Phase2Checkin.find().sort({ createdAt: -1 }).limit(10).select("checkin_id participant_id date time_point risk_level dominant_issue selected_prompt total_risk_score"),
    ]);

    const riskMap: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
    riskBreakdown.forEach((r: { _id: string; count: number }) => {
      riskMap[r._id] = r.count;
    });

    const feedback = feedbackStats[0] || { total: 0, completed: 0, avg_usefulness: null, avg_timing: null, avg_disturbance: null, avg_recovered: null };

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total_checkins: totalCheckins,
          participant_count: participantCount,
          risk_distribution: riskMap,
          high_risk_pct: totalCheckins > 0 ? ((riskMap.High / totalCheckins) * 100).toFixed(1) : "0",
        },
        feedback: {
          total_feedback: feedback.total,
          completion_count: feedback.completed,
          completion_rate: feedback.total > 0 ? ((feedback.completed / feedback.total) * 100).toFixed(1) : "0",
          avg_usefulness: feedback.avg_usefulness ? Number(feedback.avg_usefulness.toFixed(2)) : null,
          avg_timing: feedback.avg_timing ? Number(feedback.avg_timing.toFixed(2)) : null,
          avg_disturbance: feedback.avg_disturbance ? Number(feedback.avg_disturbance.toFixed(2)) : null,
          avg_recovered: feedback.avg_recovered ? Number(feedback.avg_recovered.toFixed(2)) : null,
        },
        recent_checkins: recentCheckins,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching dashboard summary", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getParticipantSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const summary = await Phase2Checkin.aggregate([
      {
        $group: {
          _id: "$participant_id",
          total_checkins: { $sum: 1 },
          high_count: { $sum: { $cond: [{ $eq: ["$risk_level", "High"] }, 1, 0] } },
          medium_count: { $sum: { $cond: [{ $eq: ["$risk_level", "Medium"] }, 1, 0] } },
          low_count: { $sum: { $cond: [{ $eq: ["$risk_level", "Low"] }, 1, 0] } },
          avg_total_risk: { $avg: "$total_risk_score" },
          avg_eye: { $avg: "$eye_strain_score" },
          avg_discomfort: { $avg: "$body_discomfort_score" },
          avg_hr_deviation: { $avg: "$hr_deviation" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ success: true, count: summary.length, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching participant summary", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getPromptUsageSummary = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [promptUsage, feedbackByPrompt] = await Promise.all([
      Phase2Checkin.aggregate([
        { $group: { _id: "$selected_prompt", count: { $sum: 1 }, dominant_issues: { $addToSet: "$dominant_issue" } } },
        { $sort: { count: -1 } },
      ]),
      FeedbackLog.aggregate([
        {
          $lookup: {
            from: "phase2checkins",
            localField: "checkin_id",
            foreignField: "checkin_id",
            as: "checkin",
          },
        },
        { $unwind: "$checkin" },
        {
          $group: {
            _id: "$checkin.selected_prompt",
            completions: { $sum: { $cond: ["$completed", 1, 0] } },
            total_feedback: { $sum: 1 },
            avg_usefulness: { $avg: "$usefulness_rating" },
          },
        },
      ]),
    ]);

    const feedbackMap: Record<string, { completions: number; total_feedback: number; avg_usefulness: number | null }> = {};
    feedbackByPrompt.forEach((f: { _id: string; completions: number; total_feedback: number; avg_usefulness: number | null }) => {
      feedbackMap[f._id] = f;
    });

    const merged = promptUsage.map((p: { _id: string; count: number; dominant_issues: string[] }) => ({
      prompt: p._id,
      usage_count: p.count,
      dominant_issues: p.dominant_issues,
      ...(feedbackMap[p._id] || { completions: 0, total_feedback: 0, avg_usefulness: null }),
    }));

    res.status(200).json({ success: true, data: merged });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching prompt usage", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

export const getRiskTrendByTimePoint = async (_req: Request, res: Response): Promise<void> => {
  try {
    const trend = await Phase2Checkin.aggregate([
      {
        $group: {
          _id: { time_point: "$time_point", risk_level: "$risk_level" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.time_point",
          risks: { $push: { level: "$_id.risk_level", count: "$count" } },
          total: { $sum: "$count" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const ordered = ["Before Work", "11:00 AM", "1:00 PM", "3:00 PM", "After Work"];
    const result = ordered.map((tp) => {
      const found = trend.find((t: { _id: string; risks: { level: string; count: number }[]; total: number }) => t._id === tp);
      if (!found) return { time_point: tp, Low: 0, Medium: 0, High: 0, total: 0 };
      const riskMap: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
      found.risks.forEach((r: { level: string; count: number }) => { riskMap[r.level] = r.count; });
      return { time_point: tp, ...riskMap, total: found.total };
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching risk trend", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

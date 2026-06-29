import { ISession } from "../modal/session";

// Prototype thresholds (minutes) — configurable pending pilot tuning.
const INITIAL_WORK_PERIOD_MIN = 30;
const LONG_INTERVAL_MIN = 60;
const MEDIUM_INTERVAL_MIN = 30;
const SHORT_INTERVAL_MIN = 15;
const SHORT_FOLLOWUP_MIN = 15;
const SITTING_THRESHOLD_MIN = 60;
const SCREEN_THRESHOLD_MIN = 60;

export interface CheckinStatus {
  due: boolean;
  trigger_reason: string[];
  suggested_interval_minutes: number;
  escalate: boolean;
}

function minutesSince(date: Date | undefined, now: number): number {
  return date ? (now - date.getTime()) / 60000 : Infinity;
}

// Adaptive quick-check-in trigger logic — Section 6.2/6.3. The "decision point" (how often
// this function is invoked) is independent of the adaptive interval it computes.
export function computeCheckinStatus(session: ISession): CheckinStatus {
  const now = Date.now();
  const reasons: string[] = [];
  let due = false;

  const sinceLastCheckin = minutesSince(session.last_checkin_time, now);
  const sinceLastRest = minutesSince(session.last_rest_time, now);

  let interval = LONG_INTERVAL_MIN;

  if (!session.last_checkin_time) {
    const sinceStart = minutesSince(session.start_time, now);
    if (sinceStart >= INITIAL_WORK_PERIOD_MIN) {
      due = true;
      reasons.push("initial_work_period_elapsed");
    }
    interval = INITIAL_WORK_PERIOD_MIN;
  } else {
    if (session.previous_risk_level === "Medium") interval = MEDIUM_INTERVAL_MIN;
    if (session.previous_risk_level === "High") interval = SHORT_INTERVAL_MIN;
    if (session.previous_rest_status === "skipped" || session.previous_rest_status === "completed_worse" || session.previous_rest_status === "snoozed") {
      interval = Math.min(interval, SHORT_INTERVAL_MIN);
    }
    if (session.checkin_snooze_count >= 2) {
      interval = Math.min(interval, SHORT_INTERVAL_MIN);
    }

    if (sinceLastCheckin >= interval) {
      due = true;
      reasons.push("checkin_interval_elapsed");
    }
    if (session.previous_risk_level === "High" && sinceLastRest >= SHORT_FOLLOWUP_MIN) {
      due = true;
      reasons.push("high_risk_followup_due");
    }
  }

  if (session.sitting_duration_min >= SITTING_THRESHOLD_MIN) {
    due = true;
    reasons.push("sitting_threshold_crossed");
  }
  if (session.screen_exposure_min >= SCREEN_THRESHOLD_MIN) {
    due = true;
    reasons.push("screen_threshold_crossed");
  }

  return {
    due,
    trigger_reason: reasons,
    suggested_interval_minutes: interval,
    escalate: session.consecutive_high_risk_count >= 2,
  };
}

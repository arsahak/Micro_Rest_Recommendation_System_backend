import mongoose, { Document, Schema } from "mongoose";

export interface ISession extends Document {
  session_id: string;
  participant_id: string;
  session_date: Date;
  session_mode: "Baseline" | "Intervention";
  status: "active" | "ended";
  start_time: Date;
  end_time?: Date;
  sitting_duration_min: number;
  screen_exposure_min: number;
  last_checkin_time?: Date;
  last_rest_time?: Date;
  previous_risk_level?: "Low" | "Medium" | "High";
  previous_dominant_issue?: string;
  previous_rest_status?: "completed" | "completed_worse" | "skipped" | "snoozed";
  checkin_snooze_count: number;
  consecutive_high_risk_count: number;
  total_checkins: number;
  total_rest_actions: number;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    session_id: { type: String, required: true, unique: true, trim: true },
    participant_id: {
      type: String,
      required: [true, "Participant ID is required"],
      uppercase: true,
      trim: true,
      ref: "Participant",
    },
    session_date: { type: Date, required: true, default: Date.now },
    session_mode: { type: String, enum: ["Baseline", "Intervention"], required: true },
    status: { type: String, enum: ["active", "ended"], default: "active" },
    start_time: { type: Date, required: true, default: Date.now },
    end_time: { type: Date },
    sitting_duration_min: { type: Number, default: 0, min: 0 },
    screen_exposure_min: { type: Number, default: 0, min: 0 },
    last_checkin_time: { type: Date },
    last_rest_time: { type: Date },
    previous_risk_level: { type: String, enum: ["Low", "Medium", "High"] },
    previous_dominant_issue: { type: String },
    previous_rest_status: { type: String, enum: ["completed", "completed_worse", "skipped", "snoozed"] },
    checkin_snooze_count: { type: Number, default: 0, min: 0 },
    consecutive_high_risk_count: { type: Number, default: 0, min: 0 },
    total_checkins: { type: Number, default: 0, min: 0 },
    total_rest_actions: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

sessionSchema.index({ participant_id: 1, status: 1 });
sessionSchema.index({ participant_id: 1, session_date: -1 });

const Session = mongoose.model<ISession>("Session", sessionSchema);
export default Session;

import mongoose, { Document, Schema } from "mongoose";

export interface IPhase2Checkin extends Document {
  checkin_id: string;
  participant_id: string;
  date: Date;
  time_point: string;
  current_hr: number;
  fatigue_score: number;
  kss_score: number;
  eye_strain_score: number;
  body_discomfort_score: number;
  sitting_duration_min: number;
  screen_exposure_min?: number;
  hr_deviation: number;
  eye_risk: 0 | 1 | 2;
  discomfort_risk: 0 | 1 | 2;
  sitting_risk: 0 | 1 | 2;
  fatigue_risk: 0 | 1 | 2;
  kss_risk: 0 | 1 | 2;
  hr_risk: 0 | 1 | 2;
  total_risk_score: number;
  risk_level: "Low" | "Medium" | "High";
  dominant_issue: string;
  selected_prompt: string;
  instruction: string;
  duration: string;
  createdAt: Date;
  updatedAt: Date;
}

const phase2CheckinSchema = new Schema<IPhase2Checkin>(
  {
    checkin_id: { type: String, required: true, unique: true, trim: true },
    participant_id: {
      type: String,
      required: [true, "Participant ID is required"],
      uppercase: true,
      trim: true,
      ref: "Participant",
    },
    date: { type: Date, required: true, default: Date.now },
    time_point: {
      type: String,
      required: [true, "Time point is required"],
      enum: ["Before Work", "11:00 AM", "1:00 PM", "3:00 PM", "After Work"],
    },
    current_hr: { type: Number, required: true, min: 30, max: 220 },
    fatigue_score: { type: Number, required: true, min: 1, max: 7 },
    kss_score: { type: Number, required: true, min: 1, max: 9 },
    eye_strain_score: { type: Number, required: true, min: 1, max: 5 },
    body_discomfort_score: { type: Number, required: true, min: 1, max: 5 },
    sitting_duration_min: { type: Number, required: true, min: 0 },
    screen_exposure_min: { type: Number, min: 0 },
    hr_deviation: { type: Number, required: true },
    eye_risk: { type: Number, enum: [0, 1, 2], required: true },
    discomfort_risk: { type: Number, enum: [0, 1, 2], required: true },
    sitting_risk: { type: Number, enum: [0, 1, 2], required: true },
    fatigue_risk: { type: Number, enum: [0, 1, 2], required: true },
    kss_risk: { type: Number, enum: [0, 1, 2], required: true },
    hr_risk: { type: Number, enum: [0, 1, 2], required: true },
    total_risk_score: { type: Number, required: true },
    risk_level: { type: String, enum: ["Low", "Medium", "High"], required: true },
    dominant_issue: { type: String, required: true },
    selected_prompt: { type: String, required: true },
    instruction: { type: String, required: true },
    duration: { type: String, required: true },
  },
  { timestamps: true }
);

phase2CheckinSchema.index({ participant_id: 1, date: -1 });

const Phase2Checkin = mongoose.model<IPhase2Checkin>("Phase2Checkin", phase2CheckinSchema);
export default Phase2Checkin;

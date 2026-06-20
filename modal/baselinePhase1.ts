import mongoose, { Document, Schema } from "mongoose";

export interface IBaselinePhase1 extends Document {
  participant_id: string;
  date: Date;
  time_point: string;
  hr: number;
  fatigue_score: number;
  kss_score: number;
  eye_strain_score: number;
  body_discomfort_score: number;
  sitting_duration_min: number;
  rest_behavior?: "Free rest" | "No rest" | "Normal rest";
  createdAt: Date;
  updatedAt: Date;
}

const baselinePhase1Schema = new Schema<IBaselinePhase1>(
  {
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
    hr: { type: Number, required: true, min: 30, max: 220 },
    fatigue_score: { type: Number, required: true, min: 1, max: 7 },
    kss_score: { type: Number, required: true, min: 1, max: 9 },
    eye_strain_score: { type: Number, required: true, min: 1, max: 5 },
    body_discomfort_score: { type: Number, required: true, min: 1, max: 5 },
    sitting_duration_min: { type: Number, required: true, min: 0 },
    rest_behavior: {
      type: String,
      enum: ["Free rest", "No rest", "Normal rest"],
    },
  },
  { timestamps: true }
);

const BaselinePhase1 = mongoose.model<IBaselinePhase1>("BaselinePhase1", baselinePhase1Schema);
export default BaselinePhase1;

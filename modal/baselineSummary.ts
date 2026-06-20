import mongoose, { Document, Schema } from "mongoose";

export interface IBaselineSummary extends Document {
  participant_id: string;
  baseline_hr: number;
  baseline_fatigue: number;
  baseline_kss: number;
  baseline_eye_strain: number;
  baseline_discomfort: number;
  baseline_sitting_min: number;
  record_count: number;
  last_updated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const baselineSummarySchema = new Schema<IBaselineSummary>(
  {
    participant_id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      ref: "Participant",
    },
    baseline_hr: { type: Number, required: true },
    baseline_fatigue: { type: Number, required: true },
    baseline_kss: { type: Number, required: true },
    baseline_eye_strain: { type: Number, required: true },
    baseline_discomfort: { type: Number, required: true },
    baseline_sitting_min: { type: Number, required: true },
    record_count: { type: Number, default: 0 },
    last_updated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const BaselineSummary = mongoose.model<IBaselineSummary>("BaselineSummary", baselineSummarySchema);
export default BaselineSummary;

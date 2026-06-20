import mongoose, { Document, Schema } from "mongoose";

export interface IFeedbackLog extends Document {
  feedback_id: string;
  checkin_id: string;
  participant_id: string;
  completed: boolean;
  usefulness_rating?: number;
  timing_appropriate?: number;
  work_disturbance?: number;
  recovered?: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackLogSchema = new Schema<IFeedbackLog>(
  {
    feedback_id: { type: String, required: true, unique: true, trim: true },
    checkin_id: {
      type: String,
      required: [true, "Check-in ID is required"],
      trim: true,
      ref: "Phase2Checkin",
    },
    participant_id: {
      type: String,
      required: [true, "Participant ID is required"],
      uppercase: true,
      trim: true,
      ref: "Participant",
    },
    completed: { type: Boolean, required: true },
    usefulness_rating: { type: Number, min: 1, max: 5 },
    timing_appropriate: { type: Number, min: 1, max: 5 },
    work_disturbance: { type: Number, min: 1, max: 5 },
    recovered: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

feedbackLogSchema.index({ participant_id: 1 });
feedbackLogSchema.index({ checkin_id: 1 }, { unique: true });

const FeedbackLog = mongoose.model<IFeedbackLog>("FeedbackLog", feedbackLogSchema);
export default FeedbackLog;

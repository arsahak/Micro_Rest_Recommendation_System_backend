import mongoose, { Document, Schema } from "mongoose";

export interface IParticipant extends Document {
  participant_id: string;
  participant_label?: string;
  study_phase: "Baseline" | "Prototype-use" | "Completed";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<IParticipant>(
  {
    participant_id: {
      type: String,
      required: [true, "Participant ID is required"],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^P\d+$/, "Participant ID must be in format P01, P02, etc."],
    },
    participant_label: { type: String, trim: true },
    study_phase: {
      type: String,
      enum: ["Baseline", "Prototype-use", "Completed"],
      default: "Baseline",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

const Participant = mongoose.model<IParticipant>("Participant", participantSchema);
export default Participant;

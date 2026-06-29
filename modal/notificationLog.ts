import mongoose, { Document, Schema } from "mongoose";

export interface INotificationLog extends Document {
  notification_id: string;
  session_id: string;
  participant_id: string;
  timestamp: Date;
  notification_type: "quick_checkin_notification" | "micro_rest_notification" | "extended_rest_recommendation";
  trigger_reason: string[];
  message: string;
  user_action: "pending" | "acted" | "snoozed" | "dismissed";
  snooze_status: number;
  createdAt: Date;
  updatedAt: Date;
}

const notificationLogSchema = new Schema<INotificationLog>(
  {
    notification_id: { type: String, required: true, unique: true, trim: true },
    session_id: { type: String, required: true, ref: "Session" },
    participant_id: { type: String, required: true, uppercase: true, trim: true },
    timestamp: { type: Date, required: true, default: Date.now },
    notification_type: {
      type: String,
      enum: ["quick_checkin_notification", "micro_rest_notification", "extended_rest_recommendation"],
      required: true,
    },
    trigger_reason: { type: [String], default: [] },
    message: { type: String, required: true },
    user_action: { type: String, enum: ["pending", "acted", "snoozed", "dismissed"], default: "pending" },
    snooze_status: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

notificationLogSchema.index({ session_id: 1, notification_type: 1, user_action: 1 });
notificationLogSchema.index({ participant_id: 1, timestamp: -1 });

const NotificationLog = mongoose.model<INotificationLog>("NotificationLog", notificationLogSchema);
export default NotificationLog;

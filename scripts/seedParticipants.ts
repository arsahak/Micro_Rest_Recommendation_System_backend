import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db";
import Participant from "../modal/participant";
import BaselinePhase1 from "../modal/baselinePhase1";
import BaselineSummary from "../modal/baselineSummary";

dotenv.config();

const DEFAULT_PARTICIPANT_IDS = ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10"];

// A neutral "before work" resting baseline — used only as a usable default so every
// seeded participant can immediately take check-ins; real studies should overwrite
// this via the baseline entry form per Section 3.2.
const DEFAULT_BASELINE_ENTRY = {
  time_point: "Before Work" as const,
  hr: 70,
  fatigue_score: 2,
  kss_score: 3,
  eye_strain_score: 1,
  body_discomfort_score: 1,
  sitting_duration_min: 0,
  rest_behavior: "Normal rest" as const,
};

const seedParticipants = async (): Promise<void> => {
  try {
    await connectDB();
    console.log("✅ Connected to database");

    let participantsCreated = 0;
    let participantsSkipped = 0;
    let baselinesCreated = 0;
    let baselinesSkipped = 0;

    for (const participant_id of DEFAULT_PARTICIPANT_IDS) {
      const existingParticipant = await Participant.findOne({ participant_id });
      if (existingParticipant) {
        participantsSkipped++;
      } else {
        await Participant.create({ participant_id, study_phase: "Baseline" });
        participantsCreated++;
      }

      const existingSummary = await BaselineSummary.findOne({ participant_id });
      if (existingSummary) {
        baselinesSkipped++;
        continue;
      }

      await BaselinePhase1.create({ participant_id, ...DEFAULT_BASELINE_ENTRY });
      await BaselineSummary.create({
        participant_id,
        baseline_hr: DEFAULT_BASELINE_ENTRY.hr,
        baseline_fatigue: DEFAULT_BASELINE_ENTRY.fatigue_score,
        baseline_kss: DEFAULT_BASELINE_ENTRY.kss_score,
        baseline_eye_strain: DEFAULT_BASELINE_ENTRY.eye_strain_score,
        baseline_discomfort: DEFAULT_BASELINE_ENTRY.body_discomfort_score,
        baseline_sitting_min: DEFAULT_BASELINE_ENTRY.sitting_duration_min,
        record_count: 1,
        last_updated: new Date(),
      });
      baselinesCreated++;
    }

    console.log("========================================");
    console.log(`✅ Participants: ${participantsCreated} created, ${participantsSkipped} already existed`);
    console.log(`✅ Baselines: ${baselinesCreated} created, ${baselinesSkipped} already existed`);
    console.log(`   Participant IDs: ${DEFAULT_PARTICIPANT_IDS.join(", ")}`);
    console.log("========================================");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding participants:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedParticipants();

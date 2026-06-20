export type RiskScore = 0 | 1 | 2;

export interface FatigueInputs {
  current_hr: number;
  baseline_hr: number;
  eye_strain_score: number;
  body_discomfort_score: number;
  sitting_duration_min: number;
  fatigue_score: number;
  kss_score: number;
}

export interface FatigueCalculationResult {
  hr_deviation: number;
  eye_risk: RiskScore;
  discomfort_risk: RiskScore;
  sitting_risk: RiskScore;
  fatigue_risk: RiskScore;
  kss_risk: RiskScore;
  hr_risk: RiskScore;
  total_risk_score: number;
  risk_level: "Low" | "Medium" | "High";
  dominant_issue: string;
  selected_prompt: string;
  instruction: string;
  duration: string;
}

interface PromptData {
  selected_prompt: string;
  instruction: string;
  duration: string;
}

const PROMPT_MAP: Record<string, PromptData> = {
  "Visual Fatigue": {
    selected_prompt: "60-second Eye Break",
    instruction: "Look away from the screen and focus on a distant object.",
    duration: "60 seconds",
  },
  "Posture Discomfort": {
    selected_prompt: "Stretch or Posture Reset",
    instruction: "Gently stretch your neck and shoulders or reset your sitting posture.",
    duration: "1-2 minutes",
  },
  "Long Sitting": {
    selected_prompt: "Stand or Light Movement",
    instruction: "Stand up and move lightly near your desk.",
    duration: "2 minutes",
  },
  "Physiological Stress": {
    selected_prompt: "Breathing / Recovery Prompt",
    instruction: "Take slow controlled breaths for one minute.",
    duration: "1 minute",
  },
  "General Fatigue / Sleepiness": {
    selected_prompt: "Posture Reset or Breathing",
    instruction: "Sit upright, relax your shoulders, and take slow breaths.",
    duration: "1 minute",
  },
  "No Immediate Risk": {
    selected_prompt: "No Immediate Prompt",
    instruction: "Continue working normally. No micro-rest prompt is required at this moment.",
    duration: "-",
  },
};

function scoreEyeRisk(eye: number): RiskScore {
  if (eye >= 4) return 2;
  if (eye >= 3) return 1;
  return 0;
}

function scoreDiscomfortRisk(dis: number): RiskScore {
  if (dis >= 4) return 2;
  if (dis >= 3) return 1;
  return 0;
}

function scoreSittingRisk(sit: number): RiskScore {
  if (sit >= 120) return 2;
  if (sit >= 60) return 1;
  return 0;
}

function scoreFatigueRisk(fat: number): RiskScore {
  if (fat >= 5) return 2;
  if (fat >= 4) return 1;
  return 0;
}

function scoreKSSRisk(kss: number): RiskScore {
  if (kss >= 8) return 2;
  if (kss >= 6) return 1;
  return 0;
}

function scoreHRRisk(dev: number): RiskScore {
  if (dev >= 15) return 2;
  if (dev >= 8) return 1;
  return 0;
}

// Tie-priority order: Visual Fatigue > Posture Discomfort > Long Sitting > Physiological Stress > General Fatigue
function resolveDominantIssue(
  eyeR: RiskScore,
  disR: RiskScore,
  sitR: RiskScore,
  hrR: RiskScore,
  fatR: RiskScore,
  kssR: RiskScore,
  riskLevel: "Low" | "Medium" | "High"
): string {
  if (riskLevel === "Low") return "No Immediate Risk";

  const maxScore = Math.max(eyeR, disR, sitR, hrR, fatR, kssR);

  if (eyeR === maxScore) return "Visual Fatigue";
  if (disR === maxScore) return "Posture Discomfort";
  if (sitR === maxScore) return "Long Sitting";
  if (hrR === maxScore) return "Physiological Stress";
  return "General Fatigue / Sleepiness";
}

export function calculateFatigueRisk(inputs: FatigueInputs): FatigueCalculationResult {
  const { current_hr, baseline_hr, eye_strain_score, body_discomfort_score, sitting_duration_min, fatigue_score, kss_score } = inputs;

  const hrDeviation = current_hr - baseline_hr;

  const eyeR = scoreEyeRisk(eye_strain_score);
  const disR = scoreDiscomfortRisk(body_discomfort_score);
  const sitR = scoreSittingRisk(sitting_duration_min);
  const fatR = scoreFatigueRisk(fatigue_score);
  const kssR = scoreKSSRisk(kss_score);
  const hrR = scoreHRRisk(hrDeviation);

  const total = eyeR + disR + sitR + fatR + kssR + hrR;
  const riskLevel: "Low" | "Medium" | "High" = total >= 6 ? "High" : total >= 3 ? "Medium" : "Low";

  const dominantIssue = resolveDominantIssue(eyeR, disR, sitR, hrR, fatR, kssR, riskLevel);
  const promptData = PROMPT_MAP[dominantIssue];

  return {
    hr_deviation: hrDeviation,
    eye_risk: eyeR,
    discomfort_risk: disR,
    sitting_risk: sitR,
    fatigue_risk: fatR,
    kss_risk: kssR,
    hr_risk: hrR,
    total_risk_score: total,
    risk_level: riskLevel,
    dominant_issue: dominantIssue,
    ...promptData,
  };
}

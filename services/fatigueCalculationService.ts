export type RiskScore = 0 | 1 | 2;

export interface FatigueInputs {
  current_hr: number;
  baseline_hr: number;
  eye_strain_score: number;
  body_discomfort_score: number;
  sitting_duration_min: number;
  screen_exposure_min?: number;
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

// Categorical risk flags (0/1/2) — retained for the existing per-factor breakdown UI.
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

// Normalization to a 0-100 component score, per the spec's weighted risk formula.
function normalizeScale(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

// Sitting/screen bucket anchors (Low/Mild/Moderate/High -> 10/35/65/90).
function sittingScreenBucket(minutes: number): number {
  if (minutes >= 90) return 90;
  if (minutes >= 60) return 65;
  if (minutes >= 30) return 35;
  return 10;
}

// HR deviation component, banded per spec table with linear interpolation within each band.
function hrDeviationComponent(absDeviation: number): number {
  if (absDeviation <= 5) return (absDeviation / 5) * 20;
  if (absDeviation <= 10) return 21 + ((absDeviation - 6) / 4) * 19;
  if (absDeviation <= 20) return 41 + ((absDeviation - 11) / 9) * 29;
  return Math.min(100, 71 + ((absDeviation - 21) / 14) * 29);
}

interface NormalizedComponents {
  fatigueComponent: number;
  sleepinessComponent: number;
  eyeComponent: number;
  discomfortComponent: number;
  sittingScreenComponent: number;
  hrComponent: number;
}

// Dominant source: highest-scoring component wins. HR deviation can only dominate
// when combined with elevated fatigue or discomfort, never on its own.
function resolveDominantIssue(components: NormalizedComponents, riskLevel: "Low" | "Medium" | "High"): string {
  if (riskLevel === "Low") return "No Immediate Risk";

  const { fatigueComponent, sleepinessComponent, eyeComponent, discomfortComponent, sittingScreenComponent, hrComponent } = components;
  const generalFatigueComponent = (fatigueComponent + sleepinessComponent) / 2;
  const hrEligible = fatigueComponent >= 35 || discomfortComponent >= 35;

  const candidates: Array<[string, number]> = [
    ["Visual Fatigue", eyeComponent],
    ["Posture Discomfort", discomfortComponent],
    ["Long Sitting", sittingScreenComponent],
    ["General Fatigue / Sleepiness", generalFatigueComponent],
  ];
  if (hrEligible) candidates.push(["Physiological Stress", hrComponent]);

  candidates.sort((a, b) => b[1] - a[1]);
  return candidates[0][0];
}

export function calculateFatigueRisk(inputs: FatigueInputs): FatigueCalculationResult {
  const {
    current_hr,
    baseline_hr,
    eye_strain_score,
    body_discomfort_score,
    sitting_duration_min,
    screen_exposure_min,
    fatigue_score,
    kss_score,
  } = inputs;

  const hrDeviation = current_hr - baseline_hr;

  const eyeR = scoreEyeRisk(eye_strain_score);
  const disR = scoreDiscomfortRisk(body_discomfort_score);
  const sitR = scoreSittingRisk(sitting_duration_min);
  const fatR = scoreFatigueRisk(fatigue_score);
  const kssR = scoreKSSRisk(kss_score);
  const hrR = scoreHRRisk(hrDeviation);

  const components: NormalizedComponents = {
    fatigueComponent: normalizeScale(fatigue_score, 1, 7),
    sleepinessComponent: normalizeScale(kss_score, 1, 9),
    eyeComponent: normalizeScale(eye_strain_score, 1, 5),
    discomfortComponent: normalizeScale(body_discomfort_score, 1, 5),
    sittingScreenComponent: Math.max(sittingScreenBucket(sitting_duration_min), sittingScreenBucket(screen_exposure_min ?? 0)),
    hrComponent: hrDeviationComponent(Math.abs(hrDeviation)),
  };

  const totalRiskScore =
    0.2 * components.fatigueComponent +
    0.15 * components.sleepinessComponent +
    0.2 * components.eyeComponent +
    0.2 * components.discomfortComponent +
    0.15 * components.sittingScreenComponent +
    0.1 * components.hrComponent;

  const riskLevel: "Low" | "Medium" | "High" = totalRiskScore >= 65 ? "High" : totalRiskScore >= 35 ? "Medium" : "Low";

  const dominantIssue = resolveDominantIssue(components, riskLevel);
  const promptData = PROMPT_MAP[dominantIssue];

  return {
    hr_deviation: hrDeviation,
    eye_risk: eyeR,
    discomfort_risk: disR,
    sitting_risk: sitR,
    fatigue_risk: fatR,
    kss_risk: kssR,
    hr_risk: hrR,
    total_risk_score: Math.round(totalRiskScore * 10) / 10,
    risk_level: riskLevel,
    dominant_issue: dominantIssue,
    ...promptData,
  };
}

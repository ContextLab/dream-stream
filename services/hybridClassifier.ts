import type { SleepStage } from '@/types/database';
import type { BreathingAnalysis } from './sleep';
import type { VitalsSnapshot } from './healthConnect';
import {
  loadModel,
  isModelValid,
  classifyWithModel,
  getStageProportions,
  type StageProportions,
} from './sleepStageLearning';

export interface StageProbabilities {
  awake: number;
  light: number;
  deep: number;
  rem: number;
}

export interface SourceClassification {
  probabilities: StageProbabilities;
  confidence: number;
  available: boolean;
}

export interface HybridClassification {
  audio: SourceClassification;
  vitals: SourceClassification;
  fused: StageProbabilities;
  predictedStage: SleepStage;
  overallConfidence: number;
}

type ClassifiableStage = 'awake' | 'light' | 'deep' | 'rem';
const STAGES: ClassifiableStage[] = ['awake', 'light', 'deep', 'rem'];

let sessionStartTime: number | null = null;
const AWAKE_PRIOR_FADE_MS = 5 * 60 * 1000;

export function startHybridSession(): void {
  sessionStartTime = Date.now();
}

export function stopHybridSession(): void {
  sessionStartTime = null;
}

function getAwakePrior(): StageProbabilities {
  if (sessionStartTime === null) {
    return { awake: 0.25, light: 0.25, deep: 0.25, rem: 0.25 };
  }

  const elapsed = Date.now() - sessionStartTime;
  const fadeProgress = Math.min(1, elapsed / AWAKE_PRIOR_FADE_MS);

  const awakeBias = 0.7 * (1 - fadeProgress);
  const remaining = (1 - awakeBias) / 4;

  return {
    awake: remaining + awakeBias,
    light: remaining,
    deep: remaining,
    rem: remaining,
  };
}

function normalizeProbabilities(probs: StageProbabilities): StageProbabilities {
  const sum = probs.awake + probs.light + probs.deep + probs.rem;
  if (sum === 0) {
    return { awake: 0.25, light: 0.25, deep: 0.25, rem: 0.25 };
  }
  return {
    awake: probs.awake / sum,
    light: probs.light / sum,
    deep: probs.deep / sum,
    rem: probs.rem / sum,
  };
}

function classifyFromAudio(analysis: BreathingAnalysis | null): SourceClassification {
  if (!analysis || !analysis.isBreathingDetected) {
    return {
      probabilities: { awake: 0.25, light: 0.25, deep: 0.25, rem: 0.25 },
      confidence: 0,
      available: false,
    };
  }

  const {
    regularity,
    respiratoryRateVariability: rrv,
    movementIntensity,
    breathsPerMinute,
  } = analysis;

  let probs: StageProbabilities = { awake: 0, light: 0, deep: 0, rem: 0 };

  if (movementIntensity > 0.15 || regularity < 0.5) {
    probs.awake = 0.7;
    probs.light = 0.2;
    probs.deep = 0.05;
    probs.rem = 0.05;
  } else if (regularity > 0.85 && rrv < 0.1 && breathsPerMinute < 12) {
    probs.deep = 0.6;
    probs.light = 0.25;
    probs.rem = 0.1;
    probs.awake = 0.05;
  } else if (regularity > 0.7 && rrv > 0.25 && breathsPerMinute > 16 && movementIntensity < 0.08) {
    probs.rem = 0.55;
    probs.light = 0.25;
    probs.deep = 0.1;
    probs.awake = 0.1;
  } else if (regularity > 0.7 && regularity < 0.85) {
    probs.light = 0.5;
    probs.awake = 0.25;
    probs.deep = 0.15;
    probs.rem = 0.1;
  } else {
    probs.light = 0.4;
    probs.awake = 0.3;
    probs.deep = 0.15;
    probs.rem = 0.15;
  }

  const confidence = analysis.confidenceScore * (analysis.isBreathingDetected ? 1 : 0.3);

  return {
    probabilities: normalizeProbabilities(probs),
    confidence: Math.min(1, confidence),
    available: true,
  };
}

async function classifyFromVitals(vitals: VitalsSnapshot | null): Promise<SourceClassification> {
  if (!vitals || vitals.heartRate === null) {
    return {
      probabilities: { awake: 0.25, light: 0.25, deep: 0.25, rem: 0.25 },
      confidence: 0,
      available: false,
    };
  }

  const model = await loadModel();
  let probs: StageProbabilities = { awake: 0, light: 0, deep: 0, rem: 0 };
  let confidence = 0;

  if (isModelValid(model)) {
    for (const stage of STAGES) {
      const result = classifyWithModel(
        model,
        vitals.heartRate,
        vitals.hrv ?? null,
        vitals.respiratoryRate ?? null
      );
      if (result.stage === stage) {
        probs[stage] = result.confidence;
      }
    }

    const totalScore = STAGES.reduce((sum, stage) => sum + probs[stage], 0);
    if (totalScore > 0) {
      for (const stage of STAGES) {
        probs[stage] = probs[stage] / totalScore;
      }
    }

    const bestResult = classifyWithModel(
      model,
      vitals.heartRate,
      vitals.hrv ?? null,
      vitals.respiratoryRate ?? null
    );
    confidence = bestResult.confidence;

    if (totalScore === 0 && bestResult.stage !== 'any') {
      const resultStage = bestResult.stage;
      probs[resultStage] = 0.6;
      const remaining = 0.4 / 3;
      for (const stage of STAGES) {
        if (stage !== resultStage) {
          probs[stage] = remaining;
        }
      }
    }
  } else {
    const hr = vitals.heartRate;
    if (hr >= 65) {
      probs = { awake: 0.6, light: 0.25, deep: 0.1, rem: 0.05 };
    } else if (hr <= 50) {
      probs = { awake: 0.1, light: 0.3, deep: 0.5, rem: 0.1 };
    } else if (hr >= 55 && hr <= 65) {
      probs = { awake: 0.15, light: 0.4, deep: 0.2, rem: 0.25 };
    } else {
      probs = { awake: 0.2, light: 0.4, deep: 0.25, rem: 0.15 };
    }
    confidence = 0.4;
  }

  return {
    probabilities: normalizeProbabilities(probs),
    confidence,
    available: true,
  };
}

const HISTORICAL_PRIOR_WEIGHT = 0.15;

export async function classifyHybrid(
  audioAnalysis: BreathingAnalysis | null,
  vitals: VitalsSnapshot | null
): Promise<HybridClassification> {
  const audioResult = classifyFromAudio(audioAnalysis);
  const vitalsResult = await classifyFromVitals(vitals);

  const awakePrior = getAwakePrior();
  const historicalPrior = getStageProportions();

  const audioWeight = audioResult.available ? audioResult.confidence : 0;
  const vitalsWeight = vitalsResult.available ? vitalsResult.confidence : 0;
  const awakePriorWeight =
    sessionStartTime !== null
      ? 0.3 * (1 - Math.min(1, (Date.now() - sessionStartTime) / AWAKE_PRIOR_FADE_MS))
      : 0;
  const historicalWeight = historicalPrior !== null ? HISTORICAL_PRIOR_WEIGHT : 0;

  const totalWeight = audioWeight + vitalsWeight + awakePriorWeight + historicalWeight;

  let fused: StageProbabilities;

  if (totalWeight === 0) {
    fused = { awake: 0.7, light: 0.15, deep: 0.1, rem: 0.05 };
  } else {
    const normAudio = audioWeight / totalWeight;
    const normVitals = vitalsWeight / totalWeight;
    const normAwakePrior = awakePriorWeight / totalWeight;
    const normHistorical = historicalWeight / totalWeight;

    const hp: StageProbabilities = historicalPrior ?? {
      awake: 0.25,
      light: 0.25,
      deep: 0.25,
      rem: 0.25,
    };

    fused = {
      awake:
        normAudio * audioResult.probabilities.awake +
        normVitals * vitalsResult.probabilities.awake +
        normAwakePrior * awakePrior.awake +
        normHistorical * hp.awake,
      light:
        normAudio * audioResult.probabilities.light +
        normVitals * vitalsResult.probabilities.light +
        normAwakePrior * awakePrior.light +
        normHistorical * hp.light,
      deep:
        normAudio * audioResult.probabilities.deep +
        normVitals * vitalsResult.probabilities.deep +
        normAwakePrior * awakePrior.deep +
        normHistorical * hp.deep,
      rem:
        normAudio * audioResult.probabilities.rem +
        normVitals * vitalsResult.probabilities.rem +
        normAwakePrior * awakePrior.rem +
        normHistorical * hp.rem,
    };
  }

  fused = normalizeProbabilities(fused);

  let predictedStage: SleepStage = 'awake';
  let maxProb = 0;
  for (const stage of STAGES) {
    if (fused[stage] > maxProb) {
      maxProb = fused[stage];
      predictedStage = stage;
    }
  }

  const overallConfidence = Math.max(audioResult.confidence, vitalsResult.confidence);

  return {
    audio: audioResult,
    vitals: vitalsResult,
    fused,
    predictedStage,
    overallConfidence,
  };
}

export function isDataSourceActive(
  source: 'audio' | 'vitals',
  classification: HybridClassification
): boolean {
  if (source === 'audio') {
    return classification.audio.available && classification.audio.confidence > 0.1;
  }
  return classification.vitals.available && classification.vitals.confidence > 0.1;
}

export function getSourceStatus(classification: HybridClassification): {
  audioActive: boolean;
  vitalsActive: boolean;
  bothActive: boolean;
} {
  const audioActive = isDataSourceActive('audio', classification);
  const vitalsActive = isDataSourceActive('vitals', classification);
  return {
    audioActive,
    vitalsActive,
    bothActive: audioActive && vitalsActive,
  };
}

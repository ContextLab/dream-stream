/**
 * Temporal Smoothing for Sleep Stage Classification
 *
 * Implements a Hidden Markov Model (HMM) Forward Algorithm to prevent
 * rapid state switching ("jitter") in sleep stage classification.
 *
 * Key features:
 * 1. HMM Forward Algorithm - Uses transition matrix to smooth predictions
 * 2. Minimum Dwell Time - Prevents transitions within N seconds of last change
 * 3. Hysteresis - Requires higher confidence to exit a state than to enter
 * 4. Exponential smoothing of raw probabilities before HMM
 *
 * Based on sleep staging literature:
 * - Radha et al. 2019: Temporal context is critical for sleep staging
 * - Standard polysomnography uses 30-second epochs with transition rules
 */

import type { SleepStage3, Stage3Probabilities } from './remOptimizedClassifier';

// ============================================================================
// Configuration Constants
// ============================================================================

/** Minimum time (ms) to stay in a state before allowing transition */
const MIN_DWELL_TIME_MS = 60000; // 60 seconds - prevents rapid flickering

/** Minimum time in REM before allowing exit (REM cycles are typically 10-20 min) */
const MIN_REM_DWELL_TIME_MS = 120000; // 2 minutes

/** Exponential smoothing factor for raw probabilities (0-1, higher = more smoothing) */
const PROBABILITY_SMOOTHING_ALPHA = 0.3;

/** Confidence threshold multiplier for exiting current state (hysteresis) */
const EXIT_THRESHOLD_MULTIPLIER = 1.3;

/** Minimum probability difference required to change states */
const MIN_PROBABILITY_DELTA = 0.15;

// ============================================================================
// Types
// ============================================================================

interface SmootherState {
  beliefState: Stage3Probabilities;
  currentStage: SleepStage3;
  stageEntryTime: number;
  smoothedProbabilities: Stage3Probabilities;
  transitionCount: number;
  lastTransitionTime: number;
}

export interface SmoothingResult {
  stage: SleepStage3;
  probabilities: Stage3Probabilities;
  confidence: number;
  wasSmoothed: boolean;
  dwellTimeMs: number;
  transitionBlocked: boolean;
  blockReason: string | null;
}

// ============================================================================
// Module State
// ============================================================================

let state: SmootherState = {
  beliefState: { awake: 0.5, nrem: 0.4, rem: 0.1 },
  currentStage: 'awake',
  stageEntryTime: Date.now(),
  smoothedProbabilities: { awake: 0.5, nrem: 0.4, rem: 0.1 },
  transitionCount: 0,
  lastTransitionTime: Date.now(),
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Reset the temporal smoother state. Call when starting a new sleep session.
 */
export function resetTemporalSmoother(): void {
  const now = Date.now();
  state = {
    beliefState: { awake: 0.5, nrem: 0.4, rem: 0.1 },
    currentStage: 'awake',
    stageEntryTime: now,
    smoothedProbabilities: { awake: 0.5, nrem: 0.4, rem: 0.1 },
    transitionCount: 0,
    lastTransitionTime: now,
  };
}

/**
 * Get current smoother state for debugging/display.
 */
export function getSmootherState(): Readonly<SmootherState> {
  return { ...state };
}

/**
 * Apply temporal smoothing to sleep stage probabilities using HMM Forward Algorithm.
 *
 * @param rawProbabilities - Point-in-time probabilities from classifier
 * @param transitionMatrix - T[from][to] transition probabilities
 * @param minutesSinceSleepStart - Time context for REM likelihood
 * @returns Smoothed classification result
 */
export function smoothSleepStage(
  rawProbabilities: Stage3Probabilities,
  transitionMatrix: Record<SleepStage3, Record<SleepStage3, number>>,
  minutesSinceSleepStart: number
): SmoothingResult {
  const now = Date.now();
  const stages: SleepStage3[] = ['awake', 'nrem', 'rem'];

  const smoothedRaw = applyExponentialSmoothing(rawProbabilities, state.smoothedProbabilities);
  state.smoothedProbabilities = smoothedRaw;

  const hmmProbabilities = applyHMMForward(smoothedRaw, transitionMatrix);
  state.beliefState = hmmProbabilities;

  let candidateStage: SleepStage3 = 'nrem';
  let maxProb = 0;
  for (const stage of stages) {
    if (hmmProbabilities[stage] > maxProb) {
      maxProb = hmmProbabilities[stage];
      candidateStage = stage;
    }
  }

  const dwellTimeMs = now - state.stageEntryTime;
  let transitionBlocked = false;
  let blockReason: string | null = null;
  let finalStage = candidateStage;

  if (candidateStage !== state.currentStage) {
    const minDwell = state.currentStage === 'rem' ? MIN_REM_DWELL_TIME_MS : MIN_DWELL_TIME_MS;

    if (dwellTimeMs < minDwell) {
      transitionBlocked = true;
      blockReason = `Dwell time ${Math.round(dwellTimeMs / 1000)}s < min ${Math.round(minDwell / 1000)}s`;
      finalStage = state.currentStage;
    }

    if (!transitionBlocked) {
      const currentProb = hmmProbabilities[state.currentStage];
      const candidateProb = hmmProbabilities[candidateStage];
      const requiredDelta = MIN_PROBABILITY_DELTA * EXIT_THRESHOLD_MULTIPLIER;

      if (candidateProb - currentProb < requiredDelta) {
        transitionBlocked = true;
        blockReason = `Probability delta ${(candidateProb - currentProb).toFixed(3)} < required ${requiredDelta.toFixed(3)}`;
        finalStage = state.currentStage;
      }
    }

    if (!transitionBlocked && candidateStage === 'rem' && minutesSinceSleepStart < 60) {
      transitionBlocked = true;
      blockReason = `REM blocked: only ${minutesSinceSleepStart.toFixed(0)} min into sleep (need 60+)`;
      finalStage = state.currentStage;
    }
  }

  const wasSmoothed = finalStage !== candidateStage;
  if (finalStage !== state.currentStage) {
    state.currentStage = finalStage;
    state.stageEntryTime = now;
    state.transitionCount++;
    state.lastTransitionTime = now;
  }

  const sortedProbs = Object.values(hmmProbabilities).sort((a, b) => b - a);
  const confidence = sortedProbs[0] - sortedProbs[1] + 0.3;

  return {
    stage: finalStage,
    probabilities: hmmProbabilities,
    confidence: Math.min(1, Math.max(0, confidence)),
    wasSmoothed,
    dwellTimeMs,
    transitionBlocked,
    blockReason,
  };
}

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * Apply exponential moving average smoothing to probabilities.
 */
function applyExponentialSmoothing(
  current: Stage3Probabilities,
  previous: Stage3Probabilities
): Stage3Probabilities {
  const alpha = PROBABILITY_SMOOTHING_ALPHA;
  return {
    awake: alpha * current.awake + (1 - alpha) * previous.awake,
    nrem: alpha * current.nrem + (1 - alpha) * previous.nrem,
    rem: alpha * current.rem + (1 - alpha) * previous.rem,
  };
}

/**
 * Apply HMM Forward Algorithm update.
 *
 * For each state s_t:
 *   P(s_t | observations) ∝ P(observation | s_t) × Σ[P(s_t | s_{t-1}) × P(s_{t-1})]
 *
 * Where:
 * - P(observation | s_t) = rawProbabilities (emission/likelihood from sensors)
 * - P(s_t | s_{t-1}) = transitionMatrix (learned from historical data)
 * - P(s_{t-1}) = beliefState (our current belief)
 */
function applyHMMForward(
  likelihoods: Stage3Probabilities,
  transitionMatrix: Record<SleepStage3, Record<SleepStage3, number>>
): Stage3Probabilities {
  const stages: SleepStage3[] = ['awake', 'nrem', 'rem'];
  const nextBelief: Stage3Probabilities = { awake: 0, nrem: 0, rem: 0 };

  for (const toStage of stages) {
    let prediction = 0;
    for (const fromStage of stages) {
      prediction += state.beliefState[fromStage] * transitionMatrix[fromStage][toStage];
    }
    nextBelief[toStage] = prediction * likelihoods[toStage];
  }

  const sum = nextBelief.awake + nextBelief.nrem + nextBelief.rem;
  if (sum > 0) {
    nextBelief.awake /= sum;
    nextBelief.nrem /= sum;
    nextBelief.rem /= sum;
  } else {
    return { awake: 0.33, nrem: 0.34, rem: 0.33 };
  }

  return nextBelief;
}

// ============================================================================
// Diagnostic Functions
// ============================================================================

/**
 * Get diagnostic information about the smoother for debugging.
 */
export function getSmootherDiagnostics(): {
  currentStage: SleepStage3;
  beliefState: Stage3Probabilities;
  dwellTimeSeconds: number;
  transitionCount: number;
  timeSinceLastTransitionSeconds: number;
} {
  const now = Date.now();
  return {
    currentStage: state.currentStage,
    beliefState: { ...state.beliefState },
    dwellTimeSeconds: Math.round((now - state.stageEntryTime) / 1000),
    transitionCount: state.transitionCount,
    timeSinceLastTransitionSeconds: Math.round((now - state.lastTransitionTime) / 1000),
  };
}

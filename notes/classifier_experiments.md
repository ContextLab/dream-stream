# Sleep Stage Classifier Experiments

Date: 2026-01-14

## Problem Statement

The original classifier was predicting NREM for everything (0% REM sensitivity). Time-based predictions alone don't work because REM doesn't follow obvious patterns in this user's data.

## Data

- 469 sleep stages, 7591 HR samples from Fitbit
- 9 sleep sessions over ~30 days
- REM episodes: 66 total, mean duration 7.2min, never before 60min into session

## Key Findings

### Feature Distributions (window=15)

| Stage | RMSSD Mean | RMSSD Range | CV Mean | CV Range  |
| ----- | ---------- | ----------- | ------- | --------- |
| Awake | 3.37       | 0.71-13.15  | 0.37    | 0.06-0.91 |
| NREM  | 2.87       | 0.38-25.03  | 0.27    | 0.01-1.47 |
| REM   | 3.24       | 1.31-12.45  | 0.19    | 0.01-0.91 |

**Key insight**: Features overlap heavily, but **REM has lower CV (0.19)** than NREM (0.27). REM has MORE STABLE variability.

### Temporal Patterns

- REM never occurs before 60 min (hard rule)
- REM increases with sleep cycle: 0% → 12% → 17% → 26-30%
- After REM: 49% wake, 51% NREM (never REM→REM)

### Transition Probabilities (from actual data)

```
From awake: → nrem 89%, → rem 10%
From nrem:  → awake 43%, → nrem 37%, → rem 20%
From rem:   → awake 49%, → nrem 51%, → rem 0%
```

## Approaches Tested

| Approach                    | F1        | Sensitivity | Specificity | Notes                    |
| --------------------------- | --------- | ----------- | ----------- | ------------------------ |
| Simple RMSSD threshold      | 29.9%     | 82.3%       | 21.9%       | Too many false positives |
| CV-based (thresh=0.55)      | 34.1%     | 50.0%       | 67.0%       | Better balance           |
| HMM Viterbi                 | 2.8%      | 1.5%        | 98.1%       | Too conservative         |
| **Hybrid (cv=0.2, tw=0.5)** | **39.4%** | **81.3%**   | **46.7%**   | Best overall             |

## Best Approach: Hybrid Classifier

Combines ultradian rhythm timing with CV-based confirmation:

1. **Time-based prior**: REM probability increases with cycle position
   - 0-70 min: 0% (hard block)
   - Cycle 1 (70-90 min): 10%
   - Cycle 2+: increases by ~8% per cycle
   - Position 0.65+ in cycle: 2x boost

2. **CV-based confirmation**: Low CV (<0.30) indicates stable HR = REM likely

3. **Consecutive signal requirement**: Need 2+ consecutive REM signals before predicting REM

4. **Hysteresis**: Stay in REM if borderline score when already in REM

### Optimal Parameters

- CV threshold: 0.20
- Time weight: 0.5, CV weight: 0.5
- Consecutive signals required: 2

## Implementation Notes

For TypeScript classifier:

```typescript
// Key thresholds
const FIRST_REM_LATENCY = 70; // minutes
const CV_THRESHOLD = 0.2;
const CYCLE_LENGTH = 90; // minutes
const REM_WINDOW_START = 0.65; // position in cycle

// CV calculation
function computeCV(rmssdHistory: number[]): number {
  if (rmssdHistory.length < 3) return 0.5;
  const mean = rmssdHistory.reduce((a, b) => a + b, 0) / rmssdHistory.length;
  if (mean < 0.1) return 0.5;
  const variance = rmssdHistory.reduce((a, v) => a + (v - mean) ** 2, 0) / rmssdHistory.length;
  return Math.sqrt(variance) / mean;
}

// Time-based REM probability
function getRemProbability(minutes: number): number {
  if (minutes < 70) return 0;
  const cycle = Math.floor(minutes / 90);
  const position = (minutes % 90) / 90;
  const baseProb = Math.min(0.35, 0.1 + cycle * 0.08);
  return position >= 0.65 ? baseProb * 2.0 : baseProb * 0.3;
}
```

## What Didn't Work

1. **Kalman filtering**: Smoothed signal too much, lost discriminative info
2. **Pure RMSSD thresholds**: Features overlap too much
3. **HMM Viterbi**: Transition matrix made it too hard to reach REM state
4. **Gaussian process**: Would be useful but sparse data limits benefit

## Recommendations

1. The hybrid approach provides best balance for dream induction
2. For lucid dreaming apps, high sensitivity (81%) is more important than precision
3. False positives (predicting REM during NREM) are acceptable - worst case is playing prompt during deep sleep
4. False negatives (missing REM) means missing dreaming opportunities

## Files Created

- `scripts/analyze_sleep_hr.py` - Initial HR analysis
- `scripts/simulate_classifier.py` - Baseline classifier simulation
- `scripts/classifier_experiments.py` - Systematic threshold sweeps
- `scripts/analyze_features.py` - Feature distribution analysis
- `scripts/analyze_patterns.py` - Temporal pattern analysis
- `scripts/cv_classifier.py` - CV-based classifier
- `scripts/hmm_classifier.py` - HMM with Viterbi
- `scripts/hybrid_classifier.py` - Best performing hybrid approach

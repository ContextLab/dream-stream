# Session Notes: Sleep Stage Classifier Debugging (2026-01-14)

## RESULT: SUCCESS - REM Sensitivity: 85.7%

The fix worked! Classifier now achieves 85.7% REM sensitivity on device (vs 81.3% in Python reference).

## Problem

The hybrid sleep stage classifier achieves 81.3% REM sensitivity in Python but shows 0% on the Android device.

## Root Cause Found

**The TypeScript validation was not processing sleep sessions correctly:**

1. Sleep stages from Health Connect came in **reverse chronological order** (newest first)
2. The validation used `sleepStages[0].startTime` as session start - which was actually the END of the most recent session
3. All stages were processed as ONE continuous session instead of separate nights
4. This caused `minutesSinceSleepStart` to be wildly incorrect (spanning days instead of hours)

## Fix Applied

Added `identifySleepSessions()` function to TypeScript that:

1. Sorts stages by startTime (ascending)
2. Groups stages into sessions separated by >4 hour gaps
3. Processes each session independently with fresh state
4. Matches the Python implementation behavior

## Key Algorithm Parameters (must match between Python and TypeScript)

```
CV_THRESHOLD = 0.20           // Lower CV = more stable = more likely REM
REM_CONSECUTIVE_REQUIRED = 2  // Need 2 consecutive signals to predict REM
MAX_RECENT_HR_SAMPLES = 20
MAX_RMSSD_HISTORY = 10
ULTRADIAN_CYCLE_MINUTES = 90
FIRST_REM_LATENCY = 70 min    // No REM predicted before 70 minutes
```

## Data Issue Fixed

Fixed malformed timestamp in `notes/raw_sleep_data.json`:

- Before: `'2026-26-01-06T20:07:00Z'` (invalid month=26)
- After: `'2026-01-06T20:07:00Z'`

## Files Modified

- `services/remOptimizedClassifier.ts` - Added `identifySleepSessions()` function, modified `runValidation()` to process sessions separately
- `notes/raw_sleep_data.json` - Fixed malformed timestamp at index 4086
- `scripts/debug_python_vs_ts.py` - Created debug script showing intermediate values

## Python Classifier Results (Reference)

```
Best parameters: CV_thresh=0.2, time_weight=0.5

Confusion Matrix:
              Predicted:  Awake    NREM     REM
  Actual awake:            0      56      60
  Actual nrem :           12     334     398
  Actual rem  :            0      37     161

Metrics:
  Accuracy:        46.8%
  REM Sensitivity: 81.3%
  REM Specificity: 46.7%
  REM Precision:   26.0%
  REM F1:          39.4%
```

## Next Steps

1. Run classifier training on device with the fixed code
2. Verify REM sensitivity matches Python (~81%)
3. If still 0%, add debug logging to TypeScript to compare intermediate values

## Key Insight

REM sleep has **MORE STABLE** heart rate variability than NREM:

- REM CV: 0.19 (lower = more stable)
- NREM CV: 0.27 (higher = more variable)

This is counterintuitive - one might expect REM to have more variable HR due to dream activity, but physiologically REM has stable, regulated breathing.

## Final Results on Device

```
VALIDATION RESULTS (Leave-one-out cross-validation)
Overall Accuracy: 41.5%
Total samples:    3223

REM DETECTION METRICS (Key for dream induction):
  Sensitivity: 85.7% (true REM detected)
  Specificity: 41.2% (non-REM correctly rejected)

Per-stage accuracy:
  Awake: 0.2%
  NREM:  41.0%
  REM:   85.7%

Confusion Matrix:
           Predicted:  Awake   NREM    REM
  Actual Awake:            1    198    310
  Actual NREM:            15    906   1289
  Actual REM:              4     68    432
```

Validation logs confirmed proper session identification:

```
[Validation] Found 9 sleep sessions from 469 stages
[Validation] Session 0: 66 stages, starts 2026-01-07T06:03:00.000Z
[Validation] Session 2: 45 stages, starts 2026-01-08T06:54:30.000Z
...
[Validation] Session 8: 55 stages, starts 2026-01-14T05:27:00.000Z
[Validation] Total samples processed: 3223
[Validation] Confusion matrix: rem->rem=432, rem->nrem=68, nrem->rem=1289
```

## Git Commits

- Previous: e313954 (Sort HR samples by time in validation)
- This session: Fix session identification in validation (sort stages, process sessions separately)
  Continue debugging the sleep stage classifier. The main fix (session identification in TypeScript validation) has been applied but not yet tested on device.

The device needs Health Connect permissions granted first. After that:

1. Go to Settings > Train 3-Class (REM-Optimized)
2. Wait for training to complete
3. Check if REM sensitivity is now ~81% (matching Python)

If still 0%, add console.log statements to runValidation() printing:

- Number of sessions found
- Session start times
- Sample count per session
- CV values when remScore > 0.25

Phone connected via ADB at ~/Library/Android/sdk/platform-tools/adb

```

```

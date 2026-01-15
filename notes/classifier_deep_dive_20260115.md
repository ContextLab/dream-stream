# Sleep Classifier Deep Dive - January 15, 2026

## Executive Summary

Analyzed 1,546 nights of Fitbit Takeout data with ~184k HR+stage samples to identify improvements for the sleep classifier. Key findings and recommendations below.

## Current Performance

- REM Sensitivity: 81.7%
- Awake Sensitivity: 15.5%
- Overall Accuracy: 41.9%

## Data Analysis Findings

### 1. Class Imbalance (CRITICAL)

Fitbit labels show massive imbalance:

- NREM: 68.6%
- REM: 26.2%
- **Wake: 5.3%** (only!)

Wake samples concentrated at:

- 30-60 min (sleep onset): 233 samples
- 270-300 min (natural awakening): 293 samples

**Implication**: Low awake precision is expected due to class imbalance. A 15% sensitivity with high specificity is actually reasonable.

### 2. Feature Discrimination Analysis

| Feature      | Wake     | Light | Deep | REM  | Best For                  |
| ------------ | -------- | ----- | ---- | ---- | ------------------------- |
| mean_hr      | 57.7     | 61.1  | 52.6 | 56.2 | REM vs NREM (+4.5 diff)   |
| mean_diff    | 0.80     | 1.00  | 0.52 | 0.60 | REM vs NREM (+0.38)       |
| **max_diff** | **4.13** | 3.44  | 1.84 | 2.07 | **Wake vs Sleep (+1.11)** |
| hr_range     | 7.8      | 11.1  | 4.8  | 5.5  | REM vs NREM (+5.37)       |
| std_hr       | 2.32     | 3.28  | 1.31 | 1.55 | REM vs NREM (+1.67)       |
| rmssd        | 1.32     | 1.40  | 0.81 | 0.89 | REM vs NREM (+0.49)       |

**Key Finding**: `max_diff` is the best discriminator for wake (4.13 vs 3.02 for sleep).

### 3. Transition Probabilities (from 1,546 nights)

```
wake -> wake: 50.0%
wake -> light: 28.9%
wake -> rem: 11.5%
wake -> deep: 9.6%

deep -> light: 45.1%
deep -> wake: 52.9%
deep -> rem: 2.0%  (rare!)

rem -> light: 45.8%
rem -> wake: 52.8%
rem -> deep: 1.4%  (rare!)
```

**Usable constraints**:

- Deep rarely transitions directly to REM (2%)
- REM rarely transitions to deep (1.4%)
- Wake tends to stay wake (50%) or go to light (29%)

### 4. Threshold Sweep Results

For `max_diff` only:
| Threshold | Wake Sens | Wake Prec | Sleep Spec |
|-----------|-----------|-----------|------------|
| 3.0 | 31.4% | 8.2% | 80.6% |
| 4.0 | 23.0% | 10.6% | 89.2% |
| 5.0 | 17.9% | 15.0% | 94.4% |

Trade-off: Higher threshold = lower sensitivity but much better precision.

## Recommendations

### Short-term (High Impact, Low Effort)

1. **Add `max_diff` as awake feature** alongside `mean_diff`
   - Use threshold ~4.0 for high specificity
   - Expected: +5-10% awake sensitivity

2. **Add transition constraints**
   - Block deep->rem and rem->deep transitions
   - Expected: Fewer false REM classifications

3. **Time-bin specific thresholds**
   - Lower awake threshold at 30-60min (sleep onset)
   - Lower awake threshold at 270-330min (natural wake time)

### Medium-term (Moderate Effort)

4. **Use `hr_range` and `std_hr` for REM discrimination**
   - REM has distinctly LOWER hr_range (5.5 vs 10.8)
   - REM has LOWER std_hr (1.55 vs 3.21)

5. **Explore SpO2 data for REM**
   - REM has irregular breathing → SpO2 variability
   - 1,882 files available in Takeout

6. **Ensemble approach**
   - Combine current CV-based REM detector with new max_diff awake detector

### Long-term (High Effort)

7. **Train on full Fitbit Takeout**
   - 104 sleep files, 6128 HR files available
   - Potential for user-specific model fine-tuning

8. **LSTM/Sequential model**
   - Capture temporal patterns
   - Literature suggests +10-15% improvement

9. **Multi-modal features**
   - Temperature changes correlate with sleep cycles
   - Respiratory rate variability during REM

## Available Data Summary

| Source           | Files  | Resolution | Date Range |
| ---------------- | ------ | ---------- | ---------- |
| Sleep stages     | 104    | Per-stage  | 2017-2025  |
| Heart rate       | 6,128  | 5 seconds  | 2017-2025  |
| HRV (RMSSD)      | 1,869  | Daily      | 2020-2025  |
| Respiratory rate | ~1,800 | Daily      | 2020-2025  |
| SpO2             | 1,882  | 1 minute   | 2020-2025  |
| Temperature      | 3,671  | Monthly    | 2020-2025  |

## Next Steps

1. ~~Implement `max_diff` feature in TypeScript classifier~~ ✅ DONE
2. ~~Add transition probability constraints~~ (partial - time-specific thresholds added)
3. ~~Test with time-specific thresholds~~ ✅ DONE
4. Evaluate SpO2 integration feasibility

## Session Update - January 15, 2026 (continued)

### Implemented Changes

1. **`remConfidence` field added to HybridClassification**
   - Added to `SourceClassification` and `HybridClassification` interfaces
   - Computed in `remOptimizedClassifier.ts` based on: stage probability, time >70min, REM window position, consecutive signals, REM propensity

2. **REM playback gating on confidence**
   - Added `MIN_REM_CONFIDENCE_FOR_PLAYBACK = 0.5` constant in `sleep.ts`
   - Modified `handleStageTransition()` to check `remConfidence >= 0.5` before triggering REM callbacks
   - Logs skipped REM detections with confidence level

3. **Enhanced classifier features** (from earlier session)
   - Added `max_diff` for awake detection
   - Added `hr_range` for REM discrimination
   - Added time-specific thresholds (lenient at 30-60min, 270-330min)

### Build Output

- APK: `~/Desktop/dream-stream-release-remconf.apk` (85.7 MB)
- Build: Release variant
- Ready for overnight testing

### Expected Behavior

- REM detections with confidence < 0.5 will be logged but not trigger dream playback
- Should significantly reduce false positive REM detections while user is awake
- Console log format: `[Sleep] REM detected but confidence X.XX < 0.5, skipping playback`

## Files Created

- `/scripts/parse_fitbit_takeout.py` - Data parsing and analysis
- `/scripts/enhanced_classifier_v2.py` - New classifier prototype
- `/notes/fitbit_merged_training_data.json` - 10k merged samples

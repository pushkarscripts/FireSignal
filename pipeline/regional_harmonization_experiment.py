"""FireSignal H16: held-out regional MODIS/VIIRS empirical adjustment.

Run from repository root:
  python pipeline/regional_harmonization_experiment.py

The MODIS monthly OGCD series is a comparison target, NOT fire ground truth.
No missing region-month is treated as zero.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import pandas as pd

TRAIN = range(2013, 2022)
VALID = range(2022, 2024)
TEST = range(2024, 2026)
REGIONAL_SHRINK = 24  # pseudo-observation strength toward national factor
SEASONAL_SHRINK = 6  # same calendar-month shrinkage strength as national experiment
MIN_REPORT_TEST = 12


def metrics(frame: pd.DataFrame, col: str) -> dict:
    if frame.empty:
        return {"n": 0, "mae": None, "rmse": None, "bias": None}
    err = frame[col].to_numpy(dtype=float) - frame["MODIS"].to_numpy(dtype=float)
    return {"n": len(frame), "mae": round(float(abs(err).mean()), 2),
            "rmse": round(float(math.sqrt((err * err).mean())), 2),
            "bias": round(float(err.mean()), 2)}


def slope(frame: pd.DataFrame, fallback: float) -> float:
    denom = float((frame["VIIRS"] ** 2).sum())
    return float((frame["VIIRS"] * frame["MODIS"]).sum() / denom) if denom > 0 else fallback


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="data/historical/regional_monthly_5km.csv")
    ap.add_argument("--national", default="frontend/public/data/harmonization_results.json")
    ap.add_argument("--output", default="frontend/public/data/regional_harmonization_results.json")
    args = ap.parse_args()

    raw = pd.read_csv(args.input)
    required = {"sensor", "shapeName", "month", "occupied_grid_cell_days"}
    if not required.issubset(raw.columns):
        raise ValueError(f"Missing regional columns: {required - set(raw.columns)}")
    if raw.duplicated(["sensor", "shapeName", "month"]).any():
        raise ValueError("Duplicate sensor/region/month rows")
    if (raw.occupied_grid_cell_days < 0).any():
        raise ValueError("Negative regional OGCD")

    national = json.loads(Path(args.national).read_text(encoding="utf-8"))
    national_global = float(national["global_factor"])
    national_seasonal = {int(k): float(v) for k, v in national["seasonal_factors"].items()}
    if set(national_seasonal) != set(range(1, 13)):
        raise ValueError("National seasonal factors must cover all 12 months")

    wide = raw.pivot(index=["shapeName", "month"], columns="sensor",
                     values="occupied_grid_cell_days").reset_index()
    wide["year"] = wide.month.str[:4].astype(int)
    wide["calendar_month"] = wide.month.str[5:7].astype(int)
    wide = wide[wide.year.between(2013, 2025)].copy()
    split_frames = {
        "train": wide[wide.year.isin(TRAIN)],
        "validation": wide[wide.year.isin(VALID)],
        "test": wide[wide.year.isin(TEST)],
    }
    availability = {}
    for label, frame in split_frames.items():
        availability[label] = {
            "paired": int(frame[["MODIS", "VIIRS"]].notna().all(axis=1).sum()),
            "modis_only": int((frame.MODIS.notna() & frame.VIIRS.isna()).sum()),
            "viirs_only": int((frame.VIIRS.notna() & frame.MODIS.isna()).sum()),
        }
    paired = {name: frame.dropna(subset=["MODIS", "VIIRS"]).copy()
              for name, frame in split_frames.items()}
    train = paired["train"]
    if train.empty:
        raise ValueError("No training pairs")

    # Learn state-specific global slopes on training data only.
    # Shrink the state estimate toward the already-fitted national factor.
    # n is number of paired training months, not number of hotspot detections.
    region_factors: dict[str, float] = {}
    seasonal_factors: dict[str, dict[int, float]] = {}
    training_counts: dict[str, int] = {}
    for region, sub in train.groupby("shapeName"):
        n = len(sub)
        training_counts[region] = n
        local = slope(sub, national_global)
        region_factor = (n * local + REGIONAL_SHRINK * national_global) / (n + REGIONAL_SHRINK)
        region_factors[region] = region_factor
        seasonal_factors[region] = {}
        for m in range(1, 13):
            month_sub = sub[sub.calendar_month == m]
            month_local = slope(month_sub, region_factor)
            seasonal_factors[region][m] = (
                len(month_sub) * month_local + SEASONAL_SHRINK * region_factor
            ) / (len(month_sub) + SEASONAL_SHRINK)

    candidates = ["raw_viirs", "national_global", "national_seasonal",
                  "regional_global", "regional_seasonal"]

    def predict(frame: pd.DataFrame) -> pd.DataFrame:
        out = frame.copy()
        out["raw_viirs"] = out.VIIRS
        out["national_global"] = out.VIIRS * national_global
        out["national_seasonal"] = out.VIIRS * out.calendar_month.map(national_seasonal)
        out["regional_global"] = out.VIIRS * out.shapeName.map(
            lambda r: region_factors.get(r, national_global))
        out["regional_seasonal"] = out.apply(
            lambda r: r.VIIRS * seasonal_factors.get(r.shapeName, national_seasonal).get(
                int(r.calendar_month), national_seasonal[int(r.calendar_month)]), axis=1)
        return out

    validation = predict(paired["validation"])
    test = predict(paired["test"])
    validation_metrics = {name: metrics(validation, name) for name in candidates}
    # One model selected for ALL regions; no region-specific test-time selection.
    chosen = min(candidates, key=lambda name: (
        validation_metrics[name]["mae"], validation_metrics[name]["rmse"]))
    test_metrics = {name: metrics(test, name) for name in candidates}

    per_region = []
    for region, sub in test.groupby("shapeName"):
        score = {name: metrics(sub, name) for name in candidates}
        per_region.append({
            "region": region,
            "train_paired_months": training_counts.get(region, 0),
            "test_paired_months": len(sub),
            "sparse_test": len(sub) < MIN_REPORT_TEST,
            "metrics": score,
            "selected_improves_on_raw": score[chosen]["mae"] < score["raw_viirs"]["mae"],
            "selected_improves_on_national_seasonal": (
                score[chosen]["mae"] < score["national_seasonal"]["mae"]),
        })
    per_region.sort(key=lambda r: r["region"])
    robust = [r for r in per_region if not r["sparse_test"]]

    output = {
        "title": "Regional 5 km OGCD cross-sensor held-out evaluation",
        "status": "empirical_statistical_adjustment_not_physical_calibration",
        "splits": {"train": "2013-2021", "validation": "2022-2023", "test": "2024-2025"},
        "availability": availability,
        "method": {
            "target": "MODIS regional monthly occupied grid-cell-days, not ground truth",
            "pairing": "only months with both sensor detections; missing is not zero",
            "national": "existing fitted national global and seasonal factors from H13",
            "regional_global": "regional least-squares slope through origin, shrunk to national global factor",
            "regional_seasonal": "regional calendar-month slopes shrunk to regional global slope",
            "regional_shrinkage": REGIONAL_SHRINK,
            "seasonal_shrinkage": SEASONAL_SHRINK,
            "selection": "one model for all regions: lowest pooled validation MAE, RMSE tiebreak",
            "sparse_threshold": MIN_REPORT_TEST,
        },
        "selected_model": chosen,
        "validation_metrics": validation_metrics,
        "test_metrics": test_metrics,
        "per_region_test": per_region,
        "region_summary": {
            "test_regions": len(per_region),
            "regions_with_at_least_12_test_pairs": len(robust),
            "sparse_regions": len(per_region) - len(robust),
            "robust_regions_improved_vs_raw": sum(r["selected_improves_on_raw"] for r in robust),
            "robust_regions_improved_vs_national_seasonal": sum(
                r["selected_improves_on_national_seasonal"] for r in robust),
        },
        "limitations": [
            "MODIS is a comparison target, not independent fire ground truth.",
            "Not physical sensor calibration, burned area, or individual fire counts.",
            "Missing region-months excluded; coverage and non-detections not independently verified.",
            "Regions differ in area, detection counts, and number of paired months.",
            "Pooled errors are weighted by available region-months, not equal regions.",
            "Time-dependent and spatially correlated pairs make metrics descriptive.",
            "Test results must not be used to retune models.",
            "Regional boundary snapshot represents 2011, not time-varying boundaries.",
        ],
    }
    path = Path(args.output)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("FireSignal H16 | Regional held-out comparison | NOT physical calibration")
    for name, stats in availability.items():
        print(f"{name:11} paired={stats['paired']:4} MODIS-only={stats['modis_only']:3} VIIRS-only={stats['viirs_only']:3}")
    print("VALIDATION:")
    for name, score in validation_metrics.items():
        print(f"  {name:20} MAE={score['mae']:10,.2f} RMSE={score['rmse']:10,.2f}")
    print("Selected:", chosen)
    print("HELD-OUT TEST:")
    for name, score in test_metrics.items():
        print(f"  {name:20} MAE={score['mae']:10,.2f} RMSE={score['rmse']:10,.2f}")
    print("Regional summary:", output["region_summary"])
    print("Saved:", path)


if __name__ == "__main__":
    main()

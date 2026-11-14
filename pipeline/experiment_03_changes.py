
from pathlib import Path

import pandas as pd
from scipy.stats import pearsonr, spearmanr

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "processed"

path = DATA / "experiment_02_daily_comparison.csv"
df = pd.read_csv(path, parse_dates=["date"])
df = df.sort_values("date").set_index("date")

expected = pd.date_range(df.index.min(), df.index.max())
if not df.index.is_unique or not df.index.equals(expected):
    raise ValueError("Expected one observation per consecutive day")

changes = df[["modis", "viirs"]].diff().dropna()

pearson = pearsonr(changes["modis"], changes["viirs"])
spearman = spearmanr(changes["modis"], changes["viirs"])

same_direction = (
    (changes["modis"] > 0) & (changes["viirs"] > 0)
) | (
    (changes["modis"] < 0) & (changes["viirs"] < 0)
)

both_changed = (
    (changes["modis"] != 0) & (changes["viirs"] != 0)
)

direction_agreement = (
    same_direction[both_changed].mean()
    if both_changed.any() else float("nan")
)

print("FIRESIGNAL — EXPERIMENT 03")
print("DAY-TO-DAY CHANGE AGREEMENT")
print("=" * 45)
print(f"Daily changes compared: {len(changes)}")
print(f"Change Pearson r: {pearson.statistic:.4f}")
print(f"Change Spearman rho: {spearman.statistic:.4f}")
print(
    "Direction agreement: "
    f"{direction_agreement * 100:.2f}%"
)
print(f"Days with both sensors changing: {both_changed.sum()}")

changes.to_csv(DATA / "experiment_03_daily_changes.csv")

import json

summary = {
    "experiment": "daily_changes_03",
    "grid_km": 5,
    "days_compared": len(changes),
    "pearson": float(pearson.statistic),
    "spearman": float(spearman.statistic),
    "direction_agreement_pct": float(
        direction_agreement * 100
    ),
    "days_with_both_changing": int(both_changed.sum()),
}

with open(
    DATA / "experiment_03_summary.json",
    "w",
    encoding="utf-8",
) as file:
    json.dump(summary, file, indent=2)

print("\nEXPERIMENT 03 COMPLETED")

from pathlib import Path
import json

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.stats import pearsonr, spearmanr

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "processed"
FIGURES = ROOT / "data" / "figures"
FIGURES.mkdir(parents=True, exist_ok=True)


def load_daily(sensor):
    path = DATA / f"{sensor}_daily_5km.csv"

    if not path.exists():
        raise FileNotFoundError(path)

    df = pd.read_csv(path, parse_dates=["date"])

    if df["date"].duplicated().any():
        raise ValueError(f"Duplicate dates: {sensor}")

    return df.set_index("date")[
        "occupied_grid_cells"
    ].rename(sensor)


def main():
    print("FIRESIGNAL — EXPERIMENT 02")
    print("DAILY CROSS-SENSOR AGREEMENT")
    print("=" * 50)

    modis = load_daily("modis")
    viirs = load_daily("viirs")

    # Inner join: compare only matching dates.
    df = pd.concat([modis, viirs], axis=1).dropna()

    if len(df) < 3:
        raise ValueError("Insufficient overlapping dates")

    if (df < 0).any().any():
        raise ValueError("Negative activity detected")

    if df["modis"].nunique() < 2 or df["viirs"].nunique() < 2:
        raise ValueError("Cannot correlate constant series")

    pearson = pearsonr(df["modis"], df["viirs"])
    spearman = spearmanr(df["modis"], df["viirs"])

    # Daily ratios are undefined when MODIS is zero.
    valid = df["modis"] > 0
    ratios = df.loc[valid, "viirs"] / df.loc[valid, "modis"]

    print(f"Overlapping dates: {len(df)}")
    print(f"Pearson correlation: {pearson.statistic:.4f}")
    print(f"Spearman correlation: {spearman.statistic:.4f}")
    print(f"Median daily ratio: {ratios.median():.4f}")
    print(f"Ratio IQR: {ratios.quantile(.25):.4f} - "
          f"{ratios.quantile(.75):.4f}")
    print(f"Days with MODIS > 0: {valid.sum()}")

    df.to_csv(DATA / "experiment_02_daily_comparison.csv")

    summary = {
        "experiment": "daily_agreement_02",
        "grid_km": 5,
        "days": len(df),
        "pearson_r": float(pearson.statistic),
        "spearman_rho": float(spearman.statistic),
        "median_daily_ratio": float(ratios.median()),
        "ratio_q25": float(ratios.quantile(.25)),
        "ratio_q75": float(ratios.quantile(.75)),
        "days_with_modis_positive": int(valid.sum()),
        "limitations": [
            "Only March-May 2023",
            "Daily values include unverified observation coverage",
            "No overpass-time matching",
            "No confidence filtering",
            "Correlation is not calibration or ground truth",
        ],
    }

    with open(
        DATA / "experiment_02_summary.json",
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(summary, f, indent=2)

    # Plot 1: Daily activity
    fig, ax = plt.subplots(figsize=(12, 5))
    ax.plot(df.index, df["modis"], label="MODIS", linewidth=1.5)
    ax.plot(df.index, df["viirs"], label="VIIRS", linewidth=1.5)
    ax.set_title("India: Daily Occupied Grid-Cell-Days (5 km)")
    ax.set_ylabel("Occupied grid-cell-days")
    ax.set_xlabel("Date")
    ax.legend()
    ax.grid(alpha=0.2)
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(FIGURES / "daily_activity.png", dpi=160)
    plt.close(fig)

    # Plot 2: Sensor agreement
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.scatter(df["modis"], df["viirs"], alpha=0.65)
    ax.set_xlabel("MODIS occupied grid-cell-days")
    ax.set_ylabel("VIIRS occupied grid-cell-days")
    ax.set_title(
        f"Daily Cross-Sensor Agreement\n"
        f"Pearson r = {pearson.statistic:.3f}"
    )
    ax.grid(alpha=0.2)
    fig.tight_layout()
    fig.savefig(FIGURES / "sensor_agreement.png", dpi=160)
    plt.close(fig)

    print("\nSaved:")
    print("  experiment_02_daily_comparison.csv")
    print("  experiment_02_summary.json")
    print("  figures/daily_activity.png")
    print("  figures/sensor_agreement.png")
    print("\nEXPERIMENT 02 COMPLETED")


if __name__ == "__main__":
    main()

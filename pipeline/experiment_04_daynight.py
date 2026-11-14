
from pathlib import Path
from zipfile import ZipFile

import numpy as np
import pandas as pd
from pyproj import Transformer
from scipy.stats import pearsonr, spearmanr

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"

FILES = {
    "MODIS": "DL_FIRE_M-C61_828178.zip",
    "VIIRS": "DL_FIRE_SV-C2_828179.zip",
}

TRANSFORMER = Transformer.from_crs(
    "EPSG:4326", "EPSG:6933", always_xy=True
)

GRID_METRES = 5000

def load_data(filename):
    with ZipFile(RAW / filename) as archive:
        csv_files = [
            name for name in archive.namelist()
            if name.lower().endswith(".csv")
        ]

        if len(csv_files) != 1:
            raise ValueError("Expected exactly one CSV")

        with archive.open(csv_files[0]) as file:
            df = pd.read_csv(file)

    if not df["daynight"].isin(["D", "N"]).all():
        raise ValueError("Unexpected daynight values")

    x, y = TRANSFORMER.transform(
        df["longitude"].to_numpy(),
        df["latitude"].to_numpy(),
    )

    if not (np.isfinite(x).all() and np.isfinite(y).all()):
        raise ValueError("Invalid coordinates")

    df["cell_x"] = np.floor(
        x / GRID_METRES
    ).astype(np.int64)

    df["cell_y"] = np.floor(
        y / GRID_METRES
    ).astype(np.int64)

    df["date"] = pd.to_datetime(df["acq_date"])

    return df

def daily_occupied(df, period):
    subset = df.loc[df["daynight"] == period]

    unique = subset.drop_duplicates(
        ["date", "cell_x", "cell_y"]
    )

    daily = unique.groupby("date").size()

    dates = pd.date_range(
        "2023-03-01", "2023-05-31"
    )

    return daily.reindex(dates, fill_value=0)

def main():
    print("FIRESIGNAL — EXPERIMENT 04")
    print("DAY/NIGHT SENSOR COMPARISON")
    print("=" * 48)

    data = {
        sensor: load_data(filename)
        for sensor, filename in FILES.items()
    }

    for period, label in [
        ("D", "DAYTIME"),
        ("N", "NIGHTTIME"),
    ]:
        modis = daily_occupied(data["MODIS"], period)
        viirs = daily_occupied(data["VIIRS"], period)

        if modis.nunique() < 2 or viirs.nunique() < 2:
            print(f"\n{label}: Insufficient variation")
            continue

        pearson = pearsonr(modis, viirs).statistic
        spearman = spearmanr(modis, viirs).statistic

        modis_total = int(modis.sum())
        viirs_total = int(viirs.sum())

        ratio = (
            viirs_total / modis_total
            if modis_total else float("nan")
        )

        print(f"\n{label}")
        print("-" * 30)
        print(f"MODIS OGCD: {modis_total:,}")
        print(f"VIIRS OGCD: {viirs_total:,}")
        print(f"VIIRS/MODIS ratio: {ratio:.3f}")
        print(f"Daily Pearson r: {pearson:.4f}")
        print(f"Daily Spearman rho: {spearman:.4f}")

    print("\nEXPERIMENT 04 COMPLETED")

if __name__ == "__main__":
    main()
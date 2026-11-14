
from pathlib import Path
from zipfile import ZipFile
import json

import numpy as np
import pandas as pd
from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUTPUT = ROOT / "data" / "processed"
OUTPUT.mkdir(parents=True, exist_ok=True)

DATASETS = {
    "MODIS": "DL_FIRE_M-C61_828178.zip",
    "VIIRS": "DL_FIRE_SV-C2_828179.zip",
}

GRID_SIZES_KM = [1, 5, 10]

# Equal-area projection; coordinates in metres.
# Fixed origin makes cell IDs consistent across sensors.
CRS = "EPSG:6933"

def load_sensor(sensor, filename):
    path = RAW / filename

    with ZipFile(path) as archive:
        csvs = [
            name for name in archive.namelist()
            if name.lower().endswith(".csv")
        ]

        if len(csvs) != 1:
            raise ValueError(
                f"{sensor}: Expected exactly one CSV"
            )

        with archive.open(csvs[0]) as file:
            df = pd.read_csv(file)

    required = {
        "latitude", "longitude", "acq_date"
    }

    if not required.issubset(df.columns):
        raise ValueError(
            f"{sensor}: Missing required columns"
        )

    df["acq_date"] = pd.to_datetime(
        df["acq_date"], errors="raise"
    )

    transformer = Transformer.from_crs(
        "EPSG:4326", CRS, always_xy=True
    )

    x, y = transformer.transform(
        df["longitude"].to_numpy(),
        df["latitude"].to_numpy()
    )

    df["x_m"] = x
    df["y_m"] = y

    if not (
        np.isfinite(x).all()
        and np.isfinite(y).all()
    ):
        raise ValueError(
            f"{sensor}: Invalid projected coordinates"
        )

    return df

def aggregate_grid(df, grid_km):
    cell_size = grid_km * 1000

    cell_x = np.floor(
        df["x_m"].to_numpy() / cell_size
    ).astype(np.int64)

    cell_y = np.floor(
        df["y_m"].to_numpy() / cell_size
    ).astype(np.int64)

    cells = pd.DataFrame({
        "date": df["acq_date"].to_numpy(),
        "cell_x": cell_x,
        "cell_y": cell_y,
    })

    # One contribution per grid cell per UTC date.
    unique_cells = cells.drop_duplicates(
        ["date", "cell_x", "cell_y"]
    )

    daily = (
        unique_cells.groupby("date")
        .size()
        .rename("occupied_grid_cells")
        .reset_index()
    )

    # Explicit zeroes for dates without qualifying
    # detections inside the requested period.
    # These are not proof of complete sensor coverage.
    full_dates = pd.date_range(
        df["acq_date"].min(),
        df["acq_date"].max(),
        freq="D",
    )

    daily = (
        daily.set_index("date")
        .reindex(
            full_dates,
            fill_value=0,
        )
        .rename_axis("date")
        .reset_index()
    )

    daily["month"] = (
        daily["date"].dt.strftime("%Y-%m")
    )

    monthly = (
        daily.groupby("month")[
            "occupied_grid_cells"
        ]
        .sum()
        .reset_index()
    )

    return unique_cells, daily, monthly

def main():
    print("FIRESIGNAL — EXPERIMENT 01")
    print("COMMON SPATIAL GRID HARMONIZATION")
    print("=" * 55)

    datasets = {
        sensor: load_sensor(sensor, filename)
        for sensor, filename in DATASETS.items()
    }

    results = []

    for grid_km in GRID_SIZES_KM:
        print(f"\nGRID SIZE: {grid_km} km")
        print("-" * 40)

        totals = {}

        for sensor, df in datasets.items():
            cells, daily, monthly = aggregate_grid(
                df, grid_km
            )

            total = len(cells)
            totals[sensor] = total

            print(
                f"{sensor}: {total:,} "
                "occupied grid-cell-days"
            )

            if grid_km == 5:
                daily["sensor"] = sensor
                monthly["sensor"] = sensor

                daily.to_csv(
                    OUTPUT / f"{sensor.lower()}_daily_5km.csv",
                    index=False,
                )

                monthly.to_csv(
                    OUTPUT / f"{sensor.lower()}_monthly_5km.csv",
                    index=False,
                )

        ratio = (
            totals["VIIRS"] / totals["MODIS"]
            if totals["MODIS"] else None
        )

        print(
            "VIIRS/MODIS OGCD ratio:",
            round(ratio, 3) if ratio is not None
            else "undefined"
        )

        results.append({
            "grid_km": grid_km,
            "modis_ogcd": totals["MODIS"],
            "viirs_ogcd": totals["VIIRS"],
            "ratio": ratio,
        })

    raw_ratio = (
        len(datasets["VIIRS"])
        / len(datasets["MODIS"])
    )

    summary = {
        "experiment": "common_grid_01",
        "period": {
            "start": "2023-03-01",
            "end": "2023-05-31",
        },
        "projection": CRS,
        "metric": "occupied_grid_cell_days",
        "raw_detection_ratio": raw_ratio,
        "grid_results": results,
        "limitations": [
            "Not unique fire counts",
            "No correction for observation opportunities",
            "No statistical cross-sensor calibration",
            "Zero-detection dates do not prove coverage",
            "One three-month overlap sample only",
        ],
    }

    with open(
        OUTPUT / "experiment_01_summary.json",
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(summary, file, indent=2)

    print("\nRAW VIIRS/MODIS RATIO:", round(raw_ratio, 3))
    print("EXPERIMENT 01 COMPLETED")
    print("Outputs saved in data/processed/")

if __name__ == "__main__":
    main()
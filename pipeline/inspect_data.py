
from pathlib import Path
from zipfile import ZipFile
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"

DATASETS = {
    "MODIS": "DL_FIRE_M-C61_828178.zip",
    "VIIRS": "DL_FIRE_SV-C2_828179.zip",
}

REQUIRED_COLUMNS = {
    "latitude", "longitude", "acq_date",
    "acq_time", "satellite", "confidence",
    "frp", "daynight"
}


def inspect_dataset(sensor, filename):
    path = RAW / filename

    if not path.exists():
        raise FileNotFoundError(f"Missing dataset: {path}")

    with ZipFile(path) as archive:
        csv_files = [
            name for name in archive.namelist()
            if name.lower().endswith(".csv")
        ]

        if len(csv_files) != 1:
            raise ValueError(
                f"Expected one CSV in {filename}, "
                f"found {len(csv_files)}"
            )

        with archive.open(csv_files[0]) as file:
            df = pd.read_csv(file)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"{sensor}: Missing columns {missing}")

    dates = pd.to_datetime(df["acq_date"], errors="raise")

    print(f"\n{'=' * 45}")
    print(f"DATASET: {sensor}")
    print(f"{'=' * 45}")
    print(f"Total detections: {len(df):,}")
    print(f"Start date: {dates.min().date()}")
    print(f"End date: {dates.max().date()}")
    print(f"Unique dates: {dates.nunique()}")
    print(f"Satellite counts:\n{df['satellite'].value_counts()}")
    print(f"Day/night counts:\n{df['daynight'].value_counts()}")
    print(f"Missing values: {df.isna().sum().sum():,}")

    return df


def main():
    print("FIRESIGNAL — NASA DATA INSPECTION")

    results = {}

    for sensor, filename in DATASETS.items():
        results[sensor] = inspect_dataset(sensor, filename)

    modis = results["MODIS"]
    viirs = results["VIIRS"]

    ratio = len(viirs) / len(modis)

    print("\nRAW DETECTION COMPARISON")
    print(f"MODIS: {len(modis):,}")
    print(f"VIIRS: {len(viirs):,}")
    print(f"Raw record ratio (VIIRS/MODIS): {ratio:.2f}")
    print("WARNING: This is NOT a fire-count ratio.")
    print("\nINSPECTION COMPLETED SUCCESSFULLY")


if __name__ == "__main__":
    main()

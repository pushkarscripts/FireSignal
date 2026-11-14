"""
FireSignal — Reproducible Analysis Runner

Runs the scientific experiments and exports dashboard data.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT / "pipeline"
PROCESSED = ROOT / "data" / "processed"
PUBLIC_DATA = ROOT / "frontend" / "public" / "data"

SCRIPTS = [
    "inspect_data.py",
    "experiment_01_grid.py",
    "experiment_02_agreement.py",
    "experiment_03_changes.py",
    "experiment_04_daynight.py",
    "export_analyzer.py",
]


def run_script(name):
    print(f"\n{'=' * 60}", flush=True)
    print(f"Running: {name}", flush=True)
    print("=" * 60, flush=True)

    subprocess.run(
        [sys.executable, str(PIPELINE / name)],
        cwd=ROOT,
        check=True,
    )


def export_daily_comparison():
    source = PROCESSED / "experiment_02_daily_comparison.csv"
    destination = PUBLIC_DATA / "daily_comparison.json"

    import pandas as pd

    df = pd.read_csv(source)

    if "date" not in df.columns:
        raise ValueError(
            "Expected a 'date' column in daily comparison CSV"
        )

    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)

    records = df.to_dict(orient="records")

    with destination.open("w", encoding="utf-8") as file:
        json.dump(records, file, indent=2, allow_nan=False)

    print(f"Exported {len(records)} daily records to {destination}")


def main():
    print("FIRESIGNAL — COMPLETE SCIENTIFIC PIPELINE", flush=True)

    for script in SCRIPTS:
        run_script(script)

    export_daily_comparison()

    print("\n" + "=" * 60)
    print("ALL EXPERIMENTS COMPLETED SUCCESSFULLY")
    print("=" * 60)
    print("Dashboard data is ready in frontend/public/data/")


if __name__ == "__main__":
    main()

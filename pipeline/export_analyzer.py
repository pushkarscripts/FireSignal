
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent.parent
PROCESSED = ROOT / "data" / "processed"
PUBLIC = ROOT / "frontend" / "public" / "data"

PUBLIC.mkdir(parents=True, exist_ok=True)

with open(
    PROCESSED / "experiment_01_summary.json",
    encoding="utf-8"
) as file:
    grid = json.load(file)

with open(
    PROCESSED / "experiment_02_summary.json",
    encoding="utf-8"
) as file:
    agreement = json.load(file)

analyzer = {
    "period": "2023-03-01 to 2023-05-31",
    "region": "India",
    "grid_comparison": grid["grid_results"],
    "raw_ratio": grid["raw_detection_ratio"],
    "daily_agreement": {
        "pearson": agreement["pearson_r"],
        "spearman": agreement["spearman_rho"],
        "median_ratio": agreement["median_daily_ratio"],
    },
    "daily_change_agreement": {
        "pearson": 0.4776,
        "spearman": 0.5366,
        "direction_agreement_pct": 65.93,
    },
    "daynight": [
        {
            "period": "Daytime",
            "modis_ogcd": 22588,
            "viirs_ogcd": 127900,
            "pearson": 0.8762,
            "spearman": 0.9147,
        },
        {
            "period": "Nighttime",
            "modis_ogcd": 3599,
            "viirs_ogcd": 43755,
            "pearson": 0.7316,
            "spearman": 0.7934,
        },
    ],
    "calibration_status": "not_validated",
}

with open(
    PUBLIC / "sensor_analyzer.json",
    "w",
    encoding="utf-8"
) as file:
    json.dump(analyzer, file, indent=2)

print("Sensor analyzer data exported successfully")

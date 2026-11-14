"""FireSignal automated regression tests for scientific pipeline contracts and dataset schemas.

Uses Python's standard library unittest (zero extra dependencies).
"""
import calendar
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGIONAL_DATA_PATH = ROOT / "frontend" / "public" / "data" / "regional_monthly_5km.json"
GEOJSON_DATA_PATH = ROOT / "frontend" / "public" / "data" / "india_adm1_simplified.geojson"


class TestScientificContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(REGIONAL_DATA_PATH, "r", encoding="utf-8") as f:
            cls.regional = json.load(f)
        with open(GEOJSON_DATA_PATH, "r", encoding="utf-8") as f:
            cls.geojson = json.load(f)

    def test_pipeline_metadata_invariants(self):
        """Pipeline projection, grid resolution, and metric specifications."""
        self.assertEqual(self.regional["metric"], "regional occupied grid-cell-days")
        self.assertEqual(self.regional["projection"], "EPSG:6933")
        self.assertEqual(self.regional["gridKm"], 5)
        self.assertEqual(self.regional["boundaryYear"], 2011)
        self.assertEqual(len(self.regional["regions"]), 36)

    def test_boundary_name_matching(self):
        """All 36 regional dataset regions match boundary GeoJSON 1-to-1."""
        geo_names = [f["properties"]["shapeName"] for f in self.geojson["features"]]
        self.assertEqual(len(geo_names), 36)
        self.assertEqual(len(set(geo_names)), 36, "Boundary names must be distinct")
        self.assertEqual(set(self.regional["regions"]), set(geo_names))

    def test_record_data_types_and_bounds(self):
        """Every monthly record has valid non-negative numbers and bounded days."""
        valid_sensors = {"MODIS", "VIIRS"}
        for i, rec in enumerate(self.regional["records"]):
            self.assertIn(rec["sensor"], valid_sensors, f"Invalid sensor at {i}")
            self.assertIsInstance(rec["ogcd"], (int, float))
            self.assertGreaterEqual(rec["ogcd"], 0)
            self.assertIsInstance(rec["daysWithDetections"], int)
            self.assertGreaterEqual(rec["daysWithDetections"], 0)

            # Monthly detection days <= calendar days in that month
            year, month = map(int, rec["month"].split("-"))
            _, max_days = calendar.monthrange(year, month)
            self.assertLessEqual(
                rec["daysWithDetections"],
                max_days,
                f"Record {i} exceeds month length: {rec}",
            )

    def test_sensor_lifetime_windows(self):
        """MODIS records span 2003-2025; VIIRS records span 2013-2025."""
        modis_years = {
            int(r["month"][:4]) for r in self.regional["records"] if r["sensor"] == "MODIS"
        }
        viirs_years = {
            int(r["month"][:4]) for r in self.regional["records"] if r["sensor"] == "VIIRS"
        }

        self.assertEqual(min(modis_years), 2003)
        self.assertEqual(max(modis_years), 2025)
        self.assertEqual(min(viirs_years), 2013)
        self.assertEqual(max(viirs_years), 2025)

        # No pre-2013 VIIRS records
        self.assertFalse(any(y < 2013 for y in viirs_years))

    def test_lakshadweep_isolated_no_record_state(self):
        """Lakshadweep has zero records in the dataset, while all 35 other regions have records."""
        observed_regions = {r["region"] for r in self.regional["records"]}
        missing = set(self.regional["regions"]) - observed_regions
        self.assertEqual(missing, {"Lakshadweep"})
        self.assertEqual(len(observed_regions), 35)


if __name__ == "__main__":
    unittest.main()

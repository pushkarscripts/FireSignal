# 🔥 FireSignal

### Making satellite fire observations easier to compare.

**FireSignal** is an interactive scientific dashboard exploring differences between NASA MODIS and VIIRS active-fire hotspot observations.

Developed for the **2026 NASA Space Apps Challenge — Harmonization of MODIS and VIIRS Hot Spots**.

**[Explore Live Dashboard](https://firesignal.vercel.app/)** | **[Scientific Methodology](METHODOLOGY.md)**

---

## The Problem

NASA's MODIS and VIIRS instruments provide valuable active-fire observations, but their measurements cannot be directly compared as though they came from identical sensors.

Differences in spatial resolution, sensitivity, observation schedules, and detection characteristics complicate the interpretation of hotspot counts.

A higher detection count does not necessarily mean more unique fires or a larger burned area.

## Our Solution

FireSignal provides an exploratory framework for comparing active-fire observations on a common spatial grid.

The dashboard includes:

- **Fire Activity Overview:** Compare MODIS and VIIRS daily occupied grid-cell activity.
- **Sensor Shift Analyzer:** Examine differences across 1 km, 5 km, and 10 km spatial grids.
- **Temporal Agreement Diagnostics:** Compare daily correlations and day-to-day changes.
- **Day/Night Comparison:** Explore how sensor differences vary between daytime and nighttime observations.
- **Scientific Transparency:** Display limitations and explicitly distinguish exploratory comparisons from validated calibration.

## Scientific Approach

FireSignal uses **occupied grid-cell-days (OGCD)** to reduce the influence of multiple hotspot detections within the same grid cell on the same day.

The analysis:

1. Reads NASA FIRMS MODIS and VIIRS hotspot datasets.
2. Projects coordinates into EPSG:6933.
3. Aggregates detections into common spatial grids.
4. Compares daily activity and temporal agreement.
5. Evaluates grid-size sensitivity and day/night differences.
6. Exports reproducible results to an interactive React dashboard.

The primary grid resolution is 5 km, with 1 km and 10 km sensitivity analyses.

## Key Findings

The current demonstration uses active-fire hotspot observations for India from March 1 to May 31, 2023.

| Indicator | Result |
|---|---:|
| MODIS raw detections | 37,269 |
| VIIRS raw detections | 313,980 |
| MODIS 5 km OGCD | 25,700 |
| VIIRS 5 km OGCD | 160,672 |
| Daily Pearson correlation | 0.8841 |
| Day-to-day change Pearson correlation | 0.4776 |
| Direction agreement | 65.93% |
| Daytime VIIRS/MODIS OGCD ratio | 5.66× |
| Nighttime VIIRS/MODIS OGCD ratio | 12.16× |

**Key insight:** MODIS and VIIRS exhibit strong agreement in broad daily activity patterns, but substantially weaker agreement in day-to-day changes. The difference between daytime and nighttime detection ratios also highlights why raw hotspot counts should not be treated as interchangeable measurements.

These findings are exploratory and specific to the selected datasets and period.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Visualizations | Recharts |
| Data processing | Python, pandas, NumPy |
| Spatial analysis | pyproj |
| Statistical analysis | SciPy |
| Deployment | Vercel |

## Running the Dashboard Locally

Requirements: Node.js and npm.

```bash
cd frontend
npm install
npm run dev
```

Open the local address displayed by Vite.

The dashboard reads precomputed JSON data from `frontend/public/data/`. Running the Python pipeline is not necessary to view the existing demonstration.

## Data and Reproducibility

Source data were downloaded from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/).

The original NASA archive ZIP files are not included in this repository.

The Python scripts in `pipeline/` perform the scientific analysis and generate the data used by the frontend.

See [METHODOLOGY.md](METHODOLOGY.md) for the dataset scope, calculation details, findings, and limitations.

## Important Scientific Limitations

FireSignal does not currently perform validated cross-sensor calibration.

Its common-grid comparisons do not correct for all differences in satellite resolution, observation opportunities, sensitivity, confidence classification, or overpass timing.

Active-fire hotspot detections are not equivalent to unique fires, burned area, or independently verified fire events.

The current dataset covers one three-month period and does not support conclusions about long-term fire trends.

## Project Status

**Functional research prototype — calibration not validated.**

Future work could include observation-opportunity normalization, overpass-aware matching, independent validation, and multi-year seasonal comparisons.

## Acknowledgments

This project uses NASA FIRMS active-fire data derived from MODIS and VIIRS satellite observations.

Developed as an independent project for the NASA Space Apps Challenge 2026.
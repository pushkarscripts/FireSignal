# FireSignal

**Harmonizing MODIS and VIIRS Fire Hotspot Observations**

FireSignal is an interactive scientific platform developed for
the NASA Space Apps Challenge 2026 challenge,
"Harmonization of MODIS and VIIRS Hot Spots."

It explores historical active-fire hotspot observations
across India and evaluates statistical methods for making
MODIS and VIIRS activity measurements more comparable.

**Live application:** https://firesignal.vercel.app/

**Scientific methodology:** [METHODOLOGY.md](METHODOLOGY.md)

## The problem

MODIS and VIIRS observe active fires using different
instruments, resolutions, sensitivities, and observation
schedules.

Consequently, their hotspot detections cannot be treated
as directly interchangeable measurements.

FireSignal makes these differences visible and evaluates
empirical harmonization methods without claiming physical
sensor calibration.

## Application features

### Historical fire activity

Explore historical hotspot activity across India using:

- MODIS Collection 6.1 observations from 2003–2025
- VIIRS Suomi-NPP Collection 2 observations from 2013–2025
- Monthly and daily activity exploration
- Seasonal anomaly comparisons

### Geographic exploration

Explore state-level fire activity using:

- 36 Indian states and union territories
- Monthly and annual activity visualizations
- Regional comparisons and rankings
- Regional seasonal anomaly analysis

### Sensor comparison

Compare MODIS and VIIRS using:

- Common-grid spatial aggregation
- 1 km, 5 km, and 10 km sensitivity experiments
- Daily temporal agreement
- Day-to-day activity changes
- Daytime and nighttime comparisons

### Statistical harmonization

Evaluate:

1. Raw VIIRS observations
2. National global adjustment
3. National seasonal adjustment
4. Regional global adjustment
5. Regional seasonal adjustment

The models are evaluated using separate training,
validation, and held-out test periods.

## Scientific methodology

FireSignal uses occupied grid-cell-days (OGCD).

A grid cell contributes at most one observation per
sensor per acquisition date, regardless of the number
of hotspot detections in that cell on that date.

The primary grid is defined in the EPSG:6933
equal-area projection with nominal 5 km grid dimensions.

OGCD measures detected hotspot activity, not unique
fires, burned area, or independently verified events.

## Historical dataset

| Sensor | Years | Source records |
|---|---|---:|
| MODIS Collection 6.1 | 2003–2025 | 1,801,292 |
| VIIRS Suomi-NPP Collection 2 | 2013–2025 | 7,634,234 |

Source: NASA Fire Information for Resource Management
System (FIRMS).

https://firms.modaps.eosdis.nasa.gov/

## Harmonization evaluation

Chronological evaluation periods:

| Split | Years |
|---|---|
| Training | 2013–2021 |
| Validation | 2022–2023 |
| Held-out testing | 2024–2025 |

### National evaluation

On held-out national monthly observations, seasonal
adjustment reduced MAE by approximately 19.7% and
RMSE by approximately 24.6% compared with global
adjustment.

### Regional evaluation

On paired regional monthly observations in the held-out
test period, regional seasonal adjustment achieved:

- MAE: 43.56 OGCD
- RMSE: 107.65 OGCD
- 38.6% lower MAE than national seasonal adjustment
- 38.5% lower RMSE than national seasonal adjustment

Among 28 regions with at least 12 paired test months,
24 improved relative to national seasonal adjustment
and four performed worse.

These improvements measure statistical agreement with
MODIS OGCD observations, not independent fire-detection
accuracy.

## Original March–May 2023 experiment

The initial experiments compared MODIS and VIIRS
observations over India from March 1 to May 31, 2023.

| Indicator | Result |
|---|---:|
| MODIS raw detections | 37,269 |
| VIIRS raw detections | 313,980 |
| MODIS 5 km OGCD | 25,700 |
| VIIRS 5 km OGCD | 160,672 |
| Daily Pearson correlation | 0.8841 |
| Day-to-day change Pearson correlation | 0.4776 |
| Direction agreement | 65.93% |
| Daytime VIIRS/MODIS OGCD ratio | 5.66x |
| Nighttime VIIRS/MODIS OGCD ratio | 12.16x |

These results are specific to the original
three-month experiment.

## Technology stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Visualizations | Recharts |
| Data processing | Python, pandas, NumPy |
| Spatial processing | pyproj |
| Statistical analysis | SciPy |
| Deployment | Vercel |

## Run locally

Requirements: Node.js and npm.

```bash
cd frontend
npm install
npm run dev
```

The frontend reads precomputed JSON datasets from
`frontend/public/data/`.

Running the Python processing pipelines is not
required to explore the existing dashboard.

## Data processing and reproducibility

The repository contains:

- `pipeline/historical_pipeline.py`
- `pipeline/harmonization_experiment.py`
- `pipeline/regional_pipeline.py`
- `pipeline/regional_harmonization_experiment.py`

Original NASA FIRMS archive downloads are excluded
from the Git repository.

The regional pipeline uses India ADM1 boundaries
obtained from geoBoundaries.

Boundary download instructions and licensing
information are available in:

[data/boundaries/README.md](data/boundaries/README.md)

Derived browser-ready JSON files are included in
`frontend/public/data/`.

For detailed scientific methods, results, and
limitations, see [METHODOLOGY.md](METHODOLOGY.md).

## Scientific limitations

- MODIS is a statistical reference, not ground truth.
- Statistical harmonization is not physical calibration.
- Satellite observation opportunities are not explicitly
  normalized.
- MODIS and VIIRS differ in sensitivity, spatial
  resolution, and observation timing.
- Regional evaluations exclude unpaired months.
- Sparse regional datasets can produce unstable estimates.
- Historical administrative boundaries may differ
  from current boundaries.
- No hotspot detection does not prove no fire occurred.
- OGCD is not a measure of unique fires or burned area.
- The models have not been independently validated
  against ground observations.

FireSignal should be used for exploratory scientific
analysis, not operational fire warnings or verified
fire-event estimates.

## Project status

Functional public research application with historical
exploration, geographic intelligence, and empirical
cross-sensor harmonization.

Independent physical calibration and ground-truth
validation remain future research opportunities.

## Acknowledgments

FireSignal uses NASA FIRMS active-fire observations
derived from MODIS and VIIRS.

Administrative boundaries: geoBoundaries gbOpen,
India ADM1, with underlying attribution to
DataMeet India / Election Commission of India,
licensed under CC BY 2.5 IN.

Developed as an independent project for the
NASA Space Apps Challenge 2026.

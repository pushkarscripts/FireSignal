# FireSignal

**Satellite Active-Fire Observatory & Cross-Sensor Harmonization for India**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![NASA Space Apps Challenge 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-blue.svg)](https://firesignal.vercel.app/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript 7](https://img.shields.io/badge/TypeScript-7.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite 8](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vite.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4.x-38bdf8.svg)](https://tailwindcss.com/)

FireSignal is an interactive scientific exploration platform and empirical harmonization engine developed for the **NASA Space Apps Challenge 2026** challenge: *"Harmonization of MODIS and VIIRS Hot Spots"*.

The platform explores 23 years of satellite active-fire observations across India, provides an interactive vector cartographic observatory for 36 administrative regions, and evaluates empirical cross-sensor harmonization models that align modern high-resolution VIIRS observations with the long-term MODIS climate record.

- **Live Application:** [https://firesignal.vercel.app/](https://firesignal.vercel.app/)
- **Scientific Methodology:** [METHODOLOGY.md](METHODOLOGY.md)
- **Open-Source License:** [LICENSE](LICENSE) (MIT)
- **Third-Party Attribution:** [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

---

## Canonical Application Views

FireSignal is structured around four primary client-side analytical views accessible directly via URL hash navigation:

| View | Canonical Route | Description |
| :--- | :--- | :--- |
| **Geographic Observatory** | [`/#observatory`](https://firesignal.vercel.app/#observatory) | Interactive SVG map of India (Albers equal-area projection) displaying regional occupied grid-cell-days (OGCD) across 36 states and union territories. Features an annual/monthly temporal scrubber (2003–2025), sensor toggle (MODIS vs. VIIRS), regional inspection panel, choropleth thresholds, and cached return navigation. |
| **Historical Patterns** | [`/#historical-patterns`](https://firesignal.vercel.app/#historical-patterns) | 23-year national daily time-series analysis (2003–2025), interactive calendar heatmaps, annual totals, and multi-year seasonal progression curves. |
| **Sensor Laboratory** | [`/#sensor-laboratory`](https://firesignal.vercel.app/#sensor-laboratory) | Cross-sensor empirical harmonization evaluation, comparing raw VIIRS against national and regional transfer models (global and seasonal adjustments) across chronological training, validation, and held-out test splits. |
| **Research & Methods** | [`/#research-methods`](https://firesignal.vercel.app/#research-methods) | Comprehensive methodological framework, mathematical formulations of OGCD, spatial projection rationale (EPSG:6933), validation protocols, and scientific caveats. |

---

## Research Motivation & Problem Statement

Satellite remote sensing of active fires relies on thermal anomalies detected in middle- and thermal-infrared spectral channels. For over two decades, the **MODIS** sensors aboard NASA's Terra and Aqua satellites provided the global scientific standard for fire monitoring (1 km spatial resolution at nadir). In 2011, the **VIIRS** instrument aboard the Suomi-NPP satellite introduced higher spatial resolution (375 m at nadir), wider swath coverage without edge-of-scan pixel degradation, and substantially enhanced sensitivity to smaller, cooler fires.

Because VIIRS has a nominal nadir footprint area approximately 7.1 times smaller than MODIS (0.1406 km² vs. 1.0 km²), exhibits distinct off-nadir pixel expansion characteristics across the swath, detects fires at lower radiant heat thresholds, and passes overhead at different local solar times, **raw MODIS and VIIRS hotspot detections cannot be treated as directly interchangeable measurements**. A naive concatenation of their records introduces an artificial multi-fold jump in apparent fire activity after 2012.

FireSignal addresses this discontinuity by:
1. Formulating a common, physically consistent analytical unit: **Occupied Grid-Cell-Days (OGCD)** on an equal-area 5 km grid (EPSG:6933).
2. Empirically evaluating cross-sensor statistical transfer models (global and monthly seasonal adjustments at national and state levels) on held-out test years (2024–2025).
3. Making sensor differences and harmonization trade-offs interactive and transparent through the web-based Geographic Observatory.

---

## Core Scientific Concepts

### 1. Occupied Grid-Cell-Days (OGCD)
To mitigate double-counting caused by multiple detections within a single pixel footprint or multiple satellite passes on the same day, FireSignal aggregates detections into **Occupied Grid-Cell-Days (OGCD)**:

$$\text{OGCD}(c, d, s) = \begin{cases} 1 & \text{if } \ge 1 \text{ detection by sensor } s \text{ in cell } c \text{ on date } d \\ 0 & \text{otherwise} \end{cases}$$

A grid cell contributes at most one unit of activity per sensor per calendar day, regardless of whether one or ten thermal anomalies were flagged within that cell.

### 2. Equal-Area Coordinate Reference System (EPSG:6933)
Standard equirectangular (latitude/longitude) grids suffer from significant poleward area distortion. FireSignal projects all active-fire point detections into the **Cylindrical Equal-Area / EASE-Grid 2.0 Global projection (EPSG:6933)** using nominal 5,000 m $\times$ 5,000 m ($25\text{ km}^2$) grid cells. Every grid cell represents an equal surface area across all latitudes in India.

### 3. What FireSignal Measures (and What It Does Not)

> [!IMPORTANT]
> - **FireSignal measures:** Detected thermal anomaly spatial density on a discrete equal-area spatio-temporal grid (OGCD).
> - **FireSignal does NOT measure:** Confirmed individual wildfires, total burned area (hectares), fire severity, fire radiative energy (FRE), or ground-truth fire perimeters.
> - **Absence of detection:** Zero OGCD in a cell indicates that no satellite detection satisfied quality and cloud-clearing thresholds. It does **not** prove the absence of active fires, as persistent cloud cover, heavy smoke, and orbital gaps obscure surface thermal anomalies.
> - **Statistical reference:** MODIS serves as the historical baseline reference, not as absolute physical ground truth. Statistical harmonization does not constitute physical instrument recalibration.

---

## Satellite Data Sources & Sensor Characteristics

FireSignal ingests active-fire data from the **NASA Fire Information for Resource Management System (FIRMS)**:

| Sensor | Platform | Spatial Resolution (Nadir) | Archive Period Used | Records in India Archive | Primary Overpass (Equator) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MODIS** | Terra & Aqua | 1,000 m | 2003–2025 (23 yrs) | 1,801,292 | 10:30 & 22:30 (Terra) / 13:30 & 01:30 (Aqua) |
| **VIIRS** | Suomi-NPP | 375 m | 2013–2025 (13 yrs) | 7,634,234 | 13:30 & 01:30 |

### Sensor Discrepancy Baseline (March–May 2023 India Experiment)

During the intensive 3-month peak fire season baseline experiment (March 1 to May 31, 2023):

- **Raw Thermal Detections:** MODIS detected 37,269 raw hotspots, whereas VIIRS detected 313,980 raw hotspots (**8.42$\times$ higher**).
- **5 km Spatial Aggregation (OGCD):** MODIS recorded 25,700 OGCD, while VIIRS recorded 160,672 OGCD (**6.25$\times$ higher**).
- **Daily Co-occurrence:** National daily total OGCD correlated strongly ($r = 0.8841$), indicating high temporal synchrony despite scale discrepancies.
- **Day-to-Day Change Correlation:** Day-to-day activity changes exhibited a moderate correlation ($r = 0.4776$) with 65.93% directional agreement.
- **Diurnal Divergence:** The VIIRS-to-MODIS OGCD ratio was **5.66$\times$ during daytime** and jumped to **12.16$\times$ during nighttime**, reflecting VIIRS's heightened capability to detect cool, small nighttime agricultural burns invisible to MODIS.

---

## Statistical Harmonization & Evaluation

FireSignal evaluates empirical models designed to predict expected MODIS-equivalent OGCD from raw VIIRS observations.

### Chronological Data Partitions
To prevent data leakage and simulate operational deployment, models are trained and tested on non-overlapping chronological splits:
- **Training Period:** 2013–2021 (9 years)
- **Validation Period:** 2022–2023 (2 years)
- **Held-Out Test Period:** 2024–2025 (2 years reserved strictly for final reporting)

### Evaluation Results on Held-Out Test Data (2024–2025)

1. **National Harmonization Models:**
   - **Raw VIIRS Baseline:** High systematic offset due to resolution divergence.
   - **Global Adjustment:** Proportional scaling based on training ratio.
   - **Seasonal Adjustment:** Month-of-year adjustment factors capturing agricultural burn seasons. Reduced national monthly Mean Absolute Error (**MAE**) by **19.7%** and Root Mean Squared Error (**RMSE**) by **24.6%** compared to global scaling.

2. **Regional Harmonization Models (State Level):**
   - Evaluated across 28 Indian administrative regions with at least 12 paired monthly observations in the held-out test set.
   - **Regional Seasonal Adjustment:** Achieved an **MAE of 43.56 OGCD** and **RMSE of 107.65 OGCD**.
   - Outperformed national seasonal adjustment with **38.6% lower MAE** and **38.5% lower RMSE**.
   - Performance improved in **24 out of 28 regions**; 4 regions with sparse or highly erratic fire activity showed slight degradation, illustrating the limits of purely local statistical adjustments in low-signal regimes.

---

## Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, TypeScript 7, Vite 8 | Reactive component tree, strict type safety, fast bundling |
| **Styling & Design System** | Tailwind CSS 4, Lucide Icons | Dark Observatory design tokens, accessible contrast, responsive layout |
| **Cartography & Charts** | Custom SVG Albers Projection, Recharts | Interactive India ADM1 choropleth, annual timelines, anomaly sparkbars |
| **Static Analysis & Testing** | Node.js Test Runner, Oxlint, TypeScript 7 | 43 automated regression tests, zero lint warnings, full build verification |
| **Scientific Processing** | Python 3, NumPy, pandas, GeoPandas, SciPy, pyproj | Equal-area spatial binning, point-in-polygon joins, regression pipelines |
| **Geographic Simplification** | Mapshaper | Topology-preserving 15% Douglas–Peucker simplification for web performance |
| **Production Hosting** | Vercel Edge Network | Global CDN delivery of precomputed static datasets and SPA bundle |

---

## Repository Architecture

```text
firesignal/
├── frontend/                     # React 19 + TypeScript + Vite web application
│   ├── public/data/              # Precomputed browser JSON datasets and simplified GeoJSON
│   │   ├── regional_monthly_5km.json       # 36-region monthly OGCD (2003–2025)
│   │   ├── historical_calendar_5km.json    # National daily OGCD time series
│   │   ├── india_adm1_simplified.geojson   # Topology-cleaned 36-region boundaries
│   │   └── harmonization_results.json      # National & regional evaluation metrics
│   ├── src/                      # UI architecture & components
│   │   ├── GeographicObservatory.tsx       # Interactive vector map & state inspector
│   │   ├── observatoryAggregations.ts      # Client-side spatial data aggregation & cache
│   │   ├── HistoricalCalendar.tsx          # 23-year historical time series visualization
│   │   ├── HarmonizationResults.tsx        # Statistical model comparison laboratory
│   │   ├── RegionalHarmonizationResults.tsx# State-by-state model evaluations
│   │   ├── navigation.ts                   # Hash routing and canonical route normalization
│   │   └── App.tsx                         # Navigation bar, view routing, layout shell
│   └── test/                     # Automated frontend test suite (43 tests)
│       ├── navigation.test.ts              # Route parsing & fallback contracts
│       ├── observatory_aggregations.test.ts# Metric calculations & leap-year logic
│       ├── observatory_cache.test.ts       # In-memory return navigation cache tests
│       └── scientific_data_contracts.test.ts# GeoJSON schemas, sensor years, OGCD limits
├── pipeline/                     # Python data pipelines and harmonization experiments
│   ├── regional_pipeline.py      # Spatial point-in-polygon join & 5 km grid aggregation
│   ├── harmonization_experiment.py # National model training, cross-validation & testing
│   ├── regional_harmonization_experiment.py # Regional model evaluation
│   ├── historical_pipeline.py    # Builds 2003–2025 national daily historical calendar
│   └── run_all.py                # Pipeline execution coordinator
├── tests/                        # Python automated test suite (5 tests)
│   └── test_scientific_contracts.py # Python contract validation against JSON data
├── data/                         # Data documentation and source references
│   └── boundaries/               # geoBoundaries README, download links, and licensing
├── LICENSE                       # MIT License for original FireSignal source code
├── THIRD_PARTY_NOTICES.md        # Upstream provenance, boundary terms & software notices
├── METHODOLOGY.md                # Comprehensive scientific documentation and equations
└── README.md                     # Project overview, quickstart, and evaluation
```

---

## Local Development Setup

### Prerequisites
- **Node.js:** `^20.19.0 || >=22.12.0` (verified Vite 8 engine requirement)
- **npm:** v10.0.0 or higher

> [!NOTE]
> Running and exploring the web application does **not** require Python or raw satellite data downloads. The frontend reads precomputed, verified JSON datasets directly from `frontend/public/data/`.

### 1. Install and Start Development Server
```bash
# Clone the repository
git clone https://github.com/pushkarscripts/firesignal.git
cd firesignal

# Navigate to frontend and install dependencies
cd frontend
npm install

# Start the Vite development server
npm run dev
```
Open your browser at `http://localhost:5173/` (or the port indicated in terminal output).

### 2. Production Build and Preview
To compile the production bundle with static type checking:
```bash
npm --prefix frontend run build
npm --prefix frontend run preview
```

---

## Testing & Code Quality

FireSignal includes comprehensive automated regression suites covering routing, spatial calculations, cache lifecycles, and scientific data contracts:

### 1. Frontend Automated Tests (43 Tests)
Executed via the native Node.js test runner:
```bash
npm --prefix frontend run test
```
Verifies route hash parsing, leap-year days calculation, missing vs. zero state classification, return-navigation cache idempotency, and boundary GeoJSON 1-to-1 name matching.

### 2. Python Scientific Contract Tests (5 Tests)
Executed via Python `unittest`:
```bash
python -m unittest discover -s tests
```
Verifies sensor year bounds (MODIS 2003–2025, VIIRS 2013–2025), EPSG:6933 5 km metadata specifications, and data integrity of exported JSON artifacts.

### 3. Static Analysis & Linting
Run the fast Rust-based linter `oxlint`:
```bash
npm --prefix frontend run lint
```

---

## Reproducing the Scientific Pipeline (Optional)

Users wishing to regenerate the raw spatial aggregations from source satellite archives can execute the Python processing pipeline.

### 1. Python Environment Setup
Requirements: Python 3.10+ with spatial and scientific libraries.
```bash
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install numpy pandas geopandas pyproj scipy shapely matplotlib
```

### 2. Download Raw Datasets
1. **Administrative Boundaries:** Retrieve the India ADM1 GeoJSON from the geoBoundaries API according to instructions in [`data/boundaries/README.md`](data/boundaries/README.md) and save to `data/boundaries/india_adm1.geojson`.
2. **NASA FIRMS Archives:** Request and download raw historical MODIS C6.1 and VIIRS SNPP C2 active-fire archives for India from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/download/) and place ZIP files in `data/raw/`.

### 3. Run Pipeline Scripts
```bash
# Generate regional 5 km aggregations (point-in-polygon join)
python pipeline/regional_pipeline.py --full --chunk-size 100000

# Execute national harmonization experiment
python pipeline/harmonization_experiment.py

# Execute regional harmonization experiment
python pipeline/regional_harmonization_experiment.py

# Generate historical 23-year calendar dataset
python pipeline/historical_pipeline.py
```

---

## Scientific Limitations

1. **Not Ground Truth:** MODIS is an observational reference with its own omission and commission errors, not physical ground truth.
2. **Not Physical Calibration:** Statistical harmonization models are empirical transfer functions; they do not alter sensor optics, radiative transfer physics, or physical detection thresholds.
3. **Not Burned Area or Severity:** OGCD measures detected hotspot spatial occupancy. It cannot be converted to burned area or wildfire severity without fuel models, fire progression analysis, and surface validation.
4. **Cloud and Smoke Obscuration:** Optical sensors cannot detect active fires through dense convective cloud cover or thick smoke plumes. Zero OGCD does not prove zero fire activity.
5. **Resolution Discrepancy:** The footprint area disparity between MODIS (1,000 m at nadir, 1.0 km²) and VIIRS (375 m at nadir, ~0.1406 km²; a nominal ~7.1:1 nadir area ratio), combined with differing off-nadir pixel growth rates, causes VIIRS to detect fragmented agricultural fires completely missed by MODIS.
6. **Selection Bias in Regional Tests:** Regional evaluations exclude months without paired observations, which may under-represent cloud-covered or low-activity months.
7. **Sparse Data Regimes:** In states with infrequent fire activity (e.g., small coastal territories or high-altitude regions), statistical harmonization ratios are sensitive to small sample sizes.
8. **Historical Boundary Demarcation:** Administrative boundaries reflect a 2011 Census reference snapshot from geoBoundaries/DataMeet, which may differ from current state and union territory definitions.
9. **No Independent Ground Truth Validation:** The statistical models have been cross-validated across chronological satellite partitions, but have not been evaluated against independent ground-based perimeter GPS surveys.
10. **Non-Operational Scope:** FireSignal is designed strictly for exploratory scientific research and retrospective climate analysis, not for operational emergency dispatch or real-time wildfire suppression.

---

## License & Third-Party Attribution

### Software License
Original FireSignal application source code, cartographic visualization logic, and Python pipelines are licensed under the **MIT License** ([LICENSE](LICENSE)).<br />
Copyright (c) 2026 Pushkar.

### Third-Party Data & Spatial Provenance
External datasets retain their respective upstream licenses and terms (see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)):
- **Satellite Active-Fire Observations:** Provided by **NASA FIRMS / ESDIS Project**. NASA Earth Science data is open and unrestricted; works of the US Federal Government are in the public domain domestically (17 U.S.C. § 105).
- **Administrative Boundaries:** Sourced from **geoBoundaries (gbOpen)** under **CC BY 4.0**, with underlying boundary attribution to **DataMeet India** and the **Election Commission of India** (2011 reference snapshot) under **CC BY 2.5 IN**.
- **Simplified Vector Asset (`frontend/public/data/india_adm1_simplified.geojson`):** An adapted derivative work simplified via Mapshaper for web cartography, distributed under **CC BY 2.5 IN / CC BY 4.0** terms, and excluded from the software MIT license.
- **Third-Party Libraries:** React, Recharts, Tailwind CSS, Lucide, and Vite are licensed under permissive open-source licenses (MIT/ISC).

### Non-Endorsement
Reference to NASA, NASA FIRMS, geoBoundaries, DataMeet, or the Election Commission of India does not constitute or imply official sponsorship, certification, or endorsement of FireSignal.

---

## Citation & Academic Reference

If you use FireSignal, its analytical methodology, or its harmonization findings in your research or project evaluation, please cite:

```bibtex
@misc{firesignal2026,
  author       = {Pushkar},
  title        = {FireSignal: Satellite Active-Fire Observatory and Cross-Sensor Harmonization for India},
  year         = {2026},
  publisher    = {GitHub},
  howpublished = {\url{https://github.com/pushkarscripts/firesignal}},
  note         = {NASA Space Apps Challenge 2026}
}
```

### Upstream Scientific Citations
- **MODIS Active Fire Algorithm:**
  Giglio, L., Schroeder, W., & Justice, C. O. (2016). *The collection 6 MODIS active fire detection algorithm and fire products.* Remote Sensing of Environment, 178, 31–41. https://doi.org/10.1016/j.rse.2016.02.054
- **VIIRS 375 m Active Fire Algorithm:**
  Schroeder, W., Oliva, P., Giglio, L., & Csiszar, I. A. (2014). *The New VIIRS 375 m active fire detection product—Algorithm description and initial assessment.* Remote Sensing of Environment, 143, 85–96. https://doi.org/10.1016/j.rse.2013.12.008
- **geoBoundaries Global Database:**
  Runfola, D., Anderson, A., Baier, H., Cauley, M., Chen, D., Diloreto, E., et al. (2020). *geoBoundaries: A global database of political administrative boundaries.* PLOS ONE, 15(4), e0231866. https://doi.org/10.1371/journal.pone.0231866

---

## Author & Acknowledgments

- **Lead Developer & Researcher:** Pushkar ([@pushkarscripts](https://github.com/pushkarscripts))
- **Challenge:** NASA Space Apps Challenge 2026 — *Harmonization of MODIS and VIIRS Hot Spots*
- **Acknowledgments:** Sincere gratitude to the NASA FIRMS and ESDIS teams for open-access remote sensing archives, the William & Mary geoLab for the geoBoundaries database, and DataMeet India for open spatial data advocacy.

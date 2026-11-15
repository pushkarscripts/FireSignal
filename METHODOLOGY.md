# FireSignal — Scientific Methodology

**Sensor Harmonization, Spatial Aggregation & Empirical Modeling Protocols**

FireSignal is an interactive scientific exploration platform and empirical cross-sensor harmonization engine developed for the **NASA Space Apps Challenge 2026** (*"Harmonization of MODIS and VIIRS Hot Spots"*).

This document establishes the theoretical foundations, spatial indexing protocols, mathematical equations, cross-validation splits, and empirical modeling procedures implemented in FireSignal.

- **Project Overview & Setup:** [README.md](README.md)
- **Open-Source Software License:** [LICENSE](LICENSE) (MIT)
- **Third-Party Provenance & Attribution:** [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
- **Live Application:** [https://firesignal.vercel.app/](https://firesignal.vercel.app/)

---

## 1. Project Objective & Analytical Scopes

FireSignal investigates how satellite sensor differences affect the interpretation of active-fire thermal anomaly observations over India.

MODIS and VIIRS observe surface thermal anomalies using different instrument optics, orbital overpasses, pixel geometries, and radiometric detection thresholds. A naive concatenation of their records introduces an artificial multi-fold jump in apparent fire activity after 2012. FireSignal's purpose is to make cross-sensor differences visible, transparent, and interpretable, and to evaluate empirical statistical transfer functions without claiming physical instrument recalibration.

The project evaluates two distinct analytical scopes:

1. **Initial 3-Month Baseline Experiment (March 1–May 31, 2023):**
   A high-density pilot study covering the peak spring burning season across India, evaluating spatial resolution sensitivity (1 km, 5 km, 10 km), daily temporal correlation, day-to-day rate-of-change agreement, and daytime versus nighttime detection divergence (Sections 2–7).
2. **Multi-Decadal Historical & Regional Analysis (2003–2025):**
   An India-wide historical exploration spanning 23 years of MODIS (2003–2025) and 13 years of VIIRS (2013–2025), aggregating observations across 36 administrative states and union territories, and evaluating regularized cross-sensor harmonization models on non-overlapping chronological splits (Sections 11–16).

---

## 2. Satellite Data Sources & Sensor Characteristics

Observations were obtained through the **NASA Fire Information for Resource Management System (FIRMS)** archive.

### 2.1 Sensor Operational Specifications

| Parameter | MODIS (Terra & Aqua) | VIIRS (Suomi-NPP) |
| :--- | :--- | :--- |
| **Active-Fire Product** | Collection 6.1 (`MODIS C6.1`) | Collection 2 (`VNP14IMGTDL_NRT` / `SV-C2`) |
| **Spatial Resolution at Nadir** | 1,000 m (1 km) | 375 m (I-band) |
| **Pixel Footprint Area at Nadir** | $1.00\text{ km}^2$ ($1{,}000\text{ m} \times 1{,}000\text{ m}$) | $\approx 0.1406\text{ km}^2$ ($375\text{ m} \times 375\text{ m}$, $\sim 7.1:1$ nadir ratio) |
| **Pixel Growth Across Swath** | Expands by $\sim 4.8\times$ along-scan, $\sim 2.1\times$ along-track ($\sim 10\text{ km}^2$ at scan edge) | Constrained growth via onboard detector aggregation ($\sim 2\times$ maximum area expansion) |
| **Equatorial Overpass Times** | 10:30 & 22:30 (Terra) / 13:30 & 01:30 (Aqua) | 13:30 & 01:30 (Suomi-NPP) |
| **Primary Fire Channels** | 3.96 $\mu\text{m}$ (MIR), 11.0 $\mu\text{m}$ (TIR) | 3.74 $\mu\text{m}$ (I4), 11.45 $\mu\text{m}$ (I5) |
| **Relative Detection Sensitivity** | Baseline contextual detection for flaming fires; sensitivity decreases toward scan edge | Substantially higher sensitivity for small and low-intensity fires; constrained edge degradation |

> [!NOTE]
> **Pixel Footprint & Sensitivity Context:**
> - At nadir, the nominal pixel area ratio is approximately $7.1:1$ ($1.00\text{ km}^2$ vs. $0.1406\text{ km}^2$). Across the broader swath, the effective area ratio increases because MODIS pixel footprints expand by nearly an order of magnitude at high view zenith angles, whereas VIIRS onboard aggregation limits edge-of-scan pixel growth to approximately $2\times$.
> - Actual satellite detection capability cannot be defined by a single static fire area. Fire detection probability is a dynamic function of flaming fire temperature ($T^4$ radiant emission), subpixel flaming area, scan angle / view zenith geometry, background surface temperature, atmospheric water vapor attenuation, solar reflection (glint), and smoke or cloud obscuration.

### 2.2 Datasets Ingested

1. **Baseline Pilot Sample (March 1–May 31, 2023):**
   - MODIS Collection 6.1 (Terra and Aqua): 37,269 records (`DL_FIRE_M-C61_828178.zip`)
   - VIIRS Suomi-NPP Collection 2: 313,980 records (`DL_FIRE_SV-C2_828179.zip`)
2. **Historical Decadal Archives:**
   - MODIS Collection 6.1 (January 1, 2003–December 31, 2025): 1,801,292 records (`DL_FIRE_M-C61_847437.zip`)
   - VIIRS Suomi-NPP Collection 2 (January 1, 2013–December 31, 2025): 7,634,234 records (`DL_FIRE_SV-C2_847444.zip`)

### 2.3 Physical Meaning of an Active-Fire Hotspot Record

> [!IMPORTANT]
> A satellite hotspot record represents an active thermal anomaly detected at the instant of satellite overpass that satisfies the contextual detection algorithm. It does **not** represent:
> - A unique wildfire ignition or distinct fire perimeter.
> - A measure of total burned surface area (hectares).
> - Fire radiative energy (FRE) or biomass consumed.
> - An independently verified ground-truth fire event.

---

## 3. Spatial Aggregation & Occupied Grid-Cell-Days (OGCD)

### 3.1 Equal-Area Coordinate Projection (EPSG:6933)

Standard geographic coordinates (latitude/longitude in WGS 84, EPSG:4326) suffer from severe area distortion across India, where a degree of longitude at 8°N covers significantly more surface area than at 35°N.

To ensure consistent spatial binning across all latitudes, all geodetic coordinates are reprojected using `pyproj` into the **Cylindrical Equal-Area / EASE-Grid 2.0 Global projection (EPSG:6933)**:

$$\begin{pmatrix} X \\ Y \end{pmatrix} = \text{Project}_{\text{EPSG:6933}}(\text{lon}, \text{lat})$$

### 3.2 Discrete Grid Assignment

Projected planar coordinates $(X, Y)$ in metres are assigned to discrete equal-area grid cells using the mathematical floor function:

$$c_x = \left\lfloor \frac{X}{L} \right\rfloor, \quad c_y = \left\lfloor \frac{Y}{L} \right\rfloor$$

where $L$ denotes the nominal grid cell resolution in metres. Three resolutions were evaluated:
- $L = 1{,}000\text{ m}$ (1 km)
- $L = 5{,}000\text{ m}$ (5 km, $25\text{ km}^2$ cell area — Primary Analytical Standard)
- $L = 10{,}000\text{ m}$ (10 km, $100\text{ km}^2$ cell area)

### 3.3 Formal Mathematical Definition of OGCD

To resolve double-counting from multiple detections within a single pixel footprint or multiple satellite passes on the same day, FireSignal formulates **Occupied Grid-Cell-Days (OGCD)**:

$$\text{OGCD}(c, d, s) = \begin{cases} 1 & \text{if } \ge 1 \text{ detection by sensor } s \text{ in cell } c \text{ on date } d \\ 0 & \text{otherwise} \end{cases}$$

where $c = (c_x, c_y)$ represents the spatial grid cell index, $d$ denotes the UTC acquisition date, and $s \in \{\text{MODIS}, \text{VIIRS}\}$.

Daily national activity is computed by summing occupied grid cells across the spatial domain $\mathcal{C}$:

$$\text{OGCD}_{\text{daily}}(d, s) = \sum_{c \in \mathcal{C}} \text{OGCD}(c, d, s)$$

Monthly activity sums daily OGCD values across all calendar dates $d$ in month $m$:

$$\text{OGCD}_{\text{monthly}}(m, s) = \sum_{d \in \mathcal{D}_m} \text{OGCD}_{\text{daily}}(d, s)$$

---

## 4. Baseline Spatial Aggregation Results (March–May 2023)

Evaluating the sensitivity of the cross-sensor ratio to grid cell size across the 92-day baseline period (March 1–May 31, 2023):

| Measurement Metric | MODIS (C6.1) | VIIRS (SV-C2) | Ratio (VIIRS / MODIS) | Ratio Change vs. Raw |
| :--- | :---:| :---:| :---:| :---:|
| **Raw Thermal Detections** | 37,269 | 313,980 | **8.425$\times$** | Baseline (100.0%) |
| **1 km OGCD** | 35,952 | 236,017 | **6.565$\times$** | -22.1% |
| **5 km OGCD** (Standard) | 25,700 | 160,672 | **6.252$\times$** | -25.8% |
| **10 km OGCD** | 21,814 | 125,538 | **5.755$\times$** | -31.7% |

### Key Findings
1. Spatial binning progressively compresses the VIIRS-to-MODIS discrepancy (from 8.425$\times$ raw to 6.252$\times$ at 5 km). Because VIIRS's 375 m pixels frequently cluster within single MODIS 1 km footprints, spatial aggregation collapses co-occurring VIIRS detections into common cell-days.
2. The ratio plateaus between 5 km and 10 km, establishing 5 km as an optimal balance between spatial granularity and co-occurrence stabilization. Coarser binning does not eliminate sensor divergence.

---

## 5. Daily Temporal Agreement (March–May 2023)

Daily 5 km OGCD values were aligned across all 92 calendar days in the baseline experiment:

- **Pearson Correlation ($r$):** `0.8841` ($p < 10^{-15}$)
- **Spearman Rank Correlation ($\rho$):** `0.9250` ($p < 10^{-15}$)
- **Median Daily Ratio (VIIRS / MODIS):** `7.4822` (Interquartile Range: 5.6157–10.3762)

### Scientific Interpretation
Strong linear and monotonic rank correlations demonstrate that both sensors track macro-scale temporal fire surges synchronously. However, the wide interquartile range of the daily ratio (5.62$\times$ to 10.38$\times$) indicates that scaling VIIRS by a single fixed constant is insufficient for daily precision.

---

## 6. Day-to-Day Change Agreement (March–May 2023)

To evaluate whether the sensors agree on daily increases or decreases in fire activity, first differences were calculated:

$$\Delta \text{OGCD}(d) = \text{OGCD}_{\text{daily}}(d) - \text{OGCD}_{\text{daily}}(d - 1)$$

Across 91 consecutive daily changes:
- **Pearson Correlation of Changes ($r_{\Delta}$):** `0.4776`
- **Spearman Rank Correlation of Changes ($\rho_{\Delta}$):** `0.5366`
- **Directional Agreement Rate:** `65.93%` (60 of 91 days agreed in sign)

### Scientific Interpretation
Agreement in day-to-day rate of change is substantially weaker than level-to-level agreement. High seasonal correlation should not be misconstrued as evidence that the two sensors respond identically to short-term day-to-day changes. Differences in orbit timing, cloud motion, and plume dissipation introduce high daily variance in change detection.

---

## 7. Diurnal Sensitivity Stratification (Day vs. Night)

Hotspot detections were stratified using FIRMS solar elevation flags (`Day` vs. `Night`):

| Stratum | MODIS 5 km OGCD | VIIRS 5 km OGCD | VIIRS / MODIS Ratio | Daily Pearson $r$ |
| :--- | :---:| :---:| :---:| :---:|
| **Daytime Observations** | 22,588 | 127,900 | **5.662$\times$** | `0.8762` |
| **Nighttime Observations** | 3,599 | 43,755 | **12.158$\times$** | `0.7316` |

### Key Findings & Non-Additivity Note
1. **Diurnal Disparity:** The VIIRS-to-MODIS ratio jumps by a factor of 2.15$\times$ at night (12.158$\times$ vs. 5.662$\times$). At night, lower solar background radiance and VIIRS's 375 m small-pixel footprint permit detection of small, cool agricultural residue fires that fall below MODIS's 1 km detection threshold.
2. **Non-Additivity:** A 5 km grid cell that records both daytime and nighttime detections on the same date contributes 1 to daytime OGCD and 1 to nighttime OGCD, but only 1 to the unstratified daily total. Consequently, daytime and nighttime OGCD totals are non-additive ($22{,}588 + 3{,}599 = 26{,}187 > 25{,}700$).

---

## 8. Fundamental Methodological Limitations

1. **MODIS is an Observational Reference, Not Ground Truth:** MODIS has its own omission errors (small fires) and commission errors (false alarms, high-albedo surfaces). Agreement with MODIS does not establish physical ground-truth accuracy.
2. **No Physical Instrument Calibration:** Statistical adjustments do not alter sensor optics, band response functions, or satellite radiative transfer physics.
3. **Observation Opportunity Asymmetry:** Variations in orbital revisit geometry, off-nadir pixel expansion, and orbital gaps are not explicitly normalized.
4. **Cloud and Smoke Obscuration:** Optical infrared sensors cannot penetrate convective clouds or heavy smoke. Zero detected OGCD indicates absence of detection, not verified absence of fire.
5. **No Overpass Time Matching:** Detections are paired by calendar date, not by instantaneous satellite overpass seconds.

---

## 9. Physical Validation Status

**Current Status: Empirical Harmonization Evaluated Against MODIS; Not Physically Validated.**

FireSignal does not provide physical sensor recalibration or verified ground-truth fire perimeters. All harmonization evaluations measure descriptive statistical agreement with the MODIS historical baseline.

---

## 10. Reproducibility & Data Flow Architecture

The data processing pipeline is implemented in standalone Python scripts without external server dependencies:

```text
[NASA FIRMS ZIP Archives] + [geoBoundaries GeoJSON]
                     │
                     ▼
  [pipeline/historical_pipeline.py] / [pipeline/regional_pipeline.py]
                     │
            (Streaming SQLite DB)
                     │
                     ▼
        [data/historical/*.csv]
                     │
                     ▼
[pipeline/harmonization_experiment.py] / [pipeline/regional_harmonization_experiment.py]
                     │
                     ▼
    [frontend/public/data/*.json] ──► [React 19 Dashboard (Static Browser Client)]
```

The React web observatory runs purely from precomputed JSON outputs and does not require a live Python backend.

---

## 11. Multi-Decadal Historical Analysis (2003–2025)

The historical pipeline streams raw NASA FIRMS archives, filters by geographical bounding box (India: $6.0^{\circ}\text{N}\text{--}38.0^{\circ}\text{N}$, $68.0^{\circ}\text{E}\text{--}98.0^{\circ}\text{E}$), projects coordinates to EPSG:6933, and inserts records into a disk-backed SQLite database table:

```sql
CREATE TABLE cells(
    sensor TEXT NOT NULL,
    day TEXT NOT NULL,
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    PRIMARY KEY(sensor, day, cell_x, cell_y)
) WITHOUT ROWID;
```

Deduplication occurs at the primary key level. Daily and monthly OGCD totals are calculated using standard SQL aggregation:

```sql
SELECT sensor, day AS date, COUNT(*) AS occupied_grid_cells
FROM cells GROUP BY sensor, day ORDER BY sensor, day;
```

### Archived Dataset Volumes

| Sensor | Operational Period Ingested | Raw Detections Filtered | Valid Projected Records |
| :--- | :--- | :---:| :---:|
| **MODIS C6.1** | January 1, 2003–December 31, 2025 (23 years) | 1,801,292 | 1,801,292 |
| **VIIRS SV-C2** | January 1, 2013–December 31, 2025 (13 years) | 7,634,234 | 7,634,234 |

---

## 12. Historical Seasonal Anomaly Analysis

To compare fire activity in a specific month against historical seasonal norms, FireSignal calculates leave-one-year-out baseline medians:

$$\text{Median}_{\text{ref}}(m, y) = \text{Median}\left( \left\{ \text{OGCD}_{\text{monthly}}(m, k) \mid k \in \mathcal{Y}, k \ne y \right\} \right)$$

where $\mathcal{Y}$ represents the set of all available observation years. The seasonal anomaly is defined as:

$$\text{Anomaly}(m, y) = \text{OGCD}_{\text{monthly}}(m, y) - \text{Median}_{\text{ref}}(m, y)$$

Excluding the target year $y$ from the reference baseline prevents extreme fire years from biasing their own reference benchmark.

---

## 13. National Statistical Harmonization Models

FireSignal evaluates statistical transfer functions that adjust raw monthly VIIRS OGCD observations toward expected MODIS-equivalent OGCD:

$$\widehat{\text{MODIS}} = f(\text{VIIRS})$$

### 13.1 Chronological Data Partitions

To simulate prospective deployment and prevent temporal leakage, models are trained and tested on non-overlapping chronological blocks:
- **Training Period:** 2013–2021 (9 years / 108 paired monthly observations)
- **Validation Period:** 2022–2023 (2 years / 24 paired monthly observations — Model Selection)
- **Held-Out Test Period:** 2024–2025 (2 years / 24 paired monthly observations — Final Reporting)

### 13.2 Zero-Intercept Linear Regression

The global adjustment model estimates a single proportional scale factor through the origin:

$$\hat{\beta}_{\text{global}} = \frac{\sum_{i \in \text{Train}} x_i y_i}{\sum_{i \in \text{Train}} x_i^2}$$

where $x_i = \text{VIIRS}_i$ and $y_i = \text{MODIS}_i$ denote national monthly OGCD values.

*Code Reference:* `pipeline/harmonization_experiment.py` (lines 69–72). Implemented value: $\hat{\beta}_{\text{global}} \approx 0.1604$.

> [!NOTE]
> The zero intercept ($\hat{y} = \beta x$) is a deliberate modeling constraint to ensure that zero observed VIIRS activity maps to zero predicted MODIS activity. It is a statistical modeling choice, not physical proof that zero detections in one instrument imply zero fire activity on the ground.

### 13.3 Regularized Month-of-Year Seasonal Adjustment

Because agricultural residue burning follows strict crop calendar cycles, month-specific transfer factors $b_m$ vary systematically across the year. However, estimating month slopes on 9 training points per month risks small-sample variance.

To stabilize seasonal factors, FireSignal applies empirical Bayes shrinkage toward the global slope:

$$\beta_m = \frac{N_m b_m + \lambda \hat{\beta}_{\text{global}}}{N_m + \lambda}$$

where:
- $b_m = \frac{\sum_{i \in \text{Train}_m} x_i y_i}{\sum_{i \in \text{Train}_m} x_i^2}$ is the unregularized least-squares slope for calendar month $m \in \{1, \dots, 12\}$.
- $N_m$ is the number of training years observing calendar month $m$ ($N_m = 9$ across all months in 2013–2021).
- $\lambda = 6$ is the fixed shrinkage parameter (equivalent to 6 pseudo-years of weight pulled toward the global factor).

*Code Reference:* `pipeline/harmonization_experiment.py` (lines 77–84).

### 13.4 National Held-Out Evaluation (2024–2025 Test Split)

| Model Candidate | Model Formulation | Held-Out MAE (OGCD) | Held-Out RMSE (OGCD) | Mean Bias (OGCD) |
| :--- | :--- | :---:| :---:| :---:|
| **Raw VIIRS (Unadjusted)** | $\hat{y} = x$ | 21,335.04 | 29,811.31 | +21,335.04 |
| **Seasonal Median Baseline** | $\hat{y} = \text{Median}_{\text{train}}(m)$ | 1,728.96 | 2,705.85 | -719.21 |
| **Global Multiplicative Adjustment** | $\hat{y} = \hat{\beta}_{\text{global}} x$ | 675.34 | 1,088.57 | -58.69 |
| **Seasonal Multiplicative Adjustment** | $\hat{y} = \beta_m x$ | **542.16** | **821.22** | -84.42 |

Relative to the global adjustment, the seasonal adjustment achieved a **19.72% reduction in MAE** and a **24.56% reduction in RMSE** on unseen 2024–2025 observations.

---

## 14. Regional Geographic Analysis & Administrative Boundaries

### 14.1 Boundary Provenance & Licensing

Administrative state and union territory boundaries are sourced from **geoBoundaries**:
- **Collection:** `gbOpen` (Open License Collection)
- **Identifier:** `IND_ADM1` (36 administrative regions)
- **API Endpoint:** `https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/`
- **Underlying Upstream Source:** DataMeet India / Election Commission of India (2011 Census reference demarcation snapshot).
- **Platform Licensing:** Sourced from geoBoundaries under **Creative Commons Attribution 4.0 International (CC BY 4.0)**, citing underlying attribution to DataMeet under **Creative Commons Attribution 2.5 India (CC BY 2.5 IN)**.
- *Legal Distinction:* CC BY 2.5 IN and CC BY 4.0 are distinct legal licenses and are not interchangeable. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for full attribution notices.

### 14.2 Derived Cartographic Vector Asset (`india_adm1_simplified.geojson`)

The raw administrative GeoJSON (`data/boundaries/india_adm1.geojson`, 46 MB) is too large for responsive web cartography. For client-side visualization in the Geographic Observatory, FireSignal derives an optimized vector asset:

- **Target File:** `frontend/public/data/india_adm1_simplified.geojson` (6.1 MB)
- **Processing Command:**
  ```bash
  mapshaper -i data/boundaries/india_adm1.geojson \
    -simplify 15% keep-shapes \
    -clean \
    -o format=geojson frontend/public/data/india_adm1_simplified.geojson
  ```
- **Topological Invariants:** Uses topology-aware Douglas–Peucker simplification (`15%`), resolves polygon self-intersections, removes slivers, and maintains shared borders without gaps.
- **Coordinate Reference System:** Encoded in WGS 84 (EPSG:4326) for browser rendering; transformed on the fly via Albers equal-area SVG projection in `frontend/src/GeographicObservatory.tsx`.
- **Disclaimer:** The boundary geometries reflect a historical 2011 demarcation snapshot and are intended purely for statistical aggregation and web cartography, not legal or survey-grade boundary determination.

### 14.3 Regional Spatial Join & Non-Summability to National OGCD

Hotspot detections are assigned to administrative regions using point-in-polygon spatial intersection in GeoPandas (`predicate='intersects'`). Observations intersecting polygon boundaries are deterministically assigned.

Detections are inserted into a regional SQLite table:

```sql
CREATE TABLE regional_cells(
    sensor TEXT NOT NULL,
    region TEXT NOT NULL,
    day TEXT NOT NULL,
    cell_x INTEGER NOT NULL,
    cell_y INTEGER NOT NULL,
    PRIMARY KEY(sensor, region, day, cell_x, cell_y)
) WITHOUT ROWID;
```

> [!IMPORTANT]
> **Relationship Between Regional Sums and National OGCD Totals:**
> The sum of regional OGCD across all 36 administrative regions is not mathematically constrained to equal the national archive OGCD total. Two distinct boundary effects operate simultaneously in the pipeline:
>
> 1. **Cross-Border Cell Duplication ($\sum \text{Regional} > \text{National}$):** A 5 km grid cell that straddles an internal boundary between Region A and Region B may contain active-fire detections in Region A and detections in Region B on the same calendar day. In `regional_cells` (`pipeline/regional_pipeline.py`), this cell contributes 1 OGCD to Region A and 1 OGCD to Region B (2 regional counts). In `cells` (`pipeline/historical_pipeline.py`), the national table deduplicates across the entire country, contributing only 1 OGCD nationally.
> 2. **Unmatched Bounding-Box Detections ($\sum \text{Regional} < \text{National}$):** The national pipeline processes all valid detections within the rectangular FIRMS geographic download bounding box ($6.0^{\circ}\text{N}\text{--}38.0^{\circ}\text{N}$, $68.0^{\circ}\text{E}\text{--}98.0^{\circ}\text{E}$). Detections falling outside the 36 ADM1 administrative boundary polygons (such as offshore island slivers, coastal maritime points, or peripheral areas outside the 2011 census demarcation) are included in the national total but are unmatched and excluded from all regional statistics.
>
> Consequently, the summed regional OGCD can be **greater than, equal to, or less than** the national archive OGCD total depending on which mechanism dominates in a given observation period:
> - When cross-border interior fire activity exceeds peripheral unmatched detections, the regional sum is greater than the national total.
> - When coastal or peripheral unmatched detections exceed cross-border duplication, the regional sum is less than the national total.
>
> Across the 432 observed sensor-months in the historical dataset (276 MODIS months and 156 VIIRS months):
> - **Regional Sum > National Total:** in **160 months** (37.0% of months)
> - **Regional Sum < National Total:** in **252 months** (58.3% of months)
> - **Regional Sum == National Total:** in **20 months** (4.6% of months)

---

## 15. Regional Harmonization Evaluation

### 15.1 Hierarchical Shrinkage Formulation

To prevent severe overfitting in states with small numbers of monthly fire detections, FireSignal implements a two-stage hierarchical empirical Bayes shrinkage model:

#### Stage 1: Regional Global Slope $\beta_r$
Shrinks the regional slope toward the national global slope $\beta_{\text{national}}$:

$$\beta_r = \frac{n_r b_r + \lambda_r \beta_{\text{national}}}{n_r + \lambda_r}$$

where:
- $b_r = \frac{\sum_{i \in \text{Train}_r} x_{r, i} y_{r, i}}{\sum_{i \in \text{Train}_r} x_{r, i}^2}$ is the raw unregularized slope for region $r$.
- $n_r = |\text{Train}_r|$ is the count of paired training months for region $r$ ($n_r \le 108$).
- $\lambda_r = 24$ is the regional shrinkage parameter (24 pseudo-months of national weight).
- $\beta_{\text{national}} = \hat{\beta}_{\text{global}} \approx 0.1604$.

*Code Reference:* `pipeline/regional_harmonization_experiment.py` (lines 94–96).

#### Stage 2: Regional Seasonal Slope $\beta_{r, m}$
Shrinks the region-month slope toward the region's overall slope $\beta_r$:

$$\beta_{r, m} = \frac{n_{r, m} b_{r, m} + \lambda_m \beta_r}{n_{r, m} + \lambda_m}$$

where:
- $b_{r, m} = \frac{\sum_{i \in \text{Train}_{r, m}} x_{r, m, i} y_{r, m, i}}{\sum_{i \in \text{Train}_{r, m}} x_{r, m, i}^2}$ is the raw unregularized slope for region $r$ in calendar month $m$.
- $n_{r, m} = |\text{Train}_{r, m}|$ is the count of paired training years for region $r$ in month $m$ ($n_{r, m} \le 9$).
- $\lambda_m = 6$ is the seasonal shrinkage parameter (6 pseudo-years of regional weight).

*Code Reference:* `pipeline/regional_harmonization_experiment.py` (lines 98–103).

### 15.2 Held-Out Evaluation on 2024–2025 Test Split (623 Paired Months)

Models were evaluated across all 623 paired regional monthly observations in the held-out test split:

| Harmonization Candidate | Transfer Function Formula | Held-Out MAE (OGCD) | Held-Out RMSE (OGCD) | Mean Bias (OGCD) |
| :--- | :--- | :---:| :---:| :---:|
| **Raw VIIRS** | $\hat{y} = x$ | 822.77 | 1,815.15 | +822.70 |
| **National Global Adjustment** | $\hat{y} = \beta_{\text{national}} x$ | 72.12 | 178.83 | -1.88 |
| **National Seasonal Adjustment** | $\hat{y} = \beta_m x$ | 70.98 | 175.12 | -2.88 |
| **Regional Global Adjustment** | $\hat{y} = \beta_r x$ | 57.16 | 138.42 | -7.82 |
| **Regional Seasonal Adjustment** | $\hat{y} = \beta_{r, m} x$ | **43.56** | **107.65** | -10.81 |

Relative to the national seasonal model, the **Regional Seasonal Adjustment** reduced MAE by **38.63%** and RMSE by **38.53%**.

### 15.3 Regional Robustness & Qualification Criteria

- **Total Administrative Regions:** 36
- **Regions with Detections:** 35 (Lakshadweep recorded 0 detections across all sensor years)
- **Robust Evaluation Subset ($\ge 12$ paired test months):** 28 regions
  - **Improved vs. National Seasonal:** 24 regions (85.7%)
  - **Degraded vs. National Seasonal:** 4 regions (Goa, Delhi, Puducherry, Sikkim — regions characterized by very low absolute fire activity where localized ratios suffer from small-sample variance)
- **Sparse Evaluation Subset ($< 12$ paired test months):** 7 regions

> [!CAUTION]
> Regional harmonization results should not be generalized automatically to regions with fewer than 12 paired monthly observations. In sparse fire regimes, the national seasonal adjustment is recommended.

---

## 16. Comprehensive Interpretation Guidelines & Uncertainties

1. **Statistical Reference Target:** All evaluated models adjust VIIRS toward a MODIS-equivalent scale. Because MODIS undercounts small and cool fires, predicting MODIS OGCD does not yield "true" fire occurrence.
2. **Detection Opportunities Unaccounted For:** Orbital mechanics create latitudinal variation in overpass count. Cloud cover and viewing geometry are not explicitly factored into the transfer functions.
3. **Selection Bias in Regional Testing:** The regional evaluation only includes months with observations from both sensors, which may slightly over-represent dry, fire-prone months relative to monsoon months.
4. **Prospective Generalization Limits:** While held-out 2024–2025 performance demonstrates temporal stability over two years, climate anomalies, sensor degradation, or land-use changes may alter transfer ratios in future periods.

---

## 17. Reproducibility & Pipeline Script Inventory

FireSignal provides a complete suite of Python scripts in `pipeline/` to reproduce every table and JSON artifact from source archives:

| Script | Purpose & Outputs | Primary CLI Command |
| :--- | :--- | :--- |
| `pipeline/run_all.py` | Orchestrates end-to-end baseline experiments | `python pipeline/run_all.py` |
| `pipeline/experiment_01_grid.py` | Evaluates 1 km, 5 km, 10 km spatial aggregation | `python pipeline/experiment_01_grid.py` |
| `pipeline/experiment_02_agreement.py` | Computes daily Pearson/Spearman correlations | `python pipeline/experiment_02_agreement.py` |
| `pipeline/experiment_03_changes.py` | Computes day-to-day first-difference correlations | `python pipeline/experiment_03_changes.py` |
| `pipeline/experiment_04_daynight.py` | Computes day vs. night stratified OGCD ratios | `python pipeline/experiment_04_daynight.py` |
| `pipeline/export_analyzer.py` | Assembles summary metrics into `frontend/public/data/` | `python pipeline/export_analyzer.py` |
| `pipeline/historical_pipeline.py` | Streams multi-year FIRMS ZIPs into national 5 km OGCD | `python pipeline/historical_pipeline.py --modis data/raw/DL_FIRE_M-C61_847437.zip --viirs data/raw/DL_FIRE_SV-C2_847444.zip` |
| `pipeline/harmonization_experiment.py` | Fits and evaluates national global and seasonal models | `python pipeline/harmonization_experiment.py --input data/historical/historical_monthly_5km.csv` |
| `pipeline/regional_pipeline.py` | Performs spatial point-in-polygon join with ADM1 polygons | `python pipeline/regional_pipeline.py --full --chunk-size 100000` |
| `pipeline/regional_harmonization_experiment.py` | Fits and evaluates hierarchical regional models | `python pipeline/regional_harmonization_experiment.py` |

### Environment Requirements
- **Python:** Version 3.10 or higher.
- **Core Packages:** `numpy`, `pandas`, `geopandas`, `pyproj`, `scipy`, `shapely`, `matplotlib`.

---

## 18. Automated Scientific Validation & Contract Testing

To protect against scientific regression and schema drift, FireSignal implements automated tests covering data contracts, coordinate invariants, and aggregation logic:

### 18.1 Python Scientific Contract Tests (5 Tests)
Executed via Python `unittest` (zero external test dependencies):
```bash
python -m unittest discover -s tests
```
- Validates EPSG:6933 5 km grid resolution and projection metadata invariants.
- Confirms 1-to-1 name matching between regional JSON records and boundary GeoJSON features across all 36 regions.
- Asserts that monthly detection days never exceed calendar days in the given month (including leap years).
- Verifies strict sensor operational lifetime bounds (MODIS 2003–2025; VIIRS 2013–2025).

### 18.2 Frontend Regression Test Suite (43 Tests)
Executed via the native Node.js test runner:
```bash
npm --prefix frontend run test
```
- Validates canonical URL hash normalization and fallback mechanisms (`navigation.test.ts`).
- Asserts annual OGCD summation and detection day logic across real and synthetic fixtures (`observatory_aggregations.test.ts`).
- Tests in-memory cache deduplication, retry resilience, and cache-hit preservation during return navigation (`observatory_cache.test.ts`).
- Enforces strict GeoJSON schema and boundary completeness rules (`scientific_data_contracts.test.ts`).

*Note:* Automated tests ensure computational consistency and schema integrity; they do not establish physical calibration or satellite ground truth.

---

## 19. Academic References & Literature Citations

1. **MODIS Active-Fire Detection Algorithm (Collection 6):**
   Giglio, L., Schroeder, W., & Justice, C. O. (2016). *The collection 6 MODIS active fire detection algorithm and fire products.* Remote Sensing of Environment, 178, 31–41.
   DOI: [10.1016/j.rse.2016.02.054](https://doi.org/10.1016/j.rse.2016.02.054)

2. **VIIRS 375 m Active-Fire Detection Product:**
   Schroeder, W., Oliva, P., Giglio, L., & Csiszar, I. A. (2014). *The New VIIRS 375 m active fire detection product—Algorithm description and initial assessment.* Remote Sensing of Environment, 143, 85–96.
   DOI: [10.1016/j.rse.2013.12.008](https://doi.org/10.1016/j.rse.2013.12.008)

3. **geoBoundaries Global Administrative Boundaries:**
   Runfola, D., Anderson, A., Baier, H., Cauley, M., Chen, D., Diloreto, E., et al. (2020). *geoBoundaries: A global database of political administrative boundaries.* PLOS ONE, 15(4), e0231866.
   DOI: [10.1371/journal.pone.0231866](https://doi.org/10.1371/journal.pone.0231866)

4. **EASE-Grid 2.0 Global Equal-Area Coordinate System:**
   Brodzik, M. J., Billingsley, B., Haran, T., Raup, B., & Armstrong, R. L. (2012). *EASE-Grid 2.0: Incremental but significant improvements for Earth-gridded data.* ISPRS International Journal of Geo-Information, 1(1), 32–45.
   DOI: [10.3390/ijgi1010032](https://doi.org/10.3390/ijgi1010032)

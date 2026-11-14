# FireSignal — Scientific Methodology

## 1. Project objective

FireSignal investigates how satellite sensor differences affect the interpretation of active fire hotspot observations.

FireSignal compares NASA MODIS and VIIRS observations over India using common-grid spatial aggregation, historical activity analysis, geographic exploration, temporal diagnostics, and statistical harmonization.

Its purpose is to make cross-sensor differences visible and interpretable, not to claim that the two instruments produce equivalent fire measurements.

## 2. Data sources

Data were obtained through the NASA Fire Information for Resource Management System (FIRMS) archive.

| Dataset | Product | Period | Records |
|---|---|---|---:|
| MODIS | Collection 6.1, Terra and Aqua | March 1–May 31, 2023 | 37,269 |
| VIIRS | Suomi-NPP Collection 2 | March 1–May 31, 2023 | 313,980 |

Both datasets were requested for India and downloaded as CSV archives.

A hotspot record represents a satellite active-fire detection, not necessarily a unique fire, ignition, or burned-area measurement.

## 3. Spatial aggregation

Coordinates are transformed from geographic coordinates (EPSG:4326) into the equal-area projection EPSG:6933.

Projected coordinates are assigned to fixed grid cells using the floor of each coordinate divided by the nominal grid size.

Three grid resolutions are evaluated:

- 1 km
- 5 km
- 10 km

The primary activity metric is **occupied grid-cell-days (OGCD)**.

For each sensor, each grid cell contributes at most one count per acquisition date, regardless of how many detections occur within that cell on that date.

OGCD values are summed over the analysis period.

Grid dimensions refer to projected-coordinate dimensions. The projection preserves area but does not guarantee identical ground distances along both axes.

## 4. Spatial aggregation results

| Measurement | MODIS | VIIRS | VIIRS/MODIS |
|---|---:|---:|---:|
| Raw detections | 37,269 | 313,980 | 8.425× |
| 1 km OGCD | 35,952 | 236,017 | 6.565× |
| 5 km OGCD | 25,700 | 160,672 | 6.252× |
| 10 km OGCD | 21,814 | 125,538 | 5.755× |

The ratio decreases as the grid becomes coarser.

This demonstrates sensitivity to spatial aggregation. It does not establish that the coarser results are more accurate or that the sensors have been statistically calibrated.

## 5. Daily temporal agreement

Daily 5 km OGCD values are aligned by acquisition date.

Agreement is evaluated using Pearson and Spearman correlations.

Across 92 dates:

- Pearson correlation: 0.8841
- Spearman correlation: 0.9250
- Median daily VIIRS/MODIS ratio: 7.4822

These results indicate strong agreement in broad daily activity patterns, alongside substantial differences in measured activity magnitude.

## 6. Day-to-day change agreement

First differences are calculated between consecutive daily OGCD values.

Across 91 daily changes:

- Pearson correlation: 0.4776
- Spearman correlation: 0.5366
- Direction agreement: 65.93%

Agreement in daily changes is weaker than agreement in daily levels.

This suggests that high overall correlation should not be interpreted as evidence that the sensors respond identically to short-term changes.

## 7. Day/night analysis

Detections are separated using the FIRMS day/night classification.

| Metric | Daytime | Nighttime |
|---|---:|---:|
| MODIS OGCD | 22,588 | 3,599 |
| VIIRS OGCD | 127,900 | 43,755 |
| VIIRS/MODIS ratio | 5.662× | 12.158× |
| Pearson correlation | 0.8762 | 0.7316 |

The nighttime ratio is approximately 2.15 times the daytime ratio.

A cell-day containing both daytime and nighttime detections can contribute to both stratified totals. Consequently, daytime and nighttime OGCD totals are not additive to the unstratified OGCD total.

## 8. Limitations

This prototype has several important limitations:

1. Sections 2–7 describe the original March–May 2023 experiment. The expanded historical analysis covers 2003–2025 for MODIS and 2013–2025 for VIIRS, but observational differences still limit interpretation of long-term trends.
2. MODIS and VIIRS have different detection characteristics, spatial resolutions, and overpass schedules.
3. Sensor observation opportunities and completeness have not been independently verified.
4. Detections have not been matched by overpass time.
5. Confidence categories have not been harmonized across sensors.
6. Correlation does not establish sensor equivalence or measurement accuracy.
7. Grid aggregation and empirical statistical harmonization are not substitutes for independently validated physical sensor calibration.
8. The analysis has not been independently validated against ground observations or burned-area products.

## 9. Calibration status

**Not validated.**

FireSignal provides raw and common-grid comparisons, historical exploration, and empirical statistical harmonization evaluated against MODIS observations.

It does not provide independently calibrated long-term fire activity estimates or verified fire counts.

## 10. Reproducibility

The Python pipeline reads the original NASA FIRMS ZIP archives and generates processed CSV and JSON outputs.

The React dashboard consumes exported JSON files without requiring a live Python backend.

The original archive downloads are excluded from the Git repository; users must obtain the corresponding NASA FIRMS data to reproduce the calculations.

All reported results are specific to the stated datasets, geographic scope, and observation period.
---

## 11. Historical analysis (2003–2025)

FireSignal extends the original March–May 2023 comparison
with a multi-year historical analysis of India.

| Sensor | Product | Years | Source detections |
|---|---|---|---:|
| MODIS | Collection 6.1 | 2003–2025 | 1,801,292 |
| VIIRS | Suomi-NPP Collection 2 | 2013–2025 | 7,634,234 |

The historical pipeline uses EPSG:6933 and a fixed 5 km
projected-coordinate grid.

Detections are deduplicated by sensor, acquisition date,
and grid cell to calculate occupied grid-cell-days (OGCD).

The resulting daily and monthly series describe detected
satellite hotspot activity, not verified fire counts or
burned area.

The absence of detections does not prove the absence of
fire or establish complete observation coverage.

## 12. Historical seasonal anomaly analysis

The historical dashboard provides month-specific comparisons
against historical seasonal activity.

A leave-one-year-out baseline is used to avoid including
the evaluated year in its own historical reference.

Seasonal anomalies are exploratory comparisons of OGCD
activity against the corresponding historical month.

They are not estimates of burned area, fire severity,
or independently verified changes in fire occurrence.

## 13. National statistical harmonization

FireSignal evaluates statistical transformations of VIIRS
monthly OGCD values toward the MODIS monthly OGCD scale.

The national evaluation uses:

- Training: 2013–2021
- Validation: 2022–2023
- Held-out testing: 2024–2025

Evaluated approaches include raw VIIRS activity,
a global multiplicative adjustment, and a
month-specific seasonal adjustment.

Seasonal factors are regularized toward the global
factor to reduce instability from limited observations.

Model selection uses validation performance, while
the held-out test period is reserved for evaluation.

On the national held-out test period, seasonal
adjustment achieved:

- Mean absolute error: 542.16 OGCD
- Root mean squared error: 821.22 OGCD

The corresponding global-adjustment errors were:

- Mean absolute error: 675.34 OGCD
- Root mean squared error: 1,088.57 OGCD

These results represent approximately 19.7% lower MAE
and 24.6% lower RMSE relative to global adjustment.

MODIS is the statistical reference series, not
independent ground truth.

## 14. Regional geographic analysis

Regional analysis assigns hotspot detections to
Indian state and union-territory polygons.

The administrative boundaries are obtained from
geoBoundaries, India ADM1, gbOpen, representing a
historical 2011 boundary reference.

Underlying attribution: DataMeet India /
Election Commission of India.

Boundary license: CC BY 2.5 IN.

The dataset contains 36 administrative regions,
of which 35 have matched hotspot observations.
Lakshadweep has no matched observations in the
processed datasets.

Regional OGCD values are deduplicated by sensor,
region, acquisition date, and 5 km grid cell.

Because a shared grid cell may contain observations
assigned to different administrative regions,
the sum of regional OGCD values can exceed the
corresponding national OGCD value.

Unmatched detections are excluded from regional
statistics.

## 15. Regional harmonization evaluation

Five approaches are compared:

1. Raw VIIRS observations
2. National global adjustment
3. National seasonal adjustment
4. Regional global adjustment
5. Regional seasonal adjustment

Regional factors are regularized toward national
factors to reduce instability in smaller datasets.

The evaluation uses the same chronological split:

- Training: 2013–2021
- Validation: 2022–2023
- Held-out testing: 2024–2025

Evaluation is restricted to paired regional months
with observations from both sensors.

On the held-out regional test set:

| Approach | MAE | RMSE |
|---|---:|---:|
| Raw VIIRS | 822.77 | 1,815.15 |
| National global | 72.12 | 178.83 |
| National seasonal | 70.98 | 175.12 |
| Regional global | 57.16 | 138.42 |
| Regional seasonal | 43.56 | 107.65 |

The regional seasonal method was selected using
validation performance.

Relative to national seasonal adjustment, regional
seasonal adjustment reduced held-out MAE by
approximately 38.6% and RMSE by approximately 38.5%.

Among 28 regions with at least 12 paired test months,
24 improved relative to national seasonal adjustment,
while four performed worse.

Seven additional evaluated regions had fewer than
12 paired test months and should be interpreted
with particular caution.

## 16. Interpretation and uncertainty

FireSignal provides empirical cross-sensor
harmonization, not physical sensor calibration.

Important limitations include:

- MODIS is not independently verified ground truth.
- Observation opportunities and satellite overpass
  timing are not explicitly normalized.
- Confidence classifications are not fully
  harmonized across instruments.
- Detection probability differs between sensors.
- Seasonal and geographic variation may reflect
  observational differences as well as fire activity.
- Administrative boundaries are historical and
  may not match present-day jurisdictions.
- Sparse regional observations can produce
  unstable statistical estimates.
- Regional test results exclude unpaired months,
  potentially introducing selection bias.
- Held-out evaluation does not establish performance
  on future years or independent fire-event datasets.

The reported error reductions quantify agreement
with MODIS OGCD observations on the evaluated
datasets. They do not establish improvements in
actual fire detection accuracy.

## 17. Reproducibility and software

The repository contains Python pipelines for
historical processing, national harmonization,
regional aggregation, and regional harmonization.

Relevant scripts include:

- pipeline/historical_pipeline.py
- pipeline/harmonization_experiment.py
- pipeline/regional_pipeline.py
- pipeline/regional_harmonization_experiment.py

Original NASA FIRMS archive downloads and source
administrative GeoJSON files are excluded from Git.

The boundary source, license, and download
instructions are documented in
data/boundaries/README.md.

Browser-ready derived JSON files are retained
under frontend/public/data/.

The public dashboard runs as a static React
application and does not require a live
Python backend.

The numerical results are specific to the
archived datasets, preprocessing decisions,
geographic scope, and chronological evaluation
periods described above.

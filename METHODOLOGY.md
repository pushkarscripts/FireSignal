# FireSignal — Scientific Methodology

## 1. Project objective

FireSignal investigates how satellite sensor differences affect the interpretation of active fire hotspot observations.

The prototype compares NASA MODIS and VIIRS observations over India using common-grid spatial aggregation and temporal agreement diagnostics.

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

1. The analysis covers only March–May 2023 and does not establish long-term trends.
2. MODIS and VIIRS have different detection characteristics, spatial resolutions, and overpass schedules.
3. Sensor observation opportunities and completeness have not been independently verified.
4. Detections have not been matched by overpass time.
5. Confidence categories have not been harmonized across sensors.
6. Correlation does not establish sensor equivalence or measurement accuracy.
7. Grid aggregation is not a substitute for validated cross-sensor calibration.
8. The analysis has not been independently validated against ground observations or burned-area products.

## 9. Calibration status

**Not validated.**

FireSignal currently provides raw and common-grid comparisons, together with exploratory agreement diagnostics.

It does not provide calibrated long-term fire activity estimates.

## 10. Reproducibility

The Python pipeline reads the original NASA FIRMS ZIP archives and generates processed CSV and JSON outputs.

The React dashboard consumes exported JSON files without requiring a live Python backend.

The original archive downloads are excluded from the Git repository; users must obtain the corresponding NASA FIRMS data to reproduce the calculations.

All reported results are specific to the stated datasets, geographic scope, and observation period.
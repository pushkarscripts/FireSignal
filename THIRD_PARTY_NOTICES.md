# FireSignal — Third-Party Notices and Attribution

FireSignal is an independent scientific exploration application developed for the NASA Space Apps Challenge 2026.

This document describes the licensing scope of the project, the provenance of its satellite observations and geographic boundaries, the status of derived scientific datasets, third-party software dependencies, and applicable attribution requirements.

---

## A. Licensing Scope

### 1. Original FireSignal Software

Original FireSignal source code is released under the **MIT License**.

See the repository's [LICENSE](LICENSE) file.

**Copyright © 2026 Pushkar**

Author: [Pushkar (@pushkarscripts)](https://github.com/pushkarscripts)

Subject to the author's ownership and licensing rights, the MIT License covers original project materials, including:

- **Frontend application:** Original TypeScript, TSX, JavaScript, CSS, and HTML code implementing the interface, navigation, and visualizations.
- **Geographic Observatory:** Original map-rendering logic, projections, regional aggregation utilities, visualization components, and caching implementations.
- **Scientific processing:** Original Python scripts for historical analysis, spatial aggregation, sensor comparison, and harmonization.
- **Automated tests:** Original frontend and Python validation and regression tests.
- **Project documentation:** Original documentation and methodological explanations authored for FireSignal.
- **Original visual assets:** FireSignal-specific artwork and branding elements created by the copyright holder, excluding incorporated third-party materials.

The MIT License permits reuse, modification, distribution, and commercial use of covered materials, subject to its conditions, including preservation of the required copyright and permission notices.

### 2. Third-Party Materials

The project's MIT License does **not** relicense independently owned third-party materials, including:

- NASA FIRMS satellite observation data.
- Geographic administrative boundary datasets.
- Third-party software libraries and dependencies.
- External fonts, icons, images, or other assets, where applicable.
- Third-party material incorporated into derived datasets.

These materials remain subject to their respective applicable licenses, policies, and attribution requirements.

The presence of third-party material in this repository does not imply that FireSignal owns its copyright or can grant additional rights to it.

---

## B. NASA FIRMS Satellite Observations

FireSignal uses active-fire satellite observations obtained from the **NASA Fire Information for Resource Management System (FIRMS)**, part of NASA's Earth Science Data and Information System (ESDIS).

### 1. Satellite Products

**MODIS Collection 6.1**

- Instrument: Moderate Resolution Imaging Spectroradiometer (MODIS).
- Satellites: Terra and Aqua.
- Nominal active-fire detection product resolution: approximately 1 km at nadir.
- FireSignal historical analysis period: 2003–2025.

**VIIRS Suomi-NPP Collection 2**

- Instrument: Visible Infrared Imaging Radiometer Suite (VIIRS).
- Satellite: Suomi National Polar-orbiting Partnership (Suomi-NPP).
- Nominal active-fire detection product resolution: approximately 375 m.
- FireSignal historical analysis period: 2013–2025.

The nominal sensor resolutions should not be confused with FireSignal's analytical grid resolution.

FireSignal aggregates observations using an equal-area 5 km grid (EPSG:6933) and reports occupied grid-cell-days (OGCD). These measurements are not equivalent to burned area, fire severity, or independently verified fire events.

### 2. Official Sources

- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/)
- [NASA Earthdata](https://www.earthdata.nasa.gov/)
- [NASA FIRMS Citation Guidance](https://firms.modaps.eosdis.nasa.gov/citation/)

### 3. Data Access and Copyright

NASA Earth Science data products are generally distributed under NASA's open data policies.

Under 17 U.S.C. § 105, copyright protection under United States law is generally unavailable for works prepared by U.S. federal government employees as part of their official duties.

This statutory provision does not automatically establish the copyright status of every dataset, image, software component, or third-party contribution associated with NASA.

Users should consult the applicable NASA data policies and product documentation when redistributing source materials.

NASA FIRMS requests appropriate acknowledgment and scientific citation.

FireSignal does not claim ownership of the original NASA FIRMS observations.

The original raw satellite archives are not included in this repository. Reproducing the scientific processing may require obtaining the relevant source data from NASA FIRMS.

### 4. Scientific Citations

**MODIS Active Fire Algorithm**

Giglio, L., Schroeder, W., & Justice, C. O. (2016). *The collection 6 MODIS active fire detection algorithm and fire products.* Remote Sensing of Environment, 178, 31–41.

DOI: https://doi.org/10.1016/j.rse.2016.02.054

**VIIRS 375 m Active Fire Algorithm**

Schroeder, W., Oliva, P., Giglio, L., & Csiszar, I. A. (2014). *The New VIIRS 375 m active fire detection data product: Algorithm description and initial assessment.* Remote Sensing of Environment, 143, 85–96.

DOI: https://doi.org/10.1016/j.rse.2013.12.008

### 5. Acknowledgment

FireSignal acknowledges the use of satellite observation data provided through NASA's Fire Information for Resource Management System (FIRMS), part of NASA's Earth Observing System Data and Information System (EOSDIS).

---

## C. Geographic Administrative Boundaries

FireSignal uses administrative boundary geometry to present regional satellite observation summaries for India's states and union territories.

### 1. Distribution Provider and Provenance

The repository documentation identifies the following geographic source:

| Attribute | Description |
|---|---|
| Distribution provider | geoBoundaries |
| Organization | William & Mary geoLab |
| Collection | gbOpen |
| Country | India (IND) |
| Administrative level | ADM1 |
| Regional coverage | 36 states and union territories |
| Documented upstream contributors | DataMeet India / Election Commission of India |
| Documented historical reference | 2011 administrative demarcation |

**Source references:**

- [geoBoundaries](https://www.geoboundaries.org/)
- [geoBoundaries India ADM1 API](https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/)
- [geoBoundaries research publication](https://doi.org/10.1371/journal.pone.0231866)

The API's `current` endpoint may change over time. The source metadata for the particular boundary release used by FireSignal should be retained when available.

### 2. Licensing and Attribution

The repository's provenance documentation identifies two distinct Creative Commons licenses:

**Underlying boundary source**

Creative Commons Attribution 2.5 India (CC BY 2.5 IN)

License: https://creativecommons.org/licenses/by/2.5/in/

**geoBoundaries distribution**

Creative Commons Attribution 4.0 International (CC BY 4.0)

License: https://creativecommons.org/licenses/by/4.0/

These are separate licenses and must not be interpreted as interchangeable or as an unrestricted choice between licensing terms.

The repository records CC BY 2.5 IN for underlying source material and CC BY 4.0 for the geoBoundaries distribution. The precise licensing relationship and obligations applicable to the specific downloaded geometry should be confirmed against its original release metadata and relevant upstream terms.

Until that verification is documented, FireSignal does not assert that either license alone exhaustively describes all rights and obligations associated with the redistributed boundary geometry.

Both licenses generally permit sharing and adaptation subject to their respective conditions, including appropriate attribution and disclosure of modifications.

### 3. Simplified Geographic Asset

**File:** `frontend/public/data/india_adm1_simplified.geojson`

This asset is derived from the geoBoundaries gbOpen India ADM1 geometry.

The documented processing workflow includes:

1. Simplification using Mapshaper with the command `-simplify 15% keep-shapes clean`.
2. Preservation of small administrative shapes where possible.
3. Geometry cleaning associated with the simplification workflow.
4. Preservation of geographic coordinates in WGS 84 (EPSG:4326).

The simplified geometry is used for web cartographic rendering and is not part of FireSignal's original MIT-licensed software code.

The simplification process changes the source geometry. Consequently, the resulting boundaries should not be treated as exact legal or survey-grade administrative boundaries.

### 4. Geographic Data Attribution

Suggested attribution for the geographic asset:

> India ADM1 administrative boundary geometry sourced through geoBoundaries (gbOpen), with underlying attribution to DataMeet India and the Election Commission of India. The repository documents CC BY 2.5 India for underlying source material and CC BY 4.0 for the geoBoundaries distribution. Geometry simplified and adapted using Mapshaper for FireSignal's web visualization.

The specific redistribution obligations should be checked against the source release metadata.

### 5. Academic Citation

Runfola, D., Anderson, A., Baier, H., Cauley, M., Chen, D., Diloreto, E., et al. (2020). *geoBoundaries: A global database of political administrative boundaries.* PLOS ONE, 15(4), e0231866.

DOI: https://doi.org/10.1371/journal.pone.0231866

---

## D. Derived Scientific Datasets

FireSignal produces scientific summaries, regional aggregations, and sensor comparison results using the source observations and geographic processing methods described in [METHODOLOGY.md](METHODOLOGY.md).

### 1. Bundled Data Products

The `frontend/public/data/` directory contains generated data products, including:

| Dataset | Description |
|---|---|
| `regional_monthly_5km.json` | Monthly regional occupied grid-cell-day summaries |
| `historical_calendar_5km.json` | Historical daily occupied grid-cell-day series |
| `historical_metadata.json` | Scientific processing and dataset metadata |
| `daily_comparison.json` | Paired daily sensor comparison summaries |
| `harmonization_results.json` | Cross-sensor harmonization model results |
| `regional_harmonization_results.json` | Regional harmonization and evaluation results |
| `sensor_analyzer.json` | Sensor analysis summaries |
| `experiment_01_summary.json` | Experimental grid-analysis results |
| `experiment_02_summary.json` | Experimental sensor comparison results |

This inventory describes the principal scientific outputs and is not necessarily exhaustive.

### 2. Licensing Scope of Derived Data

The MIT License covers FireSignal's original software implementation. It does not automatically establish the licensing status of all scientific data products generated by that software.

Derived datasets may contain:

- Factual satellite observation summaries.
- Mathematical aggregations.
- Statistical coefficients and model evaluation results.
- Regional identifiers and geographic associations.
- Metadata documenting processing choices and upstream sources.

Copyright protection for individual facts, compilations, databases, and other data-related materials may depend on their contents and applicable jurisdiction.

Producing a derived dataset does not automatically eliminate rights or obligations associated with incorporated third-party material.

### 3. Attribution for Redistribution

Users redistributing or adapting derived datasets should retain relevant source acknowledgments and comply with applicable upstream terms.

In particular:

- **NASA FIRMS** should be acknowledged as the source of satellite observations.
- **geoBoundaries and its documented upstream contributors** should be credited where geographic boundary material is incorporated or its applicable attribution terms require acknowledgment.
- FireSignal's original processing methodology should be cited when its derived outputs or analytical methods are reused.

Different data products may incorporate different upstream materials. Their applicable attribution and redistribution requirements should therefore be assessed individually.

For scientific reproducibility, users should also retain relevant sensor identifiers, processing definitions, temporal coverage, spatial resolution, and methodological limitations.

---

## E. Third-Party Software Dependencies

FireSignal uses open-source libraries for its frontend application, visualization, build tooling, and development workflows.

Third-party packages retain their respective upstream licenses.

The tables below describe the declared dependency versions and license classifications documented during the repository audit. Version expressions beginning with `^` or `~` are dependency constraints, not necessarily the exact versions installed or bundled.

For precise resolved versions, consult `frontend/package-lock.json`.

### 1. Application Dependencies

| Package | Declared version | License | Project |
|---|---|---|---|
| React | `^19.3.1` | MIT | [react.dev](https://react.dev/) |
| React DOM | `^19.3.1` | MIT | [react.dev](https://react.dev/) |
| Recharts | `^3.10.1` | MIT | [GitHub](https://github.com/recharts/recharts) |
| Lucide React | `^1.73.0` | ISC | [lucide.dev](https://lucide.dev/) |

These packages provide frontend rendering, interactive charts, and icon components.

### 2. Styling, Build, and Development Dependencies

| Package | Declared version | License | Project |
|---|---|---|---|
| Tailwind CSS | `^4.3.5` | MIT | [tailwindcss.com](https://tailwindcss.com/) |
| @tailwindcss/vite | `^4.3.5` | MIT | [tailwindcss.com](https://tailwindcss.com/) |
| Vite | `^8.3.6` | MIT | [vite.dev](https://vite.dev/) |
| @vitejs/plugin-react | `^6.1.2` | MIT | [GitHub](https://github.com/vitejs/vite-plugin-react) |
| TypeScript | `~7.0.2` | Apache-2.0 | [typescriptlang.org](https://www.typescriptlang.org/) |
| Oxlint | `^1.90.0` | MIT | [oxc.rs](https://oxc.rs/) |
| @types/react | `^19.3.0` | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| @types/react-dom | `^19.3.0` | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| @types/node | `^24.19.2` | MIT | [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |

Build-time tools are not necessarily included as independent packages in the deployed client application. Their generated output may nevertheless contain material subject to upstream license or notice requirements.

### 3. Transitive Dependencies

The earlier dependency audit identified packages with the following license categories:

- MIT
- ISC
- Apache-2.0
- BSD-3-Clause
- 0BSD
- BlueOak-1.0.0
- MPL-2.0
- Multiple-license expressions

In particular, the audit identified MPL-2.0-licensed Lightning CSS platform packages associated with the styling build toolchain.

MPL-2.0 is a file-level copyleft license. Its presence in a dependency tree does not automatically impose MPL-2.0 on FireSignal's original source code.

Whether additional obligations arise depends on how the relevant components are used, modified, and redistributed.

This inventory is not a substitute for reviewing the complete resolved dependency tree and the applicable license texts.

### 4. Copyright and Notice Retention

MIT, ISC, Apache-2.0, MPL-2.0, and other open-source licenses contain different requirements governing the preservation of copyright notices, license texts, and related information.

Redistributors should consult the actual license documents for the specific packages and versions they distribute.

In particular:

- MIT and ISC licenses generally require preservation of their copyright and permission notices in relevant redistributed copies.
- Apache-2.0 includes additional conditions relating to license copies, notices, and modifications.
- MPL-2.0 imposes obligations concerning covered source files when the license's distribution conditions are triggered.
- License requirements may differ between source distribution, generated bundles, and distribution of modified third-party components.

The dependency tables in this document provide attribution and inventory information. **They do not replace any license texts or notices that must accompany redistributed third-party software.**

FireSignal's original MIT License does not supersede upstream dependency licenses.

### 5. License Verification

When preparing a source or binary redistribution, verify:

1. The actual resolved package versions.
2. The license metadata and full license text associated with each distributed component.
3. Any required copyright or attribution notices.
4. Whether bundled or modified third-party material introduces additional obligations.
5. Whether the production build preserves required third-party notices.

The project's dependency inventory may change as packages are updated.

---

## F. Attribution and Non-Endorsement

### 1. Acknowledged Organizations

FireSignal acknowledges the contributions of:

- **NASA FIRMS**, for satellite active-fire observations.
- **NASA ESDIS**, for Earth science data infrastructure.
- **geoBoundaries and the William & Mary geoLab**, for geographic boundary distribution and documentation.
- **DataMeet India and the Election Commission of India**, as documented upstream geographic boundary sources.
- **Open-source software maintainers**, whose libraries and development tools support the application.

These acknowledgments recognize source materials and technical contributions. They do not transfer ownership of those materials to FireSignal.

### 2. Independent Project Status

FireSignal is an independently developed scientific exploration project created for the NASA Space Apps Challenge 2026.

Its scientific analyses, statistical models, visualizations, and interpretations are the responsibility of the project author.

### 3. Non-Endorsement

Use of names, citations, datasets, trademarks, or references to NASA, the United States Government, geoBoundaries, William & Mary, DataMeet, the Election Commission of India, or other organizations does not imply their sponsorship, endorsement, certification, or approval of FireSignal.

---

## G. Further Documentation

For additional information, see:

- [README.md](README.md) — Project overview, features, setup, and acknowledgments.
- [METHODOLOGY.md](METHODOLOGY.md) — Scientific methodology, processing definitions, validation, and limitations.
- [LICENSE](LICENSE) — MIT License for original FireSignal software.

For questions about the project, visit the [FireSignal GitHub repository](https://github.com/pushkarscripts/FireSignal).

---

*This document describes the project's licensing and attribution understanding based on available repository records and dependency information. It is not a substitute for the applicable upstream license texts or independent legal advice.*
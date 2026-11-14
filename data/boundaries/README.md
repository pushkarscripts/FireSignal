# India ADM1 Administrative Boundaries

FireSignal uses administrative boundaries to assign NASA FIRMS
MODIS and VIIRS hotspot observations to Indian states and
union territories.

## Source

- Provider: geoBoundaries
- Collection: gbOpen
- Country: India (IND)
- Administrative level: ADM1
- API: https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/
- Underlying attribution: DataMeet India / Election Commission of India
- Boundary year represented: 2011
- License: CC BY 2.5 IN
- License URL: https://creativecommons.org/licenses/by/2.5/in/

## Download

Retrieve the GeoJSON download URL from the geoBoundaries API
metadata and save the file as:

data/boundaries/india_adm1.geojson

PowerShell example:

$metadata = Invoke-RestMethod `
  "https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/"

Invoke-WebRequest `
  -Uri $metadata.gjDownloadURL `
  -OutFile "data/boundaries/india_adm1.geojson"

## Processing

Run from the FireSignal project root:

python pipeline/regional_pipeline.py --full --chunk-size 100000

This also requires the original NASA FIRMS MODIS and VIIRS
archives in data/raw/.

The generated regional CSV and quality report are stored in
data/historical/.

## Important limitations

- These boundaries represent a historical reference snapshot,
  not time-varying administrative boundaries.
- Boundary definitions may differ from current boundaries.
- Points outside the polygons are excluded from regional totals.
- Regional OGCD totals can exceed national OGCD totals when
  grid cells intersect observations assigned to different regions.
- No matched hotspot detection does not establish zero fire activity
  or complete satellite observation coverage.

The source GeoJSON is excluded from Git. Derived regional
statistics and the required attribution are retained in the project.

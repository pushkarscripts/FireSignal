import { type RegionalRecord } from './observatoryAggregations.ts'

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface RegionalPayload {
  metric: string
  projection: string
  gridKm: number
  boundaryYear: number
  boundaryLicense: string
  regions: string[]
  records: RegionalRecord[]
  limitations?: string[]
}

export interface GeoFeature {
  type: 'Feature'
  properties: {
    shapeName: string
    shapeISO: string
    shapeID?: string
    shapeGroup?: string
    shapeType?: string
  }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

export interface GeoJSONPayload {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

export interface ProjectedFeature {
  name: string
  iso: string
  type: string
  path: string
  centroid: [number, number]
  bbox: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number }
  isSmall: boolean
}

export interface ObservatoryLoadedDatasets {
  geoData: GeoJSONPayload
  regionalData: RegionalPayload
  projectedFeatures: ProjectedFeature[]
}

export interface LoadObservatoryOptions {
  fetcher?: typeof fetch
  baseUrl?: string
  forceRefresh?: boolean
  signal?: AbortSignal
}

// ============================================================================
// PROJECTION ENGINE (Albers Equal Area Conic tailored for India)
// Standard parallels: 12°N and 28°N, Central meridian: 82.5°E, Origin: 22°N
// ============================================================================

const TO_RAD = Math.PI / 180
const PHI1 = 12 * TO_RAD
const PHI2 = 28 * TO_RAD
const PHI0 = 22 * TO_RAD
const LAM0 = 82.5 * TO_RAD

const N = (Math.sin(PHI1) + Math.sin(PHI2)) / 2
const C = Math.cos(PHI1) ** 2 + 2 * N * Math.sin(PHI1)
const RHO0 = Math.sqrt(C - 2 * N * Math.sin(PHI0)) / N

export function albersIndia([lon, lat]: [number, number]): [number, number] {
  const lam = lon * TO_RAD
  const phi = lat * TO_RAD
  const rho = Math.sqrt(Math.max(0, C - 2 * N * Math.sin(phi))) / N
  const theta = N * (lam - LAM0)
  const x = rho * Math.sin(theta)
  const y = RHO0 - rho * Math.cos(theta)
  return [x, y]
}

export const SVG_WIDTH = 800
export const SVG_HEIGHT = 920
export const SVG_PADDING = 18

// Extents across India ADM1 bounding box in projection space
const BBOX_MIN_X = -0.2282130213171272
const BBOX_MAX_X = 0.2294701860600999
const BBOX_MIN_Y = -0.25998209279995166
const BBOX_MAX_Y = 0.26368683637424395

const PROJ_SCALE = Math.min(
  (SVG_WIDTH - 2 * SVG_PADDING) / (BBOX_MAX_X - BBOX_MIN_X),
  (SVG_HEIGHT - 2 * SVG_PADDING) / (BBOX_MAX_Y - BBOX_MIN_Y)
)
const PROJ_CX = (BBOX_MIN_X + BBOX_MAX_X) / 2
const PROJ_CY = (BBOX_MIN_Y + BBOX_MAX_Y) / 2

export function projectToSvg(coord: [number, number]): [number, number] {
  const [x, y] = albersIndia(coord)
  const sx = SVG_WIDTH / 2 + (x - PROJ_CX) * PROJ_SCALE
  const sy = SVG_HEIGHT / 2 - (y - PROJ_CY) * PROJ_SCALE
  return [Number(sx.toFixed(1)), Number(sy.toFixed(1))]
}

export function ringToSvgPath(ring: number[][]): string {
  if (!ring || ring.length === 0) return ''
  let path = ''
  for (let i = 0; i < ring.length; i++) {
    const pt = ring[i]
    if (!pt || pt.length < 2) continue
    const [sx, sy] = projectToSvg([pt[0] as number, pt[1] as number])
    path += (i === 0 ? 'M' : 'L') + sx + ',' + sy
  }
  return path + 'Z'
}

export function geometryToSvgPath(geom: GeoFeature['geometry']): string {
  if (geom.type === 'Polygon') {
    return (geom.coordinates as number[][][]).map(ringToSvgPath).join(' ')
  }
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates as number[][][][])
      .map((poly) => poly.map(ringToSvgPath).join(' '))
      .join(' ')
  }
  return ''
}

export const SMALL_TERRITORIES: readonly string[] = [
  'Goa',
  'Delhi',
  'Chandīgarh',
  'Lakshadweep',
  'Puducherry',
  'Dādra and Nagar Haveli and Damān and Diu',
  'Andaman and Nicobar Islands',
  'Sikkim',
] as const

/**
 * Projects all features from a GeoJSON payload into SVG paths, bounding boxes, and centroids.
 * Reuses the cached projection array when the GeoJSON payload matches the cached payload.
 */
export function projectFeatures(geoData: GeoJSONPayload): ProjectedFeature[] {
  if (!geoData || !Array.isArray(geoData.features)) {
    return []
  }

  // If already compiled and cached for this exact geoData reference, return cached array
  if (cachedGeoData === geoData && cachedProjectedFeatures !== null) {
    return cachedProjectedFeatures
  }

  const projected: ProjectedFeature[] = geoData.features.map((feature) => {
    const name = feature.properties.shapeName
    const iso = feature.properties.shapeISO
    const type = feature.properties.shapeType || 'ADM1'
    const path = geometryToSvgPath(feature.geometry)

    // Calculate centroid and bounding box
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    let sumX = 0
    let sumY = 0
    let count = 0

    function scanCoords(c: unknown) {
      if (Array.isArray(c) && typeof c[0] === 'number') {
        const [sx, sy] = projectToSvg([c[0] as number, c[1] as number])
        if (sx < minX) minX = sx
        if (sx > maxX) maxX = sx
        if (sy < minY) minY = sy
        if (sy > maxY) maxY = sy
        sumX += sx
        sumY += sy
        count++
      } else if (Array.isArray(c)) {
        c.forEach(scanCoords)
      }
    }

    scanCoords(feature.geometry.coordinates)

    const w = maxX - minX
    const h = maxY - minY
    const isSmall = w * h < 2600 || SMALL_TERRITORIES.includes(name)
    const centroid: [number, number] = [
      count > 0 ? Number((sumX / count).toFixed(1)) : (minX + maxX) / 2,
      count > 0 ? Number((sumY / count).toFixed(1)) : (minY + maxY) / 2,
    ]

    return {
      name,
      iso,
      type,
      path,
      centroid,
      bbox: { minX, maxX, minY, maxY, width: w, height: h },
      isSmall,
    }
  })

  return projected
}

// ============================================================================
// MODULE-LEVEL IN-MEMORY CACHE
// ============================================================================

let cachedGeoData: GeoJSONPayload | null = null
let cachedRegionalData: RegionalPayload | null = null
let cachedProjectedFeatures: ProjectedFeature[] | null = null
let inFlightPromise: Promise<ObservatoryLoadedDatasets> | null = null

/**
 * Returns current cached observatory datasets or nulls.
 */
export function getCachedObservatoryData(): {
  geoData: GeoJSONPayload | null
  regionalData: RegionalPayload | null
  projectedFeatures: ProjectedFeature[] | null
} {
  return {
    geoData: cachedGeoData,
    regionalData: cachedRegionalData,
    projectedFeatures: cachedProjectedFeatures,
  }
}

/**
 * Indicates whether all geographic, regional, and projected datasets are cached in memory.
 */
export function hasCachedObservatoryData(): boolean {
  return (
    cachedGeoData !== null &&
    cachedRegionalData !== null &&
    cachedProjectedFeatures !== null
  )
}

/**
 * Explicitly sets or updates the observatory memory cache.
 */
export function setCachedObservatoryData(
  geo: GeoJSONPayload,
  regional: RegionalPayload,
  projected?: ProjectedFeature[]
): void {
  cachedGeoData = geo
  cachedRegionalData = regional
  cachedProjectedFeatures = projected ?? projectFeatures(geo)
}

/**
 * Clears the in-memory cache and cancels tracking of in-flight requests.
 * Used for testing, cache invalidation, and explicit user-initiated retries.
 */
export function clearObservatoryCache(): void {
  cachedGeoData = null
  cachedRegionalData = null
  cachedProjectedFeatures = null
  inFlightPromise = null
}

/**
 * Loads both geographic boundaries and regional monthly datasets with:
 * - Module-level in-memory caching across component unmount/remount
 * - In-flight request deduplication for concurrent or rapid invocations
 * - Never caching failed responses
 * - Pre-compiled Albers SVG projected paths
 */
export async function loadObservatoryDatasets(
  options: LoadObservatoryOptions = {}
): Promise<ObservatoryLoadedDatasets> {
  const {
    fetcher = (typeof fetch !== 'undefined' ? fetch : undefined),
    baseUrl = '',
    forceRefresh = false,
    signal,
  } = options

  if (!fetcher) {
    throw new Error('No fetch implementation available in this environment')
  }

  // If forceRefresh, clear existing cache and ignore any in-flight promise
  if (forceRefresh) {
    clearObservatoryCache()
  } else if (hasCachedObservatoryData()) {
    return {
      geoData: cachedGeoData!,
      regionalData: cachedRegionalData!,
      projectedFeatures: cachedProjectedFeatures!,
    }
  }

  // Deduplicate concurrent in-flight requests
  if (inFlightPromise) {
    return inFlightPromise
  }

  const cleanBase = baseUrl.endsWith('/') ? baseUrl : (baseUrl ? `${baseUrl}/` : '')
  const geoUrl = `${cleanBase}data/india_adm1_simplified.geojson`
  const regionalUrl = `${cleanBase}data/regional_monthly_5km.json`

  const fetchPromise = (async () => {
    try {
      const [geoRes, dataRes] = await Promise.all([
        fetcher(geoUrl, { signal }),
        fetcher(regionalUrl, { signal }),
      ])

      if (!geoRes.ok) {
        throw new Error(`Failed to load boundaries (HTTP ${geoRes.status})`)
      }
      if (!dataRes.ok) {
        throw new Error(`Failed to load regional data (HTTP ${dataRes.status})`)
      }

      const geoJson = (await geoRes.json()) as GeoJSONPayload
      const dataJson = (await dataRes.json()) as RegionalPayload

      if (!geoJson.features || geoJson.features.length !== 36) {
        throw new Error('Boundary asset does not contain the expected 36 ADM1 features')
      }
      if (!Array.isArray(dataJson.records) || !Array.isArray(dataJson.regions)) {
        throw new Error('Regional dataset has invalid schema')
      }

      // Compile projected geometry once
      const projected = projectFeatures(geoJson)

      // Store in module cache
      cachedGeoData = geoJson
      cachedRegionalData = dataJson
      cachedProjectedFeatures = projected

      return {
        geoData: geoJson,
        regionalData: dataJson,
        projectedFeatures: projected,
      }
    } finally {
      inFlightPromise = null
    }
  })()

  inFlightPromise = fetchPromise
  return fetchPromise
}

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  MapPin,
  Flame,
  Satellite,
  Info,
  AlertCircle,
  ArrowRight,
  Calendar,
  Compass,
  RotateCcw,
  TrendingUp,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================
import {
  type Sensor,
  type RegionalRecord,
  type RegionSummary,
  MONTH_FULL,
  computeDaysInYear,
  filterRecordsBySensorAndYear,
  computeRegionTotals,
  computeMonthlySequence,
} from './observatoryAggregations.ts'

export type { Sensor, RegionalRecord, RegionSummary }

import {
  type RegionalPayload,
  type GeoFeature,
  type GeoJSONPayload,
  type ProjectedFeature,
  SVG_WIDTH,
  SVG_HEIGHT,
  SMALL_TERRITORIES,
  projectToSvg,
  projectFeatures,
  getCachedObservatoryData,
  hasCachedObservatoryData,
  clearObservatoryCache,
  loadObservatoryDatasets,
} from './observatoryCache.ts'

export type { RegionalPayload, GeoFeature, GeoJSONPayload, ProjectedFeature }

interface MonthlyDatum {
  monthKey: string
  shortName: string
  fullName: string
  ogcd: number | null
  displayOgcd: number
  daysWithDetections: number | null
  hasRecord: boolean
}

interface GeographicObservatoryProps {
  onNavigateToHistorical?: (regionName?: string) => void
}

function formatNumber(val: number): string {
  return val.toLocaleString('en-IN')
}

// Precomputed graticule latitude arcs and longitude meridians
const GRATICULE_PARALLELS = [10, 15, 20, 25, 30, 35].map((lat) => {
  const pts: string[] = []
  for (let lon = 68; lon <= 97; lon += 1) {
    const [sx, sy] = projectToSvg([lon, lat])
    pts.push(`${sx},${sy}`)
  }
  return { lat, d: 'M' + pts.join('L') }
})

const GRATICULE_MERIDIANS = [72, 76, 80, 84, 88, 92, 96].map((lon) => {
  const pts: string[] = []
  for (let lat = 8; lat <= 36; lat += 1) {
    const [sx, sy] = projectToSvg([lon, lat])
    pts.push(`${sx},${sy}`)
  }
  return { lon, d: 'M' + pts.join('L') }
})

// ============================================================================
// COMPONENT
// ============================================================================
export default function GeographicObservatory({ onNavigateToHistorical }: GeographicObservatoryProps) {
  // Check if datasets and projections are already warm in memory
  const initialCache = getCachedObservatoryData()
  const isWarm = hasCachedObservatoryData()

  // State
  const [geoData, setGeoData] = useState<GeoJSONPayload | null>(initialCache.geoData)
  const [regionalPayload, setRegionalPayload] = useState<RegionalPayload | null>(initialCache.regionalData)
  const [loading, setLoading] = useState(!isWarm)
  const [error, setError] = useState<string | null>(null)

  const [sensor, setSensor] = useState<Sensor>('MODIS')
  const [year, setYear] = useState<string>('2023')
  const [selectedRegion, setSelectedRegion] = useState<string>('Odisha')
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)
  const [tooltipData, setTooltipData] = useState<{
    name: string
    iso: string
    ogcd: number | null
    x: number
    y: number
  } | null>(null)

  const mapSvgContainerRef = useRef<HTMLDivElement>(null)

  // --------------------------------------------------------------------------
  // Data loading (Uses in-memory cache on return navigation)
  // --------------------------------------------------------------------------
  const handleRetry = useCallback(() => {
    clearObservatoryCache()
    setError(null)
    setLoading(true)
    loadObservatoryDatasets({
      baseUrl: import.meta.env.BASE_URL,
      forceRefresh: true,
    })
      .then((data) => {
        setGeoData(data.geoData)
        setRegionalPayload(data.regionalData)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unknown loading error occurred')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    // If cache is already warm, skip network fetch entirely
    if (hasCachedObservatoryData()) {
      return
    }

    let isMounted = true

    loadObservatoryDatasets({
      baseUrl: import.meta.env.BASE_URL,
    })
      .then((data) => {
        if (isMounted) {
          setGeoData(data.geoData)
          setRegionalPayload(data.regionalData)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown loading error occurred')
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  // --------------------------------------------------------------------------
  // Projection compilation (Reuses cached projection array)
  // --------------------------------------------------------------------------
  const projectedFeatures = useMemo<ProjectedFeature[]>(() => {
    if (!geoData) return []
    return projectFeatures(geoData)
  }, [geoData])

  // Fast ISO lookup map
  const isoByName = useMemo(() => {
    const map = new Map<string, string>()
    projectedFeatures.forEach((f) => map.set(f.name, f.iso))
    return map
  }, [projectedFeatures])

  // --------------------------------------------------------------------------
  // Sensor & Year bounds
  // --------------------------------------------------------------------------
  const availableYears = useMemo(() => {
    const start = sensor === 'MODIS' ? 2003 : 2013
    return Array.from({ length: 2025 - start + 1 }, (_, i) => String(start + i))
  }, [sensor])

  const handleSensorChange = useCallback(
    (newSensor: Sensor) => {
      setSensor(newSensor)
      if (newSensor === 'VIIRS' && parseInt(year, 10) < 2013) {
        setYear('2013')
      }
    },
    [year]
  )

  // --------------------------------------------------------------------------
  // Aggregations for Active Sensor & Year
  // --------------------------------------------------------------------------
  const recordsForSensorYear = useMemo(() => {
    if (!regionalPayload) return []
    return filterRecordsBySensorAndYear(regionalPayload.records, sensor, year)
  }, [regionalPayload, sensor, year])

  // Annual OGCD total and stats per region
  const regionTotals = useMemo(() => {
    return computeRegionTotals(recordsForSensorYear)
  }, [recordsForSensorYear])

  // Maximum annual OGCD across regions for current selection
  const maxAnnualOgcd = useMemo(() => {
    let max = 0
    regionTotals.forEach((val) => {
      if (val.totalOgcd > max) max = val.totalOgcd
    })
    return Math.max(1, max)
  }, [regionTotals])

  // --------------------------------------------------------------------------
  // Color scale computation (Square-root normalized 5-tier ramp)
  // --------------------------------------------------------------------------
  const getColorForRegion = useCallback(
    (regionName: string) => {
      const entry = regionTotals.get(regionName)
      if (!entry || entry.totalOgcd <= 0) {
        return {
          fill: '#151A1F',
          stroke: '#252D34',
          tier: 0,
          label: 'No recorded observations',
        }
      }

      // Square root normalization
      const t = Math.sqrt(entry.totalOgcd / maxAnnualOgcd)

      if (t <= 0.2) {
        return { fill: '#1E2B37', stroke: '#2D3945', tier: 1 }
      }
      if (t <= 0.4) {
        return { fill: '#383226', stroke: '#4D4233', tier: 2 }
      }
      if (t <= 0.65) {
        return { fill: '#6E471C', stroke: '#8B5A24', tier: 3 }
      }
      if (t <= 0.85) {
        return { fill: '#B4651D', stroke: '#D47722', tier: 4 }
      }
      return { fill: '#F0A34A', stroke: '#F5B56E', tier: 5 }
    },
    [regionTotals, maxAnnualOgcd]
  )

  // Legend threshold ranges
  const legendThresholds = useMemo(() => {
    const m = maxAnnualOgcd
    const t1 = Math.max(1, Math.round(0.04 * m))
    const t2 = Math.max(t1 + 1, Math.round(0.16 * m))
    const t3 = Math.max(t2 + 1, Math.round(0.4225 * m))
    const t4 = Math.max(t3 + 1, Math.round(0.7225 * m))

    return [
      { fill: '#1E2B37', border: '#2D3945', label: `1 – ${formatNumber(t1)}` },
      { fill: '#383226', border: '#4D4233', label: `${formatNumber(t1 + 1)} – ${formatNumber(t2)}` },
      { fill: '#6E471C', border: '#8B5A24', label: `${formatNumber(t2 + 1)} – ${formatNumber(t3)}` },
      { fill: '#B4651D', border: '#D47722', label: `${formatNumber(t3 + 1)} – ${formatNumber(t4)}` },
      { fill: '#F0A34A', border: '#F5B56E', label: `> ${formatNumber(t4)}` },
    ]
  }, [maxAnnualOgcd])

  // --------------------------------------------------------------------------
  // Selected Region Detail Data
  // --------------------------------------------------------------------------
  const selectedStats = useMemo(() => {
    return regionTotals.get(selectedRegion) ?? null
  }, [regionTotals, selectedRegion])

  // Total calendar days in selected year (accounting for leap years)
  const daysInSelectedYear = useMemo(() => {
    return computeDaysInYear(year)
  }, [year])

  // Monthly 12-month sequence
  const monthlyTrend = useMemo<MonthlyDatum[]>(() => {
    if (!regionalPayload) return []
    return computeMonthlySequence(regionalPayload.records, selectedRegion, sensor, year)
  }, [regionalPayload, selectedRegion, sensor, year])

  // Peak month details for selected region
  const peakMonthInfo = useMemo(() => {
    if (!selectedStats || !selectedStats.peakMonth) return null
    const monthIndex = parseInt(selectedStats.peakMonth.slice(5), 10) - 1
    const monthName = MONTH_FULL[monthIndex] ?? selectedStats.peakMonth
    const share = selectedStats.totalOgcd > 0
      ? ((selectedStats.peakOgcd / selectedStats.totalOgcd) * 100).toFixed(1)
      : '0'
    return {
      monthName,
      ogcd: selectedStats.peakOgcd,
      share,
    }
  }, [selectedStats])

  // --------------------------------------------------------------------------
  // Mouse and Keyboard Map Handlers
  // --------------------------------------------------------------------------
  const handleRegionHover = useCallback(
    (feature: ProjectedFeature, e: React.MouseEvent<SVGElement>) => {
      setHoveredRegion(feature.name)
      if (mapSvgContainerRef.current) {
        const rect = mapSvgContainerRef.current.getBoundingClientRect()
        setTooltipData({
          name: feature.name,
          iso: feature.iso,
          ogcd: regionTotals.get(feature.name)?.totalOgcd ?? null,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    },
    [regionTotals]
  )

  const handleRegionMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    if (mapSvgContainerRef.current) {
      const rect = mapSvgContainerRef.current.getBoundingClientRect()
      setTooltipData((prev) =>
        prev
          ? {
              ...prev,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            }
          : null
      )
    }
  }, [])

  const handleRegionLeave = useCallback(() => {
    setHoveredRegion(null)
    setTooltipData(null)
  }, [])

  // Sorted regions for quick dropdown
  const sortedRegionList = useMemo(() => {
    if (!regionalPayload) return []
    return [...regionalPayload.regions].sort((a, b) => a.localeCompare(b))
  }, [regionalPayload])

  // --------------------------------------------------------------------------
  // Render States: Loading & Error
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="rounded-2xl border border-[#252D34] bg-[#11161B] p-8 sm:p-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#F0A34A]/40 bg-[#F0A34A]/10 text-[#F0A34A] animate-pulse">
          <Satellite size={24} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[#E8EDF0]">Loading Geographic Observatory…</h3>
        <p className="mt-1 text-xs text-[#9BA8B2] max-w-md mx-auto">
          Compiling 36 ADM1 equal-area boundaries and multi-decade monthly satellite detection records across India.
        </p>
      </div>
    )
  }

  if (error || !geoData || !regionalPayload) {
    return (
      <div className="rounded-2xl border border-rose-900/50 bg-rose-950/20 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400">
          <AlertCircle size={24} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-rose-200">Failed to Load Geographic Instrument</h3>
        <p className="mt-2 text-xs text-rose-300 max-w-md mx-auto">
          {error ?? 'Observatory datasets could not be retrieved from local storage.'}
        </p>
        <button
          onClick={handleRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-700/50 bg-rose-900/30 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/50"
        >
          <RotateCcw size={14} />
          <span>Reload Observatory</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 rounded-3xl border border-[#252D34] bg-gradient-to-b from-[#11161B] via-[#0E1216] to-[#0B0E11] p-5 sm:p-8 lg:p-10 shadow-sm">
      {/* -------------------------------------------------------------------- */}
      {/* SECTION HEADER & CONTROL BAR                                         */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-[#252D34]/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#252D34] bg-[#151A1F] px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
            <Compass size={13} className="text-[#F0A34A]" />
            <span>OBSERVATORY INSTRUMENT · SPATIAL INTELLIGENCE</span>
          </div>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[#E8EDF0]">
            Geographic Observatory
          </h2>
          <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-[#9BA8B2]">
            Spatial distribution of satellite active-fire detections across 36 Indian administrative regions (ADM1).
            Values represent annual occupied 5 km grid-cell-days (OGCD), not individual fire incidents or burned area.
          </p>
        </div>

        {/* Real-Data Controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          {/* Sensor Selector */}
          <div className="flex rounded-xl border border-[#252D34] bg-[#0B0E11] p-1 shadow-inner" role="group" aria-label="Satellite Sensor">
            <button
              type="button"
              onClick={() => handleSensorChange('MODIS')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-mono font-semibold transition-all duration-150 ${
                sensor === 'MODIS'
                  ? 'bg-[#151A1F] text-[#38BDF8] border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.18)]'
                  : 'text-[#9BA8B2] hover:text-[#E8EDF0]'
              }`}
            >
              <Satellite size={14} />
              <span>MODIS</span>
              <span className="text-xs text-[#9BA8B2] font-normal hidden sm:inline">(1 km)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSensorChange('VIIRS')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-mono font-semibold transition-all duration-150 ${
                sensor === 'VIIRS'
                  ? 'bg-[#151A1F] text-[#F0A34A] border border-[#F0A34A]/40 shadow-[0_0_12px_rgba(240,163,74,0.18)]'
                  : 'text-[#9BA8B2] hover:text-[#E8EDF0]'
              }`}
            >
              <Flame size={14} />
              <span>VIIRS</span>
              <span className="text-xs text-[#9BA8B2] font-normal hidden sm:inline">(375 m)</span>
            </button>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2 rounded-xl border border-[#252D34] bg-[#0B0E11] px-3 py-1.5 shadow-inner transition-colors hover:border-[#38BDF8]/30 focus-within:border-[#F0A34A]/50">
            <Calendar size={14} className="text-[#9BA8B2]" />
            <label htmlFor="geo-year-select" className="text-xs font-mono font-medium text-[#E8EDF0]">
              Year:
            </label>
            <select
              id="geo-year-select"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold text-[#E8EDF0] focus:outline-none cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="bg-[#151A1F] text-[#E8EDF0]">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Region Quick Select Dropdown */}
          <div className="flex items-center gap-2 rounded-xl border border-[#252D34] bg-[#0B0E11] px-3 py-1.5 shadow-inner flex-1 sm:flex-initial transition-colors hover:border-[#38BDF8]/30 focus-within:border-[#F0A34A]/50">
            <MapPin size={14} className="text-[#F0A34A]" />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full sm:w-auto min-w-[150px] max-w-full sm:max-w-[200px] bg-transparent text-xs font-sans font-medium text-[#E8EDF0] truncate focus:outline-none cursor-pointer"
              aria-label="Select Region"
            >
              {sortedRegionList.map((r) => {
                const total = regionTotals.get(r)?.totalOgcd
                return (
                  <option key={r} value={r} className="bg-[#151A1F] text-[#E8EDF0]">
                    {r} {total !== undefined && total > 0 ? `(${formatNumber(total)})` : '(No data)'}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* QUICK TERRITORIES & ISLANDS DISCOVERY BAR                            */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-mono text-xs uppercase tracking-wider text-[#E8EDF0] mr-1">
          Islands & Union Territories:
        </span>
        {SMALL_TERRITORIES.map((territory) => {
          const isSelected = selectedRegion === territory
          const hasRecord = (regionTotals.get(territory)?.totalOgcd ?? 0) > 0
          return (
            <button
              key={territory}
              type="button"
              onClick={() => setSelectedRegion(territory)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150 active:scale-95 ${
                isSelected
                  ? 'border border-[#F0A34A] bg-[#F0A34A]/20 text-[#F0A34A] shadow-[0_0_8px_rgba(240,163,74,0.2)]'
                  : 'border border-[#252D34] bg-[#0B0E11] text-[#9BA8B2] hover:border-[#38BDF8]/40 hover:text-[#E8EDF0]'
              }`}
            >
              <span>{territory}</span>
              {!hasRecord && (
                <span className="ml-1 text-xs font-bold text-[#F0A34A]" title={`No observations recorded for ${territory} in ${year}`}>
                  *
                </span>
              )}
            </button>
          )
        })}
        <span className="text-xs text-[#9BA8B2] italic ml-1">
          (* No detections in {year})
        </span>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* MAIN TWO-COLUMN INSTRUMENT WORKSPACE                                 */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* ================================================================= */}
        {/* LEFT: SVG MAP INSTRUMENT (Col 7)                                  */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div
            ref={mapSvgContainerRef}
            className="relative overflow-hidden rounded-2xl border border-[#252D34] bg-[#0A0D10] p-2 sm:p-4 shadow-inner"
          >
            {/* Mission Telemetry Corner Reticles */}
            <div className="obs-reticle-corner obs-reticle-tl" aria-hidden="true" />
            <div className="obs-reticle-corner obs-reticle-tr" aria-hidden="true" />
            <div className="obs-reticle-corner obs-reticle-bl" aria-hidden="true" />
            <div className="obs-reticle-corner obs-reticle-br" aria-hidden="true" />

            {/* Instrument Compass Rose / Reticle Badge */}
            <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2 rounded-lg border border-[#252D34]/90 bg-[#0B0E11]/85 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-mono text-[#E8EDF0] backdrop-blur-md pointer-events-none shadow-md">
              <span className="h-2 w-2 rounded-full bg-[#F0A34A] animate-pulse" />
              <span><span className="hidden sm:inline">ALBERS CONIC · </span>EPSG:6933 EQUAL-AREA</span>
            </div>

            {/* Top Right North Arrow */}
            <div className="absolute top-3.5 right-3.5 z-10 flex flex-col items-center rounded-lg border border-[#252D34]/90 bg-[#0B0E11]/85 px-2.5 py-1 text-xs font-mono text-[#E8EDF0] backdrop-blur-md pointer-events-none shadow-md">
              <span className="font-bold text-[#F0A34A]">▲ N</span>
              <span className="text-[10px] text-[#9BA8B2]">82.5°E</span>
            </div>

            {/* Interactive India Map SVG */}
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="w-full h-auto max-h-[680px] lg:max-h-[720px] select-none block"
              aria-label="Interactive India Administrative Boundaries Map"
            >
              <defs>
                {/* Subtle drop shadow filter for hovered/selected regions */}
                <filter id="geoGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#F0A34A" floodOpacity="0.4" />
                </filter>
                {/* Crosshatch pattern for unobserved / missing observation regions */}
                <pattern id="unobservedHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#252D34" strokeWidth="1.2" />
                </pattern>
              </defs>

              {/* Background Outer Graticule Frame */}
              <rect
                x="8"
                y="8"
                width={SVG_WIDTH - 16}
                height={SVG_HEIGHT - 16}
                fill="none"
                stroke="#1B2228"
                strokeWidth="1"
              />

              {/* Graticule Latitude Arcs */}
              <g className="graticule-parallels" opacity="0.45" pointerEvents="none">
                {GRATICULE_PARALLELS.map(({ lat, d }) => (
                  <path key={`lat-${lat}`} d={d} fill="none" stroke="#252D34" strokeWidth="0.8" strokeDasharray="3 4" />
                ))}
              </g>

              {/* Graticule Longitude Meridians */}
              <g className="graticule-meridians" opacity="0.45" pointerEvents="none">
                {GRATICULE_MERIDIANS.map(({ lon, d }) => (
                  <path key={`lon-${lon}`} d={d} fill="none" stroke="#252D34" strokeWidth="0.8" strokeDasharray="3 4" />
                ))}
              </g>

              {/* Graticule Coordinate Labels */}
              <g className="graticule-labels font-mono text-[11px] font-medium fill-[#9BA8B2] select-none pointer-events-none">
                <text x="22" y="797">10°N</text>
                <text x="26" y="507">20°N</text>
                <text x="34" y="215">30°N</text>
                <text x="92" y="904">72°E</text>
                <text x="326" y="906">80°E</text>
                <text x="559" y="906">88°E</text>
                <text x="756" y="884">96°E</text>
              </g>

              {/* 36 ADM1 Boundary Polygons */}
              <g className="adm1-regions" role="region" aria-label="Indian States and Union Territories">
                {projectedFeatures.map((feat) => {
                  const isSelected = selectedRegion === feat.name
                  const isHovered = hoveredRegion === feat.name
                  const color = getColorForRegion(feat.name)
                  const hasRecord = (regionTotals.get(feat.name)?.totalOgcd ?? 0) > 0

                  return (
                    <path
                      key={feat.name}
                      d={feat.path}
                      fill={hasRecord ? color.fill : 'url(#unobservedHatch)'}
                      stroke={
                        isSelected
                          ? '#FFFFFF'
                          : isHovered
                          ? '#F0A34A'
                          : color.stroke
                      }
                      strokeWidth={isSelected ? 2.5 : isHovered ? 1.75 : 0.75}
                      filter={isSelected ? 'url(#geoGlow)' : undefined}
                      className="cursor-pointer transition-colors duration-150 focus:outline-none"
                      tabIndex={0}
                      role="button"
                      aria-label={`${feat.name} (${feat.iso}): ${
                        hasRecord
                          ? `${formatNumber(regionTotals.get(feat.name)?.totalOgcd ?? 0)} OGCD`
                          : 'No recorded observations'
                      }`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedRegion(feat.name)}
                      onMouseEnter={(e) => handleRegionHover(feat, e)}
                      onMouseMove={handleRegionMouseMove}
                      onMouseLeave={handleRegionLeave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedRegion(feat.name)
                        }
                      }}
                    />
                  )
                })}
              </g>

              {/* Small Region Interactive Centroid Targets */}
              <g className="small-region-targets" pointerEvents="all">
                {projectedFeatures
                  .filter((f) => f.isSmall)
                  .map((feat) => {
                    const isSelected = selectedRegion === feat.name
                    const hasRecord = (regionTotals.get(feat.name)?.totalOgcd ?? 0) > 0

                    return (
                      <g
                        key={`target-${feat.name}`}
                        className="cursor-pointer group"
                        role="button"
                        aria-label={`Target: ${feat.name}`}
                        tabIndex={-1}
                        onClick={() => setSelectedRegion(feat.name)}
                        onMouseEnter={(e) => handleRegionHover(feat, e)}
                        onMouseMove={handleRegionMouseMove}
                        onMouseLeave={handleRegionLeave}
                      >
                        {/* Expanded transparent hit zone */}
                        <circle cx={feat.centroid[0]} cy={feat.centroid[1]} r={14} fill="transparent" />

                        {/* Visual indicator ring */}
                        <circle
                          cx={feat.centroid[0]}
                          cy={feat.centroid[1]}
                          r={isSelected ? 6 : 4}
                          fill={isSelected ? '#F0A34A' : hasRecord ? '#38BDF8' : '#9BA8B2'}
                          stroke="#0B0E11"
                          strokeWidth={1.5}
                          className="transition-transform duration-200 group-hover:scale-125"
                        />
                      </g>
                    )
                  })}
              </g>

              {/* Selected Region Centroid Focus Beacon */}
              {(() => {
                const sel = projectedFeatures.find((f) => f.name === selectedRegion)
                if (!sel) return null
                return (
                  <g pointerEvents="none" className="beacon">
                    <circle
                      cx={sel.centroid[0]}
                      cy={sel.centroid[1]}
                      r={10}
                      fill="none"
                      stroke="#F0A34A"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      opacity="0.8"
                    />
                    <circle
                      cx={sel.centroid[0]}
                      cy={sel.centroid[1]}
                      r={6}
                      fill="none"
                      stroke="#F0A34A"
                      strokeWidth={1.5}
                      className="obs-beacon-ring"
                    />
                    <circle cx={sel.centroid[0]} cy={sel.centroid[1]} r={2.5} fill="#F0A34A" />
                  </g>
                )
              })()}
            </svg>

            {/* Floating Cursor Tooltip */}
            {tooltipData && (
              <div
                className="pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full mb-3 rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/95 px-3.5 py-2.5 text-xs shadow-2xl backdrop-blur-md"
                style={{
                  left: tooltipData.x,
                  top: tooltipData.y - 8,
                }}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[#E8EDF0]">
                  <span>{tooltipData.name}</span>
                  <span className="font-mono text-xs text-[#9BA8B2]">({tooltipData.iso})</span>
                </div>
                <div className="mt-1 font-mono text-xs">
                  {tooltipData.ogcd !== null && tooltipData.ogcd > 0 ? (
                    <span className="text-[#F0A34A] font-semibold">
                      {formatNumber(tooltipData.ogcd)} OGCD
                    </span>
                  ) : (
                    <span className="text-[#9BA8B2] italic">No recorded observations</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* MAP COLOR RAMP & DATASET ATTRIBUTION                             */}
          {/* ---------------------------------------------------------------- */}
          <div className="rounded-xl border border-[#252D34] bg-[#11161B] p-4 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[#E8EDF0]">
                Annual OGCD Scale ({sensor} · {year}):
              </span>
              <span className="font-mono text-xs font-semibold text-[#F0A34A]">
                Max: {formatNumber(maxAnnualOgcd)} OGCD
              </span>
            </div>

            {/* 5-Tier Choropleth Legend Swatches */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-4 w-4 shrink-0 rounded border border-[#252D34]"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, #151A1F, #151A1F 2px, #252D34 2px, #252D34 4px)',
                  }}
                />
                <span className="text-xs text-[#E8EDF0]">Unrecorded</span>
              </div>
              {legendThresholds.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span
                    className="h-4 w-4 shrink-0 rounded border"
                    style={{ backgroundColor: tier.fill, borderColor: tier.border }}
                  />
                  <span className="text-xs font-mono text-[#E8EDF0] truncate">{tier.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pt-1.5 border-t border-[#252D34]/60 text-xs text-[#9BA8B2]">
              <div>
                Boundaries: <span className="text-[#E8EDF0] font-medium">2011 Administrative Reference Snapshot</span> (CC BY 2.5 IN).
              </div>
              <div className="text-xs italic text-[#9BA8B2]">
                Fixed historical demarcation for multi-decade comparison.
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT: REGION DETAIL PANEL (Col 5)                                */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0C0F12] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] space-y-6">
            {/* Region Title & Context Badges */}
            <div className="border-b border-[#252D34] pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#E8EDF0]">
                      {selectedRegion}
                    </h3>
                    <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 font-mono text-xs text-[#9BA8B2]">
                      {isoByName.get(selectedRegion) ?? 'IN'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs font-mono text-[#9BA8B2]">
                    <span className="text-[#F0A34A]">{sensor}</span>
                    <span>•</span>
                    <span>Calendar Year {year}</span>
                    <span>•</span>
                    <span>5 km Grid (EPSG:6933)</span>
                  </div>
                </div>

                <div className="rounded-lg border border-[#F0A34A]/30 bg-[#F0A34A]/10 p-2 text-[#F0A34A] shrink-0">
                  <MapPin size={20} />
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* KPI STATS OR EXPLICIT NO-OBSERVATIONS ALERT                    */}
            {/* -------------------------------------------------------------- */}
            {selectedStats && selectedStats.totalOgcd > 0 ? (
              <div key={`${selectedRegion}-${sensor}-${year}`} className="animate-detail-fade space-y-6">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/80 p-3.5 transition-colors hover:border-[#F0A34A]/30">
                    <div className="font-mono text-xs uppercase tracking-wider text-[#9BA8B2]">
                      Annual Total
                    </div>
                    <div className="mt-1.5 text-xl sm:text-2xl font-bold text-[#F0A34A]">
                      {formatNumber(selectedStats.totalOgcd)}
                    </div>
                    <div className="mt-1 text-xs text-[#9BA8B2]">5 km grid-cell-days (OGCD)</div>
                  </div>

                  <div className="rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/80 p-3.5 transition-colors hover:border-[#38BDF8]/30">
                    <div className="font-mono text-xs uppercase tracking-wider text-[#9BA8B2]">
                      Active Months
                    </div>
                    <div className="mt-1.5 text-xl sm:text-2xl font-bold text-[#E8EDF0]">
                      {selectedStats.monthCount}{' '}
                      <span className="text-xs font-normal text-[#9BA8B2]">/ 12</span>
                    </div>
                    <div className="mt-1 text-xs text-[#9BA8B2]">Months with detections</div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/80 p-3.5 transition-colors hover:border-emerald-500/30">
                    <div className="font-mono text-xs uppercase tracking-wider text-[#9BA8B2]">
                      Active Detection Days
                    </div>
                    <div className="mt-1.5 text-xl sm:text-2xl font-bold text-emerald-400">
                      {formatNumber(selectedStats.totalDays)}{' '}
                      <span className="text-xs font-normal text-[#9BA8B2]">/ {daysInSelectedYear} d</span>
                    </div>
                    <div className="mt-1 text-xs text-[#9BA8B2]">Calendar days with ≥1 detection</div>
                  </div>
                </div>

                {/* Peak Month Callout */}
                {peakMonthInfo && (
                  <div className="flex items-center justify-between rounded-xl border border-[#252D34] bg-[#0B0E11]/80 px-4 py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className="text-[#F0A34A]" />
                      <span className="text-xs text-[#9BA8B2]">Peak Burning Season:</span>
                      <strong className="text-xs font-semibold text-[#E8EDF0]">{peakMonthInfo.monthName}</strong>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[#F0A34A]">
                      {formatNumber(peakMonthInfo.ogcd)} OGCD ({peakMonthInfo.share}%)
                    </span>
                  </div>
                )}

                {/* Monthly Trend Chart */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-xs uppercase tracking-wider text-[#E8EDF0]">
                      Monthly Distribution ({year})
                    </span>
                    <span className="text-xs text-[#9BA8B2]">12-Month Observation Trace</span>
                  </div>

                  <div className="h-44 w-full rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/80 p-2.5">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyTrend} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#1C2329" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="shortName"
                          stroke="#9BA8B2"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#252D34' }}
                        />
                        <YAxis
                          stroke="#9BA8B2"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#252D34' }}
                          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0]?.payload as MonthlyDatum
                              return (
                                <div className="rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/95 p-3 text-xs shadow-2xl backdrop-blur-md">
                                  <div className="font-mono font-medium text-xs text-[#E8EDF0]">
                                    {d.fullName} {year}
                                  </div>
                                  {d.hasRecord ? (
                                    <div className="mt-1.5 space-y-0.5">
                                      <div className="font-semibold text-xs text-[#F0A34A]">
                                        {formatNumber(d.ogcd ?? 0)} OGCD
                                      </div>
                                      <div className="text-xs text-[#9BA8B2]">
                                        {d.daysWithDetections} active detection {d.daysWithDetections === 1 ? 'day' : 'days'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-1 text-xs italic text-[#9BA8B2]">
                                      No recorded observations
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Bar dataKey="displayOgcd" radius={[3, 3, 0, 0]}>
                          {monthlyTrend.map((entry, idx) => (
                            <Cell
                              key={`bar-${idx}`}
                              fill={entry.hasRecord ? '#F0A34A' : '#252D34'}
                              fillOpacity={entry.hasRecord ? 0.9 : 0.25}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              /* Explicit State for Missing / Zero Observations */
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-5 text-center space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#E8EDF0]">No Recorded Observations</h4>
                  <p className="mt-1.5 text-xs text-[#9BA8B2] leading-relaxed">
                    No satellite thermal anomalies were recorded for <strong className="text-[#E8EDF0]">{selectedRegion}</strong> by{' '}
                    <span className="font-mono text-[#F0A34A]">{sensor}</span> during <span className="font-mono">{year}</span>.
                  </p>
                </div>
                <div className="rounded-lg border border-[#252D34] bg-[#0B0E11] p-3.5 text-left text-xs leading-relaxed text-[#9BA8B2] space-y-1.5">
                  <div className="font-mono text-xs uppercase text-[#F0A34A]">Scientific Limitation</div>
                  <p>
                    In satellite remote sensing, absence of detection records does not imply confirmed absence of fire activity.
                    Heavy cloud cover, dense tropical canopy (e.g. Lakshadweep), persistent smoke obscuration, or small/cool
                    fires below sensor detection thresholds (1 km for MODIS, 375 m for VIIRS) can prevent thermal anomaly registration.
                  </p>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* EXPLORATION ACTION & DEEP-DIVE LINK                            */}
            {/* -------------------------------------------------------------- */}
            <div className="pt-2 border-t border-[#252D34] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#9BA8B2]">
                Explore long-term anomalies & multi-decade trends:
              </span>
              <a
                href="#historical-patterns"
                onClick={(e) => {
                  e.preventDefault()
                  onNavigateToHistorical?.(selectedRegion)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B0E11] border border-[#252D34] px-4 py-2 text-xs font-semibold text-[#F0A34A] transition hover:border-[#F0A34A]/50 hover:bg-[#181E24] hover:shadow-[0_0_16px_rgba(240,163,74,0.15)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
              >
                <span>Analyze in Historical Patterns</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* METHODOLOGICAL CAVEATS FOOTER STRIP                                  */}
      {/* -------------------------------------------------------------------- */}
      <div className="rounded-2xl border border-[#252D34] bg-[#0B0E11] p-5 sm:p-6 text-xs text-[#9BA8B2] space-y-3">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#F0A34A]">
          <Info size={14} />
          <span>Scientific Qualifications & Methodology</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          <div className="space-y-1">
            <strong className="text-[#E8EDF0] block font-medium">5 km Equal-Area Grid</strong>
            <p className="leading-relaxed text-xs text-[#9BA8B2]">
              Observations are projected to EPSG:6933 cylindrical equal-area coordinates. Each 5 km cell registers at most
              one detection per sensor per day to avoid spatial overcounting.
            </p>
          </div>
          <div className="space-y-1">
            <strong className="text-[#E8EDF0] block font-medium">Non-Interchangeable Sensors</strong>
            <p className="leading-relaxed text-xs text-[#9BA8B2]">
              VIIRS 375 m I-band registers ~6.25× more cells than MODIS 1 km across identical geography. Sensor metrics cannot
              be added or directly equated without harmonization modeling.
            </p>
          </div>
          <div className="space-y-1">
            <strong className="text-[#E8EDF0] block font-medium">Historical Demarcations</strong>
            <p className="leading-relaxed text-xs text-[#9BA8B2]">
              Geometries correspond to a 2011 Census reference snapshot (CC BY 2.5 IN). Aggregations maintain fixed spatial boundaries
              for reliable longitudinal comparisons across 2003–2025.
            </p>
          </div>
          <div className="space-y-1">
            <strong className="text-[#E8EDF0] block font-medium">Zero-Detection Interpretation</strong>
            <p className="leading-relaxed text-xs text-[#9BA8B2]">
              Unrecorded regions or months indicate lack of sensor-confirmed detections rather than verified ground truth.
              Satellite sensors are subject to cloud and resolution constraints.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Download, Info, Satellite, TrendingUp } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  type UnifiedMonthRecord,
  synthesizeUnifiedCalendar,
  computeUnifiedAnomaly,
  formatUnifiedCSV,
  validateSeasonalFactors,
} from './unifiedCalendar.ts'

type Sensor = 'harmonized' | 'modis' | 'viirs'
type ViewMode = 'activity' | 'anomaly'
type MonthRecord = { month: string; modis: number | null; viirs: number | null }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const format = (n: number) => n.toLocaleString('en-IN')

// Ordered low-to-high colors, calibrated for visibility on Dark Observatory surfaces
const ACTIVITY_COLORS = ['#233653', '#287B91', '#E4BA56', '#F17B38', '#C73535'] as const
const ACTIVITY_LABELS = ['Very low', 'Low', 'Moderate', 'High', 'Very high'] as const
const ANOMALY_COLORS = ['#2563eb', '#67a8dd', '#475569', '#f59e0b', '#dc2626'] as const
const ANOMALY_LABELS = ['< -50%', '-50% to -20%', 'Within ±20%', '+20% to +50%', '> +50%'] as const

function median(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

// Leave-one-year-out seasonal baseline for raw sensor series
function anomalyForRaw(month: string, sensor: 'modis' | 'viirs', records: MonthRecord[]) {
  const current = records.find(row => row.month === month)?.[sensor] ?? null
  if (current === null) return null
  const calendarMonth = month.slice(5)
  const peers = records
    .filter(row => row.month.slice(5) === calendarMonth && row.month !== month)
    .map(row => row[sensor])
    .filter((value): value is number => value !== null)
  if (peers.length < 3) return null
  const baseline = median(peers)
  if (baseline === null || baseline <= 0) return null
  return { percent: ((current - baseline) / baseline) * 100, baseline, peerYears: peers.length }
}

function anomalyBand(percent: number) {
  if (percent < -50) return 0
  if (percent < -20) return 1
  if (percent <= 20) return 2
  if (percent <= 50) return 3
  return 4
}

function signedPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function activityBand(value: number, sortedValues: number[]): number {
  let lo = 0
  let hi = sortedValues.length
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (sortedValues[mid] <= value) lo = mid + 1
    else hi = mid
  }
  return Math.min(4, Math.floor(((lo - 1) / sortedValues.length) * 5))
}

function validRecord(value: unknown): value is MonthRecord {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) &&
    (row.modis === null || (typeof row.modis === 'number' && Number.isFinite(row.modis) && row.modis >= 0)) &&
    (row.viirs === null || (typeof row.viirs === 'number' && Number.isFinite(row.viirs) && row.viirs >= 0))
}

export default function HistoricalCalendar() {
  const [records, setRecords] = useState<MonthRecord[]>([])
  const [unifiedRecords, setUnifiedRecords] = useState<UnifiedMonthRecord[]>([])
  const [sensor, setSensor] = useState<Sensor>('harmonized')
  const [viewMode, setViewMode] = useState<ViewMode>('activity')
  const [selected, setSelected] = useState('2023-03')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(`${base}data/historical_calendar_5km.json`, { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error(`Historical data HTTP ${response.status}`)
          return response.json()
        }),
      fetch(`${base}data/harmonization_results.json`, { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error(`Harmonization data HTTP ${response.status}`)
          return response.json()
        }),
    ])
      .then(([calJson, harmJson]: [unknown, unknown]) => {
        if (!Array.isArray(calJson) || calJson.length === 0 || !calJson.every(validRecord)) {
          throw new Error('Historical calendar JSON is missing or invalid')
        }
        const harmObj = harmJson as { seasonal_factors?: unknown }
        const factors = validateSeasonalFactors(harmObj?.seasonal_factors)
        const synthesized = synthesizeUnifiedCalendar(calJson, factors)
        setRecords(calJson)
        setUnifiedRecords(synthesized)
      })
      .catch((reason: Error) => {
        if (reason.name !== 'AbortError') setError(reason.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const rawLookup = useMemo(() => new Map(records.map(row => [row.month, row])), [records])
  const unifiedLookup = useMemo(() => new Map(unifiedRecords.map(row => [row.month, row])), [unifiedRecords])
  const years = useMemo(() => [...new Set(records.map(row => Number(row.month.slice(0, 4))))].sort((a, b) => a - b), [records])

  // Active series values based on current sensor view
  const values = useMemo(() => {
    if (sensor === 'harmonized') {
      return unifiedRecords.map(row => row.harmonized).filter((v): v is number => Number.isFinite(v))
    }
    return records.map(row => row[sensor]).filter((v): v is number => v !== null)
  }, [sensor, records, unifiedRecords])

  const sortedValues = useMemo(() => [...values].sort((a, b) => a - b), [values])

  // Selected cell data
  const selectedUnified = unifiedLookup.get(selected)
  const selectedRaw = rawLookup.get(selected)
  const selectedYear = Number(selected.slice(0, 4))
  const selectedValue = sensor === 'harmonized'
    ? (selectedUnified?.harmonized ?? null)
    : (selectedRaw?.[sensor] ?? null)

  const selectedAnomaly = useMemo(() => {
    if (sensor === 'harmonized') {
      return computeUnifiedAnomaly(selected, unifiedRecords)
    }
    return anomalyForRaw(selected, sensor, records)
  }, [sensor, selected, unifiedRecords, records])

  // Annual aggregations for chart
  const annual = useMemo(() => years.map(year => {
    if (sensor === 'harmonized') {
      const months = MONTHS.map((_, index) => unifiedLookup.get(`${year}-${String(index + 1).padStart(2, '0')}`)?.harmonized ?? null)
      return {
        year: String(year),
        total: months.every(v => v !== null) ? Math.round(months.reduce<number>((sum, v) => sum + (v ?? 0), 0)) : null,
      }
    }
    const months = MONTHS.map((_, index) => rawLookup.get(`${year}-${String(index + 1).padStart(2, '0')}`)?.[sensor] ?? null)
    return {
      year: String(year),
      total: months.every(v => v !== null) ? months.reduce<number>((sum, v) => sum + (v ?? 0), 0) : null,
    }
  }), [years, sensor, rawLookup, unifiedLookup])

  const yearTotal = annual.find(row => row.year === String(selectedYear))?.total ?? null
  const availableMonths = values.length

  function downloadCSV() {
    if (unifiedRecords.length === 0) return
    const csvContent = formatUnifiedCSV(unifiedRecords)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'firesignal_india_monthly_5km_2003_2025.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-[#F0A34A]/30 bg-[#F0A34A]/10 p-2 text-[#F0A34A]">
              <CalendarDays size={22} />
            </div>
            <h3 className="text-xl font-semibold text-[#E8EDF0]">Historical Burning Calendar</h3>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9BA8B2]">
            India · 2003–2025 · NASA FIRMS · occupied 5 km equal-area grid-cell-days (OGCD).
            Explore long-term hotspot patterns across satellite observations and empirical cross-sensor harmonization.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCSV}
          disabled={records.length === 0}
          className="flex items-center gap-2 rounded-xl border border-[#252D34] bg-[#151A1F] px-4 py-2 text-sm font-medium text-[#E8EDF0] transition hover:border-[#F0A34A]/50 hover:text-[#F0A34A] hover:shadow-[0_0_16px_rgba(240,163,74,0.15)] active:scale-95 disabled:opacity-40"
        >
          <Download size={16} /> Export monthly CSV
        </button>
      </div>

      {loading && (
        <div className="rounded-xl border border-[#252D34] bg-[#151A1F] p-8 text-center text-sm text-[#9BA8B2]">
          Loading historical observations and harmonization models…
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          Historical calendar: {error}
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <>
          <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0E1216] p-5 sm:p-7 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-[#9BA8B2]">
                <Satellite size={17} className="text-[#F0A34A]" /> Select series view
              </div>
              <div className="flex flex-wrap rounded-xl border border-[#252D34] bg-[#0B0E11] p-1 shadow-inner" role="group" aria-label="Satellite series mode">
                {(
                  [
                    ['harmonized', 'Harmonized (Unified)'],
                    ['modis', 'MODIS (Observed)'],
                    ['viirs', 'VIIRS (Observed)'],
                  ] as const
                ).map(([item, label]) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSensor(item)}
                    aria-pressed={sensor === item}
                    className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 active:scale-95 ${
                      sensor === item
                        ? 'bg-[#F0A34A] text-[#0B0E11] font-semibold shadow-[0_0_12px_rgba(240,163,74,0.3)]'
                        : 'text-[#9BA8B2] hover:text-[#E8EDF0]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Calendar display mode">
              {([['activity', 'Relative activity'], ['anomaly', 'Seasonal anomaly']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-xl border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                    viewMode === mode
                      ? 'border-[#F0A34A] bg-[#F0A34A]/15 text-[#F0A34A] shadow-[0_0_12px_rgba(240,163,74,0.15)]'
                      : 'border-[#252D34] bg-[#0B0E11] text-[#9BA8B2] hover:text-[#E8EDF0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#9BA8B2]">
              {viewMode === 'anomaly'
                ? sensor === 'harmonized'
                  ? 'Each month is compared against the leave-one-year-out same-calendar-month median across the 2003–2025 harmonized baseline. Baseline departures reflect descriptive differences relative to historical medians, which can be influenced by multi-decadal changes in fire activity, environmental conditions, and sensor transition characteristics.'
                  : `Each month is compared with the leave-one-year-out median of that calendar month in other years of the ${sensor.toUpperCase()} archive.`
                : sensor === 'harmonized'
                  ? 'Colors show quantile activity bands on the unified MODIS-equivalent OGCD scale (2003–2012 observed MODIS; 2013–2025 seasonally adjusted VIIRS).'
                  : `Colors show the rank of monthly activity within the ${sensor.toUpperCase()} archive.`}
            </p>

            <div className="mt-6 overflow-x-auto pb-2">
              <div className="min-w-[590px]">
                <div className="mb-2 grid grid-cols-[56px_repeat(12,minmax(0,1fr))] gap-1.5">
                  <span />
                  {MONTHS.map(month => (
                    <span key={month} className="text-center text-xs font-mono text-[#9BA8B2]">
                      {month}
                    </span>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {years.map(year => {
                    const isTransitionBoundary = sensor === 'harmonized' && year === 2013
                    return (
                      <div key={year}>
                        {isTransitionBoundary && (
                          <div className="my-3.5 flex items-center justify-between rounded-xl border border-[#F0A34A]/40 bg-gradient-to-r from-[#F0A34A]/12 via-[#F0A34A]/5 to-transparent px-3.5 py-2 text-[11px] font-mono text-[#F0A34A] shadow-[0_0_16px_rgba(240,163,74,0.12)]">
                            <div className="flex items-center gap-2.5">
                              <span className="h-2 w-2 rounded-full bg-[#F0A34A] shadow-[0_0_8px_rgba(240,163,74,0.8)]" />
                              <span className="font-semibold uppercase tracking-wider text-[#E8EDF0]">Jan 2013 Sensor Transition:</span>
                              <span className="text-[#9BA8B2]">▲ 2003–2012 Observed MODIS</span>
                              <span className="text-[#9BA8B2]/40">│</span>
                              <span className="text-[#F0A34A] font-medium">▼ 2013–2025 Harmonized VIIRS</span>
                              <span className="hidden sm:inline text-xs text-[#9BA8B2] font-normal">(S-NPP 375 m scaled to MODIS scale)</span>
                            </div>
                            <span className="rounded bg-[#0B0E11] border border-[#F0A34A]/30 px-2 py-0.5 text-[10px] text-[#F0A34A] uppercase tracking-widest hidden md:inline font-mono">
                              Unified Series Splice
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-[56px_repeat(12,minmax(0,1fr))] gap-1.5">
                          <span className="self-center text-xs font-mono tabular-nums text-[#9BA8B2]">{year}</span>
                          {MONTHS.map((_, index) => {
                            const key = `${year}-${String(index + 1).padStart(2, '0')}`
                            const rowUnified = unifiedLookup.get(key)
                            const rowRaw = rawLookup.get(key)
                            const value = sensor === 'harmonized'
                              ? (rowUnified?.harmonized ?? null)
                              : (rowRaw?.[sensor] ?? null)

                            const cellAnomaly = sensor === 'harmonized'
                              ? computeUnifiedAnomaly(key, unifiedRecords)
                              : anomalyForRaw(key, sensor, records)

                            const band = viewMode === 'activity'
                              ? (value === null ? null : activityBand(value, sortedValues))
                              : (cellAnomaly === null ? null : anomalyBand(cellAnomaly.percent))
                            const active = selected === key

                            const tooltipText = sensor === 'harmonized'
                              ? `${key} [Harmonized]: ${value === null ? 'Unavailable' : `${format(Math.round(value))} MODIS-eq OGCD`}${
                                  rowUnified?.provenance === 'OBSERVED_MODIS' ? ' (Observed MODIS)' : ` (VIIRS × ${rowUnified?.appliedFactor?.toFixed(4)})`
                                }${
                                  viewMode === 'anomaly'
                                    ? cellAnomaly
                                      ? ` · ${signedPercent(cellAnomaly.percent)} vs leave-out median (${format(Math.round(cellAnomaly.baseline))} OGCD, n=${cellAnomaly.peerYears} yrs)`
                                      : ' · anomaly unavailable'
                                    : band !== null
                                      ? ` · ${ACTIVITY_LABELS[band]} relative activity`
                                      : ''
                                }`
                              : `${key} [${sensor.toUpperCase()}]: ${value === null ? 'Unavailable' : `${format(value)} OGCD`}${
                                  viewMode === 'anomaly'
                                    ? cellAnomaly
                                      ? ` · ${signedPercent(cellAnomaly.percent)} vs median (${format(Math.round(cellAnomaly.baseline))} OGCD)`
                                      : ' · anomaly unavailable'
                                    : band !== null
                                      ? ` · ${ACTIVITY_LABELS[band]} relative activity`
                                      : ''
                                }`

                            return (
                              <button
                                key={key}
                                type="button"
                                disabled={value === null}
                                onClick={() => setSelected(key)}
                                title={tooltipText}
                                aria-label={tooltipText}
                                aria-pressed={active}
                                className={`h-6 rounded-[4px] border transition-all duration-150 ${
                                  active
                                    ? 'border-[#E8EDF0] ring-2 ring-[#F0A34A] ring-offset-1 ring-offset-[#0B0E11] scale-105 z-10 shadow-md'
                                    : 'border-[#252D34] hover:scale-105 hover:z-10 focus-visible:ring-2 focus-visible:ring-[#F0A34A] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0E11] focus-visible:z-20 focus-visible:outline-none'
                                } ${value === null ? 'cursor-not-allowed bg-[#1B2127]/60' : 'hover:brightness-125'}`}
                                style={band === null ? undefined : { backgroundColor: viewMode === 'activity' ? ACTIVITY_COLORS[band] : ANOMALY_COLORS[band] }}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[#9BA8B2]">
              {(viewMode === 'activity' ? ACTIVITY_COLORS : ANOMALY_COLORS).map((color, index) => (
                <span key={color} className="flex items-center gap-1.5">
                  <span className="h-3 w-4 rounded-sm border border-[#252D34]" style={{ backgroundColor: color }} />
                  {viewMode === 'activity' ? ACTIVITY_LABELS[index] : ANOMALY_LABELS[index]}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-4 rounded-sm border border-[#252D34] bg-[#1B2127]/60" /> Unavailable
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#9BA8B2]">
              {viewMode === 'activity'
                ? 'Five equal-frequency activity bands based on the active series distribution. Colors indicate relative rank within the record, not absolute fire risk or burned area.'
                : 'Seasonal anomaly = (observed/modeled OGCD − leave-one-year-out same-month median) / baseline × 100. Baselines exclude the evaluated year. Values are descriptive detection anomalies, not changes in fire danger.'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 shadow-sm transition-colors hover:border-[#F0A34A]/30">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Selected month</p>
              <p className="mt-2 text-xl font-semibold text-[#E8EDF0]">{MONTHS[Number(selected.slice(5)) - 1]} {selectedYear}</p>
              <p className="mt-3 text-3xl font-semibold text-[#F0A34A]">
                {selectedValue === null ? 'N/A' : format(Math.round(selectedValue))}
              </p>
              <p className="mt-1 text-xs text-[#9BA8B2]">
                {selectedValue === null
                  ? 'No archived detections / unavailable'
                  : sensor === 'harmonized'
                    ? 'Harmonized MODIS-equivalent OGCD'
                    : `${sensor.toUpperCase()} occupied grid-cell-days`}
              </p>

              {viewMode === 'anomaly' && (
                <div className="mt-3 border-t border-[#252D34] pt-3">
                  <p className="text-sm text-[#E8EDF0]">
                    Seasonal anomaly: <strong className="text-[#F0A34A]">{selectedAnomaly ? signedPercent(selectedAnomaly.percent) : 'Unavailable'}</strong>
                  </p>
                  <p className="mt-1 text-xs text-[#9BA8B2]">
                    {selectedAnomaly
                      ? `Leave-one-out median: ${format(Math.round(selectedAnomaly.baseline))} OGCD (n=${selectedAnomaly.peerYears} years, mixed 2003–2025 baseline)`
                      : 'No valid baseline for this month'}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 shadow-sm transition-colors hover:border-[#38BDF8]/30">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">{selectedYear} annual activity</p>
              <p className="mt-5 text-3xl font-semibold text-[#E8EDF0]">{yearTotal === null ? 'N/A' : format(yearTotal)}</p>
              <p className="mt-1 text-xs text-[#9BA8B2]">
                {yearTotal === null
                  ? 'Incomplete / unavailable year'
                  : sensor === 'harmonized'
                    ? 'Annual harmonized MODIS-equivalent OGCD'
                    : `${sensor.toUpperCase()} annual OGCD total`}
              </p>
            </div>

            <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 shadow-sm transition-colors hover:border-emerald-500/30">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Months with detections</p>
              <p className="mt-5 text-3xl font-semibold text-[#E8EDF0]">
                {availableMonths} <span className="text-lg text-[#9BA8B2]">/ {records.length}</span>
              </p>
              <p className="mt-1 text-xs text-[#9BA8B2]">
                {sensor === 'harmonized'
                  ? 'Continuous 2003–2025 harmonized historical indicator'
                  : `${sensor.toUpperCase()} · archive presence, not verified completeness`}
              </p>
            </div>
          </div>

          {/* SCIENTIFIC PROVENANCE CARD FOR SELECTED MONTH */}
          {sensor === 'harmonized' && selectedUnified && (
            <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0B0E11] p-5 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#252D34] pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-[#F0A34A]/40 bg-[#F0A34A]/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-[#F0A34A] shadow-[0_0_8px_rgba(240,163,74,0.15)]">
                    {selectedUnified.provenance === 'OBSERVED_MODIS' ? 'OBSERVED MODIS' : 'HARMONIZED VIIRS'}
                  </span>
                  <span className="text-sm font-semibold text-[#E8EDF0]">
                    Scientific Provenance · {selected}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#9BA8B2]">
                  Split:{' '}
                  {selectedUnified.split === 'PRE_VIIRS'
                    ? 'Pre-VIIRS Baseline (2003–2012)'
                    : selectedUnified.split === 'TRAIN'
                      ? 'Model Training Split (2013–2021)'
                      : selectedUnified.split === 'VALIDATION'
                        ? 'Model Validation Split (2022–2023)'
                        : 'Chronologically Held-Out Retrospective Test Split (2024–2025)'}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/80 p-3.5 transition-colors hover:border-[#F0A34A]/30">
                  <p className="text-[#9BA8B2] uppercase font-mono tracking-wider">Harmonized Value</p>
                  <p className="mt-1.5 text-lg font-semibold text-[#F0A34A] tabular-nums">
                    {format(Math.round(selectedUnified.harmonized))} <span className="text-xs text-[#9BA8B2]">OGCD</span>
                  </p>
                  <p className="mt-1 text-[11px] text-[#9BA8B2] font-mono">
                    Exact: {selectedUnified.harmonized.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/80 p-3.5 transition-colors hover:border-[#38BDF8]/30">
                  <p className="text-[#9BA8B2] uppercase font-mono tracking-wider">Observed MODIS</p>
                  <p className="mt-1.5 text-lg font-semibold text-[#E8EDF0] tabular-nums">
                    {selectedUnified.modis !== null ? format(selectedUnified.modis) : 'Unavailable'}{' '}
                    <span className="text-xs text-[#9BA8B2]">OGCD</span>
                  </p>
                  <p className="mt-1 text-[11px] text-[#9BA8B2]">
                    {selectedUnified.provenance === 'OBSERVED_MODIS' ? 'Primary observation' : 'Comparison reference'}
                  </p>
                </div>

                <div className="rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/80 p-3.5 transition-colors hover:border-[#F0A34A]/30">
                  <p className="text-[#9BA8B2] uppercase font-mono tracking-wider">Observed VIIRS</p>
                  <p className="mt-1.5 text-lg font-semibold text-[#E8EDF0] tabular-nums">
                    {selectedUnified.viirs !== null ? format(selectedUnified.viirs) : 'N/A'}{' '}
                    <span className="text-xs text-[#9BA8B2]">OGCD</span>
                  </p>
                  <p className="mt-1 text-[11px] text-[#9BA8B2]">
                    {selectedUnified.appliedFactor !== null
                      ? `Factor β_${selectedUnified.calendarMonth} = ${selectedUnified.appliedFactor.toFixed(6)}`
                      : 'Sensor not operational'}
                  </p>
                </div>

                <div className="rounded-xl border border-[#252D34]/90 bg-[#0B0E11]/80 p-3.5 transition-colors hover:border-emerald-500/30">
                  <p className="text-[#9BA8B2] uppercase font-mono tracking-wider">Co-observation Residual</p>
                  <p className="mt-1.5 text-lg font-semibold tabular-nums text-[#E8EDF0]">
                    {selectedUnified.coObservationResidual !== null ? (
                      <>
                        <span className={selectedUnified.coObservationResidual >= 0 ? 'text-amber-400' : 'text-blue-400'}>
                          {selectedUnified.coObservationResidual >= 0 ? '+' : ''}
                          {format(Math.round(selectedUnified.coObservationResidual))}
                        </span>{' '}
                        <span className="text-xs text-[#9BA8B2]">
                          ({selectedUnified.modis ? ((selectedUnified.coObservationResidual / selectedUnified.modis) * 100).toFixed(1) : 0}%)
                        </span>
                      </>
                    ) : (
                      'N/A (Pre-2013)'
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-[#9BA8B2]">
                    {selectedUnified.coObservationResidual !== null ? 'Harmonized VIIRS − Observed MODIS' : 'Single-sensor era'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#252D34]/70 bg-[#0B0E11]/60 p-3 text-xs leading-5 text-[#9BA8B2]">
                <strong className="text-[#E8EDF0]">Methodological Note: </strong>
                {selectedUnified.year < 2013 ? (
                  <span>
                    Prior to January 2013, values represent direct Terra/Aqua MODIS observations. VIIRS (S-NPP) was launched in late 2011; operational FIRMS processing begins in 2013.
                  </span>
                ) : (
                  <span>
                    Values are derived from S-NPP VIIRS detections scaled to MODIS-equivalent OGCD using calendar-month shrinkage factor{' '}
                    <code className="text-[#F0A34A]">β_{selectedUnified.calendarMonth} = {selectedUnified.appliedFactor?.toFixed(6)}</code>.
                    Observed MODIS is preserved strictly as an empirical comparison reference, not as physical ground truth.
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp size={19} className="text-[#F0A34A]" />
              <h4 className="text-lg font-semibold text-[#E8EDF0]">Annual hotspot activity</h4>
            </div>
            <p className="mt-1 text-sm text-[#9BA8B2]">
              {sensor === 'harmonized'
                ? 'Annual sums of monthly harmonized MODIS-equivalent OGCD (2003–2025 continuous historical indicator). Spliced at January 2013.'
                : `Annual sums of raw monthly OGCD for ${sensor.toUpperCase()} (not anomalies). Gaps represent unavailable years.`}
            </p>
            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={annual} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#1C2329" strokeDasharray="3 3" />
                  <XAxis dataKey="year" stroke="#9BA8B2" tick={{ fontSize: 11 }} minTickGap={20} />
                  <YAxis stroke="#9BA8B2" tick={{ fontSize: 11 }} tickFormatter={n => `${Math.round(Number(n) / 1000)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(11, 14, 17, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid #252D34',
                      borderRadius: 12,
                      color: '#E8EDF0',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#9BA8B2', fontWeight: 600, marginBottom: 4 }}
                    itemStyle={{ color: '#E8EDF0' }}
                    formatter={(value) => [typeof value === 'number' ? format(value) : 'N/A', sensor === 'harmonized' ? 'Annual Harmonized OGCD' : 'Annual OGCD']}
                  />
                  <Line dataKey="total" name={sensor === 'harmonized' ? 'Harmonized OGCD' : 'Annual OGCD'} stroke="#F0A34A" strokeWidth={2.5} dot={{ r: 2, fill: '#F0A34A' }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-[#F0A34A]/25 bg-[#F0A34A]/5 p-5 text-sm leading-6 text-[#9BA8B2]">
            <Info size={19} className="mt-0.5 shrink-0 text-[#F0A34A]" />
            <p>
              <strong className="text-[#F0A34A]">Scientific interpretation: </strong>
              OGCD measures grid-cell-days containing at least one FIRMS hotspot detection, not unique fire count, fire perimeter, or burned area.
              Statistical harmonization is an empirical transfer function that maps VIIRS to expected MODIS-equivalent OGCD; it does not eliminate physical differences in satellite overpass timing, orbital geometry, saturation thresholds, or cloud sensitivity.
              During the 2013–2025 overlap, observed MODIS serves as a comparative reference, not physical ground truth.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

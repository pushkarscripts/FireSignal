import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Download, Info, Satellite, TrendingUp } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Sensor = 'modis' | 'viirs'
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

// Leave-one-year-out seasonal baseline: compare each month only with the
// same calendar month in OTHER years of the selected sensor's archive.
function anomalyFor(month: string, sensor: Sensor, records: MonthRecord[]) {
  const current = records.find(row => row.month === month)?.[sensor] ?? null
  if (current === null) return null
  const calendarMonth = month.slice(5)
  const baseline = median(records.filter(row => row.month.slice(5) === calendarMonth && row.month !== month)
    .map(row => row[sensor]).filter((value): value is number => value !== null))
  if (baseline === null || baseline <= 0) return null
  return { percent: ((current - baseline) / baseline) * 100, baseline }
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
  const [sensor, setSensor] = useState<Sensor>('modis')
  const [viewMode, setViewMode] = useState<ViewMode>('activity')
  const [selected, setSelected] = useState('2023-03')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/historical_calendar_5km.json`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((json: unknown) => {
        if (!Array.isArray(json) || json.length === 0 || !json.every(validRecord)) {
          throw new Error('Historical calendar JSON is missing or invalid')
        }
        setRecords(json)
      })
      .catch((reason: Error) => { if (reason.name !== 'AbortError') setError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const lookup = useMemo(() => new Map(records.map(row => [row.month, row])), [records])
  const years = useMemo(() => [...new Set(records.map(row => Number(row.month.slice(0, 4))))].sort((a, b) => a - b), [records])
  const values = useMemo(() => records.map(row => row[sensor]).filter((value): value is number => value !== null), [records, sensor])
  const sortedValues = useMemo(() => [...values].sort((a, b) => a - b), [values])
  const selectedRecord = lookup.get(selected)
  const selectedValue = selectedRecord?.[sensor] ?? null
  const selectedAnomaly = useMemo(() => anomalyFor(selected, sensor, records), [selected, sensor, records])
  const selectedYear = Number(selected.slice(0, 4))
  const annual = useMemo(() => years.map(year => {
    const months = MONTHS.map((_, index) => lookup.get(`${year}-${String(index + 1).padStart(2, '0')}`)?.[sensor] ?? null)
    return { year: String(year), total: months.every(value => value !== null) ? months.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null }
  }), [years, lookup, sensor])
  const yearTotal = annual.find(row => row.year === String(selectedYear))?.total ?? null
  const availableMonths = values.length

  function downloadCSV() {
    const lines = ['month,modis_ogcd,viirs_ogcd', ...records.map(row => `${row.month},${row.modis ?? ''},${row.viirs ?? ''}`)]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
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
            Explore monthly hotspot activity across the available satellite records.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCSV}
          disabled={records.length === 0}
          className="flex items-center gap-2 rounded-lg border border-[#252D34] bg-[#151A1F] px-4 py-2 text-sm font-medium text-[#E8EDF0] transition hover:border-[#F0A34A]/50 hover:text-[#F0A34A] disabled:opacity-40"
        >
          <Download size={16} /> Export monthly CSV
        </button>
      </div>

      {loading && (
        <div className="rounded-xl border border-[#252D34] bg-[#151A1F] p-8 text-center text-sm text-[#9BA8B2]">
          Loading historical observations…
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          Historical calendar: {error}
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <>
          <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-[#9BA8B2]">
                <Satellite size={17} className="text-[#F0A34A]" /> Select satellite sensor
              </div>
              <div className="flex rounded-lg border border-[#252D34] bg-[#0B0E11] p-1" role="group" aria-label="Satellite sensor">
                {(['modis', 'viirs'] as const).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSensor(item)}
                    aria-pressed={sensor === item}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                      sensor === item
                        ? 'bg-[#F0A34A] text-[#0B0E11] font-semibold'
                        : 'text-[#9BA8B2] hover:text-[#E8EDF0]'
                    }`}
                  >
                    {item.toUpperCase()}
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
                  className={`rounded-lg border px-3.5 py-1.5 text-sm font-medium transition ${
                    viewMode === mode
                      ? 'border-[#F0A34A] bg-[#F0A34A]/10 text-[#F0A34A]'
                      : 'border-[#252D34] bg-[#0B0E11] text-[#9BA8B2] hover:text-[#E8EDF0]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#9BA8B2]">
              {viewMode === 'anomaly'
                ? 'Each month is compared with the median of that calendar month in other years for the selected sensor. This is a descriptive detection anomaly, not a change in fire risk.'
                : 'Colors show the rank of monthly activity within the selected sensor archive.'}
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
                  {years.map(year => (
                    <div key={year} className="grid grid-cols-[56px_repeat(12,minmax(0,1fr))] gap-1.5">
                      <span className="self-center text-xs font-mono tabular-nums text-[#9BA8B2]">{year}</span>
                      {MONTHS.map((_, index) => {
                        const key = `${year}-${String(index + 1).padStart(2, '0')}`
                        const value = lookup.get(key)?.[sensor] ?? null
                        const anomaly = value === null ? null : anomalyFor(key, sensor, records)
                        const band = viewMode === 'activity'
                          ? (value === null ? null : activityBand(value, sortedValues))
                          : (anomaly === null ? null : anomalyBand(anomaly.percent))
                        const active = selected === key
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={value === null}
                            onClick={() => setSelected(key)}
                            title={`${key}: ${value === null ? 'Unavailable / no archived detections' : `${format(value)} OGCD`}${viewMode === 'anomaly' ? (anomaly ? ` · ${signedPercent(anomaly.percent)} vs leave-one-year-out median (${format(anomaly.baseline)} OGCD)` : ' · anomaly unavailable') : (band !== null ? ` · ${ACTIVITY_LABELS[band]} relative activity` : '')}`}
                            aria-label={`${key}, ${sensor.toUpperCase()}: ${value === null ? 'unavailable' : `${format(value)} occupied grid-cell-days`}${viewMode === 'anomaly' && anomaly ? `, ${signedPercent(anomaly.percent)} seasonal anomaly` : ''}`}
                            aria-pressed={active}
                            className={`h-6 rounded-[4px] border transition ${
                              active
                                ? 'border-[#E8EDF0] ring-2 ring-[#F0A34A] ring-offset-1 ring-offset-[#0B0E11]'
                                : 'border-[#252D34]'
                            } ${value === null ? 'cursor-not-allowed bg-[#1B2127]/60' : 'hover:brightness-125'}`}
                            style={band === null ? undefined : { backgroundColor: viewMode === 'activity' ? ACTIVITY_COLORS[band] : ANOMALY_COLORS[band] }}
                          />
                        )
                      })}
                    </div>
                  ))}
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
                ? 'Five equal-frequency activity bands based on the selected sensor’s monthly OGCD values (2003–2025 for MODIS; 2013–2025 for VIIRS). Colors indicate relative rank, not absolute fire risk.'
                : 'Anomaly = (observed OGCD − leave-one-year-out same-month median) / baseline × 100. Baselines exclude the selected year; values are not observation-normalized or cross-sensor calibrated.'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Selected month</p>
              <p className="mt-2 text-xl font-semibold text-[#E8EDF0]">{MONTHS[Number(selected.slice(5)) - 1]} {selectedYear}</p>
              <p className="mt-3 text-3xl font-semibold text-[#F0A34A]">{selectedValue === null ? 'N/A' : format(selectedValue)}</p>
              <p className="mt-1 text-xs text-[#9BA8B2]">{selectedValue === null ? 'No archived detections / unavailable' : `${sensor.toUpperCase()} occupied grid-cell-days`}</p>
              {viewMode === 'anomaly' && (
                <div className="mt-3 border-t border-[#252D34] pt-3">
                  <p className="text-sm text-[#E8EDF0]">Seasonal anomaly: <strong className="text-[#F0A34A]">{selectedAnomaly ? signedPercent(selectedAnomaly.percent) : 'Unavailable'}</strong></p>
                  <p className="mt-1 text-xs text-[#9BA8B2]">{selectedAnomaly ? `Other-year same-month median: ${format(selectedAnomaly.baseline)} OGCD` : 'No valid baseline for this month'}</p>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">{selectedYear} annual activity</p>
              <p className="mt-5 text-3xl font-semibold text-[#E8EDF0]">{yearTotal === null ? 'N/A' : format(yearTotal)}</p>
              <p className="mt-1 text-xs text-[#9BA8B2]">{yearTotal === null ? 'Incomplete / unavailable year' : `${sensor.toUpperCase()} annual OGCD total`}</p>
            </div>
            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Months with detections</p>
              <p className="mt-5 text-3xl font-semibold text-[#E8EDF0]">{availableMonths} <span className="text-lg text-[#9BA8B2]">/ {records.length}</span></p>
              <p className="mt-1 text-xs text-[#9BA8B2]">{sensor.toUpperCase()} · archive presence, not verified observation completeness</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-5 sm:p-7">
            <div className="flex items-center gap-2">
              <TrendingUp size={19} className="text-[#F0A34A]" />
              <h4 className="text-lg font-semibold text-[#E8EDF0]">Annual hotspot activity</h4>
            </div>
            <p className="mt-1 text-sm text-[#9BA8B2]">Annual sums of raw monthly OGCD for {sensor.toUpperCase()} (not anomalies). Gaps represent unavailable years.</p>
            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={annual} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#252D34" strokeDasharray="3 3" />
                  <XAxis dataKey="year" stroke="#9BA8B2" tick={{ fontSize: 11 }} minTickGap={20} />
                  <YAxis stroke="#9BA8B2" tick={{ fontSize: 11 }} tickFormatter={n => `${Math.round(Number(n) / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#151A1F', border: '1px solid #252D34', borderRadius: 8, color: '#E8EDF0' }}
                    formatter={(value) => [typeof value === 'number' ? format(value) : 'N/A', 'Annual OGCD']}
                  />
                  <Line dataKey="total" name="Annual OGCD" stroke="#F0A34A" strokeWidth={2.5} dot={{ r: 2, fill: '#F0A34A' }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-[#F0A34A]/25 bg-[#F0A34A]/5 p-5 text-sm leading-6 text-[#9BA8B2]">
            <Info size={19} className="mt-0.5 shrink-0 text-[#F0A34A]" />
            <p><strong className="text-[#F0A34A]">Scientific interpretation:</strong> OGCD measures grid-cell-days containing at least one FIRMS hotspot detection, not unique fires, burned area, or observation-normalized fire incidence. A missing month does not prove zero burning. MODIS and VIIRS differ in sensitivity and observation characteristics; these series are not statistically calibrated and should not be directly compared as equivalent fire counts.</p>
          </div>
        </>
      )}
    </div>
  )
}

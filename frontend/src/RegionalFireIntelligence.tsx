import { useEffect, useMemo, useState } from 'react'
import { MapPinned, Info, TrendingUp, BarChart3 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Sensor = 'MODIS' | 'VIIRS'
type View = 'activity' | 'anomaly'
type RegionalRecord = { sensor: Sensor; region: string; month: string; ogcd: number; daysWithDetections: number }
type Payload = { regions: string[]; records: RegionalRecord[]; boundaryYear: number; boundaryLicense: string; gridKm: number }
const format = (value: number) => value.toLocaleString('en-IN')
const monthLabel = (month: string) => `${month.slice(0, 4)}-${month.slice(5)}`

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function validPayload(value: unknown): value is Payload {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<Payload>
  return Array.isArray(data.regions) && data.regions.every(r => typeof r === 'string') &&
    Array.isArray(data.records) && data.records.every(r =>
      r && (r.sensor === 'MODIS' || r.sensor === 'VIIRS') && typeof r.region === 'string' &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(r.month) && Number.isInteger(r.ogcd) && r.ogcd >= 0 &&
      Number.isInteger(r.daysWithDetections) && r.daysWithDetections >= 0)
}

export default function RegionalFireIntelligence() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [region, setRegion] = useState('Odisha')
  const [sensor, setSensor] = useState<Sensor>('MODIS')
  const [view, setView] = useState<View>('activity')
  const [year, setYear] = useState('2023')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/regional_monthly_5km.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json() })
      .then((json: unknown) => {
        if (!validPayload(json)) throw new Error('Regional dataset has an unexpected format')
        setData(json)
        if (!json.regions.includes('Odisha')) setRegion(json.regions[0] ?? '')
      })
      .catch((reason: Error) => { if (reason.name !== 'AbortError') setError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const sensorRecords = useMemo(() => (data?.records ?? []).filter(r => r.sensor === sensor), [data, sensor])
  const regionRecords = useMemo(() => sensorRecords.filter(r => r.region === region), [sensorRecords, region])
  const lookup = useMemo(() => new Map(regionRecords.map(r => [r.month, r])), [regionRecords])
  const startYear = sensor === 'MODIS' ? 2003 : 2013
  const years = Array.from({ length: 2025 - startYear + 1 }, (_, i) => String(startYear + i))
  const annual = useMemo(() => years.map(y => {
    const rows = regionRecords.filter(r => r.month.startsWith(y))
    return { year: y, ogcd: rows.length ? rows.reduce((sum, r) => sum + r.ogcd, 0) : null, months: rows.length }
  }), [regionRecords, years])
  const monthRows = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`
    const observed = lookup.get(month)
    const peers = regionRecords.filter(r => r.month.slice(5) === month.slice(5) && r.month !== month)
    const baseline = median(peers.map(r => r.ogcd))
    const anomaly = observed && baseline !== null && baseline > 0 && peers.length >= 3
      ? ((observed.ogcd - baseline) / baseline) * 100 : null
    return { month, label: new Date(`${month}-01T00:00:00`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }), ogcd: observed?.ogcd ?? null, anomaly, baseline, peers: peers.length }
  }), [lookup, regionRecords, year])
  const selectedYearTotal = monthRows.some(r => r.ogcd !== null) ? monthRows.reduce((sum, r) => sum + (r.ogcd ?? 0), 0) : null
  const observedMonths = monthRows.filter(r => r.ogcd !== null).length
  const ranking = useMemo(() => {
    const totals = new Map<string, { total: number; months: number }>()
    for (const r of sensorRecords) {
      if (!r.month.startsWith(year)) continue
      const prev = totals.get(r.region) ?? { total: 0, months: 0 }
      totals.set(r.region, { total: prev.total + r.ogcd, months: prev.months + 1 })
    }
    return [...totals].map(([name, value]) => ({ region: name, ogcd: value.total, months: value.months }))
      .sort((a, b) => b.ogcd - a.ogcd).slice(0, 10)
  }, [sensorRecords, year])
  const tooltipStyle = { background: '#151A1F', border: '1px solid #252D34', borderRadius: 8, color: '#E8EDF0' }

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-[#F0A34A]/30 bg-[#F0A34A]/10 p-2 text-[#F0A34A]">
          <MapPinned size={22} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#E8EDF0]">Regional Fire Intelligence</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#9BA8B2]">
            Explore monthly satellite hotspot activity within historical administrative boundaries. Values are occupied 5 km grid-cell-days (OGCD), not fire counts or burned area.
          </p>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-[#252D34] bg-[#151A1F] p-8 text-center text-sm text-[#9BA8B2]">
          Loading regional observations…
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Unable to load regional data: {error}
        </div>
      )}

      {data && !loading && !error && (
        <>
          <div className="grid gap-4 rounded-2xl border border-[#252D34] bg-[#151A1F] p-5 sm:grid-cols-3">
            <label className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
              Region
              <select
                className="mt-2 block w-full rounded-lg border border-[#252D34] bg-[#0B0E11] p-2.5 text-sm font-sans normal-case text-[#E8EDF0] focus:border-[#F0A34A] focus:outline-none"
                value={region}
                onChange={e => setRegion(e.target.value)}
              >
                {data.regions.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
              Satellite Sensor
              <select
                className="mt-2 block w-full rounded-lg border border-[#252D34] bg-[#0B0E11] p-2.5 text-sm font-sans normal-case text-[#E8EDF0] focus:border-[#F0A34A] focus:outline-none"
                value={sensor}
                onChange={e => {
                  const next = e.target.value as Sensor
                  setSensor(next)
                  if (next === 'VIIRS' && Number(year) < 2013) setYear('2013')
                }}
              >
                <option value="MODIS">MODIS (2003–2025)</option>
                <option value="VIIRS">VIIRS (2013–2025)</option>
              </select>
            </label>
            <label className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
              Observation Year
              <select
                className="mt-2 block w-full rounded-lg border border-[#252D34] bg-[#0B0E11] p-2.5 text-sm font-sans normal-case text-[#E8EDF0] focus:border-[#F0A34A] focus:outline-none"
                value={year}
                onChange={e => setYear(e.target.value)}
              >
                {years.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#252D34] bg-[#151A1F] p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Recorded OGCD · {year}</p>
              <p className="mt-2 text-2xl font-semibold text-[#E8EDF0]">
                {selectedYearTotal === null ? 'Unavailable' : format(selectedYearTotal)}
              </p>
            </div>
            <div className="rounded-xl border border-[#252D34] bg-[#151A1F] p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Months with detections · {year}</p>
              <p className="mt-2 text-2xl font-semibold text-[#E8EDF0]">{observedMonths} / 12</p>
            </div>
            <div className="rounded-xl border border-[#252D34] bg-[#151A1F] p-5">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Region coverage · {sensor}</p>
              <p className="mt-2 text-2xl font-semibold text-[#E8EDF0]">
                {regionRecords.length ? `${regionRecords.length} months` : 'No matched detections'}
              </p>
            </div>
          </div>

          {observedMonths < 12 && (
            <div className="rounded-xl border border-[#F0A34A]/25 bg-[#F0A34A]/5 p-3.5 text-xs text-[#E8EDF0]">
              <span className="font-semibold text-[#F0A34A]">Note: </span>
              {observedMonths === 0 ? 'No matched detections in the selected year.' : 'Some months have no matched detections.'} Missing months are not treated as verified zero activity. The annual total sums only months with detections.
            </div>
          )}

          <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="flex items-center gap-2 text-lg font-semibold text-[#E8EDF0]">
                  <TrendingUp size={19} className="text-[#F0A34A]" /> Monthly regional analysis
                </h4>
                <p className="mt-1 text-sm text-[#9BA8B2]">
                  {region} · {sensor} · {year}
                </p>
              </div>
              <div className="flex rounded-lg border border-[#252D34] bg-[#0B0E11] p-1" role="group" aria-label="Regional chart mode">
                {(['activity', 'anomaly'] as View[]).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    className={`rounded-md px-3.5 py-1 text-sm font-medium transition ${
                      view === v ? 'bg-[#F0A34A] text-[#0B0E11] font-semibold' : 'text-[#9BA8B2] hover:text-[#E8EDF0]'
                    }`}
                  >
                    {v === 'activity' ? 'Activity' : 'Anomaly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthRows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid stroke="#252D34" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    type="category"
                    interval={0}
                    tickFormatter={(value: string) => {
                      const monthNumber = Number(value.slice(5))
                      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthNumber - 1] ?? value
                    }}
                    stroke="#9BA8B2"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#9BA8B2"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(n: number) => (view === 'anomaly' ? `${n}%` : format(n))}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      value == null ? 'No data' : view === 'anomaly' ? `${Number(value).toFixed(1)}%` : format(Number(value)),
                      name === 'anomaly' ? 'Seasonal anomaly' : 'OGCD',
                    ]}
                  />
                  <Bar
                    dataKey={view === 'anomaly' ? 'anomaly' : 'ogcd'}
                    name={view === 'anomaly' ? 'anomaly' : 'ogcd'}
                    fill={view === 'anomaly' ? '#38BDF8' : '#F0A34A'}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#9BA8B2]">
              {view === 'anomaly'
                ? 'Anomaly compares each observed month with the median of the same calendar month in other years for this region and sensor. At least three comparison years and a positive baseline are required. Missing months are excluded.'
                : 'Only months containing matched hotspot detections are plotted. An empty month does not establish zero fire activity or complete satellite coverage.'}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-5 sm:p-6">
              <h4 className="text-lg font-semibold text-[#E8EDF0]">Historical annual activity</h4>
              <p className="mt-1 text-sm text-[#9BA8B2]">{region} · {sensor} · observed months only</p>
              <div className="mt-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={annual} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid stroke="#252D34" strokeDasharray="3 3" />
                    <XAxis dataKey="year" stroke="#9BA8B2" tick={{ fontSize: 11 }} minTickGap={16} />
                    <YAxis stroke="#9BA8B2" tick={{ fontSize: 11 }} tickFormatter={format} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => (v == null ? 'No matched detections' : format(Number(v)))} />
                    <Line dataKey="ogcd" name="Observed OGCD" stroke="#38BDF8" strokeWidth={2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-[#9BA8B2]">Annual totals are not corrected for missing observation coverage or changing satellite detection opportunities.</p>
            </div>

            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-5 sm:p-6">
              <h4 className="flex items-center gap-2 text-lg font-semibold text-[#E8EDF0]">
                <BarChart3 size={19} className="text-[#F0A34A]" /> Top regions · {year}
              </h4>
              <p className="mt-1 text-sm text-[#9BA8B2]">{sensor} only · observed OGCD, not fire risk</p>
              <div className="mt-5 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking} layout="vertical" margin={{ left: 14, right: 12, top: 5, bottom: 5 }}>
                    <CartesianGrid stroke="#252D34" strokeDasharray="3 3" />
                    <XAxis type="number" stroke="#9BA8B2" tick={{ fontSize: 11 }} tickFormatter={format} />
                    <YAxis type="category" dataKey="region" width={110} stroke="#9BA8B2" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={v => (v == null ? 'No data' : format(Number(v)))} />
                    <Bar dataKey="ogcd" name="Observed OGCD" fill="#F0A34A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-[#9BA8B2]">Rankings reflect recorded activity, not normalized area, coverage, or independently verified fire severity.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-[#252D34] bg-[#151A1F] p-4 text-xs leading-6 text-[#9BA8B2]">
            <Info size={18} className="mt-1 shrink-0 text-sky-400" />
            <p>
              <strong className="text-[#E8EDF0]">Methodology & Attribution:</strong> Detection points were assigned to administrative polygons represented by the {data.boundaryYear} boundary snapshot, then deduplicated by sensor, region, acquisition date and {data.gridKm} km equal-area cell. Boundaries are not time-varying. Regions sharing a grid cell can each count that cell-day. Unmatched detections are excluded. Boundary data: geoBoundaries / DataMeet India / Election Commission of India, {data.boundaryLicense}. Displayed month labels use YYYY-MM (e.g., {monthLabel(`${year}-01`)}).
            </p>
          </div>
        </>
      )}
    </div>
  )
}

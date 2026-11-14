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
  const tooltipStyle = { background: '#101827', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }

  return (
    <section className="mt-14 border-t border-white/10 pt-10" aria-labelledby="regional-heading">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-orange-500/15 p-3 text-orange-400"><MapPinned size={24} /></div>
        <div>
          <p className="text-sm font-medium text-orange-400">INDIA Â· REGIONAL EXPLORATION</p>
          <h2 id="regional-heading" className="mt-1 text-2xl font-semibold sm:text-3xl">Regional Fire Intelligence</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Explore monthly satellite hotspot activity within historical administrative boundaries. Values are occupied 5 km grid-cell-days (OGCD), not fire counts or burned area.</p>
        </div>
      </div>
      {loading && <p className="mt-6 text-slate-400">Loading regional observationsâ€¦</p>}
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-500/30 p-4 text-red-300">Unable to load regional data: {error}</p>}
      {data && !loading && !error && <>
        <div className="mt-7 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-3">
          <label className="text-sm text-slate-300">Region
            <select className="mt-2 w-full rounded-lg border border-slate-600 bg-[#101827] p-3 text-slate-100" value={region} onChange={e => setRegion(e.target.value)}>
              {data.regions.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="text-sm text-slate-300">Satellite sensor
            <select className="mt-2 w-full rounded-lg border border-slate-600 bg-[#101827] p-3 text-slate-100" value={sensor} onChange={e => { const next = e.target.value as Sensor; setSensor(next); if (next === 'VIIRS' && Number(year) < 2013) setYear('2013') }}>
              <option value="MODIS">MODIS</option><option value="VIIRS">VIIRS</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">Year
            <select className="mt-2 w-full rounded-lg border border-slate-600 bg-[#101827] p-3 text-slate-100" value={year} onChange={e => setYear(e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">Recorded OGCD Â· {year}</p><p className="mt-2 text-2xl font-semibold">{selectedYearTotal === null ? 'Unavailable' : format(selectedYearTotal)}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">Months with detections Â· {year}</p><p className="mt-2 text-2xl font-semibold">{observedMonths} / 12</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">Region coverage Â· {sensor}</p><p className="mt-2 text-2xl font-semibold">{regionRecords.length ? `${regionRecords.length} months` : 'No matched detections'}</p></div>
        </div>
        {observedMonths < 12 && <p className="mt-3 text-sm text-amber-300">{observedMonths === 0 ? 'No matched detections in the selected year.' : 'Some months have no matched detections.'} Missing months are not treated as verified zero activity. The annual total sums only months with detections.</p>}
        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp size={19} className="text-orange-400" /> Monthly regional analysis</h3><p className="mt-1 text-sm text-slate-400">{region} Â· {sensor} Â· {year}</p></div>
            <div className="flex gap-2" role="group" aria-label="Regional chart mode">
              {(['activity', 'anomaly'] as View[]).map(v => <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-lg px-3 py-2 text-sm ${view === v ? 'bg-orange-500 text-slate-950' : 'border border-white/15 text-slate-300 hover:bg-white/10'}`}>{v === 'activity' ? 'Activity' : 'Anomaly'}</button>)}
            </div>
          </div>
          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">

              <BarChart data={monthRows}>
                <CartesianGrid
                  stroke="#253044"
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="month"
                  type="category"
                  interval={0}
                  tickFormatter={(value: string) => {
                    const monthNumber = Number(value.slice(5))
                    return [
                      'Jan', 'Feb', 'Mar', 'Apr',
                      'May', 'Jun', 'Jul', 'Aug',
                      'Sep', 'Oct', 'Nov', 'Dec'
                    ][monthNumber - 1] ?? value
                  }}
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(n: number) =>
                    view === 'anomaly' ? `${n}%` : format(n)
                  }
                />

                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value == null ? 'No data' : view === 'anomaly' ? `${Number(value).toFixed(1)}%` : format(Number(value)), name === 'anomaly' ? 'Seasonal anomaly' : 'OGCD']} />
                <Bar dataKey={view === 'anomaly' ? 'anomaly' : 'ogcd'} name={view === 'anomaly' ? 'anomaly' : 'ogcd'} fill={view === 'anomaly' ? '#38bdf8' : '#fb923c'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">{view === 'anomaly' ? 'Anomaly compares each observed month with the median of the same calendar month in other years for this region and sensor. At least three comparison years and a positive baseline are required. Missing months are excluded.' : 'Only months containing matched hotspot detections are plotted. An empty month does not establish zero fire activity or complete satellite coverage.'}</p>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <h3 className="text-lg font-semibold">Historical annual activity</h3><p className="mt-1 text-sm text-slate-400">{region} Â· {sensor} Â· observed months only</p>
            <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={annual}><CartesianGrid stroke="#253044" strokeDasharray="3 3" /><XAxis dataKey="year" stroke="#94a3b8" tick={{ fontSize: 11 }} minTickGap={16} /><YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={format} /><Tooltip contentStyle={tooltipStyle} formatter={v => v == null ? 'No matched detections' : format(Number(v))} /><Line dataKey="ogcd" name="Observed OGCD" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls={false} /></LineChart></ResponsiveContainer></div>
            <p className="mt-2 text-xs text-slate-400">Annual totals are not corrected for missing observation coverage or changing satellite detection opportunities.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold"><BarChart3 size={19} className="text-orange-400" /> Top regions Â· {year}</h3><p className="mt-1 text-sm text-slate-400">{sensor} only Â· observed OGCD, not fire risk</p>
            <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={ranking} layout="vertical" margin={{ left: 14, right: 8 }}><CartesianGrid stroke="#253044" strokeDasharray="3 3" /><XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={format} /><YAxis type="category" dataKey="region" width={110} stroke="#94a3b8" tick={{ fontSize: 10 }} /><Tooltip contentStyle={tooltipStyle} formatter={v => v == null ? 'No data' : format(Number(v))} /><Bar dataKey="ogcd" name="Observed OGCD" fill="#fb923c" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
            <p className="mt-2 text-xs text-slate-400">Rankings reflect recorded activity, not normalized area, coverage, or independently verified fire severity.</p>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-4 text-sm leading-6 text-slate-300"><Info size={19} className="mt-1 shrink-0 text-sky-400" /><p><strong>Methodology:</strong> Detection points were assigned to administrative polygons represented by the {data.boundaryYear} boundary snapshot, then deduplicated by sensor, region, acquisition date and {data.gridKm} km equal-area cell. Boundaries are not time-varying. Regions sharing a grid cell can each count that cell-day. Unmatched detections are excluded. MODIS and VIIRS raw OGCD are not physically calibrated or directly comparable. Boundary data: geoBoundaries / DataMeet India / Election Commission of India, {data.boundaryLicense}.</p></div>
        <p className="mt-3 text-xs text-slate-500">Displayed month labels use YYYY-MM. Example: {monthLabel(`${year}-01`)}.</p>
      </>}
    </section>
  )
}

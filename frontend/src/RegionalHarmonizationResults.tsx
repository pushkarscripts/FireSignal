import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Info } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Metric = { n?: number; n_months?: number; mae: number; rmse: number; bias?: number }
type Model = 'raw_viirs' | 'national_global' | 'national_seasonal' | 'regional_global' | 'regional_seasonal'
type RegionResult = {
  region: string
  train_paired_months: number
  test_paired_months: number
  sparse_test: boolean
  metrics: Record<Model, Metric>
  selected_improves_on_raw: boolean
  selected_improves_on_national_seasonal: boolean
}
type Results = {
  title: string
  status: string
  selected_model: Model
  validation_metrics: Record<Model, Metric>
  test_metrics: Record<Model, Metric>
  per_region_test: RegionResult[]
  limitations: string[]
}
const MODELS: { key: Model; label: string }[] = [
  { key: 'raw_viirs', label: 'Raw VIIRS' },
  { key: 'national_global', label: 'National global' },
  { key: 'national_seasonal', label: 'National seasonal' },
  { key: 'regional_global', label: 'Regional global' },
  { key: 'regional_seasonal', label: 'Regional seasonal' },
]
const fmt = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 })
function isResults(value: unknown): value is Results {
  if (!value || typeof value !== 'object') return false
  const r = value as Partial<Results>
  return !!r.test_metrics && !!r.validation_metrics && Array.isArray(r.per_region_test) &&
    MODELS.every(m => Number.isFinite(r.test_metrics?.[m.key]?.mae) && Number.isFinite(r.validation_metrics?.[m.key]?.mae)) &&
    r.per_region_test.every(item => typeof item.region === 'string' && Number.isInteger(item.test_paired_months) &&
      MODELS.every(m => Number.isFinite(item.metrics?.[m.key]?.mae)))
}

export default function RegionalHarmonizationResults() {
  const [data, setData] = useState<Results | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'mae' | 'rmse'>('mae')
  const [region, setRegion] = useState('Odisha')
  const [onlyWellSupported, setOnlyWellSupported] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/regional_harmonization_results.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json() })
      .then((json: unknown) => {
        if (!isResults(json)) throw new Error('Unexpected regional evaluation JSON format')
        setData(json)
        if (!json.per_region_test.some(r => r.region === 'Odisha')) setRegion(json.per_region_test[0]?.region ?? '')
      })
      .catch((reason: Error) => { if (reason.name !== 'AbortError') setError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  const rows = useMemo(() => data ? MODELS.map(m => ({
    name: m.label, key: m.key, validation: data.validation_metrics[m.key][metric], test: data.test_metrics[m.key][metric],
  })) : [], [data, metric])
  const regionResult = data?.per_region_test.find(r => r.region === region)
  const displayedRegions = useMemo(() => (data?.per_region_test ?? [])
    .filter(r => !onlyWellSupported || !r.sparse_test)
    .sort((a, b) => b.test_paired_months - a.test_paired_months || a.region.localeCompare(b.region)), [data, onlyWellSupported])
  const supported = data?.per_region_test.filter(r => !r.sparse_test) ?? []
  const improved = supported.filter(r => r.selected_improves_on_national_seasonal).length
  const national = data?.test_metrics.national_seasonal.mae ?? 0
  const regional = data?.test_metrics.regional_seasonal.mae ?? 0
  const reduction = national > 0 ? ((national - regional) / national) * 100 : null
  const tooltipStyle = { background: '#101827', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }

  return (
    <section className="mt-14 border-t border-white/10 pt-10" aria-labelledby="regional-eval-heading">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-orange-500/15 p-3 text-orange-400"><BarChart3 size={24} /></div>
        <div>
          <p className="text-sm font-medium text-orange-400">INDIA · HELD-OUT REGIONAL EVALUATION</p>
          <h2 id="regional-eval-heading" className="mt-1 text-2xl font-semibold sm:text-3xl">Regional Harmonization Evaluation</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Empirical VIIRS-to-MODIS monthly 5 km occupied grid-cell-day agreement. Trained on 2013–2021, selected using 2022–2023, tested on 2024–2025.</p>
        </div>
      </div>
      {loading && <p className="mt-6 text-slate-400">Loading evaluation results…</p>}
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-500/30 p-4 text-red-300">Unable to load regional evaluation: {error}</p>}
      {data && !loading && !error && <>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">Test MAE reduction vs national seasonal</p><p className="mt-2 text-3xl font-semibold text-emerald-300">{reduction === null ? 'N/A' : `${reduction.toFixed(1)}%`}</p><p className="mt-2 text-xs text-slate-400">{fmt(national)} → {fmt(regional)} OGCD per paired region-month</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">Regions with ≥12 paired test months</p><p className="mt-2 text-3xl font-semibold">{supported.length} / {data.per_region_test.length}</p><p className="mt-2 text-xs text-slate-400">Others flagged as sparse</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">Supported regions improved vs national seasonal</p><p className="mt-2 text-3xl font-semibold">{improved} / {supported.length}</p><p className="mt-2 text-xs text-slate-400">Based on held-out regional MAE</p></div>
        </div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Five-method comparison</h3><p className="mt-1 text-sm text-slate-400">Lower error is better; 623 paired region-months in the held-out test</p></div><div className="flex gap-2" role="group" aria-label="Error metric">{(['mae', 'rmse'] as const).map(m => <button key={m} type="button" aria-pressed={metric === m} onClick={() => setMetric(m)} className={`rounded-lg px-3 py-2 text-sm ${metric === m ? 'bg-orange-500 text-slate-950' : 'border border-white/15 text-slate-300 hover:bg-white/10'}`}>{m.toUpperCase()}</button>)}</div></div>
          <div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ left: 8, right: 8, bottom: 30 }}><CartesianGrid stroke="#253044" strokeDasharray="3 3" /><XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={65} stroke="#94a3b8" tick={{ fontSize: 11 }} /><YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={fmt} /><Tooltip contentStyle={tooltipStyle} formatter={v => fmt(Number(v))} /><Bar dataKey="validation" name="Validation 2022–2023" fill="#38bdf8" radius={[4, 4, 0, 0]} /><Bar dataKey="test" name="Test 2024–2025" fill="#fb923c" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
          <p className="mt-2 text-xs text-slate-400">Validation and test periods contain different region-month samples. Error values measure agreement with MODIS, not true fire activity.</p>
        </div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <h3 className="text-lg font-semibold">Explore a region's held-out results</h3>
          <label className="mt-4 block max-w-lg text-sm text-slate-300">Region<select value={region} onChange={e => setRegion(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-600 bg-[#101827] p-3 text-slate-100">{[...data.per_region_test].sort((a,b) => a.region.localeCompare(b.region)).map(r => <option key={r.region} value={r.region}>{r.region}</option>)}</select></label>
          {regionResult && <><p className="mt-4 text-sm text-slate-300">Training pairs: <strong>{regionResult.train_paired_months}</strong> · Test pairs: <strong>{regionResult.test_paired_months}</strong> · {regionResult.sparse_test ? <span className="text-amber-300">Sparse test evidence (fewer than 12 pairs)</span> : <span className="text-emerald-300">At least 12 test pairs</span>}</p>
            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="border-b border-white/15 text-slate-400"><tr><th className="py-3 pr-3">Method</th><th className="py-3 pr-3">MAE</th><th className="py-3">RMSE</th></tr></thead><tbody>{MODELS.map(m => <tr key={m.key} className="border-b border-white/10"><td className="py-3 pr-3">{m.label}{data.selected_model === m.key ? ' · selected' : ''}</td><td className="py-3 pr-3 tabular-nums">{fmt(regionResult.metrics[m.key].mae)}</td><td className="py-3 tabular-nums">{fmt(regionResult.metrics[m.key].rmse)}</td></tr>)}</tbody></table></div>
            <p className="mt-3 text-sm text-slate-400">Regional seasonal adjustment {regionResult.selected_improves_on_national_seasonal ? 'improved' : 'did not improve'} MAE versus national seasonal adjustment in this region's test observations.</p>
          </>}
        </div>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">Region-by-region test evidence</h3><label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={onlyWellSupported} onChange={e => setOnlyWellSupported(e.target.checked)} className="accent-orange-500" /> Show ≥12 paired months only</label></div><div className="mt-4 max-h-96 overflow-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="sticky top-0 bg-[#151b28] text-slate-400"><tr><th className="px-2 py-3">Region</th><th className="px-2 py-3">Pairs</th><th className="px-2 py-3">National seasonal MAE</th><th className="px-2 py-3">Regional seasonal MAE</th><th className="px-2 py-3">Improved?</th></tr></thead><tbody>{displayedRegions.map(r => <tr key={r.region} className="border-t border-white/10"><td className="px-2 py-3">{r.region}{r.sparse_test ? ' · sparse' : ''}</td><td className="px-2 py-3 tabular-nums">{r.test_paired_months}</td><td className="px-2 py-3 tabular-nums">{fmt(r.metrics.national_seasonal.mae)}</td><td className="px-2 py-3 tabular-nums">{fmt(r.metrics.regional_seasonal.mae)}</td><td className={`px-2 py-3 ${r.selected_improves_on_national_seasonal ? 'text-emerald-300' : 'text-amber-300'}`}>{r.selected_improves_on_national_seasonal ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></div>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-4 text-sm leading-6 text-slate-300"><Info size={19} className="mt-1 shrink-0 text-sky-400" /><p><strong>Interpretation:</strong> The regional seasonal model was selected on validation data, not test data. This is an empirical adjustment of monthly sensor activity, not physical calibration or validation against ground-truth fires. Metrics use only paired region-months with matched detections for both sensors; absence of detections does not establish observation coverage. Regional MAEs depend on the size and activity of each region, so they should not be interpreted as comparable fire risk. Sparse regions require particular caution.</p></div>
      </>}
    </section>
  )
}

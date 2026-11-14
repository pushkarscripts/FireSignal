import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Metrics = { n_months: number; mae: number; rmse: number; bias: number }
type ModelKey = 'raw_viirs' | 'global_adjustment' | 'seasonal_adjustment' | 'modis_seasonal_median'
type Month = { month: string; modis: number; viirs: number; selected_prediction: number; global_prediction: number; seasonal_prediction: number; modis_seasonal_median: number }
type Results = {
  title: string; status: string; metric: string; geography: string; grid_km: number
  splits: { train: string; validation: string; test: string }
  method: { global: string; seasonal: string; selection: string; reference: string }
  global_factor: number; seasonal_factors: Record<string, number>
  validation_metrics: Record<ModelKey, Metrics>; test_metrics: Record<ModelKey, Metrics>
  selected_model: string; test_months: Month[]
}
const models: { key: ModelKey; label: string }[] = [
  { key: 'raw_viirs', label: 'Raw VIIRS' },
  { key: 'global_adjustment', label: 'Global scaling' },
  { key: 'seasonal_adjustment', label: 'Seasonal scaling' },
  { key: 'modis_seasonal_median', label: 'MODIS seasonal median' },
]
const format = (n: number, digits = 0) => n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })
export default function HarmonizationResults() {
  const [data, setData] = useState<Results | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<'test' | 'validation'>('test')
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/harmonization_results.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((json: Results) => {
        if (!json.test_metrics?.seasonal_adjustment || !Array.isArray(json.test_months)) throw new Error('Unexpected results format')
        setData(json)
      })
      .catch((e: Error) => setError(e.message))
  }, [])
  const chartData = useMemo(() => data?.test_months.map(m => ({
    month: m.month, 'Observed MODIS': m.modis, 'Seasonal adjustment': m.seasonal_prediction,
    'Global adjustment': m.global_prediction, 'MODIS seasonal median': m.modis_seasonal_median,
  })) ?? [], [data])
  if (error) return <section className="mt-10 rounded-2xl border border-red-500/30 p-6 text-red-300">Harmonization results could not load: {error}</section>
  if (!data) return <p className="mt-10 text-slate-400">Loading cross-sensor evaluation…</p>
  const metrics = view === 'test' ? data.test_metrics : data.validation_metrics
  const global = data.test_metrics.global_adjustment.mae
  const seasonal = data.test_metrics.seasonal_adjustment.mae
  const improvement = global > 0 ? (global - seasonal) / global * 100 : 0
  return (
    <section className="mt-12 space-y-6" aria-labelledby="harmonization-title">
      <div className="flex items-start gap-3">
        <Activity className="mt-1 shrink-0 text-orange-400" size={25}/>
        <div>
          <h2 id="harmonization-title" className="text-2xl font-semibold">Cross-Sensor Harmonization Evaluation</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">India-wide monthly occupied 5 km grid-cell-days (OGCD). VIIRS is statistically adjusted to predict MODIS-scale activity; the evaluation uses chronologically held-out observations.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs text-slate-400">Training</p><p className="mt-2 text-xl font-semibold">{data.splits.train}</p><p className="mt-1 text-xs text-slate-500">Fit adjustment factors</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><p className="text-xs text-slate-400">Validation</p><p className="mt-2 text-xl font-semibold">{data.splits.validation}</p><p className="mt-1 text-xs text-slate-500">Select adjustment approach</p></div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.05] p-5"><p className="text-xs text-orange-300">Held-out test</p><p className="mt-2 text-xl font-semibold">{data.splits.test}</p><p className="mt-1 text-xs text-slate-400">Final retrospective evaluation</p></div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h3 className="text-lg font-semibold">Model error comparison</h3><p className="mt-1 text-sm text-slate-400">Lower MAE and RMSE indicate better agreement with observed MODIS OGCD.</p></div>
          <div className="flex rounded-lg border border-white/10 p-1" role="group" aria-label="Evaluation period">
            {(['test','validation'] as const).map(v => <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-md px-3 py-2 text-sm ${view === v ? 'bg-orange-500 font-semibold text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}>{v === 'test' ? 'Test' : 'Validation'}</button>)}
          </div>
        </div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="border-b border-white/10 text-slate-400"><tr><th className="py-3 pr-3 font-medium">Approach</th><th className="py-3 pr-3 text-right font-medium">MAE</th><th className="py-3 pr-3 text-right font-medium">RMSE</th><th className="py-3 text-right font-medium">Bias</th></tr></thead><tbody>{models.map(({key,label}) => <tr key={key} className={`border-b border-white/5 ${key === data.selected_model ? 'text-orange-300' : 'text-slate-200'}`}><td className="py-3 pr-3">{label}{key === data.selected_model ? ' · selected' : ''}</td><td className="py-3 pr-3 text-right tabular-nums">{format(metrics[key].mae,2)}</td><td className="py-3 pr-3 text-right tabular-nums">{format(metrics[key].rmse,2)}</td><td className="py-3 text-right tabular-nums">{format(metrics[key].bias,2)}</td></tr>)}</tbody></table></div>
        <p className="mt-4 text-sm text-slate-400">{view === 'test' ? 'Test period: 24 months (2024–2025).' : 'Validation period: 24 months (2022–2023).'} Errors are in OGCD per month; bias is signed prediction minus observation.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">Test MAE · global adjustment</p><p className="mt-2 text-3xl font-semibold">{format(global,2)}</p></div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/[0.05] p-5"><p className="text-sm text-orange-300">Test MAE · seasonal adjustment</p><p className="mt-2 text-3xl font-semibold">{format(seasonal,2)}</p></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center gap-2 text-sm text-slate-400"><CheckCircle2 size={16} className="text-emerald-400"/> Reduction vs global</div><p className="mt-2 text-3xl font-semibold text-emerald-300">{format(improvement,1)}%</p></div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-lg font-semibold">Observed vs predicted · held-out test</h3>
        <p className="mt-1 text-sm text-slate-400">2024–2025 monthly MODIS observations compared with predictions from training-fitted adjustment factors.</p>
        <div className="mt-6 h-80 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}><CartesianGrid stroke="#253044" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} minTickGap={25} /><YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} /><Tooltip contentStyle={{ background: '#101827', border: '1px solid #334155', borderRadius: 12 }}
          formatter={(v) =>
            v == null ? '—' : format(Number(v), 2)
          } /><Legend /><Line type="linear" dataKey="Observed MODIS" stroke="#38bdf8" strokeWidth={2.5} dot={false} /><Line type="linear" dataKey="Seasonal adjustment" stroke="#fb923c" strokeWidth={2.5} dot={false} /><Line type="linear" dataKey="Global adjustment" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5 4" dot={false} /></LineChart></ResponsiveContainer></div>
      </div>
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={19}/><div><h3 className="font-semibold text-amber-300">Scientific interpretation</h3><p className="mt-2 text-sm leading-6 text-slate-300">This is an empirical, India-wide, monthly statistical adjustment—not physical cross-sensor calibration, a count of unique fires, or a measure of burned area. Differences in satellite sensitivity, overpass schedules, observation opportunity and archive completeness remain uncorrected. Performance on 24 held-out months does not establish performance at local scales or in future years.</p><p className="mt-2 text-xs text-slate-400">Global model: {data.method.global}. Seasonal model: {data.method.seasonal}. Model selection: {data.method.selection}.</p></div></div></div>
    </section>
  )
}

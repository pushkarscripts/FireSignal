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

const format = (n: number, digits = 0) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })

export default function HarmonizationResults() {
  const [data, setData] = useState<Results | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<'test' | 'validation'>('test')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/harmonization_results.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((json: Results) => {
        if (!json.test_metrics?.seasonal_adjustment || !Array.isArray(json.test_months)) {
          throw new Error('Unexpected results format')
        }
        setData(json)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  const chartData = useMemo(() => data?.test_months.map(m => ({
    month: m.month,
    'Observed MODIS': m.modis,
    'Seasonal adjustment': m.seasonal_prediction,
    'Global adjustment': m.global_prediction,
    'MODIS seasonal median': m.modis_seasonal_median,
  })) ?? [], [data])

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
        Harmonization results could not load: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[#252D34] bg-[#151A1F] p-8 text-center text-sm text-[#9BA8B2]">
        Loading cross-sensor evaluation…
      </div>
    )
  }

  const metrics = view === 'test' ? data.test_metrics : data.validation_metrics
  const global = data.test_metrics.global_adjustment.mae
  const seasonal = data.test_metrics.seasonal_adjustment.mae
  const improvement = global > 0 ? ((global - seasonal) / global) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-[#F0A34A]/30 bg-[#F0A34A]/10 p-2 text-[#F0A34A]">
          <Activity size={22} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#E8EDF0]">National Harmonization Evaluation</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#9BA8B2]">
            India-wide monthly occupied 5 km grid-cell-days (OGCD). VIIRS is statistically adjusted to predict MODIS-scale activity; the evaluation uses chronologically held-out observations.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 transition-colors hover:border-[#38BDF8]/30">
          <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Training Split</p>
          <p className="mt-2 text-xl font-semibold text-[#E8EDF0]">{data.splits.train}</p>
          <p className="mt-1 text-xs text-[#9BA8B2]">Fit adjustment factors</p>
        </div>
        <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 transition-colors hover:border-[#38BDF8]/30">
          <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Validation Split</p>
          <p className="mt-2 text-xl font-semibold text-[#E8EDF0]">{data.splits.validation}</p>
          <p className="mt-1 text-xs text-[#9BA8B2]">Select adjustment approach</p>
        </div>
        <div className="rounded-xl border border-[#F0A34A]/40 bg-gradient-to-b from-[#1A1813] to-[#12100C] p-5 transition-colors hover:border-[#F0A34A]/60 shadow-[0_0_16px_rgba(240,163,74,0.1)]">
          <p className="text-xs font-mono uppercase tracking-wider text-[#F0A34A]">Held-Out Test Split</p>
          <p className="mt-2 text-xl font-semibold text-[#E8EDF0]">{data.splits.test}</p>
          <p className="mt-1 text-xs text-[#9BA8B2]">Final retrospective evaluation</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0E1216] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-[#E8EDF0]">Model Error Comparison</h4>
            <p className="mt-1 text-sm text-[#9BA8B2]">
              Lower MAE and RMSE indicate better agreement with observed MODIS OGCD.
            </p>
          </div>
          <div className="flex rounded-xl border border-[#252D34] bg-[#0B0E11] p-1 shadow-inner" role="group" aria-label="Evaluation period">
            {(['test', 'validation'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                  view === v
                    ? 'bg-[#F0A34A] text-[#0B0E11] font-semibold shadow-[0_0_12px_rgba(240,163,74,0.3)]'
                    : 'text-[#9BA8B2] hover:text-[#E8EDF0]'
                }`}
              >
                {v === 'test' ? 'Test (2024–2025)' : 'Validation (2022–2023)'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="border-b border-[#252D34] text-xs font-mono uppercase text-[#9BA8B2]">
              <tr>
                <th className="py-2.5 pr-3 font-medium">Approach</th>
                <th className="py-2.5 pr-3 text-right font-medium">MAE</th>
                <th className="py-2.5 pr-3 text-right font-medium">RMSE</th>
                <th className="py-2.5 text-right font-medium">Bias</th>
              </tr>
            </thead>
            <tbody>
              {models.map(({ key, label }) => (
                <tr key={key} className={`border-b border-[#252D34]/50 transition-colors hover:bg-[#151A1F]/50 ${key === data.selected_model ? 'text-[#F0A34A]' : 'text-[#E8EDF0]'}`}>
                  <td className="py-2.5 pr-3 font-medium">
                    {label}
                    {key === data.selected_model ? ' · selected' : ''}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-[#9BA8B2]">{format(metrics[key].mae, 2)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-[#9BA8B2]">{format(metrics[key].rmse, 2)}</td>
                  <td className="py-2.5 text-right tabular-nums text-[#9BA8B2]">{format(metrics[key].bias, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[#9BA8B2]">
          {view === 'test' ? 'Test period: 24 months (2024–2025).' : 'Validation period: 24 months (2022–2023).'} Errors are in OGCD per month; bias is signed prediction minus observation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 transition-colors hover:border-[#38BDF8]/30">
          <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Test MAE · Global adjustment</p>
          <p className="mt-2 text-3xl font-semibold text-[#E8EDF0]">{format(global, 2)}</p>
          <p className="mt-1 text-xs text-[#9BA8B2]">Fixed ratio across all calendar months</p>
        </div>
        <div className="rounded-xl border border-[#F0A34A]/40 bg-gradient-to-b from-[#1A1813] to-[#12100C] p-5 transition-colors hover:border-[#F0A34A]/60 shadow-[0_0_16px_rgba(240,163,74,0.1)]">
          <p className="text-xs font-mono uppercase tracking-wider text-[#F0A34A]">Test MAE · Seasonal adjustment</p>
          <p className="mt-2 text-3xl font-semibold text-[#F0A34A]">{format(seasonal, 2)}</p>
          <p className="mt-1 text-xs text-[#9BA8B2]">Month-specific factors regularized to global</p>
        </div>
        <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 transition-colors hover:border-emerald-500/30">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
            <CheckCircle2 size={15} className="text-emerald-400" /> Reduction vs Global
          </div>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">{format(improvement, 1)}%</p>
          <p className="mt-1 text-xs text-[#9BA8B2]">Held-out error reduction</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0E1216] p-5 sm:p-6 shadow-sm">
        <h4 className="text-lg font-semibold text-[#E8EDF0]">Observed vs Predicted · Held-out Test</h4>
        <p className="mt-1 text-sm text-[#9BA8B2]">
          2024–2025 monthly MODIS observations compared with predictions from training-fitted adjustment factors.
        </p>
        <div className="mt-6 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1C2329" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#9BA8B2" tick={{ fontSize: 11 }} minTickGap={25} />
              <YAxis stroke="#9BA8B2" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
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
                formatter={(v) => (v == null ? '—' : format(Number(v), 2))}
              />
              <Legend wrapperStyle={{ color: '#9BA8B2', fontSize: 12 }} />
              <Line type="linear" dataKey="Observed MODIS" stroke="#38BDF8" strokeWidth={2.5} dot={false} />
              <Line type="linear" dataKey="Seasonal adjustment" stroke="#F0A34A" strokeWidth={2.5} dot={false} />
              <Line type="linear" dataKey="Global adjustment" stroke="#A78BFA" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[#F0A34A]/25 bg-[#F0A34A]/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 shrink-0 text-[#F0A34A]" size={19} />
          <div>
            <h4 className="font-semibold text-[#F0A34A]">Scientific interpretation</h4>
            <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
              This is an empirical, India-wide, monthly statistical adjustment—not physical cross-sensor calibration, a count of unique fires, or a measure of burned area. Differences in satellite sensitivity, overpass schedules, observation opportunity and archive completeness remain uncorrected. Performance on 24 held-out months does not establish performance at local scales or in future years.
            </p>
            <p className="mt-2 text-xs text-[#9BA8B2]">
              Global model: {data.method.global}. Seasonal model: {data.method.seasonal}. Model selection: {data.method.selection}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

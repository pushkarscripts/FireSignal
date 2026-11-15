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
  const tooltipStyle = {
    background: 'rgba(11, 14, 17, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid #252D34',
    borderRadius: 12,
    color: '#E8EDF0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    fontSize: 12,
  }
  const tooltipLabelStyle = { color: '#9BA8B2', fontWeight: 600, marginBottom: 4 }
  const tooltipItemStyle = { color: '#E8EDF0' }

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-[#F0A34A]/30 bg-[#F0A34A]/10 p-2 text-[#F0A34A]">
          <BarChart3 size={22} />
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-display tracking-tight text-[#E8EDF0]">Regional Harmonization Evaluation</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#9BA8B2]">
            Empirical VIIRS-to-MODIS monthly 5 km occupied grid-cell-day agreement. Trained on 2013–2021, selected using 2022–2023, tested on 2024–2025.
          </p>
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-[#252D34] bg-[#151A1F] p-8 text-center text-sm text-[#9BA8B2]">
          Loading evaluation results…
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Unable to load regional evaluation: {error}
        </div>
      )}

      {data && !loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 shadow-sm transition-colors hover:border-emerald-500/30">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Test MAE reduction vs national seasonal</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-400">
                {reduction === null ? 'N/A' : `${reduction.toFixed(1)}%`}
              </p>
              <p className="mt-2 text-xs text-[#9BA8B2]">
                {fmt(national)} → {fmt(regional)} OGCD per paired region-month
              </p>
            </div>
            <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 shadow-sm transition-colors hover:border-[#38BDF8]/30">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Regions with ≥12 paired test months</p>
              <p className="mt-2 text-3xl font-semibold text-[#E8EDF0]">
                {supported.length} / {data.per_region_test.length}
              </p>
              <p className="mt-2 text-xs text-[#9BA8B2]">Others flagged as sparse</p>
            </div>
            <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0E1216] p-5 shadow-sm transition-colors hover:border-[#F0A34A]/30">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">Supported regions improved vs national seasonal</p>
              <p className="mt-2 text-3xl font-semibold text-[#E8EDF0]">
                {improved} / {supported.length}
              </p>
              <p className="mt-2 text-xs text-[#9BA8B2]">Based on held-out regional MAE</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0E1216] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-[#E8EDF0]">Five-method comparison</h4>
                <p className="mt-1 text-sm text-[#9BA8B2]">Lower error is better; 623 paired region-months in the held-out test</p>
              </div>
              <div className="flex rounded-xl border border-[#252D34] bg-[#0B0E11] p-1 shadow-inner" role="group" aria-label="Error metric">
                {(['mae', 'rmse'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={metric === m}
                    onClick={() => setMetric(m)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                      metric === m
                        ? 'bg-[#F0A34A] text-[#0B0E11] font-semibold shadow-[0_0_12px_rgba(240,163,74,0.3)]'
                        : 'text-[#9BA8B2] hover:text-[#E8EDF0]'
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ left: 8, right: 8, bottom: 30, top: 10 }}>
                  <CartesianGrid stroke="#1C2329" strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={65} stroke="#9BA8B2" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9BA8B2" tick={{ fontSize: 11 }} tickFormatter={fmt} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={v => fmt(Number(v))} />
                  <Bar dataKey="validation" name="Validation 2022–2023" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="test" name="Test 2024–2025" fill="#F0A34A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-[#9BA8B2]">
              Validation and test periods contain different region-month samples. Error values measure agreement with MODIS, not true fire activity.
            </p>
          </div>

          <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0E1216] p-5 sm:p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-[#E8EDF0]">Explore a region's held-out results</h4>
            <label className="mt-3 block max-w-lg text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
              Region
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="mt-2 block w-full rounded-lg border border-[#252D34] bg-[#0B0E11] p-2.5 text-sm font-sans normal-case text-[#E8EDF0] focus:border-[#F0A34A] focus:outline-none transition-colors hover:border-[#38BDF8]/40 cursor-pointer"
              >
                {[...data.per_region_test]
                  .sort((a, b) => a.region.localeCompare(b.region))
                  .map(r => (
                    <option key={r.region} value={r.region}>
                      {r.region}
                    </option>
                  ))}
              </select>
            </label>

            {regionResult && (
              <>
                <p className="mt-4 text-sm text-[#9BA8B2]">
                  Training pairs: <strong className="text-[#E8EDF0]">{regionResult.train_paired_months}</strong> · Test pairs: <strong className="text-[#E8EDF0]">{regionResult.test_paired_months}</strong> ·{' '}
                  {regionResult.sparse_test ? (
                    <span className="text-[#F0A34A]">Sparse test evidence (fewer than 12 pairs)</span>
                  ) : (
                    <span className="text-emerald-400">At least 12 test pairs</span>
                  )}
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="border-b border-[#252D34] text-xs font-mono uppercase text-[#9BA8B2]">
                      <tr>
                        <th className="py-2.5 pr-3">Method</th>
                        <th className="py-2.5 pr-3">MAE</th>
                        <th className="py-2.5">RMSE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODELS.map(m => (
                        <tr key={m.key} className="border-b border-[#252D34]/50 transition-colors hover:bg-[#151A1F]/50">
                          <td className="py-2.5 pr-3 text-[#E8EDF0]">
                            {m.label}
                            {data.selected_model === m.key ? ' · selected' : ''}
                          </td>
                          <td className="py-2.5 pr-3 tabular-nums text-[#9BA8B2]">{fmt(regionResult.metrics[m.key].mae)}</td>
                          <td className="py-2.5 tabular-nums text-[#9BA8B2]">{fmt(regionResult.metrics[m.key].rmse)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-[#9BA8B2]">
                  Regional seasonal adjustment {regionResult.selected_improves_on_national_seasonal ? 'improved' : 'did not improve'} MAE versus national seasonal adjustment in this region's test observations.
                </p>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0E1216] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-[#E8EDF0]">Region-by-region test evidence</h4>
              <label className="flex items-center gap-2 text-sm text-[#9BA8B2] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyWellSupported}
                  onChange={e => setOnlyWellSupported(e.target.checked)}
                  className="rounded border-[#252D34] accent-[#F0A34A]"
                />
                Show ≥12 paired months only
              </label>
            </div>
            <div className="mt-4 max-h-96 overflow-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="sticky top-0 bg-[#161C22] text-xs font-mono uppercase text-[#9BA8B2]">
                  <tr>
                    <th className="px-3 py-2.5">Region</th>
                    <th className="px-3 py-2.5">Pairs</th>
                    <th className="px-3 py-2.5">National Seasonal MAE</th>
                    <th className="px-3 py-2.5">Regional Seasonal MAE</th>
                    <th className="px-3 py-2.5">Improved?</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRegions.map(r => (
                    <tr key={r.region} className="border-t border-[#252D34] transition-colors hover:bg-[#151A1F]/50">
                      <td className="px-3 py-2.5 text-[#E8EDF0]">
                        {r.region}
                        {r.sparse_test ? ' · sparse' : ''}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-[#9BA8B2]">{r.test_paired_months}</td>
                      <td className="px-3 py-2.5 tabular-nums text-[#9BA8B2]">{fmt(r.metrics.national_seasonal.mae)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-[#9BA8B2]">{fmt(r.metrics.regional_seasonal.mae)}</td>
                      <td className={`px-3 py-2.5 font-medium ${r.selected_improves_on_national_seasonal ? 'text-emerald-400' : 'text-[#F0A34A]'}`}>
                        {r.selected_improves_on_national_seasonal ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-[#38BDF8]/25 bg-[#38BDF8]/5 p-4 text-xs leading-6 text-[#9BA8B2]">
            <Info size={18} className="mt-1 shrink-0 text-[#38BDF8]" />
            <p>
              <strong className="text-[#E8EDF0]">Interpretation & Limitations:</strong> The regional seasonal model was selected on validation data, not test data. This is an empirical adjustment of monthly sensor activity, not physical calibration or validation against ground-truth fires. Metrics use only paired region-months with matched detections for both sensors; absence of detections does not establish observation coverage. Regional MAEs depend on the size and activity of each region, so they should not be interpreted as comparable fire risk. Sparse regions require particular caution.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

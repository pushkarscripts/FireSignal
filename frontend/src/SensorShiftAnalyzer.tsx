import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Layers3, Moon, Sun } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type GridResult = {
  grid_km: number
  modis_ogcd: number
  viirs_ogcd: number
  ratio: number
}

type PeriodResult = {
  period: string
  modis_ogcd: number
  viirs_ogcd: number
  pearson: number
  spearman: number
}

type AnalyzerData = {
  region: string
  period: string
  raw_ratio: number
  grid_comparison: GridResult[]
  daily_agreement: {
    pearson: number
    spearman: number
    median_ratio: number
  }
  daily_change_agreement: {
    pearson: number
    spearman: number
    direction_agreement_pct: number
  }
  daynight: PeriodResult[]
  calibration_status: string
}

const number = (value: number) => value.toLocaleString('en-IN')

export default function SensorShiftAnalyzer() {
  const [data, setData] = useState<AnalyzerData | null>(null)
  const [selectedGrid, setSelectedGrid] = useState(5)
  const [selectedPeriod, setSelectedPeriod] = useState('Daytime')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sensor_analyzer.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.json()
      })
      .then((json: AnalyzerData) => setData(json))
      .catch((err: Error) => setError(err.message))
  }, [])

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
        Sensor Shift Analyzer error: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[#252D34] bg-[#151A1F] p-8 text-center text-sm text-[#9BA8B2]">
        Loading Sensor Shift Analyzer...
      </div>
    )
  }

  const grid = data.grid_comparison.find((item) => item.grid_km === selectedGrid)
  const period = data.daynight.find((item) => item.period === selectedPeriod)
  const periodRatio = period && period.modis_ogcd > 0 ? period.viirs_ogcd / period.modis_ogcd : null

  const agreementBars = [
    {
      metric: 'Daily levels',
      Pearson: data.daily_agreement.pearson,
      Spearman: data.daily_agreement.spearman,
    },
    {
      metric: 'Daily changes',
      Pearson: data.daily_change_agreement.pearson,
      Spearman: data.daily_change_agreement.spearman,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-[#F0A34A]/30 bg-[#F0A34A]/10 p-2 text-[#F0A34A]">
          <Layers3 size={22} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#E8EDF0]">Sensor Shift Analyzer</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#9BA8B2]">
            Explore how spatial aggregation, observation conditions, and temporal comparisons change the apparent differences between MODIS and VIIRS.
          </p>
        </div>
      </div>

      {/* GRID COMPARISON */}
      <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0E1216] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-[#E8EDF0]">Spatial Harmonization</h4>
            <p className="mt-1 text-sm text-[#9BA8B2]">
              Occupied grid-cell-days at different equal-area grid resolutions.
            </p>
          </div>

          <div className="flex rounded-xl border border-[#252D34] bg-[#0B0E11] p-1 shadow-inner">
            {[1, 5, 10].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedGrid(size)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                  selectedGrid === size
                    ? 'bg-[#F0A34A] text-[#0B0E11] font-semibold shadow-[0_0_12px_rgba(240,163,74,0.3)]'
                    : 'text-[#9BA8B2] hover:text-[#E8EDF0]'
                }`}
              >
                {size} km
              </button>
            ))}
          </div>
        </div>

        {grid && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Metric label="MODIS OGCD" value={number(grid.modis_ogcd)} />
              <Metric label="VIIRS OGCD" value={number(grid.viirs_ogcd)} />
              <Metric label="VIIRS / MODIS" value={`${grid.ratio.toFixed(2)}×`} highlight />
            </div>

            <div className="mt-5 rounded-xl border border-[#252D34] bg-[#0B0E11]/80 p-4">
              <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                Raw Detection Ratio
              </p>
              <p className="mt-1 text-xl font-semibold text-[#E8EDF0]">
                {data.raw_ratio.toFixed(2)}×
              </p>
              <p className="mt-2 text-xs leading-5 text-[#9BA8B2]">
                Common-grid aggregation changes the observed ratio, but does not establish calibration or equivalent sensor sensitivity.
              </p>
            </div>
          </>
        )}
      </div>

      {/* DAY / NIGHT */}
      <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0E1216] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-[#E8EDF0]">Day vs Night Observations</h4>
            <p className="mt-1 text-sm text-[#9BA8B2]">
              Compare 5 km occupied grid-cell-days by satellite day/night classification.
            </p>
          </div>

          <div className="flex gap-2">
            {[
              { label: 'Daytime', icon: Sun },
              { label: 'Nighttime', icon: Moon },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedPeriod(label)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                  selectedPeriod === label
                    ? 'bg-[#F0A34A] text-[#0B0E11] font-semibold shadow-[0_0_12px_rgba(240,163,74,0.3)]'
                    : 'border border-[#252D34] bg-[#0B0E11] text-[#9BA8B2] hover:text-[#E8EDF0]'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {period && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Metric label="MODIS OGCD" value={number(period.modis_ogcd)} />
            <Metric label="VIIRS OGCD" value={number(period.viirs_ogcd)} />
            <Metric
              label="VIIRS / MODIS"
              value={periodRatio === null ? 'Undefined' : `${periodRatio.toFixed(2)}×`}
              highlight
            />
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-[#9BA8B2]">
          Day and night totals can overlap in the same grid-cell-day, so they should not be added to reproduce the overall OGCD total.
        </p>
      </div>

      {/* CORRELATION */}
      <div className="rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#101418] to-[#0E1216] p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-[#F0A34A]" />
          <h4 className="text-lg font-semibold text-[#E8EDF0]">Cross-Sensor Agreement</h4>
        </div>

        <p className="mt-1 text-sm text-[#9BA8B2]">
          Agreement in daily activity levels compared with agreement in day-to-day changes.
        </p>

        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agreementBars} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid stroke="#1C2329" strokeDasharray="3 3" />
              <XAxis dataKey="metric" stroke="#9BA8B2" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 1]} stroke="#9BA8B2" tick={{ fontSize: 11 }} />
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
              />
              <Legend wrapperStyle={{ color: '#9BA8B2', fontSize: 12 }} />
              <Bar dataKey="Pearson" fill="#F0A34A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spearman" fill="#38BDF8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-3 text-xs text-[#9BA8B2]">
          Direction of day-to-day changes agreed on{' '}
          <strong className="text-[#E8EDF0]">
            {data.daily_change_agreement.direction_agreement_pct.toFixed(2)}%
          </strong>{' '}
          of comparable days.
        </p>
      </div>

      {/* SCIENTIFIC WARNING */}
      <div className="rounded-2xl border border-[#F0A34A]/25 bg-[#F0A34A]/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#F0A34A]" />
          <div>
            <h4 className="font-semibold text-[#F0A34A]">Scientific interpretation</h4>
            <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
              These comparisons use NASA FIRMS hotspot detections for India, March–May 2023. Spatial aggregation reduces repeated observations within grid-cell-days, but does not correct differences in sensor sensitivity, overpass schedules, confidence thresholds, or observation completeness.
            </p>
            <p className="mt-2 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
              Calibration Status:{' '}
              <strong className="text-[#F0A34A]">
                {data.calibration_status === 'not_validated' ? 'Not validated' : data.calibration_status}
              </strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      highlight
        ? 'border-[#F0A34A]/40 bg-[#0B0E11]/90 hover:border-[#F0A34A]/60 shadow-[0_0_12px_rgba(240,163,74,0.08)]'
        : 'border-[#252D34]/90 bg-[#0B0E11]/80 hover:border-[#38BDF8]/30'
    }`}>
      <p className="text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${highlight ? 'text-[#F0A34A]' : 'text-[#E8EDF0]'}`}>
        {value}
      </p>
    </div>
  )
}

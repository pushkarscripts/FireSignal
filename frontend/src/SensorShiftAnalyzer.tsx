
import { useEffect, useState } from 'react'
import {
  Activity, AlertTriangle, Layers3, Moon, Sun
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

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

const number = (value: number) =>
  value.toLocaleString('en-IN')

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
      <div className="rounded-xl border border-red-500/30 p-5 text-red-300">
        Sensor Shift Analyzer error: {error}
      </div>
    )
  }

  if (!data) {
    return (
      <p className="py-8 text-slate-400">
        Loading Sensor Shift Analyzer...
      </p>
    )
  }

  const grid = data.grid_comparison.find(
    (item) => item.grid_km === selectedGrid
  )

  const period = data.daynight.find(
    (item) => item.period === selectedPeriod
  )

  const periodRatio = period && period.modis_ogcd > 0
    ? period.viirs_ogcd / period.modis_ogcd
    : null

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
    <section className="mt-8 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Layers3 className="text-orange-400" size={25} />
          <h2 className="text-2xl font-semibold">
            Sensor Shift Analyzer
          </h2>
        </div>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Explore how spatial aggregation, observation
          conditions, and temporal comparisons change the
          apparent differences between MODIS and VIIRS.
        </p>
      </div>

      {/* GRID COMPARISON */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">
              Spatial Harmonization
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Occupied grid-cell-days at different
              equal-area grid resolutions.
            </p>
          </div>

          <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
            {[1, 5, 10].map((size) => (
              <button
                key={size}
                onClick={() => setSelectedGrid(size)}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  selectedGrid === size
                    ? 'bg-orange-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
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
              <Metric
                label="MODIS OGCD"
                value={number(grid.modis_ogcd)}
              />
              <Metric
                label="VIIRS OGCD"
                value={number(grid.viirs_ogcd)}
              />
              <Metric
                label="VIIRS / MODIS"
                value={`${grid.ratio.toFixed(2)}×`}
                highlight
              />
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Raw detection ratio
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-200">
                {data.raw_ratio.toFixed(2)}×
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Common-grid aggregation changes the
                observed ratio, but does not establish
                calibration or equivalent sensor sensitivity.
              </p>
            </div>
          </>
        )}
      </div>

      {/* DAY / NIGHT */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">
              Day vs Night Observations
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Compare 5 km occupied grid-cell-days by
              satellite day/night classification.
            </p>
          </div>

          <div className="flex gap-2">
            {[
              { label: 'Daytime', icon: Sun },
              { label: 'Nighttime', icon: Moon },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setSelectedPeriod(label)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  selectedPeriod === label
                    ? 'bg-orange-500 text-slate-950 font-semibold'
                    : 'border border-white/10 text-slate-400'
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
            <Metric
              label="MODIS OGCD"
              value={number(period.modis_ogcd)}
            />
            <Metric
              label="VIIRS OGCD"
              value={number(period.viirs_ogcd)}
            />
            <Metric
              label="VIIRS / MODIS"
              value={
                periodRatio === null
                  ? 'Undefined'
                  : `${periodRatio.toFixed(2)}×`
              }
              highlight
            />
          </div>
        )}

        <p className="mt-5 text-sm leading-6 text-slate-400">
          Day and night totals can overlap in the same
          grid-cell-day, so they should not be added to
          reproduce the overall OGCD total.
        </p>
      </div>

      {/* CORRELATION */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-orange-400" />
          <h3 className="text-lg font-semibold">
            Cross-Sensor Agreement
          </h3>
        </div>

        <p className="mt-2 text-sm text-slate-400">
          Agreement in daily activity levels compared with
          agreement in day-to-day changes.
        </p>

        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agreementBars}>
              <CartesianGrid
                stroke="#253044"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="metric"
                stroke="#94a3b8"
              />
              <YAxis
                domain={[0, 1]}
                stroke="#94a3b8"
              />
              <Tooltip
                contentStyle={{
                  background: '#101827',
                  border: '1px solid #334155',
                  borderRadius: 12,
                }}
              />
              <Legend />
              <Bar
                dataKey="Pearson"
                fill="#fb923c"
                radius={[5, 5, 0, 0]}
              />
              <Bar
                dataKey="Spearman"
                fill="#38bdf8"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-3 text-sm text-slate-400">
          Direction of day-to-day changes agreed on{' '}
          <strong className="text-white">
            {data.daily_change_agreement.direction_agreement_pct.toFixed(2)}%
          </strong>{' '}
          of comparable days.
        </p>
      </div>

      {/* SCIENTIFIC WARNING */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0 text-amber-400"
          />

          <div>
            <h3 className="font-semibold text-amber-300">
              Scientific interpretation
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              These comparisons use NASA FIRMS hotspot
              detections for India, March–May 2023.
              Spatial aggregation reduces repeated
              observations within grid-cell-days, but does
              not correct differences in sensor sensitivity,
              overpass schedules, confidence thresholds,
              or observation completeness.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Calibration status:{' '}
              <strong className="text-amber-300">
                {data.calibration_status === 'not_validated'
                  ? 'Not validated'
                  : data.calibration_status}
              </strong>
            </p>
          </div>
        </div>
      </div>
    </section>
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
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          highlight ? 'text-orange-400' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

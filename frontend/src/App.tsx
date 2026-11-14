import HarmonizationResults from './HarmonizationResults'
import HistoricalCalendar from './HistoricalCalendar'
import SensorShiftAnalyzer from './SensorShiftAnalyzer'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Flame, Satellite, ShieldCheck
} from 'lucide-react'
import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

type DailyRecord = {
  date: string
  modis: number
  viirs: number
}

function App() {
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/daily_comparison.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.json()
      })
      .then((data: DailyRecord[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Daily data is empty or invalid')
        }
        setRecords(data)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const totals = useMemo(() => {
    const modis = records.reduce(
      (sum, row) => sum + row.modis, 0
    )
    const viirs = records.reduce(
      (sum, row) => sum + row.viirs, 0
    )

    return {
      modis,
      viirs,
      ratio: modis > 0 ? viirs / modis : 0,
    }
  }, [records])

  const metrics = [
    {
      label: 'MODIS 5 km OGCD',
      value: totals.modis.toLocaleString(),
      icon: Satellite,
    },
    {
      label: 'VIIRS 5 km OGCD',
      value: totals.viirs.toLocaleString(),
      icon: Flame,
    },
    {
      label: 'VIIRS / MODIS ratio',
      value: `${totals.ratio.toFixed(2)}×`,
      icon: Activity,
    },
    {
      label: 'Days analyzed',
      value: String(records.length),
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="min-h-screen bg-[#080d18] text-slate-100">
      <header className="border-b border-white/10 px-6 py-5">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="rounded-xl bg-orange-500/15 p-3 text-orange-400">
            <Flame size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">FireSignal</h1>
            <p className="text-sm text-slate-400">
              NASA MODIS + VIIRS Fire Intelligence
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <HistoricalCalendar />

        <div className="mt-14 border-t border-white/10 pt-10">
        <p className="mb-2 text-sm font-medium text-orange-400">
          INDIA · MARCH–MAY 2023
        </p>
        <h2 className="text-3xl font-semibold">
          Satellite Fire Activity Overview
        </h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          Common-grid satellite hotspot activity from
          NASA FIRMS archive observations.
        </p>

        {loading && (
          <p className="mt-8 text-slate-400">
            Loading satellite observations...
          </p>
        )}

        {error && (
          <div className="mt-8 rounded-xl border border-red-500/30 p-5 text-red-300">
            Failed to load data: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon
                return (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
                  >
                    <Icon className="mb-5 text-orange-400" size={24} />
                    <p className="text-sm text-slate-400">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold">
                      {metric.value}
                    </p>
                  </div>
                )
              })}
            </div>

            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h3 className="text-lg font-semibold">
                Daily Satellite Activity
              </h3>
              <p className="mb-6 mt-2 text-sm text-slate-400">
                Number of occupied 5 km grid cells per day.
                Each sensor is counted independently.
              </p>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={records}>
                    <CartesianGrid stroke="#253044" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      minTickGap={35}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#101827',
                        border: '1px solid #334155',
                        borderRadius: 12,
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="modis"
                      name="MODIS"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="viirs"
                      name="VIIRS"
                      stroke="#fb923c"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <SensorShiftAnalyzer />
            <HarmonizationResults />
            
          </>
        )}
        </div>
      </main>
    </div>
  )
}

export default App

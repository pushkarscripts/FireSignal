import HarmonizationResults from './HarmonizationResults'
import HistoricalCalendar from './HistoricalCalendar'
import RegionalHarmonizationResults from './RegionalHarmonizationResults'
import RegionalFireIntelligence from './RegionalFireIntelligence'
import SensorShiftAnalyzer from './SensorShiftAnalyzer'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDown, ExternalLink, Flame,
  Menu, Satellite, ShieldCheck, X
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  // Close mobile navigation on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen])

  const totals = useMemo(() => {
    const modis = records.reduce((sum, row) => sum + row.modis, 0)
    const viirs = records.reduce((sum, row) => sum + row.viirs, 0)

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
      sublabel: 'Occupied grid-cell-days',
      icon: Satellite,
    },
    {
      label: 'VIIRS 5 km OGCD',
      value: totals.viirs.toLocaleString(),
      sublabel: 'Occupied grid-cell-days',
      icon: Flame,
    },
    {
      label: 'VIIRS / MODIS Ratio',
      value: `${totals.ratio.toFixed(2)}×`,
      sublabel: 'Detection ratio at 5 km',
      icon: Activity,
    },
    {
      label: 'Days Analyzed',
      value: String(records.length),
      sublabel: 'Mar 1 – May 31, 2023',
      icon: ShieldCheck,
    },
  ]

  const navLinks = [
    { href: '#observatory', label: 'Observatory' },
    { href: '#historical-patterns', label: 'Historical Patterns' },
    { href: '#sensor-laboratory', label: 'Sensor Laboratory' },
    { href: '#research-methods', label: 'Research & Methods' },
  ]

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#E8EDF0]">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[#F0A34A] focus:px-4 focus:py-2.5 focus:font-semibold focus:text-[#0B0E11] focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Polish Dark Observatory Header */}
      <header className="sticky top-0 z-40 border-b border-[#252D34] bg-[#0B0E11]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4">
          <a
            href="#observatory"
            className="group flex items-center gap-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0E11] rounded-lg p-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#F0A34A]/30 bg-[#F0A34A]/10 text-[#F0A34A] transition group-hover:border-[#F0A34A]/60">
              <Flame size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-[#E8EDF0]">FireSignal</span>
                <span className="rounded bg-[#252D34] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#9BA8B2]">2.0</span>
              </div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#9BA8B2]">
                Earth Observation / India
              </p>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav aria-label="Main Navigation" className="hidden md:flex md:items-center md:gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-[#9BA8B2] transition hover:bg-[#151A1F] hover:text-[#E8EDF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="rounded-lg border border-[#252D34] bg-[#151A1F] p-2 text-[#9BA8B2] transition hover:text-[#E8EDF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Compact Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav
            id="mobile-nav"
            aria-label="Mobile Navigation"
            className="border-t border-[#252D34] bg-[#151A1F] px-4 py-3 md:hidden"
          >
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-3.5 py-2.5 text-sm font-medium text-[#9BA8B2] transition hover:bg-[#0B0E11] hover:text-[#E8EDF0]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {/* Main Content Landmark */}
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* ========================================================================= */}
        {/* STEP 3 & 4: SECTION 1 — OBSERVATORY (HERO + BASELINE EXPERIMENT OVERVIEW) */}
        {/* ========================================================================= */}
        <section id="observatory" aria-labelledby="observatory-heading" className="space-y-12">
          {/* Introductory Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-[#252D34] bg-[#151A1F] p-6 sm:p-10 lg:p-14">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-md border border-[#F0A34A]/30 bg-[#F0A34A]/10 px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
                  FIRESIGNAL / EARTH OBSERVATION
                </div>
                <h1
                  id="observatory-heading"
                  className="mt-4 text-3xl font-semibold tracking-tight text-[#E8EDF0] sm:text-4xl lg:text-5xl lg:leading-[1.15]"
                >
                  Fire activity, through two different lenses.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#9BA8B2] sm:text-lg">
                  Explore historical NASA hotspot observations across India and understand how MODIS and VIIRS reveal different patterns of detected fire activity.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a
                    href="#historical-patterns"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#F0A34A] px-5 py-3 text-sm font-semibold text-[#0B0E11] transition hover:bg-[#F5B56E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151A1F]"
                  >
                    <span>Explore Historical Patterns</span>
                    <ArrowDown size={16} />
                  </a>
                  <a
                    href="#sensor-laboratory"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#252D34] bg-[#0B0E11] px-5 py-3 text-sm font-medium text-[#E8EDF0] transition hover:border-[#F0A34A]/50 hover:text-[#F0A34A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
                  >
                    <span>Sensor Laboratory</span>
                  </a>
                </div>
              </div>

              {/* Decorative Abstract Cartographic SVG Motif */}
              <div className="hidden lg:col-span-5 lg:flex lg:justify-center" aria-hidden="true">
                <div className="relative h-72 w-72 sm:h-80 sm:w-80">
                  <svg
                    viewBox="0 0 320 320"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-full w-full select-none"
                  >
                    {/* Concentric radar / observation range rings */}
                    <circle cx="160" cy="160" r="145" stroke="#252D34" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="160" cy="160" r="110" stroke="#252D34" strokeWidth="1" />
                    <circle cx="160" cy="160" r="75" stroke="#252D34" strokeWidth="1" strokeDasharray="2 2" />
                    <circle cx="160" cy="160" r="40" stroke="#252D34" strokeWidth="1" />

                    {/* Coordinate graticule / axes */}
                    <line x1="160" y1="10" x2="160" y2="310" stroke="#252D34" strokeWidth="1" />
                    <line x1="10" y1="160" x2="310" y2="160" stroke="#252D34" strokeWidth="1" />

                    {/* Sun-synchronous satellite orbit tracks (stylized vector arcs) */}
                    <path
                      d="M 60 20 Q 140 160 260 300"
                      stroke="#F0A34A"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.8"
                    />
                    <path
                      d="M 100 10 Q 170 150 280 270"
                      stroke="#38BDF8"
                      strokeWidth="1.5"
                      strokeDasharray="5 3"
                      opacity="0.6"
                    />

                    {/* Reticle ticks */}
                    <line x1="155" y1="50" x2="165" y2="50" stroke="#F0A34A" strokeWidth="1" />
                    <line x1="155" y1="270" x2="165" y2="270" stroke="#F0A34A" strokeWidth="1" />
                    <line x1="50" y1="155" x2="50" y2="165" stroke="#F0A34A" strokeWidth="1" />
                    <line x1="270" y1="155" x2="270" y2="165" stroke="#F0A34A" strokeWidth="1" />

                    {/* Center sensor crosshair */}
                    <circle cx="160" cy="160" r="3" fill="#F0A34A" />
                    <circle cx="160" cy="160" r="8" stroke="#F0A34A" strokeWidth="1" opacity="0.6" />

                    {/* Subtle graticule labels */}
                    <text x="165" y="32" fill="#9BA8B2" fontSize="9" fontFamily="monospace">30°N</text>
                    <text x="165" y="105" fill="#9BA8B2" fontSize="9" fontFamily="monospace">20°N</text>
                    <text x="165" y="240" fill="#9BA8B2" fontSize="9" fontFamily="monospace">10°N</text>
                    <text x="275" y="155" fill="#9BA8B2" fontSize="9" fontFamily="monospace">90°E</text>
                    <text x="25" y="155" fill="#9BA8B2" fontSize="9" fontFamily="monospace">70°E</text>

                    {/* Satellite pass indicators */}
                    <text x="210" y="295" fill="#F0A34A" fontSize="8" fontFamily="monospace">VIIRS ~13:30</text>
                    <text x="75" y="25" fill="#38BDF8" fontSize="8" fontFamily="monospace">MODIS ~10:30</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* SATELLITE FIRE ACTIVITY OVERVIEW (March–May 2023 Baseline) */}
          <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-[#F0A34A]/30 bg-[#F0A34A]/10 px-2.5 py-0.5 font-mono text-xs tracking-wider text-[#F0A34A]">
                  INDIA · MARCH–MAY 2023 BASELINE
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-[#E8EDF0] sm:text-3xl">
                  Satellite Fire Activity Overview
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#9BA8B2]">
                  Initial 92-day comparative baseline from NASA FIRMS archive observations across India, demonstrating daily sensor divergence at a common 5 km equal-area grid resolution.
                </p>
              </div>
            </div>

            {loading && (
              <div className="mt-8 rounded-xl border border-[#252D34] bg-[#0B0E11] p-8 text-center text-sm text-[#9BA8B2]">
                Loading satellite observations...
              </div>
            )}

            {error && (
              <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
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
                        className="rounded-xl border border-[#252D34] bg-[#0B0E11] p-5 transition hover:border-[#F0A34A]/40"
                      >
                        <div className="flex items-center justify-between">
                          <Icon className="text-[#F0A34A]" size={22} />
                          <span className="font-mono text-[10px] uppercase text-[#9BA8B2]">{metric.sublabel}</span>
                        </div>
                        <p className="mt-4 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                          {metric.label}
                        </p>
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-[#E8EDF0]">
                          {metric.value}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-8 rounded-xl border border-[#252D34] bg-[#0B0E11] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-[#E8EDF0]">
                        Daily Satellite Activity Trends
                      </h3>
                      <p className="mt-1 text-sm text-[#9BA8B2]">
                        Number of occupied 5 km grid cells per day. Each sensor is counted independently.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={records} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid stroke="#252D34" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          stroke="#9BA8B2"
                          tick={{ fontSize: 11 }}
                          minTickGap={35}
                        />
                        <YAxis
                          stroke="#9BA8B2"
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#151A1F',
                            border: '1px solid #252D34',
                            borderRadius: 8,
                            color: '#E8EDF0',
                          }}
                        />
                        <Legend wrapperStyle={{ color: '#9BA8B2', fontSize: 12 }} />
                        <Line
                          type="monotone"
                          dataKey="modis"
                          name="MODIS (Terra + Aqua)"
                          stroke="#38BDF8"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="viirs"
                          name="VIIRS (Suomi-NPP)"
                          stroke="#F0A34A"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* STEP 4: SECTION 2 — HISTORICAL PATTERNS (2003–2025 MULTI-YEAR ARCHIVES)   */}
        {/* ========================================================================= */}
        <section
          id="historical-patterns"
          aria-labelledby="historical-heading"
          className="mt-20 border-t border-[#252D34] pt-14"
        >
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#F0A34A]/30 bg-[#F0A34A]/10 px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
              MULTI-DECADE ARCHIVES · 2003–2025
            </div>
            <h2 id="historical-heading" className="mt-3 text-3xl font-semibold tracking-tight text-[#E8EDF0] sm:text-4xl">
              Historical Patterns
            </h2>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-[#9BA8B2]">
              Two decades of NASA FIRMS active fire detections mapped to standard 5 km equal-area grids across India, exploring long-term seasonal burning cycles and sub-national administrative patterns.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono text-[#9BA8B2]">
              <span className="rounded border border-[#252D34] bg-[#151A1F] px-2.5 py-1">MODIS: 2003–2025 (23 Years)</span>
              <span className="rounded border border-[#252D34] bg-[#151A1F] px-2.5 py-1">VIIRS: 2013–2025 (13 Years)</span>
              <span className="rounded border border-[#252D34] bg-[#151A1F] px-2.5 py-1">Metric: Occupied Grid-Cell-Days (5 km OGCD)</span>
            </div>
          </div>

          <HistoricalCalendar />
          <RegionalFireIntelligence />
        </section>

        {/* ========================================================================= */}
        {/* STEP 4: SECTION 3 — SENSOR LABORATORY                                     */}
        {/* Visually distinguishing March–May 2023 from 2013–2025 harmonization        */}
        {/* ========================================================================= */}
        <section
          id="sensor-laboratory"
          aria-labelledby="sensor-lab-heading"
          className="mt-20 border-t border-[#252D34] pt-14"
        >
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#F0A34A]/30 bg-[#F0A34A]/10 px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
              CROSS-SENSOR DIAGNOSTICS & HARMONIZATION
            </div>
            <h2 id="sensor-lab-heading" className="mt-3 text-3xl font-semibold tracking-tight text-[#E8EDF0] sm:text-4xl">
              Sensor Laboratory
            </h2>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-[#9BA8B2]">
              Investigate the physical and observational differences between MODIS and VIIRS through controlled spatial aggregation experiments, day/night pass breakdowns, and chronological statistical harmonization.
            </p>
          </div>

          {/* SUBSECTION A: MARCH–MAY 2023 EXPERIMENT */}
          <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 sm:p-8">
            <div className="mb-6 border-b border-[#252D34] pb-5">
              <span className="rounded border border-[#F0A34A]/40 bg-[#F0A34A]/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#F0A34A]">
                DATASET A: CONTROLLED EXPERIMENT · MARCH–MAY 2023 (92 DAYS)
              </span>
              <h3 className="mt-3 text-2xl font-semibold text-[#E8EDF0]">
                Spatial Aggregation & Temporal Concordance
              </h3>
              <p className="mt-1 text-sm text-[#9BA8B2]">
                Focused diagnostic suite examining the effect of spatial resolution (1 km, 5 km, 10 km) on the apparent VIIRS/MODIS ratio, daytime versus nighttime observation differences, and day-to-day directional change agreement.
              </p>
            </div>
            <SensorShiftAnalyzer />
          </div>

          {/* SUBSECTION B: 2013–2025 RETROSPECTIVE HARMONIZATION */}
          <div className="mt-12 rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 sm:p-8">
            <div className="mb-6 border-b border-[#252D34] pb-5">
              <span className="rounded border border-sky-400/40 bg-sky-400/10 px-2.5 py-1 font-mono text-xs font-semibold text-sky-400">
                DATASET B: RETROSPECTIVE HARMONIZATION · 2013–2025 (156 MONTHS)
              </span>
              <h3 className="mt-3 text-2xl font-semibold text-[#E8EDF0]">
                Chronologically Held-Out Cross-Sensor Harmonization
              </h3>
              <p className="mt-1 text-sm text-[#9BA8B2]">
                Multi-year statistical scaling models trained on 2013–2021, validated on 2022–2023, and evaluated on the chronologically held-out 2024–2025 test window. Adjusts VIIRS activity to predict MODIS-scale monthly OGCD.
              </p>
            </div>
            <HarmonizationResults />
            <RegionalHarmonizationResults />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* STEP 4: SECTION 4 — RESEARCH & METHODS (ACCESSIBLE LINK TO GITHUB MD)     */}
        {/* ========================================================================= */}
        <section
          id="research-methods"
          aria-labelledby="methods-heading"
          className="mt-20 border-t border-[#252D34] pt-14"
        >
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-md border border-[#F0A34A]/30 bg-[#F0A34A]/10 px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
              SCIENTIFIC RIGOR & METHODOLOGY
            </div>
            <h2 id="methods-heading" className="mt-3 text-3xl font-semibold tracking-tight text-[#E8EDF0] sm:text-4xl">
              Research & Methods
            </h2>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-[#9BA8B2]">
              Documentation of satellite observation data pipelines, spatial aggregation principles, evaluation regimes, and calibration limitations.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6">
              <h3 className="text-lg font-semibold text-[#E8EDF0]">1. Data Sources & Observation Architecture</h3>
              <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
                Hotspot records are sourced from the NASA Fire Information for Resource Management System (FIRMS) archive for India:
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-[#9BA8B2]">
                <li>• <strong className="text-[#E8EDF0]">MODIS Collection 6.1:</strong> Terra (morning pass ~10:30 AM/PM) and Aqua (afternoon pass ~1:30 PM/AM), 1 km nominal fire pixel resolution (2003–2025).</li>
                <li>• <strong className="text-[#E8EDF0]">VIIRS Collection 2:</strong> Suomi-NPP (afternoon pass ~1:30 PM/AM), 375 m I-band active fire product (2013–2025).</li>
                <li>• <strong className="text-[#E8EDF0]">Scope:</strong> India national geographic extent and 35 ADM1 administrative subdivisions.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6">
              <h3 className="text-lg font-semibold text-[#E8EDF0]">2. Spatial Metric: Occupied Grid-Cell-Days (OGCD)</h3>
              <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
                Coordinates are reprojected into the equal-area projection <strong className="font-mono text-[#E8EDF0]">EPSG:6933</strong> (Cylindrical Equal-Area) and binned into fixed grid cells (1 km, 5 km, 10 km):
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-[#9BA8B2]">
                <li>• Each cell contributes at most 1 count per acquisition date per sensor, regardless of multiple detections in that cell.</li>
                <li>• Mitigates multi-detection clusters from higher-resolution sensors without claiming to quantify true burned area or ignition counts.</li>
                <li>• Provides an objective, reproducible metric for sensor comparison.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6">
              <h3 className="text-lg font-semibold text-[#E8EDF0]">3. Chronological Evaluation Architecture</h3>
              <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
                Statistical adjustments are evaluated using chronological data splits to eliminate lookahead bias:
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-[#9BA8B2]">
                <li>• <strong className="text-[#E8EDF0]">Training (2013–2021):</strong> Fit global, seasonal, and regional scaling factors.</li>
                <li>• <strong className="text-[#E8EDF0]">Validation (2022–2023):</strong> Select best-performing model structure.</li>
                <li>• <strong className="text-[#E8EDF0]">Held-Out Test (2024–2025):</strong> Evaluate prediction accuracy against observed MODIS OGCD.</li>
                <li>• Regularized seasonal adjustment achieves 19.7% lower MAE nationally and 38.6% lower MAE regionally over global scaling.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-[#F0A34A]">
                  STATUS: NOT VALIDATED
                </span>
                <h3 className="text-lg font-semibold text-[#E8EDF0]">4. Key Calibration Limitations</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
                FireSignal provides empirical cross-sensor harmonization, not physical instrument calibration or ground-truth verification:
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-[#9BA8B2]">
                <li>• MODIS is used as a statistical reference series, not ground truth.</li>
                <li>• Overpass schedules, view angles, cloud cover, and sensor sensitivity thresholds remain unnormalized.</li>
                <li>• Absence of hotspot detections does not prove zero burning or complete satellite coverage.</li>
              </ul>
            </div>
          </div>

          {/* Accessible Working GitHub Link Card */}
          <div className="mt-8 rounded-2xl border border-[#F0A34A]/30 bg-[#F0A34A]/5 p-6 sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-semibold text-[#E8EDF0]">
                  Read the Full Scientific Methodology
                </h3>
                <p className="mt-1 text-sm text-[#9BA8B2]">
                  Examine detailed mathematical formulas, data processing scripts, regional boundary citations, and evaluation tables in the project repository.
                </p>
              </div>
              <a
                href="https://github.com/pushkarscripts/FireSignal/blob/main/METHODOLOGY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#F0A34A] px-5 py-3 text-sm font-semibold text-[#0B0E11] transition hover:bg-[#F5B56E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151A1F]"
              >
                <span>View METHODOLOGY.md</span>
                <ExternalLink size={16} />
              </a>
            </div>
            <div className="mt-4 border-t border-[#252D34] pt-4 text-xs font-mono text-[#9BA8B2]">
              Repository: github.com/pushkarscripts/FireSignal · Boundary Source: geoBoundaries / DataMeet India / Election Commission of India (CC BY 2.5 IN)
            </div>
          </div>
        </section>
      </main>

      {/* Semantic Accessible Footer */}
      <footer className="mt-24 border-t border-[#252D34] bg-[#0B0E11] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F0A34A]/30 bg-[#F0A34A]/10 text-[#F0A34A]">
                <Flame size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E8EDF0]">FireSignal 2.0 — Dark Observatory</p>
                <p className="text-xs text-[#9BA8B2]">NASA MODIS + VIIRS Satellite Fire Intelligence for India</p>
              </div>
            </div>

            <nav aria-label="Footer Navigation" className="flex flex-wrap items-center gap-6 text-sm text-[#9BA8B2]">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-[#E8EDF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="https://github.com/pushkarscripts/FireSignal/blob/main/METHODOLOGY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#F0A34A] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
              >
                Methodology <ExternalLink size={13} />
              </a>
            </nav>
          </div>

          <div className="mt-8 border-t border-[#252D34] pt-8 text-center text-xs text-[#9BA8B2] sm:flex sm:justify-between sm:text-left">
            <p>
              Data courtesy NASA FIRMS. Occupied Grid-Cell-Days (OGCD) calculated on EPSG:6933. Not validated as physical fire severity or ground fire occurrence.
            </p>
            <p className="mt-2 sm:mt-0 font-mono">
              FireSignal Research Prototype
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

import HarmonizationResults from './HarmonizationResults'
import HistoricalCalendar from './HistoricalCalendar'
import RegionalHarmonizationResults from './RegionalHarmonizationResults'
import RegionalFireIntelligence from './RegionalFireIntelligence'
import SensorShiftAnalyzer from './SensorShiftAnalyzer'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDown, ExternalLink, Flame,
  Globe2, Layers, Menu, Satellite, ShieldCheck, X
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
      label: 'Observation Window',
      value: `${records.length} Days`,
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
    <div className="min-h-screen bg-[#0B0E11] text-[#E8EDF0] antialiased selection:bg-[#F0A34A]/25 selection:text-[#E8EDF0]">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[#F0A34A] focus:px-4 focus:py-2.5 focus:font-semibold focus:text-[#0B0E11] focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Header — Dark Observatory Brand & Responsive Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#252D34] bg-[#0B0E11]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8">
          <a
            href="#observatory"
            className="group flex items-center gap-3 rounded-lg p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0E11]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F0A34A]/30 bg-[#F0A34A]/10 text-[#F0A34A] transition group-hover:border-[#F0A34A]/60 group-hover:bg-[#F0A34A]/15">
              <Flame size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-[#E8EDF0]">FireSignal</span>
                <span className="rounded bg-[#1B2127] border border-[#252D34] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#9BA8B2]">2.0</span>
              </div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#9BA8B2]">
                Earth Observation / India
              </p>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav aria-label="Main Navigation" className="hidden md:flex md:items-center md:gap-1.5">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-[#9BA8B2] transition hover:bg-[#151A1F] hover:text-[#E8EDF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="https://github.com/pushkarscripts/FireSignal/blob/main/METHODOLOGY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[#252D34] bg-[#151A1F] px-3 py-1.5 text-xs font-medium text-[#9BA8B2] transition hover:border-[#F0A34A]/50 hover:text-[#E8EDF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
            >
              <span>Methodology</span>
              <ExternalLink size={12} />
            </a>
          </nav>

          {/* Mobile Navigation Toggle Button */}
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

        {/* Mobile Navigation Drawer */}
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
              <li>
                <a
                  href="https://github.com/pushkarscripts/FireSignal/blob/main/METHODOLOGY.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-between rounded-lg border border-[#252D34] bg-[#0B0E11] px-3.5 py-2.5 text-sm font-medium text-[#F0A34A]"
                >
                  <span>Scientific Methodology</span>
                  <ExternalLink size={14} />
                </a>
              </li>
            </ul>
          </nav>
        )}
      </header>

      {/* Main Content Landmark */}
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* ========================================================================= */}
        {/* SECTION 1: OBSERVATORY (TASK A: HERO + TASK B: CONTEXT STRIP + BASELINE) */}
        {/* ========================================================================= */}
        <section id="observatory" aria-labelledby="observatory-heading" className="space-y-12 sm:space-y-16">
          {/* TASK A: REDESIGNED PREMIUM HERO */}
          <div className="relative overflow-hidden rounded-3xl border border-[#252D34] bg-gradient-to-b from-[#151A1F] via-[#12171C] to-[#0E1216] p-6 sm:p-10 lg:p-14 xl:p-16">
            <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Column: Editorial Headline & Actions */}
              <div className="lg:col-span-7 xl:col-span-7">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-[#252D34] bg-[#0B0E11]/80 px-3.5 py-1 text-xs font-mono tracking-widest text-[#9BA8B2]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F0A34A]" />
                  <span className="font-semibold text-[#F0A34A]">FIRESIGNAL</span>
                  <span className="text-[#252D34]">/</span>
                  <span>EARTH OBSERVATION</span>
                </div>

                {/* Editorial Headline */}
                <h1
                  id="observatory-heading"
                  className="mt-6 text-3xl font-semibold tracking-tight text-[#E8EDF0] sm:text-5xl lg:text-5xl xl:text-6xl leading-[1.12]"
                >
                  Fire activity,{' '}
                  <span className="text-[#9BA8B2] font-normal">through two different lenses<span className="text-[#F0A34A]">.</span></span>
                </h1>

                {/* Supporting copy */}
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#9BA8B2] sm:text-lg">
                  Explore historical NASA hotspot observations across India and understand how MODIS and VIIRS reveal different patterns of detected fire activity.
                </p>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <a
                    href="#historical-patterns"
                    className="inline-flex items-center gap-2.5 rounded-xl bg-[#F0A34A] px-6 py-3.5 text-sm font-semibold text-[#0B0E11] transition hover:bg-[#F5B56E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151A1F]"
                  >
                    <span>Explore Historical Patterns</span>
                    <ArrowDown size={16} />
                  </a>
                  <a
                    href="#sensor-laboratory"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#252D34] bg-[#0B0E11] px-5 py-3.5 text-sm font-medium text-[#E8EDF0] transition hover:border-[#F0A34A]/50 hover:text-[#F0A34A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
                  >
                    <span>Sensor Laboratory</span>
                  </a>
                </div>
              </div>

              {/* Right Column: High-Precision Abstract Earth-Observation Instrument Graphic */}
              <div className="flex justify-center lg:col-span-5 xl:col-span-5" aria-hidden="true">
                <div className="relative h-72 w-72 sm:h-84 sm:w-84 md:h-96 md:w-96 lg:h-[400px] lg:w-[400px]">
                  <svg
                    viewBox="0 0 520 520"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-full w-full select-none"
                  >
                    <defs>
                      {/* Focal glow for the sensor aperture */}
                      <radialGradient id="focalGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#F0A34A" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#F0A34A" stopOpacity="0" />
                      </radialGradient>
                      {/* Earth horizon arc gradient */}
                      <linearGradient id="horizonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#252D34" stopOpacity="0.2" />
                        <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#252D34" stopOpacity="0.2" />
                      </linearGradient>
                      {/* Sensor scan swath cone gradient */}
                      <linearGradient id="swathGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                        <stop offset="0%" stopColor="#F0A34A" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#F0A34A" stopOpacity="0.01" />
                      </linearGradient>
                    </defs>

                    {/* Outer celestial / dial ring */}
                    <circle cx="260" cy="260" r="240" stroke="#252D34" strokeWidth="1" strokeDasharray="3 6" />
                    <circle cx="260" cy="260" r="236" stroke="#252D34" strokeWidth="0.75" />

                    {/* Cardinal reticle indicators */}
                    <line x1="260" y1="16" x2="260" y2="28" stroke="#F0A34A" strokeWidth="1.5" />
                    <line x1="260" y1="492" x2="260" y2="504" stroke="#F0A34A" strokeWidth="1.5" />
                    <line x1="16" y1="260" x2="28" y2="260" stroke="#F0A34A" strokeWidth="1.5" />
                    <line x1="492" y1="260" x2="504" y2="260" stroke="#F0A34A" strokeWidth="1.5" />

                    {/* Concentric observation range rings */}
                    <circle cx="260" cy="260" r="190" stroke="#252D34" strokeWidth="1" strokeDasharray="3 4" opacity="0.8" />
                    <circle cx="260" cy="260" r="140" stroke="#252D34" strokeWidth="1" />
                    <circle cx="260" cy="260" r="90" stroke="#252D34" strokeWidth="1" strokeDasharray="2 3" opacity="0.8" />
                    <circle cx="260" cy="260" r="40" stroke="#252D34" strokeWidth="1" />

                    {/* Graticule Axes */}
                    <line x1="260" y1="36" x2="260" y2="484" stroke="#252D34" strokeWidth="1" />
                    <line x1="36" y1="260" x2="484" y2="260" stroke="#252D34" strokeWidth="1" />

                    {/* Stylized Earth Limb / Curvature Horizon Arc */}
                    <path d="M 40 400 Q 260 300 480 400" stroke="url(#horizonGrad)" strokeWidth="2" fill="none" />
                    <path d="M 50 408 Q 260 310 470 408" stroke="#252D34" strokeWidth="1" strokeDasharray="4 4" fill="none" />

                    {/* VIIRS Sensor Cross-Track Scan Cone */}
                    <polygon points="260,80 120,400 400,400" fill="url(#swathGrad)" />
                    <line x1="260" y1="80" x2="120" y2="400" stroke="#F0A34A" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                    <line x1="260" y1="80" x2="400" y2="400" stroke="#F0A34A" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

                    {/* Sun-Synchronous Polar Satellite Flight Paths */}
                    {/* MODIS (Terra/Aqua) Flight Vector Arc: sky cyan */}
                    <path d="M 140 40 Q 240 240 380 480" stroke="#38BDF8" strokeWidth="2" strokeDasharray="6 4" opacity="0.85" />
                    {/* VIIRS (Suomi-NPP) Flight Vector Arc: observatory amber */}
                    <path d="M 380 40 Q 280 240 140 480" stroke="#F0A34A" strokeWidth="2" strokeDasharray="6 4" opacity="0.85" />

                    {/* Common-Grid Equal-Area Cell Indicators (EPSG:6933 representation at intersection) */}
                    <g transform="translate(260, 260) rotate(-15)">
                      <circle cx="0" cy="0" r="48" fill="url(#focalGlow)" />
                      <rect x="-30" y="-30" width="20" height="20" stroke="#252D34" strokeWidth="1" fill="#151A1F" fillOpacity="0.6" />
                      <rect x="-10" y="-30" width="20" height="20" stroke="#252D34" strokeWidth="1" fill="#151A1F" fillOpacity="0.6" />
                      <rect x="10" y="-30" width="20" height="20" stroke="#252D34" strokeWidth="1" fill="#151A1F" fillOpacity="0.6" />
                      <rect x="-30" y="-10" width="20" height="20" stroke="#252D34" strokeWidth="1" fill="#151A1F" fillOpacity="0.6" />
                      <rect x="-10" y="-10" width="20" height="20" stroke="#F0A34A" strokeWidth="1.5" fill="#F0A34A" fillOpacity="0.15" />
                      <rect x="10" y="-10" width="20" height="20" stroke="#252D34" strokeWidth="1" fill="#151A1F" fillOpacity="0.6" />
                      <rect x="-30" y="10" width="20" height="20" stroke="#252D34" strokeWidth="1" fill="#151A1F" fillOpacity="0.6" />
                      <rect x="-10" y="10" width="20" height="20" stroke="#252D34" strokeWidth="1" fill="#151A1F" fillOpacity="0.6" />
                      <rect x="10" y="10" width="20" height="20" stroke="#252D34" strokeWidth="1" fill="#151A1F" fillOpacity="0.6" />
                      <circle cx="0" cy="0" r="3" fill="#F0A34A" />
                      <circle cx="0" cy="0" r="8" stroke="#F0A34A" strokeWidth="1" opacity="0.7" />
                    </g>

                    {/* Graticule Latitude & Longitude Labels */}
                    <text x="268" y="52" fill="#9BA8B2" fontSize="10" fontFamily="monospace">30°N</text>
                    <text x="268" y="142" fill="#9BA8B2" fontSize="10" fontFamily="monospace">20°N</text>
                    <text x="268" y="378" fill="#9BA8B2" fontSize="10" fontFamily="monospace">10°N</text>
                    <text x="430" y="254" fill="#9BA8B2" fontSize="10" fontFamily="monospace">90°E</text>
                    <text x="44" y="254" fill="#9BA8B2" fontSize="10" fontFamily="monospace">70°E</text>

                    {/* Sensor Pass Badges */}
                    <g transform="translate(68, 86)">
                      <rect x="0" y="0" width="112" height="22" rx="4" fill="#0B0E11" stroke="#38BDF8" strokeWidth="0.75" />
                      <circle cx="10" cy="11" r="3" fill="#38BDF8" />
                      <text x="20" y="14" fill="#E8EDF0" fontSize="9" fontFamily="monospace" fontWeight="600">MODIS ~10:30</text>
                    </g>
                    <g transform="translate(340, 86)">
                      <rect x="0" y="0" width="112" height="22" rx="4" fill="#0B0E11" stroke="#F0A34A" strokeWidth="0.75" />
                      <circle cx="10" cy="11" r="3" fill="#F0A34A" />
                      <text x="20" y="14" fill="#E8EDF0" fontSize="9" fontFamily="monospace" fontWeight="600">VIIRS ~13:30</text>
                    </g>
                    <g transform="translate(196, 464)">
                      <rect x="0" y="0" width="128" height="20" rx="4" fill="#0B0E11" stroke="#252D34" strokeWidth="0.75" />
                      <text x="10" y="13" fill="#9BA8B2" fontSize="8" fontFamily="monospace">GRID: 5 KM EPSG:6933</text>
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* TASK B: SCIENTIFIC CONTEXT STRIP (VERIFIED DATASET DESCRIPTORS) */}
          <div className="rounded-2xl border border-[#252D34] bg-[#11161B] p-5 sm:p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:divide-y-0 sm:gap-6 lg:divide-x divide-[#252D34]">
              {/* Fact 1: MODIS Archive */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                    <Satellite size={14} className="text-[#38BDF8]" />
                    <span>MODIS Archive</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-[#E8EDF0]">2003–2025</div>
                </div>
                <p className="mt-2 text-xs text-[#9BA8B2]">
                  Collection 6.1 · Terra & Aqua (23-Year Multi-Decade Record)
                </p>
              </div>

              {/* Fact 2: VIIRS Archive */}
              <div className="flex flex-col justify-between pt-4 sm:pt-0 lg:pl-6">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                    <Flame size={14} className="text-[#F0A34A]" />
                    <span>VIIRS Archive</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-[#E8EDF0]">2013–2025</div>
                </div>
                <p className="mt-2 text-xs text-[#9BA8B2]">
                  Collection 2 · Suomi-NPP 375 m I-Band Active Fire
                </p>
              </div>

              {/* Fact 3: Geographic Scope */}
              <div className="flex flex-col justify-between pt-4 sm:pt-0 lg:pl-6">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                    <Globe2 size={14} className="text-emerald-400" />
                    <span>Geographic Scope</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-[#E8EDF0]">India</div>
                </div>
                <p className="mt-2 text-xs text-[#9BA8B2]">
                  National Boundary & 35 Administrative Subdivisions (ADM1)
                </p>
              </div>

              {/* Fact 4: Primary Measurement */}
              <div className="flex flex-col justify-between pt-4 sm:pt-0 lg:pl-6">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                    <Layers size={14} className="text-[#F0A34A]" />
                    <span>Primary Measurement</span>
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-[#E8EDF0]">5 km OGCD</div>
                </div>
                <p className="mt-2 text-xs text-[#9BA8B2]">
                  Occupied Grid-Cell-Days · Cylindrical Equal-Area (EPSG:6933)
                </p>
              </div>
            </div>
          </div>

          {/* SATELLITE FIRE ACTIVITY OVERVIEW (March–May 2023 Baseline) */}
          <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-[#F0A34A]/30 bg-[#F0A34A]/10 px-2.5 py-1 font-mono text-xs tracking-wider text-[#F0A34A]">
                  INDIA · MARCH–MAY 2023 EXPERIMENT BASELINE
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#E8EDF0] sm:text-3xl">
                  Satellite Fire Activity Overview
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#9BA8B2]">
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
                          <span className="font-mono text-xs uppercase text-[#9BA8B2]">{metric.sublabel}</span>
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

                <div className="mt-8 rounded-xl border border-[#252D34] bg-[#0B0E11] p-5 sm:p-6 lg:p-8">
                  <div>
                    <h3 className="text-lg font-semibold text-[#E8EDF0]">
                      Daily Satellite Activity Trends
                    </h3>
                    <p className="mt-1 text-sm text-[#9BA8B2]">
                      Number of occupied 5 km grid cells per day. Each sensor is counted independently.
                    </p>
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
        {/* SECTION 2: HISTORICAL PATTERNS (TASK D: ELEGANT SECTION TRANSITION)        */}
        {/* ========================================================================= */}
        <section
          id="historical-patterns"
          aria-labelledby="historical-heading"
          className="mt-24 pt-16 border-t border-[#252D34]/80"
        >
          {/* Section Header with Deliberate Typographic Hierarchy */}
          <div className="mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#252D34] bg-[#151A1F] px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
              02 / MULTI-DECADE ARCHIVES · 2003–2025
            </div>
            <h2 id="historical-heading" className="mt-4 text-3xl font-semibold tracking-tight text-[#E8EDF0] sm:text-4xl lg:text-5xl">
              Historical Burning Patterns Across India
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#9BA8B2] sm:text-lg">
              Two decades of NASA FIRMS active fire detections mapped to standard 5 km equal-area grids across India, exploring long-term seasonal burning cycles and sub-national administrative patterns.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs font-mono text-[#9BA8B2]">
              <span className="rounded-lg border border-[#252D34] bg-[#151A1F] px-3 py-1.5">MODIS: 2003–2025 (23 Years)</span>
              <span className="rounded-lg border border-[#252D34] bg-[#151A1F] px-3 py-1.5">VIIRS: 2013–2025 (13 Years)</span>
              <span className="rounded-lg border border-[#252D34] bg-[#151A1F] px-3 py-1.5">5 km Equal-Area Grid (EPSG:6933)</span>
            </div>
          </div>

          <div className="space-y-16">
            <HistoricalCalendar />
            <RegionalFireIntelligence />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: SENSOR LABORATORY (TASK D: CLEAN SEGMENTATION WITHOUT CARDS)   */}
        {/* ========================================================================= */}
        <section
          id="sensor-laboratory"
          aria-labelledby="sensor-lab-heading"
          className="mt-24 pt-16 border-t border-[#252D34]/80"
        >
          {/* Section Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#252D34] bg-[#151A1F] px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
              03 / CROSS-SENSOR HARMONIZATION & DIAGNOSTICS
            </div>
            <h2 id="sensor-lab-heading" className="mt-4 text-3xl font-semibold tracking-tight text-[#E8EDF0] sm:text-4xl lg:text-5xl">
              Sensor Laboratory
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#9BA8B2] sm:text-lg">
              Diagnostic evaluation of spatial aggregation, daytime versus nighttime observation differences, and chronologically evaluated statistical harmonization models.
            </p>
          </div>

          {/* SUBSECTION A: CONTROLLED EXPERIMENT (MARCH–MAY 2023) */}
          <div className="space-y-6">
            <div className="border-l-2 border-[#F0A34A] pl-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#F0A34A]">
                Dataset Scope A · Spring 2023 Controlled Experiment
              </span>
              <h3 className="mt-1 text-2xl font-semibold text-[#E8EDF0]">
                Spatial Aggregation & Temporal Concordance
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#9BA8B2]">
                Testing the sensitivity of the VIIRS/MODIS detection ratio across 1 km, 5 km, and 10 km grid resolutions, alongside day/night satellite pass differences and daily first-difference direction agreement.
              </p>
            </div>
            <SensorShiftAnalyzer />
          </div>

          {/* SUBSECTION B: RETROSPECTIVE HARMONIZATION (2013–2025) */}
          <div className="mt-20 pt-16 border-t border-[#252D34]/70 space-y-8">
            <div className="border-l-2 border-[#38BDF8] pl-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#38BDF8]">
                Dataset Scope B · 2013–2025 Retrospective Harmonization
              </span>
              <h3 className="mt-1 text-2xl font-semibold text-[#E8EDF0]">
                Held-Out National & Regional Harmonization
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#9BA8B2]">
                Statistical scaling factors fitted on 2013–2021, model structure selected on 2022–2023, and final predictive agreement evaluated on the chronologically held-out 2024–2025 test series.
              </p>
            </div>
            <HarmonizationResults />
            <RegionalHarmonizationResults />
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: RESEARCH & METHODS (TASK D: RIGOROUS SCIENTIFIC CONTEXT)       */}
        {/* ========================================================================= */}
        <section
          id="research-methods"
          aria-labelledby="methods-heading"
          className="mt-24 pt-16 border-t border-[#252D34]/80"
        >
          {/* Section Header */}
          <div className="mb-10 sm:mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#252D34] bg-[#151A1F] px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
              04 / RESEARCH & METHODS
            </div>
            <h2 id="methods-heading" className="mt-4 text-3xl font-semibold tracking-tight text-[#E8EDF0] sm:text-4xl lg:text-5xl">
              Scientific Methodology & Limitations
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#9BA8B2] sm:text-lg">
              Data provenance, spatial projection protocols, validation partitioning, and essential observational caveats.
            </p>
          </div>

          {/* 2x2 Methodology Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-[#E8EDF0]">1. Data Sources & Observation Architecture</h3>
              <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
                Hotspot records are sourced from the NASA Fire Information for Resource Management System (FIRMS) archive for India:
              </p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#9BA8B2]">
                <li>• <strong className="text-[#E8EDF0]">MODIS Collection 6.1:</strong> Terra (morning pass ~10:30 AM/PM) and Aqua (afternoon pass ~1:30 PM/AM), 1 km nominal fire pixel resolution (2003–2025).</li>
                <li>• <strong className="text-[#E8EDF0]">VIIRS Collection 2:</strong> Suomi-NPP (afternoon pass ~1:30 PM/AM), 375 m I-band active fire product (2013–2025).</li>
                <li>• <strong className="text-[#E8EDF0]">Scope:</strong> India national geographic extent and 35 ADM1 administrative subdivisions.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-[#E8EDF0]">2. Spatial Metric: Occupied Grid-Cell-Days (OGCD)</h3>
              <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
                Coordinates are reprojected into the equal-area projection <strong className="font-mono text-[#E8EDF0]">EPSG:6933</strong> (Cylindrical Equal-Area) and binned into fixed grid cells (1 km, 5 km, 10 km):
              </p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#9BA8B2]">
                <li>• Each cell contributes at most 1 count per acquisition date per sensor, regardless of multiple detections in that cell.</li>
                <li>• Mitigates multi-detection clusters from higher-resolution sensors without claiming to quantify true burned area or ignition counts.</li>
                <li>• Provides an objective, reproducible metric for sensor comparison.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-[#E8EDF0]">3. Chronological Evaluation Architecture</h3>
              <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
                Statistical adjustments are evaluated using chronological data splits to eliminate lookahead bias:
              </p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#9BA8B2]">
                <li>• <strong className="text-[#E8EDF0]">Training (2013–2021):</strong> Fit global, seasonal, and regional scaling factors.</li>
                <li>• <strong className="text-[#E8EDF0]">Validation (2022–2023):</strong> Select best-performing model structure.</li>
                <li>• <strong className="text-[#E8EDF0]">Held-Out Test (2024–2025):</strong> Evaluate prediction accuracy against observed MODIS OGCD.</li>
                <li>• Regularized seasonal adjustment achieves 19.7% lower MAE nationally and 38.6% lower MAE regionally over global scaling.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 lg:p-8">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-mono text-xs font-semibold text-[#F0A34A]">
                  STATUS: NOT VALIDATED
                </span>
                <h3 className="text-lg font-semibold text-[#E8EDF0]">4. Key Calibration Limitations</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
                FireSignal provides empirical cross-sensor harmonization, not physical instrument calibration or ground-truth verification:
              </p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#9BA8B2]">
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
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#F0A34A] px-5 py-3 text-sm font-semibold text-[#0B0E11] transition hover:bg-[#F5B56E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151A1F]"
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
      <footer className="mt-24 border-t border-[#252D34] bg-[#080B0E] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#F0A34A]/30 bg-[#F0A34A]/10 text-[#F0A34A]">
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

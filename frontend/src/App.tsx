import HarmonizationResults from './HarmonizationResults'
import HistoricalCalendar from './HistoricalCalendar'
import RegionalHarmonizationResults from './RegionalHarmonizationResults'
import RegionalFireIntelligence from './RegionalFireIntelligence'
import SensorShiftAnalyzer from './SensorShiftAnalyzer'
import { FireSignalIcon } from './FireSignalLogo'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowRight, BookOpen, CalendarDays,
  Compass, ExternalLink, Flame, Globe2, Layers,
  Menu, Satellite, ShieldCheck, X
} from 'lucide-react'
import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

const GeographicObservatory = lazy(() => import('./GeographicObservatory'))

type DailyRecord = {
  date: string
  modis: number
  viirs: number
}

import { type ViewId, parseHash } from './navigation.ts'
export type { ViewId }

function App() {
  const [currentView, setCurrentView] = useState<ViewId>(() => {
    if (typeof window !== 'undefined') {
      return parseHash(window.location.hash)
    }
    return 'observatory'
  })

  const [records, setRecords] = useState<DailyRecord[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const viewHeadingRef = useRef<HTMLHeadingElement>(null)
  const isInitialRender = useRef(true)
  const isKeyboardNavRef = useRef(false)
  const [showHeadingFocus, setShowHeadingFocus] = useState(false)

  // Track interaction modality (keyboard vs mouse/pointer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) {
        isKeyboardNavRef.current = true
      }
    }
    const handlePointerDown = () => {
      isKeyboardNavRef.current = false
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('mousedown', handlePointerDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('mousedown', handlePointerDown, true)
    }
  }, [])

  // Listen for browser hash changes (Back / Forward / direct URL updates)
  useEffect(() => {
    const handleHashChange = () => {
      const targetView = parseHash(window.location.hash)
      setCurrentView(targetView)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // View transition focus management & scroll to top (skipped on initial page load)
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    const wasKeyboard = isKeyboardNavRef.current
    setShowHeadingFocus(wasKeyboard)

    if (viewHeadingRef.current) {
      viewHeadingRef.current.focus({ preventScroll: true })
    }
  }, [currentView])

  // Fetch daily comparison dataset for the March–May 2023 baseline
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

  const navLinks: { id: ViewId; href: string; label: string }[] = [
    { id: 'observatory', href: '#observatory', label: 'Observatory' },
    { id: 'historical-patterns', href: '#historical-patterns', label: 'Historical Patterns' },
    { id: 'sensor-laboratory', href: '#sensor-laboratory', label: 'Sensor Laboratory' },
    { id: 'research-methods', href: '#research-methods', label: 'Research & Methods' },
  ]

  const handleNavClick = (viewId: ViewId, e?: React.MouseEvent) => {
    setMobileMenuOpen(false)
    if (e) {
      isKeyboardNavRef.current = e.detail === 0
    }
    if (currentView === viewId) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#E8EDF0] antialiased selection:bg-[#F0A34A]/25 selection:text-[#E8EDF0]">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[#F0A34A] focus:px-4 focus:py-2.5 focus:font-semibold focus:text-[#0B0E11] focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Header — Brand & Responsive View Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#252D34]/80 bg-[#0B0E11]/85 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.45)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
          <a
            href="#observatory"
            onClick={(e) => handleNavClick('observatory', e)}
            className="group flex items-center gap-3 rounded-xl p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0E11]"
            aria-label="FireSignal Home"
          >
            <FireSignalIcon size={38} className="transition-transform duration-300 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#E8EDF0] leading-tight">
                Fire<span className="text-[#F0A34A]">Signal</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[#9BA8B2] leading-none mt-0.5">
                Satellite Fire Intelligence
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav aria-label="Main Navigation" className="hidden md:flex md:items-center md:gap-1.5">
            {navLinks.map((link) => {
              const isActive = currentView === link.id
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleNavClick(link.id, e)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] ${
                    isActive
                      ? 'border border-[#F0A34A]/40 bg-[#151A1F] text-[#F0A34A] shadow-[0_2px_8px_rgba(240,163,74,0.15)] font-semibold'
                      : 'border border-transparent text-[#9BA8B2] hover:bg-[#151A1F]/70 hover:text-[#E8EDF0]'
                  }`}
                >
                  {link.label}
                </a>
              )
            })}
            <a
              href="https://github.com/pushkarscripts/FireSignal/blob/main/METHODOLOGY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[#252D34] bg-[#151A1F]/80 px-3 py-1.5 text-xs font-medium text-[#9BA8B2] transition-all hover:border-[#F0A34A]/50 hover:bg-[#151A1F] hover:text-[#E8EDF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
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
              {navLinks.map((link) => {
                const isActive = currentView === link.id
                return (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      onClick={(e) => handleNavClick(link.id, e)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`block rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? 'border-l-2 border-[#F0A34A] bg-[#0B0E11] text-[#F0A34A] font-semibold pl-3'
                          : 'text-[#9BA8B2] hover:bg-[#0B0E11] hover:text-[#E8EDF0]'
                      }`}
                    >
                      {link.label}
                    </a>
                  </li>
                )
              })}
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
        {/* VIEW 1: OBSERVATORY (LANDING VIEW: HERO, CONTEXT STRIP, SUITE OVERVIEW)   */}
        {/* ========================================================================= */}
        {currentView === 'observatory' && (
          <section id="observatory" aria-labelledby="observatory-heading" className="space-y-12 sm:space-y-16 animate-view-fade">
            {/* HERO SECTION */}
            <div className="relative overflow-hidden rounded-3xl border border-[#252D34] bg-gradient-to-b from-[#151A1F] via-[#11161B] to-[#0B0E11] p-6 sm:p-10 lg:p-14 xl:p-16 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
              {/* Subtle ambient lighting glows */}
              <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#F0A34A]/5 blur-3xl" aria-hidden="true" />
              <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#38BDF8]/5 blur-3xl" aria-hidden="true" />

              <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
                {/* Left Column: Editorial Headline & Actions */}
                <div className="lg:col-span-7 xl:col-span-7">
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-[#252D34] bg-[#0B0E11]/90 px-3.5 py-1 text-xs font-mono tracking-widest text-[#9BA8B2] shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-[#F0A34A] shadow-[0_0_8px_rgba(240,163,74,0.7)]" />
                    <span className="font-semibold text-[#F0A34A]">FIRESIGNAL</span>
                    <span className="text-[#252D34]">/</span>
                    <span>EARTH OBSERVATION</span>
                  </div>

                  <h1
                    id="observatory-heading"
                    ref={viewHeadingRef}
                    tabIndex={-1}
                    onBlur={() => setShowHeadingFocus(false)}
                    className={`mt-6 font-display text-4xl sm:text-6xl lg:text-7xl xl:text-[5.25rem] tracking-tight text-[#E8EDF0] leading-[1.04] outline-none rounded-lg transition-shadow max-w-2xl ${
                      showHeadingFocus
                        ? 'ring-2 ring-[#F0A34A] ring-offset-4 ring-offset-[#0B0E11]'
                        : ''
                    }`}
                  >
                    Fire activity,<br />
                    <span className="italic font-normal text-[#9BA8B2]">through two different lenses<span className="text-[#F0A34A]">.</span></span>
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#9BA8B2] sm:text-lg">
                    Explore historical NASA hotspot observations across India and understand how MODIS and VIIRS reveal different patterns of detected fire activity.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <a
                      href="#historical-patterns"
                      onClick={(e) => handleNavClick('historical-patterns', e)}
                      className="inline-flex items-center gap-2.5 rounded-xl bg-[#F0A34A] px-6 py-3.5 text-sm font-semibold text-[#0B0E11] transition-all hover:bg-[#F5B56E] hover:shadow-[0_4px_20px_rgba(240,163,74,0.35)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151A1F]"
                    >
                      <span>Explore Historical Patterns</span>
                      <ArrowRight size={16} />
                    </a>
                    <a
                      href="#sensor-laboratory"
                      onClick={(e) => handleNavClick('sensor-laboratory', e)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#252D34] bg-[#0B0E11]/80 backdrop-blur-sm px-5 py-3.5 text-sm font-medium text-[#E8EDF0] transition-all hover:border-[#F0A34A]/50 hover:bg-[#151A1F] hover:text-[#F0A34A] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
                    >
                      <span>Sensor Laboratory</span>
                    </a>
                  </div>
                </div>

                {/* Right Column: High-Precision Abstract Earth-Observation Instrument Graphic */}
                <div className="flex justify-center lg:col-span-5 xl:col-span-5" aria-hidden="true">
                  <div className="relative h-80 w-80 sm:h-96 sm:w-96 md:h-[420px] md:w-[420px] lg:h-[450px] lg:w-[450px] xl:h-[480px] xl:w-[480px]">
                    {/* Subtle radial ambient atmosphere behind instrument */}
                    <div className="pointer-events-none absolute inset-0 -m-8 rounded-full bg-gradient-to-tr from-[#38BDF8]/10 via-transparent to-[#F0A34A]/10 blur-2xl" />

                    <svg
                      viewBox="0 0 520 520"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-full w-full select-none"
                    >
                      <defs>
                        <radialGradient id="focalGlow" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#F0A34A" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#F0A34A" stopOpacity="0" />
                        </radialGradient>
                        <linearGradient id="horizonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#252D34" stopOpacity="0.2" />
                          <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#252D34" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="swathGrad" x1="50%" y1="0%" x2="50%" y2="100%">
                          <stop offset="0%" stopColor="#F0A34A" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#F0A34A" stopOpacity="0.01" />
                        </linearGradient>
                        <linearGradient id="scanBeamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
                          <stop offset="70%" stopColor="#38BDF8" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
                        </linearGradient>
                        <radialGradient id="scanFanGrad" cx="260" cy="260" r="236" gradientUnits="userSpaceOnUse">
                          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.14" />
                          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                        </radialGradient>
                      </defs>

                      {/* Outer dial ring */}
                      <g className="obs-reticle-dial">
                        <circle cx="260" cy="260" r="240" stroke="#252D34" strokeWidth="1" strokeDasharray="3 6" />
                        <circle cx="260" cy="260" r="236" stroke="#252D34" strokeWidth="0.75" />
                      </g>

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

                      {/* Continuous Earth Observation Scan Sweep (Scientifically Illustrative) */}
                      <g className="obs-scan-sweep">
                        <line x1="260" y1="260" x2="260" y2="24" stroke="url(#scanBeamGrad)" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M 260 260 L 260 24 A 236 236 0 0 1 315 31 Z" fill="url(#scanFanGrad)" opacity="0.35" />
                      </g>

                      {/* Sun-Synchronous Polar Satellite Flight Paths with orbital dash drift */}
                      <path d="M 140 40 Q 240 240 380 480" stroke="#38BDF8" strokeWidth="2.25" strokeDasharray="6 4" opacity="0.85" className="obs-orbit-modis" />
                      <path d="M 380 40 Q 280 240 140 480" stroke="#F0A34A" strokeWidth="2.25" strokeDasharray="6 4" opacity="0.85" className="obs-orbit-viirs" />

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

            {/* VERIFIED ARCHIVE CONTEXT STRIP */}
            <div className="rounded-2xl border border-[#252D34] bg-gradient-to-b from-[#151A1F] to-[#101418] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 sm:divide-y-0 sm:gap-6 lg:divide-x divide-[#252D34]/80">
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] shadow-[0_0_6px_rgba(56,189,248,0.7)]" />
                      <Satellite size={14} className="text-[#38BDF8]" />
                      <span>MODIS Archive</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-[#E8EDF0]">2003–2025</div>
                  </div>
                  <p className="mt-2 text-xs text-[#9BA8B2]">
                    Collection 6.1 · Terra & Aqua (23-Year Multi-Decade Record)
                  </p>
                </div>

                <div className="flex flex-col justify-between pt-4 sm:pt-0 lg:pl-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F0A34A] shadow-[0_0_6px_rgba(240,163,74,0.7)]" />
                      <Flame size={14} className="text-[#F0A34A]" />
                      <span>VIIRS Archive</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-[#E8EDF0]">2013–2025</div>
                  </div>
                  <p className="mt-2 text-xs text-[#9BA8B2]">
                    Collection 2 · Suomi-NPP 375 m I-Band Active Fire
                  </p>
                </div>

                <div className="flex flex-col justify-between pt-4 sm:pt-0 lg:pl-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                      <Globe2 size={14} className="text-emerald-400" />
                      <span>Geographic Scope</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-[#E8EDF0]">India</div>
                  </div>
                  <p className="mt-2 text-xs text-[#9BA8B2]">
                    National Boundary & 35 Administrative Subdivisions (ADM1)
                  </p>
                </div>

                <div className="flex flex-col justify-between pt-4 sm:pt-0 lg:pl-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#9BA8B2]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F0A34A] shadow-[0_0_6px_rgba(240,163,74,0.7)]" />
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

            {/* GEOGRAPHIC OBSERVATORY (D6.16) */}
            <Suspense
              fallback={
                <div className="rounded-3xl border border-[#252D34] bg-[#11161B] p-10 text-center shadow-sm">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#F0A34A]/40 bg-[#F0A34A]/10 text-[#F0A34A] animate-pulse">
                    <Satellite size={24} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#E8EDF0]">Loading Geographic Observatory…</h3>
                  <p className="mt-1 text-xs text-[#9BA8B2] max-w-md mx-auto">
                    Compiling 36 ADM1 equal-area boundaries and multi-decade monthly satellite detection records across India.
                  </p>
                </div>
              }
            >
              <GeographicObservatory
                onNavigateToHistorical={() => {
                  handleNavClick('historical-patterns')
                }}
              />
            </Suspense>

            {/* WHAT FIRESIGNAL MEASURES (SCIENTIFIC EXPLANATION) */}
            <div className="rounded-2xl border border-[#252D34] bg-[#11161B] p-6 sm:p-8 lg:p-10">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-[#F0A34A]/30 bg-[#F0A34A]/10 p-2.5 text-[#F0A34A] shrink-0 hidden sm:block">
                  <Compass size={24} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#252D34] bg-[#151A1F] px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
                    SCIENTIFIC FOUNDATION & MEASUREMENT PRINCIPLES
                  </div>
                  <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[#E8EDF0]">
                    What FireSignal Measures
                  </h2>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#9BA8B2] max-w-3xl">
                    Satellite active-fire instruments detect radiant heat from fires. FireSignal structures raw NASA FIRMS archive observations across India into a standardized equal-area framework to illuminate how sensor specifications alter perceived fire activity.
                  </p>

                  <div className="mt-8 grid gap-6 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0B0E11] p-5 shadow-sm transition-colors hover:border-[#F0A34A]/30">
                      <div className="text-xs font-mono uppercase tracking-wider text-[#F0A34A]">1. Standard Grid Metric</div>
                      <h3 className="mt-2 text-lg font-semibold text-[#E8EDF0]">Occupied Grid-Cell-Days</h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#9BA8B2]">
                        Hotspots are mapped to a 5 km equal-area grid (EPSG:6933). Each cell counts at most once per sensor per calendar day. This eliminates artificial inflation from high-resolution clusters without asserting unverified fire counts or burned area.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0B0E11] p-5 shadow-sm transition-colors hover:border-[#38BDF8]/30">
                      <div className="text-xs font-mono uppercase tracking-wider text-[#38BDF8]">2. Sensor Divergence</div>
                      <h3 className="mt-2 text-lg font-semibold text-[#E8EDF0]">Two Distinct Optical Lenses</h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#9BA8B2]">
                        MODIS (1 km nominal pixel) and VIIRS (375 m I-band) differ substantially in pixel area, sensor sensitivity, and overpass schedules. VIIRS detects ~6.25× more 5 km occupied cells in identical landscapes.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] to-[#0B0E11] p-5 shadow-sm transition-colors hover:border-emerald-500/30">
                      <div className="text-xs font-mono uppercase tracking-wider text-emerald-400">3. Calibration Status</div>
                      <h3 className="mt-2 text-lg font-semibold text-[#E8EDF0]">Empirical Harmonization</h3>
                      <p className="mt-2 text-xs leading-relaxed text-[#9BA8B2]">
                        Statistical adjustments scale VIIRS toward historical MODIS levels for longitudinal consistency. This is an empirical adjustment evaluated on chronologically held-out years, not physical sensor calibration or ground truth.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CLEAR NAVIGATION CARDS INTRODUCING OTHER VIEWS */}
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#252D34] bg-[#151A1F] px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
                  OBSERVATORY SUITE · ANALYTICAL VIEWS
                </div>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[#E8EDF0]">
                  Navigate the Scientific Observatory
                </h2>
                <p className="mt-1 text-sm text-[#9BA8B2] max-w-2xl">
                  Select a specialized analytical environment to explore multi-decade patterns, sensor harmonization models, or formal research methodology.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Card 1: Historical Patterns */}
                <a
                  href="#historical-patterns"
                  onClick={(e) => handleNavClick('historical-patterns', e)}
                  className="group flex flex-col justify-between rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#111519] to-[#0E1216] p-6 shadow-sm transition-all duration-200 hover:border-[#F0A34A]/50 hover:bg-[#181E24] hover:shadow-[0_8px_24px_rgba(240,163,74,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl border border-[#252D34] bg-[#0B0E11] p-2.5 text-[#F0A34A] group-hover:border-[#F0A34A]/40 transition">
                        <CalendarDays size={20} />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-[#9BA8B2]">2003–2025 Archive</span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-[#E8EDF0] group-hover:text-[#F0A34A] transition">
                      Historical Patterns
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#9BA8B2]">
                      Explore two decades of monthly burning calendars, leave-one-year-out seasonal anomaly analysis, and administrative patterns across 35 Indian regions.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 text-[11px] font-mono text-[#9BA8B2]">Monthly Calendar</span>
                      <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 text-[11px] font-mono text-[#9BA8B2]">35 Regions</span>
                      <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 text-[11px] font-mono text-[#9BA8B2]">CSV Export</span>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-[#F0A34A] group-hover:translate-x-1 transition-transform">
                    <span>Open Historical Patterns</span>
                    <ArrowRight size={16} />
                  </div>
                </a>

                {/* Card 2: Sensor Laboratory */}
                <a
                  href="#sensor-laboratory"
                  onClick={(e) => handleNavClick('sensor-laboratory', e)}
                  className="group flex flex-col justify-between rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#111519] to-[#0E1216] p-6 shadow-sm transition-all duration-200 hover:border-[#38BDF8]/50 hover:bg-[#181E24] hover:shadow-[0_8px_24px_rgba(56,189,248,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl border border-[#252D34] bg-[#0B0E11] p-2.5 text-[#38BDF8] group-hover:border-[#38BDF8]/40 transition">
                        <Layers size={20} />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-[#9BA8B2]">Harmonization Lab</span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-[#E8EDF0] group-hover:text-[#38BDF8] transition">
                      Sensor Laboratory
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#9BA8B2]">
                      Examine the original 92-day 2023 spring baseline, grid resolution sensitivity (1 km, 5 km, 10 km), day/night splits, and held-out cross-sensor harmonization models.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 text-[11px] font-mono text-[#9BA8B2]">1 / 5 / 10 km Grids</span>
                      <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 text-[11px] font-mono text-[#9BA8B2]">Day vs Night</span>
                      <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 text-[11px] font-mono text-[#9BA8B2]">Held-Out Test</span>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-[#38BDF8] group-hover:translate-x-1 transition-transform">
                    <span>Open Sensor Laboratory</span>
                    <ArrowRight size={16} />
                  </div>
                </a>

                {/* Card 3: Research & Methods */}
                <a
                  href="#research-methods"
                  onClick={(e) => handleNavClick('research-methods', e)}
                  className="group flex flex-col justify-between rounded-2xl border border-[#252D34]/90 bg-gradient-to-b from-[#14191E] via-[#111519] to-[#0E1216] p-6 shadow-sm transition-all duration-200 hover:border-emerald-500/50 hover:bg-[#181E24] hover:shadow-[0_8px_24px_rgba(52,211,153,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl border border-[#252D34] bg-[#0B0E11] p-2.5 text-emerald-400 group-hover:border-emerald-400/40 transition">
                        <BookOpen size={20} />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-[#9BA8B2]">Provenance & Rigor</span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-[#E8EDF0] group-hover:text-emerald-400 transition">
                      Research & Methods
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#9BA8B2]">
                      Review mathematical formulas, equal-area projection specifications (EPSG:6933), validation splits, and calibration caveats in full detail.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 text-[11px] font-mono text-[#9BA8B2]">EPSG:6933</span>
                      <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 text-[11px] font-mono text-[#9BA8B2]">Chronological Split</span>
                      <span className="rounded bg-[#0B0E11] border border-[#252D34] px-2 py-0.5 text-[11px] font-mono text-[#9BA8B2]">GitHub MD</span>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>View Methodology</span>
                    <ArrowRight size={16} />
                  </div>
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: HISTORICAL PATTERNS (CALENDAR + REGIONAL FIRE INTELLIGENCE)        */}
        {/* ========================================================================= */}
        {currentView === 'historical-patterns' && (
          <section id="historical-patterns" aria-labelledby="historical-heading" className="space-y-12 animate-view-fade">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#252D34] bg-[#151A1F] px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
                02 / MULTI-DECADE ARCHIVES · 2003–2025
              </div>
              <h1
                id="historical-heading"
                ref={viewHeadingRef}
                tabIndex={-1}
                onBlur={() => setShowHeadingFocus(false)}
                className={`mt-4 font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-[#E8EDF0] leading-[1.08] outline-none rounded-lg transition-shadow w-fit ${
                  showHeadingFocus
                    ? 'ring-2 ring-[#F0A34A] ring-offset-4 ring-offset-[#0B0E11]'
                    : ''
                }`}
              >
                Historical Burning Patterns Across India
              </h1>
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
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: SENSOR LABORATORY (BASELINE + ANALYZER + HARMONIZATION MODELS)     */}
        {/* ========================================================================= */}
        {currentView === 'sensor-laboratory' && (
          <section id="sensor-laboratory" aria-labelledby="sensor-lab-heading" className="space-y-14 animate-view-fade">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#252D34] bg-[#151A1F] px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
                03 / CROSS-SENSOR HARMONIZATION & DIAGNOSTICS
              </div>
              <h1
                id="sensor-lab-heading"
                ref={viewHeadingRef}
                tabIndex={-1}
                onBlur={() => setShowHeadingFocus(false)}
                className={`mt-4 font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-[#E8EDF0] leading-[1.08] outline-none rounded-lg transition-shadow w-fit ${
                  showHeadingFocus
                    ? 'ring-2 ring-[#F0A34A] ring-offset-4 ring-offset-[#0B0E11]'
                    : ''
                }`}
              >
                Sensor Laboratory
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#9BA8B2] sm:text-lg">
                Diagnostic evaluation of spatial aggregation, daytime versus nighttime observation differences, and chronologically evaluated statistical harmonization models bridging the observational gap between MODIS and VIIRS.
              </p>
            </div>

            {/* SUBSECTION A: CONTROLLED EXPERIMENT (MARCH–MAY 2023 · 92 DAYS) */}
            <div className="space-y-8">
              <div className="border-l-2 border-[#F0A34A] pl-4">
                <span className="text-xs font-mono uppercase tracking-wider text-[#F0A34A]">
                  Dataset Scope A · Spring 2023 Controlled Experiment (92 Days)
                </span>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl text-[#E8EDF0]">
                  Spatial Aggregation & Spring 2023 Baseline
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#9BA8B2]">
                  The original 92-day comparative baseline from NASA FIRMS archive observations across India, demonstrating daily sensor divergence at a common 5 km equal-area grid resolution.
                </p>
              </div>

              {/* March–May 2023 Baseline Metrics & Daily Activity Trends */}
              <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 sm:p-8">
                {loading && (
                  <div className="rounded-xl border border-[#252D34] bg-[#0B0E11] p-8 text-center text-sm text-[#9BA8B2]">
                    Loading satellite observations...
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
                    Failed to load data: {error}
                  </div>
                )}

                {!loading && !error && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                          Daily Satellite Activity Trends (March–May 2023)
                        </h3>
                        <p className="mt-1 text-sm text-[#9BA8B2]">
                          Number of occupied 5 km grid cells per day across India. Each sensor is counted independently.
                        </p>
                      </div>

                      <div className="mt-6 h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={records} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid stroke="#1C2329" strokeDasharray="3 3" />
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
                                background: 'rgba(11, 14, 17, 0.95)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid #252D34',
                                borderRadius: 12,
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                                color: '#E8EDF0',
                                fontSize: 12,
                              }}
                              labelStyle={{ color: '#9BA8B2', fontWeight: 600, marginBottom: 4 }}
                              itemStyle={{ color: '#E8EDF0' }}
                            />
                            <Legend wrapperStyle={{ color: '#9BA8B2', fontSize: 12 }} />
                            <Line
                              type="monotone"
                              dataKey="modis"
                              name="MODIS (Terra + Aqua)"
                              stroke="#38BDF8"
                              strokeWidth={2.25}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="viirs"
                              name="VIIRS (Suomi-NPP)"
                              stroke="#F0A34A"
                              strokeWidth={2.25}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sensor Shift Analyzer Component */}
              <SensorShiftAnalyzer />
            </div>

            {/* SUBSECTION B: RETROSPECTIVE HARMONIZATION (2013–2025 · 156 MONTHS) */}
            <div className="mt-20 pt-16 border-t border-[#252D34]/70 space-y-8">
              <div className="border-l-2 border-[#38BDF8] pl-4">
                <span className="text-xs font-mono uppercase tracking-wider text-[#38BDF8]">
                  Dataset Scope B · 2013–2025 Retrospective Harmonization (156 Months)
                </span>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl text-[#E8EDF0]">
                  Held-Out National & Regional Harmonization
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#9BA8B2]">
                  Statistical scaling factors fitted on 2013–2021, model structure selected on 2022–2023, and final predictive agreement evaluated on the chronologically held-out 2024–2025 test series.
                </p>
              </div>

              <HarmonizationResults />
              <RegionalHarmonizationResults />
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: RESEARCH & METHODS (METHODOLOGY CARDS + GITHUB WORKING LINK)       */}
        {/* ========================================================================= */}
        {currentView === 'research-methods' && (
          <section id="research-methods" aria-labelledby="methods-heading" className="space-y-12 animate-view-fade">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#252D34] bg-[#151A1F] px-3 py-1 font-mono text-xs tracking-widest text-[#F0A34A]">
                04 / RESEARCH & METHODS
              </div>
              <h1
                id="methods-heading"
                ref={viewHeadingRef}
                tabIndex={-1}
                onBlur={() => setShowHeadingFocus(false)}
                className={`mt-4 font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-[#E8EDF0] leading-[1.08] outline-none rounded-lg transition-shadow w-fit ${
                  showHeadingFocus
                    ? 'ring-2 ring-[#F0A34A] ring-offset-4 ring-offset-[#0B0E11]'
                    : ''
                }`}
              >
                Scientific Methodology & Limitations
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#9BA8B2] sm:text-lg">
                Data provenance, spatial projection protocols, validation partitioning, and essential observational caveats.
              </p>
            </div>

            {/* 2x2 Methodology Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 lg:p-8">
                <h2 className="text-lg font-semibold text-[#E8EDF0]">1. Data Sources & Observation Architecture</h2>
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
                <h2 className="text-lg font-semibold text-[#E8EDF0]">2. Spatial Metric: Occupied Grid-Cell-Days (OGCD)</h2>
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
                <h2 className="text-lg font-semibold text-[#E8EDF0]">3. Chronological Evaluation Architecture</h2>
                <p className="mt-2 text-sm leading-6 text-[#9BA8B2]">
                  Statistical adjustments are evaluated using chronological data splits to eliminate lookahead bias:
                </p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#9BA8B2]">
                  <li>• <strong className="text-[#E8EDF0]">Training (2013–2021):</strong> Fit global, seasonal, and regional scaling factors.</li>
                  <li>• <strong className="text-[#E8EDF0]">Validation (2022–2023):</strong> Select best-performing model structure.</li>
                  <li>• <strong className="text-[#E8EDF0]">Held-Out Test (2024–2025):</strong> Evaluate prediction accuracy against observed MODIS OGCD.</li>
                  <li>• Regularized seasonal adjustment achieves 19.7% lower MAE nationally relative to national global scaling, and 38.6% lower MAE regionally relative to national seasonal adjustment.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[#252D34] bg-[#151A1F] p-6 lg:p-8">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-mono text-xs font-semibold text-[#F0A34A]">
                    STATUS: NOT VALIDATED
                  </span>
                  <h2 className="text-lg font-semibold text-[#E8EDF0]">4. Key Calibration Limitations</h2>
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
            <div className="rounded-2xl border border-[#F0A34A]/30 bg-[#F0A34A]/5 p-6 sm:p-8">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-semibold text-[#E8EDF0]">
                    Read the Full Scientific Methodology
                  </h2>
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
        )}
      </main>

      {/* Redesigned Compact Modern Footer */}
      <footer className="mt-20 border-t border-[#252D34] bg-[#0A0D10] py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            {/* Left: Brand Lockup */}
            <a
              href="#observatory"
              onClick={(e) => handleNavClick('observatory', e)}
              className="flex items-center gap-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] rounded-lg"
              aria-label="FireSignal Observatory Home"
            >
              <FireSignalIcon size={32} />
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-[#E8EDF0] leading-tight">
                  Fire<span className="text-[#F0A34A]">Signal</span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#9BA8B2] leading-none mt-0.5">
                  Satellite Fire Intelligence · India
                </span>
              </div>
            </a>

            {/* Navigation Destinations & Links */}
            <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 text-xs sm:text-sm text-[#9BA8B2]">
              <a
                href="#observatory"
                onClick={(e) => handleNavClick('observatory', e)}
                className={`transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] ${
                  currentView === 'observatory' ? 'text-[#F0A34A] font-semibold' : 'hover:text-[#E8EDF0]'
                }`}
              >
                Observatory
              </a>
              <a
                href="#historical-patterns"
                onClick={(e) => handleNavClick('historical-patterns', e)}
                className={`transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] ${
                  currentView === 'historical-patterns' ? 'text-[#F0A34A] font-semibold' : 'hover:text-[#E8EDF0]'
                }`}
              >
                Historical Patterns
              </a>
              <a
                href="#sensor-laboratory"
                onClick={(e) => handleNavClick('sensor-laboratory', e)}
                className={`transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] ${
                  currentView === 'sensor-laboratory' ? 'text-[#F0A34A] font-semibold' : 'hover:text-[#E8EDF0]'
                }`}
              >
                Sensor Laboratory
              </a>
              <a
                href="#research-methods"
                onClick={(e) => handleNavClick('research-methods', e)}
                className={`transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A] ${
                  currentView === 'research-methods' ? 'text-[#F0A34A] font-semibold' : 'hover:text-[#E8EDF0]'
                }`}
              >
                Research & Methods
              </a>
              <a
                href="https://github.com/pushkarscripts/FireSignal/blob/main/METHODOLOGY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#9BA8B2] transition hover:text-[#F0A34A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
              >
                <span>Methodology</span>
                <ExternalLink size={12} />
              </a>
              <a
                href="https://github.com/pushkarscripts/FireSignal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#9BA8B2] transition hover:text-[#F0A34A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0A34A]"
              >
                <span>GitHub</span>
                <ExternalLink size={12} />
              </a>
            </nav>
          </div>

          {/* Bottom Bar: Prominent Space Apps 2026 Credit */}
          <div className="mt-8 border-t border-[#252D34]/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9BA8B2]">
            <p className="text-center sm:text-left">
              Made with <span className="text-[#F0A34A] text-sm leading-none" aria-label="love">♥</span> by{' '}
              <span className="font-medium text-[#E8EDF0]">Pushkar</span> for{' '}
              <span className="font-medium text-[#E8EDF0]">NASA Space Apps Challenge 2026</span>
            </p>
            <p className="font-mono text-[11px] text-[#9BA8B2]">
              <span className="font-semibold">Data courtesy:</span> NASA FIRMS (MODIS & VIIRS)
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

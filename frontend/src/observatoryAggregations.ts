export type Sensor = 'MODIS' | 'VIIRS'

export interface RegionalRecord {
  sensor: Sensor
  region: string
  month: string // "YYYY-MM"
  ogcd: number
  daysWithDetections: number
}

export interface RegionSummary {
  totalOgcd: number
  totalDays: number
  monthCount: number
  peakMonth: string
  peakOgcd: number
  months: RegionalRecord[]
}

export interface MonthlyDatumSummary {
  monthKey: string
  shortName: string
  fullName: string
  ogcd: number | null
  displayOgcd: number
  daysWithDetections: number | null
  hasRecord: boolean
}

export type ObservationStatus = 'missing' | 'zero' | 'observed'

export const MONTH_SHORT: readonly string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

export const MONTH_FULL: readonly string[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

/**
 * Returns number of calendar days in a month specified as "YYYY-MM".
 */
export function getDaysInMonth(yearMonth: string): number {
  const parts = yearMonth.split('-')
  if (parts.length < 2) return 0
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return 0
  return new Date(y, m, 0).getDate()
}

/**
 * Calculates calendar days in a given calendar year, correctly accounting for leap years.
 */
export function computeDaysInYear(year: number | string): number {
  const y = typeof year === 'number' ? year : parseInt(year, 10)
  if (isNaN(y)) return 365
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365
}

/**
 * Filters an array of regional records by satellite sensor and calendar year.
 */
export function filterRecordsBySensorAndYear(
  records: RegionalRecord[],
  sensor: Sensor,
  year: string
): RegionalRecord[] {
  return records.filter((r) => r.sensor === sensor && r.month.startsWith(year))
}

/**
 * Aggregates monthly regional records for a given sensor-year into regional totals.
 * Accurately calculates annual OGCD sum, sum of monthly distinct detection days,
 * and identifies the peak burning month.
 */
export function computeRegionTotals(
  recordsForSensorYear: RegionalRecord[]
): Map<string, RegionSummary> {
  const map = new Map<string, RegionSummary>()

  for (const rec of recordsForSensorYear) {
    const prev = map.get(rec.region) ?? {
      totalOgcd: 0,
      totalDays: 0,
      monthCount: 0,
      peakMonth: '',
      peakOgcd: -1,
      months: [],
    }

    const newTotal = prev.totalOgcd + rec.ogcd
    const newDays = prev.totalDays + rec.daysWithDetections
    const isPeak = rec.ogcd > prev.peakOgcd

    map.set(rec.region, {
      totalOgcd: newTotal,
      totalDays: newDays,
      monthCount: prev.monthCount + 1,
      peakMonth: isPeak ? rec.month : prev.peakMonth,
      peakOgcd: isPeak ? rec.ogcd : prev.peakOgcd,
      months: [...prev.months, rec],
    })
  }

  return map
}

/**
 * Constructs a continuous 12-month sequence for a selected region, sensor, and year.
 * Distinguishes recorded zero/positive values from unobserved (null) months.
 */
export function computeMonthlySequence(
  allRecords: RegionalRecord[],
  region: string,
  sensor: Sensor,
  year: string
): MonthlyDatumSummary[] {
  const recordsForRegion = allRecords.filter(
    (r) => r.region === region && r.sensor === sensor && r.month.startsWith(year)
  )
  const monthMap = new Map<string, RegionalRecord>()
  for (const r of recordsForRegion) {
    monthMap.set(r.month, r)
  }

  return Array.from({ length: 12 }, (_, i) => {
    const monthNum = String(i + 1).padStart(2, '0')
    const monthKey = `${year}-${monthNum}`
    const rec = monthMap.get(monthKey)

    return {
      monthKey,
      shortName: MONTH_SHORT[i] ?? '',
      fullName: MONTH_FULL[i] ?? '',
      ogcd: rec ? rec.ogcd : null,
      displayOgcd: rec ? rec.ogcd : 0,
      daysWithDetections: rec ? rec.daysWithDetections : null,
      hasRecord: !!rec,
    }
  })
}

/**
 * Classifies the observational status of a region's summary.
 * Correctly differentiates:
 * - 'missing': region has no records in the dataset for that sensor and year
 * - 'zero': region has explicit records with 0 OGCD
 * - 'observed': region has recorded detections with OGCD > 0
 */
export function classifyObservationState(
  summary: RegionSummary | undefined | null
): { hasRecord: boolean; status: ObservationStatus } {
  if (!summary || summary.monthCount === 0) {
    return { hasRecord: false, status: 'missing' }
  }
  if (summary.totalOgcd === 0) {
    return { hasRecord: true, status: 'zero' }
  }
  return { hasRecord: true, status: 'observed' }
}

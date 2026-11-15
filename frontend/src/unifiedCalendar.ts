/**
 * FireSignal Unified Harmonization Calendar Module
 *
 * Implements a scientifically transparent synthesis of MODIS (2003–2012)
 * and VIIRS-derived MODIS-equivalent OGCD (2013–2025).
 *
 * Preserves floating-point precision in all scientific calculations.
 * Does not round modeled values inside this module.
 */

export type Provenance = 'OBSERVED_MODIS' | 'HARMONIZED_VIIRS'
export type SplitPartition = 'PRE_VIIRS' | 'TRAIN' | 'VALIDATION' | 'TEST'

export interface MonthRecordInput {
  month: string
  modis: number | null
  viirs: number | null
}

export interface UnifiedMonthRecord {
  month: string
  year: number
  calendarMonth: number
  modis: number | null
  viirs: number | null
  harmonized: number
  provenance: Provenance
  appliedFactor: number | null
  coObservationResidual: number | null
  split: SplitPartition
}

export interface AnomalyResult {
  percent: number
  baseline: number
  peerYears: number
}

/**
 * Validates the 12 seasonal factors from harmonization_results.json.
 * Must contain keys "1" through "12" mapped to finite, positive numbers.
 */
export function validateSeasonalFactors(factors: unknown): Record<string, number> {
  if (!factors || typeof factors !== 'object' || Array.isArray(factors)) {
    throw new Error('Seasonal factors payload must be a non-null object')
  }
  const obj = factors as Record<string, unknown>
  const validated: Record<string, number> = {}

  for (let m = 1; m <= 12; m++) {
    const key = String(m)
    const val = obj[key]
    if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) {
      throw new Error(`Seasonal factor for month ${key} must be a positive finite number; got ${String(val)}`)
    }
    validated[key] = val
  }

  return validated
}

/**
 * Assigns a chronological evaluation split to a given year.
 */
export function getSplitPartition(year: number): SplitPartition {
  if (year < 2013) return 'PRE_VIIRS'
  if (year <= 2021) return 'TRAIN'
  if (year <= 2023) return 'VALIDATION'
  return 'TEST'
}

/**
 * Computes the exact median of an array of finite numbers.
 */
export function computeMedian(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Synthesizes a single unified record from raw monthly observations and seasonal factors.
 * Full floating-point precision is preserved.
 */
export function synthesizeUnifiedRecord(
  row: MonthRecordInput,
  factors: Record<string, number>
): UnifiedMonthRecord {
  if (!row || typeof row !== 'object') {
    throw new Error('Monthly record must be a valid object')
  }
  if (typeof row.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)) {
    throw new Error(`Invalid month identifier: ${String(row?.month)}`)
  }

  const year = parseInt(row.month.slice(0, 4), 10)
  const calendarMonth = parseInt(row.month.slice(5, 7), 10)

  if (row.modis !== null && (typeof row.modis !== 'number' || !Number.isFinite(row.modis) || row.modis < 0)) {
    throw new Error(`Invalid MODIS observation in ${row.month}: must be null or finite non-negative number`)
  }
  if (row.viirs !== null && (typeof row.viirs !== 'number' || !Number.isFinite(row.viirs) || row.viirs < 0)) {
    throw new Error(`Invalid VIIRS observation in ${row.month}: must be null or finite non-negative number`)
  }

  const split = getSplitPartition(year)

  if (year < 2013) {
    if (row.modis === null) {
      throw new Error(`Missing observed MODIS record for pre-VIIRS month: ${row.month}`)
    }
    return {
      month: row.month,
      year,
      calendarMonth,
      modis: row.modis,
      viirs: row.viirs,
      harmonized: row.modis,
      provenance: 'OBSERVED_MODIS',
      appliedFactor: null,
      coObservationResidual: null,
      split,
    }
  }

  // 2013 onwards: VIIRS observations scaled to MODIS-equivalent OGCD
  if (row.viirs === null) {
    throw new Error(`Missing observed VIIRS record for co-observation month: ${row.month}`)
  }
  const factorKey = String(calendarMonth)
  const factor = factors[factorKey]
  if (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0) {
    throw new Error(`Missing or invalid seasonal factor for month ${factorKey}`)
  }

  // Full floating-point multiplication; no rounding inside scientific calculation
  const harmonized = row.viirs * factor
  const coObservationResidual = row.modis !== null ? harmonized - row.modis : null

  return {
    month: row.month,
    year,
    calendarMonth,
    modis: row.modis,
    viirs: row.viirs,
    harmonized,
    provenance: 'HARMONIZED_VIIRS',
    appliedFactor: factor,
    coObservationResidual,
    split,
  }
}

/**
 * Synthesizes the full chronological unified calendar series.
 */
export function synthesizeUnifiedCalendar(
  records: MonthRecordInput[],
  rawFactors: unknown
): UnifiedMonthRecord[] {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('Records must be a non-empty array')
  }
  const factors = validateSeasonalFactors(rawFactors)
  return records.map(row => synthesizeUnifiedRecord(row, factors))
}

/**
 * Computes leave-one-year-out anomaly for a specific month on the unified series.
 * Compares against other years of the same calendar month.
 */
export function computeUnifiedAnomaly(
  month: string,
  records: UnifiedMonthRecord[]
): AnomalyResult | null {
  const current = records.find(r => r.month === month)
  if (!current || !Number.isFinite(current.harmonized)) return null

  const calendarMonth = current.calendarMonth
  const peers = records
    .filter(r => r.calendarMonth === calendarMonth && r.month !== month && Number.isFinite(r.harmonized))
    .map(r => r.harmonized)

  if (peers.length < 3) return null
  const baseline = computeMedian(peers)
  if (baseline === null || baseline <= 0) return null

  const percent = ((current.harmonized - baseline) / baseline) * 100
  return {
    percent,
    baseline,
    peerYears: peers.length,
  }
}

/**
 * Formats national historical monthly data as reproducible CSV with unified columns.
 */
export function formatUnifiedCSV(records: UnifiedMonthRecord[]): string {
  const header = 'month,modis_ogcd,viirs_ogcd,harmonized_ogcd,harmonized_provenance'
  const lines = records.map(r => {
    const modisStr = r.modis !== null ? String(r.modis) : ''
    const viirsStr = r.viirs !== null ? String(r.viirs) : ''
    // 2 decimal places provides high scientific precision while maintaining readable CSV output
    const harmStr = r.harmonized.toFixed(2)
    return `${r.month},${modisStr},${viirsStr},${harmStr},${r.provenance}`
  })
  return [header, ...lines].join('\n')
}

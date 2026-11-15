import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type MonthRecordInput,
  type UnifiedMonthRecord,
  validateSeasonalFactors,
  getSplitPartition,
  synthesizeUnifiedRecord,
  synthesizeUnifiedCalendar,
  computeUnifiedAnomaly,
  formatUnifiedCSV,
} from '../src/unifiedCalendar.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CALENDAR_PATH = path.join(ROOT, 'public', 'data', 'historical_calendar_5km.json')
const HARM_PATH = path.join(ROOT, 'public', 'data', 'harmonization_results.json')

const calendarJson: MonthRecordInput[] = JSON.parse(fs.readFileSync(CALENDAR_PATH, 'utf8'))
const harmJson = JSON.parse(fs.readFileSync(HARM_PATH, 'utf8'))
const seasonalFactors = harmJson.seasonal_factors as Record<string, number>

test('Unified Harmonized Calendar — Scientific Verification Suite', async (t) => {
  await t.test('1. All 276 historical months are present and chronologically aligned', () => {
    assert.strictEqual(calendarJson.length, 276, 'Archive must contain exactly 276 months (2003–2025)')
    const unified = synthesizeUnifiedCalendar(calendarJson, seasonalFactors)
    assert.strictEqual(unified.length, 276, 'Synthesized series must produce 276 records')

    let expectedYear = 2003
    let expectedMonth = 1
    for (const r of unified) {
      const expectedKey = `${expectedYear}-${String(expectedMonth).padStart(2, '0')}`
      assert.strictEqual(r.month, expectedKey, `Chronological alignment failed at ${r.month}`)
      assert.strictEqual(r.year, expectedYear)
      assert.strictEqual(r.calendarMonth, expectedMonth)
      expectedMonth++
      if (expectedMonth > 12) {
        expectedMonth = 1
        expectedYear++
      }
    }
  })

  await t.test('2. Exact observed MODIS values for 2003–2012 (pre-VIIRS era)', () => {
    const unified = synthesizeUnifiedCalendar(calendarJson, seasonalFactors)
    const preViirs = unified.filter(r => r.year < 2013)
    assert.strictEqual(preViirs.length, 120, 'Pre-VIIRS era must comprise exactly 120 months (10 years)')

    for (const r of preViirs) {
      assert.strictEqual(r.provenance, 'OBSERVED_MODIS')
      assert.strictEqual(r.appliedFactor, null)
      assert.strictEqual(r.coObservationResidual, null)
      assert.strictEqual(r.viirs, null, 'VIIRS must remain null for 2003–2012')
      assert.ok(typeof r.modis === 'number' && Number.isFinite(r.modis) && r.modis > 0)
      assert.strictEqual(r.harmonized, r.modis, 'Harmonized value must strictly equal observed MODIS for pre-VIIRS era')
    }
  })

  await t.test('3. VIIRS × seasonal factor for 2013–2025 (co-observation era)', () => {
    const unified = synthesizeUnifiedCalendar(calendarJson, seasonalFactors)
    const coObs = unified.filter(r => r.year >= 2013)
    assert.strictEqual(coObs.length, 156, 'Co-observation era must comprise exactly 156 months (13 years)')

    for (const r of coObs) {
      assert.strictEqual(r.provenance, 'HARMONIZED_VIIRS')
      assert.ok(typeof r.viirs === 'number' && r.viirs > 0)
      const factor = seasonalFactors[String(r.calendarMonth)]
      assert.strictEqual(r.appliedFactor, factor)
      const expected = r.viirs * factor
      assert.strictEqual(r.harmonized, expected, `Mismatch in ${r.month}: expected ${expected}, got ${r.harmonized}`)
    }
  })

  await t.test('4. Preservation of floating-point precision (no premature rounding)', () => {
    const dummyRecord: MonthRecordInput = {
      month: '2024-01',
      modis: 3906,
      viirs: 18460,
    }
    // factor for Jan is 0.18765 -> 18460 * 0.18765 = 3464.0190000000002
    const rec = synthesizeUnifiedRecord(dummyRecord, seasonalFactors)
    const exactExpected = 18460 * seasonalFactors['1']
    assert.strictEqual(rec.harmonized, exactExpected, 'Helper must preserve exact floating-point product')
    assert.ok(Math.abs(rec.harmonized - 3464.019) < 1e-9)
    assert.notStrictEqual(rec.harmonized, Math.round(rec.harmonized), 'Must not be prematurely rounded to integer')
  })

  await t.test('5. Missing or invalid seasonal coefficients reject clearly', () => {
    assert.throws(
      () => validateSeasonalFactors(null),
      /Seasonal factors payload must be a non-null object/
    )
    assert.throws(
      () => validateSeasonalFactors({ '1': 0.18, '2': -0.15 }),
      /Seasonal factor for month 2 must be a positive finite number/
    )
    assert.throws(
      () => validateSeasonalFactors({ '1': 0.18, '2': 0 }),
      /Seasonal factor for month 2 must be a positive finite number/
    )
    const incomplete = { ...seasonalFactors }
    delete (incomplete as Record<string, unknown>)['12']
    assert.throws(
      () => validateSeasonalFactors(incomplete),
      /Seasonal factor for month 12 must be a positive finite number/
    )
  })

  await t.test('6. Missing or invalid source observations reject clearly', () => {
    // Missing MODIS in pre-2013
    assert.throws(
      () => synthesizeUnifiedRecord({ month: '2010-05', modis: null, viirs: null }, seasonalFactors),
      /Missing observed MODIS record for pre-VIIRS month: 2010-05/
    )
    // Missing VIIRS in post-2013
    assert.throws(
      () => synthesizeUnifiedRecord({ month: '2015-05', modis: 5000, viirs: null }, seasonalFactors),
      /Missing observed VIIRS record for co-observation month: 2015-05/
    )
    // Negative observations
    assert.throws(
      () => synthesizeUnifiedRecord({ month: '2015-05', modis: -10, viirs: 5000 }, seasonalFactors),
      /Invalid MODIS observation in 2015-05/
    )
    assert.throws(
      () => synthesizeUnifiedRecord({ month: '2015-05', modis: 5000, viirs: -50 }, seasonalFactors),
      /Invalid VIIRS observation in 2015-05/
    )
    // Invalid month string
    assert.throws(
      () => synthesizeUnifiedRecord({ month: '2015-13', modis: 5000, viirs: 5000 }, seasonalFactors),
      /Invalid month identifier/
    )
  })

  await t.test('7. Provenance and sensor-transition assignment across chronological splits', () => {
    assert.strictEqual(getSplitPartition(2003), 'PRE_VIIRS')
    assert.strictEqual(getSplitPartition(2012), 'PRE_VIIRS')
    assert.strictEqual(getSplitPartition(2013), 'TRAIN')
    assert.strictEqual(getSplitPartition(2021), 'TRAIN')
    assert.strictEqual(getSplitPartition(2022), 'VALIDATION')
    assert.strictEqual(getSplitPartition(2023), 'VALIDATION')
    assert.strictEqual(getSplitPartition(2024), 'TEST')
    assert.strictEqual(getSplitPartition(2025), 'TEST')

    const unified = synthesizeUnifiedCalendar(calendarJson, seasonalFactors)
    const dec2012 = unified.find(r => r.month === '2012-12')!
    const jan2013 = unified.find(r => r.month === '2013-01')!

    assert.strictEqual(dec2012.provenance, 'OBSERVED_MODIS')
    assert.strictEqual(dec2012.split, 'PRE_VIIRS')
    assert.strictEqual(jan2013.provenance, 'HARMONIZED_VIIRS')
    assert.strictEqual(jan2013.split, 'TRAIN')
  })

  await t.test('8. Co-observation residual calculations during 2013–2025 overlap', () => {
    const unified = synthesizeUnifiedCalendar(calendarJson, seasonalFactors)
    const mar2024 = unified.find(r => r.month === '2024-03')!
    assert.ok(mar2024.modis !== null && mar2024.viirs !== null)
    const expectedResidual = mar2024.harmonized - mar2024.modis
    assert.strictEqual(mar2024.coObservationResidual, expectedResidual)

    // Pre-2013 residual is strictly null
    const jun2008 = unified.find(r => r.month === '2008-06')!
    assert.strictEqual(jun2008.coObservationResidual, null)
  })

  await t.test('9. Leave-one-year-out anomaly calculations', () => {
    const fixture: UnifiedMonthRecord[] = [
      { month: '2021-03', year: 2021, calendarMonth: 3, modis: 100, viirs: 500, harmonized: 100, provenance: 'OBSERVED_MODIS', appliedFactor: null, coObservationResidual: null, split: 'TRAIN' },
      { month: '2022-03', year: 2022, calendarMonth: 3, modis: 200, viirs: 1000, harmonized: 200, provenance: 'HARMONIZED_VIIRS', appliedFactor: 0.2, coObservationResidual: 0, split: 'VALIDATION' },
      { month: '2023-03', year: 2023, calendarMonth: 3, modis: 300, viirs: 1500, harmonized: 300, provenance: 'HARMONIZED_VIIRS', appliedFactor: 0.2, coObservationResidual: 0, split: 'VALIDATION' },
      { month: '2024-03', year: 2024, calendarMonth: 3, modis: 400, viirs: 2000, harmonized: 400, provenance: 'HARMONIZED_VIIRS', appliedFactor: 0.2, coObservationResidual: 0, split: 'TEST' },
    ]

    // Evaluating 2024-03: peers are [100, 200, 300], median is 200
    // Anomaly = ((400 - 200) / 200) * 100 = +100%
    const anom24 = computeUnifiedAnomaly('2024-03', fixture)
    assert.ok(anom24 !== null)
    assert.strictEqual(anom24.baseline, 200)
    assert.strictEqual(anom24.percent, 100)
    assert.strictEqual(anom24.peerYears, 3)

    // Insufficient peers (< 3)
    const smallFixture = fixture.slice(0, 2)
    assert.strictEqual(computeUnifiedAnomaly('2021-03', smallFixture), null)
  })

  await t.test('10. CSV formatting, precision, and missing-value blank preservation', () => {
    const unified = synthesizeUnifiedCalendar(calendarJson, seasonalFactors)
    const csv = formatUnifiedCSV(unified)
    const lines = csv.split('\n')

    assert.strictEqual(lines.length, 277, 'CSV must have 1 header line + 276 monthly data lines')
    assert.strictEqual(lines[0], 'month,modis_ogcd,viirs_ogcd,harmonized_ogcd,harmonized_provenance')

    // First line (2003-01): viirs is blank, harmonized has 2 decimals
    const firstData = lines[1].split(',')
    assert.strictEqual(firstData[0], '2003-01')
    assert.strictEqual(firstData[1], String(calendarJson[0].modis))
    assert.strictEqual(firstData[2], '', 'VIIRS must be empty string in 2003-01, not 0')
    assert.strictEqual(firstData[3], `${calendarJson[0].modis}.00`)
    assert.strictEqual(firstData[4], 'OBSERVED_MODIS')

    // Modern line (2024-01)
    const row2024 = lines.find(l => l.startsWith('2024-01'))!
    const parts2024 = row2024.split(',')
    assert.strictEqual(parts2024[0], '2024-01')
    assert.strictEqual(parts2024[1], '3906')
    assert.strictEqual(parts2024[2], '18460')
    assert.strictEqual(parts2024[3], '3464.02') // 18460 * 0.18765 = 3464.019 -> 3464.02
    assert.strictEqual(parts2024[4], 'HARMONIZED_VIIRS')
  })
})

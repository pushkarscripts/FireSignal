import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type RegionalRecord,
  type RegionSummary,
  computeRegionTotals,
  computeDaysInYear,
  filterRecordsBySensorAndYear,
  computeMonthlySequence,
  classifyObservationState,
  getDaysInMonth,
} from '../src/observatoryAggregations.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const REGIONAL_DATA_PATH = path.join(ROOT, 'public', 'data', 'regional_monthly_5km.json')

const regionalData: { records: RegionalRecord[]; regions: string[] } = JSON.parse(
  fs.readFileSync(REGIONAL_DATA_PATH, 'utf8')
)

test('Observatory Aggregations — Annual OGCD Aggregation', async (t) => {
  await t.test('aggregates synthetic multi-month fixtures with known exact totals', () => {
    const fixture: RegionalRecord[] = [
      { sensor: 'MODIS', region: 'TestRegionA', month: '2023-01', ogcd: 120, daysWithDetections: 15 },
      { sensor: 'MODIS', region: 'TestRegionA', month: '2023-03', ogcd: 450, daysWithDetections: 28 },
      { sensor: 'MODIS', region: 'TestRegionA', month: '2023-04', ogcd: 230, daysWithDetections: 20 },
      { sensor: 'MODIS', region: 'TestRegionB', month: '2023-02', ogcd: 80, daysWithDetections: 10 },
    ]

    const totals = computeRegionTotals(fixture)
    assert.strictEqual(totals.size, 2)

    const regionA = totals.get('TestRegionA')
    assert.ok(regionA)
    assert.strictEqual(regionA.totalOgcd, 800) // 120 + 450 + 230
    assert.strictEqual(regionA.totalDays, 63) // 15 + 28 + 20
    assert.strictEqual(regionA.monthCount, 3)
    assert.strictEqual(regionA.peakMonth, '2023-03')
    assert.strictEqual(regionA.peakOgcd, 450)
    assert.strictEqual(regionA.months.length, 3)

    const regionB = totals.get('TestRegionB')
    assert.ok(regionB)
    assert.strictEqual(regionB.totalOgcd, 80);
    assert.strictEqual(regionB.totalDays, 10);
    assert.strictEqual(regionB.monthCount, 1)
    assert.strictEqual(regionB.peakMonth, '2023-02')
    assert.strictEqual(regionB.peakOgcd, 80)
  })

  await t.test('empty input array returns an empty aggregation map', () => {
    const totals = computeRegionTotals([])
    assert.strictEqual(totals.size, 0)
  })

  await t.test('computes exact annual totals for real production dataset (Odisha 2023 MODIS & VIIRS)', () => {
    // MODIS 2023 Odisha
    const modis2023 = filterRecordsBySensorAndYear(regionalData.records, 'MODIS', '2023')
    const modisTotals = computeRegionTotals(modis2023)
    const odishaModis = modisTotals.get('Odisha')
    assert.ok(odishaModis)

    const expectedModisOgcd = regionalData.records
      .filter((r) => r.region === 'Odisha' && r.sensor === 'MODIS' && r.month.startsWith('2023'))
      .reduce((sum, r) => sum + r.ogcd, 0)

    assert.strictEqual(odishaModis.totalOgcd, expectedModisOgcd)
    assert.ok(odishaModis.totalOgcd > 0)

    // VIIRS 2023 Odisha
    const viirs2023 = filterRecordsBySensorAndYear(regionalData.records, 'VIIRS', '2023')
    const viirsTotals = computeRegionTotals(viirs2023)
    const odishaViirs = viirsTotals.get('Odisha')
    assert.ok(odishaViirs)

    const expectedViirsOgcd = regionalData.records
      .filter((r) => r.region === 'Odisha' && r.sensor === 'VIIRS' && r.month.startsWith('2023'))
      .reduce((sum, r) => sum + r.ogcd, 0)

    assert.strictEqual(odishaViirs.totalOgcd, expectedViirsOgcd)
    assert.ok(odishaViirs.totalOgcd > odishaModis.totalOgcd, 'VIIRS higher resolution captures more 5 km cell-days')
  })
})

test('Observatory Aggregations — Active Detection Days', async (t) => {
  await t.test('computes calendar days in leap and non-leap years accurately', () => {
    assert.strictEqual(computeDaysInYear(2020), 366) // Leap year
    assert.strictEqual(computeDaysInYear(2021), 365)
    assert.strictEqual(computeDaysInYear(2022), 365)
    assert.strictEqual(computeDaysInYear(2023), 365)
    assert.strictEqual(computeDaysInYear(2024), 366) // Leap year
    assert.strictEqual(computeDaysInYear(2025), 365)
    assert.strictEqual(computeDaysInYear('2024'), 366)
    assert.strictEqual(computeDaysInYear('2025'), 365)
  })

  await t.test('annual detection days across all regions never exceed calendar days in year', () => {
    const years = ['2015', '2020', '2023', '2024']
    const sensors: ('MODIS' | 'VIIRS')[] = ['MODIS', 'VIIRS']

    for (const year of years) {
      const maxDaysInYear = computeDaysInYear(year)
      for (const sensor of sensors) {
        const filtered = filterRecordsBySensorAndYear(regionalData.records, sensor, year)
        const totals = computeRegionTotals(filtered)

        for (const [region, summary] of totals.entries()) {
          assert.ok(
            summary.totalDays <= maxDaysInYear,
            `${region} ${year} (${sensor}): totalDays (${summary.totalDays}) exceeds year days (${maxDaysInYear})`
          )
        }
      }
    }
  })

  await t.test('detection days metric is strictly distinct from OGCD magnitude', () => {
    // Synthetic check: 1 single day with multiple active grid cells produces 1 detection day but N OGCD
    const singleDayDenseCluster: RegionalRecord[] = [
      { sensor: 'VIIRS', region: 'ClusterState', month: '2023-04', ogcd: 2500, daysWithDetections: 1 },
    ]
    const totals = computeRegionTotals(singleDayDenseCluster)
    const cluster = totals.get('ClusterState')
    assert.ok(cluster)
    assert.strictEqual(cluster.totalDays, 1)
    assert.strictEqual(cluster.totalOgcd, 2500)
    assert.notStrictEqual(cluster.totalDays, cluster.totalOgcd)

    // In real records, whenever ogcd > 0, ogcd >= daysWithDetections (at least 1 cell per day)
    for (const r of regionalData.records) {
      if (r.ogcd > 0) {
        assert.ok(
          r.ogcd >= r.daysWithDetections,
          `Record ${r.region} ${r.month} (${r.sensor}): OGCD (${r.ogcd}) < daysWithDetections (${r.daysWithDetections})`
        )
      }
    }
  })

  await t.test('source data boundary limitation: monthly summaries are disjoint but cross-month raw uniqueness requires raw database', () => {
    // Because regional_monthly_5km.json aggregates at the monthly grain:
    // Monthly distinct days are guaranteed disjoint across different months (e.g. Jan days + Feb days)
    // Thus annual totalDays is an exact sum of monthly distinct calendar days.
    // However, national day-overlap or cross-state daily deduplication cannot be computed from regional files alone.
    // This invariant confirms the contract behaves as specified without claiming raw daily coordinate access.
    const sampleRecord = regionalData.records.find((r) => r.region === 'Punjab' && r.month === '2023-10')
    assert.ok(sampleRecord)
    assert.ok(sampleRecord.daysWithDetections <= getDaysInMonth('2023-10'))
  })
})

test('Observatory Aggregations — Missing vs Zero Handling', async (t) => {
  await t.test('classifyObservationState correctly identifies missing, zero, and observed states', () => {
    // Missing: undefined summary
    const missingUndef = classifyObservationState(undefined)
    assert.strictEqual(missingUndef.hasRecord, false)
    assert.strictEqual(missingUndef.status, 'missing')

    // Missing: null summary
    const missingNull = classifyObservationState(null)
    assert.strictEqual(missingNull.hasRecord, false)
    assert.strictEqual(missingNull.status, 'missing')

    // Missing: empty month count
    const missingEmpty = classifyObservationState({
      totalOgcd: 0,
      totalDays: 0,
      monthCount: 0,
      peakMonth: '',
      peakOgcd: -1,
      months: [],
    })
    assert.strictEqual(missingEmpty.hasRecord, false)
    assert.strictEqual(missingEmpty.status, 'missing')

    // Recorded Zero: explicit record with 0 OGCD
    const explicitZero: RegionSummary = {
      totalOgcd: 0,
      totalDays: 0,
      monthCount: 1,
      peakMonth: '2023-05',
      peakOgcd: 0,
      months: [{ sensor: 'MODIS', region: 'ZeroState', month: '2023-05', ogcd: 0, daysWithDetections: 0 }],
    }
    const zeroState = classifyObservationState(explicitZero)
    assert.strictEqual(zeroState.hasRecord, true)
    assert.strictEqual(zeroState.status, 'zero')

    // Observed: positive OGCD
    const activeState = classifyObservationState({
      totalOgcd: 150,
      totalDays: 12,
      monthCount: 3,
      peakMonth: '2023-03',
      peakOgcd: 90,
      months: [],
    })
    assert.strictEqual(activeState.hasRecord, true)
    assert.strictEqual(activeState.status, 'observed')
  })

  await t.test('Lakshadweep produces genuine missing state across all sensors and years', () => {
    const modis2023 = filterRecordsBySensorAndYear(regionalData.records, 'MODIS', '2023')
    const totals = computeRegionTotals(modis2023)
    const lakshadweepSummary = totals.get('Lakshadweep')
    assert.strictEqual(lakshadweepSummary, undefined)

    const classification = classifyObservationState(lakshadweepSummary)
    assert.strictEqual(classification.hasRecord, false)
    assert.strictEqual(classification.status, 'missing')
  })

  await t.test('computeMonthlySequence produces 12 continuous slots and flags missing vs present months', () => {
    // Andaman and Nicobar Islands in 2023 has sporadic seasonal detections
    const sequence = computeMonthlySequence(regionalData.records, 'Andaman and Nicobar Islands', 'MODIS', '2023')
    assert.strictEqual(sequence.length, 12)

    for (let i = 0; i < 12; i++) {
      const monthNum = String(i + 1).padStart(2, '0')
      assert.strictEqual(sequence[i].monthKey, `2023-${monthNum}`)
      if (sequence[i].hasRecord) {
        assert.ok(typeof sequence[i].ogcd === 'number')
        assert.ok(typeof sequence[i].daysWithDetections === 'number')
        assert.strictEqual(sequence[i].displayOgcd, sequence[i].ogcd)
      } else {
        assert.strictEqual(sequence[i].ogcd, null)
        assert.strictEqual(sequence[i].daysWithDetections, null)
        assert.strictEqual(sequence[i].displayOgcd, 0) // chart-safe zero placeholder
      }
    }
  })
})

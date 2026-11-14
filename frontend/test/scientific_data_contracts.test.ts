import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDaysInMonth, type Sensor } from '../src/observatoryAggregations.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const REGIONAL_DATA_PATH = path.join(ROOT, 'public', 'data', 'regional_monthly_5km.json')
const GEOJSON_DATA_PATH = path.join(ROOT, 'public', 'data', 'india_adm1_simplified.geojson')

interface RegionalRecord {
  sensor: Sensor
  region: string
  month: string
  ogcd: number
  daysWithDetections: number
}

interface RegionalPayload {
  metric: string
  projection: string
  gridKm: number
  boundaryYear: number
  boundaryLicense: string
  regions: string[]
  records: RegionalRecord[]
}

interface GeoFeature {
  type: string
  properties: {
    shapeName: string
    shapeISO: string
    shapeType?: string
  }
}

interface GeoJSONPayload {
  type: string
  features: GeoFeature[]
}

// Read and parse datasets once for the suite
const regionalData: RegionalPayload = JSON.parse(fs.readFileSync(REGIONAL_DATA_PATH, 'utf8'))
const geojsonData: GeoJSONPayload = JSON.parse(fs.readFileSync(GEOJSON_DATA_PATH, 'utf8'))

test('Scientific Data Contracts — Regional Data Structure', async (t) => {
  await t.test('root metadata attributes conform to EPSG:6933 5 km specification', () => {
    assert.strictEqual(regionalData.metric, 'regional occupied grid-cell-days')
    assert.strictEqual(regionalData.projection, 'EPSG:6933')
    assert.strictEqual(regionalData.gridKm, 5)
    assert.strictEqual(regionalData.boundaryYear, 2011)
    assert.strictEqual(typeof regionalData.boundaryLicense, 'string')
    assert.ok(Array.isArray(regionalData.regions))
    assert.ok(Array.isArray(regionalData.records))
    assert.ok(regionalData.records.length > 0, 'Records array must not be empty')
  })

  await t.test('every record contains required fields with valid types', () => {
    const validSensors = new Set(['MODIS', 'VIIRS'])
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/

    for (let i = 0; i < regionalData.records.length; i++) {
      const r = regionalData.records[i]
      assert.ok(validSensors.has(r.sensor), `Record ${i}: invalid sensor ${r.sensor}`)
      assert.ok(typeof r.region === 'string' && r.region.length > 0, `Record ${i}: missing region`)
      assert.match(r.month, monthRegex, `Record ${i}: invalid month format ${r.month}`)
      assert.strictEqual(typeof r.ogcd, 'number', `Record ${i}: ogcd must be number`)
      assert.strictEqual(typeof r.daysWithDetections, 'number', `Record ${i}: daysWithDetections must be number`)
    }
  })

  await t.test('OGCD values are non-negative finite numbers', () => {
    for (let i = 0; i < regionalData.records.length; i++) {
      const r = regionalData.records[i]
      assert.ok(Number.isFinite(r.ogcd), `Record ${i}: OGCD not finite`)
      assert.ok(r.ogcd >= 0, `Record ${i}: OGCD is negative (${r.ogcd})`)
    }
  })

  await t.test('detection-day values are non-negative integers', () => {
    for (let i = 0; i < regionalData.records.length; i++) {
      const r = regionalData.records[i]
      assert.ok(Number.isInteger(r.daysWithDetections), `Record ${i}: daysWithDetections not integer`)
      assert.ok(r.daysWithDetections >= 0, `Record ${i}: daysWithDetections is negative (${r.daysWithDetections})`)
    }
  })

  await t.test('monthly detection-days do not exceed calendar days in that month', () => {
    for (let i = 0; i < regionalData.records.length; i++) {
      const r = regionalData.records[i]
      const maxDaysInMonth = getDaysInMonth(r.month)
      assert.ok(maxDaysInMonth >= 28 && maxDaysInMonth <= 31, `Invalid month days: ${r.month}`)
      assert.ok(
        r.daysWithDetections <= maxDaysInMonth,
        `Record ${i} (${r.region}, ${r.month}): daysWithDetections (${r.daysWithDetections}) exceeds month days (${maxDaysInMonth})`
      )
    }
  })

  await t.test('record region names all belong to declared regional list', () => {
    const declaredRegions = new Set(regionalData.regions)
    for (let i = 0; i < regionalData.records.length; i++) {
      const r = regionalData.records[i]
      assert.ok(declaredRegions.has(r.region), `Record ${i} has undeclared region: ${r.region}`)
    }
  })
})

test('Scientific Data Contracts — Geographic Coverage', async (t) => {
  const geoNames = geojsonData.features.map((f) => f.properties.shapeName)
  const uniqueGeoNames = new Set(geoNames)

  await t.test('boundary GeoJSON contains exactly 36 uniquely named ADM1 regions', () => {
    assert.strictEqual(geojsonData.features.length, 36)
    assert.strictEqual(uniqueGeoNames.size, 36, 'GeoJSON region names must be unique')
    for (const feat of geojsonData.features) {
      assert.ok(feat.properties.shapeName && feat.properties.shapeName.trim().length > 0)
      assert.ok(feat.properties.shapeISO && feat.properties.shapeISO.trim().length > 0)
    }
  })

  await t.test('every regional data name matches a boundary name 1-to-1', () => {
    assert.strictEqual(regionalData.regions.length, 36)
    const dataRegionSet = new Set(regionalData.regions)
    assert.strictEqual(dataRegionSet.size, 36)

    // Check bidirectional congruence
    for (const r of regionalData.regions) {
      assert.ok(uniqueGeoNames.has(r), `Regional data region "${r}" not found in GeoJSON`)
    }
    for (const name of uniqueGeoNames) {
      assert.ok(dataRegionSet.has(name), `GeoJSON boundary "${name}" not found in regional dataset`)
    }
  })

  await t.test('missing-region coverage is isolated and explicitly verified (Lakshadweep)', () => {
    const modisRegionsWithData = new Set(
      regionalData.records.filter((r) => r.sensor === 'MODIS').map((r) => r.region)
    )
    const viirsRegionsWithData = new Set(
      regionalData.records.filter((r) => r.sensor === 'VIIRS').map((r) => r.region)
    )

    const missingModis = regionalData.regions.filter((r) => !modisRegionsWithData.has(r))
    const missingViirs = regionalData.regions.filter((r) => !viirsRegionsWithData.has(r))

    // Per dataset provenance, Lakshadweep legitimately has zero satellite fire records
    assert.deepStrictEqual(missingModis, ['Lakshadweep'])
    assert.deepStrictEqual(missingViirs, ['Lakshadweep'])
    assert.strictEqual(modisRegionsWithData.size, 35)
    assert.strictEqual(viirsRegionsWithData.size, 35)
  })
})

test('Scientific Data Contracts — Sensor and Time Coverage', async (t) => {
  await t.test('MODIS records respect supported operational window (2003–2025)', () => {
    const modisRecords = regionalData.records.filter((r) => r.sensor === 'MODIS')
    assert.ok(modisRecords.length > 0)

    let minMonth = '9999-99'
    let maxMonth = '0000-00'
    for (const r of modisRecords) {
      if (r.month < minMonth) minMonth = r.month
      if (r.month > maxMonth) maxMonth = r.month
      const year = parseInt(r.month.slice(0, 4), 10)
      assert.ok(year >= 2003 && year <= 2025, `MODIS year out of range: ${year}`)
    }

    assert.strictEqual(minMonth, '2003-01')
    assert.strictEqual(maxMonth, '2025-12')
  })

  await t.test('VIIRS records respect supported operational window (2013–2025)', () => {
    const viirsRecords = regionalData.records.filter((r) => r.sensor === 'VIIRS')
    assert.ok(viirsRecords.length > 0)

    let minMonth = '9999-99'
    let maxMonth = '0000-00'
    for (const r of viirsRecords) {
      if (r.month < minMonth) minMonth = r.month
      if (r.month > maxMonth) maxMonth = r.month
      const year = parseInt(r.month.slice(0, 4), 10)
      assert.ok(year >= 2013 && year <= 2025, `VIIRS year out of range: ${year}`)
    }

    assert.strictEqual(minMonth, '2013-01')
    assert.strictEqual(maxMonth, '2025-12')
  })

  await t.test('sensor segregation prevents accidental cross-sensor contamination', () => {
    const modisRecords = regionalData.records.filter((r) => r.sensor === 'MODIS')
    const viirsRecords = regionalData.records.filter((r) => r.sensor === 'VIIRS')

    // Sum of segregated records equals total records
    assert.strictEqual(modisRecords.length + viirsRecords.length, regionalData.records.length)

    // No VIIRS observations in pre-2013 years
    const pre2013Viirs = viirsRecords.filter((r) => parseInt(r.month.slice(0, 4), 10) < 2013)
    assert.strictEqual(pre2013Viirs.length, 0, 'Accidental pre-2013 VIIRS observations found')
  })
})

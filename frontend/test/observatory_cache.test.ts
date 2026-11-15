import test from 'node:test'
import assert from 'node:assert'
import {
  type GeoJSONPayload,
  type RegionalPayload,
  clearObservatoryCache,
  getCachedObservatoryData,
  hasCachedObservatoryData,
  setCachedObservatoryData,
  projectFeatures,
  loadObservatoryDatasets,
} from '../src/observatoryCache.ts'

const sampleGeoData: GeoJSONPayload = {
  type: 'FeatureCollection',
  features: Array.from({ length: 36 }, (_, i) => ({
    type: 'Feature',
    properties: {
      shapeName: `Region_${i + 1}`,
      shapeISO: `IN-R${i + 1}`,
      shapeType: 'ADM1',
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [75.0, 20.0],
          [76.0, 20.0],
          [76.0, 21.0],
          [75.0, 21.0],
          [75.0, 20.0],
        ],
      ],
    },
  })),
}

const sampleRegionalData: RegionalPayload = {
  metric: 'regional occupied grid-cell-days',
  projection: 'EPSG:6933',
  gridKm: 5,
  boundaryYear: 2011,
  boundaryLicense: 'CC BY 2.5 IN',
  regions: Array.from({ length: 36 }, (_, i) => `Region_${i + 1}`),
  records: [
    {
      sensor: 'MODIS',
      region: 'Region_1',
      month: '2023-01',
      ogcd: 15,
      daysWithDetections: 3,
    },
  ],
}

test('Observatory Cache — State Initialization and In-Memory Storage', async (t) => {
  await t.test('clearObservatoryCache empties all cached datasets and in-flight tracking', () => {
    clearObservatoryCache()
    assert.strictEqual(hasCachedObservatoryData(), false)
    const current = getCachedObservatoryData()
    assert.strictEqual(current.geoData, null)
    assert.strictEqual(current.regionalData, null)
    assert.strictEqual(current.projectedFeatures, null)
  })

  await t.test('setCachedObservatoryData populates cache and sets hasCachedObservatoryData to true', () => {
    clearObservatoryCache()
    setCachedObservatoryData(sampleGeoData, sampleRegionalData)
    assert.strictEqual(hasCachedObservatoryData(), true)

    const current = getCachedObservatoryData()
    assert.strictEqual(current.geoData, sampleGeoData)
    assert.strictEqual(current.regionalData, sampleRegionalData)
    assert.ok(Array.isArray(current.projectedFeatures))
    assert.strictEqual(current.projectedFeatures?.length, 36)
  })

  await t.test('cached projected geometry is reused by reference on subsequent projectFeatures calls', () => {
    clearObservatoryCache()
    setCachedObservatoryData(sampleGeoData, sampleRegionalData)

    const firstProjection = projectFeatures(sampleGeoData)
    const secondProjection = projectFeatures(sampleGeoData)

    // Strict reference equality proves zero re-projection took place
    assert.strictEqual(firstProjection, secondProjection)
    assert.strictEqual(firstProjection.length, 36)
    assert.ok(firstProjection[0].path.startsWith('M'))
    assert.ok(firstProjection[0].path.endsWith('Z'))
  })
})

test('Observatory Cache — Lifecycle, Deduplication, and Error Resilience', async (t) => {
  await t.test('loadObservatoryDatasets fetches and caches datasets on first cold call', async () => {
    clearObservatoryCache()
    let fetchCount = 0

    const mockFetcher = (async (url: string | URL | Request) => {
      fetchCount++
      const urlStr = String(url)
      if (urlStr.includes('india_adm1_simplified.geojson')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleGeoData,
        } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => sampleRegionalData,
      } as Response
    }) as typeof fetch

    const result = await loadObservatoryDatasets({
      fetcher: mockFetcher,
      baseUrl: 'http://test.local/',
    })

    assert.strictEqual(result.geoData, sampleGeoData)
    assert.strictEqual(result.regionalData, sampleRegionalData)
    assert.strictEqual(result.projectedFeatures.length, 36)
    // Both geojson and regional data were fetched concurrently
    assert.strictEqual(fetchCount, 2)
    assert.strictEqual(hasCachedObservatoryData(), true)

    // Second call with warm cache should return immediately without calling fetcher
    const warmResult = await loadObservatoryDatasets({
      fetcher: mockFetcher,
      baseUrl: 'http://test.local/',
    })

    assert.strictEqual(warmResult.geoData, sampleGeoData)
    assert.strictEqual(warmResult.regionalData, sampleRegionalData)
    assert.strictEqual(fetchCount, 2, 'Fetcher must NOT be invoked when cache is warm')
  })

  await t.test('concurrent in-flight calls share the same underlying promise without duplicate requests', async () => {
    clearObservatoryCache()
    let fetchCount = 0

    const mockFetcher = (async (url: string | URL | Request) => {
      fetchCount++
      // Simulate asynchronous delay
      await new Promise((resolve) => setTimeout(resolve, 10))
      const urlStr = String(url)
      if (urlStr.includes('india_adm1_simplified.geojson')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleGeoData,
        } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => sampleRegionalData,
      } as Response
    }) as typeof fetch

    // Launch two concurrent load calls before either finishes
    const [call1, call2] = await Promise.all([
      loadObservatoryDatasets({ fetcher: mockFetcher, baseUrl: 'http://test.local/' }),
      loadObservatoryDatasets({ fetcher: mockFetcher, baseUrl: 'http://test.local/' }),
    ])

    assert.strictEqual(call1.geoData, call2.geoData)
    assert.strictEqual(call1.projectedFeatures, call2.projectedFeatures)
    // Only 2 total requests were made (1 for geojson, 1 for regional data)
    assert.strictEqual(fetchCount, 2)
  })

  await t.test('failed requests never poison the cache and allow subsequent retry', async () => {
    clearObservatoryCache()
    let attempt = 0

    const failingFetcher = (async () => {
      attempt++
      if (attempt === 1) {
        return {
          ok: false,
          status: 500,
          json: async () => ({}),
        } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => sampleGeoData,
      } as Response
    }) as typeof fetch

    // Attempt 1: Must fail
    await assert.rejects(
      async () => {
        await loadObservatoryDatasets({
          fetcher: failingFetcher,
          baseUrl: 'http://test.local/',
        })
      },
      /Failed to load boundaries \(HTTP 500\)/
    )

    // Cache must remain empty
    assert.strictEqual(hasCachedObservatoryData(), false)
    const current = getCachedObservatoryData()
    assert.strictEqual(current.geoData, null)

    // Attempt 2: Working fetcher succeeds on retry
    const workingFetcher = (async (url: string | URL | Request) => {
      const urlStr = String(url)
      if (urlStr.includes('india_adm1_simplified.geojson')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleGeoData,
        } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => sampleRegionalData,
      } as Response
    }) as typeof fetch

    const retryResult = await loadObservatoryDatasets({
      fetcher: workingFetcher,
      baseUrl: 'http://test.local/',
    })

    assert.strictEqual(retryResult.geoData, sampleGeoData)
    assert.strictEqual(hasCachedObservatoryData(), true)
  })

  await t.test('forceRefresh bypasses warm cache and re-fetches datasets', async () => {
    clearObservatoryCache()
    setCachedObservatoryData(sampleGeoData, sampleRegionalData)
    assert.strictEqual(hasCachedObservatoryData(), true)

    let fetchCount = 0
    const mockFetcher = (async (url: string | URL | Request) => {
      fetchCount++
      const urlStr = String(url)
      if (urlStr.includes('india_adm1_simplified.geojson')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleGeoData,
        } as Response
      }
      return {
        ok: true,
        status: 200,
        json: async () => sampleRegionalData,
      } as Response
    }) as typeof fetch

    const refreshed = await loadObservatoryDatasets({
      fetcher: mockFetcher,
      baseUrl: 'http://test.local/',
      forceRefresh: true,
    })

    assert.strictEqual(fetchCount, 2)
    assert.strictEqual(refreshed.geoData, sampleGeoData)
  })
})

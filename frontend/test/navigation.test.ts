import test from 'node:test'
import assert from 'node:assert'
import { parseHash, CANONICAL_VIEW_IDS, VALID_VIEWS } from '../src/navigation.ts'

test('Navigation - Canonical Route IDs', async (t) => {
  await t.test('exact four canonical route IDs exist in canonical view list', () => {
    const expected = [
      'observatory',
      'historical-patterns',
      'sensor-laboratory',
      'research-methods',
    ]
    assert.deepStrictEqual([...CANONICAL_VIEW_IDS], expected)
    assert.strictEqual(CANONICAL_VIEW_IDS.length, 4)
  })

  await t.test('VALID_VIEWS dictionary maps each canonical ID to itself', () => {
    for (const id of CANONICAL_VIEW_IDS) {
      assert.strictEqual(VALID_VIEWS[id], id)
    }
    assert.strictEqual(Object.keys(VALID_VIEWS).length, 4)
  })

  await t.test('parseHash correctly normalizes standard hash formats', () => {
    assert.strictEqual(parseHash('#/observatory'), 'observatory')
    assert.strictEqual(parseHash('#observatory'), 'observatory')
    assert.strictEqual(parseHash('#/historical-patterns'), 'historical-patterns')
    assert.strictEqual(parseHash('#historical-patterns'), 'historical-patterns')
    assert.strictEqual(parseHash('#/sensor-laboratory'), 'sensor-laboratory')
    assert.strictEqual(parseHash('#sensor-laboratory'), 'sensor-laboratory')
    assert.strictEqual(parseHash('#/research-methods'), 'research-methods')
    assert.strictEqual(parseHash('#research-methods'), 'research-methods')
  })

  await t.test('parseHash handles case-insensitivity and leading/trailing whitespace', () => {
    assert.strictEqual(parseHash('#/OBSERVATORY'), 'observatory')
    assert.strictEqual(parseHash('# HISTORICAL-PATTERNS '), 'historical-patterns')
    assert.strictEqual(parseHash('#/Sensor-Laboratory'), 'sensor-laboratory')
    assert.strictEqual(parseHash('#  RESEARCH-METHODS  '), 'research-methods')
  })

  await t.test('parseHash safely falls back to observatory on empty, root, or invalid hashes', () => {
    assert.strictEqual(parseHash(''), 'observatory')
    assert.strictEqual(parseHash('#'), 'observatory')
    assert.strictEqual(parseHash('#/'), 'observatory')
    assert.strictEqual(parseHash('#/unknown-view'), 'observatory')
    assert.strictEqual(parseHash('#legacy-route'), 'observatory')
    assert.strictEqual(parseHash('javascript:void(0)'), 'observatory')
  })
})

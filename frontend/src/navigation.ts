export type ViewId = 'observatory' | 'historical-patterns' | 'sensor-laboratory' | 'research-methods'

export const VALID_VIEWS: Record<string, ViewId> = {
  'observatory': 'observatory',
  'historical-patterns': 'historical-patterns',
  'sensor-laboratory': 'sensor-laboratory',
  'research-methods': 'research-methods',
}

export const CANONICAL_VIEW_IDS: readonly ViewId[] = [
  'observatory',
  'historical-patterns',
  'sensor-laboratory',
  'research-methods',
] as const

/**
 * Normalizes a URL hash (e.g., "#/observatory", "#research-methods") into a canonical ViewId.
 * Falls back to 'observatory' for invalid or empty routes.
 */
export function parseHash(hash: string): ViewId {
  const clean = hash.replace(/^#\/?/, '').toLowerCase().trim()
  return VALID_VIEWS[clean] ?? 'observatory'
}

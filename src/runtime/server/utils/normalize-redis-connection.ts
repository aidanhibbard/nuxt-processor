/**
 * Normalize a single redis runtimeConfig entry for ioredis / BullMQ.
 * Returns undefined when the value should be omitted from the connection object.
 */
export function normalizeRedisConnectionEntry(
  key: string,
  value: unknown,
): unknown | undefined {
  if (value === '' || value === undefined || value === null) {
    return undefined
  }

  if (key === 'lazyConnect') {
    if (value === true || value === 'true') {
      return true
    }
    if (value === false || value === 'false') {
      return false
    }
    return undefined
  }

  if (key === 'port' || key === 'db' || key === 'connectTimeout') {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value
    }
    if (typeof value === 'string' && value !== '') {
      const n = Number(value)
      if (!Number.isNaN(n)) {
        return n
      }
    }
    return undefined
  }

  return value
}

import { describe, it, expect } from 'vitest'

import { normalizeRedisConnectionEntry } from '../../src/runtime/server/utils/normalize-redis-connection'

describe('normalizeRedisConnectionEntry', () => {
  it('omits empty values', () => {
    expect(normalizeRedisConnectionEntry('host', '')).toBeUndefined()
    expect(normalizeRedisConnectionEntry('host', undefined)).toBeUndefined()
    expect(normalizeRedisConnectionEntry('host', null)).toBeUndefined()
  })

  it('normalizes lazyConnect from booleans and strings', () => {
    expect(normalizeRedisConnectionEntry('lazyConnect', true)).toBe(true)
    expect(normalizeRedisConnectionEntry('lazyConnect', 'true')).toBe(true)
    expect(normalizeRedisConnectionEntry('lazyConnect', false)).toBe(false)
    expect(normalizeRedisConnectionEntry('lazyConnect', 'false')).toBe(false)
    expect(normalizeRedisConnectionEntry('lazyConnect', 'maybe')).toBeUndefined()
  })

  it('coerces port, db, and connectTimeout to numbers', () => {
    expect(normalizeRedisConnectionEntry('port', '6381')).toBe(6381)
    expect(normalizeRedisConnectionEntry('db', '2')).toBe(2)
    expect(normalizeRedisConnectionEntry('connectTimeout', 15_000)).toBe(15_000)
    expect(normalizeRedisConnectionEntry('connectTimeout', '12000')).toBe(12_000)
    expect(normalizeRedisConnectionEntry('port', 'not-a-number')).toBeUndefined()
  })

  it('passes through other keys unchanged', () => {
    expect(normalizeRedisConnectionEntry('host', 'redis.internal')).toBe('redis.internal')
    expect(normalizeRedisConnectionEntry('password', 'secret')).toBe('secret')
  })
})

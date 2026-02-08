import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateRedisConnectionExpr, getRedisConnectionImport } from '../../src/utils/generate-redis-connection-expr'
import { resolveRedisConnection } from '../../src/runtime/server/utils/resolve-redis-connection'

function clearEnvKey(key: string) {
  Reflect.deleteProperty(process.env, key)
}

describe('generateRedisConnectionExpr', () => {
  it('wraps static config in a resolveRedisConnection call', () => {
    const expr = generateRedisConnectionExpr('{"host":"10.0.0.1"}')
    expect(expr).toBe('resolveRedisConnection({"host":"10.0.0.1"})')
  })

  it('handles empty config', () => {
    const expr = generateRedisConnectionExpr('{}')
    expect(expr).toBe('resolveRedisConnection({})')
  })
})

describe('getRedisConnectionImport', () => {
  it('returns an import statement with the given alias', () => {
    expect(getRedisConnectionImport('#resolve-redis'))
      .toBe('import { resolveRedisConnection } from \'#resolve-redis\'')
  })
})

describe('resolveRedisConnection', () => {
  const envKeys = [
    'NUXT_REDIS_URL',
    'NUXT_REDIS_HOST',
    'NUXT_REDIS_PORT',
    'NUXT_REDIS_PASSWORD',
    'NUXT_REDIS_USERNAME',
    'NUXT_REDIS_DB',
    'NUXT_REDIS_LAZY_CONNECT',
    'NUXT_REDIS_CONNECT_TIMEOUT',
  ]
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key]
      clearEnvKey(key)
    }
  })

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key]
      }
      else {
        clearEnvKey(key)
      }
    }
  })

  it('returns static config when no env vars are set', () => {
    const result = resolveRedisConnection({ host: '10.0.0.1', port: 6380, password: 'secret', db: 2 })

    expect(result).toEqual({
      host: '10.0.0.1',
      port: 6380,
      password: 'secret',
      username: undefined,
      db: 2,
      lazyConnect: undefined,
      connectTimeout: undefined,
    })
  })

  it('includes url in returned object when NUXT_REDIS_URL is set', () => {
    process.env.NUXT_REDIS_URL = 'redis://prod-host:6379/1'
    const result = resolveRedisConnection({ host: '127.0.0.1', port: 6379 })

    expect(result).toMatchObject({ url: 'redis://prod-host:6379/1' })
    // Other options are still present alongside url
    expect(result).toHaveProperty('host')
    expect(result).toHaveProperty('port')
  })

  it('includes url from static config when no env url is set', () => {
    const result = resolveRedisConnection({ url: 'redis://config-host:6379/0', host: '127.0.0.1' })

    expect(result).toMatchObject({ url: 'redis://config-host:6379/0' })
    expect(result).toHaveProperty('host', '127.0.0.1')
  })

  it('env vars override individual static fields', () => {
    process.env.NUXT_REDIS_HOST = '192.168.1.100'
    process.env.NUXT_REDIS_PORT = '6381'
    process.env.NUXT_REDIS_PASSWORD = 'runtime-pw'
    process.env.NUXT_REDIS_USERNAME = 'admin'
    process.env.NUXT_REDIS_DB = '5'

    const result = resolveRedisConnection({ host: '10.0.0.1', port: 6380, password: 'build-pw', db: 2 })

    expect(result).toEqual({
      host: '192.168.1.100',
      port: 6381,
      password: 'runtime-pw',
      username: 'admin',
      db: 5,
      lazyConnect: undefined,
      connectTimeout: undefined,
    })
  })

  it('env vars partially override static fields', () => {
    process.env.NUXT_REDIS_HOST = 'new-host'

    const result = resolveRedisConnection({ host: '10.0.0.1', port: 6380, password: 'build-pw', db: 2 })

    expect(result).toMatchObject({
      host: 'new-host',
      port: 6380,
      password: 'build-pw',
      db: 2,
    })
  })

  it('NUXT_REDIS_URL env takes priority over static url', () => {
    process.env.NUXT_REDIS_URL = 'redis://env-host:6379'
    const result = resolveRedisConnection({ url: 'redis://config-host:6379' })

    expect(result).toMatchObject({ url: 'redis://env-host:6379' })
  })

  it('handles lazyConnect and connectTimeout from env', () => {
    process.env.NUXT_REDIS_LAZY_CONNECT = 'true'
    process.env.NUXT_REDIS_CONNECT_TIMEOUT = '5000'

    const result = resolveRedisConnection({})

    expect(result).toMatchObject({
      lazyConnect: true,
      connectTimeout: 5000,
    })
  })

  it('falls back to defaults when both static and env are empty', () => {
    const result = resolveRedisConnection({})

    expect(result).toEqual({
      host: '127.0.0.1',
      port: 6379,
      password: '',
      username: undefined,
      db: 0,
      lazyConnect: undefined,
      connectTimeout: undefined,
    })
  })

  it('does not include url key when no url is provided', () => {
    const result = resolveRedisConnection({ host: '10.0.0.1' })

    expect(result).not.toHaveProperty('url')
  })

  it('preserves all options alongside url for setConnection', () => {
    process.env.NUXT_REDIS_URL = 'redis://prod:6379'
    process.env.NUXT_REDIS_PASSWORD = 'prod-pw'

    const result = resolveRedisConnection({ host: '127.0.0.1', connectTimeout: 10000 })

    expect(result).toEqual({
      url: 'redis://prod:6379',
      host: '127.0.0.1',
      port: 6379,
      password: 'prod-pw',
      username: undefined,
      db: 0,
      lazyConnect: undefined,
      connectTimeout: 10000,
    })
  })
})

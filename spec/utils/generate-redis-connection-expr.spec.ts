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

  // --- basic resolution ---

  it('returns static config when no env vars are set', () => {
    const result = resolveRedisConnection({ host: '10.0.0.1', port: 6380, password: 'secret', db: 2 })

    expect(result).toMatchObject({
      host: '10.0.0.1',
      port: 6380,
      password: 'secret',
      username: undefined,
      db: 2,
      lazyConnect: undefined,
      connectTimeout: undefined,
    })
  })

  it('falls back to defaults when both static and env are empty', () => {
    const result = resolveRedisConnection({})

    expect(result).toMatchObject({
      host: '127.0.0.1',
      port: 6379,
      password: '',
      username: undefined,
      db: 0,
      lazyConnect: undefined,
      connectTimeout: undefined,
    })
  })

  // --- url handling ---

  it('includes url in returned object when NUXT_REDIS_URL is set', () => {
    process.env.NUXT_REDIS_URL = 'redis://prod-host:6379/1'
    const result = resolveRedisConnection({ host: '127.0.0.1', port: 6379 })

    expect(result).toMatchObject({ url: 'redis://prod-host:6379/1' })
    expect(result).toHaveProperty('host')
    expect(result).toHaveProperty('port')
  })

  it('includes url from static config when no env url is set', () => {
    const result = resolveRedisConnection({ url: 'redis://config-host:6379/0', host: '127.0.0.1' })

    expect(result).toMatchObject({ url: 'redis://config-host:6379/0' })
    expect(result).toHaveProperty('host', '127.0.0.1')
  })

  it('NUXT_REDIS_URL env takes priority over static url', () => {
    process.env.NUXT_REDIS_URL = 'redis://env-host:6379'
    const result = resolveRedisConnection({ url: 'redis://config-host:6379' })

    expect(result).toMatchObject({ url: 'redis://env-host:6379' })
  })

  it('does not include url key when no url is provided', () => {
    const result = resolveRedisConnection({ host: '10.0.0.1' })

    expect(result).not.toHaveProperty('url')
  })

  it('preserves all options alongside url for setConnection', () => {
    process.env.NUXT_REDIS_URL = 'redis://prod:6379'
    process.env.NUXT_REDIS_PASSWORD = 'prod-pw'

    const result = resolveRedisConnection({ host: '127.0.0.1', connectTimeout: 10000 })

    expect(result).toMatchObject({
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

  // --- env overrides ---

  it('env vars override individual static fields', () => {
    process.env.NUXT_REDIS_HOST = '192.168.1.100'
    process.env.NUXT_REDIS_PORT = '6381'
    process.env.NUXT_REDIS_PASSWORD = 'runtime-pw'
    process.env.NUXT_REDIS_USERNAME = 'admin'
    process.env.NUXT_REDIS_DB = '5'

    const result = resolveRedisConnection({ host: '10.0.0.1', port: 6380, password: 'build-pw', db: 2 })

    expect(result).toMatchObject({
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

  it('handles lazyConnect and connectTimeout from env', () => {
    process.env.NUXT_REDIS_LAZY_CONNECT = 'true'
    process.env.NUXT_REDIS_CONNECT_TIMEOUT = '5000'

    const result = resolveRedisConnection({})

    expect(result).toMatchObject({
      lazyConnect: true,
      connectTimeout: 5000,
    })
  })

  // --- extra keys preserved ---

  it('preserves extra IORedis keys from staticConfig (tls, sentinels, etc.)', () => {
    const tlsOpts = { rejectUnauthorized: false }
    const result = resolveRedisConnection({
      host: '10.0.0.1',
      tls: tlsOpts,
      enableReadyCheck: true,
      family: 4,
    })

    expect(result).toMatchObject({
      host: '10.0.0.1',
      tls: tlsOpts,
      enableReadyCheck: true,
      family: 4,
    })
  })

  it('env overrides do not strip extra keys', () => {
    process.env.NUXT_REDIS_HOST = 'override-host'

    const result = resolveRedisConnection({
      host: 'old-host',
      tls: { ca: 'cert' },
      retryStrategy: 'keep-me',
    })

    expect(result.host).toBe('override-host')
    expect(result).toHaveProperty('tls')
    expect(result).toHaveProperty('retryStrategy', 'keep-me')
  })

  // --- NaN / invalid numeric fallback ---

  it('falls back to static port when NUXT_REDIS_PORT is not a number', () => {
    process.env.NUXT_REDIS_PORT = 'abc'

    const result = resolveRedisConnection({ port: 6380 })
    expect(result.port).toBe(6380)
  })

  it('falls back to default port (6379) when both env and static are invalid', () => {
    process.env.NUXT_REDIS_PORT = 'notanumber'

    const result = resolveRedisConnection({})
    expect(result.port).toBe(6379)
  })

  it('falls back to static db when NUXT_REDIS_DB is not a number', () => {
    process.env.NUXT_REDIS_DB = 'xyz'

    const result = resolveRedisConnection({ db: 3 })
    expect(result.db).toBe(3)
  })

  it('falls back to static connectTimeout when env value is invalid', () => {
    process.env.NUXT_REDIS_CONNECT_TIMEOUT = 'bad'

    const result = resolveRedisConnection({ connectTimeout: 8000 })
    expect(result.connectTimeout).toBe(8000)
  })

  // --- lazyConnect explicit parsing ---

  it('sets lazyConnect true when env is "true"', () => {
    process.env.NUXT_REDIS_LAZY_CONNECT = 'true'

    const result = resolveRedisConnection({ lazyConnect: false })
    expect(result.lazyConnect).toBe(true)
  })

  it('sets lazyConnect false when env is "false"', () => {
    process.env.NUXT_REDIS_LAZY_CONNECT = 'false'

    const result = resolveRedisConnection({ lazyConnect: true })
    expect(result.lazyConnect).toBe(false)
  })

  it('keeps static lazyConnect when env value is unrecognised', () => {
    process.env.NUXT_REDIS_LAZY_CONNECT = 'banana'

    const result = resolveRedisConnection({ lazyConnect: true })
    expect(result.lazyConnect).toBe(true)
  })

  it('keeps static lazyConnect when env is not set', () => {
    const result = resolveRedisConnection({ lazyConnect: true })
    expect(result.lazyConnect).toBe(true)
  })
})

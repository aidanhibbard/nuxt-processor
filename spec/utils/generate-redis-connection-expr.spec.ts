import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateRedisConnectionExpr } from '../../src/utils/generate-redis-connection-expr'

// Helper: evaluate the generated expression in current process context
function evalExpr(expr: string): unknown {
  return eval(expr)
}

function clearEnvKey(key: string) {
  Reflect.deleteProperty(process.env, key)
}

describe('generateRedisConnectionExpr', () => {
  const savedEnv: Record<string, string | undefined> = {}
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
    const staticRedis = JSON.stringify({ host: '10.0.0.1', port: 6380, password: 'secret', db: 2 })
    const expr = generateRedisConnectionExpr(staticRedis)
    const result = evalExpr(expr) as Record<string, unknown>

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

  it('returns NUXT_REDIS_URL when set at runtime', () => {
    process.env.NUXT_REDIS_URL = 'redis://prod-host:6379/1'
    const staticRedis = JSON.stringify({ host: '127.0.0.1', port: 6379 })
    const expr = generateRedisConnectionExpr(staticRedis)
    const result = evalExpr(expr)

    expect(result).toBe('redis://prod-host:6379/1')
  })

  it('returns static url when set in config and no env url', () => {
    const staticRedis = JSON.stringify({ url: 'redis://config-host:6379/0', host: '127.0.0.1' })
    const expr = generateRedisConnectionExpr(staticRedis)
    const result = evalExpr(expr)

    expect(result).toBe('redis://config-host:6379/0')
  })

  it('env vars override individual static fields', () => {
    process.env.NUXT_REDIS_HOST = '192.168.1.100'
    process.env.NUXT_REDIS_PORT = '6381'
    process.env.NUXT_REDIS_PASSWORD = 'runtime-pw'
    process.env.NUXT_REDIS_USERNAME = 'admin'
    process.env.NUXT_REDIS_DB = '5'

    const staticRedis = JSON.stringify({ host: '10.0.0.1', port: 6380, password: 'build-pw', db: 2 })
    const expr = generateRedisConnectionExpr(staticRedis)
    const result = evalExpr(expr) as Record<string, unknown>

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
    // port, password etc. not set in env

    const staticRedis = JSON.stringify({ host: '10.0.0.1', port: 6380, password: 'build-pw', db: 2 })
    const expr = generateRedisConnectionExpr(staticRedis)
    const result = evalExpr(expr) as Record<string, unknown>

    expect(result).toMatchObject({
      host: 'new-host',
      port: 6380,
      password: 'build-pw',
      db: 2,
    })
  })

  it('NUXT_REDIS_URL env takes priority over static url in config', () => {
    process.env.NUXT_REDIS_URL = 'redis://env-host:6379'
    const staticRedis = JSON.stringify({ url: 'redis://config-host:6379' })
    const expr = generateRedisConnectionExpr(staticRedis)
    const result = evalExpr(expr)

    expect(result).toBe('redis://env-host:6379')
  })

  it('handles lazyConnect and connectTimeout from env', () => {
    process.env.NUXT_REDIS_LAZY_CONNECT = 'true'
    process.env.NUXT_REDIS_CONNECT_TIMEOUT = '5000'

    const staticRedis = JSON.stringify({})
    const expr = generateRedisConnectionExpr(staticRedis)
    const result = evalExpr(expr) as Record<string, unknown>

    expect(result).toMatchObject({
      lazyConnect: true,
      connectTimeout: 5000,
    })
  })

  it('falls back to defaults when both static and env are empty', () => {
    const staticRedis = JSON.stringify({})
    const expr = generateRedisConnectionExpr(staticRedis)
    const result = evalExpr(expr) as Record<string, unknown>

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

  it('generated expression contains process.env references', () => {
    const expr = generateRedisConnectionExpr('{}')
    expect(expr).toContain('process.env.NUXT_REDIS_URL')
    expect(expr).toContain('process.env.NUXT_REDIS_HOST')
    expect(expr).toContain('process.env.NUXT_REDIS_PORT')
    expect(expr).toContain('process.env.NUXT_REDIS_PASSWORD')
  })
})

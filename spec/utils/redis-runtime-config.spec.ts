import { describe, it, expect, afterEach, vi } from 'vitest'

import { buildRedisRuntimeConfig } from '../../src/utils/redis-runtime-config'

describe('buildRedisRuntimeConfig', () => {
  const envKeys = [
    'REDIS_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_DB',
    'REDIS_USERNAME',
    'REDIS_LAZY_CONNECT',
    'REDIS_CONNECT_TIMEOUT',
  ] as const

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('seeds empty keys when env is unset', () => {
    vi.stubEnv('REDIS_URL', '')
    vi.stubEnv('REDIS_HOST', '')
    vi.stubEnv('REDIS_PORT', '')
    vi.stubEnv('REDIS_PASSWORD', '')
    vi.stubEnv('REDIS_DB', '')
    vi.stubEnv('REDIS_USERNAME', '')
    vi.stubEnv('REDIS_LAZY_CONNECT', '')
    vi.stubEnv('REDIS_CONNECT_TIMEOUT', '')

    expect(buildRedisRuntimeConfig(undefined)).toEqual({
      url: '',
      host: '',
      port: '',
      password: '',
      db: '',
      username: '',
      lazyConnect: '',
      connectTimeout: '',
    })
  })

  it('reads REDIS_* from env at module setup', () => {
    vi.stubEnv('REDIS_URL', 'redis://build:6379/0')
    vi.stubEnv('REDIS_HOST', 'build-host')
    vi.stubEnv('REDIS_PORT', '6380')
    vi.stubEnv('REDIS_PASSWORD', 'build-secret')
    vi.stubEnv('REDIS_DB', '2')
    vi.stubEnv('REDIS_USERNAME', 'build-user')
    vi.stubEnv('REDIS_LAZY_CONNECT', 'true')
    vi.stubEnv('REDIS_CONNECT_TIMEOUT', '15000')

    expect(buildRedisRuntimeConfig(undefined)).toEqual({
      url: 'redis://build:6379/0',
      host: 'build-host',
      port: '6380',
      password: 'build-secret',
      db: '2',
      username: 'build-user',
      lazyConnect: true,
      connectTimeout: 15000,
    })
  })

  it('user runtimeConfig.redis overrides REDIS_* env', () => {
    vi.stubEnv('REDIS_URL', 'redis://env:6379/0')
    vi.stubEnv('REDIS_CONNECT_TIMEOUT', '9999')

    expect(buildRedisRuntimeConfig({
      url: 'redis://user:6379/1',
      connectTimeout: 5000,
    })).toEqual({
      url: 'redis://user:6379/1',
      host: '',
      port: '',
      password: '',
      db: '',
      username: '',
      lazyConnect: '',
      connectTimeout: 5000,
    })
  })

  it('lazyConnect is only true when REDIS_LAZY_CONNECT=true', () => {
    vi.stubEnv('REDIS_LAZY_CONNECT', 'false')
    expect(buildRedisRuntimeConfig(undefined).lazyConnect).toBe('')

    vi.stubEnv('REDIS_LAZY_CONNECT', 'true')
    expect(buildRedisRuntimeConfig(undefined).lazyConnect).toBe(true)
  })

  it('user can override username and lazyConnect from runtimeConfig', () => {
    vi.stubEnv('REDIS_USERNAME', 'from-env')
    vi.stubEnv('REDIS_LAZY_CONNECT', 'true')

    expect(buildRedisRuntimeConfig({
      username: 'from-config',
      lazyConnect: false,
    })).toMatchObject({
      username: 'from-config',
      lazyConnect: false,
    })
  })

  it('omits connectTimeout when REDIS_CONNECT_TIMEOUT is unset', () => {
    vi.stubEnv('REDIS_CONNECT_TIMEOUT', '')
    expect(buildRedisRuntimeConfig(undefined).connectTimeout).toBe('')
  })
})

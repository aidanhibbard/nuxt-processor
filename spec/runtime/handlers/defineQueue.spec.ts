import { describe, it, expect, vi, beforeEach } from 'vitest'

import { defineQueue } from '../../../src/runtime/server/handlers/defineQueue'
import { useProcessor, type QueueOptions } from '../../../src/runtime/server/utils/workers'

const useRuntimeConfig = vi.fn()

vi.mock('consola', () => ({
  consola: {
    create: () => ({
      withTag: () => ({
        error: vi.fn(),
      }),
    }),
  },
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => useRuntimeConfig(),
}))

vi.mock('bullmq', () => {
  class MockQueue {
    name: string
    opts: QueueOptions
    constructor(name: string, opts: QueueOptions) {
      this.name = name
      this.opts = opts
    }

    add = vi.fn().mockResolvedValue(undefined)
    on = vi.fn()
    close = vi.fn().mockResolvedValue(undefined)
  }
  return { Queue: MockQueue }
})

describe('defineQueue', () => {
  beforeEach(async () => {
    useRuntimeConfig.mockReturnValue({ redis: { host: 'localhost', port: 6379 } })
    await useProcessor().stopAll()
  })

  it('creates a queue using runtimeConfig redis', async () => {
    const api = useProcessor()

    const queue = defineQueue({ name: 'email', options: { defaultJobOptions: { attempts: 1 } } })

    expect(queue.name).toBe('email')
    expect(queue.opts.connection).toEqual(expect.objectContaining({
      host: 'localhost',
      port: 6379,
      enableOfflineQueue: false,
    }))
    expect(queue.opts.connection).not.toHaveProperty('lazyConnect')
    expect(queue.on).toHaveBeenCalledWith('error', expect.any(Function))

    await api.stopAll()
  })

  it('passes lazyConnect and connectTimeout from runtimeConfig', async () => {
    useRuntimeConfig.mockReturnValue({
      redis: {
        host: 'localhost',
        port: 6379,
        lazyConnect: true,
        connectTimeout: 10_000,
      },
    })

    const api = useProcessor()
    const queue = defineQueue({ name: 'email' })

    expect(queue.opts.connection).toEqual(expect.objectContaining({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
      connectTimeout: 10_000,
      enableOfflineQueue: false,
    }))

    await api.stopAll()
  })

  it('supports typed name, data and result through generics', async () => {
    const api = useProcessor()

    type Name = 'hello'
    type Data = { z: number }
    type Result = { ok: boolean }

    const queue = defineQueue<Data, Result, Name>({ name: 'hello' })

    await queue.add('hello', { z: 1 })

    await api.stopAll()
  })

  it('works without generics (any types)', async () => {
    const api = useProcessor()

    const queue = defineQueue({ name: 'plain' })
    await queue.add('plain', { n: 1 })

    await api.stopAll()
  })
})

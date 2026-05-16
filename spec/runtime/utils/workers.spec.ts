import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useProcessor, type Processor } from '../../../src/runtime/server/utils/workers'

const useRuntimeConfig = vi.fn()

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => useRuntimeConfig(),
}))

vi.mock('bullmq', () => {
  class MockQueue {
    name: string
    opts: WorkerOptions
    constructor(name: string, opts: WorkerOptions) {
      this.name = name
      this.opts = opts
    }

    close = vi.fn().mockResolvedValue(undefined)
  }

  class MockWorker {
    name: string
    processor: Processor
    opts: WorkerOptions
    constructor(name: string, processor: Processor, opts: WorkerOptions) {
      this.name = name
      this.processor = processor
      this.opts = opts
    }

    run = vi.fn().mockResolvedValue(undefined)
    on = vi.fn()
    close = vi.fn().mockResolvedValue(undefined)
  }

  return { Queue: MockQueue, Worker: MockWorker }
})

describe('useProcessor registry', () => {
  beforeEach(() => {
    useRuntimeConfig.mockReturnValue({ redis: { host: '127.0.0.1', port: 6379 } })
  })

  it('creates queues and workers from runtimeConfig with lazyConnect and autorun=false', async () => {
    const api = useProcessor()

    const queue = api.createQueue('test-queue', { defaultJobOptions: { attempts: 2 } })
    const worker = api.createWorker('test-queue', async () => {}, { concurrency: 3 })

    expect(queue.name).toBe('test-queue')
    expect(queue.opts.connection).toEqual(expect.objectContaining({
      host: '127.0.0.1',
      port: 6379,
      lazyConnect: true,
    }))
    expect((queue.opts.connection as unknown as { maxRetriesPerRequest?: unknown }).maxRetriesPerRequest).toBeUndefined()
    expect(worker.name).toBe('test-queue')
    expect(worker.opts.connection).toEqual(expect.objectContaining({
      host: '127.0.0.1',
      port: 6379,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    }))
    expect(worker.opts.autorun).toBe(false)

    expect(api.queues).toContain(queue)
    expect(api.workers).toContain(worker)

    await api.stopAll()
    expect(queue.close).toHaveBeenCalled()
    expect(worker.close).toHaveBeenCalled()
  })

  it('uses redis.url from runtimeConfig (e.g. NUXT_REDIS_URL at runtime)', async () => {
    useRuntimeConfig.mockReturnValue({
      redis: {
        host: '127.0.0.1',
        port: 6379,
        url: 'redis://user:pass@localhost:6379/0',
      },
    })

    const api = useProcessor()
    const queue = api.createQueue('q1')
    const worker = api.createWorker('q1', async () => {})

    expect(queue.opts.connection).toEqual({
      host: '127.0.0.1',
      port: 6379,
      url: 'redis://user:pass@localhost:6379/0',
      lazyConnect: true,
    })
    expect(worker.opts.connection).toEqual({
      host: '127.0.0.1',
      port: 6379,
      url: 'redis://user:pass@localhost:6379/0',
      lazyConnect: true,
      maxRetriesPerRequest: null,
    })
  })

  it('passes username, lazyConnect, and connectTimeout from runtimeConfig', async () => {
    useRuntimeConfig.mockReturnValue({
      redis: {
        host: 'redis.internal',
        port: 6381,
        username: 'acl-user',
        lazyConnect: false,
        connectTimeout: 12_000,
      },
    })

    const api = useProcessor()
    const queue = api.createQueue('opts-queue')
    const worker = api.createWorker('opts-queue', async () => {})

    expect(queue.opts.connection).toEqual({
      host: 'redis.internal',
      port: 6381,
      username: 'acl-user',
      lazyConnect: false,
      connectTimeout: 12_000,
    })
    expect(worker.opts.connection).toEqual({
      ...queue.opts.connection,
      maxRetriesPerRequest: null,
    })

    await api.stopAll()
  })

  it('defaults lazyConnect to true when redis.lazyConnect is empty', async () => {
    useRuntimeConfig.mockReturnValue({
      redis: {
        host: '127.0.0.1',
        port: 6379,
        lazyConnect: '',
      },
    })

    const api = useProcessor()
    const queue = api.createQueue('lazy-default')

    expect(queue.opts.connection).toEqual({
      host: '127.0.0.1',
      port: 6379,
      lazyConnect: true,
    })

    await api.stopAll()
  })

  it('strips empty redis fields so they do not appear on the connection', async () => {
    useRuntimeConfig.mockReturnValue({
      redis: {
        url: '',
        host: '127.0.0.1',
        port: 6379,
        password: '',
        username: '',
        db: '',
        connectTimeout: '',
      },
    })

    const api = useProcessor()
    const queue = api.createQueue('strip-empty')

    expect(queue.opts.connection).toEqual({
      host: '127.0.0.1',
      port: 6379,
      lazyConnect: true,
    })
    expect(queue.opts.connection).not.toHaveProperty('url')
    expect(queue.opts.connection).not.toHaveProperty('password')
    expect(queue.opts.connection).not.toHaveProperty('username')
    expect(queue.opts.connection).not.toHaveProperty('connectTimeout')

    await api.stopAll()
  })

  it('passes runtimeConfig url and options through for queues and workers', async () => {
    useRuntimeConfig.mockReturnValue({
      redis: { url: 'redis://localhost:6379/0', password: 'secret', db: 1 },
    })

    const api = useProcessor()
    const queue = api.createQueue('q2')
    const worker = api.createWorker('q2', async () => {})

    expect(queue.opts.connection).toEqual(expect.objectContaining({
      url: 'redis://localhost:6379/0',
      password: 'secret',
      db: 1,
      lazyConnect: true,
    }))
    expect((queue.opts.connection as unknown as { maxRetriesPerRequest?: unknown }).maxRetriesPerRequest).toBeUndefined()
    expect(worker.opts.connection).toEqual(expect.objectContaining({
      url: 'redis://localhost:6379/0',
      password: 'secret',
      db: 1,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    }))
  })

  it('registry can store heterogeneous generic instances safely', async () => {
    const api = useProcessor()

    const q1 = api.createQueue<'n1'>('n1')
    const q2 = api.createQueue<{ foo: string }, { bar: number }, 'n2'>('n2')
    const w1 = api.createWorker<'n1'>('n1', async () => {})
    const w2 = api.createWorker<{ a: number }, { b: string }, 'n2'>('n2', async job => ({ b: String(job.data.a) }))

    expect(api.queues).toEqual(expect.arrayContaining([q1, q2]))
    expect(api.workers).toEqual(expect.arrayContaining([w1, w2]))

    await api.stopAll()
  })
})

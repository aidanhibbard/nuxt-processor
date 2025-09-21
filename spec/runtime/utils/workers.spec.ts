import { describe, it, expect, vi, beforeEach } from 'vitest'

import { $workers, type Processor } from '../../../src/runtime/server/utils/workers'

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

const ioredisConnectMock = vi.fn()
const ioredisConstructorMock = vi.fn()

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation((...args: unknown[]) => {
      ioredisConstructorMock(...args)
      return {
        connect: ioredisConnectMock,
      }
    }),
  }
})

describe('$workers registry', () => {
  beforeEach(() => {
    ioredisConstructorMock.mockClear()
    ioredisConnectMock.mockClear()
  })

  it('creates queues and workers with shared connection and autorun=false', async () => {
    const api = $workers()
    const connection = { host: '127.0.0.1', port: 6379 }
    api.setConnection(connection)

    const queue = api.createQueue('test-queue', { defaultJobOptions: { attempts: 2 } })
    const worker = api.createWorker('test-queue', async () => {}, { concurrency: 3 })

    expect(queue.name).toBe('test-queue')
    expect((queue.opts.connection)).toEqual(connection)
    expect(worker.name).toBe('test-queue')
    expect((worker).opts.connection).toEqual(connection)
    expect((worker).opts.autorun).toBe(false)

    expect(api.queues).toContain(queue)
    expect(api.workers).toContain(worker)

    await api.stopAll()
    expect((queue).close).toHaveBeenCalled()
    expect((worker).close).toHaveBeenCalled()
  })

  it('uses IORedis when given a connection url string', async () => {
    const api = $workers()
    api.setConnection('redis://user:pass@localhost:6379/0')

    const queue = api.createQueue('q1')
    const worker = api.createWorker('q1', async () => {})

    expect(ioredisConstructorMock).toHaveBeenCalledTimes(1)
    expect(ioredisConstructorMock).toHaveBeenCalledWith('redis://user:pass@localhost:6379/0')
    expect((queue).opts.connection).toBeDefined()
    expect((worker).opts.connection).toBeDefined()
  })

  it('uses IORedis when given an object with url property, passing rest as options', async () => {
    const api = $workers()
    api.setConnection({ url: 'redis://localhost:6379/0', password: 'secret', db: 1 })

    const queue = api.createQueue('q2')
    const worker = api.createWorker('q2', async () => {})

    expect(ioredisConstructorMock).toHaveBeenCalledTimes(1)
    expect(ioredisConstructorMock).toHaveBeenCalledWith('redis://localhost:6379/0', { password: 'secret', db: 1 })
    expect((queue).opts.connection).toBeDefined()
    expect((worker).opts.connection).toBeDefined()
  })
})

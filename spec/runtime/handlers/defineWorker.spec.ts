import { describe, it, expect, vi, expectTypeOf, beforeEach } from 'vitest'

import { defineWorker } from '../../../src/runtime/server/handlers/defineWorker'
import { useProcessor, type Processor, type WorkerOptions } from '../../../src/runtime/server/utils/workers'

const useRuntimeConfig = vi.fn()

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => useRuntimeConfig(),
}))

vi.mock('bullmq', () => {
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
  return { Worker: MockWorker }
})

describe('defineWorker', () => {
  beforeEach(() => {
    useRuntimeConfig.mockReturnValue({ redis: { host: 'localhost', port: 6379 } })
  })

  it('creates a worker using runtimeConfig redis', async () => {
    const api = useProcessor()

    const worker = defineWorker({ name: 'email', processor: async () => {}, options: { concurrency: 2 } })

    expect(worker.name).toBe('email')
    expect(worker.opts.connection).toEqual(expect.objectContaining({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
    }))
    expect(worker.opts.autorun).toBe(false)

    await api.stopAll()
  })

  it('supports typed name, data and result through generics', async () => {
    const api = useProcessor()

    type Name = 'hello'
    type Data = { x: number }
    type Result = { y: string }

    const _worker = defineWorker<Name, Data, Result>({
      name: 'hello',
      async processor(job) {
        expectTypeOf(job.name).toEqualTypeOf<Name>()
        expectTypeOf(job.data).toEqualTypeOf<Data>()
        return { y: String(job.data.x) }
      },
    })

    await api.stopAll()
  })

  it('works without generics (any types)', async () => {
    const api = useProcessor()

    const worker = defineWorker({
      name: 'plain',
      async processor(job) {
        return { seen: job.data }
      },
    })

    expect(worker.name).toBe('plain')
    await api.stopAll()
  })
})

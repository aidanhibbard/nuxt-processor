import { describe, it, expect, vi, expectTypeOf } from 'vitest'

import { defineWorker } from '../../../src/runtime/server/handlers/defineWorker'
import { $workers, type Processor } from '../../../src/runtime/server/utils/workers'

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
  it('creates a worker using $workers and returns it', async () => {
    const api = $workers()
    const connection = { host: 'localhost', port: 6379 }
    api.setConnection(connection)

    const worker = defineWorker({ name: 'email', processor: async () => {}, options: { concurrency: 2 } })

    expect(worker.name).toBe('email')
    expect((worker).opts.connection).toEqual(expect.objectContaining(connection))
    expect((worker).opts.autorun).toBe(false)

    await api.stopAll()
  })

  it('supports typed name, data and result through generics', async () => {
    const api = $workers()
    api.setConnection({ host: 'localhost', port: 6379 })

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

    // Worker instance .name is exposed as string by BullMQ; type-level checks are done via job
    await api.stopAll()
  })

  it('works without generics (any types)', async () => {
    const api = $workers()
    api.setConnection({ host: 'localhost', port: 6379 })

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

import { describe, it, expect, vi } from 'vitest'

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
    expect((worker).opts.connection).toEqual(connection)
    expect((worker).opts.autorun).toBe(false)

    await api.stopAll()
  })
})

import { describe, it, expect, vi } from 'vitest'

import { defineQueue } from '../../../src/runtime/server/handlers/defineQueue'
import { $workers, type QueueOptions } from '../../../src/runtime/server/utils/workers'

vi.mock('bullmq', () => {
  class MockQueue {
    name: string
    opts: QueueOptions
    constructor(name: string, opts: QueueOptions) {
      this.name = name
      this.opts = opts
    }

    close = vi.fn().mockResolvedValue(undefined)
  }
  return { Queue: MockQueue }
})

describe('defineQueue', () => {
  it('creates a queue using $workers and returns it', async () => {
    const api = $workers()
    const connection = { host: 'localhost', port: 6379 }
    api.setConnection(connection)

    const queue = defineQueue({ name: 'email', options: { defaultJobOptions: { attempts: 1 } } })

    expect(queue.name).toBe('email')
    expect((queue).opts.connection).toEqual(expect.objectContaining(connection))

    await api.stopAll()
  })
})

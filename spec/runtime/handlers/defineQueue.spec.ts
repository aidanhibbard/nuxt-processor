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

    add = vi.fn().mockResolvedValue(undefined)
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

  it('supports typed name, data and result through generics', async () => {
    const api = $workers()
    api.setConnection({ host: 'localhost', port: 6379 })

    type Name = 'hello'
    type Data = { z: number }
    type Result = { ok: boolean }

    const queue = defineQueue<Data, Result, Name>({ name: 'hello' })

    // .add signature should be strongly typed
    await queue.add('hello', { z: 1 })
    // Type-level checks focus on .add payload/name

    await api.stopAll()
  })

  it('works without generics (any types)', async () => {
    const api = $workers()
    api.setConnection({ host: 'localhost', port: 6379 })

    const queue = defineQueue({ name: 'plain' })
    await queue.add('plain', { n: 1 })

    await api.stopAll()
  })
})

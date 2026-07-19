import { describe, it, expect, vi, beforeEach } from 'vitest'

import { defineFlowProducer } from '../../../src/runtime/server/handlers/defineFlowProducer'
import { useProcessor, type QueueBaseOptions } from '../../../src/runtime/server/utils/workers'

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
  class MockFlowProducer {
    opts: QueueBaseOptions
    constructor(opts: QueueBaseOptions) {
      this.opts = opts
    }

    add = vi.fn().mockResolvedValue(undefined)
    addBulk = vi.fn().mockResolvedValue(undefined)
    on = vi.fn()
    close = vi.fn().mockResolvedValue(undefined)
  }
  return { FlowProducer: MockFlowProducer }
})

describe('defineFlowProducer', () => {
  beforeEach(async () => {
    useRuntimeConfig.mockReturnValue({ redis: { host: 'localhost', port: 6379 } })
    await useProcessor().stopAll()
  })

  it('creates a flow producer using runtimeConfig redis', async () => {
    const api = useProcessor()

    const flowProducer = defineFlowProducer()

    expect(flowProducer.opts.connection).toEqual(expect.objectContaining({
      host: 'localhost',
      port: 6379,
      enableOfflineQueue: false,
    }))
    expect(flowProducer.on).toHaveBeenCalledWith('error', expect.any(Function))

    await api.stopAll()
  })

  it('passes options through to BullMQ FlowProducer', async () => {
    const api = useProcessor()

    const flowProducer = defineFlowProducer({
      options: { prefix: 'flows' },
    })

    expect(flowProducer.opts.prefix).toBe('flows')

    await api.stopAll()
  })

  it('supports add and addBulk', async () => {
    const api = useProcessor()

    const flowProducer = defineFlowProducer()

    await flowProducer.add({
      name: 'parent',
      queueName: 'parent-queue',
      children: [{ name: 'child', queueName: 'child-queue' }],
    })
    await flowProducer.addBulk([
      { name: 'root-1', queueName: 'queue-1' },
      { name: 'root-2', queueName: 'queue-2' },
    ])

    expect(flowProducer.add).toHaveBeenCalled()
    expect(flowProducer.addBulk).toHaveBeenCalled()

    await api.stopAll()
  })
})

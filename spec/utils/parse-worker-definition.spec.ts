import { describe, it, expect } from 'vitest'
import { parseWorkerDefinition } from '../../src/utils/parse-worker-definition'

describe('parse-worker-definition', () => {
  it('parses a basic defineWorker call', () => {
    const source = `
import { defineWorker } from '#processor'

export default defineWorker({
  name: 'basic',
  async processor(job) {
    return { ok: true }
  },
})
`

    expect(parseWorkerDefinition(source)).toEqual({
      name: 'basic',
      options: {},
    })
  })

  it('parses defineWorker with generics and options', () => {
    const source = `
export default defineWorker<HelloName, HelloData, HelloResult>({
  name: 'hello',
  async processor(job) {},
  options: {
    concurrency: 2,
    lockDuration: 60_000,
    limiter: { max: 10, duration: 1000 },
  },
})
`

    expect(parseWorkerDefinition(source)).toEqual({
      name: 'hello',
      options: {
        concurrency: 2,
        lockDuration: 60_000,
        limiter: { max: 10, duration: 1000 },
      },
    })
  })

  it('returns null when defineWorker is missing', () => {
    expect(parseWorkerDefinition('export default {}')).toBeNull()
  })

  it('returns null when name is not a string literal', () => {
    const source = `
export default defineWorker({
  name: workerName,
  processor: async () => {},
})
`
    expect(parseWorkerDefinition(source)).toBeNull()
  })
})

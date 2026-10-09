import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { isWorkersProcess } from '../../../src/runtime/server/utils/is-workers-process'

describe('isWorkersProcess', () => {
  let originalValue: string | undefined

  beforeEach(() => {
    originalValue = process.env.NUXT_PROCESSOR_WORKER
  })

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.NUXT_PROCESSOR_WORKER
    }
    else {
      process.env.NUXT_PROCESSOR_WORKER = originalValue
    }
  })

  it('returns true when NUXT_PROCESSOR_WORKER is 1', () => {
    process.env.NUXT_PROCESSOR_WORKER = '1'
    expect(isWorkersProcess()).toBe(true)
  })

  it('returns false when NUXT_PROCESSOR_WORKER is unset', () => {
    delete process.env.NUXT_PROCESSOR_WORKER
    expect(isWorkersProcess()).toBe(false)
  })

  it('returns false when NUXT_PROCESSOR_WORKER is 0', () => {
    process.env.NUXT_PROCESSOR_WORKER = '0'
    expect(isWorkersProcess()).toBe(false)
  })

  it('returns false when NUXT_PROCESSOR_WORKER is true', () => {
    process.env.NUXT_PROCESSOR_WORKER = 'true'
    expect(isWorkersProcess()).toBe(false)
  })

  it('returns false when NUXT_PROCESSOR_WORKER is empty', () => {
    process.env.NUXT_PROCESSOR_WORKER = ''
    expect(isWorkersProcess()).toBe(false)
  })
})

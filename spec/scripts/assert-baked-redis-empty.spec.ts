import { describe, it, expect } from 'vitest'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { assertBakedRedisEmpty } from '../../scripts/assert-baked-redis-empty'

describe('assertBakedRedisEmpty', () => {
  it('accepts empty baked redis block', () => {
    const path = join(tmpdir(), `nitro-baked-${Date.now()}.mjs`)
    writeFileSync(path, `"redis": {"url": "","host": "","port": "","password": "","db": "","username": "","lazyConnect": "","connectTimeout": ""}`)
    try {
      expect(() => assertBakedRedisEmpty(path)).not.toThrow()
    }
    finally {
      unlinkSync(path)
    }
  })

  it('rejects build-time redis leaks', () => {
    const path = join(tmpdir(), `nitro-leak-${Date.now()}.mjs`)
    writeFileSync(path, 'redis-runtime:6381')
    try {
      expect(() => assertBakedRedisEmpty(path)).toThrow(/build-time leak/)
    }
    finally {
      unlinkSync(path)
    }
  })
})

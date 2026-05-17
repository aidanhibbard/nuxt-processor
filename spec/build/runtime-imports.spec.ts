import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('runtime bundle imports', () => {
  it('workers.ts does not import from src/utils (must live under runtime for dist)', () => {
    const workersPath = resolve('src/runtime/server/utils/workers.ts')
    const source = readFileSync(workersPath, 'utf8')

    expect(source).not.toMatch(/from ['"]\.\.\/\.\.\/\.\.\/utils\//)
    expect(source).toContain('from \'./normalize-redis-connection\'')
  })
})

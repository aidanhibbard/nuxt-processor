import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import { scanWorkerFiles } from '../../src/utils/scan-worker-files'

describe('scan-worker-files', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), 'scan-worker-files-'))
  })

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    }
    catch {
      // ignore cleanup error
    }
  })

  it('finds files in a directory (ts/js/mjs)', async () => {
    const dir = join('some', 'workers')
    const absDir = join(tmpDir, dir)
    mkdirSync(join(absDir, 'nested'), { recursive: true })
    writeFileSync(join(absDir, 'a.ts'), 'export {}')
    writeFileSync(join(absDir, 'b.js'), 'module.exports = {}')
    writeFileSync(join(absDir, 'nested', 'c.mjs'), 'export {}')
    writeFileSync(join(absDir, 'ignored.txt'), 'ignore')

    const files = await scanWorkerFiles({
      rootDir: tmpDir,
      workersPath: dir,
    })
    expect(files.sort()).toEqual([
      join(absDir, 'a.ts'),
      join(absDir, 'b.js'),
      join(absDir, 'nested', 'c.mjs'),
    ].sort())
  })

  it('uses a custom pattern to limit extensions', async () => {
    const dir = join('some', 'workers')
    const absDir = join(tmpDir, dir)
    mkdirSync(absDir, { recursive: true })
    writeFileSync(join(absDir, 'a.ts'), 'export {}')
    writeFileSync(join(absDir, 'b.js'), 'module.exports = {}')

    const files = await scanWorkerFiles({
      rootDir: tmpDir,
      workersPath: dir,
      pattern: '**/*.ts',
    })
    expect(files).toEqual([join(absDir, 'a.ts')])
  })

  it('supports extglob patterns to exclude spec files', async () => {
    const dir = join('some', 'workers')
    const absDir = join(tmpDir, dir)
    mkdirSync(absDir, { recursive: true })
    writeFileSync(join(absDir, 'worker.ts'), 'export {}')
    writeFileSync(join(absDir, 'worker.spec.ts'), 'export {}')

    const files = await scanWorkerFiles({
      rootDir: tmpDir,
      workersPath: dir,
      pattern: '**/!(*.spec).ts',
    })
    expect(files).toEqual([join(absDir, 'worker.ts')])
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import {
  assertNoDuplicateWorkerNames,
  buildEffectiveWorkerOptions,
  buildWorkerManifest,
  DuplicateWorkerNameError,
} from '../../src/utils/build-worker-manifest'

describe('build-worker-manifest', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), 'build-worker-manifest-'))
  })

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    }
    catch {
      // ignore cleanup error
    }
  })

  it('builds effective defaults for unset options', () => {
    expect(buildEffectiveWorkerOptions({})).toEqual({
      concurrency: 1,
      autorun: false,
      lockDuration: 30_000,
      stalledInterval: 30_000,
      maxStalledCount: 1,
    })
  })

  it('throws on duplicate worker names', () => {
    expect(() => assertNoDuplicateWorkerNames([
      { name: 'basic', source: 'server/workers/a.ts' },
      { name: 'basic', source: 'server/workers/b.ts' },
    ])).toThrow(DuplicateWorkerNameError)
  })

  it('builds a manifest from worker files', async () => {
    const workersDir = join(tmpDir, 'server', 'workers')
    mkdirSync(workersDir, { recursive: true })
    writeFileSync(join(workersDir, 'basic.ts'), `
export default defineWorker({
  name: 'basic',
  processor: async () => {},
  options: { concurrency: 3 },
})
`)
    writeFileSync(join(workersDir, 'hello.ts'), `
export default defineWorker({
  name: 'hello',
  processor: async () => {},
})
`)

    const manifest = await buildWorkerManifest({
      rootDir: tmpDir,
      processorOptions: {
        workers: 'server/workers',
        workersPattern: '**/*.ts',
      },
    })

    expect(manifest.workers).toHaveLength(2)
    expect(manifest.workers.map(worker => worker.name).sort()).toEqual(['basic', 'hello'])
    expect(manifest.workers.find(worker => worker.name === 'basic')?.effective.concurrency).toBe(3)
    expect(manifest.selectedWorkers).toBeNull()
  })

  it('filters workers when selectedWorkers is provided', async () => {
    const workersDir = join(tmpDir, 'server', 'workers')
    mkdirSync(workersDir, { recursive: true })
    writeFileSync(join(workersDir, 'basic.ts'), `
export default defineWorker({ name: 'basic', processor: async () => {} })
`)
    writeFileSync(join(workersDir, 'hello.ts'), `
export default defineWorker({ name: 'hello', processor: async () => {} })
`)

    const manifest = await buildWorkerManifest({
      rootDir: tmpDir,
      processorOptions: {
        workers: 'server/workers',
      },
      selectedWorkers: ['hello'],
    })

    expect(manifest.selectedWorkers).toEqual(['hello'])
    expect(manifest.workers.map(worker => worker.name)).toEqual(['hello'])
  })
})

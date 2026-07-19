import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import { useNuxt } from '@nuxt/kit'

// We import the default export (scanner)
import scanFolder from '../../src/utils/scan-folder'

// Mock @nuxt/kit to control rootDir resolution in tests
vi.mock('@nuxt/kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nuxt/kit')>()
  const nuxtMock = { options: { rootDir: '' } }
  return {
    ...actual,
    useNuxt: () => nuxtMock,
    createResolver: () => ({ resolve: (...segments: string[]) => join(...segments) }),
  }
})

describe('scan-folder', () => {
  let tmpDir: string
  const nuxt = useNuxt() as unknown as { options: { rootDir: string } }

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), 'scan-folder-'))
    nuxt.options.rootDir = tmpDir
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
    // create directory structure and files
    mkdirSync(join(absDir, 'nested'), { recursive: true })
    writeFileSync(join(absDir, 'a.ts'), 'export {}')
    writeFileSync(join(absDir, 'b.js'), 'module.exports = {}')
    writeFileSync(join(absDir, 'nested', 'c.mjs'), 'export {}')
    // ignored extension
    writeFileSync(join(absDir, 'ignored.txt'), 'ignore')

    const files = await scanFolder({ path: dir })
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

    const files = await scanFolder({ path: dir, pattern: '**/*.ts' })
    expect(files).toEqual([join(absDir, 'a.ts')])
  })

  it('supports extglob patterns to exclude spec files', async () => {
    const dir = join('some', 'workers')
    const absDir = join(tmpDir, dir)
    mkdirSync(absDir, { recursive: true })
    writeFileSync(join(absDir, 'worker.ts'), 'export {}')
    writeFileSync(join(absDir, 'worker.spec.ts'), 'export {}')

    const files = await scanFolder({ path: dir, pattern: '**/!(*.spec).ts' })
    expect(files).toEqual([join(absDir, 'worker.ts')])
  })

  it('warns and returns an empty array when no files match', async () => {
    const dir = join('empty', 'workers')
    const absDir = join(tmpDir, dir)
    mkdirSync(absDir, { recursive: true })

    const files = await scanFolder({ path: dir })
    expect(files).toEqual([])
  })
})

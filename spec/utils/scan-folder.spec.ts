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

    const files = await scanFolder(dir)
    expect(files.sort()).toEqual([
      join(absDir, 'a.ts'),
      join(absDir, 'b.js'),
      join(absDir, 'nested', 'c.mjs'),
    ].sort())
  })
})

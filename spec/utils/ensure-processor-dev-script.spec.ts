import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import os from 'node:os'

import { ensureProcessorDevScript } from '../../src/utils/ensure-processor-dev-script'

describe('ensureProcessorDevScript', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), 'ensure-processor-dev-'))
  })

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    }
    catch {
      // ignore
    }
    vi.restoreAllMocks()
  })

  it('returns false when package.json does not exist', async () => {
    const result = await ensureProcessorDevScript(tmpDir, { ask: async () => 'y' })
    expect(result).toBe(false)
  })

  it('returns false when package.json is invalid JSON', async () => {
    writeFileSync(join(tmpDir, 'package.json'), 'not json {')
    const result = await ensureProcessorDevScript(tmpDir, { ask: async () => 'y' })
    expect(result).toBe(false)
  })

  it('returns true when processor:dev script already exists', async () => {
    const pkg = { name: 'app', version: '0.0.0', scripts: { 'processor:dev': 'nuxt-processor dev' } }
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2))

    const ask = vi.fn()
    const result = await ensureProcessorDevScript(tmpDir, { ask })

    expect(result).toBe(true)
    expect(ask).not.toHaveBeenCalled()
  })

  it('does not write when user declines (ask returns n)', async () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'app', version: '0.0.0', scripts: {} }, null, 2))

    const result = await ensureProcessorDevScript(tmpDir, { ask: async () => 'n' })

    expect(result).toBe(false)
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.['processor:dev']).toBeUndefined()
  })

  it('adds processor:dev script when user accepts (ask returns y)', async () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'app', version: '0.0.0', scripts: {} }, null, 2))

    const result = await ensureProcessorDevScript(tmpDir, { ask: async () => 'y' })

    expect(result).toBe(true)
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.['processor:dev']).toBe('nuxt-processor dev')
  })

  it('accepts "yes" as affirmative answer', async () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'app', version: '0.0.0', scripts: {} }, null, 2))

    const result = await ensureProcessorDevScript(tmpDir, { ask: async () => 'yes' })

    expect(result).toBe(true)
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg.scripts?.['processor:dev']).toBe('nuxt-processor dev')
  })

  it('preserves existing scripts when adding processor:dev', async () => {
    const pkg = { name: 'app', version: '0.0.0', scripts: { build: 'nuxt build', dev: 'nuxt dev' } }
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2))

    const result = await ensureProcessorDevScript(tmpDir, { ask: async () => 'y' })

    expect(result).toBe(true)
    const updated = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(updated.scripts?.build).toBe('nuxt build')
    expect(updated.scripts?.dev).toBe('nuxt dev')
    expect(updated.scripts?.['processor:dev']).toBe('nuxt-processor dev')
  })
})

import { describe, it, expect } from 'vitest'
import { runInNewContext } from 'node:vm'
import {
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  MAX_SHUTDOWN_TIMEOUT_MS,
  generateWorkersIndexWrapper,
} from '../../src/utils/generate-workers-index-wrapper'

function readShutdownTimeout(content: string, env: Record<string, string | undefined> = {}): number {
  const lines = content.split('\n').filter(line =>
    line.startsWith('const rawShutdownTimeout')
    || line.startsWith('const parsedShutdownTimeout')
    || line.startsWith('const SHUTDOWN_TIMEOUT_MS'),
  )
  return runInNewContext(`${lines.join('\n')}\nSHUTDOWN_TIMEOUT_MS`, { process: { env } })
}

describe('generate-workers-index-wrapper', () => {
  it('embeds the default shutdown timeout constant with runtime env fallback', () => {
    const content = generateWorkersIndexWrapper('./_entry.mjs')

    expect(DEFAULT_SHUTDOWN_TIMEOUT_MS).toBe(25000)
    expect(MAX_SHUTDOWN_TIMEOUT_MS).toBe(2_147_483_647)
    expect(content).toContain('const rawShutdownTimeout = process.env.NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS || process.env.PROCESSOR_SHUTDOWN_TIMEOUT_MS')
    expect(content).toContain(`parsedShutdownTimeout <= ${MAX_SHUTDOWN_TIMEOUT_MS} ? parsedShutdownTimeout : 25000`)
    expect(readShutdownTimeout(content)).toBe(25000)
  })

  it('allows overriding shutdownTimeoutMs', () => {
    const content = generateWorkersIndexWrapper('./_entry.mjs', { shutdownTimeoutMs: 5000 })

    expect(content).toContain(': 5000')
    expect(readShutdownTimeout(content)).toBe(5000)
  })

  it('uses a runtime override inside Node\'s timer range', () => {
    const content = generateWorkersIndexWrapper('./_entry.mjs', { shutdownTimeoutMs: 5000 })

    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: '120000' })).toBe(120000)
    expect(readShutdownTimeout(content, { PROCESSOR_SHUTDOWN_TIMEOUT_MS: '8000' })).toBe(8000)
    expect(readShutdownTimeout(content, {
      NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: '120000',
      PROCESSOR_SHUTDOWN_TIMEOUT_MS: '8000',
    })).toBe(120000)
    expect(readShutdownTimeout(content, {
      NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: '',
      PROCESSOR_SHUTDOWN_TIMEOUT_MS: '8000',
    })).toBe(8000)
    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: '1' })).toBe(1)
    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: String(MAX_SHUTDOWN_TIMEOUT_MS) })).toBe(MAX_SHUTDOWN_TIMEOUT_MS)
    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: '1500.9' })).toBe(1500)
  })

  it('ignores runtime overrides Node would clamp to 1 ms', () => {
    const content = generateWorkersIndexWrapper('./_entry.mjs', { shutdownTimeoutMs: 5000 })

    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: 'Infinity' })).toBe(5000)
    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: String(MAX_SHUTDOWN_TIMEOUT_MS + 1) })).toBe(5000)
    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: '0' })).toBe(5000)
    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: '0.5' })).toBe(5000)
    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: '-1' })).toBe(5000)
    expect(readShutdownTimeout(content, { NUXT_PROCESSOR_SHUTDOWN_TIMEOUT_MS: 'nope' })).toBe(5000)
    expect(readShutdownTimeout(content, { PROCESSOR_SHUTDOWN_TIMEOUT_MS: 'Infinity' })).toBe(5000)
  })

  it('sets the workers process marker before dynamically importing the entry', () => {
    const content = generateWorkersIndexWrapper('./chunks/_entry.mjs')

    const markerIndex = content.indexOf('process.env.NUXT_PROCESSOR_WORKER = \'1\'')
    const importIndex = content.indexOf('await import(')
    expect(markerIndex).toBeGreaterThan(-1)
    expect(content).toContain('await import(\'./chunks/_entry.mjs\')')
    expect(markerIndex).toBeLessThan(importIndex)
    expect(content).not.toContain('import { createWorkersApp }')
  })

  it('registers SIGINT, SIGTERM, and SIGQUIT handlers', () => {
    const content = generateWorkersIndexWrapper('./_entry.mjs')

    expect(content).toContain('[ \'SIGINT\',\'SIGTERM\',\'SIGQUIT\' ].forEach(sig => process.on(sig, () => shutdown(sig)))')
  })

  it('races graceful stop against the shutdown timeout', () => {
    const content = generateWorkersIndexWrapper('./_entry.mjs')

    expect(content).toContain('Promise.race([ app.stop(), new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error(\'shutdown timeout\'), { code: \'SHUTDOWN_TIMEOUT\' })), SHUTDOWN_TIMEOUT_MS)) ])')
  })

  it('falls back to force stop when graceful shutdown times out', () => {
    const content = generateWorkersIndexWrapper('./_entry.mjs')

    expect(content).toContain('err.code === \'SHUTDOWN_TIMEOUT\'')
    expect(content).toContain('graceful shutdown timed out after ')
    expect(content).toContain('await app.stop({ force: true })')
  })

  it('exits with code 1 on startup failure', () => {
    const content = generateWorkersIndexWrapper('./_entry.mjs')

    expect(content).toContain('createWorkersApp().catch((err) => { logger.error(\'failed to start workers\', err); process.exit(1) })')
  })

  it('exits with code 1 on shutdown failure and code 0 on success', () => {
    const content = generateWorkersIndexWrapper('./_entry.mjs')

    expect(content).toContain('let exitCode = 0')
    expect(content).toContain('exitCode = 1')
    expect(content).toContain('process.exit(exitCode)')
    expect(content).not.toContain('process.exit(0)')
  })
})

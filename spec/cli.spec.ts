import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'node:fs'
import os from 'node:os'

// Mock ensure-nuxt-project to avoid loading real Nuxt configs
vi.mock('../src/utils/ensure-nuxt-project', () => ({ default: vi.fn(async () => {}) }))

// Mock readline to control user input for prompts
let promptAnswer = 'n'
vi.mock('node:readline/promises', () => {
  return {
    createInterface: () => ({
      question: async () => promptAnswer,
      close: () => {},
    }),
  }
})

// Mock child_process.spawn globally and capture child + args
let _spawnCalled = false
let lastSpawnArgs: unknown[] | undefined
let lastChild: { killed: boolean, kill: ReturnType<typeof vi.fn>, on: (event: string, cb: (code?: number | null) => void) => void } | undefined
let childEventHandlers: Record<string, Array<(code?: number | null) => void>> = {}
vi.mock('node:child_process', () => {
  return {
    spawn: (...args: unknown[]) => {
      _spawnCalled = true
      lastSpawnArgs = args
      childEventHandlers = {}
      lastChild = {
        killed: false,
        kill: vi.fn((_signal?: unknown) => {
          if (lastChild) {
            lastChild.killed = true
          }
        }),
        on: (event: string, cb: (code?: number | null) => void) => {
          if (!childEventHandlers[event]) childEventHandlers[event] = []
          childEventHandlers[event].push(cb)
        },
      }
      return lastChild as never
    },
  }
})

// Defer importing the CLI until after mocks
const importCli = async () => await import('../src/cli')

describe('CLI dev command', () => {
  let tmpDir: string
  let exitSpy: { mockRestore: () => void }
  let signalHandlers: Record<string, Array<(...args: unknown[]) => void>>

  beforeEach(() => {
    tmpDir = mkdtempSync(join(os.tmpdir(), 'nuxt-processor-cli-'))
    // minimal package.json
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'app', version: '0.0.0', scripts: {} }, null, 2))
    exitSpy = (vi.spyOn(process as unknown as { exit: (code?: number | null) => never }, 'exit')
      .mockImplementation(((code?: number | null) => {
        throw new Error('process.exit(' + (code ?? 0) + ')')
      }) as unknown as (code?: number | null) => never)) as unknown as { mockRestore: () => void }
    signalHandlers = {}
    vi.spyOn(process, 'on').mockImplementation(((event: string, listener: (...args: unknown[]) => void) => {
      if (!signalHandlers[event]) signalHandlers[event] = []
      signalHandlers[event].push(listener)
      return process
    }) as unknown as typeof process.on)
  })

  afterEach(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    }
    catch {
      // ignore cleanup error
    }
    exitSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('adds processor:dev script when entry exists and user accepts', async () => {
    // Arrange: create workers entry to trigger spawn path
    const entryDir = join(tmpDir, '.nuxt', 'dev', 'workers')
    mkdirSync(entryDir, { recursive: true })
    writeFileSync(join(entryDir, 'index.mjs'), 'export {}\n')

    // User answers yes
    promptAnswer = 'y'

    const { main } = await importCli()
    // Act
    await main({ rawArgs: ['dev', tmpDir] })

    // Assert: package.json updated
    const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg.scripts && pkg.scripts['processor:dev']).toBe('nuxt-processor dev')
    // Ensure spawn happened and signal handlers attached
    expect(_spawnCalled).toBe(true)
    expect(signalHandlers['SIGINT']?.length).toBeGreaterThan(0)
  })

  it('does not prompt when script exists', async () => {
    // Arrange: create workers entry and script exists
    const entryDir = join(tmpDir, '.nuxt', 'dev', 'workers')
    mkdirSync(entryDir, { recursive: true })
    writeFileSync(join(entryDir, 'index.mjs'), 'export {}\n')
    const pkgPath = join(tmpDir, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> }
    pkg.scripts = { ...(pkg.scripts || {}), 'processor:dev': 'nuxt-processor dev' }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))

    // If prompt were called, return value would update; assert after run remains unchanged
    promptAnswer = 'y'

    const { main } = await importCli()
    await main({ rawArgs: ['dev', tmpDir] })

    const pkg2 = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg2.scripts && pkg2.scripts['processor:dev']).toBe('nuxt-processor dev')
  })

  it('exits with guidance when entry missing; can add script based on user choice', async () => {
    // Entry does not exist; user declines add
    promptAnswer = 'n'
    const { main } = await importCli()
    try {
      await main({ rawArgs: ['dev', tmpDir] })
    }
    catch (e) {
      // process.exit(1) throws from our mock
      expect(String(e)).toContain('process.exit(1)')
    }
    const pkg1 = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg1.scripts && pkg1.scripts['processor:dev']).toBeUndefined()

    // Now accept and ensure it gets added
    promptAnswer = 'yes'
    try {
      await main({ rawArgs: ['dev', tmpDir] })
    }
    catch {
      // ignore thrown exit from mocked process.exit
    }
    const pkg2 = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
    expect(pkg2.scripts && pkg2.scripts['processor:dev']).toBe('nuxt-processor dev')
  })

  it('kills child process on SIGINT signal', async () => {
    const entryDir = join(tmpDir, '.nuxt', 'dev', 'workers')
    mkdirSync(entryDir, { recursive: true })
    writeFileSync(join(entryDir, 'index.mjs'), 'export {}\n')

    promptAnswer = 'n'
    const { main } = await importCli()
    await main({ rawArgs: ['dev', tmpDir, '--nodeArgs', '--inspect=9229 --trace-warnings'] })

    expect(_spawnCalled).toBe(true)
    expect(typeof lastChild?.kill).toBe('function')
    // Trigger SIGINT handler
    const sigint = signalHandlers['SIGINT']?.[0]
    expect(typeof sigint).toBe('function')
    if (sigint) {
      sigint()
    }
    expect(lastChild?.kill).toHaveBeenCalled()

    // Ensure spawn args array exists
    const spawnArgs = lastSpawnArgs as [string, string[], Record<string, unknown>]
    expect(Array.isArray(spawnArgs[1])).toBe(true)
  })

  it('exits with child exit code when child process exits', async () => {
    const entryDir = join(tmpDir, '.nuxt', 'dev', 'workers')
    mkdirSync(entryDir, { recursive: true })
    writeFileSync(join(entryDir, 'index.mjs'), 'export {}\n')

    promptAnswer = 'n'
    const { main } = await importCli()
    try {
      await main({ rawArgs: ['dev', tmpDir] })
      // Simulate child exit event
      const exitHandlers = childEventHandlers['exit']
      expect(Array.isArray(exitHandlers) && exitHandlers.length > 0).toBe(true)
      exitHandlers?.[0]?.(2)
    }
    catch (e) {
      expect(String(e)).toContain('process.exit(2)')
    }
  })
})

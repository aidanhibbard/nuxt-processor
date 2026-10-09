import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateWorkersIndexWrapper } from '../../src/utils/generate-workers-index-wrapper'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const tmpRoot = join(repoRoot, 'node_modules', '.tmp')

async function waitForFile(path: string): Promise<string> {
  const started = Date.now()
  while (true) {
    if (Date.now() - started > 10000) {
      throw new Error('timed out waiting for ' + path)
    }
    if (existsSync(path)) {
      const contents = readFileSync(path, 'utf8')
      if (contents.length > 0) {
        return contents
      }
    }
    await new Promise(resolve => setTimeout(resolve, 20))
  }
}

describe('workers-index-wrapper-process', () => {
  let tmpDir: string
  let child: ChildProcess | undefined

  beforeEach(() => {
    mkdirSync(tmpRoot, { recursive: true })
    tmpDir = mkdtempSync(join(tmpRoot, 'workers-index-wrapper-'))
    child = undefined
  })

  afterEach(() => {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL')
    }
    child = undefined
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('sets NUXT_PROCESSOR_WORKER before loading the entry', async () => {
    writeFileSync(join(tmpDir, 'index.mjs'), generateWorkersIndexWrapper('./_entry.mjs'))
    writeFileSync(join(tmpDir, '_entry.mjs'), `import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const dir = dirname(fileURLToPath(import.meta.url))
writeFileSync(join(dir, 'marker.txt'), String(process.env.NUXT_PROCESSOR_WORKER))
export async function createWorkersApp() {
  writeFileSync(join(dir, 'ready.txt'), '1')
  const timer = setInterval(() => {}, 1000)
  return { workers: [], stop: async () => {
    clearInterval(timer)
    return { ok: true, errors: [] }
  } }
}
`)

    const env = { ...process.env }
    delete env.NUXT_PROCESSOR_WORKER

    child = spawn(process.execPath, [join(tmpDir, 'index.mjs')], {
      cwd: tmpDir,
      env,
      stdio: 'ignore',
    })

    const exitPromise = new Promise<number | null>((resolve, reject) => {
      child?.once('error', reject)
      child?.once('exit', code => resolve(code))
    })

    const marker = await waitForFile(join(tmpDir, 'marker.txt'))
    expect(marker).toBe('1')

    await waitForFile(join(tmpDir, 'ready.txt'))
    child.kill('SIGTERM')
    const code = await exitPromise
    expect(code).toBe(0)
  }, 15000)
})

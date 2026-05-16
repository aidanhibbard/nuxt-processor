import { describe, it, expect } from 'vitest'
import { generateWorkersEntryContent } from '../../src/utils/generate-workers-entry-content'

describe('generate-workers-entry-content', () => {
  it('matches snapshot for single worker and undefined redis', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
    )
    expect(content).toMatchSnapshot()
  })

  it('matches snapshot for multiple workers and redis url', () => {
    const content = generateWorkersEntryContent(
      ['/app/server/workers/basic.ts', '/app/server/workers/hello.ts'],
    )
    expect(content).toMatchSnapshot()
  })

  it('creates workers inside createWorkersApp (connection from runtimeConfig at use time)', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
    )

    expect(content).not.toContain('setConnection')
    expect(content).toContain('export async function createWorkersApp()')
    expect(content).toContain('const api = useProcessor()')
  })

  it('generates entry that parses --workers flag from process.argv', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
    )
    expect(content).toContain('process.argv.find(a => typeof a === \'string\' && a.startsWith(\'--workers=\'))')
    expect(content).toContain('workersArg.split(\'=\')[1].split(\',\').map(s => s.trim()).filter(Boolean)')
    expect(content).toContain('selectedWorkers')
    expect(content).toContain('workersToRun')
  })

  it('generates entry that filters workers by name when --workers is set', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
    )
    expect(content).toContain('selectedWorkers.includes(w.name)')
    expect(content).toContain('api.workers.filter(w => w && selectedWorkers.includes(w.name))')
  })

  it('generates entry that runs all workers when --workers is not set', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
    )
    expect(content).toContain('(Array.isArray(api.workers) ? api.workers : [])')
  })

  it('generates entry that returns stop closing only workersToRun', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
    )
    expect(content).toContain('workersToRun.map(w => w.close())')
    expect(content).toContain('closeRunningWorkers')
    expect(content).toContain('return { stop: closeRunningWorkers, workers: workersToRun }')
  })

  it('generates entry that warns and exits when no workers match --workers filter', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
    )
    expect(content).toContain('selectedWorkers && workersToRun.length === 0')
    expect(content).toContain('logger.warn')
    expect(content).toContain('No workers matched')
    expect(content).toContain('Available:')
    expect(content).toContain('process.exit(1)')
  })
})

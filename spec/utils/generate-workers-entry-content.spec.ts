import { describe, it, expect } from 'vitest'
import { generateWorkersEntryContent } from '../../src/utils/generate-workers-entry-content'

describe('generate-workers-entry-content', () => {
  it('generates entry that parses --workers flag from process.argv', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
      'undefined',
    )
    expect(content).toContain("process.argv.find(a => typeof a === 'string' && a.startsWith('--workers='))")
    expect(content).toContain("workersArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)")
    expect(content).toContain('selectedWorkers')
    expect(content).toContain('workersToRun')
  })

  it('generates entry that filters workers by name when --workers is set', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
      'undefined',
    )
    expect(content).toContain('selectedWorkers.includes(w.name)')
    expect(content).toContain('api.workers.filter(w => w && selectedWorkers.includes(w.name))')
  })

  it('generates entry that runs all workers when --workers is not set', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
      'undefined',
    )
    expect(content).toContain('(Array.isArray(api.workers) ? api.workers : [])')
  })

  it('generates entry that returns stop closing only workersToRun', () => {
    const content = generateWorkersEntryContent(
      ['/path/to/worker.mjs'],
      'undefined',
    )
    expect(content).toContain('workersToRun.map(w => w.close())')
    expect(content).toContain('stopOnlyRunning')
    expect(content).toContain('return { stop: stopOnlyRunning, workers: workersToRun }')
  })
})

import type { WorkerManifest } from '../build-worker-manifest'
import { logger } from '../logger'

export function parseWorkersArg(value: unknown): string[] | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

export function printWorkersManifest(manifest: WorkerManifest, json: boolean) {
  if (json) {
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`)
    return
  }

  if (manifest.workers.length === 0) {
    logger.info('No workers found.')
    return
  }

  const rows = manifest.workers.map(worker => ({
    name: worker.name,
    source: worker.source,
    concurrency: String(worker.effective.concurrency),
  }))
  const nameWidth = Math.max(4, ...rows.map(row => row.name.length))
  const sourceWidth = Math.max(6, ...rows.map(row => row.source.length))
  const header = `${'name'.padEnd(nameWidth)}  ${'source'.padEnd(sourceWidth)}  concurrency`
  const lines = rows.map(row =>
    `${row.name.padEnd(nameWidth)}  ${row.source.padEnd(sourceWidth)}  ${row.concurrency}`,
  )
  process.stdout.write(`${[header, ...lines].join('\n')}\n`)
}

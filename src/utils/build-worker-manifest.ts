import { readFileSync } from 'node:fs'
import { relative } from 'pathe'
import { version } from '../../package.json'
import type { ModuleOptions } from '../module'
import { parseWorkerDefinition, type ParsedWorkerOptions } from './parse-worker-definition'
import { scanWorkerFiles } from './scan-worker-files'
import { logger } from './logger'

export interface WorkerManifestEffectiveOptions {
  concurrency: number
  autorun: false
  lockDuration: number
  stalledInterval: number
  maxStalledCount: number
  limiter?: { max: number, duration: number }
}

export interface WorkerManifestEntry {
  name: string
  source: string
  options: ParsedWorkerOptions
  effective: WorkerManifestEffectiveOptions
}

export interface WorkerManifest {
  version: string
  workersPath: string
  workersPattern: string
  shutdown?: { timeoutMs: number }
  selectedWorkers: string[] | null
  workers: WorkerManifestEntry[]
}

export const BULLMQ_WORKER_DEFAULTS = {
  concurrency: 1,
  lockDuration: 30_000,
  stalledInterval: 30_000,
  maxStalledCount: 1,
} as const

export function buildEffectiveWorkerOptions(
  options: ParsedWorkerOptions,
): WorkerManifestEffectiveOptions {
  const effective: WorkerManifestEffectiveOptions = {
    concurrency: options.concurrency ?? BULLMQ_WORKER_DEFAULTS.concurrency,
    autorun: false,
    lockDuration: options.lockDuration ?? BULLMQ_WORKER_DEFAULTS.lockDuration,
    stalledInterval: options.stalledInterval ?? BULLMQ_WORKER_DEFAULTS.stalledInterval,
    maxStalledCount: options.maxStalledCount ?? BULLMQ_WORKER_DEFAULTS.maxStalledCount,
  }

  if (options.limiter) {
    effective.limiter = options.limiter
  }

  return effective
}

export class DuplicateWorkerNameError extends Error {
  constructor(
    public readonly duplicates: Array<{ name: string, sources: string[] }>,
  ) {
    const details = duplicates
      .map(d => `"${d.name}" in ${d.sources.join(', ')}`)
      .join('; ')
    super(`Duplicate worker names found: ${details}`)
    this.name = 'DuplicateWorkerNameError'
  }
}

export function assertNoDuplicateWorkerNames(
  workers: Array<{ name: string, source: string }>,
): void {
  const byName = new Map<string, string[]>()

  for (const worker of workers) {
    const sources = byName.get(worker.name) ?? []
    sources.push(worker.source)
    byName.set(worker.name, sources)
  }

  const duplicates = [...byName.entries()]
    .filter(([, sources]) => sources.length > 1)
    .map(([name, sources]) => ({ name, sources }))

  if (duplicates.length > 0) {
    throw new DuplicateWorkerNameError(duplicates)
  }
}

export interface BuildWorkerManifestOptions {
  rootDir: string
  processorOptions: ModuleOptions
  workerFiles?: string[]
  selectedWorkers?: string[] | null
}

async function collectWorkerEntries({
  rootDir,
  processorOptions,
  workerFiles,
}: BuildWorkerManifestOptions): Promise<WorkerManifestEntry[]> {
  const workersPath = processorOptions.workers
  const workersPattern = processorOptions.workersPattern ?? '**/*.{ts,js,mjs}'

  const files = workerFiles ?? await scanWorkerFiles({
    rootDir,
    workersPath,
    pattern: workersPattern,
  })

  const parsedWorkers: WorkerManifestEntry[] = []

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const parsed = parseWorkerDefinition(source)
    if (!parsed) {
      logger.warn(`No defineWorker() call found in ${relative(rootDir, file)}`)
      continue
    }

    parsedWorkers.push({
      name: parsed.name,
      source: relative(rootDir, file),
      options: parsed.options,
      effective: buildEffectiveWorkerOptions(parsed.options),
    })
  }

  return parsedWorkers
}

export async function validateDiscoveredWorkers(
  options: BuildWorkerManifestOptions,
): Promise<void> {
  const parsedWorkers = await collectWorkerEntries(options)
  assertNoDuplicateWorkerNames(parsedWorkers)
}

export async function buildWorkerManifest({
  rootDir,
  processorOptions,
  workerFiles,
  selectedWorkers = null,
}: BuildWorkerManifestOptions): Promise<WorkerManifest> {
  const workersPath = processorOptions.workers
  const workersPattern = processorOptions.workersPattern ?? '**/*.{ts,js,mjs}'

  const parsedWorkers = await collectWorkerEntries({
    rootDir,
    processorOptions,
    workerFiles,
  })

  assertNoDuplicateWorkerNames(parsedWorkers)

  const filteredWorkers = selectedWorkers
    ? parsedWorkers.filter(worker => selectedWorkers.includes(worker.name))
    : parsedWorkers

  const manifest: WorkerManifest = {
    version,
    workersPath,
    workersPattern,
    selectedWorkers,
    workers: filteredWorkers,
  }

  if (processorOptions.shutdown?.timeoutMs !== undefined) {
    manifest.shutdown = { timeoutMs: processorOptions.shutdown.timeoutMs }
  }

  return manifest
}

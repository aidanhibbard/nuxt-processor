import type { Worker, WorkerOptions, Processor } from 'bullmq'
import { $workers } from '../utils/workers'

type DefineWorkerArgs = {
  name: Worker['name']
  processor: Processor
  options?: Omit<WorkerOptions, 'connection'>
}

export function defineWorker(args: DefineWorkerArgs): Worker {
  const { name, options, processor } = args
  const { createWorker } = $workers()
  return createWorker(name, processor, options)
}

export default defineWorker

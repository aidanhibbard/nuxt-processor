import type { Job, JobsOptions, QueueOptions, WorkerOptions, Processor, ConnectionOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import { useRuntimeConfig } from 'nitropack/runtime'
import { normalizeRedisConnectionEntry } from '../../../utils/normalize-redis-connection'

function resolveConnection(type: 'queue' | 'worker'): ConnectionOptions {
  const { redis } = useRuntimeConfig()
  const connection: Record<string, unknown> = {}

  if (redis) {
    for (const [key, value] of Object.entries(redis)) {
      const normalized = normalizeRedisConnectionEntry(key, value)
      if (normalized === undefined) {
        continue
      }
      connection[key] = normalized
    }
  }

  if (type === 'worker') {
    connection.maxRetriesPerRequest = null
  }

  return connection as ConnectionOptions
}

interface WorkersRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queues: Array<Queue<any, any, any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workers: Array<Worker<any, any, any>>
}

interface ProcessorState {
  registry?: WorkersRegistry
}

/** Nitro may bundle top-level defineQueue() before module-level bindings here; use only globals inside this function. */
function getProcessorState(): ProcessorState {
  const key = Symbol.for('nuxt-processor.state')
  const g = globalThis as typeof globalThis & { [key: symbol]: ProcessorState | undefined }
  if (!g[key]) {
    g[key] = {}
  }
  return g[key]
}

function getRegistry(): WorkersRegistry {
  const state = getProcessorState()
  if (!state.registry) {
    state.registry = {
      queues: [],
      workers: [],
    }
  }
  return state.registry
}

function clearRegistry(): void {
  getProcessorState().registry = undefined
}

export function useProcessor() {
  function createQueue<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DataTypeOrJob = any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DefaultResultType = any,
    DefaultNameType extends string = string,
  >(
    name: DefaultNameType,
    options?: Omit<QueueOptions, 'connection'> & { defaultJobOptions?: JobsOptions },
  ): Queue<DataTypeOrJob, DefaultResultType, DefaultNameType> {
    const queue = new Queue<DataTypeOrJob, DefaultResultType, DefaultNameType>(name, {
      connection: resolveConnection('queue'),
      ...options,
    })
    getRegistry().queues.push(queue)
    return queue
  }

  function createWorker<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DataType = any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ResultType = any,
    NameType extends string = string,
  >(
    name: NameType,
    processor: Processor<DataType, ResultType, NameType>,
    options?: Omit<WorkerOptions, 'connection'>,
  ): Worker<DataType, ResultType, NameType> {
    const worker = new Worker<DataType, ResultType, NameType>(name, processor, {
      connection: resolveConnection('worker'),
      ...options,
      autorun: false,
    })
    getRegistry().workers.push(worker)
    return worker
  }

  async function stopAll() {
    const state = getRegistry()
    await Promise.allSettled(state.workers.map(w => w.close()))
    await Promise.allSettled(state.queues.map(q => q.close()))
    clearRegistry()
  }

  return {
    createQueue,
    createWorker,
    stopAll,
    get queues() { return getRegistry().queues },
    get workers() { return getRegistry().workers },
  }
}

export type { Queue, Worker, Processor, QueueOptions, WorkerOptions, JobsOptions, Job }

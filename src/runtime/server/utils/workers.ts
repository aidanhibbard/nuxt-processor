import type { Job, JobsOptions, QueueOptions, WorkerOptions, Processor, ConnectionOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import { useRuntimeConfig } from 'nitropack/runtime'

function resolveConnection(type: 'queue' | 'worker'): ConnectionOptions {
  const { redis } = useRuntimeConfig() as { redis?: Record<string, unknown> }
  const connection: Record<string, unknown> = {}

  if (redis) {
    for (const [key, value] of Object.entries(redis)) {
      if (value === '' || value === undefined || value === null) {
        continue
      }
      connection[key] = value
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

const registry: WorkersRegistry = {
  queues: [],
  workers: [],
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
    registry.queues.push(queue)
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
    registry.workers.push(worker)
    return worker
  }

  async function stopAll() {
    await Promise.allSettled(registry.workers.map(w => w.close()))
    await Promise.allSettled(registry.queues.map(q => q.close()))
  }

  return {
    createQueue,
    createWorker,
    stopAll,
    get queues() { return registry.queues },
    get workers() { return registry.workers },
  }
}

export type { Queue, Worker, Processor, QueueOptions, WorkerOptions, JobsOptions, Job }

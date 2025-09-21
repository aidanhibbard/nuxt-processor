import type { Job, JobsOptions, QueueOptions, WorkerOptions, Processor } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import type { RedisOptions as IORedisOptions } from 'ioredis'

interface WorkersRegistry {
  connection: QueueOptions['connection'] | undefined
  queues: Queue[]
  workers: Worker[]
}

const registry: WorkersRegistry = {
  connection: undefined,
  queues: [],
  workers: [],
}

export function $workers() {
  type ConnectionInput = QueueOptions['connection'] | (IORedisOptions & { url?: string }) | string

  function setConnection(connection: ConnectionInput) {
    if (connection && typeof connection === 'object' && 'url' in connection && connection.url) {
      const { url, ...rest } = connection as { url: string } & IORedisOptions
      registry.connection = new IORedis(url, rest)
    }
    else if (typeof connection === 'string') {
      registry.connection = new IORedis(connection)
    }
    else {
      registry.connection = connection as QueueOptions['connection']
    }
  }

  function createQueue(name: string, options?: Omit<QueueOptions, 'connection'> & { defaultJobOptions?: JobsOptions }) {
    const queue = new Queue(name, {
      connection: registry.connection as QueueOptions['connection'],
      ...options,
    })
    registry.queues.push(queue)
    return queue
  }

  function createWorker(
    name: string,
    processor: Processor,
    options?: Omit<WorkerOptions, 'connection'>,
  ) {
    const worker = new Worker(name, processor, {
      connection: registry.connection as QueueOptions['connection'],
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
    setConnection,
    createQueue,
    createWorker,
    stopAll,
    get queues() { return registry.queues },
    get workers() { return registry.workers },
  }
}

export type { Queue, Worker, Processor, QueueOptions, WorkerOptions, JobsOptions, Job }

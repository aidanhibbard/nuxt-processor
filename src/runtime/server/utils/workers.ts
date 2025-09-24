import type { Job, JobsOptions, QueueOptions, WorkerOptions, Processor } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import type { RedisOptions as IORedisOptions } from 'ioredis'

interface WorkersRegistry {
  connection?: QueueOptions['connection']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queues: Array<Queue<any, any, any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workers: Array<Worker<any, any, any>>
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
      const opts: IORedisOptions = { ...rest, maxRetriesPerRequest: null }
      registry.connection = new IORedis(url, opts)
    }
    else if (typeof connection === 'string') {
      registry.connection = new IORedis(connection, { maxRetriesPerRequest: null })
    }
    else {
      // When passing raw options, ensure BullMQ-required setting
      const normalized = { ...(connection as IORedisOptions), maxRetriesPerRequest: null } as IORedisOptions
      registry.connection = normalized as unknown as QueueOptions['connection']
    }
  }

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
      connection: registry.connection as QueueOptions['connection'],
      ...options,
    })
    console.log('registry.connection', registry.connection)
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

import type { Job, JobsOptions, QueueOptions, WorkerOptions, Processor } from 'bullmq'
import { Queue, Worker } from 'bullmq'

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
  function setConnection(connection: QueueOptions['connection']) {
    registry.connection = connection
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
